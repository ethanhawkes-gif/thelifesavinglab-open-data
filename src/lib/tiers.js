// Citation quality tiers. See docs/CITATION_TIERS.md.
export const TIERS = Object.freeze({
  T1: 'Filed count: an official register, inquiry, census or statistical report that counted cases.',
  T2: 'Agency or peer-reviewed estimate with a published method.',
  T3: 'Historical or secondary reconstruction, or a count resting on contemporary accounts.',
  T4: 'No census exists; the entry records an absence, not a number.',
});
export const CONFIDENCE = Object.freeze(['counted', 'estimated', 'unrecorded']);
const AGENCY = /\b(WHO|ILO|IMO|IOM|CDC|CPSC|USLA|U\.S\. Coast Guard|Injury Prevention|Marine Policy|doi:)/;
const OFFICIAL = /\b(inquiry|commission|government|official|authorities|investigation|register|report|statistics|WHO|ILO|IMO|IOM|CDC|CPSC|USLA|Coast Guard)\b/i;

/**
 * Derive a tier from confidence + source string (rule tiers-v2; a reviewer may override).
 * v2 (Gemini pass 1 finding): "counted" alone is not T1; the source must be an official filing.
 */
export function deriveTier(confidence, source) {
  if (!CONFIDENCE.includes(confidence)) throw new RangeError(`unknown confidence: ${confidence}`);
  const s = String(source ?? '');
  if (confidence === 'unrecorded') return 'T4';
  if (confidence === 'counted') return OFFICIAL.test(s) || AGENCY.test(s) ? 'T1' : 'T3';
  return AGENCY.test(s) ? 'T2' : 'T3';
}

/**
 * Structure a toll string without inventing a number.
 * kind: count | range | approximate | rate | absence | not-a-toll. low/high are null when the text has no figure.
 */
export function parseToll(toll) {
  const t = String(toll ?? '').trim();
  if (!t) throw new RangeError('empty toll');
  if (/^not (a death toll|one number)/i.test(t)) return { kind: 'not-a-toll', low: null, high: null, per_year: false };
  if (/^no (global figure|annual census|census)/i.test(t)) return { kind: 'absence', low: null, high: null, per_year: false };
  const per_year = /\ba year\b/i.test(t);
  const num = (s) => { const n = Number(s.replace(/,/g, '')); return Number.isFinite(n) ? n : null; };
  const mult = /million/i.test(t) ? 1e6 : 1;
  const unit = /rescue/i.test(t) ? 'rescues' : 'deaths';
  const nums = [...t.matchAll(/([\d,]+(?:\.\d+)?)/g)].map((m) => num(m[1])).filter((n) => n !== null).map((n) => Math.round(n * mult));
  if (!nums.length) return { kind: 'absence', low: null, high: null, per_year, unit };
  if (t.includes(';')) return { kind: 'disputed', low: Math.min(...nums), high: Math.max(...nums), per_year, unit };
  const range = /^~?([\d,.]+)\s*[–-]\s*([\d,.]+)/.exec(t);
  if (range) return { kind: 'range', low: Math.round(num(range[1]) * mult), high: Math.round(num(range[2]) * mult), per_year, unit };
  const q = /^(~|over|nearly|about|around)/i.exec(t);
  const out = { kind: per_year ? 'rate' : q ? 'approximate' : 'count', low: nums[0], high: nums[0], per_year, unit };
  if (q) out.qualifier = q[1].toLowerCase();
  return out;
}
