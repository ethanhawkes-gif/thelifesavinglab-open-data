/* The briefs: one page each for a co-host, a partner and a funder, written in docs/briefs and rendered here at build time. */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ORDER = ['co-host-brief-applied-wisdom', 'partner-one-pager', 'funder-one-pager'];
  const LABEL = { 'co-host-brief-applied-wisdom': 'For a co-host', 'partner-one-pager': 'For a partner', 'funder-one-pager': 'For a funder' };
  const REPO = 'https://github.com/ethanhawkes-gif/thelifesavinglab-open-data';
  let cache = null;
  function page(ctx, arg) {
    const { sectionHead } = ctx;
    return `
<section class="section" style="padding-bottom:36px"><div class="wrap stack" style="gap:22px">
  <p class="eyebrow">Briefs · one page each</p>
  <h1 class="display h1" style="max-width:14em">What we are asking, in one page, for the person we are asking.</h1>
  <p class="lede" style="max-width:44em">Plain language. Everything is proposed unless it says otherwise, nobody has been contacted unless it says so, and every figure is an estimate until a quote replaces it. The same text lives in the repository, where a change to it is a visible commit.</p>
  <div class="row" id="brief-tabs"></div>
</div></section>
<section class="section--tight band"><div class="wrap"><article id="brief-body" class="stack" style="gap:18px;max-width:52em"><p class="small muted">Loading…</p></article></div></section>
<section class="section--tight"><div class="wrap">${sectionHead('Also', 'The data behind every number here.', 'The estimate on the funder page is the deck’s; the toll, the ledger and the tree are the site’s. Nothing on a brief is a figure the ledger does not hold.')}<div class="row" style="margin-top:18px"><a class="btn btn--ghost" href="#toll">The toll</a><a class="btn btn--ghost" href="#june">The June lab</a><a class="btn btn--ghost" href="#harbor">This water</a></div></div></section>`;
  }
  function show(id) {
    const items = cache ? cache.items : [];
    const item = items.find((b) => b.id === id) || items[0];
    const tabs = document.getElementById('brief-tabs'); const body = document.getElementById('brief-body'); if (!tabs || !body) return;
    tabs.innerHTML = ORDER.filter((k) => items.some((b) => b.id === k)).map((k) => `<a class="btn btn--sm ${item && item.id === k ? '' : 'btn--ghost'}" href="#briefs-${esc(k)}">${esc(LABEL[k] || k)}</a>`).join('');
    if (!item) { body.innerHTML = '<p class="notice"><span class="eyebrow">No briefs loaded</span><br>They are in <span class="mono">docs/briefs/</span> in the repository.</p>'; return; }
    body.innerHTML = `<p class="eyebrow">${esc(LABEL[item.id] || '')}</p><h2 class="display h2">${esc(item.title)}</h2>${item.html}<p class="small muted" style="padding-top:12px;border-top:1px solid var(--line)">Source: <a href="${REPO}/blob/main/${esc(item.source)}">${esc(item.source)}</a> · to change it, open a pull request.</p>`;
    document.title = `${item.title} · The Life-Saving Lab`;
  }
  function mount(ctx, arg) {
    if (cache) { show(arg); return; }
    fetch('data/briefs.json').then((r) => r.json()).then((d) => { cache = d; show(arg); }).catch(() => { cache = { items: [] }; show(arg); });
  }
  window.Briefs = { page, mount };
})();
