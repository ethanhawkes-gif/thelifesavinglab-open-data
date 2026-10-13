// Validation for staged contributions. Nothing here writes canonical data.
import { CONFIDENCE } from './tiers.js';
import { detectPII, detectDistress } from './pii.js';

export const KINDS = Object.freeze(['correction', 'new_observation', 'source_metadata', 'non_additive_pair']);
export const MAX_BODY_BYTES = 8192;
const ID = /^[a-z0-9][a-z0-9-]{1,62}$/;
const URL_OK = /^https:\/\/[^\s<>"']{4,500}$/;
const ALLOWED = {
  correction: ['kind', 'target_id', 'field', 'proposed', 'citation'],
  new_observation: ['kind', 'label', 'year', 'place', 'toll', 'cause', 'confidence', 'citation'],
  source_metadata: ['kind', 'target_id', 'citation'],
  non_additive_pair: ['kind', 'a_id', 'b_id', 'reason', 'citation'],
};
const CITATION_KEYS = ['title', 'publisher', 'url', 'published', 'access_terms'];

function str(v, max) { return typeof v === 'string' && v.trim().length > 0 && v.length <= max; }

/** Validate a citation object: metadata only, never a copied body. */
export function validateCitation(c) {
  const errors = [];
  if (!c || typeof c !== 'object' || Array.isArray(c)) return ['citation: required object'];
  for (const k of Object.keys(c)) if (!CITATION_KEYS.includes(k)) errors.push(`citation.${k}: not allowed (metadata only)`);
  if (!str(c.title, 300)) errors.push('citation.title: required, <=300 chars');
  if (!str(c.publisher, 200)) errors.push('citation.publisher: required, <=200 chars');
  if (c.url !== undefined && !URL_OK.test(c.url)) errors.push('citation.url: must be https');
  if (c.published !== undefined && !str(c.published, 40)) errors.push('citation.published: <=40 chars');
  if (c.access_terms !== undefined && !str(c.access_terms, 300)) errors.push('citation.access_terms: <=300 chars');
  return errors;
}

/**
 * Classify a contribution payload.
 * @returns {{status:'staged'|'quarantined'|'rejected', errors:string[], pii:string[], distress?:boolean}}
 * Distress is checked first, before any structural rejection, so a person in danger always gets the redirect.
 * rejected = structurally unusable; quarantined = well-formed but needs a human (PII, unknown target).
 */
export function classifyContribution(payload, knownIds = new Set()) {
  if (detectDistress(payload)) return { status: 'quarantined', errors: ['possible distress message: this API is not monitored'], pii: ['distress'], distress: true };
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { status: 'rejected', errors: ['body: JSON object required'], pii: [] };
  const errors = [];
  if (!KINDS.includes(payload.kind)) return { status: 'rejected', errors: [`kind: one of ${KINDS.join(', ')}`], pii: [] };
  for (const k of Object.keys(payload)) if (!ALLOWED[payload.kind].includes(k)) errors.push(`${k}: not allowed for ${payload.kind}`);
  errors.push(...validateCitation(payload.citation));
  const needsQuarantine = [];
  const checkTarget = (k) => {
    if (typeof payload[k] !== 'string' || !ID.test(payload[k])) errors.push(`${k}: invalid id`);
    else if (!knownIds.has(payload[k])) needsQuarantine.push(`${k}: unknown id ${payload[k]}`);
  };
  switch (payload.kind) {
    case 'correction':
      checkTarget('target_id');
      if (!['year', 'place', 'toll', 'cause', 'confidence', 'source'].includes(payload.field)) errors.push('field: not correctable');
      if (!str(payload.proposed, 200)) errors.push('proposed: required, <=200 chars');
      break;
    case 'new_observation':
      for (const f of ['label', 'year', 'place', 'toll', 'cause']) if (!str(payload[f], 200)) errors.push(`${f}: required, <=200 chars`);
      if (!CONFIDENCE.includes(payload.confidence)) errors.push(`confidence: one of ${CONFIDENCE.join(', ')}`);
      break;
    case 'source_metadata':
      checkTarget('target_id');
      break;
    case 'non_additive_pair':
      checkTarget('a_id'); checkTarget('b_id');
      if (payload.a_id === payload.b_id) errors.push('b_id: must differ from a_id');
      if (!str(payload.reason, 600)) errors.push('reason: required, <=600 chars');
      break;
  }
  if (errors.length) return { status: 'rejected', errors, pii: [] };
  const pii = detectPII(payload);
  if (pii.length || needsQuarantine.length) return { status: 'quarantined', errors: needsQuarantine, pii };
  return { status: 'staged', errors: [], pii: [] };
}
