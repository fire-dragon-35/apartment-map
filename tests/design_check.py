"""Checks the ✓ rules in DESIGN.md against index.html, using the repo's own data.

Run from the repo root:
    pip install playwright && playwright install chromium
    python tests/design_check.py

Optional: LEAFLET_DIR=/path/to/leaflet/dist serves Leaflet locally (no network needed).
Exit code 0 = all rules pass.
"""
import math, os, pathlib, re, sys
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
LEAFLET = os.environ.get('LEAFLET_DIR')
BASE = 'http://page.local/'
NB = ' '
MON = 'jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec'
DATE = rf'\d{{1,2}}{NB}(?:{MON})(?:{NB}\d{{4}})?'
FORMATS = {  # DESIGN.md §5
    'adress': r'.+',
    'omrade': r'.+',
    'restid': rf'~?\d+{NB}min',
    'hyra':   rf'(?:\d+(?:\.\d)?k|\?){NB}kr',
    'storlek': rf'(?:\d+|\?){NB}m²',
    'rum':    rf'\d+(?:\.\d+)?{NB}rok',
    'kpm':    rf'(?:\d{{1,3}}(?:{NB}\d{{3}})*|\?){NB}kr/m²',
    'avtal':  rf'(?:nu|\?|{DATE}) → (?:tills vidare|{DATE}|\?)',
    'kalla':  r'Qasa|Bostadsförmedlingen|Samtrygg|HomeQ|Facebook|.+',
    'alder':  rf'idag|\d+{NB}d',
}

failures = []
def check(rule, ok, detail=''):
    print(('PASS ' if ok else 'FAIL ') + rule + (f'  {detail}' if detail and not ok else ''))
    if not ok: failures.append(rule)

def route(r):
    u = r.request.url
    if u.startswith(BASE):
        f = ROOT / u[len(BASE):].split('?')[0]
        return r.fulfill(path=str(f)) if f.is_file() else r.fulfill(status=404)
    if LEAFLET and 'unpkg.com/leaflet' in u:
        return r.fulfill(path=str(pathlib.Path(LEAFLET) / u.split('/dist/')[1]))
    if 'arcgisonline' in u:
        return r.abort()  # tiles are irrelevant to the rules
    return r.continue_()

with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg = b.new_page(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.route('**/*', route)
    pg.add_init_script("try{localStorage.clear()}catch(e){}")
    pg.goto(BASE + 'index.html')
    pg.wait_for_function('typeof P!=="undefined" && P.length>0', timeout=15000)
    pg.wait_for_timeout(500)
    check('no script errors', not errors, '; '.join(errors))

    cam = lambda: pg.evaluate('(()=>{const c=map.getCenter();return [c.lat.toFixed(6),c.lng.toFixed(6),map.getZoom()]})()')
    sheet_h = lambda: pg.evaluate("document.getElementById('sheet').offsetHeight")
    sel = lambda: pg.evaluate('sel')

    # R1, R2: select a card whose pin is already in view
    i = pg.evaluate("""(()=>{const v=viewRect();return P.findIndex(p=>{if(!p.mk)return false;const c=map.latLngToContainerPoint([p.lat,p.lon]);return c.x>v.l+30&&c.x<v.r-30&&c.y>v.t+30&&c.y<v.b-30})})()""")
    c0, h0 = cam(), sheet_h()
    pg.click(f'#c{i} .sum'); pg.wait_for_timeout(700)
    check('R1 camera still on select', cam() == c0, f'{c0} -> {cam()}')
    check('R2 sheet height unchanged', sheet_h() == h0, f'{h0} -> {sheet_h()}')

    # R4
    check('R4 tap card selects', sel() == i)
    pg.click(f'#c{i} .sum'); pg.wait_for_timeout(300)
    check('R4 second tap clears', sel() is None)
    pg.click(f'#c{i} .sum'); pg.wait_for_timeout(300); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    check('R4 Esc clears', sel() is None)
    check('R1 camera still on clear', cam() == c0)

    # R3: tap every visible pin
    top = pg.evaluate("document.querySelector('header').getBoundingClientRect().bottom")
    bad = []
    for k in range(pg.evaluate('P.length')):
        pg.evaluate('clear()')
        xy = pg.evaluate(f'P[{k}].mk?(()=>{{const c=map.latLngToContainerPoint([P[{k}].lat,P[{k}].lon]);return [c.x,c.y]}})():null')
        bot = pg.evaluate("innerHeight-document.getElementById('sheet').offsetHeight-70")
        if not xy or not (top + 10 < xy[1] < bot and 10 < xy[0] < 380): continue
        pg.touchscreen.tap(*xy); pg.wait_for_timeout(900)
        s = sel()
        same = s is not None and pg.evaluate(f'(()=>{{const a=map.latLngToContainerPoint([P[{k}].lat,P[{k}].lon]),c=map.latLngToContainerPoint([P[sel].lat,P[sel].lon]);return Math.hypot(a.x-c.x,a.y-c.y)<=1}})()')
        vis = s is not None and pg.evaluate("""(()=>{const c=document.getElementById('c'+sel).getBoundingClientRect(),b=document.getElementById('sbody').getBoundingClientRect();return c.top>=b.top-2&&c.top<b.bottom-40})()""")
        if not (same and vis): bad.append(k)
    check('R3 pin tap selects its card and shows it', not bad, f'pins {bad}')
    pg.evaluate('clear()')

    # R5
    r5 = pg.evaluate("""[...document.querySelectorAll('#map .pin')].every(e=>e.children.length===0&&getComputedStyle(e).borderTopStyle==='solid')""")
    check('R5 pins show only fill and size', r5)

    # R6
    atoms = pg.evaluate("""[...document.querySelectorAll('.card [data-a]')].map(e=>[e.dataset.a,e.textContent])""")
    wrong = [(a, t) for a, t in atoms if not re.fullmatch(FORMATS[a], t)]
    check('R6 data formats', not wrong and len(atoms) > 0, str(wrong[:5]))

    # R7
    txt = pg.evaluate('document.body.innerText')
    check('R7 no dashes in UI text', '–' not in txt and '—' not in txt)

    # R8: nya count follows filters
    def nya_ok():
        shown = pg.evaluate("(document.getElementById('nbtn')||{}).textContent||''")
        n = pg.evaluate('ALL.filter(p=>p.t!=null&&p.t<=F.min&&(!p.rent||p.rent<=F.rent)&&(!p.m2||p.m2>=F.m2)&&lenOk(p)&&isNew(p)).length')
        return (shown == '' and n == 0) or shown == f'{n}{NB}nya', (shown, n)
    ok1, d1 = nya_ok()
    pg.evaluate("document.getElementById('fmin').value=12;document.getElementById('fmin').dispatchEvent(new Event('input'))")
    ok2, d2 = nya_ok()
    check('R8 nya counts within filters', ok1 and ok2, f'{d1} {d2}')

    # R9
    r9 = pg.evaluate("""ALL.every(p=>{if(p.lat==null)return true;const w=Math.max(1,Math.round(distM([p.lat,p.lon],K)*1.3/80));const want=(p.sl==null||w<=p.sl)?w:p.sl;return p.t===want})""")
    check('R9 restid = min(walk, SL)', r9)
    b.close()

print('\n' + ('ALL PASS' if not failures else f'{len(failures)} FAILED: ' + ', '.join(failures)))
sys.exit(1 if failures else 0)
