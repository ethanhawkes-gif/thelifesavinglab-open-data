// Deterministic serialization and SHA-256 that run unchanged in Workers and Node >= 20.

/** JSON with recursively sorted object keys; arrays keep their order. */
export function canonicalJSON(value) {
  if (value === undefined) throw new TypeError('canonicalJSON: undefined is not serializable');
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new TypeError('canonicalJSON: non-finite number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return '[' + value.map(canonicalJSON).join(',') + ']';
  const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalJSON(value[k])).join(',') + '}';
}

/** Lowercase hex SHA-256 of a UTF-8 string. */
export async function sha256Hex(text) {
  if (typeof text !== 'string') throw new TypeError('sha256Hex expects a string');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time token check: compares SHA-256 digests so neither length nor prefix leaks. */
export async function tokenEquals(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const [x, y] = await Promise.all([sha256Hex(a), sha256Hex(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}
