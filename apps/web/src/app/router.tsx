import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';

import { PERMISSIONS } from '@ircub/shared';
import type { PermissionCode } from '@ircub/shared';

import { ComingSoonPage } from '../components/ComingSoonPage';
import { ChangePasswordPage } from '../features/account/ChangePasswordPage';
import { MfaPage } from '../features/account/MfaPage';
import { ConfigPage } from '../features/admin/ConfigPage';
import { RolesPage } from '../features/admin/RolesPage';
import { SodRulesPage } from '../features/admin/SodRulesPage';
import { UsersPage } from '../features/admin/UsersPage';
import { ForbiddenPage } from '../features/auth/ForbiddenPage';
import { LoginPage } from '../features/auth/LoginPage';
import { BulkUploadPage } from '../features/bulk/BulkUploadPage';
import { HomePage } from '../features/home/HomePage';
import { DuplicatesPage } from '../features/payers/DuplicatesPage';
import { PayerProfilePage } from '../features/payers/PayerProfilePage';
import { PayersPage } from '../features/payers/PayersPage';
import { RegisterPayerPage } from '../features/payers/RegisterPayerPage';
import { CapturePaymentPage } from '../features/payments/CapturePaymentPage';
import { PaymentsPage } from '../features/payments/PaymentsPage';
import { AssessmentsPage } from '../features/revenue/AssessmentsPage';
import { NewAssessmentPage } from '../features/revenue/NewAssessmentPage';
import { RevenueTypesPage } from '../features/revenue/RevenueTypesPage';
import { ReversalsPage } from '../features/reversals/ReversalsPage';
import { MyProfilePage } from '../features/self/MyProfilePage';

import { AppShellLayout } from './AppShell';
import { RequireAuth, RequirePermission } from './route-guards';
import { ROUTES, type RoutePath } from './routes.constants';

import type { ReactElement } from 'react';

const rootRoute = createRootRoute({ component: Outlet });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.LOGIN,
  component: LoginPage,
});

/** Pathless layouts: first restore/require the session, then render inside the shell. */
const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'auth',
  component: RequireAuth,
});
const shellRoute = createRoute({
  getParentRoute: () => authRoute,
  id: 'shell',
  component: AppShellLayout,
});

function guarded(permission: PermissionCode, Page: () => ReactElement): () => ReactElement {
  return function GuardedPage(): ReactElement {
    return (
      <RequirePermission permission={permission}>
        <Page />
      </RequirePermission>
    );
  };
}

function placeholder(title: string): () => ReactElement {
  return function Placeholder(): ReactElement {
    return <ComingSoonPage title={title} />;
  };
}

// Generic so each route keeps its literal path type; a widened union would make TanStack
// Router demand `params` on every navigation.
function page<TPath extends RoutePath>(path: TPath, component: () => ReactElement) {
  return createRoute({ getParentRoute: () => shellRoute, path, component });
}

const routeTree = rootRoute.addChildren([
  loginRoute,
  authRoute.addChildren([
    shellRoute.addChildren([
      page(ROUTES.HOME, HomePage),
      page(ROUTES.FORBIDDEN, ForbiddenPage),
      page(ROUTES.ACCOUNT_PASSWORD, ChangePasswordPage),
      page(ROUTES.ACCOUNT_MFA, MfaPage),
      page(ROUTES.ADMIN_USERS, guarded(PERMISSIONS.USERS_MANAGE, UsersPage)),
      page(ROUTES.ADMIN_ROLES, guarded(PERMISSIONS.ROLES_MANAGE, RolesPage)),
      page(ROUTES.ADMIN_SOD, guarded(PERMISSIONS.ROLES_MANAGE, SodRulesPage)),
      page(ROUTES.ADMIN_CONFIG, guarded(PERMISSIONS.CONFIG_MANAGE, ConfigPage)),
      page(ROUTES.DASHBOARD, guarded(PERMISSIONS.DASHBOARD_VIEW, placeholder('Dashboard'))),
      page(ROUTES.PAYERS, guarded(PERMISSIONS.PAYERS_VIEW, PayersPage)),
      page(ROUTES.PAYER_NEW, guarded(PERMISSIONS.PAYERS_REGISTER, RegisterPayerPage)),
      page(ROUTES.PAYER_DUPLICATES, guarded(PERMISSIONS.PAYERS_REVIEW_DUPLICATES, DuplicatesPage)),
      page(ROUTES.PAYER_DETAIL, guarded(PERMISSIONS.PAYERS_VIEW, PayerProfilePage)),
      page(ROUTES.REVENUE_TYPES, guarded(PERMISSIONS.REVENUE_TYPES_MANAGE, RevenueTypesPage)),
      page(ROUTES.ASSESSMENTS, guarded(PERMISSIONS.ASSESSMENTS_VIEW, AssessmentsPage)),
      page(ROUTES.ASSESSMENT_NEW, guarded(PERMISSIONS.ASSESSMENTS_CREATE, NewAssessmentPage)),
      page(ROUTES.PAYMENTS, guarded(PERMISSIONS.PAYMENTS_VIEW, PaymentsPage)),
      page(ROUTES.PAYMENT_CAPTURE, guarded(PERMISSIONS.PAYMENTS_CAPTURE, CapturePaymentPage)),
      page(ROUTES.BULK_UPLOADS, guarded(PERMISSIONS.BULK_UPLOADS_CREATE, BulkUploadPage)),
      page(ROUTES.REVERSALS, guarded(PERMISSIONS.PAYMENTS_VIEW, ReversalsPage)),
      page(ROUTES.WATER, guarded(PERMISSIONS.BILLS_VIEW, placeholder('Water billing'))),
      page(ROUTES.FMIS, guarded(PERMISSIONS.FMIS_VIEW, placeholder('FMIS'))),
      page(ROUTES.AUDIT, guarded(PERMISSIONS.AUDIT_VIEW, placeholder('Audit log'))),
      page(ROUTES.ME, guarded(PERMISSIONS.SELF_VIEW, MyProfilePage)),
    ]),
  ]),
]);

export const router = createRouter({ routeTree, defaultPreload: 'intent' });
