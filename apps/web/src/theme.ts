import { createTheme } from '@mantine/core';

/** Small theme over Mantine defaults (apps/web/CLAUDE.md): one primary colour, one font. */
export const theme = createTheme({
  primaryColor: 'teal',
  fontFamily: 'Inter, system-ui, sans-serif',
  defaultRadius: 'sm',
});
