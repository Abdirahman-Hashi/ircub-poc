import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { applyAuditExtension } from '../common/audit/audit.extension';
import { AppConfigService } from '../config/app-config.service';

import { PRISMA_LOG_LEVELS } from './prisma.constants';

import type { ExtendedPrismaClient, PrismaClientOptions } from './prisma.types';

/**
 * The class trick below gives `PrismaService` the *extended* client type (with the audit
 * extension applied) while staying a plain class Nest can inject by reference.
 */
class AuditedPrismaClient extends PrismaClient {
  constructor(options: PrismaClientOptions) {
    super(options);
    return applyAuditExtension(this) as this;
  }
}

const TypedAuditedPrismaClient = AuditedPrismaClient as unknown as new (
  options: PrismaClientOptions,
) => ExtendedPrismaClient;

/**
 * Single PrismaClient for the process, with the audit extension applied (every mutation of
 * a model in `audit.config.ts` is chained into `audit_log`). Connects eagerly so a bad
 * DATABASE_URL fails the boot instead of the first request.
 */
@Injectable()
export class PrismaService
  extends TypedAuditedPrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: AppConfigService) {
    super({
      datasources: { db: { url: config.databaseUrl } },
      log: config.isProduction ? PRISMA_LOG_LEVELS.PRODUCTION : PRISMA_LOG_LEVELS.DEVELOPMENT,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('database connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('database disconnected');
  }
}
