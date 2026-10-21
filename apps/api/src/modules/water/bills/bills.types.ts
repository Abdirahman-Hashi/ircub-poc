import type { ReadStream } from 'node:fs';

export interface BillPdfStream {
  readonly fileName: string;
  readonly stream: ReadStream;
}
