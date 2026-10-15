/* Charts for The Life-Saving Lab. Every chart is drawn from the data files; nothing here holds a number. */
(function () {
  const fmt = (n) => n == null ? '' : Math.round(n).toLocaleString('en-US');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const roundK = (n) => n >= 100000 ? Math.round(n / 5000) * 5000 : n >= 10000 ? Math.round(n / 1000) * 1000 : Math.round(n / 100) * 100;

  /* The whole toll on one linear scale from zero: a solid floor, a striped band of what could be, hatching for the unknown. */
  function tollBar(toll, opts) {
    opts = opts || {};
    const max = opts.max || 480000;
    const f = toll.floor, c = toll.ceiling;
    const pf = (f / max) * 100, pc = (c / max) * 100;
    const who = toll.layers.find((l) => l.id === 'core');
    const pw = (who.high / max) * 100;
    const H = opts.compact ? 40 : 46;
    const big = opts.compact ? 28 : 34;
    const ticks = [0, 100000, 200000, 300000, 400000].map((t) => `<span style="left:${(t / max) * 100}%">${t === 0 ? '0' : (t / 1000) + 'k'}</span>`).join('');
    return `
<figure class="tollbar" role="img" aria-label="The global drowning toll on one scale from zero: at least about ${fmt(roundK(f))} a year from the documented floor, up to about ${fmt(roundK(c))} from documented components, and unknown beyond that.">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px 24px;flex-wrap:wrap;padding-bottom:10px">
    <div style="min-width:0"><div class="mono" style="color:var(--muted)">AT LEAST · THE FLOOR</div><div style="font-family:var(--serif);font-size:${big}px;line-height:1.05">~${fmt(roundK(f))}</div></div>
    <div style="min-width:0;text-align:right"><div class="mono" style="color:var(--muted)">UP TO · FROM WHAT IS DOCUMENTED</div><div style="font-family:var(--serif);font-size:${big}px;line-height:1.05">~${fmt(roundK(c))}</div></div>
  </div>
  <div style="position:relative;height:${H + 30}px">
    <div style="position:absolute;left:0;right:0;top:0;height:${H}px;background:repeating-linear-gradient(135deg,#D8D1BF 0 6px,transparent 6px 14px);border-radius:2px;overflow:hidden">
      <div style="position:absolute;inset:0;background:linear-gradient(to right,transparent ${pc}%,var(--ground) 100%);opacity:.6"></div>
    </div>
    <div style="position:absolute;left:${pf}%;width:${pc - pf}%;top:0;height:${H}px;background:repeating-linear-gradient(135deg,var(--teal) 0 7px,#6C9DA8 7px 12px)"></div>
    <div style="position:absolute;left:0;width:${pf}%;top:0;height:${H}px;background:var(--navy)"></div>
    <div style="position:absolute;left:${pf}%;top:-8px;height:${H + 16}px;border-left:2px solid var(--ink)"></div>
    <div style="position:absolute;left:${pc}%;top:-8px;height:${H + 16}px;border-left:2px solid var(--ink)"></div>
    <div style="position:absolute;left:${pw}%;top:-4px;height:${H + 8}px;border-left:2px dashed var(--brass)"></div>
    <div class="mono" style="position:absolute;left:${pw}%;top:${H + 10}px;transform:translateX(-50%);color:#8A6A1F;white-space:nowrap">WHO 2021 · ${fmt(who.high)}</div>
  </div>
  <div class="axis" aria-hidden="true">${ticks}</div>
  <figcaption class="legend" style="margin-top:8px">
    <span><i style="background:var(--navy)"></i>Floor: the lowest documented value of each component</span>
    <span><i style="background:repeating-linear-gradient(135deg,var(--teal) 0 3px,#6C9DA8 3px 6px)"></i>Could be: up to each component's highest documented value</span>
    <span><i style="background:repeating-linear-gradient(135deg,#D8D1BF 0 3px,transparent 3px 6px)"></i>Beyond the ceiling: unknown, not zero</span>
  </figcaption>
</figure>`;
  }

  /* Each component on a log scale, so 800 and 300,000 can share one chart and every number is also printed. */
  function layerStrips(toll, rowsById) {
    const lo = Math.log10(100), hi = Math.log10(500000);
    const p = (v) => Math.max(0, Math.min(100, ((Math.log10(Math.max(v, 100)) - lo) / (hi - lo)) * 100));
    const ticks = [1000, 10000, 100000, 300000];
    const tickHtml = ticks.map((t) => `<span style="left:${p(t)}%">${t >= 1000 ? (t / 1000) + 'k' : t}</span>`).join('');
    const rows = toll.layers.map((l) => {
      const pill = `<span class="pill pill-${l.status}">${l.status === 'minimum' ? 'minimum' : l.status}</span>`;
      let strip;
      if (l.low == null) {
        strip = `<div class="strip" style="position:relative"><div style="position:absolute;left:0;right:0;top:12px;border-top:2px dashed #8E8670"></div><div class="mono" style="position:absolute;left:0;top:-2px;background:var(--ground);padding-right:8px;color:var(--muted)">NO GLOBAL YEARLY SERIES</div></div>`;
      } else {
        const a = l.low <= 0 ? 0 : p(l.low), b = p(l.high);
        const open = l.low <= 0 ? `<div style="position:absolute;left:0;top:4px;height:20px;width:${b}%;background:repeating-linear-gradient(135deg,var(--brass) 0 6px,transparent 6px 10px)"></div>` : '';
        const solid = l.low <= 0 ? '' : `<div style="position:absolute;left:${a}%;width:${Math.max(b - a, 0.6)}%;top:4px;height:20px;background:${l.status === 'modeled' ? 'var(--navy)' : l.status === 'minimum' ? 'var(--teal)' : '#8FA9B8'}"></div>`;
        strip = `<div class="strip" style="position:relative;background:repeating-linear-gradient(to right,transparent 0,transparent calc(27% - 1px),var(--line) calc(27% - 1px),var(--line) 27%)">${open}${solid}</div>`;
      }
      const num = l.low == null ? '—' : l.low === l.high ? fmt(l.low) : `${fmt(l.low)}–${fmt(l.high)}`;
      const inside = l.inside_core === true ? 'the core itself' : l.inside_core === 'unknown' ? 'overlap with the core unknown' : 'outside the core';
      const srcs = (l.rows || []).map((id) => { const r = rowsById[id]; return r ? `<a href="#ledger-${esc(id)}" title="${esc(r.source)}">${esc(id)}</a>` : esc(id); }).join(', ');
      return `
<div style="display:grid;grid-template-columns:minmax(0,1fr);gap:8px;padding:16px 0;border-top:1px solid var(--line)">
  <div style="display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center">
    <span style="font-weight:600">${esc(l.label)}</span>${pill}
    <span class="mono" style="color:var(--muted)">${inside}</span>
  </div>
  <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center">
    ${strip}
    <span style="font-family:var(--mono);font-size:14px;font-variant-numeric:tabular-nums;white-space:nowrap">${num}</span>
  </div>
  <p class="small muted">${esc(l.note)} <span class="mono">Rows: ${srcs}</span></p>
</div>`;
    }).join('');
    return `<div role="img" aria-label="Each component of the toll as a range on a logarithmic scale: ${toll.layers.map((l) => l.label + ' ' + (l.low == null ? 'unknown' : fmt(l.low) + ' to ' + fmt(l.high))).join('; ')}.">
<div class="axis" aria-hidden="true" style="height:18px"><span style="left:0">100</span>${tickHtml}</div>
${rows}
<p class="mono muted" style="padding-top:10px;border-top:1px solid var(--line)">LOG SCALE: EACH TICK IS TEN TIMES THE LAST, SO SMALL AND LARGE COMPONENTS CAN SHARE ONE CHART. EVERY VALUE IS ALSO PRINTED.</p></div>`;
  }

  /* Three published estimates of the core, on one axis from zero. */
  function estimates(rows) {
    const max = 320000;
    const items = [
      { id: 'who-ghe-2021', label: 'WHO Global Health Estimates · 2021', color: 'var(--navy)' },
      { id: 'ihme-gbd-2021', label: 'IHME Global Burden of Disease · 2021', color: 'var(--teal)' },
      { id: 'who-ghe-2019', label: 'WHO Global Health Estimates · 2019', color: 'var(--slate)' }
    ];
    const bars = items.map((it) => {
      const r = rows[it.id]; if (!r) return '';
      const val = it.id === 'ihme-gbd-2021' ? 274200 : r.high;
      const w = (val / max) * 100;
      const ui = it.id === 'ihme-gbd-2021' ? `<div style="position:absolute;left:${(r.low / max) * 100}%;width:${((r.high - r.low) / max) * 100}%;top:2px;height:44px;border:2px solid var(--ink)"></div>` : '';
      return `
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 24px">
  <div style="flex:1 1 240px;min-width:0"><p style="font-weight:600;font-size:16px">${esc(it.label)}</p><p class="mono muted"><b style="font-weight:500;color:var(--ink)">${fmt(val)}</b> · ${esc(it.id === 'ihme-gbd-2021' ? '95% UI ' + fmt(r.low) + '–' + fmt(r.high) : it.id === 'who-ghe-2019' ? 'older year and model' : 'point estimate')}</p></div>
  <div style="flex:3 1 380px;min-width:0;position:relative;height:48px;border-left:2px solid var(--ink);background:repeating-linear-gradient(to right,transparent 0,transparent calc(25% - 1px),#D8D1BF calc(25% - 1px),#D8D1BF 25%)">
    <div style="position:absolute;left:0;top:9px;height:30px;width:${w}%;background:${it.color}"></div>${ui}
  </div>
</div>`;
    }).join('');
    return `<div role="img" aria-label="Three global estimates of unintentional drowning on one axis from zero: WHO 2021, 300,228; IHME/GBD 2021, 274,200 with a 95% uncertainty interval of 252,000 to 298,000; WHO 2019, 235,642." style="display:flex;flex-direction:column;gap:18px">
${bars}
<div style="display:flex;flex-wrap:wrap;gap:0 24px"><div style="flex:1 1 240px"></div><div class="axis" aria-hidden="true" style="flex:3 1 380px;min-width:0"><span style="left:0">0</span><span style="left:25%">80k</span><span style="left:50%">160k</span><span style="left:75%">240k</span><span style="left:100%">320k</span></div></div>
</div>`;
  }

  function hbars(items, max, opts) {
    opts = opts || {};
    return items.map((it) => `
<div style="display:grid;grid-template-columns:${opts.labelW || '160px'} minmax(0,1fr) auto;gap:12px;align-items:center;padding:8px 0;border-top:1px solid var(--line)">
  <div style="font-size:15px;line-height:1.3">${it.label}</div>
  <div style="position:relative;height:26px;border-left:2px solid var(--ink)"><div style="position:absolute;left:0;top:3px;height:20px;width:${(it.value / max) * 100}%;background:${it.color || 'var(--navy)'}"></div></div>
  <div style="font-family:var(--mono);font-size:14px;font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap">${it.text}</div>
</div>`).join('');
  }

  function income(rows) {
    const ids = ['who-income-low', 'who-income-lower-middle', 'who-income-upper-middle', 'who-income-high'];
    const labels = { 'who-income-low': 'Low income', 'who-income-lower-middle': 'Lower-middle', 'who-income-upper-middle': 'Upper-middle', 'who-income-high': 'High income' };
    const rates = { 'who-income-low': 5.8, 'who-income-lower-middle': 4.9, 'who-income-upper-middle': 3.2, 'who-income-high': 1.7 };
    const items = ids.map((id) => { const r = rows[id]; return { label: labels[id], value: rates[id], text: `${rates[id]} · ${fmt(r.high)}` }; });
    return `<div role="img" aria-label="Drowning death rate by country income group, 2021: low 5.8, lower-middle 4.9, upper-middle 3.2, high 1.7 per 100,000.">${hbars(items, 6, { labelW: '120px' })}<div class="axis" aria-hidden="true" style="margin-left:132px;margin-right:110px"><span style="left:0">0</span><span style="left:50%">3</span><span style="left:100%">6</span></div><p class="mono muted" style="margin-top:4px">DEATHS PER 100,000 · DEATHS</p></div>`;
  }

  function regions(rows) {
    const ids = ['who-region-wpr', 'who-region-sear', 'who-region-afr', 'who-region-emr', 'who-region-amr', 'who-region-eur'];
    /* Change in the death rate 2000–2021 by region, from row who-trend-2000-2021 (WHO 2024 report, p. 17, Fig. 6). */
    const trend = { 'who-region-wpr': -38, 'who-region-sear': -48, 'who-region-afr': -3, 'who-region-emr': -21, 'who-region-amr': -38, 'who-region-eur': -68 };
    const items = ids.map((id) => {
      const r = rows[id]; if (!r) return null;
      const verify = r.grade === 'C' ? ' <span class="pill pill-C" title="Secondary source; verify against the WHO report table">verify</span>' : ' <span class="pill pill-A">WHO</span>';
      const since = rows['who-trend-2000-2021'] && trend[id] != null ? `<span class="muted" style="display:block;font-size:11px;white-space:normal;line-height:1.2">rate ${trend[id]}% since 2000</span>` : '';
      return { label: esc(r.geography) + verify, value: r.high, text: (r.grade === 'C' ? '~' : '') + fmt(r.high) + since, color: r.grade === 'C' ? '#8FA9B8' : 'var(--navy)' };
    }).filter(Boolean);
    const alt = ids.map((id) => rows[id] ? `${rows[id].geography} ${fmt(rows[id].high)}` : null).filter(Boolean).join('; ');
    return `<div role="img" aria-label="Drowning deaths by WHO region, 2021, as printed in the WHO report: ${alt}.">${hbars(items, 90000, { labelW: '200px' })}<div class="axis" aria-hidden="true" style="margin-left:212px;margin-right:70px"><span style="left:0">0</span><span style="left:50%">45k</span><span style="left:100%">90k</span></div></div>`;
  }

  function ages() {
    const segs = [
      { label: 'Under 5', share: 24, color: 'var(--buoy)', text: 'var(--paper)' },
      { label: '5 to 29', share: 33, color: 'var(--navy)', text: 'var(--paper)' },
      { label: '30 and over', share: 43, color: '#C9D4D2', text: 'var(--ink)' }
    ];
    const bar = segs.map((s) => `<div style="width:${s.share}%;background:${s.color};color:${s.text};display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:13px">${s.share}%</div>`).join('');
    const legend = segs.map((s) => `<span><i style="background:${s.color}"></i>${s.label}</span>`).join('');
    return `<div role="img" aria-label="Share of drowning deaths by age: nearly a quarter under five, about a third aged 5 to 29, the rest 30 and over."><div style="display:flex;height:40px;border-radius:2px;overflow:hidden">${bar}</div><div class="legend" style="margin-top:10px">${legend}</div></div>`;
  }

  window.Charts = { tollBar, layerStrips, estimates, income, regions, ages, fmt, esc, roundK };
})();
