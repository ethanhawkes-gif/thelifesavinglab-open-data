// "Do not add these": pairs of figures that must never be summed, subtracted or averaged.

/** Return every forbidden pair contained in a proposed combination of observation ids. */
export function findViolations(ids, pairs) {
  if (!Array.isArray(ids)) throw new TypeError('ids must be an array');
  const set = new Set(ids);
  return pairs.filter((p) => set.has(p.a_id) && set.has(p.b_id));
}
