import { CSV_IMPORT } from './csv.constants';

/** Accepts the browser's declared MIME type or a `.csv` filename; content is parsed regardless. */
export function isCsvUpload(mimeType: string, originalName: string): boolean {
  return (
    (CSV_IMPORT.ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType) ||
    originalName.toLowerCase().endsWith('.csv')
  );
}
