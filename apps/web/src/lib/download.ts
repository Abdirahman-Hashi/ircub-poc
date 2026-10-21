/** Triggers a browser download for a Blob (CSV exports, rejected-row reports). */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function csvBlob(lines: readonly string[]): Blob {
  return new Blob([`${lines.join('\n')}\n`], { type: 'text/csv;charset=utf-8' });
}
