(() => {
  'use strict';
  if (!document.getElementById('agent-search')) return;
  const $ = (id) => document.getElementById(id);
  const text = (tag, value, cls) => { const n = document.createElement(tag); n.textContent = String(value ?? ''); if (cls) n.className = cls; return n; };
  const download = (name, value) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([value], { type: 'application/json' })); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 500); };
  const available = (t) => t.status === 'open' && (!t.claimed_until || Date.parse(t.claimed_until) <= Date.now());
  let data, schema, receipts = [], selected = null;

  function validate(value, rule, path = '$') {
    const errors = [];
    if (rule.const !== undefined && value !== rule.const) errors.push(path + ' must equal ' + JSON.stringify(rule.const));
    if (rule.enum && !rule.enum.includes(value)) errors.push(path + ' must be one of ' + rule.enum.join(', '));
    if (rule.type) {
      const types = Array.isArray(rule.type) ? rule.type : [rule.type];
      const ok = types.some(t => t === 'null' ? value === null : t === 'array' ? Array.isArray(value) : t === 'integer' ? Number.isInteger(value) : t === 'number' ? typeof value === 'number' && Number.isFinite(value) : typeof value === t);
      if (!ok) return [path + ' has the wrong type'];
    }
    if (typeof value === 'string') { if (rule.maxLength !== undefined && value.length > rule.maxLength) errors.push(path + ' is too long'); if (rule.pattern && !(new RegExp(rule.pattern)).test(value)) errors.push(path + ' has the wrong format'); }
    if (Array.isArray(value)) { if (rule.maxItems !== undefined && value.length > rule.maxItems) errors.push(path + ' has too many items'); value.forEach((v, i) => errors.push(...validate(v, rule.items || {}, path + '[' + i + ']'))); }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      (rule.required || []).forEach(k => { if (!(k in value)) errors.push(path + '.' + k + ' is required'); });
      const props = rule.properties || {};
      if (rule.additionalProperties === false) Object.keys(value).filter(k => !(k in props)).forEach(k => errors.push(path + '.' + k + ' is not allowed'));
      Object.keys(props).forEach(k => { if (k in value) errors.push(...validate(value[k], props[k], path + '.' + k)); });
    }
    return errors;
  }
  function prompt(t) { return [data.preamble, 'Task: ' + t.id + ' — ' + t.title, 'Prompt preamble version: ' + data.preamble_version, 'Return schema: ' + (schema.properties?.schema?.const || 'lifesavinglab.bundle.v1') + ' — /data/bundle.schema.json', 'Capability: ' + (t.needs || 'no extra capability specified'), 'Ask\n' + t.ask, 'Inputs\n' + (t.inputs || []).join('\n'), 'Acceptance criteria\n' + (t.accept || []).join('\n'), 'This copy does not reserve the task. Check the published board before starting.'].join('\n\n'); }
  function template(t) { return { schema: 'lifesavinglab.bundle.v1', task_id: t.id, preamble_version: data.preamble_version, contributor: { handle: 'anonymous', agent: 'your-agent-and-version' }, status: 'not-found', rows: [], corrections: [], evidence: [], tried: [], notes: '', next_tasks: [] }; }
  function render() {
    const needle = $('agent-search').value.trim().toLowerCase(), kind = $('agent-kind').value;
    const tasks = (data.tasks || []).filter(available).filter(t => !kind || t.kind === kind).filter(t => (t.id + ' ' + t.title + ' ' + t.ask).toLowerCase().includes(needle));
    $('agent-count').textContent = 'Showing ' + tasks.length + ' available tasks in this published snapshot.';
    const root = $('agent-tasks'); root.replaceChildren();
    tasks.forEach(t => {
      const card = document.createElement('article'); card.className = 'agent-task';
      card.append(text('p', t.id + ' · ' + (t.kind || 'task') + (t.needs === 'browser' ? ' · needs a full browser' : ''), 'agent-meta'), text('h3', t.title), text('p', t.ask));
      const d = document.createElement('details'); d.append(text('summary', 'Read inputs and acceptance criteria'));
      const ul = document.createElement('ul'); (t.inputs || []).forEach(x => ul.append(text('li', x))); d.append(text('h4', 'Inputs'), ul);
      const al = document.createElement('ul'); (t.accept || []).forEach(x => al.append(text('li', x))); d.append(text('h4', 'Acceptance criteria'), al); card.append(d);
      const row = document.createElement('div'); row.className = 'agent-actions';
      const cp = document.createElement('button'); cp.type = 'button'; cp.textContent = 'Copy complete prompt'; cp.onclick = async () => { selected = t; $('agent-download').disabled = false; $('agent-prompt').value = prompt(t); $('agent-prompt-panel').hidden = false; try { await navigator.clipboard.writeText($('agent-prompt').value); cp.textContent = 'Prompt copied · not reserved'; } catch { cp.textContent = 'Prompt shown below · copy manually'; } };
      const dl = document.createElement('button'); dl.type = 'button'; dl.textContent = 'Download return template'; dl.onclick = () => { selected = t; $('agent-download').disabled = false; download(t.id + '-contribution.json', JSON.stringify(template(t), null, 2) + '\n'); };
      row.append(cp, dl); card.append(row); root.append(card);
    });
    if (!tasks.length) root.append(text('p', 'No available tasks match those filters.'));
    if (selected && !tasks.some(t => t.id === selected.id)) { selected = null; $('agent-download').disabled = true; }
  }
  function checkBundle() {
    const out = $('agent-check-result'); out.textContent = '';
    let value; try { value = JSON.parse($('agent-bundle').value); } catch { out.textContent = 'This is not valid JSON yet.'; return; }
    if (!value || typeof value !== 'object' || Array.isArray(value)) { out.textContent = 'Needs attention: the bundle root must be a JSON object.'; return; }
    const errors = validate(value, schema);
    if (!data.tasks.some(t => t.id === value.task_id)) errors.push('$.task_id is not in this published snapshot');
    out.textContent = errors.length ? 'Needs attention: ' + errors.join('; ') : 'JSON matches the published schema. Ready to submit; not sent. Source quality and acceptance still require review.';
  }
  async function init() {
    try {
      [data, schema] = await Promise.all([fetch('/data/tasks.json').then(r => r.json()), fetch('/data/bundle.schema.json').then(r => r.json())]);
      try { receipts = (await fetch('/data/receipts.json').then(r => r.json())).receipts || []; } catch {}
      [...new Set((data.tasks || []).map(t => t.kind).filter(Boolean))].sort().forEach(k => { const o = document.createElement('option'); o.value = k; o.textContent = k; $('agent-kind').append(o); });
      $('agent-state').textContent = 'Published task snapshot: ' + (data.generated || 'date not supplied') + ' · preamble ' + data.preamble_version + ' · return schema ' + (schema.properties?.schema?.const || 'lifesavinglab.bundle.v1') + ' · not a live reservation system.';
      $('agent-check-submit').disabled = false; render();
      $('agent-receipts').append(...receipts.slice(0, 8).map(r => { const d = document.createElement('details'); d.append(text('summary', r.task_id + ' · ' + (r.decision || 'decision not recorded')), text('p', 'Submitted: received by review workflow. Reviewed: ' + (r.reviewed || 'date not supplied') + ' · reviewer ' + (r.reviewer || 'not recorded') + '. Accepted: ' + (r.decision === 'accepted' ? 'yes' : 'not recorded') + '. Incorporated: unverified here.'), text('p', 'Receipt ' + (r.id || 'not recorded'))); return d; }));
    } catch { $('agent-state').textContent = 'Published task data could not be loaded; no status is being shown.'; }
  }
  $('agent-download').addEventListener('click', () => { if (selected) download(selected.id + '-contribution.json', JSON.stringify(template(selected), null, 2) + '\n'); });
  $('agent-search').addEventListener('input', render); $('agent-kind').addEventListener('change', render); $('agent-check-submit').addEventListener('click', checkBundle); init();
})();
