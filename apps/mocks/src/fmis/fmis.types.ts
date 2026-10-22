import type { StoredJournal } from '../store/store.types';

export interface JournalPostResult {
  readonly journal: StoredJournal;
  readonly created: boolean;
}
