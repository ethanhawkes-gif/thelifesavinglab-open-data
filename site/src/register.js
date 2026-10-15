/* The register as a working tool: record one event, fatal or not, in the lab's 24 columns. Rows live in this browser until exported. */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KEY = 'lsl-register-rows';
  const COLS = ['event_id', 'date', 'time_local', 'place', 'lat', 'lon', 'water', 'activity', 'vessel_type', 'vessel_length_m', 'persons_involved', 'age_band', 'sex', 'pfd_worn', 'alcohol_suspected', 'water_temp_c', 'air_temp_c', 'wind_sea_state', 'minutes_alarm_to_reach', 'who_responded', 'outcome', 'source', 'confidence', 'notes'];
  const F = {
    water: ['sea-coast', 'harbor-river', 'lake', 'pool', 'home', 'flood', 'other'],
    activity: ['swimming', 'surfing', 'paddling', 'boating-recreational', 'fishing-commercial', 'working', 'ferry-passenger', 'crossing', 'on-foot', 'vehicle', 'other'],
    age_band: ['', '0-4', '5-14', '15-29', '30-49', '50-69', '70+'], sex: ['', 'm', 'f', 'unknown'], yn: ['', 'yes', 'no', 'unknown'],
    who: ['', 'Coast Guard', 'harbormaster', 'bystander', 'lifeguard', 'fire', 'other'],
    outcome: ['rescued-unharmed', 'rescued-injured', 'non-fatal-drowning', 'fatal', 'missing'], confidence: ['high', 'medium', 'low']
  };
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } };
  const save = (rows) => { try { localStorage.setItem(KEY, JSON.stringify(rows)); return true; } catch (e) { return false; } };
  const csvq = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const toCSV = (rows) => COLS.join(',') + '\n' + rows.map((r) => COLS.map((c) => csvq(r[c])).join(',')).join('\n') + '\n';
  /* The repository's conservative detector, mirrored: a hit refuses the row. Names are not detected; the form says so. */
  const PII = [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/, /\b\d{3}-\d{2}-\d{4}\b/, /\b\d{1,5}\s+\w+(?:\s\w+)?\s(?:St|Street|Ave|Avenue|Rd|Road|Ln|Lane|Dr|Drive|Ct|Court|Blvd)\b/i, /\b(?:victim|deceased|survivor|patient|next of kin)\s*(?:name)?\s*[:=]/i];
  const looksPersonal = (row) => Object.values(row).some((v) => PII.some((re) => re.test(String(v || ''))));
  const sel = (name, opts, label, req) => `<div class="field"><label for="r-${name}">${esc(label)}${req ? ' *' : ''}</label><select id="r-${name}" name="${name}" ${req ? 'required' : ''}>${opts.map((o) => `<option value="${esc(o)}">${esc(o || '—')}</option>`).join('')}</select></div>`;
  const inp = (name, label, type, hint, req) => `<div class="field"><label for="r-${name}">${esc(label)}${req ? ' *' : ''}</label><input id="r-${name}" name="${name}" type="${type || 'text'}" ${type === 'number' ? 'step="any"' : ''} ${req ? 'required' : ''}>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</div>`;

  function page(ctx) {
    const { sectionHead } = ctx;
    return `
<section class="section" style="padding-bottom:36px"><div class="wrap stack" style="gap:22px">
  <p class="eyebrow">The register · v0 · a working tool</p>
  <h1 class="display h2" style="max-width:16em">One event, fatal or not, in twenty-four columns.</h1>
  <p class="lede" style="max-width:44em">For a harbormaster, a club, a lifeguard service or a station. Fill what you know and leave the rest blank; never guess a field. Rows stay in this browser until you export them, so this page works offline on a phone at the ramp. No names, ever. Place at town level or coarser.</p>
</div></section>
<section class="section--tight band"><div class="wrap" style="display:flex;flex-wrap:wrap;gap:36px 56px">
  <form id="rform" class="stack" style="flex:1.3 1 520px;min-width:0;gap:14px" novalidate>
    <h2 class="h4">When and where</h2>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(170px,100%),1fr));gap:12px">${inp('date', 'Date', 'date', '', true)}${inp('time_local', 'Local time', 'time')}${inp('place', 'Place', 'text', 'A town, a beach, a harbor. Not an address.', true)}</div>
    <h2 class="h4">The water and the activity</h2>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(170px,100%),1fr));gap:12px">${sel('water', F.water, 'Water', true)}${sel('activity', F.activity, 'Activity', true)}${inp('vessel_type', 'Vessel type', 'text', 'If any')}${inp('vessel_length_m', 'Vessel length (m)', 'number')}</div>
    <h2 class="h4">The people</h2>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr));gap:12px">${inp('persons_involved', 'Persons involved', 'number')}${sel('age_band', F.age_band, 'Age band')}${sel('sex', F.sex, 'Sex')}${sel('pfd_worn', F.yn, 'Life jacket worn')}${sel('alcohol_suspected', F.yn, 'Alcohol suspected')}</div>
    <h2 class="h4">Conditions and response</h2>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr));gap:12px">${inp('water_temp_c', 'Water °C', 'number')}${inp('air_temp_c', 'Air °C', 'number')}${inp('wind_sea_state', 'Wind and sea', 'text', 'Words or Beaufort')}${inp('minutes_alarm_to_reach', 'Minutes, alarm to reach', 'number', 'From the first call to reaching the person')}${sel('who_responded', F.who, 'Who responded')}</div>
    <h2 class="h4">Outcome and source</h2>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(170px,100%),1fr));gap:12px">${sel('outcome', F.outcome, 'Outcome', true)}${inp('source', 'Source', 'text', 'Who recorded it: a role, a log, a release', true)}${sel('confidence', F.confidence, 'Confidence', true)}</div>
    <div class="field"><label for="r-notes">Notes</label><textarea id="r-notes" name="notes" style="min-height:70px"></textarea><span class="hint">No names, no contacts, no precise positions. The row is refused if it looks like it carries any.</span></div>
    <div class="row"><button class="btn btn--primary" type="submit">Add the row</button><button class="btn btn--ghost" type="button" id="r-clear">Clear the form</button></div>
    <p id="r-msg" class="small muted" aria-live="polite"></p>
  </form>
  <div class="stack" style="flex:1 1 300px;min-width:0;gap:14px">
    <div class="card stack-sm"><p class="eyebrow">Why these columns</p><p class="small" style="font-size:15px">Only 31% of countries record where a drowning happened and fewer than 30% record the activity. Minutes from alarm to reach is the number no global dataset has. Two hundred careful rows from one harbor are the first dataset of their kind.</p></div>
    <div class="card stack-sm card--dashed"><p class="eyebrow">Where rows go</p><p class="small" style="font-size:15px">Export the CSV and send it to the lab, or open a pull request in the open-data repository. A person reads every row before it joins a release. Your harbor is credited; no person is ever named.</p></div>
  </div>
</div></section>
<section class="section"><div class="wrap stack" style="gap:20px">
  ${sectionHead('Your rows', '<span id="rows-title">In this browser only, until you export them.</span>', '')}
  <div id="r-summary"></div>
  <div id="r-table"></div>
  <div class="row"><button class="btn" id="r-export">Export CSV</button><button class="btn btn--ghost" id="r-copy">Copy CSV</button><button class="btn btn--ghost" id="r-wipe">Delete all rows</button></div>
  <div id="fallback-box" hidden></div>
</div></section>`;
  }

  function mount(ctx) {
    const { toast, copyText, saveFile } = ctx;
    const form = document.getElementById('rform'); if (!form) return;
    const msg = document.getElementById('r-msg');
    const render = () => {
      const rows = load();
      const sum = document.getElementById('r-summary'), tbl = document.getElementById('r-table');
      if (!rows.length) { sum.innerHTML = ''; tbl.innerHTML = '<p class="small muted">No rows yet. The first one takes about two minutes.</p>'; return; }
      const outcomes = {}; rows.forEach((r) => { outcomes[r.outcome] = (outcomes[r.outcome] || 0) + 1; });
      const mins = rows.map((r) => Number(r.minutes_alarm_to_reach)).filter((n) => n > 0).sort((a, b) => a - b);
      const median = mins.length ? mins[Math.floor(mins.length / 2)] : null;
      const pfd = rows.filter((r) => r.pfd_worn === 'yes').length, pfdKnown = rows.filter((r) => r.pfd_worn === 'yes' || r.pfd_worn === 'no').length;
      sum.innerHTML = `<div class="scoreboard" style="border-top-width:2px"><div><span class="n" style="font-size:48px">${rows.length}</span><b>Rows</b></div><div><span class="n" style="font-size:48px">${outcomes.fatal || 0}</span><b>Fatal</b></div><div><span class="n" style="font-size:48px">${(outcomes['rescued-unharmed'] || 0) + (outcomes['rescued-injured'] || 0) + (outcomes['non-fatal-drowning'] || 0)}</span><b>Survived</b></div><div><span class="n" style="font-size:48px">${median == null ? '—' : median}</span><b>Median minutes to reach</b><span class="small muted">${mins.length} rows with a time</span></div><div><span class="n" style="font-size:48px">${pfdKnown ? Math.round((pfd / pfdKnown) * 100) + '%' : '—'}</span><b>Life jacket worn</b><span class="small muted">where known</span></div></div>`;
      tbl.innerHTML = `<div class="tscroll"><table class="data"><thead><tr><th>Date</th><th>Place</th><th>Water · activity</th><th>Outcome</th><th>Minutes</th><th>Source</th><th></th></tr></thead><tbody>${rows.map((r, i) => `<tr><td class="mono">${esc(r.date)}</td><td>${esc(r.place)}</td><td class="small">${esc(r.water)} · ${esc(r.activity)}</td><td><span class="pill ${r.outcome === 'fatal' ? 'pill-A' : r.outcome === 'missing' ? 'pill-B' : 'pill-C'}" style="text-transform:none">${esc(r.outcome)}</span></td><td class="mono">${esc(r.minutes_alarm_to_reach || '—')}</td><td class="small">${esc(r.source)}</td><td><button class="btn btn--sm btn--ghost" data-del="${i}" style="min-height:32px;padding:0 10px">Remove</button></td></tr>`).join('')}</tbody></table></div>`;
      tbl.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { const rs = load(); rs.splice(Number(b.dataset.del), 1); save(rs); render(); }));
    };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      [...form.querySelectorAll('.field')].forEach((f) => { const el = f.querySelector('input,select,textarea'); const bad = el && el.required && !String(el.value).trim(); f.classList.toggle('err', !!bad); if (bad) ok = false; });
      if (!ok) { msg.textContent = 'Fill in the fields marked *.'; return; }
      const row = {}; COLS.forEach((c) => { const el = form.elements[c]; row[c] = el ? String(el.value).trim() : ''; });
      row.event_id = 'r-' + Date.now().toString(36);
      row.lat = ''; row.lon = '';
      if (looksPersonal(row)) { msg.textContent = 'Refused: a field looks like it carries a contact, an address or a named person. Remove it and try again.'; return; }
      const rows = load(); rows.unshift(row);
      if (!save(rows)) { msg.textContent = 'This browser is not keeping storage. Export the row now; it will not survive a reload.'; }
      else msg.textContent = `Row ${row.event_id} added. ${rows.length} in this browser.`;
      form.reset(); render(); window.scrollTo({ top: document.getElementById('rows-title').getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' });
    });
    document.getElementById('r-clear').addEventListener('click', () => { form.reset(); msg.textContent = ''; });
    document.getElementById('r-export').addEventListener('click', () => { const rows = load(); if (!rows.length) { toast('No rows yet'); return; } saveFile(`register-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows)); });
    document.getElementById('r-copy').addEventListener('click', () => { const rows = load(); if (!rows.length) { toast('No rows yet'); return; } copyText(toCSV(rows)); });
    document.getElementById('r-wipe').addEventListener('click', () => { const btn = document.getElementById('r-wipe'); if (btn.dataset.armed) { save([]); render(); btn.textContent = 'Delete all rows'; delete btn.dataset.armed; toast('Rows deleted'); } else { btn.dataset.armed = '1'; btn.textContent = 'Press again to delete all'; setTimeout(() => { btn.textContent = 'Delete all rows'; delete btn.dataset.armed; }, 4000); } });
    render();
  }
  window.Register = { page, mount };
})();
