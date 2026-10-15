// A small JSON Schema checker: enough of draft 2020-12 for the lab's own schemas (tasks, bundles), with no dependency.
// Supports: type (incl. arrays of types), const, enum, required, properties, additionalProperties:false,
// items, maxItems, minItems, maxLength, minLength, pattern, minimum, maximum. Anything else is ignored.

const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v === 'number' && Number.isInteger(v) ? 'integer' : typeof v);
const isType = (v, t) => t === 'number' ? typeof v === 'number' : t === 'integer' ? Number.isInteger(v) : typeOf(v) === t;

/** Returns a list of `{path, message}` problems; empty when the value matches the schema. */
export function validate(schema, value, path = '$') {
  const out = [];
  const bad = (message) => out.push({ path, message });
  if (!schema || typeof schema !== 'object') return out;
  if ('const' in schema && JSON.stringify(value) !== JSON.stringify(schema.const)) bad(`must be ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) bad(`must be one of ${schema.enum.map((e) => JSON.stringify(e)).join(', ')}`);
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => isType(value, t))) { bad(`must be ${types.join(' or ')}, got ${typeOf(value)}`); return out; }
  }
  if (typeof value === 'string') {
    if (schema.maxLength != null && value.length > schema.maxLength) bad(`longer than ${schema.maxLength} characters`);
    if (schema.minLength != null && value.length < schema.minLength) bad(`shorter than ${schema.minLength} characters`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) bad(`does not match ${schema.pattern}`);
  }
  if (typeof value === 'number') {
    if (schema.minimum != null && value < schema.minimum) bad(`below ${schema.minimum}`);
    if (schema.maximum != null && value > schema.maximum) bad(`above ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.maxItems != null && value.length > schema.maxItems) bad(`more than ${schema.maxItems} items`);
    if (schema.minItems != null && value.length < schema.minItems) bad(`fewer than ${schema.minItems} items`);
    if (schema.items) value.forEach((v, i) => out.push(...validate(schema.items, v, `${path}[${i}]`)));
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const k of schema.required || []) if (!(k in value)) bad(`missing "${k}"`);
    const props = schema.properties || {};
    for (const [k, v] of Object.entries(value)) {
      if (k in props) out.push(...validate(props[k], v, `${path}.${k}`));
      else if (schema.additionalProperties === false) out.push({ path: `${path}.${k}`, message: 'unexpected field' });
    }
  }
  return out;
}
