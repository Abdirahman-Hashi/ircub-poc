import { randomBytes } from 'node:crypto';

import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import {
  CHANNEL,
  type ChannelCallbackPayload,
  ChannelOutcome,
  type PaymentChannel,
  type ScenarioOutcome,
  ScenarioOutcome as Outcomes,
  FinalChannelOutcome,
} from '@ircub/shared';

import { MocksConfigService } from '../config/mocks-config.service';
import { CHANNEL_MOCK } from '../mocks.constants';
import { StoreService } from '../store/store.service';

import { dayOf, perturb, scenarioForAmount, sign, statusOnCheck, toCsv } from './channels.rules';

import type { ChannelSpec, MockPayment, StatementLine } from './channels.types';
import type { InitiatePaymentDto } from './dto/initiate-payment.dto';
import type { SeedStatementDto } from './dto/seed-statement.dto';

/** One simulation serving both bank and mobile money; the spec only changes the ref prefix. */
@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);

  constructor(
    private readonly store: StoreService,
    private readonly config: MocksConfigService,
  ) {}

  initiate(spec: ChannelSpec, dto: InitiatePaymentDto): MockPayment {
    const txnRef = `${spec.refPrefix}${randomBytes(CHANNEL_MOCK.REF_RANDOM_LENGTH).toString('hex').slice(0, CHANNEL_MOCK.REF_RANDOM_LENGTH).toUpperCase()}`;
    const payment: MockPayment = {
      txnRef,
      channel: spec.channel,
      amount: dto.amount,
      currency: dto.currency,
      controlNumber: dto.controlNumber,
      callbackUrl: dto.callbackUrl,
      clientRef: dto.clientRef ?? null,
      status: ChannelOutcome.PENDING,
      paidAt: null,
      createdAt: new Date().toISOString(),
      statusChecks: 0,
      scenario: null,
    };
    this.store.channelPayments.set(txnRef, payment);
    const scenario = scenarioForAmount(dto.amount);
    this.logger.log({
      msg: 'channel payment initiated',
      channel: spec.channel,
      txnRef,
      amount: dto.amount,
      scenario,
    });
    if (scenario.sendCallback) {
      setTimeout(
        () => void this.sendCallback(payment, scenario.outcome),
        this.config.callbackDelayMs,
      );
    }
    return payment;
  }

  /** Status check honouring forced scenarios and amount triggers. */
  async status(txnRef: string): Promise<{ httpStatus: HttpStatus; payment: MockPayment | null }> {
    const payment = this.store.channelPayments.get(txnRef);
    if (payment === undefined) {
      return { httpStatus: HttpStatus.NOT_FOUND, payment: null };
    }
    payment.statusChecks += 1;
    const forced = payment.scenario ?? this.store.scenarios.get(txnRef)?.outcome ?? null;
    if (forced === Outcomes.TIMEOUT) {
      await new Promise((resolve) => setTimeout(resolve, CHANNEL_MOCK.TIMEOUT_HANG_MS));
    }
    const amountScenario = scenarioForAmount(payment.amount);
    if (amountScenario.statusCheckErrors) {
      this.logger.warn({
        msg: 'channel status check forced error',
        txnRef,
        check: payment.statusChecks,
      });
      return { httpStatus: HttpStatus.INTERNAL_SERVER_ERROR, payment };
    }
    if (payment.status === ChannelOutcome.PENDING) {
      const outcome =
        forced === Outcomes.FAILED
          ? ChannelOutcome.FAILED
          : forced === Outcomes.SUCCESS
            ? ChannelOutcome.SUCCESS
            : amountScenario.outcome;
      const sendsCallback = amountScenario.sendCallback && forced !== Outcomes.NO_CALLBACK;
      if (!sendsCallback) {
        const reported = statusOnCheck(payment.statusChecks, outcome);
        if (reported !== ChannelOutcome.PENDING) {
          this.settle(payment, reported);
        }
      }
    }
    return { httpStatus: HttpStatus.OK, payment };
  }

  forceScenario(txnRef: string, outcome: ScenarioOutcome): void {
    this.store.scenarios.set(txnRef, { txnRef, outcome });
    const payment = this.store.channelPayments.get(txnRef);
    if (payment !== undefined) {
      payment.scenario = outcome;
    }
    this.logger.log({ msg: 'scenario forced', txnRef, outcome });
  }

  /** SUCCESS payments of a UTC day, optionally perturbed for the reconciliation demo. */
  statement(channel: PaymentChannel, date: string, perturbed: boolean): string {
    const lines: StatementLine[] = [...this.store.channelPayments.values()]
      .filter(
        (p) =>
          p.channel === channel &&
          p.status === ChannelOutcome.SUCCESS &&
          p.paidAt !== null &&
          dayOf(p.paidAt) === date,
      )
      .map((p) => ({
        txnRef: p.txnRef,
        date,
        amount: p.amount,
        currency: p.currency,
        controlNumber: p.controlNumber,
        status: ChannelOutcome.SUCCESS,
      }));
    return toCsv(perturbed ? perturb(lines) : lines);
  }

  /** Registers already-settled payments so statements "know" seeded IRCUB payments. */
  seedStatement(dto: SeedStatementDto): number {
    for (const line of dto.lines) {
      this.store.channelPayments.set(line.txnRef, {
        txnRef: line.txnRef,
        channel: dto.channel,
        clientRef: null,
        amount: line.amount,
        currency: line.currency,
        controlNumber: line.controlNumber,
        callbackUrl: null,
        status: ChannelOutcome.SUCCESS,
        paidAt: `${line.date}T12:00:00.000Z`,
        createdAt: `${line.date}T12:00:00.000Z`,
        statusChecks: 0,
        scenario: null,
      });
    }
    return dto.lines.length;
  }

  private settle(payment: MockPayment, outcome: ChannelOutcome): void {
    payment.status = outcome;
    payment.paidAt = outcome === ChannelOutcome.SUCCESS ? new Date().toISOString() : null;
  }

  private async sendCallback(payment: MockPayment, outcome: FinalChannelOutcome): Promise<void> {
    const forced = payment.scenario ?? this.store.scenarios.get(payment.txnRef)?.outcome ?? null;
    if (forced === Outcomes.NO_CALLBACK) {
      this.logger.log({ msg: 'callback suppressed by scenario', txnRef: payment.txnRef });
      return;
    }
    const finalOutcome =
      forced === Outcomes.FAILED
        ? ChannelOutcome.FAILED
        : forced === Outcomes.SUCCESS
          ? ChannelOutcome.SUCCESS
          : outcome;
    this.settle(payment, finalOutcome);
    const body: ChannelCallbackPayload = {
      txnRef: payment.txnRef,
      status: finalOutcome,
      amount: payment.amount,
      currency: payment.currency,
      controlNumber: payment.controlNumber,
      paidAt: payment.paidAt ?? new Date().toISOString(),
      ...(payment.clientRef === null ? {} : { clientRef: payment.clientRef }),
    };
    const raw = JSON.stringify(body);
    if (payment.callbackUrl === null) {
      return;
    }
    try {
      const response = await fetch(payment.callbackUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [CHANNEL.SIGNATURE_HEADER]: sign(raw, this.config.sharedSecret),
        },
        body: raw,
        signal: AbortSignal.timeout(CHANNEL_MOCK.CALLBACK_TIMEOUT_MS),
      });
      this.logger.log({
        msg: 'callback posted',
        txnRef: payment.txnRef,
        status: finalOutcome,
        url: payment.callbackUrl,
        responseStatus: response.status,
      });
    } catch (error: unknown) {
      this.logger.warn({
        msg: 'callback failed',
        txnRef: payment.txnRef,
        url: payment.callbackUrl,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
