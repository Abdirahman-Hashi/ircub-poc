/** Map lookup that fails loudly: seed data referencing a missing code is a bug, not a null. */
export function requireValue<K, V>(map: ReadonlyMap<K, V>, key: K, what: string): V {
  const value = map.get(key);
  if (value === undefined) {
    throw new Error(`seed: missing ${what} "${String(key)}"`);
  }
  return value;
}
