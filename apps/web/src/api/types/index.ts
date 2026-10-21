/**
 * Components import API types from here only, so the dependency on @ircub/shared is in one
 * place and web-only view models can be added beside the shared contracts.
 */
export type {
  ErrorResponse,
  HealthCheck,
  HealthResponse,
  Paginated,
  PageRequest,
  SseEnvelope,
} from '@ircub/shared';
