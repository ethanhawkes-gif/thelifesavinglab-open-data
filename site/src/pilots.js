/* Pilots: the one-page format, the forecast rule, three worked examples for Portsmouth Harbor, and a template to copy. */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const FIELDS = [
    ['The water', 'Which water, in the tree’s words: sea-coast, harbor-river, lake, pool, home, flood. One.'],
    ['The person', 'Who the measure is for. A paddler, a lobster crew, a child under five, a person on foot at the seawall. One.'],
    ['The change', 'One sentence. What will be done differently, by whom, starting when. If it needs two sentences it is two pilots.'],
    ['Who runs it', 'A role at a real place that could do it this season without a new agency: a harbormaster, a club, an outfitter, a station.'],
    ['The forecast', 'What you expect to happen, as a number or a direction, by a date. Written before the pilot starts. Printed next to the result afterwards.'],
    ['How we would know it failed', 'The test, written in advance. A number below which the pilot is dropped, or an event that ends it. No pilot without one.'],
    ['What it costs', 'Hours, dollars, attention. Honest ranges. In kind counts.'],
    ['What to count', 'The register columns the pilot fills, so the result can be read by someone who was not there.']
  ];
  const EXAMPLES = [
    { id: 'late-boat-watch', title: 'The late-boat watch', leaf: 'harbor-recreational', status: 'proposed · no adopter yet',
      water: 'harbor-river (the Piscataqua mouth)', person: 'Recreational paddlers and small-boat renters',
      change: 'Every rental or club launch files a one-line float plan (where, back by when, how many). A volunteer watch calls the number on the plan thirty minutes after the stated return if the boat is not back, and calls the harbormaster thirty minutes after that.',
      runs: 'An outfitter or paddling club on the river, with the harbormaster’s number on the wall.',
      forecast: 'By 1 September: plans filed for at least 80% of launches; at least one late boat found by the watch before anyone else noticed; median time from “late” to first contact under 20 minutes.',
      fail: 'Fewer than half of launches file a plan by 15 July, or the watch misses a late boat that is later reported by someone else.',
      cost: 'A clipboard, a phone, a rota of volunteers for the hours the ramp is open. $0–$300.',
      count: ['date', 'place', 'water', 'activity', 'persons_involved', 'pfd_worn', 'minutes_alarm_to_reach', 'who_responded', 'outcome'],
      rows: ['piscataqua-current', 'uscg-boating-2024', 'cummings-pfd-2011'] },
    { id: 'cold-water-card', title: 'The cold-water card', leaf: 'harbor-recreational', status: 'proposed · no adopter yet',
      water: 'sea-coast and harbor-river', person: 'Anyone who launches a small craft from April to October',
      change: 'A card the size of a hand goes out with every rental and every club launch: the sea here is near 12 °C in June; one minute to get breathing under control, ten minutes of useful movement, about an hour before the cold takes consciousness; the jacket keeps you up while you wait.',
      runs: 'The same outfitter or club; the lab prints the cards.',
      forecast: 'At return, at least 60% of renters can say the first rule unprompted. Life-jacket wearing at launch, counted by the watch, rises from the first month to the last.',
      fail: 'Under 40% recall at return in August, or no change in jackets worn.',
      cost: 'Printing: under $100 for a season. Thirty seconds per launch.',
      count: ['date', 'water', 'activity', 'persons_involved', 'pfd_worn', 'water_temp_c', 'notes'],
      rows: ['giesbrecht-1-10-1', 'ndbc-44007-water-temp', 'cummings-pfd-2011'] },
    { id: 'minutes-to-reach', title: 'Minutes to reach, written down', leaf: 'harbor-working', status: 'proposed · no adopter yet',
      water: 'harbor-river', person: 'Everyone the harbor responds to, fatal or not',
      change: 'For one season the harbormaster fills the register after every event, and never leaves “minutes from alarm to reach” blank: the time of the first call and the time the first responder reached the person.',
      runs: 'One harbormaster’s office. The register is the tool on this site; rows stay on their own machine until they choose to send them.',
      forecast: 'By 1 October: every event the office responded to has a row, and at least 80% of rows carry the minutes. The median is known for this harbor for the first time.',
      fail: 'Fewer than ten rows by August, or minutes missing in more than half of them.',
      cost: 'Two minutes per event. No money.',
      count: ['date', 'time_local', 'place', 'water', 'activity', 'minutes_alarm_to_reach', 'who_responded', 'outcome', 'confidence'],
      rows: ['uscg-sar-fy2024', 'hf-radar-search-area'] }
  ];
  function template() {
    return ['# Pilot: <name>', '', 'Status: proposed · adopter: none yet · written: ' + new Date().toISOString().slice(0, 10), '']
      .concat(FIELDS.map(([k, help]) => `## ${k}\n<!-- ${help} -->\n\n`)).join('\n') + '\n## Result (filled in afterwards)\n\nForecast said: \nWhat happened: \nKept, changed or dropped: \n';
  }
  function page(ctx) {
    const { sectionHead, ledgerLink } = ctx;
    return `
<section class="section" style="padding-bottom:36px"><div class="wrap stack" style="gap:22px">
  <p class="eyebrow">Pilots</p>
  <h1 class="display h1" style="max-width:14em">One page. One change. One forecast.</h1>
  <p class="lede" style="max-width:44em">A pilot is the smallest test of a measure that a person who works the water would run this season. Students write them. Practitioners take them up or refuse them, on the record. The forecast is written before the pilot starts and printed next to the result afterwards, so a pilot that failed still teaches.</p>
  <div class="row"><a class="btn btn--primary" href="#contribute-pilot">Write a pilot</a><button class="btn btn--ghost" id="pilot-template" type="button">Get the template</button><a class="btn btn--ghost" href="#tree">Start from the tree</a></div>
  <div id="fallback-box" hidden></div>
</div></section>

<section class="section--tight band" aria-labelledby="format-title"><div class="wrap stack" style="gap:28px">
  ${sectionHead('The one-page format', '<span id="format-title">Eight fields. None optional.</span>', 'If a field cannot be filled, the pilot is not ready. That is the point of the format.')}
  <div class="grid g2" style="gap:14px 40px">
    ${FIELDS.map(([k, help], i) => `<div class="rec" style="padding:14px 0"><span class="k">${i + 1} · ${esc(k)}</span><p class="small" style="font-size:15px">${esc(help)}</p></div>`).join('')}
  </div>
  <div class="card stack-sm" style="border-left:4px solid var(--buoy);max-width:52em"><p class="eyebrow">The forecast rule</p><p style="font-size:17px">Write what you expect to happen, as a number or a direction, with a date, before the pilot starts. Afterwards, print the result next to it. A pilot with no forecast is a story, and the lab does not count stories.</p></div>
</div></section>

<section class="section" aria-labelledby="ex-title"><div class="wrap stack" style="gap:28px">
  ${sectionHead('Three worked examples', '<span id="ex-title">For Portsmouth Harbor, this coming season.</span>', 'Written to show the format at full size. None has an adopter yet; each names the role that could take it. Each is one leaf of the tree.')}
  ${EXAMPLES.map((p) => `
  <article class="card stack" style="gap:16px" id="pilot-${esc(p.id)}">
    <div class="row" style="align-items:center;gap:8px 14px"><span class="k mono" style="color:var(--rust);font-size:13px">${esc(p.id)}</span><span class="pill pill-D">${esc(p.status)}</span><a class="small" href="#tree-${esc(p.leaf)}">Branch: ${esc(p.leaf)}</a></div>
    <h3 class="h3">${esc(p.title)}</h3>
    <div class="grid g2" style="gap:16px 32px">
      <div class="pf"><span class="eyebrow">The water</span><p>${esc(p.water)}</p></div>
      <div class="pf"><span class="eyebrow">The person</span><p>${esc(p.person)}</p></div>
      <div class="pf" style="grid-column:1/-1"><span class="eyebrow">The change</span><p>${esc(p.change)}</p></div>
      <div class="pf"><span class="eyebrow">Who runs it</span><p>${esc(p.runs)}</p></div>
      <div class="pf"><span class="eyebrow">What it costs</span><p>${esc(p.cost)}</p></div>
      <div style="grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:16px 32px">
        <div class="pf" style="border-left:3px solid var(--teal);padding-left:14px"><span class="eyebrow">The forecast</span><p>${esc(p.forecast)}</p></div>
        <div class="pf" style="border-left:3px solid var(--buoy);padding-left:14px"><span class="eyebrow">How we would know it failed</span><p>${esc(p.fail)}</p></div>
      </div>
      <div class="pf" style="grid-column:1/-1"><span class="eyebrow">What to count</span><p class="row" style="gap:6px">${p.count.map((c) => `<span class="mono" style="font-size:12px;background:var(--band);padding:3px 8px;border-radius:2px">${esc(c)}</span>`).join('')}</p></div>
    </div>
    <p class="small muted" style="font-size:14px">Rows: ${p.rows.map(ledgerLink).join(', ')} · <a href="#register">The register</a> has every column named above.</p>
  </article>`).join('')}
</div></section>

<section class="section--tight dark" aria-labelledby="score-title"><div class="wrap stack" style="gap:24px">
  <div class="stack"><p class="eyebrow">How a pilot is scored</p><h2 class="h2 display" id="score-title" style="max-width:18em">Written. Taken up. Tested. Alive at six months. Or failed, and published.</h2></div>
  <ol class="steps">
    <li><span class="n">WRITTEN</span><p class="small" style="font-size:15px">All eight fields filled. A person who works the water has read it and marked it.</p></li>
    <li><span class="n">TAKEN UP</span><p class="small" style="font-size:15px">A named adopter says yes on the record, with a start date. “Not yet” comes with the reason.</p></li>
    <li><span class="n">TESTED</span><p class="small" style="font-size:15px">The season runs. The register fills. The forecast is not touched.</p></li>
    <li><span class="n">ALIVE AT SIX MONTHS</span><p class="small" style="font-size:15px">Still being used or tested half a year on. The only measure of a pilot that matters to the lab.</p></li>
    <li><span class="n">FAILED, PUBLISHED</span><p class="small" style="font-size:15px">The forecast and the result side by side, with what was learned. Failures stay on the record.</p></li>
  </ol>
  <p class="small" style="color:var(--mist)">The counts on the home page start at zero and are not estimated. Counting begins with the June 2027 lab.</p>
</div></section>`;
  }
  function mount(ctx, tools, arg) {
    const b = document.getElementById('pilot-template'); if (!b) return;
    b.addEventListener('click', () => tools.saveFile('pilot-template.md', template()));
    if (arg) { const el = document.getElementById('pilot-' + arg); if (el) setTimeout(() => el.scrollIntoView({ block: 'start' }), 0); }
  }
  window.Pilots = { page, mount };
})();
