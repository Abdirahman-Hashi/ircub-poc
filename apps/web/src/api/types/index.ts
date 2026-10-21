/**
 * Components import API types from here only, so the dependency on @ircub/shared is in one
 * place and web-only view models can be added beside the shared contracts.
 */
export type {
  AuthUser,
  CreatedUser,
  ErrorResponse,
  HealthCheck,
  HealthResponse,
  LoginResponse,
  MeResponse,
  MfaEnrolResponse,
  Paginated,
  PageRequest,
  PermissionCode,
  PermissionGroupView,
  PermissionView,
  RoleDetail,
  RoleSummary,
  SessionResponse,
  SodRuleView,
  SseEnvelope,
  SystemConfigEntryView,
  UserSummary,
} from '@ircub/shared';

export type { UserListParams } from './admin.types';
