import type { Config } from 'jest';

/** Unit tests: `*.spec.ts` next to the code, no database. */
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/main.ts',
    '!src/openapi-export.ts',
  ],
  coverageDirectory: 'coverage',
  clearMocks: true,
};

export default config;
