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
    if 'arcgisonline' in u or 'fonts.g' in u:
        return r.abort()  # tiles and fonts are irrelevant to the rules
    return r.continue_()

with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg = b.new_page(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.route('**/*', route)
    pg.add_init_script("try{localStorage.clear()}catch(e){}")
    pg.goto(BASE + 'index.html')
    pg.wait_for_function('typeof app!=="undefined" && app.visible.length>0', timeout=15000)
    pg.wait_for_timeout(500)
    check('no script errors', not errors, '; '.join(errors))

    js = pg.evaluate
    sel = lambda: js('app.selected?app.selected.id:null')
    popup_open = lambda: js('app.map.map.hasLayer(app.map.popup)')
    sheet_h = lambda: js("document.getElementById('sheet').offsetHeight")
    def settle(ms=900): pg.wait_for_timeout(ms)
    def clear():
        js('app.map.close()'); settle(150)
    # visible map area: between header and control row above the sheet
    AREA = """(()=>{const t=document.querySelector('header').getBoundingClientRect().bottom,b=innerHeight-document.getElementById('sheet').offsetHeight-56;return [8,t,innerWidth-8,b]})()"""
    in_area = lambda lid: js(f"""(()=>{{const [l,t,r,b]={AREA},l0=app.visible.find(x=>x.id==={lid}),p=app.map.map.latLngToContainerPoint(l0.latlng);return p.x>l&&p.x<r&&p.y>t&&p.y<b}})()""")
    card_visible = lambda: js("""(()=>{const c=document.getElementById('c'+app.selected.id).getBoundingClientRect(),b=document.getElementById('sbody').getBoundingClientRect();return c.top>=b.top-2&&c.top<b.bottom-30})()""")

    # R1, R2: tap a card far down the list; its pin must end up visible with an open popup; sheet unchanged
    ids = js('app.visible.map(l=>l.id)')
    target = ids[len(ids) * 2 // 3]
    h0 = sheet_h()
    pg.click(f'#c{target}'); settle(1400)
    check('R1 card tap shows its pin and popup', sel() == target and popup_open() and in_area(target), f'sel={sel()} popup={popup_open()}')
    check('R2 sheet height unchanged', sheet_h() == h0, f'{h0} -> {sheet_h()}')

    # R4
    pg.click(f'#c{target}'); settle(300)
    check('R4 second card tap clears', sel() is None and not popup_open())
    pg.click(f'#c{target}'); settle(1400); pg.keyboard.press('Escape'); settle(300)
    check('R4 Esc clears', sel() is None and not popup_open())
    pg.click(f'#c{target}'); settle(1400)
    empty = js(f"""(()=>{{const [l,t,r,b]={AREA};const pins=[...document.querySelectorAll('.pinhit')].map(e=>e.getBoundingClientRect()),pop=document.querySelector('.leaflet-popup').getBoundingClientRect();
      for(let y=t+20;y<b-10;y+=12)for(let x=l+20;x<r-20;x+=12){{const hit=r2=>x>r2.left-4&&x<r2.right+4&&y>r2.top-4&&y<r2.bottom+4;if(!pins.some(hit)&&!hit(pop)&&!hit(document.querySelector('.kplabel').getBoundingClientRect()))return [x,y]}}return null}})()""")
    if empty:
        pg.touchscreen.tap(*empty); settle(400)
    check('R4 empty map tap clears', empty is not None and sel() is None and not popup_open(), f'spot={empty}')

    # R3: tap the centre of every pin in the visible area; the pin drawn on top there must be selected
    bad = []
    for lid in ids:
        clear()
        if not in_area(lid): continue
        xy = js(f"(()=>{{const p=app.map.map.latLngToContainerPoint(app.visible.find(x=>x.id==={lid}).latlng);return [p.x,p.y]}})()")
        top_id = js(f"""(()=>{{const e=document.elementFromPoint({xy[0]},{xy[1]})?.closest('.pinhit');if(!e)return null;for(const [id,m] of app.map.markers)if(m.getElement()===e)return id;return null}})()""")
        if top_id is None: continue  # covered by UI (header, controls)
        pg.touchscreen.tap(*xy); settle(500)
        if not (sel() == top_id and popup_open() and card_visible()): bad.append(lid)
    check('R3 pin tap selects the top pin, opens popup, shows card', not bad, f'pins {bad}')
    clear()

    # R5
    r5 = js("""[...document.querySelectorAll('#map .pin')].every(e=>e.children.length===0&&getComputedStyle(e).borderTopStyle==='solid')""")
    check('R5 pins show only fill and size', r5)

    # R6: cards and an open popup
    pg.click(f'#c{ids[0]}'); settle(1400)
    atoms = js("""[...document.querySelectorAll('.card [data-a], .leaflet-popup [data-a]')].map(e=>[e.dataset.a,e.textContent])""")
    pop_atoms = js("document.querySelectorAll('.leaflet-popup [data-a]').length")
    wrong = [(a, t) for a, t in atoms if not re.fullmatch(FORMATS[a], t)]
    check('R6 data formats (cards and popup)', not wrong and len(atoms) > 0 and pop_atoms > 0, str(wrong[:5]))

    # R10: route while open, none after close
    drawn = js('app.map.route.getLayers().length')
    clear()
    check('R10 route drawn only while popup is open', drawn > 0 and js('app.map.route.getLayers().length') == 0, f'drawn={drawn}')

    # R12: one selection at a time
    pg.click(f'#c{ids[0]}'); settle(1400); pg.click(f'#c{ids[1]}'); settle(1400)
    one = js("document.querySelectorAll('.card.sel').length===1&&document.querySelectorAll('.leaflet-popup').length===1&&document.querySelectorAll('.pinhit.on').length===1")
    check('R12 one selection, one popup', one)
    clear()

    # R7
    txt = js('document.body.innerText')
    check('R7 no dashes in UI text', '–' not in txt and '—' not in txt)

    # R8: nya count follows filters
    def nya_ok():
        shown = js("(document.querySelector('.newchip')||{}).textContent||''")
        n = js('app.all.filter(l=>app.filters.passes(l)&&l.isNew).length')
        return (shown == '' and n == 0) or shown == f'{n}{NB}nya', (shown, n)
    ok1, d1 = nya_ok()
    js("document.getElementById('f-min').value=12;document.getElementById('f-min').dispatchEvent(new Event('input'))")
    ok2, d2 = nya_ok()
    check('R8 nya counts within filters', ok1 and ok2, f'{d1} {d2}')

    # R9: restid = min(walk, SL), walk per DESIGN.md §6 (haversine × 1.3 / 80)
    r9 = js("""app.all.every(l=>{const R=6371000,r=Math.PI/180,a=[l.lat,l.lon],k=[59.3389,18.0907],dp=(k[0]-a[0])*r,dl=(k[1]-a[1])*r;
      const h=Math.sin(dp/2)**2+Math.cos(a[0]*r)*Math.cos(k[0]*r)*Math.sin(dl/2)**2,w=Math.max(1,Math.round(2*R*Math.asin(Math.sqrt(h))*1.3/80));
      return l.t===((l.sl==null||w<=l.sl)?w:l.sl)})""")
    check('R9 restid = min(walk, SL)', r9)
    b.close()

print('\n' + ('ALL PASS' if not failures else f'{len(failures)} FAILED: ' + ', '.join(failures)))
sys.exit(1 if failures else 0)
