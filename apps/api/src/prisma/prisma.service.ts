import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { AppConfigService } from '../config/app-config.service';

import { PRISMA_LOG_LEVELS } from './prisma.constants';

/**
 * Single PrismaClient for the process. Connects eagerly on module init so a bad
 * DATABASE_URL fails the boot instead of the first request, and disconnects on shutdown
 * (main.ts enables shutdown hooks). Phase 1 wraps this client with the audit extension.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
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
