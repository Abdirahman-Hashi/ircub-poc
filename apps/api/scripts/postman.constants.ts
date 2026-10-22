/** Where the Postman artefacts live and what the pre-request login script expects (D22). */
export const POSTMAN = {
  OPENAPI_PATH: '../../../docs/openapi.json',
  COLLECTION_PATH: '../../../docs/postman/IRCUB.postman_collection.json',
  ENVIRONMENT_PATH: '../../../docs/postman/IRCUB.postman_environment.json',
  COLLECTION_NAME: 'IRCUB POC',
  ENVIRONMENT_NAME: 'IRCUB local',
  VARIABLES: {
    BASE_URL: 'baseUrl',
    ACCESS_TOKEN: 'accessToken',
    ADMIN_EMAIL: 'adminEmail',
    ADMIN_PASSWORD: 'adminPassword',
  },
  DEFAULTS: {
    BASE_URL: 'http://localhost:3000',
    ADMIN_EMAIL: 'admin@ircub.test',
    /** Seeded demo password (CLAUDE.md); never a real credential. */
    ADMIN_PASSWORD: 'Passw0rd!2026',
  },
  LOGIN_PATH: '/auth/login',
  INDENT: 2,
} as const;
