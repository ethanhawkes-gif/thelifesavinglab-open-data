/* The Life-Saving Lab · site app. Routes live in the hash as one plain token: #toll, #ledger-<row>, #tree-<node>, #contribute-<type>. */
(function () {
  const { fmt, esc, roundK } = window.Charts;
  const app = document.getElementById('app');
  const DATA = { ledger: null, toll: null, tree: null, byId: {}, parent: {}, tasks: null, watch: null, changelog: null };
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
  const ledgerLink = (id) => { const r = DATA.byId[id]; return r ? `<a href="#ledger-${esc(id)}" title="${esc(r.source)}">${esc(id)}</a>` : esc(id); };

  /* ---------- data ---------- */
  async function load() {
    const get = (p) => fetch(p).then((r) => { if (!r.ok) throw new Error(p); return r.json(); });
    const soft = (p) => get(p).catch(() => null);
    const [ledger, toll, tree, tasks, watch, changelog] = await Promise.all([get('data/ledger.json'), get('data/toll.json'), get('data/tree.json'), soft('data/tasks.json'), soft('data/watch-feed.json'), soft('data/changelog.json')]);
    DATA.ledger = ledger; DATA.toll = toll; DATA.tree = tree; DATA.tasks = tasks; DATA.watch = watch; DATA.changelog = changelog;
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
    const floor = toll ? fmt(roundK(toll.floor)) : '260,000', ceil = toll ? fmt(roundK(toll.ceiling)) : '416,000';
    return `
<section class="hero" aria-labelledby="hero-title">
  <div class="hero-text"><div>
    <p class="eyebrow">The Life-Saving Lab · Portsmouth Harbor</p>
    <h1 id="hero-title" class="display h1">This harbor’s past was lifesaving. <i style="color:var(--brass)">So is its future.</i></h1>
    <p class="lede">An open lab on drowning. We keep a sourced count of what is known and publish it as a range, not a false point. Each June, students and the people who work this water write one-page changes a real adopter could run that season. We publish the ones that fail.</p>
    <div class="row"><a class="btn btn--primary" href="#contribute">Contribute <span aria-hidden="true">→</span></a><a class="btn btn--ghost" href="#toll">See the toll</a></div>
    <div class="row mono" style="gap:8px 28px;padding-top:22px;border-top:1px solid var(--navy-line);color:var(--mist)"><span><b style="color:var(--paper);font-weight:500">${rows}</b> sourced ledger rows</span><span><b style="color:var(--paper);font-weight:500">17</b> branches of the tree</span><span><b style="color:var(--paper);font-weight:500">24</b> student seats</span></div>
  </div></div>
  <div class="hero-photo">
    <img src="${PHOTOS.hero}" alt="Wood Island Life-Saving Station in Kittery, Maine, seen down its boardwalk: white shingles, a red roof and lookout tower, a surfboat on its launching carriage, and Whaleback Light on the horizon">
    <p class="credit">Wood Island Life-Saving Station · Photo: Ethan Hawkes</p>
    <div class="stamp">
      <div class="row mono" style="gap:10px;align-items:center;color:var(--muted)"><span class="pill pill-A">Range</span><span>A YEAR, WORLDWIDE</span></div>
      <p class="big">~${floor}–${ceil}</p>
      <p style="font-size:16px;font-weight:600;line-height:1.35">people die in the water, from what is documented.</p>
      <p class="small muted">Since you opened this page: <b data-live="since" style="color:var(--ink)">—</b>, estimated. The true number could sit above the range. Closing the gap is the lab’s work.</p>
      <a href="#toll" style="font-size:14px;font-weight:600">How the range is built <span aria-hidden="true">→</span></a>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="how-title"><div class="wrap stack" style="gap:44px">
  ${sectionHead('No. 1 · How the lab works', '<span id="how-title">Count what is known. Change one thing. Publish what failed.</span>', 'One loop, run in public. Every step leaves something on the record that anyone can check, correct or reuse.')}
  <ol class="steps">
    <li><span class="n">01</span><h3 class="h3">Count</h3><p class="small" style="font-size:16px">Keep a sourced ledger. Put disagreeing estimates side by side; never add across sources.</p><a class="mono" href="#ledger">Result: the ledger</a></li>
    <li><span class="n">02</span><h3 class="h3">Name the water</h3><p class="small" style="font-size:16px">The tree asks which water first, then who is at risk, then which measure fits. A pool fence does nothing in a river.</p><a class="mono" href="#tree">Result: the tree</a></li>
    <li><span class="n">03</span><h3 class="h3">Write a pilot</h3><p class="small" style="font-size:16px">A pilot: one page, one change, small enough to run this season, with a written test for how it would fail.</p><a class="mono" href="#june">Result: a pilot page</a></li>
    <li><span class="n">04</span><h3 class="h3">Hand it over</h3><p class="small" style="font-size:16px">To an adopter: the harbormaster, co-op or crew that would actually run it, without a new agency.</p><a class="mono" href="#june">Result: an adopter</a></li>
    <li><span class="n">05</span><h3 class="h3">Publish the result</h3><p class="small" style="font-size:16px">Taken up, failed or still open. What we learn corrects the ledger and the loop starts again.</p><a class="mono" href="#wisdom">Result: the record</a></li>
  </ol>
</div></section>

<section class="section band" aria-labelledby="toll-title"><div class="wrap stack" style="gap:36px">
  ${sectionHead('No. 2 · The toll', '<span id="toll-title">Between ~${floor} and ~${ceil} a year. Nobody knows where in that range the truth sits.</span>', 'Nobody counts every drowning; the global figures are estimates. We add up only what has a source, show the result as a lowest and a highest documented total, and draw the unknown as unknown.')}
  ${toll ? window.Charts.tollBar(toll, { compact: true }) : noData}
  ${window.Extra.counterBlock(toll)}
  <div class="row"><a class="btn" href="#toll">Open the toll, component by component</a><a class="btn btn--ghost" href="#ledger">The ledger behind it</a></div>
</div></section>

<section class="section" aria-labelledby="tree-title"><div class="wrap stack" style="gap:36px">
  ${sectionHead('No. 3 · The tree', '<span id="tree-title">Which water? That decides the measure.</span>', 'The decision tree is a short set of questions. It asks which water first, then who is at risk, and only then suggests a measure, graded by the evidence behind it. Every answer names what to count and who could run the change.')}
  <div class="opts">
    ${['sea|Open sea and coast|Surf, rocks, cold water', 'harbor|Harbor, river, estuary|Currents, working boats, bridges', 'lake|Lake, pond, reservoir|Still water, ice', 'pool|Pool and spa|Home or public', 'home-under5|The home|Bath, bucket, well, tank', 'flood|Flood water|River flood, flash flood'].map((s) => { const [id, t, sub] = s.split('|'); return `<a class="opt" href="#tree-${id}"><span class="t">${t}</span><span class="s">${sub}</span></a>`; }).join('')}
  </div>
  <p class="small muted">Someone in the water right now? <a href="#tree-emergency">Start here.</a></p>
</div></section>

<section class="section dark" aria-labelledby="june-title"><div class="wrap" style="display:flex;flex-wrap:wrap;gap:44px 64px">
  <div class="stack" style="flex:1.2 1 480px;min-width:0;gap:28px">
    <p class="eyebrow">No. 4 · June 2027 · dates proposed</p>
    <h2 id="june-title" class="display h2">24 students. Six teams. Two days on Wood Island.</h2>
    <p class="lede">The people who work this harbor sit beside the teams. Day one, each team sizes a piece of the problem and defends a one-page change in front of them. Day two, a staged rescue with a clock running tests how the team decides under pressure. Co-hosted with Applied Wisdom for Nonprofits.</p>
    <div class="row"><a class="btn btn--primary" href="#june">The June lab</a><a class="btn btn--ghost" href="#wisdom">The curriculum, with Applied Wisdom</a></div>
  </div>
  ${photo(PHOTOS.rocks, 'Wood Island Life-Saving Station across the rocky shore at low tide, with its flag mast and the harbor behind', 'Wood Island at low tide · Photo: Ethan Hawkes', 'flex:1 1 360px;min-height:320px')}
</div></section>

<section class="section" aria-labelledby="front-home"><div class="wrap stack" style="gap:28px">
  ${sectionHead('No. 5 · The frontier', '<span id="front-home">What AI and robots can do for a rescue, tested in the open.</span>', 'Drift models fed by live currents. A drone that has to find a float in chop. A sea robot carrying flotation. Agents that read a harbor’s radio log. Every tool faces the same test, and every miss is published.')}
  ${window.Extra.frontierSection(false)}
  <div class="row"><a class="btn" href="#june">What the first cohort will try</a></div>
</div></section>

<section class="section band" aria-labelledby="sel-home"><div class="wrap stack" style="gap:24px">${window.Extra.selectionSection(false)}</div></section>

<section class="section" aria-labelledby="gaps-home"><div class="wrap stack" style="gap:24px">
  ${sectionHead('No. 6 · The gaps', '<span id="gaps-home">Most of what a good dataset needs does not exist. That is the work list.</span>', 'A coverage matrix shows, cell by cell, what the world knows about drowning. Each empty cell has a first step one person could take this season.')}
  <div class="row"><a class="btn btn--primary" href="#gaps">See the gaps</a><a class="btn btn--ghost" href="#toll">The toll</a></div>
</div></section>

<section class="section" aria-labelledby="record-title"><div class="wrap stack" style="gap:36px">
  ${sectionHead('No. 7 · The record', '<span id="record-title">What we report, starting at zero.</span>', 'Funders and partners get numbers anyone can check. We do not report lives saved that nobody counted.')}
  <div class="scoreboard">
    <div><span class="n">0</span><b>Pilots written</b><span class="small muted">One page each, with a test for failure</span></div>
    <div><span class="n">0</span><b>Taken up by an adopter</b><span class="small muted">A real harbor, crew or co-op runs it</span></div>
    <div><span class="n">0</span><b>Failed, and published</b><span class="small muted">Failures stay on the record</span></div>
    <div><span class="n">${DATA.tasks ? DATA.tasks.tasks.filter((t) => t.status !== 'done' && !(t.claimed_until && Date.parse(t.claimed_until) > Date.now())).length : '—'}</span><b>Tasks open on the board</b><span class="small muted">Each sized for one lent hour</span></div>
    <div><span class="n">${DATA.watch && DATA.watch.counts ? fmt(DATA.watch.counts.reported || 0) : '—'}</span><b>Reports waiting to be read</b><span class="small muted">In the watch, hourly, since 15 Oct 2026</span></div>
    <div><span class="n" style="color:var(--rust)">${rows}</span><b>Ledger rows</b><span class="small muted">Each with a source, a year and a rule for what it must not be added to</span></div>
  </div>
  <p class="mono muted">Pilot counts start with the June 2027 lab; the board and the watch are live now. Last checked 15 Oct 2026. <a href="#pilots">What a pilot is, and how one is scored →</a></p>
</div></section>

<section class="section band" aria-labelledby="join-title"><div class="wrap stack" style="gap:36px">
  ${sectionHead('No. 8 · Where you fit', '<span id="join-title">Everything here can be read without an account.</span>', 'A person reads every submission. Nothing is published until a person merges it.')}
  <div class="grid g4">
    <div class="card stack-sm" style="border-top:4px solid var(--buoy)"><h3 class="h3">Students</h3><p class="small" style="font-size:16px">24 seats. Own a branch of the tree, name an adopter, and defend a pilot.</p><a class="btn btn--primary btn--sm" style="margin-top:auto" href="${SITE}/cohort">Join the cohort</a></div>
    <div class="card stack-sm" style="border-top:4px solid var(--ink)"><h3 class="h3">Experts and responders</h3><p class="small" style="font-size:16px">Harbormasters, crews, fishers, lifeguards: bring the sentence your service still uses, or a pilot you would adopt.</p><a class="btn btn--ghost btn--sm" style="margin-top:auto" href="#contribute-pilot">Bring expertise</a></div>
    <div class="card stack-sm" style="border-top:4px solid var(--ink)"><h3 class="h3">Data contributors</h3><p class="small" style="font-size:16px">Add a ledger row, verify a secondary one, or run the incident register in your harbor.</p><a class="btn btn--ghost btn--sm" style="margin-top:auto" href="#contribute-row">Open the queue</a></div>
    <div class="card stack-sm" style="border-top:4px solid var(--ink)"><h3 class="h3">Funders and partners</h3><p class="small" style="font-size:16px">Read the method and the ledger first. We report pilots written, adopted and failed. The lab holds no money: donations go directly to the <a href="${WILSSA}">Wood Island Life Saving Station Association</a>, which restored the station. <a href="#briefs-funder-one-pager">The one-page brief.</a></p><div class="row" style="margin-top:auto;gap:8px"><a class="btn btn--sm" href="${WILSSA}">Give to the station</a><a class="btn btn--ghost btn--sm" href="#contribute-offer">Write to us</a></div></div>
  </div>
  <div class="card--dark" style="padding:clamp(22px,3vw,36px);border-radius:2px;display:flex;flex-wrap:wrap;gap:18px 40px;align-items:center;justify-content:space-between">
    <div class="stack-sm" style="flex:1 1 420px;min-width:0"><p class="eyebrow">Spare AI usage this month?</p><h3 class="h3" style="color:var(--paper)">Lend your assistant an hour.</h3><p class="small" style="font-size:16px;color:var(--mist);max-width:40em">One click opens a small, sourced task in ChatGPT, Claude, Grok or Perplexity (paste it into Gemini). Hand back what it found; a person checks it; you get a receipt that says what changed.</p></div>
    <a class="btn btn--primary" href="#lend">See the board</a>
  </div>
</div></section>`;
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
    <div class="card stack-sm card--dashed"><p class="eyebrow">Beyond · unknown</p><p class="small" style="font-size:16px">Shipping and small craft have no global series. Intentional drowning is not reproduced here. Non-fatal drownings run four to five per death and are never added.</p></div>
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
    <div class="card stack-sm"><p class="eyebrow">By WHO region · 2021</p>${window.Charts.regions(R)}<p class="small muted">All six are read from Fig. 2 and p. 14 of WHO’s 2024 report, which prints deaths to the nearest thousand; they add to the global 300,000. Two regions, Western Pacific and South-East Asia, hold 56% of the toll. Since 2000 the global rate has fallen 38%, but only 3% in Africa (p. 17). A secondary summary had given Europe 9,155; the report prints 15,000, and the difference is an open task. ${ledgerLink('who-trend-2000-2021')}</p></div>
    <div class="card stack-sm"><p class="eyebrow">By age</p>${window.Charts.ages()}<p class="small muted">WHO fact sheet: children under 5 are nearly a quarter of deaths; ages 0–29 are 57%. The 30-and-over share is the remainder. Rows: ${ledgerLink('who-age-under5')}, ${ledgerLink('who-age-under30')}.</p></div>
    <div class="stack" style="gap:14px">
      <div class="card stack-sm"><p class="eyebrow">By sex</p><p class="display" style="font-size:40px">More than 2×</p><p class="small" style="font-size:16px">The male drowning death rate is more than twice the female rate. ${ledgerLink('who-sex')}</p></div>
      <div class="card stack-sm card--dashed"><p class="eyebrow">Survivors</p><p class="display" style="font-size:40px">2 to 5 per death</p><p class="small" style="font-size:16px">In the United States, about two people are treated in an emergency department for non-fatal drowning for every death, counted. “Four to five per death” is often quoted worldwide, and we have not found where it comes from: WHO says global non-fatal data are largely unavailable. Never added to a death count. ${ledgerLink('cdc-nonfatal-ed-2012-2021')} · ${ledgerLink('who-nonfatal')}</p></div>
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
    <p class="small" style="font-size:15px">Coastal 154 · inland rivers, creeks, lakes and dams 122 (rivers and creeks alone 99) · swimming pools 35, two-thirds of them backyard pools. The UK's 2024 register puts 61% of accidental deaths on inland water. Neither split exists for the world. ${ledgerLink('australia-location-2024-25')}, ${ledgerLink('uk-waid-2024')}</p>
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
        <dt>Source</dt><dd>${esc(r.source)}${r.url ? ` · <a href="${esc(r.url)}">link</a>` : ''}</dd>
        <dt>Grade</dt><dd>${pill(r.grade)} ${esc(gradeName[r.grade])}</dd>
        <dt>Do not add to</dt><dd>${esc(r.do_not_add_to)}</dd>
        ${r.note ? `<dt>Note</dt><dd>${esc(r.note)}</dd>` : ''}
        <dt>Tags</dt><dd class="mono">${esc(r.tags || '—')} · checked ${esc(r.last_checked)}</dd>
      </dl><div class="row" style="margin-top:14px"><a class="btn btn--sm btn--ghost" href="#contribute-correction-${esc(r.id)}">Correct or verify this row</a><button class="btn btn--sm btn--ghost" data-copy-id="${esc(r.id)}">Copy row as JSON</button></div></td></tr>` : '';
      return `<tr><td><button class="rowbtn" data-row="${esc(r.id)}" style="all:unset;cursor:pointer;color:var(--rust);text-decoration:underline;text-underline-offset:3px;font-family:var(--mono);font-size:13px">${esc(r.id)}</button><div style="font-weight:600;margin-top:4px">${esc(r.figure)}</div></td><td class="small">${esc(r.scope.length > 110 ? r.scope.slice(0, 108) + '…' : r.scope)}<div class="mono muted" style="margin-top:4px">${esc(r.geography)}</div></td><td class="mono">${r.year || '—'}</td><td>${pill(r.grade)}${/verify/.test(r.tags) ? ' <span class="pill pill-C">verify</span>' : ''}${/open/.test(r.tags) ? ' <span class="pill pill-D">open</span>' : ''}</td><td class="small">${esc(r.source.length > 90 ? r.source.slice(0, 88) + '…' : r.source)}</td></tr>${detail}`;
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
  <details class="row"><summary class="h3" style="display:flex;align-items:center;gap:10px;cursor:pointer">The whole tree <span class="mono muted" style="font-size:13px">25 nodes · 17 leaves · click any to jump</span></summary><div class="treemap" style="margin-top:18px">${map}</div></details>
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
    <p class="lede">Analysis is getting cheap. Deciding well, together, with incomplete information and a clock running, is not. <a href="https://appliedwisdomfornonprofits.org">Applied Wisdom for Nonprofits</a> carries the leadership lessons Jim Morgan drew from nearly three decades leading Applied Materials. The lab is co-designed with them: their insights are how every team works, the Situation Solver is how every drill is debriefed, and the wisdom ledger is how what is learned gets shared.</p>
  </div>
  ${photo(PHOTOS.kayak, 'Whaleback Light at dusk, seen over the bow of a kayak on calm water', 'Whaleback Light from the water · Photo: Ethan Hawkes', 'flex:1 1 320px;min-height:360px')}
</div></section>

<section class="section dark" aria-labelledby="ins-title"><div class="wrap stack" style="gap:28px">
  ${sectionHead('The eight insights', '<span id="ins-title">Their eight insights are the syllabus. The staged rescue is the exam.</span>', 'Each insight is practised twice: once on the real problem, sizing the toll and shipping a pilot, and once in the staged rescue. The mapping is a draft for Applied Wisdom to correct.')}
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
  <div class="scoreboard"><div><span class="n">0</span><b>Lessons recorded</b><span class="small muted">One per pilot, after the forecast runs</span></div><div><span class="n">0</span><b>Shared back</b><span class="small muted">Lessons Applied Wisdom carries to its community</span></div><div><span class="n">8</span><b>Insights in use</b><span class="small muted">Every lesson is filed under one</span></div></div>
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
  <form id="cform" class="stack" style="flex:1.2 1 460px;min-width:0;gap:16px" novalidate>
    <div class="stack-sm"><h2 class="h3">${esc(TYPES[type].label)}</h2><p class="small muted" style="font-size:15px">${esc(TYPES[type].blurb)}</p></div>
    ${TYPES[type].fields.map(([k, label, kind, req]) => {
      const pre = (type === 'correction' && k === 'row_id') || (type === 'branch' && k === 'node_id') ? esc(ref) : '';
      const id = 'f-' + k;
      let input;
      if (kind === 'textarea') input = `<textarea id="${id}" name="${k}" ${req ? 'required' : ''}></textarea>`;
      else if (kind.startsWith('select:')) input = `<select id="${id}" name="${k}" ${req ? 'required' : ''}><option value="">—</option>${kind.slice(7).split(',').map((o) => `<option>${o}</option>`).join('')}</select>`;
      else input = `<input id="${id}" name="${k}" type="${kind}" value="${pre}" ${req ? 'required' : ''}>`;
      return `<div class="field"><label for="${id}">${esc(label)}${req ? ' *' : ''}</label>${input}<span class="errmsg" hidden>Required</span></div>`;
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
    contribute: { html: contributePage, mount: mountContribute, title: 'Contribute · The Life-Saving Lab' }
  };
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
  function render() {
    const { route, arg } = parseHash();
    document.querySelectorAll('#navlinks a').forEach((a) => a.classList.toggle('on', a.dataset.route === route));
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
    lastRoute = route;
  }
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('hashchange', render);
  (async () => {
    try { await Promise.race([load(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 6000))]); }
    catch (e) { console.warn('data load failed', e); }
    render();
  })();
})();
