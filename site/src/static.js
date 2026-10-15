/* The static pages (history, the span, the cohort, the compact, the stations) share the site's chrome but not its router.
   This keeps the phone menu, fills the colophon and runs the counters from the same data files the app uses. */
(function () {
  const menuBtn = document.getElementById('menu-btn'), navlinks = document.getElementById('navlinks');
  function setMenu(open) { if (!menuBtn || !navlinks) return; navlinks.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', String(open)); }
  if (menuBtn) {
    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); } });
  }
  const here = location.pathname.replace(/\/+$/, '').split('/').pop();
  document.querySelectorAll('#navlinks a, .brand').forEach((a) => { const on = a.dataset.route === here; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); });

  const get = (p) => fetch(p).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const set = (k, v) => document.querySelectorAll(`[data-foot="${k}"]`).forEach((el) => { el.textContent = v; });
  Promise.all([get('/data/ledger.json'), get('/data/toll.json'), get('/data/tasks.json'), get('/data/receipts.json')]).then(([ledger, toll, tasks, receipts]) => {
    if (ledger) { set('version', 'v' + ledger.version); set('rows', ledger.rows.length.toLocaleString('en-US')); }
    if (tasks) set('open', String(tasks.tasks.filter((t) => t.status !== 'done' && !(t.claimed_until && Date.parse(t.claimed_until) > Date.now())).length));
    if (receipts) set('receipts', String(receipts.receipts.length));
    if (toll && window.Extra) window.Extra.startCounter(toll);
  });
})();
