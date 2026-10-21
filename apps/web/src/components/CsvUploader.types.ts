import type { CsvImportSummaryView } from '../api/types';

export interface CsvUploaderProps {
  /** Validate without saving; returns the preview summary. */
  readonly onDryRun: (file: File) => Promise<CsvImportSummaryView>;
  /** Persist; returns the final summary. */
  readonly onConfirm: (file: File) => Promise<CsvImportSummaryView>;
  readonly onTemplate?: () => Promise<Blob>;
  readonly templateFileName?: string;
}

export type UploadStage = 'pick' | 'preview' | 'done';
