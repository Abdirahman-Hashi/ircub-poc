/** Fixed faker seed so every environment gets identical demo data (standards §6). */
export const FAKER_SEED = 42;

/** Password for every seeded demo user (CLAUDE.md). Demo only. */
export const SEED_PASSWORD = 'Passw0rd!2026';

export const SEED_EMAIL_DOMAIN = 'ircub.test';

/** Nest logger levels kept while seeding (audit debug lines are suppressed). */
export const SEED_LOG_LEVELS = ['log', 'warn', 'error'] as const;
