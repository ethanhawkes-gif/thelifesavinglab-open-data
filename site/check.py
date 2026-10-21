"""Checks the built site in a real browser: no horizontal scroll at phone width, no console errors, text contrast,
basic accessibility, and the tools (register, lend checker) working. Run after `node site/build.mjs`.

    pip install playwright && playwright install chromium
    python3 site/check.py            # all checks; exit 1 on a failure
    python3 site/check.py --shots    # also writes screenshots to site/dist/shots/

Fonts are swapped for local ones so the check never needs the network.
"""
import json, os, re, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'site', 'dist')
PAGES = ['history', 'bridge', 'cohort', 'compact', 'stations']   # static pages built from site/src/pages
REDIRECTS = {'chart/': '#toll', 'chart/?section=tree': '#tree', 'bring/': '#contribute', 'sources/': '#ledger'}
ROUTES = ['home', 'toll', 'gaps', 'ledger', 'ledger-who-ghe-2021', 'tree', 'tree-harbor-recreational', 'pilots', 'pilots-cold-water-card', 'harbor', 'briefs', 'briefs-funder-one-pager', 'watch', 'june', 'wisdom', 'register', 'lend', 'contribute', 'glossary']
PORT = 8791
SHOTS = '--shots' in sys.argv

if not os.path.exists(os.path.join(DIST, 'index.html')):
    sys.exit('site/dist is missing: run node site/build.mjs first')

# Swap the Google Fonts link for local faces so the check is offline and deterministic.
html = open(os.path.join(DIST, 'index.html'), encoding='utf8').read()
html = re.sub(r'<link rel="stylesheet" href="https://fonts[^>]*>', '', html)
html = html.replace('</head>', "<style>@font-face{font-family:'Newsreader';src:local('Bitstream Charter'),local('DejaVu Serif')}@font-face{font-family:'Public Sans';src:local('Inter'),local('DejaVu Sans')}@font-face{font-family:'IBM Plex Mono';src:local('DejaVu Sans Mono')}</style></head>", 1)
open(os.path.join(DIST, 'check.html'), 'w', encoding='utf8').write(html)

OVERFLOW = """() => { const vw = document.documentElement.clientWidth; const bad = [], inner = []; for (const el of document.querySelectorAll('body *')) { const r = el.getBoundingClientRect(); if (r.width > 0 && r.right > vw + 1) (el.closest('.tscroll') ? inner : bad).push(el.tagName + '.' + (el.className || '') + ':' + Math.round(r.right) + (getComputedStyle(el).position === 'fixed' ? ':fixed' : '')); } const wide = [...document.querySelectorAll('body, body *')].filter((el) => !el.closest('.tscroll') && el.scrollWidth > vw + 1 && ![...el.children].some((c) => !c.closest('.tscroll') && c.scrollWidth > vw + 1)).map((el) => el.tagName + '.' + (el.className || '') + '#' + (el.id || '') + ':sw' + el.scrollWidth + ':cw' + el.clientWidth); return { sw: document.documentElement.scrollWidth, vw, bad: bad.slice(0, 6), inner: inner.slice(0, 6), wide: wide.slice(0, 6) }; }"""
CONTRAST = r"""() => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const bgOf = (el) => { let e = el; while (e && e !== document.documentElement) { const cs = getComputedStyle(e); const bg = parse(cs.backgroundColor); if (bg && bg.a > 0.9) return bg; if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; e = e.parentElement; } return parse(getComputedStyle(document.body).backgroundColor); };
  const out = []; const seen = new Set();
  for (const el of document.querySelectorAll('p,span,a,li,td,th,b,h1,h2,h3,h4,label,button,figcaption,small')) {
    const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
    if (!text) continue; const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el); const fg = parse(cs.color); const bg = bgOf(el); if (!fg || !bg) continue;
    const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize); const bold = parseInt(cs.fontWeight) >= 700; const need = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5;
    if (ratio < need) { const key = el.tagName + ':' + (el.className || '') + ':' + cs.color; if (seen.has(key)) continue; seen.add(key); out.push({ ratio: +ratio.toFixed(2), el: el.tagName + '.' + String(el.className).slice(0, 24), text: text.slice(0, 32) }); }
  }
  return out; }"""
A11Y = """() => { const hs = [...document.querySelectorAll('h1,h2,h3,h4')].map((h) => +h.tagName[1]); let jumps = 0; for (let i = 1; i < hs.length; i++) if (hs[i] > hs[i - 1] + 1) jumps++;
  return { h1: document.querySelectorAll('h1').length, jumps, img_no_alt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length,
    unnamed_buttons: [...document.querySelectorAll('button')].filter((b) => !(b.textContent.trim() || b.getAttribute('aria-label'))).length,
    unlabeled: [...document.querySelectorAll('input,select,textarea')].filter((el) => el.type !== 'hidden' && !el.closest('label') && !(el.id && document.querySelector('label[for="' + el.id + '"]')) && !el.getAttribute('aria-label')).map((el) => el.id || el.name) }; }"""

srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=DIST, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.0)
failures = []
try:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for width in (1440, 390):
            page = browser.new_page(viewport={'width': width, 'height': 900})
            page.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='text/css', body=''))  # offline: no web fonts
            errors = []
            page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            page.on('pageerror', lambda e: errors.append('PAGEERROR ' + str(e)))
            for route in ROUTES:
                page.goto(f'http://127.0.0.1:{PORT}/check.html#{route}'); page.wait_for_timeout(500)
                o = page.evaluate(OVERFLOW)
                if o['sw'] > o['vw']: failures.append(f'{width} {route}: horizontal scroll ({o["sw"]} > {o["vw"]}): {o["bad"] or ("inside .tscroll: " + str(o["inner"]) + "; deepest wide: " + str(o["wide"]))}')
                if width == 1440:
                    c = page.evaluate(CONTRAST)
                    if c: failures.append(f'{route}: low contrast: {json.dumps(c[:5])}')
                    a = page.evaluate(A11Y)
                    if a['h1'] != 1 or a['jumps'] or a['img_no_alt'] or a['unnamed_buttons'] or a['unlabeled']: failures.append(f'{route}: a11y {json.dumps(a)}')
                if SHOTS:
                    os.makedirs(os.path.join(DIST, 'shots'), exist_ok=True)
                    page.screenshot(path=os.path.join(DIST, 'shots', f'{route}-{width}.png'), full_page=True)
            for name in PAGES:
                page.goto(f'http://127.0.0.1:{PORT}/{name}/'); page.wait_for_timeout(500)
                o = page.evaluate(OVERFLOW)
                if o['sw'] > o['vw']: failures.append(f'{width} /{name}/: horizontal scroll ({o["sw"]} > {o["vw"]}): {o["bad"]}')
                if width == 1440:
                    c = page.evaluate(CONTRAST)
                    if c: failures.append(f'/{name}/: low contrast: {json.dumps(c[:5])}')
                    a = page.evaluate(A11Y)
                    if a['h1'] != 1 or a['jumps'] or a['img_no_alt'] or a['unnamed_buttons'] or a['unlabeled']: failures.append(f'/{name}/: a11y {json.dumps(a)}')
                    if not page.locator('#navlinks a').count(): failures.append(f'/{name}/: the masthead is missing')
                if SHOTS: page.screenshot(path=os.path.join(DIST, 'shots', f'page-{name}-{width}.png'), full_page=True)
            if errors: failures.append(f'{width}: console errors: {errors[:5]}')
            page.close()
        # Old addresses send the reader on.
        page = browser.new_page()
        for old, dest in REDIRECTS.items():
            page.goto(f'http://127.0.0.1:{PORT}/{old}'); page.wait_for_timeout(600)
            if not page.url.endswith('/' + dest) and not page.url.endswith('/index.html' + dest): failures.append(f'redirect /{old} landed on {page.url}, expected {dest}')
        page.close()

        # The tools: the register keeps a row and refuses personal data; the lend checker passes the example bundle.
        page = browser.new_page()
        page.goto(f'http://127.0.0.1:{PORT}/check.html#register'); page.wait_for_selector('#rform')
        page.fill('#r-date', '2026-10-15'); page.fill('#r-place', 'Kittery'); page.select_option('#r-water', 'sea-coast'); page.select_option('#r-activity', 'paddling')
        page.select_option('#r-outcome', 'rescued-unharmed'); page.fill('#r-source', 'harbormaster log'); page.select_option('#r-confidence', 'high')
        page.click('#rform button[type=submit]'); page.wait_for_timeout(300)
        if 'added' not in page.locator('#r-msg').inner_text(): failures.append('register: a valid row was not added')
        page.fill('#r-notes', 'victim: J Doe 555-123-4567'); page.fill('#r-date', '2026-10-16'); page.fill('#r-place', 'Kittery'); page.select_option('#r-water', 'sea-coast'); page.select_option('#r-activity', 'paddling'); page.select_option('#r-outcome', 'fatal'); page.fill('#r-source', 'log'); page.select_option('#r-confidence', 'low')
        page.click('#rform button[type=submit]'); page.wait_for_timeout(300)
        if 'Refused' not in page.locator('#r-msg').inner_text(): failures.append('register: a row with personal data was not refused')
        example = open(os.path.join(ROOT, 'tasks', 'example-bundle.json'), encoding='utf8').read()
        page.goto(f'http://127.0.0.1:{PORT}/check.html#lend'); page.wait_for_selector('#board article')
        page.fill('#bundle-in', example); page.click('#bundle-check'); page.wait_for_timeout(400)
        if 'PROVISIONAL RECEIPT' not in page.locator('#bundle-out').inner_text().upper(): failures.append('lend: the example bundle did not pass the in-browser checks')
        browser.close()
finally:
    srv.terminate()
    try: os.remove(os.path.join(DIST, 'check.html'))
    except OSError: pass

for f in failures: print('FAIL', f)
print(f'{len(ROUTES)} routes and {len(PAGES)} pages at two widths, {len(REDIRECTS)} redirects; {len(failures)} failure(s)')
sys.exit(1 if failures else 0)
