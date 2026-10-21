import type { CanFn, NavItem } from './nav.types';

/** Pure: the navigation a user sees is exactly the items whose permission they hold. */
export function filterNav(items: readonly NavItem[], can: CanFn): readonly NavItem[] {
  return items.filter((item) => can(item.permission));
}
