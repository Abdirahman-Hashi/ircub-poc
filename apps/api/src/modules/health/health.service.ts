import { readFileSync } from 'node:fs';

import { Injectable, Logger } from '@nestjs/common';

import { CHECK_STATUS, HEALTH_STATUS, type HealthCheck, type HealthResponse } from '@ircub/shared';

import { JobsService } from '../../common/jobs/jobs.service';
import { PrismaService } from '../../prisma/prisma.service';

import { HEALTH } from './health.constants';

import type { PackageManifest } from './health.types';

/**
 * Liveness answers "is the process up"; readiness answers "can it serve traffic"
 * (database reachable, job queue started). Orchestrators and the web's wake-up overlay use
 * them differently, so they are separate endpoints (standards §4).
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly version = this.readVersion();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
  ) {}

  liveness(): HealthResponse {
    return this.build(HEALTH_STATUS.OK, {});
  }

  async readiness(): Promise<HealthResponse> {
    const checks = {
      [HEALTH.CHECK_DB]: await this.checkDatabase(),
      [HEALTH.CHECK_JOBS]: this.checkJobs(),
    };
    const allUp = Object.values(checks).every((check) => check.status === CHECK_STATUS.UP);
    return this.build(allUp ? HEALTH_STATUS.OK : HEALTH_STATUS.DOWN, checks);
  }

  private build(
    status: HealthResponse['status'],
    checks: Record<string, HealthCheck>,
  ): HealthResponse {
    return { status, checks, version: this.version, timestamp: new Date().toISOString() };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const startedAt = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: CHECK_STATUS.UP, latencyMs: Date.now() - startedAt };
    } catch (error: unknown) {
      this.logger.warn({ msg: 'readiness: database check failed' });
      return {
        status: CHECK_STATUS.DOWN,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private checkJobs(): HealthCheck {
    return { status: this.jobs.isReady() ? CHECK_STATUS.UP : CHECK_STATUS.DOWN };
  }

  private readVersion(): string {
    try {
      const manifest = JSON.parse(
        readFileSync(HEALTH.PACKAGE_JSON_PATH, 'utf8'),
      ) as PackageManifest;
      return manifest.version ?? HEALTH.UNKNOWN_VERSION;
    } catch {
      return HEALTH.UNKNOWN_VERSION;
    }
  }
}
