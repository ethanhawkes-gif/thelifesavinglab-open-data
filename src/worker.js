// Life-Saving Lab open-data Worker. Reads come from the bundled, hashed release; the only writes are staged contributions in D1.
import release from './data/release.json' with { type: 'json' };
import { canonicalJSON, sha256Hex, tokenEquals } from './lib/hash.js';
import { toCSV } from './lib/export.js';
import { findViolations } from './lib/nonadditive.js';
import { classifyContribution, MAX_BODY_BYTES } from './lib/validate.js';
import { OPENAPI } from './openapi.js';

const BASE_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
  'access-control-allow-origin': '*',
  'x-not-a-rescue-service': 'Distress: VHF 16 or the coast guard. Crisis: 988.',
};
const ID = /^[a-z0-9][a-z0-9-]{1,62}$/;

export function respond(body, status = 200, extra = {}) {
  const isText = typeof body === 'string';
  return new Response(isText ? body : JSON.stringify(body), { status, headers: { ...BASE_HEADERS, 'content-type': isText ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8', 'cache-control': status === 200 ? 'public, max-age=300' : 'no-store', ...extra } });
}
const fail = (status, error, details) => respond(details ? { error, details } : { error }, status);

/** Build the canonical artifacts from a release object (same function the build script hashes). */
export function exportsFor(rel) {
  const { manifest, ...data } = rel;
  return { json: canonicalJSON(data), csv: toCSV(rel.observations), manifest };
}

async function stage(request, env) {
  if (!env.DB) return fail(503, 'staging store not configured');
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) return fail(415, 'content-type must be application/json');
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > MAX_BODY_BYTES) return fail(413, 'body too large');
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return fail(413, 'body too large');
  let payload;
  try { payload = JSON.parse(raw); } catch { return fail(400, 'invalid JSON'); }
  const cap = Number(env.MAX_PENDING || 500);
  const pending = await env.DB.prepare("SELECT count(*) AS n FROM contributions WHERE status IN ('staged','quarantined')").first();
  if ((pending?.n ?? 0) >= cap) return fail(429, 'review queue full; try later');
  const known = new Set([...release.observations.map((o) => o.id), ...release.sources.map((s) => s.id)]);
  const verdict = classifyContribution(payload, known);
  if (verdict.status === 'rejected') return fail(400, 'rejected', verdict.errors);
  const body = canonicalJSON(payload);
  const digest = await sha256Hex(body);
  const id = 'c-' + digest.slice(0, 24);
  const now = new Date().toISOString();
  const res = await env.DB.prepare('INSERT OR IGNORE INTO contributions (id,kind,status,payload,payload_sha256,pii,notes,submitted_at) VALUES (?,?,?,?,?,?,?,?)')
    .bind(id, payload.kind, verdict.status, body, digest, JSON.stringify(verdict.pii), JSON.stringify(verdict.errors), now).run();
  if (res?.meta?.changes) await env.DB.prepare('INSERT INTO audit_events (at,actor_role,action,target,detail_sha256) VALUES (?,?,?,?,?)').bind(now, 'public', 'contribution.' + verdict.status, id, digest).run();
  return respond({ id, status: verdict.status, duplicate: !res?.meta?.changes, pii: verdict.pii, notes: verdict.errors, next: 'A reviewer decides; accepted items enter the next release by pull request.' }, 202);
}

async function reviewerOk(request, env) {
  const h = request.headers.get('authorization') || '';
  return Boolean(env.REVIEW_TOKEN) && env.REVIEW_TOKEN.length >= 32 && h.startsWith('Bearer ') && (await tokenEquals(h.slice(7), env.REVIEW_TOKEN));
}

async function review(request, env, id) {
  if (!(await reviewerOk(request, env))) return fail(401, 'unauthorized');
  if (!env.DB) return fail(503, 'staging store not configured');
  if (id === 'queue') {
    const { results } = await env.DB.prepare("SELECT id,kind,status,payload_sha256,pii,notes,submitted_at FROM contributions WHERE status IN ('staged','quarantined') ORDER BY submitted_at LIMIT 100").all();
    return respond({ data: results ?? [] }, 200, { 'cache-control': 'no-store' });
  }
  if (!/^c-[0-9a-f]{24}$/.test(id)) return fail(404, 'not found');
  let body;
  try { body = await request.json(); } catch { return fail(400, 'invalid JSON'); }
  if (!['accepted', 'declined'].includes(body?.decision)) return fail(400, 'decision must be accepted or declined');
  const now = new Date().toISOString();
  const res = await env.DB.prepare("UPDATE contributions SET status=?, decided_at=? WHERE id=? AND status IN ('staged','quarantined')").bind(body.decision, now, id).run();
  if (!res?.meta?.changes) return fail(404, 'not found or already decided');
  await env.DB.prepare('INSERT INTO audit_events (at,actor_role,action,target,detail_sha256) VALUES (?,?,?,?,NULL)').bind(now, 'reviewer', 'contribution.' + body.decision, id).run();
  return respond({ id, status: body.decision }, 200, { 'cache-control': 'no-store' });
}

export async function handle(request, env = {}) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const m = request.method;
  if (m === 'OPTIONS') return new Response(null, { status: 204, headers: { ...BASE_HEADERS, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type, authorization', 'access-control-max-age': '600' } });
  if (path === '/v1/contributions') return m === 'POST' ? stage(request, env) : fail(405, 'method not allowed');
  if (path.startsWith('/v1/review/')) return m === 'GET' && path === '/v1/review/queue' ? review(request, env, 'queue') : m === 'POST' ? review(request, env, path.slice(11)) : fail(405, 'method not allowed');
  if (m !== 'GET' && m !== 'HEAD') return fail(405, 'method not allowed');
  const ex = exportsFor(release);
  switch (path) {
    case '/': return respond({ name: 'Life-Saving Lab open data', api: '/v1', openapi: '/v1/openapi.json', notice: BASE_HEADERS['x-not-a-rescue-service'] });
    case '/v1/health': return respond({ ok: true }, 200, { 'cache-control': 'no-store' });
    case '/v1/status': return respond({ ok: true, release: ex.manifest, staging: Boolean(env.DB), excluded_from_release: release.excluded }, 200, { 'cache-control': 'no-store' });
    case '/v1/openapi.json': return respond(OPENAPI);
    case '/v1/sources': return respond({ data: release.sources });
    case '/v1/non-additive': return respond({ data: release.non_additive });
    case '/v1/releases/latest': return respond(ex.manifest);
    case '/v1/export.json': return new Response(ex.json, { headers: { ...BASE_HEADERS, 'content-type': 'application/json; charset=utf-8', 'x-sha256': ex.manifest.sha256['export.json'] } });
    case '/v1/export.csv': return new Response(ex.csv, { headers: { ...BASE_HEADERS, 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="lsl-ledger.csv"', 'x-sha256': ex.manifest.sha256['export.csv'] } });
    case '/v1/non-additive/check': {
      const ids = (url.searchParams.get('ids') || '').split(',').filter(Boolean);
      if (!ids.length || ids.length > 50 || !ids.every((i) => ID.test(i))) return fail(400, 'ids: 1-50 comma-separated observation ids');
      const v = findViolations(ids, release.non_additive);
      return respond({ ids, combinable: v.length === 0, violations: v });
    }
    case '/v1/observations': {
      let data = release.observations;
      for (const [k, allowed] of /** @type {Array<[string, string[] | null]>} */ ([['tier', ['T1', 'T2', 'T3', 'T4']], ['confidence', ['counted', 'estimated', 'unrecorded']], ['cause', null]])) {
        const v = url.searchParams.get(k);
        if (v === null) continue;
        if ((allowed && !allowed.includes(v)) || v.length > 40) return fail(400, `bad filter: ${k}`);
        data = data.filter((o) => o[k] === v);
      }
      return respond({ data, release: release.meta.version });
    }
  }
  const om = /^\/v1\/observations\/([^/]+)$/.exec(path);
  if (om) {
    const o = ID.test(om[1]) && release.observations.find((x) => x.id === om[1]);
    if (!o) return fail(404, 'not found');
    return respond({ ...o, do_not_combine_with: release.non_additive.filter((p) => p.a_id === o.id || p.b_id === o.id).map((p) => ({ id: p.a_id === o.id ? p.b_id : p.a_id, reason: p.reason })) });
  }
  return fail(404, 'not found');
}

export default {
  async fetch(request, env) {
    try { return await handle(request, env); } catch { return fail(500, 'internal error'); }
  },
};
