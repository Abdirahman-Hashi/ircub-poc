import { notifications } from '@mantine/notifications';

import { ApiError } from './api-error';

const COLORS = { ERROR: 'red', SUCCESS: 'teal', WARNING: 'orange', INFO: 'blue' } as const;

const SEVERITY_COLOR: Readonly<Record<string, string>> = {
  CRITICAL: COLORS.ERROR,
  WARNING: COLORS.WARNING,
  INFO: COLORS.INFO,
};

/** Shows the API's stable `code` and message so support can correlate with server logs. */
export function notifyError(error: unknown): void {
  if (error instanceof ApiError) {
    notifications.show({
      color: COLORS.ERROR,
      title: error.code,
      message:
        error.requestId === undefined
          ? error.message
          : `${error.message} (request ${error.requestId})`,
    });
    return;
  }
  notifications.show({
    color: COLORS.ERROR,
    title: 'Error',
    message: error instanceof Error ? error.message : String(error),
  });
}

/** A live alert from the dashboard stream, coloured by severity. */
export function notifyAlert(severity: string, title: string): void {
  notifications.show({
    color: SEVERITY_COLOR[severity] ?? COLORS.INFO,
    title: `${severity} alert`,
    message: title,
  });
}

export function notifySuccess(message: string): void {
  notifications.show({ color: COLORS.SUCCESS, message });
}
