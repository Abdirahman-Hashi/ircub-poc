import type { PageRequest } from '@ircub/shared';

export interface AuditListParams extends PageRequest {
  readonly entity?: string;
  readonly entityId?: string;
  readonly actorId?: string;
  readonly from?: string;
  readonly to?: string;
}
