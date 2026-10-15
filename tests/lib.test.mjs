import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalJSON, sha256Hex, tokenEquals } from '../src/lib/hash.js';
import { deriveTier, parseToll } from '../src/lib/tiers.js';
import { detectPII, detectDistress } from '../src/lib/pii.js';
import { findViolations } from '../src/lib/nonadditive.js';
import { csvEscape, toCSV, CSV_COLUMNS } from '../src/lib/export.js';
import { validateCitation, classifyContribution } from '../src/lib/validate.js';

test('canonicalJSON sorts keys recursively and keeps array order', () => {
  assert.equal(canonicalJSON({ b: 1, a: { d: [2, 1], c: null } }), '{"a":{"c":null,"d":[2,1]},"b":1}');
});
test('canonicalJSON edge: rejects undefined and non-finite numbers, drops undefined props', () => {
  assert.throws(() => canonicalJSON(undefined), TypeError);
  assert.throws(() => canonicalJSON({ x: NaN }), TypeError);
  assert.equal(canonicalJSON({ a: undefined, b: 'x' }), '{"b":"x"}');
});
test('sha256Hex matches the known vector', async () => {
  assert.equal(await sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
test('sha256Hex edge: empty string vector and non-string rejection', async () => {
  assert.equal(await sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  await assert.rejects(() => sha256Hex(42), TypeError);
});
test('tokenEquals happy + edge', async () => {
  assert.equal(await tokenEquals('a'.repeat(40), 'a'.repeat(40)), true);
  assert.equal(await tokenEquals('abc', 'abd'), false);
  assert.equal(await tokenEquals('abc', 'abcd'), false);
  assert.equal(await tokenEquals(undefined, 'x'), false);
  assert.equal(await tokenEquals('', ''), false);
});
test('PII detector stays fast on 8KB adversarial input (no catastrophic backtracking)', () => {
  for (const s of ['1'.repeat(8192), 'a@'.repeat(4096), ('1 a ').repeat(2048), '-1.1111,'.repeat(1000)]) {
    const t = performance.now(); detectPII(s); assert.ok(performance.now() - t < 100, 'slow on ' + s.slice(0, 8));
  }
});
test('PII detector catches obfuscated email', () => {
  assert.ok(detectPII('reach me: jane [at] example [dot] com').includes('email_obfuscated'));
  assert.ok(detectPII('john(at)example(dot)org').includes('email_obfuscated'));
  assert.ok(detectPII('alice AT domain DOT com').includes('email_obfuscated'));
});
test('detectDistress catches danger phrases; ordinary corrections pass', () => {
  assert.equal(detectDistress('MAYDAY MAYDAY taking on water'), true);
  assert.equal(detectDistress({ proposed: 'I want to die' }), true);
  assert.equal(detectDistress({ title: 'Recreational Boating Statistics 2024' }), false);
  assert.equal(detectDistress(null), false);
});
test('deriveTier: official count T1, contemporary accounts T3, agency estimate T2, absence T4', () => {
  assert.equal(deriveTier('counted', 'Canadian commission of inquiry'), 'T1');
  assert.equal(deriveTier('counted', 'Contemporary accounts; New England historical record'), 'T3');
  assert.equal(deriveTier('estimated', 'WHO drowning estimates'), 'T2');
  assert.equal(deriveTier('estimated', 'Historical estimates of Operation Hannibal'), 'T3');
  assert.equal(deriveTier('unrecorded', 'No census exists'), 'T4');
});
test('deriveTier edge: unknown confidence throws', () => {
  assert.throws(() => deriveTier('guessed', 'x'), RangeError);
});
test('parseToll structures without inventing numbers', () => {
  assert.deepEqual(parseToll('1,496–1,517'), { kind: 'range', low: 1496, high: 1517, per_year: false, unit: 'deaths' });
  assert.equal(parseToll('~1.8 million').low, 1800000);
  assert.equal(parseToll('4,345 a year').kind, 'rate');
  assert.deepEqual(parseToll('1,500 official; ~4,386 estimated'), { kind: 'disputed', low: 1500, high: 4386, per_year: false, unit: 'deaths' });
  assert.equal(parseToll('85,258 rescues').unit, 'rescues');
});
test('parseToll edge: absences and non-tolls carry null figures; empty throws', () => {
  assert.equal(parseToll('No global figure').low, null);
  assert.equal(parseToll('Not a death toll').kind, 'not-a-toll');
  assert.equal(parseToll('Not one number').kind, 'not-a-toll');
  assert.throws(() => parseToll(''), RangeError);
});
test('detectPII leaves ISBNs, long identifiers and dates alone, and catches international numbers', () => {
  assert.deepEqual(detectPII('https://www.who.int/publications/i/item/9789240103962'), []);
  assert.deepEqual(detectPII('ISBN 978-92-4-010396-2, 253 pages, 2026-10-15 12:30'), []);
  assert.deepEqual(detectPII('station 8423898; buoy 44007; 300 000 deaths; 100 000 population'), []);
  assert.ok(detectPII('ring +44 20 7946 0958').includes('phone_intl'));
  assert.ok(detectPII('+1 603 555 0100').some((k) => k.startsWith('phone')));
});
test('detectPII finds emails, phones, addresses, credentials, person markers', () => {
  assert.deepEqual(detectPII({ note: 'write to a.b@example.org' }), ['email']);
  assert.ok(detectPII('call 603-555-0142').includes('phone'));
  assert.ok(detectPII('lives at 12 Harbor Street').includes('street_address'));
  assert.ok(detectPII('api_key=abcdef').includes('credential'));
  assert.ok(detectPII(['victim name: J. Doe']).includes('named_person_marker'));
  assert.ok(detectPII({ 'x@y.com': 1 }).includes('email'), 'keys are scanned too');
});
test('detectPII edge: clean civic text passes; deep nesting is flagged', () => {
  assert.deepEqual(detectPII({ title: 'Recreational Boating Statistics 2024', publisher: 'U.S. Coast Guard' }), []);
  /** @type {any} */ let deep = 'x'; for (let i = 0; i < 12; i++) deep = [deep];
  assert.ok(detectPII(deep).includes('too_deep'));
});
test('findViolations returns forbidden pairs within a combination', () => {
  const pairs = [{ a_id: 'a', b_id: 'b', reason: 'overlap' }];
  assert.equal(findViolations(['a', 'b', 'c'], pairs).length, 1);
});
test('findViolations edge: single id or disjoint ids are fine; non-array throws', () => {
  const pairs = [{ a_id: 'a', b_id: 'b', reason: 'overlap' }];
  assert.equal(findViolations(['a'], pairs).length, 0);
  assert.equal(findViolations([], pairs).length, 0);
  assert.throws(() => findViolations('a,b', pairs), TypeError);
});
test('csvEscape quotes and neutralizes formulas', () => {
  assert.equal(csvEscape('a,b'), '"a,b"');
  assert.equal(csvEscape('say "hi"'), '"say ""hi"""');
  assert.equal(csvEscape('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvEscape('-1'), "'-1");
  assert.equal(csvEscape('  =cmd'), "'  =cmd");
  assert.equal(csvEscape('|calc'), "'|calc");
});
test('csvEscape edge: null/undefined become empty', () => {
  assert.equal(csvEscape(null), '');
  assert.equal(csvEscape(undefined), '');
});
test('toCSV is order-independent and CRLF terminated', () => {
  const a = toCSV([{ id: 'b', label: 'B' }, { id: 'a', label: 'A' }]);
  const b = toCSV([{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]);
  assert.equal(a, b);
  assert.ok(a.startsWith(CSV_COLUMNS.join(',') + '\r\n'));
  assert.ok(a.endsWith('\r\n'));
});
test('toCSV edge: empty input yields header only', () => {
  assert.equal(toCSV([]), CSV_COLUMNS.join(',') + '\r\n');
});
const cite = { title: 'Recreational Boating Statistics 2024', publisher: 'U.S. Coast Guard', url: 'https://www.uscgboating.org/statistics/accident_statistics.php' };
test('validateCitation accepts metadata only', () => {
  assert.deepEqual(validateCitation(cite), []);
});
test('validateCitation edge: rejects body text field, http url, missing title', () => {
  const e = validateCitation({ publisher: 'X', url: 'http://x.org', body: 'copied text' });
  assert.ok(e.some((x) => x.includes('citation.body')));
  assert.ok(e.some((x) => x.includes('url')));
  assert.ok(e.some((x) => x.includes('title')));
  assert.deepEqual(validateCitation(null), ['citation: required object']);
});
test('classifyContribution stages a clean correction against a known id', () => {
  const r = classifyContribution({ kind: 'correction', target_id: 'titanic', field: 'toll', proposed: '1,496–1,517', citation: cite }, new Set(['titanic']));
  assert.equal(r.status, 'staged');
});
test('classifyContribution quarantines PII and unknown targets; rejects malformed', () => {
  const pii = classifyContribution({ kind: 'correction', target_id: 'titanic', field: 'place', proposed: 'contact me at me@x.org', citation: cite }, new Set(['titanic']));
  assert.equal(pii.status, 'quarantined');
  assert.deepEqual(pii.pii, ['email']);
  assert.equal(classifyContribution({ kind: 'source_metadata', target_id: 'nope-id', citation: cite }, new Set()).status, 'quarantined');
  assert.equal(classifyContribution({ kind: 'delete_everything' }).status, 'rejected');
  assert.equal(classifyContribution([]).status, 'rejected');
  assert.equal(classifyContribution({ kind: 'source_metadata', target_id: 12345, citation: cite }, new Set()).status, 'rejected', 'non-string id rejected, not quarantined');
  assert.equal(classifyContribution({ kind: 'new_observation', label: 'x', year: '1', place: 'p', toll: '1', cause: 'c', confidence: 'guess', citation: cite }).status, 'rejected');
  assert.equal(classifyContribution({ kind: 'non_additive_pair', a_id: 'aa', b_id: 'aa', reason: 'r', citation: cite }, new Set(['aa'])).status, 'rejected');
  assert.equal(classifyContribution(JSON.parse('{"kind":"source_metadata","target_id":"titanic","citation":{"title":"t","publisher":"p"},"__proto__":{"x":1}}'), new Set(['titanic'])).status, 'rejected');
});
