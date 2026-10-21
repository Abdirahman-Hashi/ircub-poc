import type { SystemConfigKey, SystemConfigValues } from './system-config.keys';

export interface CachedConfigValue<K extends SystemConfigKey = SystemConfigKey> {
  readonly value: SystemConfigValues[K];
  readonly expiresAt: number;
}

export interface SystemConfigEntry<K extends SystemConfigKey = SystemConfigKey> {
  readonly key: K;
  readonly value: SystemConfigValues[K];
  readonly defaultValue: SystemConfigValues[K];
  readonly description: string;
  readonly updatedAt: Date | null;
}
