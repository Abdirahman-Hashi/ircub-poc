import {
  IconBuildingBank,
  IconCash,
  IconChartBar,
  IconDroplet,
  IconFileInvoice,
  IconHistory,
  IconSettings,
  IconUser,
  IconUsers,
} from '@tabler/icons-react';

import { PERMISSIONS } from '@ircub/shared';

import { ROUTES } from './routes.constants';

import type { NavItem } from './nav.types';

export const NAV_ITEMS: readonly NavItem[] = [
  {
    label: 'Dashboard',
    to: ROUTES.DASHBOARD,
    icon: IconChartBar,
    permission: PERMISSIONS.DASHBOARD_VIEW,
  },
  { label: 'Payers', to: ROUTES.PAYERS, icon: IconUsers, permission: PERMISSIONS.PAYERS_VIEW },
  {
    label: 'Assessments',
    to: ROUTES.ASSESSMENTS,
    icon: IconFileInvoice,
    permission: PERMISSIONS.ASSESSMENTS_VIEW,
  },
  { label: 'Payments', to: ROUTES.PAYMENTS, icon: IconCash, permission: PERMISSIONS.PAYMENTS_VIEW },
  {
    label: 'Water billing',
    to: ROUTES.WATER,
    icon: IconDroplet,
    permission: PERMISSIONS.BILLS_VIEW,
  },
  { label: 'FMIS', to: ROUTES.FMIS, icon: IconBuildingBank, permission: PERMISSIONS.FMIS_VIEW },
  { label: 'Audit log', to: ROUTES.AUDIT, icon: IconHistory, permission: PERMISSIONS.AUDIT_VIEW },
  {
    label: 'Administration',
    to: ROUTES.ADMIN_USERS,
    icon: IconSettings,
    permission: PERMISSIONS.USERS_MANAGE,
  },
  { label: 'My account', to: ROUTES.ME, icon: IconUser, permission: PERMISSIONS.SELF_VIEW },
];
