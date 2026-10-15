// OpenAPI 3.1 description of the public v1 API. Kept in code so the Worker serves exactly what it implements.
/** @type {any} */
const obs = { type: 'object', required: ['id', 'label', 'year', 'place', 'toll', 'cause', 'confidence', 'tier', 'source_id'], properties: Object.fromEntries(['id', 'label', 'year', 'place', 'toll', 'cause', 'tier_basis', 'source_id', 'source_citation'].map((k) => /** @type {[string, any]} */ ([k, { type: 'string' }])).concat([['confidence', { enum: ['counted', 'estimated', 'unrecorded'] }], ['tier', { enum: ['T1', 'T2', 'T3', 'T4'] }]])) };
const err = { type: 'object', properties: { error: { type: 'string' }, details: { type: 'array', items: { type: 'string' } } } };
const json = (schema) => ({ 'application/json': { schema } });

export const OPENAPI = {
  openapi: '3.1.0',
  info: { title: 'Life-Saving Lab open data', version: '1.0.0', license: { name: 'MIT (code); CC0-1.0 (data)' }, description: 'Read-only cited figures and staged contributions. Not a rescue service. Distress: VHF channel 16 or the coast guard. Crisis: 988.' },
  paths: {
    '/v1/health': { get: { summary: 'Liveness', responses: { 200: { description: 'ok' } } } },
    '/v1/status': { get: { summary: 'Release version, counts, hashes, D1 binding presence', responses: { 200: { description: 'status' } } } },
    '/v1/observations': { get: { summary: 'List observations', parameters: [{ name: 'tier', in: 'query', schema: { enum: ['T1', 'T2', 'T3', 'T4'] } }, { name: 'confidence', in: 'query', schema: { enum: ['counted', 'estimated', 'unrecorded'] } }, { name: 'cause', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'list', content: json({ type: 'object', properties: { data: { type: 'array', items: obs } } }) }, 400: { description: 'bad filter', content: json(err) } } } },
    '/v1/observations/{id}': { get: { summary: 'One observation with its non-additive partners', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'one', content: json(obs) }, 404: { description: 'not found', content: json(err) } } } },
    '/v1/sources': { get: { summary: 'Citation metadata', responses: { 200: { description: 'list' } } } },
    '/v1/non-additive': { get: { summary: 'Pairs that must never be summed or averaged', responses: { 200: { description: 'list' } } } },
    '/v1/non-additive/check': { get: { summary: 'Check a proposed combination', parameters: [{ name: 'ids', in: 'query', required: true, schema: { type: 'string' }, description: 'comma-separated observation ids (max 50)' }], responses: { 200: { description: 'result with violations' }, 400: { description: 'bad input', content: json(err) } } } },
    '/v1/releases/latest': { get: { summary: 'Release manifest with SHA-256 of exports', responses: { 200: { description: 'manifest' } } } },
    '/v1/export.json': { get: { summary: 'Canonical JSON export (hash matches manifest)', responses: { 200: { description: 'json' } } } },
    '/v1/export.csv': { get: { summary: 'CSV export (hash matches manifest)', responses: { 200: { description: 'csv' } } } },
    '/v1/tasks': { get: { summary: 'Lend your agent an hour: open tasks on the board (all=1 for claimed and done too)', parameters: [{ name: 'all', in: 'query', schema: { enum: ['1'] } }], responses: { 200: { description: 'list' } } } },
    '/v1/tasks/{id}': { get: { summary: 'One task with its inputs and acceptance checks', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'task' }, 404: { description: 'not found', content: json(err) } } } },
    '/v1/tasks/{id}/prompt': { get: { summary: 'The self-contained prompt pack for a task, as text/plain, to paste into any assistant', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'text' }, 404: { description: 'not found', content: json(err) } } } },
    '/v1/bundles': { post: { summary: 'Hand back a bundle (tasks/bundle.schema.json). Machine checks run first; a bundle that fails them, including any personal data, is refused and never stored.', requestBody: { required: true, content: json({ type: 'object', required: ['schema', 'task_id', 'contributor', 'status'] }) }, responses: { 202: { description: 'staged, with a provisional receipt id' }, 400: { description: 'checks failed', content: json(err) }, 413: { description: 'too large' }, 429: { description: 'queue full' }, 503: { description: 'staging not configured' } } } },
    '/v1/review/bundles': { get: { summary: 'Reviewer: list staged bundles (bearer token)', security: [{ bearer: [] }], responses: { 200: { description: 'queue' }, 401: { description: 'unauthorized' } } } },
    '/v1/review/bundles/{id}': { post: { summary: 'Reviewer: accepted, declined or needs-work, with the receipt id once written to receipts/lend.json', security: [{ bearer: [] }], responses: { 200: { description: 'decided' }, 401: { description: 'unauthorized' }, 404: { description: 'not found' } } } },
    '/v1/contributions': { post: { summary: 'Stage a contribution. Never writes canonical data.', requestBody: { required: true, content: json({ type: 'object', required: ['kind', 'citation'] }) }, responses: { 202: { description: 'staged or quarantined' }, 400: { description: 'rejected', content: json(err) }, 413: { description: 'too large' }, 415: { description: 'not JSON' }, 503: { description: 'staging store not configured' } } } },
    '/v1/review/queue': { get: { summary: 'Reviewer: list staged/quarantined (bearer token)', security: [{ bearer: [] }], responses: { 200: { description: 'queue' }, 401: { description: 'unauthorized' } } } },
    '/v1/review/{id}': { post: { summary: 'Reviewer: accept or decline. Acceptance queues for the next release PR; it does not edit canonical data.', security: [{ bearer: [] }], responses: { 200: { description: 'decided' }, 401: { description: 'unauthorized' }, 404: { description: 'not found' } } } },
  },
  components: { securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } } },
};
