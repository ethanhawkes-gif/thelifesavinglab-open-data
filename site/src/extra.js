/* The Life-Saving Lab · the live counter, the June curriculum, the watch and the glossary. */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const YEAR_S = 31557600;

  /* ---------- the live counter: an estimate, never a report ---------- */
  let timer = null;
  function counterBlock(toll, opts) {
    opts = opts || {};
    if (!toll) return '';
    const secHigh = YEAR_S / toll.floor, secLow = YEAR_S / toll.ceiling;
    const dark = opts.dark;
    return `
<div class="counter ${dark ? 'counter--dark' : ''}" role="group" aria-label="Estimated drowning deaths while you read, from the yearly range">
  <div class="counter-row">
    <div class="counter-cell"><span class="mono muted">SINCE YOU OPENED THIS PAGE</span><span class="counter-n" data-live="since">—</span><span class="small muted">people, estimated</span></div>
    <div class="counter-cell"><span class="mono muted">SO FAR TODAY</span><span class="counter-n" data-live="today">—</span><span class="small muted">in your time zone</span></div>
    <div class="counter-cell"><span class="mono muted">SO FAR THIS YEAR</span><span class="counter-n" data-live="year">—</span><span class="small muted">since 1 January</span></div>
  </div>
  <p class="small ${dark ? '' : 'muted'}" style="${dark ? 'color:var(--mist)' : ''}">One person about every ${Math.round(secLow)} to ${Math.round(secHigh)} seconds, if the yearly range of ~${fmt(Math.round(toll.floor / 5000) * 5000)}–${fmt(Math.round(toll.ceiling / 5000) * 5000)} is spread evenly. An estimate from modeled yearly totals, not a count of reported deaths. Nobody knows the true number; that is the point.</p>
</div>`;
  }
  function startCounter(toll) {
    stopCounter();
    if (!toll || !document.querySelector('[data-live]')) return;
    const opened = Date.now();
    const rl = toll.floor / YEAR_S, rh = toll.ceiling / YEAR_S;
    const range = (s) => { const a = Math.floor(s * rl), b = Math.ceil(s * rh); return a === b ? fmt(a) : fmt(a) + '–' + fmt(b); };
    const tick = () => {
      const now = new Date();
      const since = (now - opened) / 1000;
      const midnight = new Date(now); midnight.setHours(0, 0, 0, 0);
      const jan1 = new Date(now.getFullYear(), 0, 1);
      const vals = { since: range(since), today: range((now - midnight) / 1000), year: range((now - jan1) / 1000) };
      document.querySelectorAll('[data-live]').forEach((el) => { const v = vals[el.dataset.live]; if (v != null && el.textContent !== v) el.textContent = v; });
    };
    tick(); timer = setInterval(tick, 1000);
  }
  function stopCounter() { if (timer) { clearInterval(timer); timer = null; } }

  /* ---------- the June lab ---------- */
  function junePage(ctx) {
    const { sectionHead, photo, PHOTOS, SITE } = ctx;
    const ins = (name) => `<span class="pill pill-wis">${esc(name)}</span>`;
    const block = (t, title, purpose, out, insight, lead) => `
<div class="agenda">
  <div class="agenda-t mono">${t}</div>
  <div class="agenda-body"><div class="agenda-title">${title}</div><p class="small" style="font-size:15px">${purpose}</p>${out ? `<p class="small muted"><b>Produces:</b> ${out}</p>` : ''}</div>
  <div class="agenda-side">${insight ? ins(insight) : ''}<span class="small muted">${lead}</span></div>
</div>`;
    const day1 = [
      ['07:45', 'The crossing', 'Boat from Kittery Point. On the way over, every team reads the tide, the wind and the traffic out loud and writes one line about what the water is doing today.', 'one line per team on the situation board', 'Develop Court Sense', 'Safety lead · boat crew'],
      ['08:30', 'The one rule, roles and radios', 'Nobody enters the water. Who holds the radio, who holds the clock, who holds the register. Channel 16 said aloud by everyone.', 'a safety card in every pocket', 'The Whole Job', 'Safety lead · Coast Guard Auxiliary (proposed)'],
      ['09:00', 'Opening: wisdom under pressure', 'Why this lab exists: we are gaining capability faster than wisdom. The four questions every team answers: how big is the problem, what share can be addressed, how, and can we pilot it. Bad news goes first, always.', 'the four questions on the wall', 'Cultivating Culture', 'Jim McDonough · Ethan Hawkes'],
      ['09:30', 'What the surfmen knew', 'The station’s story, told in the station by the people who restored it. Not a plaque: a watch, a drill, a crew.', '', 'Respect and Trust Your People', 'Wood Island association (proposed)'],
      ['10:00', 'The sizing stand-up', 'Each team, five minutes: its branch of the toll, as a range, with what it leaves out. Practitioners may ask only one question: “What would change your number?”', 'six ranges, each with a source and a gap', 'Prioritize and Focus', 'Teams · practitioner panel'],
      ['11:00', 'Bad news, timed', 'A surprise: a source is retracted, a row is wrong, an adopter has moved. Teams have twenty minutes to reconcile. The clock runs from the surprise to the first team that reports it.', 'minutes to first report, logged', 'Bad News is Good News', 'Lab staff'],
      ['11:30', 'Pilot clinics', 'Teams rotate through three tables: the harbor, the crew, the data. Twenty minutes each. Practitioners mark every page: would use · would not · would if.', 'three marked copies of every pilot', 'Respect and Trust Your People', 'Harbormaster, crew, data lead (proposed)'],
      ['12:45', 'Lunch, and the turn of the tide', 'Eat, then walk the island at slack water. Nothing is scheduled. Rest is part of the job.', '', 'The Whole Job', ''],
      ['13:30', 'The hostile read', 'Teams swap pilot pages and try to break each other’s. Objections in writing only, one per line, each with the failure it predicts.', 'a list of objections on every pilot', 'Bad News is Good News', 'Teams'],
      ['14:15', 'Rebuild, then ship', 'Forty-five minutes to answer the objections. Anything that cannot run this season is cut, not deferred.', 'pilot page v2, one page, no annexes', 'Book It and Ship It', 'Teams'],
      ['15:00', 'Tools a tired harbor would use', 'Drones, a sea robot, a drift sheet, radios, the register on a phone, lent by a donor and run by licensed operators. The test for every tool: would a crew use it at 2 a.m. in the rain?', 'a yes/no on each tool from a practitioner', 'The Whole Job', 'Robotics donor (to be found) · practitioners'],
      ['16:15', 'Book the forecast', 'Each team writes tomorrow’s forecast: what it predicts will happen, minute by minute, and the three things that would prove the pilot wrong. Signed and handed in.', 'six forecasts, sealed', 'Book It and Ship It', 'Teams · safety lead'],
      ['16:45', 'The wisdom round', 'Ten minutes. Everyone, one line: the thing I got wrong today and what I will do about it tomorrow.', 'the first rows of the wisdom ledger', 'Cultivating Culture', 'Jim McDonough'],
      ['17:00', 'Boat back', 'Dinner on the mainland. No evening session.', '', 'The Whole Job', '']
    ];
    const day2 = [
      ['07:30', 'The weather call', 'Go or no-go on the water plan, made by the safety lead, out loud, with the reason. If no-go, the drill runs on the boardwalk and the forecasts still count.', 'a decision on the record', 'Book It and Ship It', 'Safety lead'],
      ['08:00', 'Watch set', 'The situation board goes live. Teams take stations: command, communications, search, recovery, logistics, register. Every task has one owner, said aloud.', 'a station list with one name per task', 'Who’s Got the Monkey?', 'Teams'],
      ['08:30', 'The scenario', 'A vessel is overdue. The weather is worsening. The casualty is a float with a radio. Every twenty minutes a new piece of news arrives, some of it bad. Licensed crews run anything on the water; students decide from the shore.', 'a timed log of every decision', 'Develop Court Sense', 'Lab staff · licensed crews'],
      ['10:45', 'The lift', 'A licensed crew shows how a person is recovered horizontally and why it matters. Teams time it and log it. Nobody in the water but the float.', 'the lift pilot, tested against the clock', 'The Whole Job', 'Surfboat or helicopter cell (proposed)'],
      ['11:15', 'Stand down and file', 'Before anyone eats, every team files its register rows for the morning: water, activity, minutes to reach, outcome. If the form is too long for a tired team, that is a finding.', 'register rows, and a verdict on the form', 'The Whole Job', 'Teams · register track'],
      ['12:00', 'Lunch', '', '', '', ''],
      ['12:45', 'Debrief with the Situation Solver', 'Each team names the situation closest to what went wrong (“we were stretched too thin”, “nobody owned the radio”) and works through the Solver’s lenses. Seventy-five minutes; this is the core of the day.', 'one worked case per team', 'All eight insights', 'Jim McDonough · Applied Wisdom'],
      ['14:00', 'The adopter panel', 'Each pilot gets a verdict from a named practitioner, on the record: yes · not yet · no, with the reason. A “not yet” comes with the one thing that would turn it.', 'six verdicts, published', 'Respect and Trust Your People', 'Practitioner panel'],
      ['15:00', 'The wisdom ledger', 'One line per team: what we expected, what happened, what we would do differently, under which insight.', 'six wisdom rows', 'Cultivating Culture', 'Jim McDonough'],
      ['15:30', 'The logbook', 'An owner and a date on every open item. Which pilots are handed over this month, to whom. What gets published this week.', 'the logbook, with no orphan items', 'Who’s Got the Monkey?', 'Ethan Hawkes · teams'],
      ['16:00', 'Close', 'What the lab will publish, and when. What it will not claim.', '', 'Book It and Ship It', 'Jim McDonough · Ethan Hawkes'],
      ['16:30', 'Boat back', '', '', '', '']
    ];
    const evenings = [
      ['Wed 3 Mar', 'Cultivating Culture', 'The four questions; how we disagree', 'a team charter'],
      ['Wed 10 Mar', 'Develop Court Sense', 'Reading data and reading water; the ledger', 'a sizing memo, as a range'],
      ['Wed 17 Mar', 'Bad News is Good News', 'Checking a source; grades A to D. Before this evening, each student lends an assistant one board task and brings the bundle', 'two ledger rows verified; one bundle each, with its receipt'],
      ['Wed 7 Apr', 'Prioritize and Focus', 'The tree; choosing one branch', 'a branch and an adopter type'],
      ['Wed 14 Apr', 'Book It and Ship It', 'Writing a one-page pilot; the failure test', 'pilot page v1'],
      ['Wed 21 Apr', 'The Whole Job', 'Roles, rest, radios; the forecast', 'a forecast draft and a station list']
    ];
    const rules = [
      ['No block runs longer than 75 minutes without a decision.', 'Attention is the scarce resource, not time.'],
      ['Bad news goes first, and it is timed.', 'The lab measures minutes from a surprise to the first report. A crew that reports fast is the one we want.'],
      ['Every block produces something.', 'A line on the board, a marked page, a verdict, a row. If a block produces nothing, it is cut.'],
      ['Practitioners judge. They do not lecture.', 'Their time is spent marking pages and giving verdicts on the record.'],
      ['Rest is part of the job.', 'A real lunch, a walk at slack water, no evening session.'],
      ['Done means five things.', 'One page · an adopter type named · a written failure test · a register format · shippable this season.']
    ];
    return `
<section class="section" style="padding-bottom:40px"><div class="wrap" style="display:flex;flex-wrap:wrap;gap:36px 64px">
  <div class="stack" style="flex:1.2 1 460px;min-width:0;gap:24px">
    <p class="eyebrow">The June lab · 2027 · dates proposed, a person sets them</p>
    <h1 class="display h2">Two days on Wood Island. One rule: nobody enters the water.</h1>
    <p class="lede">24 students in six teams, with the people who work this harbor beside them. Each team takes one branch of the tree, sizes it from the ledger, and writes a one-page change that a harbormaster, co-op or crew could run this year. Day one tests the pilots. Day two tests the people, with a clock running. Co-hosted with Applied Wisdom for Nonprofits, whose eight insights are the way every team works.</p>
    <div class="row"><a class="btn btn--primary" href="${SITE}/cohort">Apply for a seat</a><a class="btn btn--ghost" href="#contribute-offer">Offer a boat, a drone or a classroom day</a></div>
  </div>
  ${photo(PHOTOS.hero, 'Wood Island Life-Saving Station down its boardwalk, with a surfboat on its carriage', 'The classroom, proposed · Photo: Ethan Hawkes', 'flex:1 1 340px;min-height:300px')}
</div></section>

<section class="section band" aria-labelledby="rules-title"><div class="wrap stack" style="gap:28px">
  ${sectionHead('Design rules', '<span id="rules-title">Six rules the agenda is built on.</span>', 'They came out of pressure-testing the first draft, which had too much presenting, too little deciding, and a debrief squeezed into ninety minutes.')}
  <div class="grid g3">${rules.map((r, i) => `<div class="card stack-sm"><p class="mono" style="color:var(--rust)">${i + 1}</p><p style="font-weight:600">${r[0]}</p><p class="small" style="font-size:15px">${r[1]}</p></div>`).join('')}</div>
</div></section>

<section class="section" aria-labelledby="d1-title"><div class="wrap stack" style="gap:24px">
  ${sectionHead('Day one · the problem', '<span id="d1-title">Size it. Ship it. Let someone try to break it.</span>', 'Each block names what it practises from Applied Wisdom, what it produces, and who leads it. Leads marked “proposed” have not been asked yet.')}
  <div class="agenda-list">${day1.map((b) => block(...b)).join('')}</div>
</div></section>

<section class="section band" aria-labelledby="d2-title"><div class="wrap stack" style="gap:24px">
  ${sectionHead('Day two · the clock', '<span id="d2-title">The same team, a clock, and news that keeps changing.</span>', 'The staged rescue is the test. The debrief is the lesson. The adopter panel is the verdict.')}
  <div class="agenda-list">${day2.map((b) => block(...b)).join('')}</div>
  <div class="card" style="background:var(--navy);color:var(--paper);border:none"><b>Safety line:</b> students never enter the water or crew a vessel. Anything on the water is simulated or run by licensed professionals, with the harbormaster’s permission and an airspace check for any drone. A backup weekend is held for weather, and a no-go call moves the drill to the boardwalk.</div>
</div></section>

<section class="section dark" aria-labelledby="aw-title"><div class="wrap" style="display:flex;flex-wrap:wrap;gap:36px 64px">
  <div class="stack" style="flex:1.2 1 460px;min-width:0;gap:20px">
    <p class="eyebrow">Co-hosted with Applied Wisdom</p>
    <h2 id="aw-title" class="display h2">Their eight insights are the syllabus. The staged rescue is the exam.</h2>
    <p class="lede">Every block above carries one of Jim Morgan’s eight insights, because the lab does not need new leadership content. It needs a place to practise what already exists, against something real.</p>
    <div class="grid g2">
      <div class="gap"><p class="eyebrow">What Applied Wisdom leads</p><p class="small" style="font-size:15px;color:var(--pale)">The opening frame · the Situation Solver debrief, the core of day two · the wisdom round and the wisdom ledger · the close.</p></div>
      <div class="gap"><p class="eyebrow">What Applied Wisdom gets</p><p class="small" style="font-size:15px;color:var(--pale)">A fully documented, high-stakes case for its Leadership and Human Systems Lab · a testbed for the Solver with consenting students · a cohort of early-career leaders who have used the insights under a clock.</p></div>
    </div>
    <div class="row"><a class="btn btn--ghost" href="#wisdom">The curriculum in full</a></div>
  </div>
  <div class="stack" style="flex:1 1 320px;min-width:0;gap:14px">
    <p class="eyebrow">Before June · six online evenings · 7:00–8:30 pm ET</p>
    ${evenings.map((e) => `<div class="rec"><span class="k">${e[0]}</span><span style="font-weight:600;color:var(--paper)">${esc(e[1])}</span><span class="small" style="font-size:15px;color:var(--pale)">${esc(e[2])}</span><span class="small" style="color:var(--mist)">Produces: ${esc(e[3])}</span></div>`).join('')}
    <p class="small" style="color:var(--mist)">Dates skip the three schools’ spring breaks. Proposed.</p>
  </div>
</div></section>

<section class="section band" aria-labelledby="sel-title"><div class="wrap stack" style="gap:28px">${selectionSection(true)}</div></section>

<section class="section" aria-labelledby="front-title"><div class="wrap stack" style="gap:28px">
  ${sectionHead('The frontier', '<span id="front-title">What AI and robots can do for a rescue, tested in the open.</span>', 'The lab is a place to try the newest tools against the oldest problem, with a clock running and people who work the water watching. Ambition is welcome. So is a clear no.')}
  ${frontierSection(true)}
</div></section>

<section class="section" aria-labelledby="road-title"><div class="wrap stack" style="gap:28px">
  ${sectionHead('The road to June', '<span id="road-title">Proposed. A person sets the dates.</span>', 'Most owners are not yet named. Each date is a real stop: if the step is not done, the month moves.')}
  <ol class="timeline timeline--light">
    <li><span class="mono" style="color:var(--rust)">Nov 2026</span><span class="small" style="font-size:15px">Adopters asked whether they would read a pilot</span></li>
    <li><span class="mono" style="color:var(--rust)">Dec 2026</span><span class="small" style="font-size:15px">Tabletop rehearsal; the span brief re-checked</span></li>
    <li><span class="mono" style="color:var(--rust)">Jan 2027</span><span class="small" style="font-size:15px">Wood Island and a crossing boat confirmed</span></li>
    <li><span class="mono" style="color:var(--rust)">Feb 2027</span><span class="small" style="font-size:15px">Six team leads named</span></li>
    <li><span class="mono" style="color:var(--rust)">Mar 2027</span><span class="small" style="font-size:15px">The cohort of 24 invited; six evenings begin</span></li>
    <li><span class="mono" style="color:var(--rust)">May 2027</span><span class="small" style="font-size:15px">Paper dry run and safety review</span></li>
    <li><span class="mono" style="color:var(--rust)">Jun 2027</span><span class="small" style="font-size:15px;font-weight:600">Two days on the island; pilots published</span></li>
  </ol>
  <div class="grid g3">
    <div class="card card--dashed stack-sm"><p class="eyebrow">Roles open</p><p class="small" style="font-size:15px">Six team leads · a safety lead · a boat that already runs the crossing · a person to keep the watch and merge contributions · a robotics donor with operators.</p></div>
    <div class="card card--dashed stack-sm"><p class="eyebrow">Partners sought</p><p class="small" style="font-size:15px">A harbormaster · a fishing co-op · a fisheries safety body · a volunteer lifeboat station · a surfboat or helicopter training cell · a flag state or death register. None has been asked yet.</p></div>
    <div class="card card--dashed stack-sm"><p class="eyebrow">What we report</p><p class="small" style="font-size:15px">Pilots written, adopted and failed; minutes from surprise to first report; whether pilots are still in use six months on. Never lives saved that nobody counted.</p></div>
  </div>
  <p class="small muted">One-page briefs, plain language, everything marked proposed: <a href="#briefs-co-host-brief-applied-wisdom">for a co-host</a> · <a href="#briefs-partner-one-pager">for a partner</a> · <a href="#briefs-funder-one-pager">for a funder</a>.</p>
</div></section>`;
  }

  /* ---------- the watch ---------- */
  function watchPage(ctx) {
    const { sectionHead } = ctx;
    const stages = [
      ['Reported', 'A release or a news report mentions a drowning, a missing swimmer, an overdue vessel or a capsize.'],
      ['Read', 'A person reads it. Not a model. If it names a person, the name stops here.'],
      ['Row written', 'Water, activity, outcome, minutes if given, source. Blank where the report is silent; never guessed.'],
      ['Matched', 'Checked against other reports of the same event so nothing is counted twice.'],
      ['Published', 'The row joins the register feed with its source. The yearly estimates in the ledger never change because of it: events and estimates are kept apart.']
    ];
    const sources = [
      ['U.S. Coast Guard news releases', 'Searches, rescues, suspended searches, overdue vessels. Official, dated, rarely names the person.', 'https://www.news.uscg.mil/'],
      ['RNLI lifeboat launches and news', 'UK and Ireland. Launches, rescues, lives saved by its own definition.', 'https://rnli.org/news-and-media'],
      ['IOM Missing Migrants Project', 'Deaths and disappearances on migration routes, including sea routes, with a method.', 'https://missingmigrants.iom.int/'],
      ['Royal Life Saving Australia · National Water Safety Forum (UK)', 'Annual national counts with definitions. They correct the ledger, not the watch.', 'https://www.royallifesaving.com.au/'],
      ['Local press and harbor notices', 'Keyword watch: drowned, missing swimmer, overdue, capsized, pulled from the water. Most reports; least reliable; always read by a person.', '']
    ];
    return `
<section class="section" style="padding-bottom:40px"><div class="wrap stack" style="gap:22px">
  <p class="eyebrow">The watch · runs hourly</p>
  <h1 class="display h2" style="max-width:16em">Reported drownings, one at a time, read by a person.</h1>
  <p class="lede" style="max-width:44em">The ledger holds yearly estimates. The register holds events. The watch is where events come from: public feeds read every hour by a scheduled job, filtered for reports that look like a drowning, a search, a capsize or a rescue, and queued for a person to read. The job stores a link, a source, a date and a kind. No headline text and no names. Nobody is named to keep the watch yet; that role is open.</p>
  <div class="row"><a class="btn btn--primary" href="#contribute-offer">Keep the watch</a><a class="btn btn--ghost" href="#register">Open the register</a></div>
</div></section>

<section class="section band" aria-labelledby="pipe-title"><div class="wrap stack" style="gap:24px">
  ${sectionHead('How a report becomes a row', '<span id="pipe-title">Five stages. A person at the one that matters.</span>', '')}
  <ol class="steps" style="grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr))">${stages.map((s, i) => `<li><span class="n">0${i + 1}</span><h3 class="h3">${s[0]}</h3><p class="small" style="font-size:15px">${s[1]}</p></li>`).join('')}</ol>
  <div class="card stack-sm" id="watch-queue"><p class="eyebrow">The queue · loading</p><p class="small" style="font-size:16px">When the watch runs, this is where reports wait to be read. Each shows its stage, its source and its age. Nothing here is a count: a report is a report until a person turns it into a row.</p>
  <div class="queue-empty"><span class="pill pill-D">Reported</span><span class="pill pill-D">Read</span><span class="pill pill-D">Row written</span><span class="pill pill-D">Matched</span><span class="pill pill-D">Published</span></div></div>
</div></section>

<section class="section" aria-labelledby="src-title"><div class="wrap stack" style="gap:24px">
  ${sectionHead('What it would read', '<span id="src-title">Official sources first. Press reports last, and always read by a person.</span>', 'Every source is public. Each one publishes a different thing, so the watch records which kind of report a row came from.')}
  <div class="stack-sm">${sources.map((s) => `<div class="rec"><span class="k">${esc(s[0])}</span><span class="small" style="font-size:15px">${esc(s[1])}</span>${s[2] ? `<a class="small" href="${esc(s[2])}">${esc(s[2].replace(/^https?:\/\//, ''))}</a>` : ''}</div>`).join('')}</div>
  <div class="card card--dashed stack-sm"><p class="eyebrow">One example, from a real release</p><p class="small" style="font-size:16px">U.S. Coast Guard, 9 May 2026: “Coast Guard, partners search for missing swimmer off Maui.” Read by a person, it becomes: <span class="mono">water: sea-coast · activity: swimming · persons_involved: 1 · outcome: missing at time of report · who_responded: Coast Guard and partners · source: USCG release · confidence: medium</span>. The outcome is updated only when a later release reports it. The person’s name is never recorded.</p></div>
</div></section>

<section class="section dark" aria-labelledby="why-title"><div class="wrap stack" style="gap:24px">
  ${sectionHead('Why bother', '<span id="why-title">Two hundred careful rows from one coast are worth more than a global number with no interval.</span>', 'Only 31% of countries record where a drowning happened and 27% record the activity. A watch that records both, for one coast, for one year, is a dataset nobody has.')}
  <div class="grid g3">
    <div class="gap"><p class="eyebrow">For prediction</p><p class="small" style="font-size:15px;color:var(--pale)">Which water, which activity, which month, which temperature. A model needs events with those fields. Estimates cannot give them.</p></div>
    <div class="gap"><p class="eyebrow">For prevention</p><p class="small" style="font-size:15px;color:var(--pale)">A harbor that sees its own last ten events, with minutes to reach, knows what to fix next.</p></div>
    <div class="gap"><p class="eyebrow">For the ledger</p><p class="small" style="font-size:15px;color:var(--pale)">Events never change the yearly estimates. They do show where the estimates are blind.</p></div>
  </div>
</div></section>`;
  }

  /* ---------- the glossary ---------- */
  function glossaryPage() {
    const terms = [
      ['Adopter', 'The organisation that would actually run a change: a harbormaster, a fishing co-op, a crew, a town. A pilot counts only if a real adopter takes it up.'],
      ['Core (count)', 'The modeled number of unintentional drownings, the one WHO reports (about 300,000). It leaves out deaths in boats and ships, floods, and intentional drowning.'],
      ['Estimate, modeled', 'A number produced by a statistical model where deaths are not fully registered. Most countries do not count every death, so the global figure is modeled, not counted.'],
      ['Uncertainty interval (UI)', 'The range a model says the true number probably sits in. “274,200 (252,000–298,000)” means the model’s best guess is 274,200 and it would not be surprised by anything between the two.'],
      ['Floor and ceiling', 'Our lowest and highest documented totals for the toll. The floor adds the lowest documented value of every component; the ceiling adds the highest. Beyond the ceiling the number is unknown, not zero.'],
      ['Grade (A–D)', 'Where a figure comes from, not how true it is. A: an official count or model. B: a peer-reviewed study. C: a press report, a summary, or an organisation’s own statement. D: our own judgment, labelled, with the task that would replace it.'],
      ['ICD-10 W65–W74', 'The codes doctors and registrars use for accidental drowning. Boats (V90, V92), floods (X38) and undetermined intent (Y21) have other codes, which is why they fall outside the core.'],
      ['Vital registration', 'A country’s system for recording every birth and death with a cause. Where it is incomplete, deaths are modeled.'],
      ['The ledger', 'Our table of every figure on the site: what it is, who said it, what year, what it leaves out, and what it must not be added to.'],
      ['The tree', 'A set of questions that starts with the water, then the person, and only then suggests a measure, graded by its evidence.'],
      ['The register', 'A form for recording one event in the water, fatal or not: where, what water, what activity, how long to reach the person, what happened.'],
      ['The watch', 'The place where reported drownings enter the register: official releases and press, read by a person, written as rows.'],
      ['The toll', 'Our best sizing of how many people die in the water each year, shown as a range with the unknown drawn in.'],
      ['Board (the task board)', 'The list of small, well-defined jobs anyone can hand to an AI assistant: verify one figure, find one source, write one row. Each one comes from a gap in the data and says what it unlocks.'],
      ['Bundle', 'The file an assistant hands back after a task: rows, corrections, quotes with page numbers, what it tried, and follow-ups it noticed. One fixed shape, checked by machine before a person reads it.'],
      ['Prompt pack', 'The text that opens in the assistant with one click: the lab’s three rules, the task, its inputs, the checks a reviewer will make, and the exact shape of the answer. Versioned, so a fix to it improves every later hour.'],
      ['Receipt', 'The public record of a reviewed bundle: who lent the hour (by handle), which assistant, the file’s fingerprint, the decision, and what changed in which release. Accepted or not, it is kept.'],
      ['Leeway', 'The movement of a boat or a person through the water caused by the wind on whatever sticks up above it. It differs by object: a person in the water drifts less than a raft. Search planners add it to the current to guess where someone has gone.'],
      ['Pilot', 'A one-page change small enough to run this season, written for a named kind of adopter, with a test for how it fails.'],
      ['The hostile read', 'Teams swap pilot pages and try to break each other’s, in writing. The point is to find the failure before the water does.'],
      ['The forecast', 'A team’s written prediction of how its pilot will run on day two, minute by minute, handed in the night before.'],
      ['Inject', 'A piece of news fed into a drill on purpose: a change of weather, a failed radio, a wrong position. Some of it is bad on purpose.'],
      ['Court sense', 'An Applied Wisdom insight: reading a situation that keeps changing, the way a good player reads a game. On the water: tide, wind, traffic, light.'],
      ['Bad News is Good News', 'An Applied Wisdom insight: the sooner bad news is said aloud, the cheaper it is. The lab times it.'],
      ['Who’s Got the Monkey?', 'An Applied Wisdom insight: every task has exactly one owner, named out loud.'],
      ['The Situation Solver', 'Applied Wisdom’s tool that takes a situation a leader is in and offers ways to look at it, drawn from the eight insights. The lab uses it to debrief the drill.'],
      ['Float plan', 'A note left ashore saying where a boat is going and when it will be back, so a late boat is noticed.'],
      ['VHF channel 16', 'The international distress and calling channel on marine radio. The Coast Guard and nearby vessels listen to it.'],
      ['988', 'The United States suicide and crisis line. Call or text.'],
      ['Flag state', 'The country a vessel is registered in, which is responsible for its safety rules.'],
      ['Cape Town Agreement', 'An international treaty on fishing-vessel safety for vessels 24 metres and over, in force from 24 February 2027. Most fishing deaths happen on smaller boats.'],
      ['Non-fatal drowning', 'Surviving a drowning, often with lasting injury. Where it is counted, emergency departments see two to nearly four survivors for every death, and five to eight among children. There is no global ratio; the often-quoted “four to five per death” was traced to a press article with no source. Never added to death counts.'],
      ['Exposure', 'How many people are actually on the water, and for how long. Without it a death rate per 100,000 residents says nothing about the risk of a trip.'],
      ['Coverage matrix', 'The grid on the Gaps page: for each part of the toll, whether each kind of data is known, partial, a ratio only, or missing.'],
      ['AIS', 'The automatic position broadcast carried by larger vessels. Small craft do not carry it, so they are invisible to it.']
    ];
    return `
<section class="section" style="padding-bottom:40px"><div class="wrap stack" style="gap:20px">
  <p class="eyebrow">Glossary</p>
  <h1 class="display h2" style="max-width:16em">The words on this site, in plain language.</h1>
  <p class="lede" style="max-width:44em">If a word here is still unclear, that is a bug. Tell us: <span class="mono">hello@thelifesavinglab.org</span></p>
</div></section>
<section class="section--tight band"><div class="wrap"><dl class="gloss">${terms.map((t) => `<div class="gloss-row"><dt>${esc(t[0])}</dt><dd>${esc(t[1])}</dd></div>`).join('')}</dl></div></section>`;
  }


  /* ---------- the gaps: a coverage matrix and a first step for each ---------- */
  const COLS = [
    ['count', 'A yearly count'], ['range', 'A published range'], ['country', 'By country'], ['setting', 'By water setting'],
    ['activity', 'By activity'], ['agesex', 'By age and sex'], ['nonfatal', 'Non-fatal events'], ['events', 'Event-level records']
  ];
  /* K known · P partial · R a ratio, range or minimum only · M missing. Each cell carries the reason. */
  const MATRIX = [
    ['Core unintentional drowning', { count: ['K', 'Two models, WHO and IHME, for 2021'], range: ['P', 'IHME prints an interval; the WHO tables do not'], country: ['K', 'Modeled by country by both'], setting: ['M', 'WHO publishes no split by pool, river, lake or sea'], activity: ['M', '27% of countries record the activity'], agesex: ['K', 'Published by age, sex, region and income'], nonfatal: ['R', 'Counted ratios in a few places only (US 2.0, Ontario 3.6 per death at emergency departments; Australia 2.7 admissions); no global ratio'], events: ['M', 'Only 31% of countries record where it happened'] }],
    ['Boats, ferries and ships', { count: ['R', 'One old ferry estimate; nothing for the rest'], range: ['M', 'None'], country: ['P', 'Some national boating statistics (US, UK, Australia)'], setting: ['P', 'Implied by the vessel; coast vs inland rarely coded'], activity: ['P', 'Vessel type in US and some national data'], agesex: ['P', 'National data only'], nonfatal: ['P', 'US injuries counted; little elsewhere'], events: ['P', 'US boating accident database; few others'] }],
    ['Floods and disasters', { count: ['R', '75% of flood deaths, applied to EM-DAT yearly totals'], range: ['M', 'A lab band, not a published one'], country: ['P', 'EM-DAT by event and country, all causes'], setting: ['P', 'Implied: flood water'], activity: ['M', 'Not recorded'], agesex: ['M', 'Not recorded globally'], nonfatal: ['M', 'Not recorded'], events: ['P', 'EM-DAT records events, not people'] }],
    ['Fishing work', { count: ['R', '24,000 to 100,000+, three sources, three decades'], range: ['M', 'No reconciled range'], country: ['P', 'A few flag states keep registers'], setting: ['P', 'Implied: sea, some inland'], activity: ['K', 'By definition'], agesex: ['P', 'National data only'], nonfatal: ['M', 'Not tracked'], events: ['M', 'No global registry; the treaty covers vessels of 24 m and over'] }],
    ['Migrants at sea', { count: ['R', 'A minimum: recorded deaths plus an estimate of unrecorded wrecks'], range: ['P', 'IOM estimates the invisible wrecks separately'], country: ['K', 'By route'], setting: ['K', 'Sea, by route'], activity: ['K', 'By definition: a crossing'], agesex: ['P', 'Where bodies are recovered'], nonfatal: ['M', 'Survivors not counted as such'], events: ['K', 'IOM records each incident with a method'] }],
    ['Intentional and undetermined', { count: ['M', 'Not reproduced from a primary table'], range: ['M', 'None'], country: ['P', 'WHO mortality database holds the codes for reporting countries'], setting: ['M', 'Not recorded'], activity: ['M', 'Not applicable'], agesex: ['P', 'Where reported'], nonfatal: ['M', 'Not counted'], events: ['M', 'None'] }],
    ['People on the water (exposure)', { count: ['M', 'Nobody counts trips, hours or launches'], range: ['M', 'None'], country: ['M', 'A few boat-registration counts; not use'], setting: ['M', 'None'], activity: ['M', 'None'], agesex: ['M', 'None'], nonfatal: ['M', 'Not applicable'], events: ['P', 'AIS tracks larger vessels; small craft are invisible'] }]
  ];
  const CELL = { K: ['Known', 'var(--navy)', 'var(--paper)'], P: ['Partial', '#8FA9B8', 'var(--ink)'], R: ['Ratio, range or minimum only', 'var(--brass)', 'var(--ink)'], M: ['Missing', 'transparent', 'var(--muted)'] };
  function coverageMatrix() {
    const head = `<tr><th scope="col" style="min-width:200px">What we have</th>${COLS.map((c) => `<th scope="col" style="white-space:normal;min-width:96px">${c[1]}</th>`).join('')}</tr>`;
    const rows = MATRIX.map((r) => `<tr><th scope="row" style="white-space:normal;font-family:var(--sans);font-size:15px;text-transform:none;letter-spacing:0;color:var(--ink);font-weight:600">${esc(r[0])}</th>${COLS.map((c) => { const v = r[1][c[0]]; const st = CELL[v[0]]; return `<td style="padding:6px"><div class="mcell" title="${esc(st[0])}: ${esc(v[1])}" style="background:${st[1]};color:${st[2]};${v[0] === 'M' ? 'border:1.5px dashed #8E8670;' : ''}"><span class="sr">${esc(st[0])}: </span>${v[0] === 'M' ? '—' : v[0]}<span class="sr">. ${esc(v[1])}</span></div></td>`; }).join('')}</tr>`).join('');
    return `<div style="min-width:0;max-width:100%;overflow:hidden"><div class="tscroll"><table class="data matrix" aria-label="Coverage matrix: for each component of the toll, whether each kind of data is known, partial, a ratio only, or missing"><thead>${head}</thead><tbody>${rows}</tbody></table></div></div>
<p class="legend"><span><i style="background:var(--navy)"></i>K · known</span><span><i style="background:#8FA9B8"></i>P · partial</span><span><i style="background:var(--brass)"></i>R · a ratio, range or minimum only</span><span><i style="border:1.5px dashed #8E8670"></i>— · missing</span><span class="mono">HOVER OR TAB TO A CELL FOR THE REASON</span></p>`;
  }
  const GAPS = [
    { t: 'Nobody counts how many people are on the water', why: 'Every rate on this site is per 100,000 residents. Risk per trip, per hour or per launch is unknown everywhere, so no rate here is a risk. Prediction cannot start without it.', step: 'Count launches at one ramp and one harbor for one season with a clicker and a clipboard; pair it with AIS tracks for larger vessels. Publish trips per week by craft type.', who: 'A harbormaster and two students; the June Signal team', unlocks: 'The first risk-per-trip figure for one piece of water', rows: ['exposure-denominators'], type: 'register' },
    { t: 'No global yearly count for deaths in boats, ferries and ships', why: 'One ferry estimate from 2014; nothing for shipping or small craft. The largest unmeasured piece of the toll.', step: 'Ask the Worldwide Ferry Safety Association for its database totals by year. Add the national boating counts that exist (US, UK, Australia, Canada) as rows. Build a transport sub-ledger from ten countries with good registers and say what it does not cover.', who: 'A data contributor with a weekend; a maritime-studies student', unlocks: 'A documented floor for boats instead of a dashed line', rows: ['ferry-wfsa', 'water-transport-other', 'uscg-bard'], type: 'row' },
    { t: 'Fishing deaths: 24,000 to 100,000+, and no one knows how much is already inside WHO’s figure', why: 'The ceiling of the toll assumes none of it is; the floor assumes all of it is. That one unknown is most of the gap between 260,000 and 415,000.', step: 'Pick one country with complete death records and a real fleet (Norway, Iceland, Australia, the US). For one year, count fisher deaths coded as drowning against those coded as water transport. Publish the share with the codes.', who: 'A public-health student with access to cause-of-death data', unlocks: 'Turns a 0–100,000 band into an estimate with a method', rows: ['fishing-ilo-1999', 'fishing-fsf-100000', 'icd-definition'], type: 'row' },
    { t: 'No published split by water setting', why: 'Pool, bath, river, lake, sea. WHO does not publish one. Without it, nobody can say which branch of the tree is biggest.', step: 'Compile the national splits that exist: Australia publishes by location, the UK by inland and coastal, the US by place code. Build a first split for countries that count, labelled as such, and show how far it is from global. Started: Australia (coastal 43%, inland 34%, pools 10%) and the UK (61% inland) are in the ledger.', who: 'A data contributor; one evening per country', unlocks: 'A first answer to “which water?” at national scale', rows: ['australia-location-2024-25', 'uk-waid-2024', 'who-data-gaps'], type: 'row' },
    { t: 'Only 31% of countries record where a drowning happened, and 27% record the activity', why: 'The two fields a model needs most are the two most often blank.', step: 'Run the register in one harbor for one season: 24 columns, filled only where known. Publish 200 rows with no names.', who: 'A harbormaster and the June register team', unlocks: 'The first event-level dataset with minutes to reach the person', rows: ['who-data-gaps', 'uscg-bard'], type: 'register' },
    { t: 'Survivors are not counted', why: 'A few places count them (the United States and Ontario at emergency departments, Australia at hospitals) and the ratios differ by place and by door; there is no global ratio, and almost no register records survivors.', step: 'Ask one hospital or ambulance service for de-identified counts of drowning-coded visits for one coast, by month. Pair them with the register for the same water.', who: 'A nursing or public-health student and a hospital partner', unlocks: 'The 4–5 ratio tested locally, and the first non-fatal series for a harbor', rows: ['who-nonfatal'], type: 'offer' },
    { t: 'Flood drownings are a band we drew ourselves', why: '75% of flood-disaster deaths are drownings, says WHO. We applied that to one year of EM-DAT and drew 3,000–8,000.', step: 'Compute 75% of EM-DAT flood deaths for every year 2010–2024 and publish the series. EM-DAT is free for research use.', who: 'Anyone with an afternoon and an EM-DAT login', unlocks: 'A sourced row that retires a lab judgment', rows: ['flood-drowning-band', 'emdat-flood-deaths-2019'], type: 'row' },
    { t: 'Intentional drowning is a blank', why: 'A different problem with different prevention, but a blank is still a blank.', step: 'Pull the WHO Mortality Database counts for the intentional and undetermined codes (X71, Y21) for reporting countries, and label the row “reporting countries only”.', who: 'A student with a week', unlocks: 'An honest partial row instead of nothing', rows: ['intentional-drowning', 'icd-definition'], type: 'row' },
    { t: 'Five regional figures rest on a secondary source', why: 'The Western Pacific figure comes from WHO’s regional office. The other five were summarised by a news site and need the report table.', step: 'Open the WHO 2024 report, find the regional table, check five numbers, file five verifications.', who: 'Anyone, one hour', unlocks: 'A region chart that can be cited', rows: ['who-region-sear', 'who-region-afr', 'who-region-emr', 'who-region-amr', 'who-region-eur'], type: 'correction' }
  ];
  function gapsPage(ctx) {
    const { sectionHead, ledgerLink } = ctx;
    return `
<section class="section" style="padding-bottom:40px"><div class="wrap stack" style="gap:22px">
  <p class="eyebrow">The gaps</p>
  <h1 class="display h2" style="max-width:17em">What the world knows about drowning, cell by cell. Most of the cells are empty.</h1>
  <p class="lede" style="max-width:44em">A good dataset answers eight questions: how many, how sure, where, which water, doing what, who, how many survived, and what happened each time. Here is how each part of the toll scores. The empty cells are the lab’s work list, and each one comes with a first step someone could take this season.</p>
</div></section>
<section class="section--tight band"><div class="wrap stack" style="gap:18px">${coverageMatrix()}
  <p class="small muted">Every cell’s reason comes from a ledger row. Disagree with a cell? <a href="#contribute-correction">Say so.</a></p></div></section>
<section class="section" aria-labelledby="first-title"><div class="wrap stack" style="gap:28px">
  ${sectionHead('Nine gaps, nine first steps', '<span id="first-title">None of these needs a new agency. Each needs one person and a season.</span>', 'Ordered by how much of the range each one would close. The first is the one nobody talks about.')}
  <div class="stack" style="gap:16px">${GAPS.map((g, i) => `
<div class="gapcard">
  <div class="gapcard-n mono">${i + 1}</div>
  <div class="stack-sm" style="min-width:0">
    <p class="h4">${esc(g.t)}</p>
    <p class="small" style="font-size:15px">${esc(g.why)}</p>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:12px;margin-top:4px">
      <div class="gapstep"><span class="eyebrow">First step</span><span class="small" style="font-size:15px">${esc(g.step)}</span></div>
      <div class="gapstep"><span class="eyebrow">Who could do it</span><span class="small" style="font-size:15px">${esc(g.who)}</span></div>
      <div class="gapstep"><span class="eyebrow">What it unlocks</span><span class="small" style="font-size:15px">${esc(g.unlocks)}</span></div>
    </div>
    <div class="row" style="align-items:center;gap:8px 18px"><span class="mono muted">Rows: ${g.rows.map(ledgerLink).join(', ')}</span><a class="btn btn--sm btn--ghost" href="${g.type === 'register' ? '#register' : '#contribute-' + g.type}">${g.type === 'register' ? 'Open the register' : 'Take this one'}</a></div>
  </div>
</div>`).join('')}</div>
</div></section>
<section class="section dark"><div class="wrap stack" style="gap:20px">
  <h2 class="display h2" style="max-width:16em">When the cells fill, the range narrows. That is how the lab keeps score.</h2>
  <p class="lede">Every merged row that turns a dashed cell solid is published with the name of the person who closed it. The toll page redraws itself from the ledger, so the floor and the ceiling move the day the data does.</p>
  <div class="row"><a class="btn btn--primary" href="#contribute">Close a gap</a><a class="btn btn--ghost" href="#ledger">The ledger</a></div>
</div></section>`;
  }

  /* ---------- the frontier: AI and robotics, held to a harbor's standard ---------- */
  function frontierSection(full) {
    const tries = [
      ['Drift, from measured currents', 'Search planners model where a person drifts. Radar-measured surface currents are about six times more accurate than modelled ones and can cut a search area by two-thirds. The lab’s drift team builds a one-page drift sheet from live current data and tests it against a float.', 'hf-radar-search-area'],
      ['A drone that finds a float in chop', 'Finding a head-sized object in a seaway is the hard part of every search. Teams fly a donated drone with open-source detection against a marked float, log every miss, and publish the false-alarm rate.', null],
      ['A sea robot that carries flotation', 'The first minutes decide most outcomes. Can a small uncrewed craft reach a person with flotation before a crewed boat launches? The lab stages it, times it, and says whether it would have mattered.', null],
      ['Agents that read the harbor', 'A late-boat watch is a person with a list. The lab tests whether an open-source model reading a harbor’s radio log, float plans and AIS can flag an overdue boat earlier, and how often it cries wolf.', null],
      ['The Situation Solver, under a clock', 'Applied Wisdom’s Solver runs the debrief. The lab is a testbed for its open-source, agentic version, with consenting students and no personal data.', null]
    ];
    const bar = `<div class="grid g3">
      <div class="card stack-sm" style="border-top:4px solid var(--buoy)"><p class="eyebrow">The test</p><p class="small" style="font-size:16px">Would a crew use it at 2 a.m. in the rain? Did it fail safe? Did it beat the clipboard?</p></div>
      <div class="card stack-sm" style="border-top:4px solid var(--ink)"><p class="eyebrow">The rules</p><p class="small" style="font-size:16px">Nobody enters the water. Licensed operators run anything that flies or floats. Every result is published, including the misses.</p></div>
      <div class="card stack-sm" style="border-top:4px solid var(--ink)"><p class="eyebrow">The record</p><p class="small" style="font-size:16px">Code, data and failure logs are open from day one. The next cohort starts from this one’s misses.</p></div>
    </div>`;
    if (!full) return bar;
    return `${bar}
<div class="stack-sm" style="margin-top:8px"><h3 class="h4">What the first cohort will try</h3>
<div class="stack" style="gap:0">${tries.map((t, i) => `<div class="rec"><span class="k">0${i + 1}</span><span style="font-weight:600">${esc(t[0])}</span><span class="small" style="font-size:15px">${esc(t[1])}</span>${t[2] ? `<span class="mono muted">Row: <a href="#ledger-${t[2]}">${t[2]}</a></span>` : ''}</div>`).join('')}</div></div>
<p class="small muted">The robots and drones are sought from a donor, with operators. None is confirmed. A tool that no one would use on a bad night is published as a failure, which is also a result.</p>`;
  }

  /* ---------- who we're looking for ---------- */
  function selectionSection(full) {
    const criteria = [
      ['Judgment with half the facts', 'You decide and act when the information is incomplete, and you can say afterwards what you knew and what you guessed.'],
      ['Ownership', 'You have said “that was my mistake” out loud, and then fixed it.'],
      ['Appetite for bad news', 'You want to hear what is wrong early. The lab times how fast bad news travels.'],
      ['Builds, or convenes', 'You can make something work (code, data, hardware), or you can get people who disagree into one room. Both count. Neither is enough alone.'],
      ['Finishes', 'Something you started exists in the world and someone else uses it.']
    ];
    const head = `<div class="stack-sm"><p class="eyebrow">Who we’re looking for</p><h2 class="display h2">Twenty-four seats. The bar is high because the stakes are real.</h2><p class="lede">We select for judgment, not résumés. Students from any discipline and any of the three schools, chosen for how they decide when the facts are incomplete and for what they have finished. No more than ten from one school. At least a third with no leadership title on their record yet.</p></div>`;
    if (!full) return head + `<div class="row"><a class="btn btn--primary" href="#june">How selection works</a></div>`;
    return `${head}
<div class="grid g2" style="gap:24px">
  <div class="stack-sm"><h3 class="h4">Five things we weigh, equally</h3><div class="stack" style="gap:0">${criteria.map((c, i) => `<div class="rec"><span class="k">0${i + 1}</span><span style="font-weight:600">${esc(c[0])}</span><span class="small" style="font-size:15px">${esc(c[1])}</span></div>`).join('')}</div></div>
  <div class="stack" style="gap:14px">
    <div class="card stack-sm"><p class="eyebrow">How it works</p><ol class="small" style="font-size:15px;padding-left:20px;display:flex;flex-direction:column;gap:6px"><li>300 words on a decision you got wrong, and what you did about it.</li><li>A 20-minute online team exercise with people you have not met, scored by two reviewers on one rubric.</li><li>A conversation for finalists, with a practitioner in the room.</li><li>Six teams of four, built for different skills, not similar ones.</li></ol></div>
    <div class="card stack-sm card--dashed"><p class="eyebrow">Who should not apply</p><p class="small" style="font-size:15px">Anyone who wants a line on a CV more than a verdict on a page. Two days of this is two days of being told, in writing, how your idea fails.</p></div>
    <div class="card stack-sm" style="border-top:4px solid var(--buoy)"><p class="eyebrow">What you leave with</p><p class="small" style="font-size:15px">A published pilot with your name on it. A verdict from someone who works the water. Mentors from Applied Wisdom. Standout participants may be invited to paid project work with partner organisations; this is said at the start, not discovered at the end.</p></div>
  </div>
</div>`;
  }

  const KINDS = { 'search-suspended': 'Search suspended', 'search-underway': 'Search under way', rescue: 'Rescue', capsize: 'Capsize or sinking', overboard: 'Person overboard', 'drowning-reported': 'Drowning reported', 'migrant-crossing': 'Migrant crossing', flood: 'Flood' };
  const STAGES = { reported: 'Reported', read: 'Read', 'row-written': 'Row written', matched: 'Matched', published: 'Published', dismissed: 'Dismissed' };
  async function mountWatch() {
    const host = document.getElementById('watch-queue'); if (!host) return;
    let feed = null;
    try { const r = await fetch('data/watch-feed.json'); if (r.ok) feed = await r.json(); } catch { feed = null; }
    if (!feed || !feed.generated) {
      host.innerHTML = `<p class="eyebrow">The queue · no run yet</p><p class="small" style="font-size:16px">The job is scheduled but has not written a feed yet, or this copy of the site has not been synced. The live queue is in the open-data repository under <span class="mono">watch/queue.json</span>.</p>`;
      return;
    }
    const age = (iso) => { if (!iso) return '—'; const h = Math.round((Date.now() - Date.parse(iso)) / 3600000); return h < 1 ? 'under an hour' : h < 48 ? h + ' h' : Math.round(h / 24) + ' d'; };
    const c = feed.counts || {};
    const srcs = Object.entries(feed.sources || {}).map(([k, v]) => `<span class="pill ${v === 'ok' ? 'pill-A' : 'pill-C'}">${esc(k)} · ${esc(v)}</span>`).join(' ');
    const rows = (feed.items || []).slice(0, 25).map((i) => `<div class="rec" style="gap:4px"><span class="row" style="gap:8px;align-items:center"><span class="pill pill-wis">${esc(KINDS[i.kind] || i.kind)}</span><span class="pill pill-${i.stage === 'reported' ? 'D' : 'C'}">${esc(STAGES[i.stage] || i.stage)}</span><span class="mono muted">${esc(i.source)} · ${esc(i.region || '')} · ${age(i.published || i.first_seen)} ago</span></span><a class="small" href="${esc(i.link)}">Read the report at its source →</a></div>`).join('');
    host.innerHTML = `<p class="eyebrow">The queue · ${c.reported || 0} waiting to be read · synced ${esc((feed.generated || '').slice(0, 16).replace('T', ' '))} UTC</p>
      <p class="small" style="font-size:16px">Each report is a link, a source, a date and a kind. Nothing here is a count: a report is a report until a person turns it into a row. ${c.held ? `${c.held} held because the publisher’s own text looked like it named someone.` : ''}</p>
      <div class="row" style="gap:6px">${srcs}</div>
      <div class="stack" style="gap:0">${rows || '<p class="small muted">Nothing waiting. The next run is within the hour.</p>'}</div>
      <p class="small muted">Stages: ${Object.values(STAGES).join(' → ')}. The full queue and the review tool are in the open-data repository.</p>`;
  }

  window.Extra = { counterBlock, startCounter, stopCounter, junePage, watchPage, glossaryPage, gapsPage, frontierSection, selectionSection, coverageMatrix, mountWatch };
})();
