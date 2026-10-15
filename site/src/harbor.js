/* This water: Portsmouth Harbor and the Piscataqua. What is known about it with sources, what nobody has counted here, and what we would try first. */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function page(ctx) {
    const { sectionHead, photo, PHOTOS, pill, ledgerLink, rowById } = ctx;
    const R = (id) => rowById(id) || {};
    const cur = R('piscataqua-current'), temp = R('ndbc-44007-water-temp'), cold = R('giesbrecht-1-10-1'), station = R('wood-island-rescues');
    const tasks = (ctx.tasks() || []).filter((t) => /state-counts-|leeway|rnli|uscg-rss/.test(t.id) && t.status !== 'done');
    return `
<section class="section" style="padding-bottom:36px"><div class="wrap stack" style="gap:22px">
  <p class="eyebrow">This water · Portsmouth Harbor and the Piscataqua</p>
  <h1 class="display h1" style="max-width:14em">One river mouth, two states, a station built for the job in 1908.</h1>
  <p class="lede" style="max-width:44em">The lab works one harbor on purpose. A measure that is right for the open coast or a village pond can be wrong here, so this page keeps what is known about this water, with its sources, beside what nobody has counted yet, and the three changes we would try first.</p>
</div></section>

<section class="section--tight band"><div class="wrap stack" style="gap:28px">
  <div class="scoreboard">
    <div><span class="n" style="font-size:52px">4+ kn</span><b>The river on the ebb</b><span class="small muted">Maximum average velocity, off Nobles Island and Dover Point ${pill(cur.grade || 'A')}</span></div>
    <div><span class="n" style="font-size:52px">12 °C</span><b>The sea in June</b><span class="small muted">Mean at NOAA buoy 44007, off Portland; March 3 °C, August 17 °C ${pill(temp.grade || 'A')}</span></div>
    <div><span class="n" style="font-size:52px">1·10·1</span><b>Cold water</b><span class="small muted">One minute to control breathing, ten of useful movement, about an hour ${pill(cold.grade || 'C')}</span></div>
    <div><span class="n" style="font-size:52px">1,678</span><b>Seafarers aided, 1918–1939</b><span class="small muted">By the Wood Island crew, from station records ${pill(station.grade || 'C')}</span></div>
  </div>
  <div class="grid g2" style="gap:24px 40px;align-items:start">
    <div class="stack" style="gap:14px">
      <h2 class="h3">What the river does</h2>
      <p>The Piscataqua is a tidal river with a strong current. NOAA’s Coast Pilot says navigation along its whole length is severely hampered by rapid tidal currents, puts the maximum average velocity at over four knots on the ebb, limits deep-draft vessels to the three hours around slack water, and warns of strong currents and eddies in the bend at Fort Point, where the water in the cove can run against the river. A kayak paddles about three knots. A swimmer, far less.</p>
      <p>The sea outside is cold all year. At the nearest long-record buoy the monthly mean never reaches 17 °C and sits near 12 °C in June, when the lab runs. In water that cold the first minute is about breathing, not swimming; the jacket keeps a person up while the body settles. That is why every pilot for this harbor starts with the jacket and the clock.</p>
      <p class="small muted">Rows: ${ledgerLink('piscataqua-current')} · ${ledgerLink('ndbc-44007-water-temp')} · ${ledgerLink('giesbrecht-1-10-1')} · ${ledgerLink('leeway-definition')}</p>
    </div>
    ${photo(PHOTOS.kayak, 'A kayaker on Portsmouth Harbor with Whaleback Light behind', 'Whaleback Light from the water · Photo: Ethan Hawkes')}
  </div>
</div></section>

<section class="section" aria-labelledby="who-title"><div class="wrap stack" style="gap:24px">
  ${sectionHead('Who answers a call here', '<span id="who-title">The people who already do this work.</span>', 'None has been asked yet. Every name below is a role, not a commitment.')}
  <div class="grid g3">
    <div class="card stack-sm"><p class="eyebrow">Coast Guard</p><h3 class="h4">Station Portsmouth Harbor</h3><p class="small" style="font-size:15px">Search and rescue on this coast. Nationally the service logged 14,282 cases and 5,892 lives saved in fiscal 2024; the station’s own numbers are not published in a form we can cite. ${ledgerLink('uscg-sar-fy2024')}</p><p class="small muted" style="font-size:14px">Proposed role: safety review of the staged rescue; a crew for the lift. Not contacted.</p></div>
    <div class="card stack-sm"><p class="eyebrow">The towns</p><h3 class="h4">Harbormasters on both banks</h3><p class="small" style="font-size:15px">Portsmouth and New Castle in New Hampshire, Kittery in Maine: the offices that see most events in the harbor first and keep local logs. The register is written for them. <a href="#register">Open the register</a></p><p class="small muted" style="font-size:14px">Proposed role: one season of rows. Not contacted.</p></div>
    <div class="card stack-sm"><p class="eyebrow">The station</p><h3 class="h4">Wood Island Life Saving Station Association</h3><p class="small" style="font-size:15px">Restored the 1908 station and runs it as a museum. Its crews aided 1,678 seafarers between 1918 and 1939, by the station’s own records. ${ledgerLink('wood-island-rescues')}</p><p class="small muted" style="font-size:14px">Proposed role: the site for two days in June. Donations to the lab go to the association. Not contacted.</p></div>
  </div>
</div></section>

<section class="section--tight dark" aria-labelledby="unknown-title"><div class="wrap stack" style="gap:24px">
  <div class="stack"><p class="eyebrow">What nobody has counted here</p><h2 class="h2 display" id="unknown-title" style="max-width:18em">The local gaps, each with a way to close it.</h2></div>
  <div class="grid g2" style="gap:18px 40px">
    <div class="rec"><span class="k">How many a year, in which water</span><span class="small" style="font-size:15px">Neither New Hampshire nor Maine has a yearly drowning count in the ledger yet. Both have medical examiners and both appear in CDC WONDER. Two tasks on the board.</span></div>
    <div class="rec"><span class="k">Minutes from alarm to reach</span><span class="small" style="font-size:15px">Never written down for this harbor. One office, one season, two minutes per event. <a href="#pilots-minutes-to-reach">The pilot</a>.</span></div>
    <div class="rec"><span class="k">How many people are on the water</span><span class="small" style="font-size:15px">Launches, rentals, moorings, ferry passengers: nobody counts them, so no risk per trip exists for any water here. ${ledgerLink('exposure-denominators')}</span></div>
    <div class="rec"><span class="k">Where a person drifts</span><span class="small" style="font-size:15px">The Coast Guard’s recommended leeway values by object are in a 1999 table the lab has not been able to read in full. A task on the board, then a worksheet for day two.</span></div>
  </div>
  ${tasks.length ? `<p class="small" style="color:var(--mist)">On the board now: ${tasks.map((t) => `<a href="#lend">${esc(t.title)}</a>`).join(' · ')}</p>` : ''}
</div></section>

<section class="section" aria-labelledby="try-title"><div class="wrap stack" style="gap:24px">
  ${sectionHead('What we would try first', '<span id="try-title">Three pilots written for this harbor.</span>', 'Each is one page, with a forecast and a test for failure, and names the role that could run it this season.')}
  <div class="grid g3">
    <div class="card stack-sm"><p class="eyebrow">Paddlers and renters</p><h3 class="h4">The late-boat watch</h3><p class="small" style="font-size:15px">A one-line float plan with every launch, and a volunteer who calls when a boat is thirty minutes late.</p><a class="small" href="#pilots-late-boat-watch">Read the page →</a></div>
    <div class="card stack-sm"><p class="eyebrow">Anyone who launches</p><h3 class="h4">The cold-water card</h3><p class="small" style="font-size:15px">A hand-size card with the June sea temperature and the first minute’s rule, handed out with every rental.</p><a class="small" href="#pilots-cold-water-card">Read the page →</a></div>
    <div class="card stack-sm"><p class="eyebrow">The harbormaster’s office</p><h3 class="h4">Minutes to reach, written down</h3><p class="small" style="font-size:15px">One season of the register, with the one column that is never left blank.</p><a class="small" href="#pilots-minutes-to-reach">Read the page →</a></div>
  </div>
  <div class="row"><a class="btn btn--primary" href="#june">The June lab</a><a class="btn btn--ghost" href="#tree-harbor">The harbor branch of the tree</a><a class="btn btn--ghost" href="#contribute-pilot">Propose a pilot for this water</a></div>
</div></section>

<section class="section--tight band"><div class="wrap">${photo(PHOTOS.rocks, 'The Wood Island station from the rocks at low water', 'Wood Island Life-Saving Station, Kittery · Photo: Ethan Hawkes')}</div></section>`;
  }
  window.Harbor = { page };
})();
