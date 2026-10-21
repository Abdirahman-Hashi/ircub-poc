export const BILLING_API = {
  PATH: 'billing-cycles',
  RELEASE: 'release',
  SORTABLE: ['period', 'runAt', 'status'] as const,
} as const;

export const BILL_NOTIFICATION = {
  SMS_TEMPLATE: (
    billNumber: string,
    period: string,
    totalDue: string,
    currency: string,
    dueDate: string,
  ): string =>
    `IRCUB water bill ${period}: ${currency} ${totalDue} due ${dueDate}. Pay with control number ${billNumber}.`,
  EMAIL_SUBJECT: (period: string): string => `Your water bill for ${period}`,
  EMAIL_TEMPLATE: (
    name: string,
    billNumber: string,
    period: string,
    totalDue: string,
    currency: string,
    dueDate: string,
  ): string =>
    `Dear ${name},\n\nYour water bill for ${period} is ${currency} ${totalDue}, due on ${dueDate}.\nPay at any channel using control number ${billNumber}.\n\nIRCUB Revenue Authority`,
} as const;
