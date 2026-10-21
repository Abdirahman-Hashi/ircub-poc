export const ASSESSMENTS_MESSAGES = {
  NOT_FOUND: 'Assessment not found.',
  BASE_AMOUNT_REQUIRED: 'A base amount is required for a percentage-rated revenue type.',
  NOT_PAYABLE: 'Assessment cannot receive payments in its current status.',
  OVERPAYMENT: 'Payment exceeds the outstanding amount.',
  CANNOT_CANCEL_PAID: 'Only unpaid assessments can be cancelled.',
  UNKNOWN_CONTROL_NUMBER: 'No assessment with this control number.',
} as const;
