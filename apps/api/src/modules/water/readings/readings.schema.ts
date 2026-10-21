import { z } from 'zod';

import { ReadingType } from '@ircub/shared';

/** One data row of the meter-readings template. */
export const meterReadingRowSchema = z.object({
  meter_serial: z.string().trim().min(1, 'meter_serial is required'),
  reading_date: z.coerce.date(),
  reading_value: z.coerce.number().int().nonnegative(),
  type: z
    .string()
    .trim()
    .transform((value) => (value.length === 0 ? ReadingType.NORMAL : value.toUpperCase()))
    .pipe(z.enum(ReadingType)),
});

export type MeterReadingRow = z.infer<typeof meterReadingRowSchema>;
