export const BILLS_API = {
  PATH: 'bills',
  PDF: 'pdf',
  CLEAR_FLAG: 'clear-flag',
  CONFIRM_FLAG: 'confirm-flag',
  SORTABLE: ['dueDate', 'createdAt', 'totalDue', 'status', 'billNumber'] as const,
} as const;

export const BILL_PDF = {
  TITLE: 'IRCUB Water Bill',
  FONT_TITLE: 18,
  FONT_BODY: 10,
  FONT_SMALL: 8,
  MARGIN: 50,
  LINE_GAP: 4,
  COLUMN_AMOUNT_X: 420,
  COLUMN_WIDTH: 120,
  SECTION_GAP: 12,
} as const;
