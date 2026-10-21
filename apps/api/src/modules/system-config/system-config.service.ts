import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

import { SYSTEM_CONFIG } from './system-config.constants';
import {
  SYSTEM_CONFIG_DEFAULTS,
  SYSTEM_CONFIG_DESCRIPTIONS,
  SystemConfigKey,
  type SystemConfigValues,
} from './system-config.keys';

import type { CachedConfigValue, SystemConfigEntry } from './system-config.types';

/**
 * Reads runtime-tunable parameters with a short in-memory cache. A missing row or a row
 * whose JSON has the wrong primitive type falls back to the typed default and logs a
 * warning, so a bad admin edit degrades to documented behaviour instead of crashing.
 */
@Injectable()
export class SystemConfigService {
  private readonly logger = new Logger(SystemConfigService.name);
  private readonly cache = new Map<SystemConfigKey, CachedConfigValue>();

  constructor(private readonly prisma: PrismaService) {}

  async get<K extends SystemConfigKey>(key: K): Promise<SystemConfigValues[K]> {
    const cached = this.cache.get(key);
    if (cached !== undefined && cached.expiresAt > Date.now()) {
      return cached.value as SystemConfigValues[K];
    }

    const row = await this.prisma.systemConfig.findUnique({ where: { key } });
    const value = this.coerce(key, row?.value);
    this.cache.set(key, { value, expiresAt: Date.now() + SYSTEM_CONFIG.CACHE_TTL_MS });
    return value;
  }

  async set<K extends SystemConfigKey>(
    key: K,
    value: SystemConfigValues[K],
    updatedById?: string,
  ): Promise<void> {
    await this.prisma.systemConfig.upsert({
      where: { key },
      create: {
        key,
        value,
        description: SYSTEM_CONFIG_DESCRIPTIONS[key],
        ...(updatedById === undefined ? {} : { updatedById }),
      },
      update: { value, ...(updatedById === undefined ? {} : { updatedById }) },
    });
    this.cache.delete(key);
  }

  async list(): Promise<SystemConfigEntry[]> {
    const rows = await this.prisma.systemConfig.findMany();
    const byKey = new Map(rows.map((row) => [row.key, row]));
    return Object.values(SystemConfigKey).map((key) => {
      const row = byKey.get(key);
      return {
        key,
        value: this.coerce(key, row?.value),
        defaultValue: SYSTEM_CONFIG_DEFAULTS[key],
        description: SYSTEM_CONFIG_DESCRIPTIONS[key],
        updatedAt: row?.updatedAt ?? null,
      };
    });
  }

  invalidate(): void {
    this.cache.clear();
  }

  private coerce<K extends SystemConfigKey>(key: K, stored: unknown): SystemConfigValues[K] {
    const fallback = SYSTEM_CONFIG_DEFAULTS[key];
    if (stored === undefined || stored === null) {
      return fallback;
    }
    if (typeof stored !== typeof fallback) {
      this.logger.warn({
        msg: 'system config value has wrong type; using default',
        key,
        expected: typeof fallback,
        actual: typeof stored,
      });
      return fallback;
    }
    return stored as SystemConfigValues[K];
  }
}
