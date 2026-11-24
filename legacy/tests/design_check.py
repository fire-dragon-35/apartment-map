"""Checks the ✓ rules in DESIGN.md (v3) against index.html, using the repo's own data.

Run from the repo root:
    pip install playwright && playwright install chromium
    python tests/design_check.py

Optional: LEAFLET_DIR=/path/to/leaflet/dist serves Leaflet locally (no network needed).
Exit code 0 = all rules pass.
"""
import os, pathlib, re, sys
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
LEAFLET = os.environ.get('LEAFLET_DIR')
BASE = 'http://page.local/'
NB = ' '
MON = 'jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec'
DATE = rf'\d{{1,2}}{NB}(?:{MON})(?:{NB}\d{{4}})?'
FORMATS = {  # DESIGN.md §5
    'adress': r'.+', 'omrade': r'.+', 'kalla': r'.+',
    'restid': rf'~?\d+{NB}min',
    'hyra': rf'(?:\d+(?:\.\d)?k|\?){NB}kr',
    'storlek': rf'(?:\d+|\?){NB}m²',
    'rum': rf'\d+(?:\.\d+)?{NB}rok',
    'kpm': rf'(?:\d{{1,3}}(?:{NB}\d{{3}})*|\?){NB}kr/m²',
    'avtal': rf'(?:nu|\?|{DATE}) → (?:tills vidare|{DATE}|\?)',
    'alder': rf'idag|\d+{NB}d',
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
    pg.wait_for_function('typeof app!=="undefined" && app.visible.length>0', timeout=15000)
    pg.wait_for_timeout(500)
    js = pg.evaluate
    check('no script errors', not errors, '; '.join(errors))

    sel = lambda: js('app.selected?app.selected.id:null')
    is_open = lambda: js('app.map.map.hasLayer(app.map.popup)')
    def wait(ms=500): pg.wait_for_timeout(ms)
    def close(): js('app.map.close()'); wait(300)  # Leaflet fades the popup out over 200 ms
    def scroll_to(y): js(f'scrollTo(0,{y})'); wait(150)

    # R1: plain scrolling document
    r1 = js("""[...document.querySelectorAll('*')].every(e=>{const s=getComputedStyle(e);return s.position!=='fixed'&&s.position!=='sticky'&&(s.backdropFilter||'none')==='none'&&(s.webkitBackdropFilter||'none')==='none'})&&document.documentElement.scrollHeight>innerHeight""")
    check('R1 normal scrolling page, no fixed/sticky/blur', r1)

    # R2: tap every pin centre in the visible map; the tapped pin (or one drawn over that spot) opens; no scrolling
    ids = js('app.visible.map(l=>l.id)')
    scroll_to(0)
    bad, tapped = [], 0
    for lid in ids:
        close()
        xy = js(f"""(()=>{{const r=document.getElementById('map').getBoundingClientRect(),l=app.visible.find(x=>x.id==={lid}),p=app.map.map.latLngToContainerPoint(l.latlng);
            const x=r.left+p.x,y=r.top+p.y;return (x>r.left+8&&x<r.right-8&&y>r.top+8&&y<r.bottom-30)?[x,y]:null}})()""")
        if not xy: continue
        tapped += 1
        y0, l0 = js('scrollY'), js("document.getElementById('list').scrollTop")
        # pins whose drawn circle (plus Leaflet's 8 px tolerance) covers the tap, measured before the popup auto pans the map
        under = js(f"""(()=>{{const r=document.getElementById('map').getBoundingClientRect();return app.visible.filter(l=>{{const p=app.map.map.latLngToContainerPoint(l.latlng);
            return Math.hypot(r.left+p.x-{xy[0]},r.top+p.y-{xy[1]})<=l.radius+1.5+8}}).map(l=>l.id)}})()""")
        pg.touchscreen.tap(*xy); wait(700)
        s = sel()
        hit = s in under
        outlined = s is not None and js(f"document.querySelector('.card.sel')?.id==='c'+{s}")
        still = js('scrollY') == y0 and js("document.getElementById('list').scrollTop") == l0
        if not (hit and is_open() and outlined and still): bad.append(lid)
    check(f'R2 pin tap opens popup, outlines card, no scroll ({tapped} pins)', tapped > 0 and not bad, f'pins {bad}')
    close()

    # R3: card tap from far down the list
    target = ids[len(ids) * 2 // 3]
    pg.locator(f'#c{target}').scroll_into_view_if_needed(); wait(200)
    pg.click(f'#c{target}'); wait(1500)
    inmap = js(f"""(()=>{{const s=app.map.map.getSize(),p=app.map.map.latLngToContainerPoint(app.visible.find(x=>x.id==={target}).latlng);return p.x>0&&p.y>0&&p.x<s.x&&p.y<s.y}})()""")
    check('R3 card tap: top of page, pin in map, zoom >= 14, popup open',
          js('scrollY') == 0 and sel() == target and is_open() and inmap and js('app.map.map.getZoom()') >= 14,
          f"scrollY={js('scrollY')} sel={sel()} zoom={js('app.map.map.getZoom()')}")
    pg.locator(f'#c{target}').scroll_into_view_if_needed(); pg.click(f'#c{target}'); wait(300)
    check('R3 second card tap closes', sel() is None and not is_open())

    # R4: close button, empty map, Esc
    def open_one():
        scroll_to(0); pg.click(f'#c{ids[0]}'); wait(1500); scroll_to(0)
    open_one(); pg.click('.leaflet-popup-close-button'); wait(300)
    check('R4 popup close button clears', sel() is None and not is_open())
    open_one()
    spot = js("""(()=>{const r=document.getElementById('map').getBoundingClientRect(),pop=document.querySelector('.leaflet-popup').getBoundingClientRect(),m=app.map.map;
        for(let y=r.top+20;y<r.bottom-40;y+=10)for(let x=r.left+20;x<r.right-20;x+=10){
          if(x>pop.left-10&&x<pop.right+10&&y>pop.top-10&&y<pop.bottom+20)continue;
          const near=app.visible.some(l=>{const p=m.latLngToContainerPoint(l.latlng);return Math.hypot(r.left+p.x-x,r.top+p.y-y)<l.radius+14});
          const kp=m.latLngToContainerPoint([59.3389,18.0907]);if(Math.hypot(r.left+kp.x-x,r.top+kp.y-y)<90)continue;
          if(!near)return [x,y]}return null})()""")
    if spot: pg.touchscreen.tap(*spot); wait(300)
    check('R4 empty map tap clears', spot is not None and sel() is None and not is_open(), f'spot={spot}')
    open_one(); pg.keyboard.press('Escape'); wait(300)
    check('R4 Esc clears', sel() is None and not is_open())

    # R5: pins carry only price colour and size; ring only on the selected pin
    open_one()
    r5 = js("""[...app.map.markers].every(([id,m])=>{const l=app.visible.find(x=>x.id===id),o=m.options,on=l===app.selected;
        return o.fillColor===Fmt.priceColor(l.kpm)&&Math.abs(o.radius-l.radius)<1e-9&&(on?o.weight===3&&o.color==='#1C1C1E':o.weight===1.5&&o.color===Fmt.priceEdge(l.kpm))})""")
    check('R5 pins: fill = price, radius = size, ring only when selected', r5)

    # R6: every atom in cards and the open popup
    atoms = js("""[...document.querySelectorAll('.card [data-a], .leaflet-popup [data-a]')].map(e=>[e.dataset.a,e.textContent])""")
    in_popup = js("document.querySelectorAll('.leaflet-popup [data-a]').length")
    wrong = [(a, t) for a, t in atoms if not re.fullmatch(FORMATS[a], t)]
    check('R6 data formats (cards and popup)', atoms and in_popup and not wrong, str(wrong[:5]))
    order = js("""[...document.querySelectorAll('.card')].every(c=>{const n=s=>[...c.querySelectorAll(s+' [data-a]')].map(e=>e.dataset.a).join(',');
        return /^adress(,omrade)?,restid$/.test(n('.l1'))&&/^hyra,storlek(,rum)?,kpm$/.test(n('.l2'))})""")
    check('R6 card line order: adress · restid / hyra · storlek · rum · kr/m²', order)

    # R10: route only while open
    drawn = js('app.map.route.getLayers().length')
    pg.click('#f-route'); wait(100); off = js('app.map.route.getLayers().length')
    pg.click('#f-route'); wait(100); back = js('app.map.route.getLayers().length')
    close()
    check('R10 route only while open and Visa resväg on', drawn > 0 and off == 0 and back > 0 and js('app.map.route.getLayers().length') == 0, f'drawn={drawn} off={off} back={back}')

    # R11: one selection at a time
    open_one(); scroll_to(0); pg.locator(f'#c{ids[1]}').scroll_into_view_if_needed(); pg.click(f'#c{ids[1]}'); wait(1500)
    one = js("""document.querySelectorAll('.card.sel').length===1&&document.querySelectorAll('.leaflet-popup').length===1&&[...app.map.markers.values()].filter(m=>m.options.weight===3).length===1""")
    check('R11 one popup, one outlined card, one ringed pin', one)
    close()

    # R7
    txt = js('document.body.innerText')
    check('R7 no dashes in UI text', '–' not in txt and '—' not in txt)

    # R8: nya count follows filters
    def nya_ok():
        shown = js("document.getElementById('nya').textContent")
        n = js('app.all.filter(l=>app.filters.passes(l)&&l.isNew).length')
        return shown == f'{n}{NB}nya', (shown, n)
    ok1, d1 = nya_ok()
    js("const i=document.getElementById('f-min');i.value=12;i.dispatchEvent(new Event('input'))")
    ok2, d2 = nya_ok()
    check('R8 nya counts within filters', ok1 and ok2, f'{d1} {d2}')

    # R9: restid = min(walk, SL), walk = haversine × 1.3 / 80
    r9 = js("""app.all.every(l=>{const R=6371000,r=Math.PI/180,k=[59.3389,18.0907],dp=(k[0]-l.lat)*r,dl=(k[1]-l.lon)*r;
      const h=Math.sin(dp/2)**2+Math.cos(l.lat*r)*Math.cos(k[0]*r)*Math.sin(dl/2)**2,w=Math.max(1,Math.round(2*R*Math.asin(Math.sqrt(h))*1.3/80));
      return l.t===((l.sl==null||w<=l.sl)?w:l.sl)})""")
    check('R9 restid = min(walk, SL)', r9)
    b.close()

print('\n' + ('ALL PASS' if not failures else f'{len(failures)} FAILED: ' + ', '.join(failures)))
sys.exit(1 if failures else 0)
