/* Lend your agent an hour: the task board, one-click prompt links, the bundle checker and the wall of receipts.
   Mirrors scripts/tasks.mjs in the open-data repository; the checks here are the same checks, run before anything is sent. */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MAIL = 'hello@thelifesavinglab.org';
  const REPO = 'https://github.com/ethanhawkes-gif/thelifesavinglab-open-data';
  /* The open-data API, once deployed (see docs/OPERATIONS.md): bundles can then be handed back with one press. Null until then. */
  const API = null;
  const MAX_QUOTE_WORDS = 25;
  const PRESS = ['bbc.co.uk', 'bbc.com', 'cnn.com', 'reuters.com', 'apnews.com', 'nytimes.com', 'theguardian.com', 'washingtonpost.com', 'foxnews.com', 'nbcnews.com', 'abcnews.go.com', 'cbsnews.com', 'dailymail.co.uk', 'independent.co.uk', 'telegraph.co.uk', 'aljazeera.com', 'yahoo.com', 'msn.com', 'wikipedia.org', 'medium.com', 'substack.com', 'x.com', 'twitter.com', 'facebook.com', 'reddit.com', 'youtube.com'];
  const PII = [['email', /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i], ['phone', /(?<!\d)(?:\+?\d{1,3}[\s.-])?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/], ['phone', /(?<!\d)\+\d{1,3}(?:[\s.-]?\d{2,4}){2,4}(?!\d)/], ['id number', /\b\d{3}-\d{2}-\d{4}\b/], ['street address', /\b\d{1,5}\s+\w+(?:\s\w+)?\s(?:St|Street|Ave|Avenue|Rd|Road|Ln|Lane|Dr|Drive|Ct|Court|Blvd)\b/i], ['position', /-?\d{1,3}\.\d{4,},\s*-?\d{1,3}\.\d{4,}/], ['named person', /\b(?:victim|deceased|survivor|patient|next of kin)\s*(?:name)?\s*[:=]/i], ['credential', /\b(?:api[_-]?key|secret|password|token)\s*[:=]|\bgh[pousr]_[A-Za-z0-9]{20,}|\bsk-[A-Za-z0-9]{20,}/i]];
  const AGENTS = [
    ['ChatGPT', (p) => 'https://chatgpt.com/?q=' + encodeURIComponent(p)],
    ['Claude', (p) => 'https://claude.ai/new?q=' + encodeURIComponent(p)],
    ['Grok', (p) => 'https://grok.com/?q=' + encodeURIComponent(p)],
    ['Perplexity', (p) => 'https://www.perplexity.ai/search?q=' + encodeURIComponent(p)]
  ];
  const KIND = { verify: 'Verify a figure', row: 'Bring a row', method: 'Test a method' };
  const SIZE = { S: 'about 20 minutes', M: 'about an hour', L: 'a long session' };
  const S = { tasks: null, receipts: null, schema: null, kind: 'all', handle: '' };
  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };

  /* ---------- the same checks as scripts/tasks.mjs ---------- */
  const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v === 'number' && Number.isInteger(v) ? 'integer' : typeof v);
  const isType = (v, t) => t === 'number' ? typeof v === 'number' : t === 'integer' ? Number.isInteger(v) : typeOf(v) === t;
  function validate(schema, value, path) {
    path = path || '$'; const out = []; const bad = (m) => out.push(path + ': ' + m);
    if (!schema || typeof schema !== 'object') return out;
    if ('const' in schema && JSON.stringify(value) !== JSON.stringify(schema.const)) bad('must be ' + JSON.stringify(schema.const));
    if (schema.enum && !schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) bad('must be one of ' + schema.enum.map((e) => JSON.stringify(e)).join(', '));
    if (schema.type) { const ts = Array.isArray(schema.type) ? schema.type : [schema.type]; if (!ts.some((t) => isType(value, t))) { bad('must be ' + ts.join(' or ') + ', got ' + typeOf(value)); return out; } }
    if (typeof value === 'string') { if (schema.maxLength != null && value.length > schema.maxLength) bad('longer than ' + schema.maxLength + ' characters'); if (schema.pattern && !new RegExp(schema.pattern).test(value)) bad('does not match ' + schema.pattern); }
    if (Array.isArray(value)) { if (schema.maxItems != null && value.length > schema.maxItems) bad('more than ' + schema.maxItems + ' items'); if (schema.items) value.forEach((v, i) => out.push(...validate(schema.items, v, path + '[' + i + ']'))); }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const k of schema.required || []) if (!(k in value)) bad('missing "' + k + '"');
      const props = schema.properties || {};
      for (const [k, v] of Object.entries(value)) { if (k in props) out.push(...validate(props[k], v, path + '.' + k)); else if (schema.additionalProperties === false) out.push(path + '.' + k + ': unexpected field'); }
    }
    return out;
  }
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return null; } };
  const isPress = (h) => !!h && PRESS.some((p) => h === p || h.endsWith('.' + p));
  const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
  function piiKinds(v) { const f = new Set(); const walk = (x) => { if (typeof x === 'string') PII.forEach(([k, re]) => { if (re.test(x)) f.add(k); }); else if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') Object.entries(x).forEach(([k, y]) => { walk(k); walk(y); }); }; walk(v); return [...f]; }
  function checkBundle(b, ledgerIds) {
    const errors = validate(S.schema, b), warnings = [];
    if (errors.length) return { ok: false, errors, warnings };
    const pii = piiKinds(b); if (pii.length) errors.push('possible personal data (' + pii.join(', ') + '); remove it before sending');
    const task = (S.tasks.tasks || []).find((t) => t.id === b.task_id);
    if (!task) errors.push('task_id "' + b.task_id + '" is not on the board');
    if (b.preamble_version !== S.tasks.preamble_version) warnings.push('made with prompt pack ' + b.preamble_version + '; the board is on ' + S.tasks.preamble_version);
    if (b.status === 'done' && !b.rows.length && !b.corrections.length) errors.push('status "done" with no rows and no corrections');
    if (b.status === 'done' && !b.evidence.length) errors.push('status "done" with no evidence');
    if (b.status === 'not-found' && !b.tried.length) errors.push('status "not-found" without a list of what was tried');
    const seen = new Set(), nums = [];
    for (const r of b.rows) {
      if (seen.has(r.id)) errors.push('row id "' + r.id + '" appears twice'); seen.add(r.id);
      if (ledgerIds.has(r.id)) errors.push('row id "' + r.id + '" already exists in the ledger; send a correction instead, or choose a new id');
      const h = host(r.url);
      if (!h || !/^https?:$/.test(new URL(r.url).protocol)) errors.push('row "' + r.id + '": url is not an http(s) address');
      else if ((r.grade === 'A' || r.grade === 'B') && isPress(h)) errors.push('row "' + r.id + '": grade ' + r.grade + ' rests on ' + h + ', which reports figures rather than producing them; grade C or find the primary source');
      if (r.low != null && r.high != null && r.low > r.high) errors.push('row "' + r.id + '": low is above high');
      if (/\b(?:sum(?:med)?|combined|added together|total of .* and)\b/i.test(r.scope + ' ' + (r.note || ''))) warnings.push('row "' + r.id + '" describes a sum; check it is the source\'s own total, not the agent\'s');
      if (typeof r.low === 'number' && r.low > 0) nums.push([r.id, r.low]);
    }
    for (const [id, v] of nums) for (const [a, x] of nums) for (const [c, y] of nums) if (a < c && a !== id && c !== id && x + y === v) warnings.push('row "' + id + '" equals "' + a + '" + "' + c + '"; figures must not be summed across rows');
    for (const c of b.corrections) { if (!ledgerIds.has(c.row_id)) errors.push('correction for "' + c.row_id + '", which is not a ledger row'); else if (task && task.rows.length && !task.rows.includes(c.row_id)) warnings.push('correction for "' + c.row_id + '", which the task did not mention'); }
    b.evidence.forEach((e, i) => { const n = words(e.quote); if (n > MAX_QUOTE_WORDS) errors.push('evidence[' + i + ']: quote is ' + n + ' words; the limit is ' + MAX_QUOTE_WORDS); if (!host(e.url)) errors.push('evidence[' + i + ']: url is not an address'); });
    if (b.status === 'done') { const cited = new Set(b.evidence.map((e) => host(e.url))); for (const r of b.rows) if (!cited.has(host(r.url))) warnings.push('row "' + r.id + '" cites ' + host(r.url) + ' but no evidence quote comes from that site'); }
    return { ok: errors.length === 0, errors, warnings };
  }
  function canonical(v) { if (v === null || typeof v !== 'object') return JSON.stringify(v); if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']'; return '{' + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}'; }
  async function sha256(text) { try { const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join(''); } catch { return null; } }

  /* ---------- the prompt pack, identical to `node scripts/tasks.mjs prompt <id>` ---------- */
  function buildPrompt(t) {
    const L = [S.tasks.preamble.trim(), '', '## Task ' + t.id, '', t.title, '', t.ask, '', '## Inputs'];
    t.inputs.forEach((i) => L.push('- ' + i)); L.push('', '## The reviewer will check that'); t.accept.forEach((a) => L.push('- ' + a));
    if (t.rows.length) L.push('', 'Ledger rows this task touches: ' + t.rows.join(', ') + '. Use these ids in "corrections".');
    L.push('', 'Set "task_id" to "' + t.id + '". If you cannot complete it, return status "not-found" or "partial" and say what you tried.');
    if (S.handle) L.push('', 'The person lending you is "' + S.handle + '"; put that in contributor.handle.');
    return L.join('\n') + '\n';
  }
  const leaseState = (t) => t.status === 'done' ? 'done' : (t.claimed_by && t.claimed_until && Date.parse(t.claimed_until) > Date.now()) ? 'claimed' : 'open';

  /* ---------- page ---------- */
  function page(ctx) {
    const { sectionHead } = ctx;
    return `
<section class="section" style="padding-bottom:36px"><div class="wrap stack" style="gap:22px">
  <p class="eyebrow">Lend your agent · one hour</p>
  <h1 class="display h1" style="max-width:14em">Spare ChatGPT, Claude, Gemini or Grok this month? Lend it an hour.</h1>
  <p class="lede" style="max-width:44em">Pick one small task. Your assistant does the reading and hands back a short, sourced file. A person checks it, it goes into the open ledger, and you get a receipt that says exactly what your hour changed. Nothing to install, no account here, no money.</p>
  <div class="scoreboard" id="lend-score"><div><span class="n">—</span><span class="small muted">tasks open now</span></div><div><span class="n">—</span><span class="small muted">receipts issued</span></div><div><span class="n">—</span><span class="small muted">rows and corrections accepted</span></div></div>
</div></section>

<section class="section--tight band" aria-labelledby="how-title"><div class="wrap stack" style="gap:28px">
  <h2 class="sr-only" id="how-title">How it works</h2>
  <ol class="steps">
    <li><span class="n">1 · PICK</span><h3 class="h4">One task, sized for one session</h3><p class="small" style="font-size:15px">Verify one figure against the report it came from. Find one primary source. Write one row. Nothing bigger.</p></li>
    <li><span class="n">2 · OPEN</span><h3 class="h4">One click opens it in your assistant</h3><p class="small" style="font-size:15px">The prompt carries the lab’s three rules, the task, the inputs and the exact shape of the answer. Gemini and others: copy and paste.</p></li>
    <li><span class="n">3 · HAND BACK</span><h3 class="h4">Paste what it returned</h3><p class="small" style="font-size:15px">The checker runs here, in your browser, before anything is sent: personal data, quotes too long, press cited as primary, sums across rows.</p></li>
    <li><span class="n">4 · RECEIPT</span><h3 class="h4">A person decides. You get the record.</h3><p class="small" style="font-size:15px">Accepted or not, the receipt is public: your handle, the agent you used, the file’s fingerprint, what changed, in which release.</p></li>
  </ol>
</div></section>

<section class="section" aria-labelledby="board-title"><div class="wrap stack" style="gap:24px">
  ${sectionHead('The board', '<span id="board-title">Open tasks.</span>', 'Each one comes from a gap in the data: a grade-C row waiting for its primary source, a judgment waiting for a figure, a country that counts by water setting and is not yet in the ledger.')}
  <div class="row" style="align-items:flex-end;gap:14px 24px">
    <div class="row" id="kind-tabs" style="gap:8px"><button class="btn btn--sm" data-kind="all">All</button><button class="btn btn--sm btn--ghost" data-kind="verify">Verify a figure</button><button class="btn btn--sm btn--ghost" data-kind="row">Bring a row</button><button class="btn btn--sm btn--ghost" data-kind="method">Test a method</button></div>
    <div class="field" style="flex:0 1 260px"><label for="lend-handle">Your handle (optional, goes on the receipt)</label><input id="lend-handle" type="text" maxlength="40" placeholder="e.g. harbor-rat" autocomplete="off"></div>
  </div>
  <div id="board" class="stack" style="gap:0"><p class="small muted">Loading the board…</p></div>
  <p class="small muted">If a one-click link opens empty, the prompt was too long for that app’s address bar: use “Copy prompt” and paste it. The board is a copy of <span class="mono">tasks/tasks.json</span> in the repository, synced daily; a claim made there shows here after the next sync.</p>
</div></section>

<section class="section--tight band" aria-labelledby="back-title"><div class="wrap" style="display:flex;flex-wrap:wrap;gap:36px 56px">
  <div class="stack" style="flex:1.2 1 460px;min-width:0;gap:16px">
    <div class="stack-sm"><p class="eyebrow">Hand it back</p><h2 class="h2 display" id="back-title">Paste the file your assistant returned.</h2><p class="small muted" style="font-size:15px">Its last message should be one JSON object and nothing else. Paste it whole. The checks run here; nothing leaves this page until you send it. <a href="${REPO}/blob/main/tasks/example-bundle.json">A real returned file, for comparison.</a></p></div>
    <div class="field"><label for="bundle-in">The bundle</label><textarea id="bundle-in" style="min-height:220px;font-family:var(--mono);font-size:13px" spellcheck="false" placeholder='{ "schema": "lifesavinglab.bundle.v1", "task_id": "...", ... }'></textarea></div>
    <div class="row"><button class="btn btn--primary" id="bundle-check" type="button">Check it</button><button class="btn btn--ghost" id="bundle-clear" type="button">Clear</button></div>
    <div id="bundle-out" class="stack-sm"></div>
    <div id="fallback-box" hidden></div>
  </div>
  <div class="stack" style="flex:1 1 320px;min-width:0;gap:16px">
    <div class="card stack-sm"><p class="eyebrow">Then send it</p><ol class="small" style="font-size:15px;padding-left:20px;display:flex;flex-direction:column;gap:6px"><li>Save or copy the checked file.</li><li>Open a pull request that adds it under <span class="mono">contributions/</span> at <a href="${REPO}">the repository</a>, or email it to <span class="mono" id="lend-mail">${MAIL}</span> <button class="btn btn--sm btn--ghost" type="button" id="lend-copy-mail" style="min-height:32px;padding:0 10px">copy</button>.</li><li>A person reads it against the source. Machine checks first, judgment last.</li><li>The receipt appears below, and in <span class="mono">receipts/lend.json</span>, with the file’s SHA-256 so anyone can match it.</li></ol></div>
    <div class="card stack-sm"><p class="eyebrow">Two assistants, one task</p><p class="small" style="font-size:15px">A “verify a figure” task is worth running twice, with two different assistants, even if someone has already done it. When two bundles agree on a value, the lab records the agreement; when they differ, a person looks. Pick a task marked <span class="pill pill-B">done</span> as readily as an open one.</p></div>
    <div class="card stack-sm card--dashed"><p class="eyebrow">What an agent must never do</p><ul class="small" style="font-size:15px;padding-left:20px;display:flex;flex-direction:column;gap:4px"><li>Invent a figure, a source, a page or a quote.</li><li>Add figures from different sources or waters together.</li><li>Record a name, a contact, or a position closer than a town.</li><li>Say “done” without a primary source it actually opened.</li></ul><p class="small muted" style="font-size:14px">“Not found, here is what I tried” is a good result. It earns a receipt too.</p></div>
  </div>
</div></section>

<section class="section" aria-labelledby="receipts-title"><div class="wrap stack" style="gap:24px">
  ${sectionHead('Receipts', '<span id="receipts-title">What lent hours have changed.</span>', 'Every reviewed file, accepted or not. A receipt names the task, the handle, the agent, the decision and the release the change shipped in.')}
  <div id="receipts"><p class="small muted">Loading…</p></div>
</div></section>

<section class="section--tight dark" aria-labelledby="compound-title"><div class="wrap stack" style="gap:28px">
  <div class="stack"><p class="eyebrow">Why it adds up</p><h2 class="h2 display" id="compound-title" style="max-width:18em">Built so that each hour makes the next one worth more.</h2></div>
  <div class="grid g3">
    <div class="stack-sm"><h3 class="h4">Every task is a change to a versioned file</h3><p class="small" style="font-size:15px">Nothing overwrites. A row added in October is still there, with its source, when someone checks it in March.</p></div>
    <div class="stack-sm"><h3 class="h4">The board refills itself</h3><p class="small" style="font-size:15px">Tasks are written from the data’s own gaps, and every returned file may propose follow-ups. A reviewer promotes the good ones.</p></div>
    <div class="stack-sm"><h3 class="h4">The prompt is versioned</h3><p class="small" style="font-size:15px">When reviewers see the same mistake twice, the prompt is fixed once and every later hour is better. The version is on each receipt.</p></div>
    <div class="stack-sm"><h3 class="h4">Two agents, one task</h3><p class="small" style="font-size:15px">A verify task can be run twice by different assistants. Agreement on the primary source is cheap evidence; disagreement sends it to a person.</p></div>
    <div class="stack-sm"><h3 class="h4">Machines check, people judge</h3><p class="small" style="font-size:15px">Format, personal data, quote length and press-as-primary are caught before a reviewer reads a word. Their minutes go on whether the figure is right.</p></div>
    <div class="stack-sm"><h3 class="h4">Credit that can be checked</h3><p class="small" style="font-size:15px">A receipt carries a hash of the file. Anyone with the file can confirm the receipt is theirs. Nobody is ever named in the data.</p></div>
  </div>
  <div class="row"><a class="btn btn--primary" href="#lend">Pick a task</a><a class="btn btn--ghost" href="${REPO}/blob/main/tasks/README.md">Read the protocol</a></div>
</div></section>`;
  }

  /* ---------- mount ---------- */
  function renderBoard() {
    const el = document.getElementById('board'); if (!el || !S.tasks) return;
    const tasks = S.tasks.tasks.filter((t) => S.kind === 'all' || t.kind === S.kind);
    const order = { open: 0, claimed: 1, done: 2 }, size = { S: 0, M: 1, L: 2 };
    tasks.sort((a, b) => (order[leaseState(a)] - order[leaseState(b)]) || ((size[a.size] ?? 9) - (size[b.size] ?? 9)));
    if (!tasks.length) { el.innerHTML = '<p class="small muted">Nothing in this group right now.</p>'; return; }
    el.innerHTML = tasks.map((t) => {
      const st = leaseState(t);
      const prompt = buildPrompt(t);
      const links = AGENTS.map(([n, f]) => `<a class="btn btn--sm${st === 'done' ? ' btn--ghost' : ''}" href="${esc(f(prompt))}" target="_blank" rel="noopener">${st === 'done' ? 'Run again in ' : 'Open in '}${n}</a>`).join('') + `<button class="btn btn--sm btn--ghost" type="button" data-copy="${esc(t.id)}">Copy prompt (Gemini and others)</button><button class="btn btn--sm btn--ghost" type="button" data-show="${esc(t.id)}">Show prompt</button>`;
      return `<article class="rec" style="gap:10px;padding:22px 0" id="task-${esc(t.id)}">
  <div class="row" style="align-items:center;gap:8px 14px"><span class="k">${esc(t.id)}</span><span class="pill pill-${st === 'open' ? 'A' : st === 'claimed' ? 'C' : 'B'}">${st}</span><span class="small muted" style="font-size:14px">${esc(KIND[t.kind] || t.kind)} · ${esc(SIZE[t.size] || t.size)}${st === 'claimed' ? ' · held by ' + esc(t.claimed_by) + ' until ' + esc(String(t.claimed_until).slice(0, 10)) : ''}${st === 'done' && t.done_receipt ? ' · receipt ' + esc(t.done_receipt) : ''}</span></div>
  <h3 class="h4" style="max-width:40em">${esc(t.title)}</h3>
  ${st === 'done' && t.done_note ? `<p class="small" style="font-size:14px;max-width:60em;color:var(--teal)">${esc(t.done_note)}</p>` : `<p class="small" style="font-size:15px;max-width:60em">${esc(t.ask)}</p>`}
  <p class="small muted" style="font-size:14px"><b>Unlocks:</b> ${esc(t.unlocks)}${t.rows.length ? ' · Rows: ' + t.rows.map((r) => `<a href="#ledger-${esc(r)}">${esc(r)}</a>`).join(', ') : ''}</p>
  <div class="row" style="gap:8px">${links}</div>
  <pre class="json" id="prompt-${esc(t.id)}" hidden></pre>
</article>`;
    }).join('');
    el.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => { const t = S.tasks.tasks.find((x) => x.id === b.dataset.copy); S.copy(buildPrompt(t)); }));
    el.querySelectorAll('[data-show]').forEach((b) => b.addEventListener('click', () => { const t = S.tasks.tasks.find((x) => x.id === b.dataset.show); const pre = document.getElementById('prompt-' + t.id); pre.textContent = buildPrompt(t); pre.hidden = !pre.hidden; b.textContent = pre.hidden ? 'Show prompt' : 'Hide prompt'; }));
  }
  function renderReceipts() {
    const el = document.getElementById('receipts'); if (!el) return;
    const rs = S.receipts ? S.receipts.receipts : [];
    if (!rs.length) { el.innerHTML = '<div class="queue-empty"><p class="eyebrow">No receipts yet</p><p>The board opened on 15 October 2026. The first receipt could be yours.</p></div>'; return; }
    el.innerHTML = `<div class="tscroll"><table class="data"><thead><tr><th>Receipt</th><th>Task</th><th>Handle</th><th>Agent</th><th>Decision</th><th>Changed</th><th>Release</th><th>Reviewed</th></tr></thead><tbody>${rs.map((r) => `<tr><td class="mono" title="${esc(r.bundle_sha256)}">${esc(r.id)}</td><td><a href="#lend">${esc(r.task_id)}</a></td><td>${esc(r.handle)}</td><td>${esc(r.agent)}</td><td>${esc(r.decision)}</td><td>${r.changed.rows} rows · ${r.changed.corrections} corrections · ${r.changed.next_tasks} follow-ups</td><td>${esc(r.release || '—')}</td><td>${esc(String(r.reviewed).slice(0, 10))}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function renderScore() {
    const el = document.getElementById('lend-score'); if (!el || !S.tasks) return;
    const open = S.tasks.tasks.filter((t) => leaseState(t) === 'open').length;
    const rs = S.receipts ? S.receipts.receipts : [];
    const changed = rs.filter((r) => r.decision === 'accepted').reduce((n, r) => n + r.changed.rows + r.changed.corrections, 0);
    el.innerHTML = `<div><span class="n">${open}</span><span class="small muted">tasks open now</span></div><div><span class="n">${rs.length}</span><span class="small muted">receipts issued</span></div><div><span class="n">${changed}</span><span class="small muted">rows and corrections accepted</span></div>`;
  }
  async function onCheck(ctx) {
    const ta = document.getElementById('bundle-in'), out = document.getElementById('bundle-out');
    const raw = ta.value.trim(); if (!raw) { out.innerHTML = '<p class="small muted">Paste the file first.</p>'; return; }
    let b; try { b = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch { out.innerHTML = '<p class="notice"><span class="eyebrow">Not valid JSON</span><br>The assistant’s last message should be a single JSON object. Ask it to “return only the JSON object” and paste again.</p>'; return; }
    if (!S.schema || !S.tasks) { out.innerHTML = '<p class="notice"><span class="eyebrow">Checker not loaded</span><br>Reload the page and try again.</p>'; return; }
    const r = checkBundle(b, new Set(ctx.ledgerIds()));
    const sha = r.ok ? await sha256(canonical(b)) : null;
    const json = JSON.stringify(b, null, 1);
    const fname = `${b.task_id}-${(b.contributor && b.contributor.handle || 'anonymous').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    out.innerHTML = `
${r.errors.length ? `<div class="notice stack-sm"><p class="eyebrow">Not ready · ${r.errors.length} problem${r.errors.length === 1 ? '' : 's'}</p><ul style="padding-left:20px;display:flex;flex-direction:column;gap:4px">${r.errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul><p class="small">Fix the file (or ask your assistant to), then check again.</p></div>` : ''}
${r.warnings.length ? `<div class="card stack-sm card--dashed"><p class="eyebrow">For the reviewer · ${r.warnings.length} note${r.warnings.length === 1 ? '' : 's'}</p><ul class="small" style="font-size:15px;padding-left:20px;display:flex;flex-direction:column;gap:4px">${r.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}
${r.ok ? `<div class="card stack-sm" style="border-left:4px solid var(--teal)"><p class="eyebrow">Machine checks passed · provisional receipt</p><p class="mono" style="font-size:14px">${sha ? 'rcpt-' + sha.slice(0, 10) : 'rcpt-(hash unavailable in this view)'}</p><p class="small" style="font-size:15px">Task <b>${esc(b.task_id)}</b> · ${esc(b.status)} · ${b.rows.length} rows, ${b.corrections.length} corrections, ${b.evidence.length} quotes, ${b.next_tasks.length} follow-ups · by <b>${esc(b.contributor.handle)}</b> with ${esc(b.contributor.agent)}</p>${sha ? `<p class="small muted" style="font-size:13px;word-break:break-all">SHA-256 ${esc(sha)}</p>` : ''}<p class="small muted" style="font-size:14px">This becomes a real receipt when a person reviews the file. The id will match as long as the file is sent unchanged.</p><div class="row">${API ? '<button class="btn btn--sm btn--primary" id="bundle-send" type="button">Send it now</button>' : ''}<a class="btn btn--sm ${API ? '' : 'btn--primary'}" href="${esc(REPO + '/new/main/contributions?filename=' + encodeURIComponent(fname) + '&value=' + encodeURIComponent(json))}" target="_blank" rel="noopener">Open as a pull request</a><button class="btn btn--sm" id="bundle-copy" type="button">Copy file</button><button class="btn btn--sm" id="bundle-save" type="button">Save ${esc(fname)}</button></div><p class="small muted" style="font-size:14px">“Open as a pull request” opens GitHub with the file already filled in under <span class="mono">contributions/</span>; press “Propose changes” there. No GitHub account? Save the file and email it.</p><p class="small muted" id="bundle-sent" style="font-size:14px"></p></div>` : ''}`;
    const c = document.getElementById('bundle-copy'); if (c) c.addEventListener('click', () => S.copy(json));
    const s = document.getElementById('bundle-save'); if (s) s.addEventListener('click', () => S.save(fname, json));
    const send = document.getElementById('bundle-send'); if (send) send.addEventListener('click', async () => {
      send.disabled = true; const msg = document.getElementById('bundle-sent'); msg.textContent = 'Sending…';
      try {
        const res = await fetch(API + '/v1/bundles', { method: 'POST', headers: { 'content-type': 'application/json' }, body: json });
        const d = await res.json();
        if (res.status === 202) msg.textContent = (d.duplicate ? 'Already received. ' : 'Received. ') + 'Staged as ' + d.id + '; provisional receipt ' + d.provisional_receipt + '. A person reviews it next.';
        else if (d.emergency) msg.textContent = d.emergency;
        else { msg.textContent = 'Not accepted: ' + (d.details || [d.error]).join('; '); send.disabled = false; }
      } catch { msg.textContent = 'Could not reach the API. Save the file and send it by pull request or email.'; send.disabled = false; }
    });
  }
  function mount(ctx, tools) {
    S.copy = tools.copyText; S.save = tools.saveFile;
    S.handle = store('lsl-handle') || '';
    const h = document.getElementById('lend-handle'); if (h) { h.value = S.handle; h.addEventListener('input', () => { S.handle = h.value.trim().slice(0, 40); store('lsl-handle', S.handle); renderBoard(); }); }
    document.querySelectorAll('#kind-tabs button').forEach((b) => b.addEventListener('click', () => { S.kind = b.dataset.kind; document.querySelectorAll('#kind-tabs button').forEach((x) => x.classList.toggle('btn--ghost', x !== b)); renderBoard(); }));
    document.getElementById('bundle-check').addEventListener('click', () => onCheck(ctx));
    document.getElementById('bundle-clear').addEventListener('click', () => { document.getElementById('bundle-in').value = ''; document.getElementById('bundle-out').innerHTML = ''; });
    document.getElementById('lend-copy-mail').addEventListener('click', () => S.copy(MAIL));
    const get = (p) => fetch(p).then((r) => { if (!r.ok) throw new Error(p); return r.json(); });
    Promise.all([get('data/tasks.json'), get('data/receipts.json').catch(() => ({ receipts: [] })), get('data/bundle.schema.json')]).then(([t, r, sc]) => { S.tasks = t; S.receipts = r; S.schema = sc; renderBoard(); renderReceipts(); renderScore(); })
      .catch(() => { const el = document.getElementById('board'); if (el) el.innerHTML = '<p class="notice"><span class="eyebrow">Board not loaded</span><br>The task files could not be read in this view. The same board is at <span class="mono">tasks/tasks.json</span> in the repository.</p>'; });
  }
  window.Lend = { page, mount };
})();
