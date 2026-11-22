/* The Life-Saving Lab · site app. Routes live in the hash as one plain token: #toll, #ledger-<row>, #tree-<node>, #contribute-<type>. */
(function () {
  const { fmt, esc, roundK } = window.Charts;
  const app = document.getElementById('app');
  const DATA = { ledger: null, toll: null, tree: null, byId: {}, parent: {}, tasks: null, watch: null, changelog: null, receipts: null };
  const MAIL = 'hello@thelifesavinglab.org';
  const SITE = 'https://thelifesavinglab.org';
  const REPO = 'github.com/ethanhawkes-gif/thelifesavinglab-open-data';
  /* Money goes to the station, not the lab. The association's own site carries its giving page; we link there and nowhere else. */
  const WILSSA = 'https://woodislandlifesaving.org';

  const PHOTOS = {
    hero: 'img/hero_station.jpg',
    rocks: 'img/station_rocks.jpg',
    kayak: 'img/kayak_whaleback.jpg',
    buoy: 'img/harbor_buoy.jpg'
  };

  /* ---------- utilities ---------- */
  function toast(msg) {
    const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 2200);
  }
  async function copyText(text, el) {
    try { await navigator.clipboard.writeText(text); toast('Copied'); }
    catch {
      if (el && el.select) { el.select(); toast('Select and copy'); } else toast('Copy is not available here; select the text instead');
    }
  }
  let downloadsNS = undefined;
  async function saveFile(filename, data) {
    /* On the real site a plain download works. Inside the artifact viewer downloads go through its own channel, with a copy box as the last resort. */
    if (!(window.claude && window.claude.use)) {
      try {
        const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 1)], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('Saved ' + filename); return;
      } catch { showFallback(filename, data); return; }
    }
    if (downloadsNS === undefined) { try { downloadsNS = await window.claude.use('downloads'); } catch { downloadsNS = null; } }
    if (!downloadsNS) { showFallback(filename, data); return; }
    try { await downloadsNS.save({ filename, data }); toast('Saved ' + filename); }
    catch (e) { if (e && e.code === 'declined') return; showFallback(filename, data); }
  }
  function showFallback(filename, data) {
    const box = document.getElementById('fallback-box');
    if (!box) { toast('Saving files is not available in this view'); return; }
    box.hidden = false;
    box.innerHTML = `<div class="stack-sm"><p><b>Saving files is not available in this view.</b> Copy <span class="mono">${esc(filename)}</span> from the box below.</p><textarea id="fallback-ta" style="width:100%;min-height:160px;font-family:var(--mono);font-size:12px;padding:10px;border:1.5px solid var(--line-2)"></textarea><div class="row"><button class="btn btn--sm" id="fallback-copy">Copy</button></div></div>`;
    const ta = document.getElementById('fallback-ta'); ta.value = typeof data === 'string' ? data : JSON.stringify(data, null, 1);
    document.getElementById('fallback-copy').onclick = () => copyText(ta.value, ta);
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function store(key, val) { try { if (val === undefined) return JSON.parse(localStorage.getItem(key) || 'null'); localStorage.setItem(key, JSON.stringify(val)); } catch { return null; } }
  function toCSV(rows) {
    const cols = Object.keys(rows[0]);
    const q = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return cols.join(',') + '\n' + rows.map((r) => cols.map((c) => q(r[c])).join(',')).join('\n') + '\n';
  }
  const gradeName = { A: 'A · primary official', B: 'B · peer-reviewed', C: 'C · secondary', D: 'D · lab judgment' };
  const pill = (g) => `<span class="pill pill-${g}" title="${esc(gradeName[g] || g)}">${g}</span>`;
  const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return 'source'; } };
  const ledgerLink = (id) => { const r = DATA.byId[id]; return r ? `<a href="#ledger-${esc(id)}" title="${esc(r.source)}">${esc(id)}</a>` : esc(id); };

  /* ---------- data ---------- */
  async function load() {
    const get = (p) => fetch(p).then((r) => { if (!r.ok) throw new Error(p); return r.json(); });
    const soft = (p) => get(p).catch(() => null);
    const [ledger, toll, tree, tasks, watch, changelog, receipts] = await Promise.all([get('data/ledger.json'), get('data/toll.json'), get('data/tree.json'), soft('data/tasks.json'), soft('data/watch-feed.json'), soft('data/changelog.json'), soft('data/receipts.json')]);
    DATA.ledger = ledger; DATA.toll = toll; DATA.tree = tree; DATA.tasks = tasks; DATA.watch = watch; DATA.changelog = changelog; DATA.receipts = receipts;
    ledger.rows.forEach((r) => { DATA.byId[r.id] = r; });
    Object.entries(tree.nodes).forEach(([id, n]) => (n.options || []).forEach((o) => { DATA.parent[o.to] = id; }));
  }

  /* ---------- shared blocks ---------- */
  function sectionHead(eyebrow, title, lede) {
    return `<div class="split"><div class="stack"><p class="eyebrow">${eyebrow}</p><h2 class="display h2">${title}</h2></div>${lede ? `<p class="lede">${lede}</p>` : ''}</div>`;
  }
  function photo(src, alt, caption, style) {
    return `<figure class="photo" style="${style || ''}"><img src="${src}" alt="${esc(alt)}" loading="lazy">${caption ? `<figcaption>${esc(caption)}</figcaption>` : ''}</figure>`;
  }
  const noData = `<p class="notice"><span class="eyebrow">Data not loaded</span><br>The data files could not be read in this view. Reload the page, or open the files under <span class="mono">data/</span> directly.</p>`;

  /* ---------- HOME ---------- */
  function home() {
    const toll = DATA.toll, rows = DATA.ledger ? DATA.ledger.rows.length : 0;
    const floor = toll ? fmt(roundK(toll.floor)) : '—', ceil = toll ? fmt(roundK(toll.ceiling)) : '—';
    const openTasks = DATA.tasks ? DATA.tasks.tasks.filter((t) => t.status !== 'done' && !(t.claimed_until && Date.parse(t.claimed_until) > Date.now())).length : 0;
    const receipts = DATA.receipts && Array.isArray(DATA.receipts.receipts) ? DATA.receipts.receipts.length : 0;
    const branches = DATA.tree && DATA.tree.nodes ? Object.keys(DATA.tree.nodes).length : 0;
    const nextTask = DATA.tasks ? DATA.tasks.tasks.find((t) => t.status !== 'done' && !(t.claimed_until && Date.parse(t.claimed_until) > Date.now())) : null;
    const fieldNotes = DATA.changelog && Array.isArray(DATA.changelog.entries) ? DATA.changelog.entries.slice(0, 4) : [];
    const checked = toll?.last_checked || 'date not supplied';
    return `
<section class="challenge-strip" aria-label="Current challenge status"><div class="wrap challenge-strip-inner"><span class="live-dot" aria-hidden="true"></span><span><b>Open challenge</b> · early stage · open to inspection</span><span class="challenge-strip-sep">/</span><span>Last checked ${esc(checked)}</span><a href="#challenge" class="mono">Open the question →</a></div></section>

<section class="hero hero--reframed" aria-labelledby="hero-title">
  <div class="hero-text"><div>
    <p class="eyebrow">The Life-Saving Lab · Portsmouth Harbor</p>
    <h1 id="hero-title" class="display h1">When the decision matters, the knowledge is usually somewhere else.</h1>
    <p class="lede">A drowning can turn on minutes. The evidence that might change the outcome is scattered across reports, memories, agencies and places. When the next person needs it, they often inherit fragments—not a trustworthy next step.</p>
    <p class="hero-promise">If we do not build a better way to find, adapt and check what works, every community keeps starting over. The Lab is an open attempt to change that.</p>
    <div class="row"><a class="btn btn--primary" href="#challenge">Work on the open challenge <span aria-hidden="true">→</span></a><a class="btn btn--ghost" href="#state">See what exists now</a></div>
    <p class="small hero-boundary">We are early. We have working artifacts, not proof of universal impact. This site shows the difference.</p>
  </div></div>
  <div class="hero-photo">
    <img src="${PHOTOS.hero}" alt="Wood Island Life-Saving Station in Kittery, Maine, seen down its boardwalk: white shingles, a red roof and lookout tower, a surfboat on its launching carriage, and Whaleback Light on the horizon">
    <p class="credit">Wood Island Life-Saving Station · Photo: Ethan Hawkes</p>
    <div class="stamp stamp--northstar"><p class="eyebrow">The North Star</p><p class="northstar-line">A person facing a water risk can find a more trustworthy next step, understand why it is suggested, adapt it to local reality, and leave the next person better prepared.</p><a href="/manifesto/" class="mono">Read the founding manifesto →</a></div>
  </div>
</section>

<section class="section section--tight" id="state" aria-labelledby="state-title"><div class="wrap stack" style="gap:26px">
  <div class="split"><div class="stack-sm"><p class="eyebrow">Where the work stands</p><h2 id="state-title" class="display h2">Early. Useful. Not proven at scale.</h2></div><p class="lede">The honest current state is part of the product. Some entries are evidence. Some are hypotheses. Some are unresolved. We label the difference.</p></div>
  <div class="state-grid">
    <div class="state-card"><span class="state-label state-label--established">Established</span><h3 class="h3">A public record</h3><p>${rows} ledger rows, each with a source, a date, and a rule for what it must not be added to.</p><a class="mono" href="#ledger">Inspect the ledger →</a></div>
    <div class="state-card"><span class="state-label state-label--working">Working</span><h3 class="h3">A way to reason</h3><p>${branches || '—'} tree nodes ask which water and which person before suggesting a measure.</p><a class="mono" href="#tree">Walk the decision tree →</a></div>
    <div class="state-card"><span class="state-label state-label--open">Open</span><h3 class="h3">Questions still need owners</h3><p>${openTasks} bounded tasks are open. A useful contribution is small enough to finish and clear enough to review.</p><a class="mono" href="#lend">Choose one task →</a></div>
    <div class="state-card"><span class="state-label state-label--unknown">Not yet proven</span><h3 class="h3">Real-world effect</h3><p>No pilot is being counted as a life saved. The next proof is one complete trace: a real practitioner question, an owner, a bounded change, a reviewer, and an honest record of what happened.</p><a class="mono" href="#pilots">See the pilot rule →</a></div>
  </div>
</div></section>

<section class="section dark" id="challenge" aria-labelledby="challenge-title"><div class="wrap stack" style="gap:30px">
  <div class="split"><div class="stack-sm"><p class="eyebrow">The open challenge · one question at a time</p><h2 id="challenge-title" class="display h2">How do we turn a scattered water-safety claim into a local action an actual service could run—and check?</h2></div><p class="lede">This is the work. Not a campaign. Not a promise that a dashboard will save anyone. A question that can be narrowed, tested, handed to someone with authority, and improved by the next person.</p></div>
  <article class="challenge-card" aria-label="Current challenge card">
    <div class="challenge-card-top"><span class="pill pill-range">Open · testing the shape</span><span class="mono">Challenge 001 · updated ${esc(checked)}</span></div>
    <div class="challenge-fields">
      <div><span class="field-k">The failure</span><p>The record is fragmented. A useful local observation can remain invisible; a global estimate can look more certain than it is; a good practice can disappear when the person who knows it leaves.</p></div>
      <div><span class="field-k">The condition for better</span><p>A person can trace a claim, see its limits, adapt it to a specific water and person, and identify who could responsibly try it.</p></div>
      <div><span class="field-k">What exists now</span><p>The ledger, decision tree, pilot format, local register, agent task board and public receipts are live. They are the first instruments, not the finished system.</p></div>
      <div><span class="field-k">What remains unknown</span><p>Whether these instruments help a real person make a better decision under local pressure—and whether the learning travels without losing context. We have not yet completed the full trace from practitioner question to adopted change.</p></div>
    </div>
    <div class="challenge-next"><div><span class="field-k">Next useful move</span><p>${nextTask ? esc(nextTask.title) : 'Bring one source, local constraint, observation or pilot question.'}</p></div><a class="btn btn--primary" href="#lend">Take the next move <span aria-hidden="true">→</span></a></div>
  </article>
</div></section>

<section class="section" aria-labelledby="ratchet-title"><div class="wrap stack" style="gap:30px">
  <div class="split"><div class="stack-sm"><p class="eyebrow">The ratchet</p><h2 id="ratchet-title" class="display h2">Find. Adapt. Share. Verify. Carry forward.</h2></div><p class="lede">The goal is not more activity. It is a public memory that gets more useful without pretending uncertainty has disappeared.</p></div>
  <ol class="ratchet-list">
    <li><span class="ratchet-n">01</span><div><h3 class="h3">Find</h3><p>Locate a source, observation, failure or missing piece. Keep the context attached.</p><a class="mono" href="#gaps">See the gaps →</a></div></li>
    <li><span class="ratchet-n">02</span><div><h3 class="h3">Adapt</h3><p>Make the question fit one water, one person and one real decision. Do not generalize past the evidence.</p><a class="mono" href="#tree">Choose a branch →</a></div></li>
    <li><span class="ratchet-n">03</span><div><h3 class="h3">Try</h3><p>Write one small pilot with a forecast, an adopter and a way to know it failed.</p><a class="mono" href="#pilots">Write the test →</a></div></li>
    <li><span class="ratchet-n">04</span><div><h3 class="h3">Verify</h3><p>Publish what happened, including misses, corrections and the conditions that did not travel.</p><a class="mono" href="#lend">Follow a receipt →</a></div></li>
    <li><span class="ratchet-n">05</span><div><h3 class="h3">Carry forward</h3><p>Leave the next person a clearer record, a better tool and a more honest starting point.</p><a class="mono" href="/principles/">Read the principles →</a></div></li>
  </ol>
</div></section>

<section class="section band" aria-labelledby="concrete-title"><div class="wrap stack" style="gap:28px">
  <div class="split"><div class="stack-sm"><p class="eyebrow">A first useful move</p><h2 id="concrete-title" class="display h2">Do something small enough to finish.</h2></div><p class="lede">You do not need to join an institution or understand the whole system. Start where your time, knowledge or access is real.</p></div>
  <div class="grid g4 action-grid">
    <a class="action-card" href="#lend"><span class="action-time">20 minutes</span><h3 class="h3">Check one claim</h3><p>Open the source, see if the row holds, and leave a correction or a clean receipt.</p><span class="mono">Lend an agent an hour →</span></a>
    <a class="action-card" href="#register"><span class="action-time">One event</span><h3 class="h3">Bring local knowledge</h3><p>Record what happened without names, invented precision or a story nobody can check.</p><span class="mono">Open the register →</span></a>
    <a class="action-card" href="#pilots"><span class="action-time">One session</span><h3 class="h3">Write a pilot</h3><p>Name the adopter, forecast the result, and say in advance what would make you stop.</p><span class="mono">Use the format →</span></a>
    <a class="action-card" href="#contribute"><span class="action-time">Your judgment</span><h3 class="h3">Challenge the premise</h3><p>Bring a constraint, a failure or a better question. Independent judgment is part of the work.</p><span class="mono">Contribute →</span></a>
  </div>
  <p class="small muted">The promise is reciprocal: one useful contribution, a thoughtful response, evidence of use, and a meaningful next invitation. If we cannot show what your work changed, the handoff is incomplete.</p>
</div></section>

<section class="section" aria-labelledby="proof-title"><div class="wrap stack" style="gap:28px">
  <div class="split"><div class="stack-sm"><p class="eyebrow">Follow the work</p><h2 id="proof-title" class="display h2">Do not take our word for it.</h2></div><p class="lede">The strongest signal is not a logo or a claim. It is a record another person can inspect, disagree with, and use.</p></div>
  <div class="proof-grid">
    <div class="proof-card"><span class="field-k">Evidence</span><strong>~${floor}–${ceil}</strong><p>A modeled global range, not a live death counter. The disagreement stays visible.</p><a class="mono" href="#toll">Read the method →</a></div>
    <div class="proof-card"><span class="field-k">Work in public</span><strong>${receipts}</strong><p>Public receipts showing what reviewed contributions changed. Zero is an honest result too.</p><a class="mono" href="#lend">See the receipts →</a></div>
    <div class="proof-card"><span class="field-k">Field notes</span><div class="field-note-list">${fieldNotes.length ? fieldNotes.map((e) => `<div class="field-note"><span class="mono">${esc(e.date)}</span><span>${esc(e.subject)}</span></div>`).join('') : '<p class="small muted">The first field note will appear when the public record changes.</p>'}</div><a class="mono" href="#ledger">Open the record →</a></div>
  </div>
</div></section>

<section class="section dark" aria-labelledby="join-title"><div class="wrap stack" style="gap:28px">
  <div class="split"><div class="stack-sm"><p class="eyebrow">The invitation</p><h2 id="join-title" class="display h2">Bring one question we can make more answerable.</h2></div><p class="lede">Bring a source, a local constraint, a failed attempt, or ten minutes to check someone else’s work. Humans, organizations and AI assistants are welcome; responsibility stays with the people who can decide and act.</p></div>
  <div class="row"><a class="btn btn--primary" href="#challenge">Open the current challenge <span aria-hidden="true">→</span></a><a class="btn btn--ghost" href="#ledger">Browse the public record</a><a class="btn btn--ghost" href="/manifesto/">Read the founding manifesto</a></div>
</div></section>`;
  }

  function aboutPage() {
    return `
<section class="section"><div class="wrap stack" style="gap:30px">
  <p class="eyebrow">About the Lab</p><h1 class="display h2" style="max-width:18em">A practical lab for a problem no one can solve from one desk.</h1>
  <p class="lede" style="max-width:44em">The Life-Saving Lab brings students, responders, researchers and agents to one real problem: drowning. We keep the evidence in public, work one harbor closely, and turn what we learn into changes a nonprofit rescue service can actually run.</p>
  <div class="grid g2"><article class="card stack-sm partner-card"><img src="img/partners/applied-wisdom.svg" alt="Applied Wisdom for Nonprofits" class="partner-logo"><p class="eyebrow">Equal partner · curriculum and applied wisdom</p><h2 class="h3">Applied Wisdom makes the learning useful.</h2><p>Applied Wisdom powers the curriculum: how teams make decisions with incomplete information, how they speak bad news early, and how they turn a debrief into a better next decision. The drowning problem is the testbed; the wisdom is meant to travel to the next nonprofit and the next hard situation.</p><a href="https://appliedwisdomfornonprofits.org" target="_blank" rel="noopener">Visit Applied Wisdom for Nonprofits →</a></article>
  <article class="card stack-sm partner-card"><img src="img/partners/wood-island.png" alt="Wood Island Life Saving Station Association" class="partner-logo partner-logo--wood"><p class="eyebrow">Equal partner · host, local expertise and network</p><h2 class="h3">Wood Island makes the work real.</h2><p>Wood Island is the host and local network hub: a restored life-saving station, the harbor’s history, and the people who know what the water asks of a crew. The station is a classroom, not an on-duty rescue service. Donations go directly to the Association, not the Lab.</p><a href="https://woodislandlifesaving.org" target="_blank" rel="noopener">Visit Wood Island Life Saving Station →</a></article></div>
</div></section>
<section class="section band"><div class="wrap stack" style="gap:22px"><p class="eyebrow">People behind the work</p><div class="grid g4"><div class="card stack-sm"><h2 class="h4">Ethan Hawkes</h2><p>Project initiator, bringing the people and practical questions together.</p></div><div class="card stack-sm"><h2 class="h4">Jim McDonough</h2><p>Applied Wisdom curriculum partner and original explainer collaborator; source/export review remains with him.</p></div><div class="card stack-sm"><h2 class="h4">Laura Calhoun</h2><p>Executive Director, Wood Island Life Saving Station Association; a key participant connecting the project with the station.</p></div><div class="card stack-sm"><h2 class="h4">Sam Reid</h2><p>Board President, Wood Island Life Saving Station Association; bringing station and community knowledge.</p></div></div><div class="card--dark stack-sm" style="padding:24px"><p class="eyebrow">AI agent partners</p><h2 class="h3" style="color:var(--paper)">Lab Mate · Paco · Vesper</h2><p class="small" style="font-size:16px;color:var(--mist);max-width:48em">These agents help research, test interfaces, find gaps and keep the handoff honest. They do not replace a responder, a source, a human reviewer or the people who decide whether a pilot belongs on the water. Every contribution is provisional until a person reviews it.</p><a class="btn btn--primary btn--sm" href="#lend">See the agent workbench</a></div></div></section>`
  }

  /* ---------- THE TOLL ---------- */
  function tollPage() {
    const toll = DATA.toll, R = DATA.byId;
    if (!toll) return `<section class="section"><div class="wrap">${noData}</div></section>`;
    const floor = fmt(roundK(toll.floor)), ceil = fmt(roundK(toll.ceiling));
    return `
<section class="section" style="padding-bottom:40px"><div class="wrap stack" style="gap:28px">
  <p class="eyebrow">The toll · last checked ${esc(toll.last_checked)}</p>
  <h1 class="display h2" style="max-width:20em">Between about ${floor} and ${ceil} people a year. Nobody knows where in that range the truth sits.</h1>
  <p class="lede" style="max-width:44em">Drowning is modeled, not fully counted, and the best models leave real deaths out by definition: boats, floods, much of fishing, migrants at sea. We size the toll the only defensible way: a floor built from the lowest documented value of every component, a ceiling from the highest, and an open admission that beyond the ceiling the number is unknown, not zero. Closing that gap is the lab’s work, and it needs more hands than ours.</p>
</div></section>

<section class="section--tight" style="padding-top:0"><div class="wrap stack" style="gap:28px">
  ${window.Charts.tollBar(toll)}
  ${window.Extra.counterBlock(toll)}
  <div class="grid g3">
    <div class="card stack-sm"><p class="eyebrow">The floor · ~${floor}</p><p class="small" style="font-size:16px">The lowest published bound of the core (${fmt(toll.layers[0].low)}) plus the lowest documented value of every component outside it. It assumes every fishing death is already inside WHO’s figure.</p></div>
    <div class="card stack-sm"><p class="eyebrow">The ceiling · ~${ceil}</p><p class="small" style="font-size:16px">The highest documented value of each, assuming none of the fishing toll is inside the core. It is a ceiling of what has been written down, not of what happens.</p></div>
    <div class="card stack-sm card--dashed"><p class="eyebrow">Beyond · unknown</p><p class="small" style="font-size:16px">Shipping and small craft have no global series. Intentional drowning is not reproduced here. Survivors, where counted, run two to four per death and are never added.</p></div>
  </div>
</div></section>

<section class="section band" aria-labelledby="parts-title"><div class="wrap stack" style="gap:28px">
  ${sectionHead('The parts', '<span id="parts-title">Seven components, each on its own evidence.</span>', 'Every bar is a range, not a point. A dashed line means the world has no yearly number. Click a row id to see its source.')}
  ${window.Charts.layerStrips(toll, R)}
</div></section>

<section class="section" aria-labelledby="core-title"><div class="wrap stack" style="gap:28px">
  ${sectionHead('The core', '<span id="core-title">Same year, two models, 26,028 deaths apart.</span>', 'Two teams, the World Health Organization and the Institute for Health Metrics and Evaluation (IHME), each estimate how many people drowned in 2021, from separate data and separate methods. The gap between them is a measure of how uncertain the number is, not 26,028 newly found deaths. We never average them.')}
  <div class="card" style="padding:clamp(18px,3vw,32px)">${window.Charts.estimates(R)}
  <p class="small muted" style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line)">Deaths, axis from zero. The outlined box is IHME’s published 95% uncertainty interval; WHO’s summary tables print no interval, which is not the same as no uncertainty. Rows: ${['who-ghe-2021', 'ihme-gbd-2021', 'who-ghe-2019'].map(ledgerLink).join(', ')}.</p></div>
  <div class="grid g2">
    <div class="stack-sm"><h3 class="h4">Why estimates disagree</h3><ul class="small" style="font-size:16px;padding-left:20px;display:flex;flex-direction:column;gap:6px"><li>Most countries do not record every death with a cause. Where records are incomplete, both teams estimate the missing deaths with a model.</li><li>Different input databases, corrections and cause-of-death redistribution.</li><li>The definition both use (the medical codes for accidental drowning, ICD-10 W65–W74) leaves out deaths in boats and ships, in floods, and on purpose. ${ledgerLink('icd-definition')}</li><li>Only one of them publishes a range: IHME prints an interval, the WHO summary tables print a single number.</li></ul></div>
    <div class="stack-sm"><h3 class="h4">The long trend, inside one model</h3><p class="small" style="font-size:16px">GBD 2017 put 1990 at ${fmt(R['gbd-1990-franklin'].low)}–${fmt(R['gbd-1990-franklin'].high)} and 2017 at ${fmt(R['gbd-2017-franklin'].low)}–${fmt(R['gbd-2017-franklin'].high)}: a 44.5% fall. WHO reports the global rate down 38% since 2000, from 6.1 to 3.8 per 100,000. Trends are only read within one model round. ${ledgerLink('gbd-2017-franklin')}, ${ledgerLink('who-rate-trend')}</p></div>
  </div>
</div></section>

<section class="section band" aria-labelledby="who-title"><div class="wrap stack" style="gap:36px">
  ${sectionHead('Who drowns', '<span id="who-title">The poorer the country, the higher the rate. The younger the person, the larger the share.</span>', 'Shares of one estimate, cut different ways. They overlap, so they are never stacked on each other.')}
  <div class="grid" style="gap:24px;grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr))">
    <div class="card stack-sm"><p class="eyebrow">By country income · 2021</p>${window.Charts.income(R)}<p class="small muted">WHO 2024 report, Fig. 3, p. 15. Rows sum to 299,000 because of rounding. 9 in 10 deaths are in low- and middle-income countries.</p></div>
    <div class="card stack-sm"><p class="eyebrow">By WHO region · 2021</p>${window.Charts.regions(R)}<p class="small muted">All six are read from Fig. 2 and p. 14 of WHO’s 2024 report, which prints deaths to the nearest thousand; they add to the global 300,000. Two regions, Western Pacific and South-East Asia, hold 56% of the toll. Since 2000 the global rate has fallen 38%, but only 3% in Africa (p. 17). A figure of 9,155 for Europe that circulates online was traced to a press article mixing a 2017 model with this report; the report prints 15,000. ${ledgerLink('who-trend-2000-2021')} · ${ledgerLink('esanum-europe-9155')}</p></div>
    <div class="card stack-sm"><p class="eyebrow">By age</p>${window.Charts.ages()}<p class="small muted">WHO fact sheet: children under 5 are nearly a quarter of deaths; ages 0–29 are 57%. The 30-and-over share is the remainder. Rows: ${ledgerLink('who-age-under5')}, ${ledgerLink('who-age-under30')}.</p></div>
    <div class="stack" style="gap:14px">
      <div class="card stack-sm"><p class="eyebrow">By sex</p><p class="display" style="font-size:40px">More than 2×</p><p class="small" style="font-size:16px">The male drowning death rate is more than twice the female rate. ${ledgerLink('who-sex')}</p></div>
      <div class="card stack-sm card--dashed"><p class="eyebrow">Survivors, where counted</p><p class="display" style="font-size:40px">2 to 4 per death</p><p class="small" style="font-size:16px">Emergency departments see about two people with non-fatal drowning for every death in the United States and nearly four in Ontario; hospital admissions in Australia run at 2.7. Children’s ratios are far higher, 5 to 8. No global ratio exists: WHO says non-fatal data are largely unavailable, and the often-quoted “four to five” was traced to a press article with no source. Never added to a death count. ${ledgerLink('cdc-nonfatal-ed-2012-2021')} · ${ledgerLink('ontario-nonfatal-ed-ratio-2014-2023')} · ${ledgerLink('australia-nonfatal-hospitalisation-ratio-2002-2015')}</p></div>
    </div>
  </div>
</div></section>

<section class="section" aria-labelledby="country-title"><div class="wrap stack" style="gap:24px">
  ${sectionHead('Where counting works', '<span id="country-title">Three countries that count, and still disagree on what to count.</span>', 'Each national figure uses its own definition. They are shown side by side, never as a league table.')}
  <div class="grid g3">
    ${[['us-cdc-4500', 'United States', 'Unintentional drowning, CDC, 2020–2022 average'], ['australia-2024-25', 'Australia', 'All drowning deaths, Royal Life Saving, July 2024–June 2025'], ['uk-waid-2024', 'United Kingdom', 'Accidental water-related deaths, WAID 2024; 206 coroner cases still open']].map(([id, name, def]) => { const r = R[id]; return r ? `<div class="card stack-sm"><p class="eyebrow">${name}</p><p class="display" style="font-size:44px">${fmt(r.high)}</p><p class="small" style="font-size:15px">${def}</p><p class="mono muted">${ledgerLink(id)} · ${pill(r.grade)}</p></div>` : ''; }).join('')}
  </div>
  <p class="small muted">In the US, boating adds its own count: ${R['uscg-boating-2024'] ? fmt(R['uscg-boating-2024'].high) : ''} recreational boating deaths in 2024, three in four of them drownings, 87% of those without a life jacket. ${ledgerLink('uscg-boating-2024')}</p>
  <div class="card stack-sm" style="margin-top:8px"><p class="eyebrow">Which water, where someone counts · Australia 2024/25</p>
    <div role="img" aria-label="Australia 2024/25 drowning deaths by location: coastal 154 (43%), inland waterways 122 (34%), swimming pools 35 (10%), other or not listed 46 (13%)." style="display:flex;height:40px;border-radius:2px;overflow:hidden">
      <div style="width:43%;background:var(--navy);color:var(--paper);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:13px">Coastal 43%</div>
      <div style="width:34%;background:var(--teal);color:var(--paper);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:13px">Inland 34%</div>
      <div style="width:10%;background:var(--brass);color:var(--ink);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:13px">Pools</div>
      <div style="width:13%;background:#D8D1BF;color:var(--ink);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:13px">Other</div>
    </div>
    <p class="small" style="font-size:15px">Coastal 154 · inland rivers, creeks, lakes and dams 122 (rivers and creeks alone 99) · swimming pools 35, two-thirds of them backyard pools. The UK's 2024 register puts 61% of accidental deaths on inland water. ${ledgerLink('australia-location-2024-25')}, ${ledgerLink('uk-waid-2024')}</p>
    <p class="eyebrow" style="margin-top:10px">Canada 2018–2022, five years pooled</p>
    <div role="img" aria-label="Canada 2018 to 2022 unintentional drowning deaths by setting: lakes 36%, rivers 27%, bathtubs 15%, pools 9%, other 7%, ocean 6%." style="display:flex;height:40px;border-radius:2px;overflow:hidden">
      <div style="width:36%;background:var(--teal);color:var(--paper);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:13px">Lakes 36%</div>
      <div style="width:27%;background:#2E6B78;color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:13px">Rivers 27%</div>
      <div style="width:15%;background:var(--buoy);color:var(--paper);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:13px">Baths</div>
      <div style="width:9%;background:var(--brass);color:var(--ink);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:13px">Pools</div>
      <div style="width:7%;background:#D8D1BF;color:var(--ink);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:12px">Other</div>
      <div style="width:6%;background:var(--navy);color:var(--paper);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:12px">Sea</div>
    </div>
    <p class="small" style="font-size:15px">Inland water again: lakes and rivers hold 63% of Canada's deaths and the ocean 6%; bathtubs, 15%, are a setting the sea-and-coast picture never shows. Under 1% happened where a lifeguard was on duty. Percentages only; the counts are in a report that could not be opened yet. Neither split exists for the world. ${ledgerLink('canada-location-lakes-2018-22')}, ${ledgerLink('canada-location-lifeguard-supervised-2018-22')}</p>
    <p class="small muted">In a country that counts, the age profile also inverts: in Australia, people 65 and older were a third of deaths and under-fives were 15. ${ledgerLink('australia-age-2024-25')}</p>
  </div>
</div></section>

<section class="section" aria-labelledby="gaps-title"><div class="wrap stack" style="gap:28px">
  ${sectionHead('The gaps', '<span id="gaps-title">Why the range is this wide: most of what a good dataset needs is missing.</span>', 'For each part of the toll, eight questions a dataset should answer. Solid cells are known. Dashed cells are the work.')}
  ${window.Extra.coverageMatrix()}
  <div class="row"><a class="btn" href="#gaps">Nine gaps, and a first step for each</a><a class="btn btn--ghost" href="#contribute">Take one</a></div>
</div></section>

<section class="section" aria-labelledby="method-title"><div class="wrap stack" style="gap:28px">
  ${sectionHead('Method', '<span id="method-title">Three rules, applied in the open.</span>', '')}
  <ol class="steps" style="grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr))">
    <li><span class="n">1</span><h3 class="h3">Never add across sources</h3><p class="small" style="font-size:16px">Unless a row states the overlap assumption and names the rows it combines. The floor and ceiling do exactly that, in <span class="mono">toll.json</span>.</p></li>
    <li><span class="n">2</span><h3 class="h3">Grades describe provenance, not truth</h3><p class="small" style="font-size:16px">${pill('A')} primary official data or model output · ${pill('B')} peer-reviewed analysis · ${pill('C')} press, secondary summary or an organisation’s own statement · ${pill('D')} lab judgment, stated as such, with the task that retires it.</p></li>
    <li><span class="n">3</span><h3 class="h3">Unknown is drawn as unknown</h3><p class="small" style="font-size:16px">Never as zero and never as a guess. A dashed line on this page is a promise that nobody has the number yet.</p></li>
  </ol>
  <div class="row"><a class="btn" href="#ledger">Open the ledger</a><a class="btn btn--ghost" href="#contribute">Help close a gap</a></div>
</div></section>`;
  }

  /* ---------- LEDGER ---------- */
  const ledgerState = { q: '', cat: '', grade: '', open: false, sort: 'category', openRow: null };
  const CAT_ORDER = ['core', 'excluded', 'range', 'unknown', 'who-drowns', 'gap', 'prevention', 'rescue', 'local', 'context'];
  function ledgerPage(arg) {
    if (!DATA.ledger) return `<section class="section"><div class="wrap">${noData}</div></section>`;
    if (arg) { ledgerState.openRow = arg; ledgerState.q = ''; ledgerState.cat = ''; ledgerState.grade = ''; ledgerState.open = false; }
    const rows = DATA.ledger.rows;
    const counts = { A: 0, B: 0, C: 0, D: 0 }; rows.forEach((r) => counts[r.grade]++);
    const openTasks = rows.filter((r) => /verify|open/.test(r.tags)).length;
    const cats = [...new Set(rows.map((r) => r.category))].sort();
    return `
<section class="section" style="padding-bottom:36px"><div class="wrap stack" style="gap:24px">
  <p class="eyebrow">The ledger · v${esc(DATA.ledger.version)} · last checked ${esc(DATA.ledger.last_checked)}</p>
  <h1 class="display h2" style="max-width:18em">Every figure on this site, with its source and the rule for what it must not be added to.</h1>
  <p class="lede" style="max-width:44em">${esc(DATA.ledger.rule)} The files are free to reuse (CC BY 4.0). A person merges every change.</p>
  <div class="scoreboard" style="border-top-width:2px">
    <div><span class="n" style="font-size:56px">${rows.length}</span><b>Rows</b></div>
    <div><span class="n" style="font-size:56px">${counts.A}</span><b>${pill('A')} primary</b></div>
    <div><span class="n" style="font-size:56px">${counts.B}</span><b>${pill('B')} peer-reviewed</b></div>
    <div><span class="n" style="font-size:56px">${counts.C}</span><b>${pill('C')} secondary</b></div>
    <div><span class="n" style="font-size:56px;color:var(--rust)">${openTasks}</span><b>Open tasks</b><span class="small muted">Rows tagged verify or open</span></div>
  </div>
  <div class="row"><button class="btn btn--sm" id="dl-json">Download ledger.json</button><button class="btn btn--sm" id="dl-csv">Download ledger.csv</button><button class="btn btn--sm btn--ghost" id="dl-toll">toll.json</button><button class="btn btn--sm btn--ghost" id="dl-tree">tree.json</button><a class="btn btn--sm btn--ghost" href="data/schema.md">Schema and field guide</a><a class="btn btn--sm btn--primary" href="#contribute-row">Propose a row</a></div>
  <div id="fallback-box" hidden></div>
</div></section>

<section class="section--tight band"><div class="wrap stack" style="gap:18px">
  <div class="tbar">
    <div class="field" style="flex:2 1 240px"><label for="lq">Search</label><input id="lq" type="search" placeholder="id, source, scope, geography…" value="${esc(ledgerState.q)}"></div>
    <div class="field" style="flex:1 1 160px"><label for="lcat">Category</label><select id="lcat"><option value="">All</option>${cats.map((c) => `<option value="${esc(c)}" ${ledgerState.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
    <div class="field" style="flex:1 1 120px"><label for="lgrade">Grade</label><select id="lgrade"><option value="">All</option>${['A', 'B', 'C', 'D'].map((g) => `<option value="${g}" ${ledgerState.grade === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
    <div class="field" style="flex:1 1 150px"><label for="lsort">Sort</label><select id="lsort"><option value="category" ${ledgerState.sort === 'category' ? 'selected' : ''}>category</option><option value="id" ${ledgerState.sort === 'id' ? 'selected' : ''}>id</option><option value="year" ${ledgerState.sort === 'year' ? 'selected' : ''}>year, newest</option><option value="grade" ${ledgerState.sort === 'grade' ? 'selected' : ''}>grade</option></select></div>
    <label class="field" style="flex:0 0 auto;flex-direction:row;align-items:center;gap:8px;min-height:44px"><input id="lopen" type="checkbox" ${ledgerState.open ? 'checked' : ''} style="width:20px;height:20px"> <span style="font-size:15px">Open tasks only</span></label>
  </div>
  <div id="ledger-table"></div>
</div></section>

${DATA.changelog && DATA.changelog.entries.length ? `<section class="section--tight" aria-labelledby="hist-title"><div class="wrap stack" style="gap:18px">
  <div class="stack"><p class="eyebrow">What changed</p><h2 class="h3" id="hist-title">Every change to the data, newest first.</h2></div>
  <div class="stack" style="gap:0">${DATA.changelog.entries.slice(0, 12).map((e) => `<div class="rec" style="padding:10px 0;flex-direction:row;gap:16px;align-items:baseline;flex-wrap:wrap"><span class="mono" style="font-size:13px;color:var(--rust);flex:0 0 auto">${esc(e.date)}</span><span class="small" style="font-size:15px;min-width:0">${esc(e.subject)}</span><a class="mono" style="font-size:12px;margin-left:auto" href="https://${REPO}/commit/${esc(e.sha)}">${esc(e.sha)}</a></div>`).join('')}</div>
  <p class="small muted">The full history is in the repository. Nothing is deleted; a retired row keeps its id and a date.</p>
</div></section>` : ''}

<section class="section" aria-labelledby="reg-title"><div class="wrap" style="display:flex;flex-wrap:wrap;gap:36px 64px">
  <div class="stack" style="flex:1 1 420px;min-width:0">
    <p class="eyebrow">The register · v0</p>
    <h2 id="reg-title" class="display h2">A database good enough for prediction starts with one harbor that writes things down.</h2>
    <p class="lede">Global estimates have no interval and no setting. Prediction needs the water, the activity, the temperature and the minutes to rescue, event by event, fatal or not. The register is a 24-column CSV any harbor, club or station can fill in after any event. Two hundred careful rows from one harbor are worth more to a model than a global number with no interval.</p>
    <div class="row"><a class="btn btn--primary" href="#register">Open the register</a><button class="btn btn--ghost" id="dl-register">Download the blank template</button><a class="btn btn--ghost" href="#contribute-register">Run it in your harbor</a></div>
  </div>
  <div class="card stack-sm" style="flex:1 1 320px;min-width:0">
    <p class="eyebrow">Columns</p>
    <p class="small" style="font-size:15px;line-height:1.7"><span class="mono">date · time · place · lat · lon · water · activity · vessel_type · vessel_length_m · persons_involved · age_band · sex · pfd_worn · alcohol_suspected · water_temp_c · air_temp_c · wind_sea_state · minutes_alarm_to_reach · who_responded · outcome · source · confidence · notes</span></p>
    <p class="small muted">Fill what you know. Leave the rest blank. Never guess a field. The field guide is in <a href="data/schema.md">schema.md</a>.</p>
  </div>
</div></section>`;
  }
  function renderLedgerTable() {
    const host = document.getElementById('ledger-table'); if (!host || !DATA.ledger) return;
    const s = ledgerState; const q = s.q.trim().toLowerCase();
    let rows = DATA.ledger.rows.filter((r) => (!s.cat || r.category === s.cat) && (!s.grade || r.grade === s.grade) && (!s.open || /verify|open/.test(r.tags)) &&
      (!q || [r.id, r.figure, r.source, r.scope, r.geography, r.note, r.tags].join(' ').toLowerCase().includes(q)));
    const g = { A: 0, B: 1, C: 2, D: 3 };
    rows = rows.slice().sort((a, b) => s.sort === 'year' ? (b.year || 0) - (a.year || 0) : s.sort === 'grade' ? g[a.grade] - g[b.grade] : s.sort === 'category' ? (CAT_ORDER.indexOf(a.category) - CAT_ORDER.indexOf(b.category)) || a.id.localeCompare(b.id) : a.id.localeCompare(b.id));
    const tr = rows.map((r) => {
      const open = s.openRow === r.id;
      const detail = open ? `<tr class="detail" id="row-${esc(r.id)}"><td colspan="5"><dl class="kv">
        <dt>Figure</dt><dd>${esc(r.figure)}${r.low != null ? ` <span class="mono muted">(low ${fmt(r.low)} · high ${fmt(r.high)} · ${esc(r.unit)})</span>` : ''}</dd>
        <dt>Scope</dt><dd>${esc(r.scope)}</dd>
        <dt>Geography</dt><dd>${esc(r.geography)}</dd>
        <dt>Source</dt><dd>${esc(r.source)}${r.url ? ` · <a href="${esc(r.url)}">${esc(hostOf(r.url))} <span aria-hidden="true">↗</span></a>` : ''}</dd>
        <dt>Grade</dt><dd>${pill(r.grade)} ${esc(gradeName[r.grade])}</dd>
        <dt>Do not add to</dt><dd>${esc(r.do_not_add_to)}</dd>
        ${r.note ? `<dt>Note</dt><dd>${esc(r.note)}</dd>` : ''}
        <dt>Tags</dt><dd class="mono">${esc(r.tags || '—')} · checked ${esc(r.last_checked)}</dd>
      </dl><div class="row" style="margin-top:14px"><a class="btn btn--sm btn--ghost" href="#contribute-correction-${esc(r.id)}">Correct or verify this row</a><button class="btn btn--sm btn--ghost" data-copy-id="${esc(r.id)}">Copy row as JSON</button></div></td></tr>` : '';
      return `<tr><td><button class="rowbtn" data-row="${esc(r.id)}" style="all:unset;cursor:pointer;color:var(--rust);text-decoration:underline;text-underline-offset:3px;font-family:var(--mono);font-size:13px">${esc(r.id)}</button><div style="font-weight:600;margin-top:4px">${esc(r.figure)}</div></td><td class="small">${esc(r.scope.length > 110 ? r.scope.slice(0, 108) + '…' : r.scope)}<div class="mono muted" style="margin-top:4px">${esc(r.geography)}</div></td><td class="mono num" style="white-space:nowrap">${r.year || '—'}</td><td>${pill(r.grade)}${/verify/.test(r.tags) ? ' <span class="pill pill-C">verify</span>' : ''}${/open/.test(r.tags) ? ' <span class="pill pill-D">open</span>' : ''}</td><td class="small">${esc(r.source.length > 90 ? r.source.slice(0, 88) + '…' : r.source)}</td></tr>${detail}`;
    }).join('');
    host.innerHTML = `<p class="mono muted">${rows.length} of ${DATA.ledger.rows.length} rows</p><div class="tscroll"><table class="data"><thead><tr><th>Row</th><th>Scope</th><th>Year</th><th>Grade</th><th>Source</th></tr></thead><tbody>${tr || '<tr><td colspan="5">No rows match.</td></tr>'}</tbody></table></div>`;
    host.querySelectorAll('.rowbtn').forEach((b) => b.addEventListener('click', () => { s.openRow = s.openRow === b.dataset.row ? null : b.dataset.row; renderLedgerTable(); }));
    host.querySelectorAll('[data-copy-id]').forEach((b) => b.addEventListener('click', () => copyText(JSON.stringify(DATA.byId[b.dataset.copyId], null, 1))));
    if (s.openRow) { const el = document.getElementById('row-' + s.openRow); if (el && renderLedgerTable._scroll) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }
    renderLedgerTable._scroll = false;
  }
  function mountLedger(arg) {
    const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
    on('lq', 'input', (e) => { ledgerState.q = e.target.value; ledgerState.openRow = null; renderLedgerTable(); });
    on('lcat', 'change', (e) => { ledgerState.cat = e.target.value; renderLedgerTable(); });
    on('lgrade', 'change', (e) => { ledgerState.grade = e.target.value; renderLedgerTable(); });
    on('lsort', 'change', (e) => { ledgerState.sort = e.target.value; renderLedgerTable(); });
    on('lopen', 'change', (e) => { ledgerState.open = e.target.checked; renderLedgerTable(); });
    on('dl-json', 'click', () => saveFile('ledger.json', JSON.stringify(DATA.ledger, null, 1)));
    on('dl-csv', 'click', () => saveFile('ledger.csv', toCSV(DATA.ledger.rows)));
    on('dl-toll', 'click', () => saveFile('toll.json', JSON.stringify(DATA.toll, null, 1)));
    on('dl-tree', 'click', () => saveFile('tree.json', JSON.stringify(DATA.tree, null, 1)));
    on('dl-register', 'click', () => saveFile('register-template.csv', 'event_id,date,time_local,place,lat,lon,water,activity,vessel_type,vessel_length_m,persons_involved,age_band,sex,pfd_worn,alcohol_suspected,water_temp_c,air_temp_c,wind_sea_state,minutes_alarm_to_reach,who_responded,outcome,source,confidence,notes\n'));
    renderLedgerTable._scroll = !!arg;
    renderLedgerTable();
  }

  /* ---------- THE TREE ---------- */
  function treePath(id) { const p = []; let c = id; while (c) { p.unshift(c); c = DATA.parent[c]; } return p; }
  function treePage(arg) {
    const T = DATA.tree; if (!T) return `<section class="section"><div class="wrap">${noData}</div></section>`;
    const id = T.nodes[arg] ? arg : T.start; const n = T.nodes[id];
    const path = treePath(id);
    const crumbs = path.map((pid, i) => { const pn = T.nodes[pid]; const label = pn.type === 'question' ? (pid === 'now' ? 'Start' : pn.q.replace(/\?$/, '')) : (pn.title || pid); return i < path.length - 1 ? `<button data-go="${esc(pid)}">${esc(label)}</button><span class="sep">›</span>` : `<span style="color:var(--ink)">${esc(label)}</span>`; }).join('');
    let body = '';
    if (n.type === 'question') {
      body = `<div class="stack" style="gap:24px"><h2 class="display h2">${esc(n.q)}</h2><p class="lede">${esc(n.help)}</p>
      <div class="opts">${n.options.map((o) => `<button class="opt ${o.to === 'emergency' ? 'opt--danger' : ''}" data-go="${esc(o.to)}"><span class="t">${esc(o.label)}</span>${o.sub ? `<span class="s">${esc(o.sub)}</span>` : ''}</button>`).join('')}</div></div>`;
    } else if (n.type === 'emergency') {
      body = `<div class="stack" style="gap:24px"><h2 class="display h2" style="color:var(--buoy)">${esc(n.title)}</h2>
      <div class="grid g2">${n.steps.map((s) => `<div class="card stack-sm" style="border-left:4px solid var(--buoy)"><h3 class="h4">${esc(s.h)}</h3><p class="small" style="font-size:16px">${esc(s.p)}</p></div>`).join('')}</div>
      <p class="notice"><span class="eyebrow">Not a rescue service</span><br>${esc(n.note)} This site does not dispatch.</p>
      <div class="row"><button class="btn btn--ghost" data-go="now">Back to the start</button></div></div>`;
    } else {
      const tracks = { signal: 'Signal · a late-boat watch', clock: 'The clock · a cold-water card', register: 'The register · a report a tired harbor will file', drift: 'Drift · a drift sheet' };
      body = `<div class="stack" style="gap:28px">
      <div class="stack-sm"><p class="eyebrow">Branch · ${esc(id)}</p><h2 class="display h2">${esc(n.title)}</h2><p class="lede">${esc(n.summary)}</p></div>
      <div style="display:flex;flex-wrap:wrap;gap:36px 56px">
        <div class="stack-sm" style="flex:1.4 1 420px;min-width:0"><h3 class="h4">Measures, graded</h3>
          <div>${n.measures.map((m) => `<div class="measure">${pill(m.grade)}<div><div>${esc(m.text)}</div>${m.rows && m.rows.length ? `<div class="mono muted" style="margin-top:4px">Rows: ${m.rows.map(ledgerLink).join(', ')}</div>` : ''}</div></div>`).join('')}</div>
          <p class="legend" style="margin-top:8px">${['A', 'B', 'C', 'D'].map((g) => `<span>${pill(g)} ${esc(T.grades[g])}</span>`).join('')}</p>
        </div>
        <div class="stack" style="flex:1 1 300px;min-width:0;gap:16px">
          <div class="card stack-sm"><p class="eyebrow">What to count</p><div class="row" style="gap:6px">${n.count.map((c) => `<span class="pill pill-C" style="text-transform:none;letter-spacing:0;font-size:13px">${esc(c)}</span>`).join('')}</div><p class="small muted">These are register columns. <a href="#register">Open the register</a></p></div>
          <div class="card stack-sm"><p class="eyebrow">Written for</p><p style="font-weight:600">${esc(n.adopter)}</p><p class="small muted">An adopter who could run it this year without a new agency.</p></div>
          ${n.track ? `<div class="card stack-sm" style="border-top:4px solid var(--buoy)"><p class="eyebrow">June pilot track</p><p style="font-weight:600">${esc(tracks[n.track] || n.track)}</p><a class="small" href="#june">The June lab →</a></div>` : ''}
          ${n.unknown ? `<div class="card card--dashed stack-sm"><p class="eyebrow">What nobody has measured</p><p class="small" style="font-size:15px">${esc(n.unknown)}</p></div>` : ''}
        </div>
      </div>
      ${n.rows && n.rows.length ? `<p class="mono muted">Sources: ${n.rows.map(ledgerLink).join(' · ')}</p>` : ''}
      <div class="row"><a class="btn btn--primary" href="#contribute-branch-${esc(id)}">Propose a change to this branch</a><button class="btn btn--ghost" data-go="${esc(DATA.parent[id] || 'now')}">Back</button><button class="btn btn--ghost" data-go="now">Start over</button></div></div>`;
    }
    const map = buildTreeMap(T.start, 0);
    return `
<section class="section" style="padding-bottom:40px"><div class="wrap stack" style="gap:20px">
  <p class="eyebrow">The decision tree · v${esc(T.version)}</p>
  <h1 class="display h2" style="max-width:16em">First the water, then the person, then the measure.</h1>
  <p class="lede" style="max-width:44em">A measure that works in a pool does nothing in a tide, so the tree does not suggest one until it knows the water and the person. Every leaf grades its measures by the evidence behind them, names what to count, and names the kind of adopter who could run the change this year.</p>
</div></section>
<section class="section--tight band" style="min-height:420px"><div class="wrap stack" style="gap:22px">
  <nav class="crumbs" aria-label="Your path">${crumbs}</nav>
  <div id="tree-body">${body}</div>
</div></section>
<section class="section"><div class="wrap stack" style="gap:20px">
  <details class="row disclose"><summary class="h3"><span class="disclose-mark" aria-hidden="true"></span>The whole tree <span class="mono muted" style="font-size:13px">${Object.keys(DATA.tree.nodes).length} nodes · ${Object.values(DATA.tree.nodes).filter((n) => n.type === 'leaf').length} leaves · click any to jump</span></summary><div class="treemap" style="margin-top:18px">${map}</div></details>
  <p class="small muted">Every branch is in <span class="mono">data/tree.json</span>, free to reuse. Missing a water, a person or a measure? <a href="#contribute-branch">Propose a branch.</a> A person reads it; nothing is published until a person merges it.</p>
</div></section>`;
  }
  function buildTreeMap(id, depth) {
    const n = DATA.tree.nodes[id];
    if (n.type === 'question') return `<ul><li><span class="q">${esc(n.q)}</span>${n.options.map((o) => { const c = DATA.tree.nodes[o.to]; return c.type === 'question' ? `<ul><li><button data-go="${esc(o.to)}">${esc(o.label)}</button>${buildTreeMap(o.to, depth + 1).replace(/^<ul><li><span class="q">[^<]*<\/span>/, '').replace(/<\/li><\/ul>$/, '')}</li></ul>` : `<ul><li><button data-go="${esc(o.to)}">${esc(o.label)}</button> <span class="muted small">→ ${esc(c.title || 'Emergency')}</span></li></ul>`; }).join('')}</li></ul>`;
    return '';
  }
  function mountTree() {
    document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { location.hash = 'tree-' + b.dataset.go; }));
  }

  /* ---------- JUNE, WATCH, GLOSSARY: extra.js ---------- */
  const ctx = () => ({ esc, fmt, sectionHead, photo, PHOTOS, SITE, pill, ledgerLink, ledgerIds: () => Object.keys(DATA.byId), rowById: (id) => DATA.byId[id], tasks: () => (DATA.tasks ? DATA.tasks.tasks : []) });

  /* ---------- WISDOM ---------- */
  function wisdomPage() {
    const insights = [
      ['Cultivating Culture', 'A crew’s norms decide what gets said on a bad night.', 'Team charter: how we disagree, written on day one.'],
      ['Respect and Trust Your People', 'Trusted crews speak up early.', 'Roles assigned out loud; the first watch.'],
      ['Bad News is Good News', 'A leak, a bad fix, a tired crew: the first to report wins.', 'Injected failures, timed from the inject to the first report.'],
      ['Develop Court Sense', 'Weather, tide and traffic shift while the plan is being made.', 'A situation board, updated every fifteen minutes.'],
      ['The Whole Job', 'Gear, rest and handoffs, not heroics.', 'A logistics and handoff checklist for every team.'],
      ['Prioritize and Focus', 'Find, reach, recover, in that order.', 'Choosing the addressable slice of the toll.'],
      ['Book It and Ship It', 'Launch, divert or abort, now.', 'Shipping a one-page pilot; timed go/no-go calls.'],
      ['Who’s Got the Monkey?', 'Every task has one owner, said aloud.', 'The debrief ends with an owner and a date on every open item.']
    ];
    return `
<section class="section" style="padding-bottom:40px"><div class="wrap" style="display:flex;flex-wrap:wrap;gap:36px 64px">
  <div class="stack" style="flex:1.2 1 460px;min-width:0;gap:24px">
    <p class="eyebrow">Applied Wisdom · co-design partner</p>
    <h1 class="display h2">We are scaling capability faster than wisdom. The lab is a place to practise both.</h1>
    <p class="lede">The proposed learning design starts from a simple premise: analysis is getting cheap. Deciding well, together, with incomplete information and a clock running, is not. <a href="https://appliedwisdomfornonprofits.org">Applied Wisdom for Nonprofits</a> carries the leadership lessons Jim Morgan drew from nearly three decades leading Applied Materials. The Lab is co-designed with them: their insights are how every team works, the Situation Solver is how every drill is debriefed, and the wisdom ledger is how what is learned gets shared.</p>
    <div class="charter-practice"><p><strong>Central test:</strong> wisdom is applied when understanding responsibly informs a real decision. That may change, reaffirm or preserve a course. The Lab records the ladder: understanding → decision judgment → authorized action → observed outcome → independently reviewed benefit.</p></div>
  </div>
  ${photo(PHOTOS.kayak, 'Whaleback Light at dusk, seen over the bow of a kayak on calm water', 'Whaleback Light from the water · Photo: Ethan Hawkes', 'flex:1 1 320px;min-height:360px')}
</div></section>

<section class="section dark" aria-labelledby="ins-title"><div class="wrap stack" style="gap:28px">
  ${sectionHead('The eight insights', '<span id="ins-title">Their eight insights are the proposed syllabus for a supervised learning exercise.</span>', 'Each insight could be practised twice: once on the real problem, sizing the toll and drafting a pilot, and once in a proposed supervised exercise. The mapping is a draft for Applied Wisdom to correct.') }
  <div>${insights.map((x, i) => `<div class="insight"><span class="num">0${i + 1}</span><div class="stack-sm" style="gap:4px"><span class="t">${esc(x[0])}</span><span class="p"><b style="color:var(--paper)">At sea:</b> ${esc(x[1])}</span><span class="p"><b style="color:var(--paper)">In the lab:</b> ${esc(x[2])}</span></div></div>`).join('')}</div>
  <p class="small" style="color:var(--mist)">Insight names from <i>Applied Wisdom for the Nonprofit Sector</i> (Jim Morgan), used with Applied Wisdom’s agreement as a co-design partner.</p>
</div></section>

<section class="section" aria-labelledby="solver-title"><div class="wrap stack" style="gap:28px">
  ${sectionHead('The Situation Solver', '<span id="solver-title">Every drill becomes a case. Every case can make the Solver wiser.</span>', 'Applied Wisdom’s Situation Solver takes a situation a leader is in and offers lenses from the insights. In the lab it runs the Day-two debrief.')}
  <div class="grid g3">
    <div class="card stack-sm"><p class="eyebrow">In the debrief</p><p class="small" style="font-size:16px">Each team names the situation closest to what went wrong (“we were stretched too thin”, “teamwork broke under the clock”) and works through the Solver’s lenses before writing the logbook.</p></div>
    <div class="card stack-sm"><p class="eyebrow">As a testbed</p><p class="small" style="font-size:16px">A high-stakes, time-boxed, fully documented setting for the Solver’s open-source, agentic version. Debriefs reach the Solver only with students’ consent and with personal data removed.</p></div>
    <div class="card stack-sm"><p class="eyebrow">The loop</p><p class="small" style="font-size:16px">A goal worth pursuing → better decisions → agency → a learning loop. Here the goal is literal: fewer lives lost at sea.</p></div>
  </div>
</div></section>

<section class="section band" aria-labelledby="wl-title"><div class="wrap stack" style="gap:28px">
  ${sectionHead('The wisdom ledger', '<span id="wl-title">Two ledgers, side by side.</span>', 'The data ledger keeps what is known. The wisdom ledger keeps what was learned: one line per pilot, who learned it, what changed, and which insight it belongs to. Both start at zero and both are public.')}
  <div class="scoreboard"><div><span class="n">0</span><b>Decisions changed</b><span class="small muted">The first observable sign of applied wisdom</span></div><div><span class="n">0</span><b>Lessons recorded</b><span class="small muted">One per pilot, after the forecast runs</span></div><div><span class="n">0</span><b>Shared back</b><span class="small muted">Lessons Applied Wisdom carries to its community</span></div><div><span class="n">8</span><b>Insights mapped</b><span class="small muted">Proposed syllabus lenses, not evidence of use</span></div></div>
  <div class="card stack-sm card--dashed"><p class="eyebrow">A wisdom row, when there is one</p><p class="mono small">pilot · insight · what we expected · what happened · what we would do differently · who owns the next try · date</p><p class="small muted">The first rows are written in June 2027. Until then this is a promise, not a record.</p></div>
  <div class="row"><a class="btn" href="#june">The June lab</a><a class="btn btn--ghost" href="https://appliedwisdomfornonprofits.org">Applied Wisdom for Nonprofits</a></div>
</div></section>`;
  }

  /* ---------- CONTRIBUTE ---------- */
  const TYPES = {
    row: { label: 'A ledger row', blurb: 'A figure with its source, scope, year and the rule for what it must not be added to.',
      fields: [['figure', 'The figure, as the source prints it', 'text', true], ['low', 'Low bound (number)', 'number', false], ['high', 'High bound (number)', 'number', false], ['unit', 'Unit', 'text', true], ['year', 'Year the figure describes', 'number', true], ['scope', 'What is counted and what is left out', 'textarea', true], ['geography', 'Geography', 'text', true], ['source', 'Source (who said it)', 'text', true], ['url', 'URL', 'url', false], ['grade', 'Your proposed grade', 'select:A,B,C,D', true], ['do_not_add_to', 'What it must not be added to, and why', 'textarea', true], ['note', 'Anything a reader needs before citing it', 'textarea', false]] },
    correction: { label: 'A correction or verification', blurb: 'Fix a row, or confirm a grade-C row against its primary source so it can be upgraded.',
      fields: [['row_id', 'Row id', 'text', true], ['what_is_wrong', 'What is wrong, or what you verified', 'textarea', true], ['correct_value', 'The correct figure, if any', 'text', false], ['source', 'Primary source you checked', 'text', true], ['url', 'URL', 'url', false], ['page_or_table', 'Page, table or row in that source', 'text', false]] },
    branch: { label: 'A branch of the tree', blurb: 'A missing water, person or measure, with the evidence grade you would give it.',
      fields: [['node_id', 'Nearest existing node (leave blank if new)', 'text', false], ['the_break', 'The gap it names', 'textarea', true], ['the_change', 'The change it asks for', 'textarea', true], ['grade', 'Evidence grade you propose', 'select:A,B,C,D', true], ['source', 'Source for the evidence', 'text', false], ['url', 'URL', 'url', false], ['adopter', 'The kind of adopter who could take it up this year', 'text', true], ['how_it_fails', 'How you would know it failed', 'textarea', true]] },
    pilot: { label: 'A pilot, or an adopter', blurb: 'From someone who works the water: a sentence your service still uses, a pilot you would adopt, or an adopter you know personally.',
      fields: [['your_role', 'Your role (harbormaster, crew, fisher, lifeguard…)', 'text', true], ['water', 'The water you work', 'text', true], ['the_pilot', 'The change, in one page or less', 'textarea', true], ['adopter', 'Who would run it (a role, not a name, unless it is you)', 'text', true], ['how_it_fails', 'How you would know it failed', 'textarea', true]] },
    register: { label: 'Run the register in your harbor', blurb: 'One season of careful rows from one place. We send the template, you send the rows, we publish the method and never a name.',
      fields: [['organisation', 'Organisation', 'text', true], ['place', 'The harbor, club or station', 'text', true], ['season', 'Season you could run it', 'text', true], ['events_per_year', 'Roughly how many events a year (any outcome)', 'text', false], ['data_you_hold', 'Data you already hold', 'textarea', false]] },
    offer: { label: 'An offer', blurb: 'A boat that already runs the crossing, a drone with an operator, a classroom day, a session you could teach, or a season keeping the watch. Money is different: donations go directly to the Wood Island Life Saving Station Association, not to the lab.',
      fields: [['what', 'What you can offer', 'textarea', true], ['when', 'When', 'text', false], ['conditions', 'Any conditions', 'textarea', false]] }
  };
  function contributePage(arg) {
    const parts = (arg || '').split('-'); let type = parts[0] in TYPES ? parts[0] : 'row'; const ref = parts.slice(1).join('-');
    const verify = DATA.ledger ? DATA.ledger.rows.filter((r) => /verify/.test(r.tags)) : [];
    const open = DATA.ledger ? DATA.ledger.rows.filter((r) => /open/.test(r.tags)) : [];
    return `
<section class="section" style="padding-bottom:36px"><div class="wrap stack" style="gap:22px">
  <p class="eyebrow">Contribute</p>
  <h1 class="display h2" style="max-width:16em">A person writes it. A person reads it. Nothing is published until a person merges it.</h1>
  <p class="lede" style="max-width:44em">Everything on this site is open: the ledger, the toll, the tree, the register. You can read all of it without an account. If you want to change it, pick what you are bringing. Your submission becomes a file you send us; your email is never shown.</p>
  <div class="row" id="type-tabs">${Object.entries(TYPES).map(([k, t]) => `<a class="btn btn--sm ${k === type ? '' : 'btn--ghost'}" href="#contribute-${k}">${t.label}</a>`).join('')}</div>
</div></section>

<section class="section--tight band"><div class="wrap" style="display:flex;flex-wrap:wrap;gap:36px 56px">
  <form id="cform" class="form-grid" style="flex:1.2 1 460px;min-width:0" novalidate>
    <div class="stack-sm"><h2 class="h3">${esc(TYPES[type].label)}</h2><p class="small muted" style="font-size:15px">${esc(TYPES[type].blurb)}</p></div>
    ${TYPES[type].fields.map(([k, label, kind, req]) => {
      const pre = (type === 'correction' && k === 'row_id') || (type === 'branch' && k === 'node_id') ? esc(ref) : '';
      const id = 'f-' + k;
      let input;
      if (kind === 'textarea') input = `<textarea id="${id}" name="${k}" ${req ? 'required' : ''}></textarea>`;
      else if (kind.startsWith('select:')) input = `<select id="${id}" name="${k}" ${req ? 'required' : ''}><option value="">—</option>${kind.slice(7).split(',').map((o) => `<option>${o}</option>`).join('')}</select>`;
      else input = `<input id="${id}" name="${k}" type="${kind}" value="${pre}" ${req ? 'required' : ''}>`;
      const wide = kind === 'textarea' || ['figure', 'row_id', 'adopter', 'title'].includes(k);
      return `<div class="field${wide ? ' wide' : ''}"><label for="${id}">${esc(label)}${req ? ' *' : ''}</label>${input}<span class="errmsg" hidden>Required</span></div>`;
    }).join('')}
    <div class="field"><label for="f-name">Your name *</label><input id="f-name" name="name" type="text" required><span class="errmsg" hidden>Required</span></div>
    <div class="field"><label for="f-email">Email (optional, never shown)</label><input id="f-email" name="email" type="email"></div>
    <div class="field" style="position:absolute;left:-9999px" aria-hidden="true"><label for="f-leave">Leave blank</label><input id="f-leave" name="leave_blank" type="text" tabindex="-1" autocomplete="off"></div>
    <div class="row"><button class="btn btn--primary" type="submit">Prepare it</button><button class="btn btn--ghost" type="button" id="f-clear">Clear</button></div>
    <p class="small muted">Drafts stay in this browser until you clear them.</p>
  </form>
  <div class="stack" style="flex:1 1 320px;min-width:0;gap:16px">
    <div class="card stack-sm" id="out-box"><p class="eyebrow">Your submission</p><p class="small muted">Fill in the form and press “Prepare it”. You will get a file to copy or save, and the address to send it to.</p></div>
    <div id="fallback-box" hidden></div>
    <div class="card stack-sm"><p class="eyebrow">How a change gets in</p><ol class="small" style="font-size:15px;padding-left:20px;display:flex;flex-direction:column;gap:6px"><li>You send the file to <span class="mono" id="mail-addr">${MAIL}</span> <button class="btn btn--sm btn--ghost" type="button" id="copy-mail" style="min-height:32px;padding:0 10px">copy</button>, or open a pull request at <span class="mono">${esc(REPO)}</span>.</li><li>A person reads it and checks the source.</li><li>It is merged with your name in the row’s note, or returned with a reason.</li><li>Every merge bumps the ledger version. Nothing is deleted; rows are retired with a date.</li></ol></div>
    <div class="card stack-sm" style="border-left:4px solid var(--buoy)"><p class="eyebrow">Giving</p><p class="small" style="font-size:15px">The lab holds no money. Donations go directly to the <a href="${WILSSA}">Wood Island Life Saving Station Association</a>, the association that restored the station and keeps it standing; its own site has the giving page. Robots, boats and classroom days are gifts in kind: use the form.</p><div class="row"><a class="btn btn--sm" href="${WILSSA}">Give to the station</a></div></div>
    <div class="card stack-sm card--dashed"><p class="eyebrow">What makes a good row</p><ul class="small" style="font-size:15px;padding-left:20px;display:flex;flex-direction:column;gap:4px"><li>The figure exactly as the source prints it, interval included.</li><li>The year it describes, not the year it was published.</li><li>What it leaves out.</li><li>The rule: what it must never be added to, and why.</li></ul></div>
  </div>
</div></section>

<section class="section" aria-labelledby="queue-title"><div class="wrap stack" style="gap:24px">
  ${sectionHead('The open queue', '<span id="queue-title">Tasks anyone can pick up today.</span>', 'Grade-C rows waiting for a primary check, and lab judgments waiting for a source that retires them. Short on time? <a href="#lend">Lend your AI assistant an hour</a> and let it do the reading.')}
  <div class="grid g2">
    <div class="stack-sm"><h3 class="h4">Verify against the primary source · ${verify.length}</h3>${verify.map((r) => `<div class="rec"><span class="k">${esc(r.id)}</span><span class="small" style="font-size:15px">${esc(r.figure)} · ${esc(r.source)}</span><a class="small" href="#contribute-correction-${esc(r.id)}">Claim this check →</a></div>`).join('') || '<p class="small muted">None open.</p>'}</div>
    <div class="stack-sm"><h3 class="h4">Find the source that retires a judgment · ${open.length}</h3>${open.map((r) => `<div class="rec"><span class="k">${esc(r.id)}</span><span class="small" style="font-size:15px">${esc(r.note || r.figure)}</span><a class="small" href="#contribute-row">Bring the row →</a></div>`).join('') || '<p class="small muted">None open.</p>'}</div>
  </div>
</div></section>`;
  }
  function mountContribute(arg) {
    const parts = (arg || '').split('-'); const type = parts[0] in TYPES ? parts[0] : 'row';
    const form = document.getElementById('cform'); if (!form) return;
    const key = 'lsl-draft-' + type;
    const draft = store(key); if (draft) Object.entries(draft).forEach(([k, v]) => { const el = form.elements[k]; if (el && !el.value) el.value = v; });
    form.addEventListener('input', () => { const d = {}; [...form.elements].forEach((el) => { if (el.name && el.name !== 'leave_blank') d[el.name] = el.value; }); store(key, d); });
    document.getElementById('f-clear').addEventListener('click', () => { form.reset(); store(key, {}); });
    document.getElementById('copy-mail').addEventListener('click', () => copyText(MAIL));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (form.elements.leave_blank.value) return;
      let ok = true;
      [...form.querySelectorAll('.field')].forEach((f) => { const el = f.querySelector('input,textarea,select'); const err = f.querySelector('.errmsg'); const bad = el && el.required && !el.value.trim(); f.classList.toggle('err', !!bad); if (err) err.hidden = !bad; if (bad) ok = false; });
      if (!ok) { toast('Fill in the required fields'); form.querySelector('.field.err input, .field.err textarea, .field.err select').focus(); return; }
      const obj = { schema: 'lifesavinglab.submission.v1', type, submitted: new Date().toISOString(), site_version: DATA.ledger ? DATA.ledger.version : null };
      [...form.elements].forEach((el) => { if (el.name && el.name !== 'leave_blank' && el.value.trim()) obj[el.name] = el.type === 'number' ? Number(el.value) : el.value.trim(); });
      const json = JSON.stringify(obj, null, 1);
      const fname = `lsl-${type}-${(obj.row_id || obj.node_id || obj.figure || obj.what || 'submission').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.json`;
      const out = document.getElementById('out-box');
      out.innerHTML = `<p class="eyebrow">Your submission · ready</p><pre class="json" id="out-json">${esc(json)}</pre><div class="row"><button class="btn btn--sm" id="out-copy">Copy JSON</button><button class="btn btn--sm" id="out-save">Save ${esc(fname)}</button><a class="btn btn--sm btn--ghost" href="mailto:${MAIL}?subject=${encodeURIComponent('[Life-Saving Lab] ' + type + ' from ' + (obj.name || ''))}&body=${encodeURIComponent(json)}">Open in email</a></div><p class="small muted">Send it to <span class="mono">${MAIL}</span>. The email button may do nothing in some views; copying works everywhere.</p>`;
      document.getElementById('out-copy').addEventListener('click', () => copyText(json));
      document.getElementById('out-save').addEventListener('click', () => saveFile(fname, json));
      out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* ---------- router ---------- */
  const routes = {
    home: { html: home, title: 'The Life-Saving Lab' },
    toll: { html: tollPage, title: 'The toll · The Life-Saving Lab' },
    ledger: { html: ledgerPage, mount: mountLedger, title: 'The ledger · The Life-Saving Lab' },
    tree: { html: treePage, mount: mountTree, title: 'The tree · The Life-Saving Lab' },
    june: { html: () => window.Extra.junePage(ctx()), title: 'The June lab · The Life-Saving Lab' },
    watch: { html: () => window.Extra.watchPage(ctx()), mount: () => window.Extra.mountWatch(), title: 'The watch · The Life-Saving Lab' },
    glossary: { html: () => window.Extra.glossaryPage(ctx()), title: 'Glossary · The Life-Saving Lab' },
    gaps: { html: () => window.Extra.gapsPage(ctx()), title: 'The gaps · The Life-Saving Lab' },
    register: { html: () => window.Register.page(ctx()), mount: () => window.Register.mount({ toast, copyText, saveFile }), title: 'The register · The Life-Saving Lab' },
    pilots: { html: () => window.Pilots.page(ctx()), mount: (arg) => window.Pilots.mount({ toast, copyText, saveFile }, arg), title: 'Pilots · The Life-Saving Lab' },
    harbor: { html: () => window.Harbor.page(ctx()), title: 'This water · The Life-Saving Lab' },
    briefs: { html: () => window.Briefs.page(ctx()), mount: (arg) => window.Briefs.mount(arg), title: 'Briefs · The Life-Saving Lab' },
    lend: { html: () => window.Lend.page(ctx()), mount: () => window.Lend.mount(ctx(), { toast, copyText, saveFile }), title: 'Lend your agent · The Life-Saving Lab' },
    wisdom: { html: wisdomPage, title: 'Applied Wisdom · The Life-Saving Lab' },
    about: { html: aboutPage, title: 'About the Lab · The Life-Saving Lab' },
    contribute: { html: contributePage, mount: mountContribute, title: 'Contribute · The Life-Saving Lab' }
  };
  /* In-page targets are not router routes. Keep the current rendered journey intact while scrolling/focusing. */
  const routeNames = () => Object.keys(routes);
  function isRouteHash(id) { return routeNames().some((r) => id === r || id.startsWith(r + '-')); }
  const skipLink = document.querySelector('.skip');
  if (skipLink) skipLink.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    const main = document.getElementById('app');
    if (main) { main.focus({ preventScroll: true }); main.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]'); if (!link || link === skipLink) return;
    const id = decodeURIComponent(link.getAttribute('href').slice(1));
    if (!id || id === 'app' || isRouteHash(id)) return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  function parseHash() {
    const h = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (!h || h === 'home') return { route: 'home', arg: '' };
    for (const r of Object.keys(routes)) { if (h === r) return { route: r, arg: '' }; if (h.startsWith(r + '-')) return { route: r, arg: h.slice(r.length + 1) }; }
    return { route: 'home', arg: '' };
  }
  let lastRoute = null;
  /* A new page starts at its top at once; the smooth scroll in the stylesheet is for links within a page. */
  function jumpTop() {
    const root = document.documentElement; const prev = root.style.scrollBehavior; root.style.scrollBehavior = 'auto';
    void getComputedStyle(root).scrollBehavior;
    const jump = () => { try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch { window.scrollTo(0, 0); } };
    jump(); requestAnimationFrame(() => { jump(); root.style.scrollBehavior = prev; });
  }
  /* The phone menu: a disclosure that closes on any route change or Escape. */
  const menuBtn = document.getElementById('menu-btn'), navlinks = document.getElementById('navlinks');
  function setMenu(open) { if (!menuBtn || !navlinks) return; navlinks.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', String(open)); }
  if (menuBtn) {
    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); } });
  }
  function fillColophon() {
    const set = (k, v) => document.querySelectorAll(`[data-foot="${k}"]`).forEach((el) => { el.textContent = v; });
    if (DATA.ledger) { set('version', 'v' + DATA.ledger.version); set('rows', fmt(DATA.ledger.rows.length)); if (DATA.ledger.last_checked) set('checked', fmtDate(DATA.ledger.last_checked)); }
    if (DATA.tasks) set('open', String(DATA.tasks.tasks.filter((t) => t.status !== 'done' && !(t.claimed_until && Date.parse(t.claimed_until) > Date.now())).length));
    if (DATA.receipts) set('receipts', String(DATA.receipts.receipts.length));
  }
  function fmtDate(iso) { const d = new Date(iso + 'T00:00:00Z'); return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
  function render() {
    const { route, arg } = parseHash();
    if (route === 'about') { location.replace('/about/'); return; }
    setMenu(false);
    document.querySelectorAll('#navlinks a').forEach((a) => { const on = a.dataset.route === route; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    window.Extra.stopCounter();
    app.innerHTML = routes[route].html(arg);
    if (routes[route].mount) routes[route].mount(arg);
    window.Extra.startCounter(DATA.toll);
    document.title = routes[route].title;
    if (route !== lastRoute || route !== 'tree') {
      const keep = ((route === 'ledger' || route === 'pilots') && arg) || (route === 'briefs' && lastRoute === 'briefs');
      if (!keep) jumpTop();
    }
    if (route === 'tree' && lastRoute === 'tree') { const b = document.getElementById('tree-body'); if (b) { const top = b.getBoundingClientRect().top + window.scrollY - 140; if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' }); } }
    if (lastRoute !== null && route !== lastRoute) { try { app.focus({ preventScroll: true }); } catch { /* older browsers */ } }
    lastRoute = route;
  }
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  /* The page waits for the data rather than racing it: a slow connection keeps the loading line, a failed read is tried
     once more, and only a second failure shows the not-loaded notice. A read that stalls past 45 s still gets the page,
     and it re-renders if the data lands later. */
  let ready = false;
  const show = () => { ready = true; fillColophon(); render(); };
  window.addEventListener('hashchange', () => { if (ready) render(); });
  (async () => {
    const slow = setTimeout(() => { const p = app.querySelector('.loading'); if (p) p.textContent = 'Reading the ledger · slow connection, still loading'; }, 6000);
    const stalled = setTimeout(show, 45000);
    for (let tries = 0; tries < 2; tries++) {
      try { await load(); break; } catch (e) { console.warn('data load failed', e); }
    }
    clearTimeout(slow); clearTimeout(stalled);
    show();
  })();
})();
