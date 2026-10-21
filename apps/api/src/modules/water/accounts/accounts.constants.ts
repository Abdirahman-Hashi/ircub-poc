export const ACCOUNTS_API = {
  PATH: 'water-accounts',
  DISCONNECT: 'disconnect',
  RECONNECT: 'reconnect',
  STATEMENT: 'statement',
  STATEMENT_PDF: 'statement.pdf',
  SORTABLE: ['accountNumber', 'openedAt', 'status'] as const,
} as const;
