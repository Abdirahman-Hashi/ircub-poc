import type { JOB } from './job-names';
import type { JobPayloads } from './job-payloads';
import type { Job, SendOptions } from 'pg-boss';

export type JobName = (typeof JOB)[keyof typeof JOB];

export type JobPayload<J extends JobName> = JobPayloads[J];

/** Subset of pg-boss send options business code is allowed to tune. */
export type EnqueueOptions = Pick<
  SendOptions,
  'retryLimit' | 'retryDelay' | 'retryBackoff' | 'startAfter' | 'singletonKey' | 'expireInSeconds'
>;

export type JobHandler<J extends JobName> = (
  payload: JobPayload<J>,
  job: Job<JobPayload<J>>,
) => Promise<void>;
