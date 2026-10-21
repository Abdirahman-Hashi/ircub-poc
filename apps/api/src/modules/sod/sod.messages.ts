export const SOD_MESSAGES = {
  NOT_FOUND: 'Segregation-of-duties rule not found.',
  SAME_PERMISSION: 'A rule needs two different permissions.',
  DUPLICATE: 'A rule for this pair of permissions already exists.',
  VIOLATION: 'This change would let a user hold permissions that must be segregated.',
  EXISTING_VIOLATIONS:
    'Users already hold both permissions; fix their roles before adding the rule.',
} as const;
