/**
 * Pure toggle semantics for membership sets.
 *
 * Used by `toggleVideoWatched` (student.service) and as a building block for
 * any "click again to undo" UX. Does not mutate the input.
 *
 * @template T
 * @param {ReadonlySet<T>} set
 * @param {T} key
 * @returns {{ next: Set<T>, wasIn: boolean }}
 */
export function toggleInSet(set, key) {
  const next = new Set(set);
  if (next.has(key)) {
    next.delete(key);
    return { next, wasIn: true };
  }
  next.add(key);
  return { next, wasIn: false };
}