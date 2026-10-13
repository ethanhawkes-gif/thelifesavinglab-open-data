// Conservative PII / sensitive-content detector. False positives go to quarantine for a human; that is the intent.
/** @type {Array<[string, RegExp]>} */
const PATTERNS = [
  ['email', /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i],
  ['email_obfuscated', /\b[\w.+-]+\s*[[(]\s*at\s*[\])]\s*[\w-]+\s*[[(]\s*dot\s*[\])]\s*[a-z]{2,}/i],
  ['phone', /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/],
  ['us_ssn', /\b\d{3}-\d{2}-\d{4}\b/],
  ['street_address', /\b\d{1,5}\s+\w+(?:\s\w+)?\s(?:St|Street|Ave|Avenue|Rd|Road|Ln|Lane|Dr|Drive|Ct|Court|Blvd)\b/i],
  ['gps_point', /-?\d{1,3}\.\d{4,},\s*-?\d{1,3}\.\d{4,}/],
  ['date_of_birth', /\b(?:dob|date of birth|born on)\b/i],
  ['named_person_marker', /\b(?:victim|deceased|survivor|patient|next of kin)\s*(?:name)?\s*[:=]/i],
  ['credential', /\b(?:api[_-]?key|secret|password|token)\s*[:=]|\bgh[pousr]_[A-Za-z0-9]{20,}|\bsk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}/i],
  ['self_harm_detail', /\b(?:suicide method|how to (?:kill|drown) (?:my|your)self)\b/i],
];

/** Return the sorted, unique list of PII kinds found anywhere in a value (strings, arrays, objects). */
export function detectPII(value) {
  const found = new Set();
  const walk = (v, depth) => {
    if (depth > 8) { found.add('too_deep'); return; }
    if (typeof v === 'string') { for (const [k, re] of PATTERNS) if (re.test(v)) found.add(k); }
    else if (Array.isArray(v)) v.forEach((x) => walk(x, depth + 1));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { walk(k, depth + 1); walk(x, depth + 1); }
  };
  walk(value, 0);
  return [...found].sort();
}
