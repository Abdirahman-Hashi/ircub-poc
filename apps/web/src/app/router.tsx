import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
} from '@tanstack/react-router';

import { ComingSoonPage } from '../components/ComingSoonPage';
import { LoginPage } from '../features/auth/LoginPage';

import { AppShellLayout } from './AppShell';
import { ROUTES } from './routes.constants';

import type { ReactElement } from 'react';

const rootRoute = createRootRoute({ component: Outlet });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.LOGIN,
  component: LoginPage,
});

/** Pathless layout: everything under it renders inside the AppShell. */
const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'shell',
  component: AppShellLayout,
});

const homeRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: ROUTES.HOME,
  component: () => <Navigate to={ROUTES.DASHBOARD} replace />,
});

function placeholder(title: string): () => ReactElement {
  return function Placeholder(): ReactElement {
    return <ComingSoonPage title={title} />;
  };
}

const featureRoutes = [
  createRoute({
    getParentRoute: () => shellRoute,
    path: ROUTES.DASHBOARD,
    component: placeholder('Dashboard'),
  }),
  createRoute({
    getParentRoute: () => shellRoute,
    path: ROUTES.PAYERS,
    component: placeholder('Payers'),
  }),
  createRoute({
    getParentRoute: () => shellRoute,
    path: ROUTES.ASSESSMENTS,
    component: placeholder('Assessments'),
  }),
  createRoute({
    getParentRoute: () => shellRoute,
    path: ROUTES.PAYMENTS,
    component: placeholder('Payments'),
  }),
  createRoute({
    getParentRoute: () => shellRoute,
    path: ROUTES.WATER,
    component: placeholder('Water billing'),
  }),
  createRoute({
    getParentRoute: () => shellRoute,
    path: ROUTES.FMIS,
    component: placeholder('FMIS'),
  }),
  createRoute({
    getParentRoute: () => shellRoute,
    path: ROUTES.AUDIT,
    component: placeholder('Audit log'),
  }),
  createRoute({
    getParentRoute: () => shellRoute,
    path: ROUTES.ADMIN,
    component: placeholder('Administration'),
  }),
  createRoute({
    getParentRoute: () => shellRoute,
    path: ROUTES.ME,
    component: placeholder('My account'),
  }),
];

const routeTree = rootRoute.addChildren([
  loginRoute,
  shellRoute.addChildren([homeRoute, ...featureRoutes]),
]);

export const router = createRouter({ routeTree, defaultPreload: 'intent' });
