import type { MeterWithLatest } from '../water-views.types';

/** Shared per-file context for the readings importer. */
export interface ReadingsImportContext {
  readonly metersBySerial: Map<string, MeterWithLatest>;
  /** Latest accepted value/date per meter, updated as rows are accepted so later rows chain. */
  readonly latestByMeter: Map<string, { value: number; date: Date }>;
  readonly now: Date;
}

export interface RecordReadingInput {
  readonly meter: MeterWithLatest;
  readonly readingDate: Date;
  readonly readingValue: number;
  readonly type: 'NORMAL' | 'ROLLOVER' | 'REPLACEMENT';
  readonly source: 'MANUAL' | 'CSV';
  readonly capturedById: string;
  readonly bulkUploadId: string | null;
}

export interface PreviousReadingState {
  readonly value: number;
  readonly date: Date | null;
}
