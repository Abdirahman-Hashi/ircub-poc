import type {
  ChannelInitiateRequest,
  ChannelInitiateResponse,
  ChannelStatusResponse,
  PaymentChannel,
} from '@ircub/shared';

/** Contract every online channel implements (standards §3; D15, D16). */
export interface ChannelClient {
  readonly channel: PaymentChannel;
  initiate(request: ChannelInitiateRequest): Promise<ChannelInitiateResponse>;
  status(txnRef: string): Promise<ChannelStatusResponse>;
  /** Daily statement as CSV text (`txn_ref,date,amount,currency,control_number,status`). */
  statement(date: string, perturb?: boolean): Promise<string>;
}

export type ChannelClientMap = ReadonlyMap<PaymentChannel, ChannelClient>;

export interface StatementRecord {
  readonly txnRef: string;
  readonly date: string;
  readonly amount: string;
  readonly currency: string;
  readonly controlNumber: string;
  readonly status: string;
}
