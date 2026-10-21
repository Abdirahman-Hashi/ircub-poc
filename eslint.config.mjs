// ESLint flat config — the executable form of docs/ENGINEERING-STANDARDS.md.
//
// §1 no hard-coded values   → @typescript-eslint/no-magic-numbers (strings are a review item)
// §2 types in type files    → consistent-type-definitions + no-restricted-syntax (see TYPE_FILES)
// §3 layering               → import-x/no-cycle, import-x/order
// general hygiene           → typescript-eslint strict + stylistic, type-checked
import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import { flatConfigs as importXFlatConfigs } from 'eslint-plugin-import-x';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Files that are allowed to declare `interface`, `type` and `enum`.
 * Everything else must import its types from one of these.
 */
const TYPE_FILES = [
  '**/*.types.ts',
  '**/*.dto.ts',
  '**/*.constants.ts',
  '**/*.keys.ts',
  '**/*.payloads.ts',
  '**/job-payloads.ts',
  '**/event-payloads.ts',
  '**/*.schema.ts',
  '**/enums.ts',
  '**/permissions.ts',
  '**/roles.ts',
  '**/error-codes.ts',
  '**/*.d.ts',
  '**/*.spec.ts',
  '**/*.spec.tsx',
  '**/*.e2e-spec.ts',
];

/**
 * Files where numeric literals are data rather than logic: tests, constants, seed data,
 * config-key default maps, and build/tool configuration.
 */
const MAGIC_NUMBER_EXEMPT_FILES = [
  '**/*.spec.ts',
  '**/*.spec.tsx',
  '**/*.e2e-spec.ts',
  '**/*.constants.ts',
  '**/*.keys.ts',
  '**/seed/**',
  '**/seed.ts',
  '**/test/**',
  '**/*.config.ts',
  '**/*.config.mjs',
];

const TYPE_DECLARATION_SELECTORS = [
  {
    selector: 'TSInterfaceDeclaration',
    message: 'Declare interfaces in a *.types.ts / *.dto.ts file and import them (standards §2).',
  },
  {
    selector: 'TSTypeAliasDeclaration',
    message: 'Declare type aliases in a *.types.ts file and import them (standards §2).',
  },
  {
    selector: 'TSEnumDeclaration',
    message:
      'Declare enums in packages/shared (enums.ts, error-codes.ts) or a *.keys.ts file (standards §2).',
  },
];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/storage/**',
      'apps/api/prisma/migrations/**',
      'docs/**',
      'pnpm-lock.yaml',
    ],
  },

  js.configs.recommended,
  importXFlatConfigs.recommended,

  // ── TypeScript sources (type-aware) ──────────────────────────────────────────
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      importXFlatConfigs.typescript,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node, ...globals.browser },
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          noWarnOnMultipleProjects: true,
          project: [
            'apps/api/tsconfig.json',
            'apps/mocks/tsconfig.json',
            'apps/web/tsconfig.json',
            'packages/shared/tsconfig.json',
          ],
        }),
      ],
    },
    rules: {
      // §1 — every number lives in exactly one named place.
      '@typescript-eslint/no-magic-numbers': [
        'error',
        {
          ignore: [0, 1, -1],
          ignoreEnums: true,
          ignoreReadonlyClassProperties: true,
          ignoreTypeIndexes: true,
          ignoreArrayIndexes: true,
          enforceConst: true,
          detectObjects: false,
        },
      ],

      // §2 — one way to declare object types, and only in type files.
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      'no-restricted-syntax': ['error', ...TYPE_DECLARATION_SELECTORS],

      // Strictness beyond the presets.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // Nest modules and decorator-only classes are intentionally "empty".
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      // Nest DI relies on parameter properties (`constructor(private readonly x: X)`).
      '@typescript-eslint/parameter-properties': 'off',
      // Thrown values are always Error subclasses; HttpException is one.
      '@typescript-eslint/only-throw-error': 'error',
      // Template literals with numbers/booleans are fine in log lines.
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],

      // §3 — dependency hygiene.
      'import-x/no-cycle': ['error', { maxDepth: Infinity }],
      'import-x/no-unresolved': 'error',
      'import-x/no-default-export': 'off',
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
          pathGroups: [{ pattern: '@ircub/**', group: 'internal', position: 'before' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },

  // ── Exemptions (narrow and named) ────────────────────────────────────────────
  {
    files: TYPE_FILES,
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: MAGIC_NUMBER_EXEMPT_FILES,
    rules: { '@typescript-eslint/no-magic-numbers': 'off' },
  },
  {
    // Tests mock freely; the strictest unsafe-* rules add noise without catching bugs there.
    files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.e2e-spec.ts', '**/test/**'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },

  // ── React (apps/web) ─────────────────────────────────────────────────────────
  {
    files: ['apps/web/**/*.tsx', 'apps/web/**/*.ts'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      // React Compiler rule; the app is not compiled with it, and react-hook-form's register spread trips it.
      'react-hooks/incompatible-library': 'off',
    },
  },

  // ── Plain JS config files (no type information) ──────────────────────────────
  {
    files: ['**/*.mjs', '**/*.cjs', '**/*.js'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'import-x/no-unresolved': 'off',
    },
  },

  eslintConfigPrettier,
);
