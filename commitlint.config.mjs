export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Scopes mirror the workspace packages so history reads like the phase plan.
    'scope-enum': [2, 'always', ['api', 'web', 'mocks', 'shared', 'deps', 'ci', 'docs']],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
  },
};
