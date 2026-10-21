import type { CanFn, NavItem } from './nav.types';
import type { RoutePath } from './routes.constants';

const PATH_SEPARATOR = '/';

/** Pure: the navigation a user sees is exactly the items whose permission they hold. */
export function filterNav(items: readonly NavItem[], can: CanFn): readonly NavItem[] {
  return items.filter((item) => can(item.permission));
}

/** A nav item is active for its own path and every path under the same top-level section. */
export function isNavActive(pathname: string, to: RoutePath): boolean {
  const section = (path: string): string | undefined => path.split(PATH_SEPARATOR)[1];
  return section(pathname) === section(to);
}
