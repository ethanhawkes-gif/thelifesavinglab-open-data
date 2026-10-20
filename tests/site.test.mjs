import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// The site mirrors a few checks in plain browser scripts (it loads no modules). These tests keep the mirrors honest.
const pii = await readFile('src/lib/pii.js', 'utf8');
const lend = await readFile('site/src/lend.js', 'utf8');
const register = await readFile('site/src/register.js', 'utf8');
const bundles = await readFile('src/lib/bundles.js', 'utf8');
const mini = await readFile('src/lib/minischema.js', 'utf8');
const extra = await readFile('site/src/extra.js', 'utf8');

const literal = (name) => { const m = pii.match(new RegExp(`\\['${name}', (/.*?/[a-z]*)\\],`)); assert.ok(m, `pattern ${name} not found in pii.js`); return m[1]; };

test('the site carries the same personal-data patterns as the library', () => {
  for (const name of ['email', 'phone', 'phone_intl', 'us_ssn', 'street_address', 'named_person_marker']) {
    const lit = literal(name);
    assert.ok(lend.includes(lit), `lend.js lacks the ${name} pattern ${lit}`);
    if (!['credential'].includes(name)) assert.ok(register.includes(lit), `register.js lacks the ${name} pattern ${lit}`);
  }
});

test('the site carries the same bundle rules as the library', () => {
  for (const snippet of [
    'MAX_QUOTE_WORDS = 25',
    "'bbc.co.uk', 'bbc.com', 'cnn.com', 'reuters.com', 'apnews.com'",
    "status \"done\" with no rows and no corrections",
    "status \"not-found\" without a list of what was tried",
    'which reports figures rather than producing them',
  ]) {
    assert.ok(bundles.includes(snippet), `bundles.js lacks: ${snippet}`);
    assert.ok(lend.includes(snippet), `lend.js lacks: ${snippet}`);
  }
  for (const snippet of ["JSON.stringify(schema.const)", "unexpected field", "additionalProperties === false", "maxItems", "pattern"]) {
    assert.ok(lend.includes(snippet), `lend.js validator lacks: ${snippet}`);
    assert.ok(mini.includes(snippet), `minischema.js lacks: ${snippet}`);
  }
});

test('the since-open counter moves before the first whole expected death', () => {
  const sandbox = { window: {}, setInterval, clearInterval };
  vm.runInNewContext(extra, sandbox);
  const estimateRange = sandbox.window.Extra.estimateRange;
  const lowRate = 259450 / 31557600;
  const highRate = 415928 / 31557600;

  assert.equal(estimateRange(1, lowRate, highRate, true), '0.00–0.02');
  assert.equal(estimateRange(60, lowRate, highRate, true), '0.49–0.80');
  assert.equal(estimateRange(120, lowRate, highRate, true), '0.9–1.6');
  assert.equal(estimateRange(3600, lowRate, highRate, false), '29–48');
});
