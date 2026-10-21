/** One colour per status value, so badges are consistent across screens. */
export const STATUS_COLORS: Readonly<Record<string, string>> = {
  ACTIVE: 'teal',
  SUSPENDED: 'gray',
  DEACTIVATED: 'gray',
  PENDING: 'yellow',
  PART_PAID: 'blue',
  PAID: 'teal',
  CANCELLED: 'gray',
  INITIATED: 'yellow',
  CONFIRMED: 'teal',
  FAILED: 'red',
  PERMANENTLY_FAILED: 'red',
  REVERSED: 'orange',
  PENDING_APPROVAL: 'yellow',
  APPROVED: 'teal',
  REJECTED: 'red',
  DISMISSED: 'gray',
};

export const DEFAULT_STATUS_COLOR = 'gray';
