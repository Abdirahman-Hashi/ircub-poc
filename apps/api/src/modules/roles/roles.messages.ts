export const ROLES_MESSAGES = {
  NOT_FOUND: 'Role not found.',
  CODE_TAKEN: 'A role with this code already exists.',
  PARENT_NOT_FOUND: 'Parent role not found.',
  PARENT_CYCLE: 'This parent would make the role inherit from itself.',
  SYSTEM_IMMUTABLE: 'Built-in roles cannot be deleted.',
  IN_USE: 'Role is assigned to users or has child roles; remove those first.',
  UNKNOWN_PERMISSION: 'One or more permission codes do not exist.',
} as const;
