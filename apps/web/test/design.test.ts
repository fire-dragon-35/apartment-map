/**
 * Test 3 of 5 (ARCHITECTURE.md §13): the page rules of DESIGN.md, R1 to R13, checked on the BUILT app in a phone sized
 * headless Chromium. The legacy legacy/tests/design_check.py ported rule by rule. Supabase is mocked (a fixture of about
 * 30 listings in the shape of the view), map tiles are refused: no network. Needs Chromium: npx playwright install chromium
 *
 * The app is built with `--mode test` (npm test does it), which publishes `window.__lgh`: the listings, the selection,
 * the Leaflet map, the pin layers and the route layer. The production build has no such object.
 */
import assert from 'node:assert/strict';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { chromium, type Browser, type Page } from 'playwright';
import { PRICE_BANDS, PRICE_UNKNOWN, stockholmToday, TOKENS } from '@lk/shared';
import { buildRows } from './fixture.ts';

const DIST = fileURLToPath(new URL('../dist-test/', import.meta.url));
const NB = ' ';
const MON = 'jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec';
const DATE = `\\d{1,2}${NB}(?:${MON})(?:${NB}\\d{4})?`;
const FORMATS: Record<string, string> = {   // DESIGN.md §5
  adress: '.+', omrade: '.+', kalla: '.+',
  restid: `~?\\d+${NB}min`,
  hyra: `(?:\\d+(?:\\.\\d)?k|\\?)`,
  storlek: `(?:\\d+|\\?)${NB}m²`,
  rum: `\\d+(?:\\.\\d+)?${NB}rok`,
  kpm: `(?:\\d{1,3}(?:${NB}\\d{3})*|\\?)${NB}kr/m²`,
  avtal: `(?:nu|\\?|${DATE}) > (?:tills vidare|${DATE}|\\?)`,
  alder: `idag|\\d+${NB}d`,
};
// DESIGN.md §3, written out here on purpose: the test must not trust the code it checks
const BANDS: [number, string, string][] = PRICE_BANDS.map(b => [b.below, b.color, b.edge]);
const ACCENT = TOKENS.accent.toUpperCase();
const statusRow = (source: string, over: Record<string, unknown> = {}) => ({
  source, started_at: new Date().toISOString(), finished_at: new Date().toISOString(), complete: true, pages: 3, fetched: 210,
  skipped: 5, invalid: 1, kept: 204, error: null, duration_ms: 4000, usual_kept: 200, usual_runs: 7,
  last_complete_at: new Date().toISOString(), active: 190, ...over,
});
const STATUS = [statusRow('qasa'), statusRow('homeq'), statusRow('bostadsformedlingen'), statusRow('samtrygg', { complete: false, error: 'page 2: 503', kept: 40 })];

const MIME: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
let server: Server, base: string, browser: Browser;

before(async () => {
  assert.ok(existsSync(join(DIST, 'index.html')), 'dist-test is missing: run npm test (it builds with --mode test)');
  server = createServer((req, res) => {
    const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0]!));
    let file = join(DIST, path === '/' ? 'index.html' : path);
    if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  await new Promise(r => server?.close(r));
});

test('page rules R1 to R13 (DESIGN.md v4)', async () => {
  const failures: string[] = [];
  const check = (rule: string, ok: unknown, detail = '') => {
    console.log(`${ok ? 'PASS' : 'FAIL'} ${rule}${!ok && detail ? `  ${detail}` : ''}`);
    if (!ok) failures.push(rule);
  };

  const today = stockholmToday();
  const rows = buildRows(today);
  const page: Page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(base)) return route.continue();
    if (url.includes('supabase.test')) {
      const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' };
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(url.includes('/source_status') ? STATUS : rows) });
    }
    return route.abort();   // map tiles are irrelevant to the rules, and nothing else may leave the machine
  });
  await page.addInitScript('try{localStorage.clear()}catch(e){}');
  await page.goto(base + '#/karta');
  await page.waitForFunction('window.__lgh && window.__lgh.visible && window.__lgh.visible.length>0', undefined, { timeout: 15000 });
  await page.waitForTimeout(500);

  const js = <T = unknown>(expr: string): Promise<T> => page.evaluate(expr) as Promise<T>;
  const wait = (ms = 500) => page.waitForTimeout(ms);
  const sel = () => js<number | null>('__lgh.selectedId');
  const isOpen = () => js<boolean>('__lgh.map.hasLayer(__lgh.popup)');
  const close = async () => { await page.keyboard.press('Escape'); await wait(300); };   // Leaflet fades the popup out over 200 ms
  const scrollTo = async (y: number) => { await js(`scrollTo(0,${y})`); await wait(150); };
  check('no script errors', errors.length === 0, errors.join('; '));

  // R1: plain scrolling document
  const r1 = await js(`[...document.querySelectorAll('*')].every(e=>{const s=getComputedStyle(e);return s.position!=='fixed'&&s.position!=='sticky'&&(s.backdropFilter||'none')==='none'&&(s.webkitBackdropFilter||'none')==='none'})&&document.documentElement.scrollHeight>innerHeight`);
  check('R1 normal scrolling page, no fixed/sticky/blur', r1);

  // R2: tap every pin centre in the visible map; the tapped pin (or one drawn over that spot) opens; no scrolling
  const ids = await js<number[]>('__lgh.visible.map(l=>l.id)');
  const bands = await js<number[]>('[...new Set(__lgh.visible.map(l=>l.kpm==null?-1:l.kpm<250?0:l.kpm<300?1:l.kpm<350?2:l.kpm<400?3:4))]');
  check('fixture: some listings filtered out, the rest cover every price band and the unknown', ids.length >= 15 && ids.length < rows.length && bands.length === 6, `${ids.length} of ${rows.length}, bands ${bands}`);
  await scrollTo(0);
  const bad: number[] = [];
  let tapped = 0;
  for (const lid of ids) {
    await close();
    const xy = await js<[number, number] | null>(`(()=>{const r=document.getElementById('map').getBoundingClientRect(),l=__lgh.visible.find(x=>x.id===${lid}),p=__lgh.map.latLngToContainerPoint(l.latlng);
      const x=r.left+p.x,y=r.top+p.y;return (x>r.left+8&&x<r.right-8&&y>r.top+8&&y<r.bottom-30)?[x,y]:null})()`);
    if (!xy) continue;
    tapped++;
    const y0 = await js<number>('scrollY'), l0 = await js<number>("document.getElementById('list').scrollTop");
    // pins whose drawn circle (plus Leaflet's 8 px tolerance) covers the tap, measured before the popup auto pans the map
    const under = await js<number[]>(`(()=>{const r=document.getElementById('map').getBoundingClientRect();return __lgh.visible.filter(l=>{const p=__lgh.map.latLngToContainerPoint(l.latlng);
      return Math.hypot(r.left+p.x-${xy[0]},r.top+p.y-${xy[1]})<=l.radius+1.5+8}).map(l=>l.id)})()`);
    await page.touchscreen.tap(xy[0], xy[1]);
    await wait(700);
    const s = await sel();
    const outlined = s !== null && await js(`document.querySelector('[data-card][aria-pressed="true"]')?.id==='c'+${s}`);
    const still = (await js('scrollY')) === y0 && (await js("document.getElementById('list').scrollTop")) === l0;
    if (!(s !== null && under.includes(s) && await isOpen() && outlined && still)) bad.push(lid);
  }
  check(`R2 pin tap opens popup, outlines card, no scroll (${tapped} pins)`, tapped > 0 && bad.length === 0, `pins ${bad}`);
  await close();

  // R3: card tap from far down the list selects it; the page and the map stay where they are
  const target = ids[Math.floor((ids.length * 2) / 3)]!;
  await page.locator(`#c${target}`).scrollIntoViewIfNeeded(); await wait(200);
  const mapBefore = await js<string>('JSON.stringify([__lgh.map.getCenter(),__lgh.map.getZoom()])');
  const y0 = await js<number>('scrollY');
  await page.click(`#c${target}`, { position: { x: 24, y: 8 } }); await wait(1500);
  const mapAfter = await js<string>('JSON.stringify([__lgh.map.getCenter(),__lgh.map.getZoom()])');
  check('R3 card tap: page and map do not move, card selected, popup open', (await js('scrollY')) === y0 && mapAfter === mapBefore && (await sel()) === target && await isOpen() && await js(`document.querySelector('[data-card][aria-pressed="true"]')?.id==='c'+${target}`), `scrollY=${await js('scrollY')}/${y0} map ${mapBefore} -> ${mapAfter} sel=${await sel()}`);
  await page.click(`#c${target}`, { position: { x: 24, y: 8 } }); await wait(300);
  check('R3 second card tap closes', (await sel()) === null && !(await isOpen()));

  // R4: close button, empty map, Esc
  const openOne = async () => { await scrollTo(0); await page.click(`#c${ids[0]}`, { position: { x: 24, y: 8 } }); await wait(1500); await scrollTo(0); };
  await openOne(); await page.click('.leaflet-popup-close-button'); await wait(300);
  check('R4 popup close button clears', (await sel()) === null && !(await isOpen()));
  await openOne();
  const spot = await js<[number, number] | null>(`(()=>{const r=document.getElementById('map').getBoundingClientRect(),pop=document.querySelector('.leaflet-popup').getBoundingClientRect(),m=__lgh.map;
    for(let y=r.top+20;y<r.bottom-40;y+=10)for(let x=r.left+20;x<r.right-20;x+=10){
      if(x>pop.left-10&&x<pop.right+10&&y>pop.top-10&&y<pop.bottom+20)continue;
      const near=__lgh.visible.some(l=>{const p=m.latLngToContainerPoint(l.latlng);return Math.hypot(r.left+p.x-x,r.top+p.y-y)<l.radius+14});
      const kp=m.latLngToContainerPoint([59.3389,18.0907]);if(Math.hypot(r.left+kp.x-x,r.top+kp.y-y)<90)continue;
      if(!near)return [x,y]}return null})()`);
  if (spot) { await page.touchscreen.tap(spot[0], spot[1]); await wait(300); }
  check('R4 empty map tap clears', spot !== null && (await sel()) === null && !(await isOpen()), `spot=${spot}`);
  await openOne(); await page.keyboard.press('Escape'); await wait(300);
  check('R4 Esc clears', (await sel()) === null && !(await isOpen()));

  // R5: pins carry only price colour and size; ring only on the selected pin
  await openOne();
  const pins = await js<{ id: number; fill: string; kpm: number | null; radius: number; expected: number; weight: number; color: string; on: boolean }[]>(
    `[...__lgh.markers].map(([id,m])=>{const l=__lgh.visible.find(x=>x.id===id),o=m.options,a=Math.sqrt(20),b=Math.sqrt(65);
      return {id,fill:o.fillColor,kpm:l.kpm,radius:o.radius,expected:6+6*Math.min(1,Math.max(0,(Math.sqrt(l.m2||20)-a)/(b-a))),weight:o.weight,color:o.color,on:id===__lgh.selectedId}})`);
  const priceOf = (kpm: number | null) => (kpm === null ? PRICE_UNKNOWN.color : BANDS.find(([max]) => kpm < max)![1]);
  const edgeOf = (kpm: number | null) => (kpm === null ? PRICE_UNKNOWN.edge : BANDS.find(([max]) => kpm < max)![2]);
  const r5 = pins.length > 0 && pins.every(p => p.fill === priceOf(p.kpm) && Math.abs(p.radius - p.expected) < 1e-9 && (p.on ? p.weight === 2 && p.color === TOKENS.selected : p.weight === 1.5 && p.color === edgeOf(p.kpm)));
  check('R5 pins: fill = price, radius = size, ring only when selected', r5 && pins.filter(p => p.on).length === 1);

  // R6: every atom in cards and the open popup
  const atoms = await js<[string, string][]>(`[...document.querySelectorAll('[data-card] [data-a], [data-meta] [data-a], .leaflet-popup [data-a]')].map(e=>[e.dataset.a,e.textContent])`);
  const inPopup = await js<number>("document.querySelectorAll('.leaflet-popup [data-a]').length");
  const wrong = atoms.filter(([a, t]) => !new RegExp(`^(?:${FORMATS[a]!})$`).test(t));
  check('R6 data formats (cards and popup)', atoms.length > 0 && inPopup > 0 && wrong.length === 0, JSON.stringify(wrong.slice(0, 5)));
  const order = await js(`[...document.querySelectorAll('[data-card]')].every(c=>{const n=s=>[...c.querySelectorAll(s+' [data-a]')].map(e=>e.dataset.a).join(',');
    return /^adress(,omrade)?,restid$/.test(n('[data-line="1"]'))&&/^storlek(,rum)?,hyra,kpm$/.test(n('[data-line="2"]'))})`);
  check('R6 card grid: adress | restid / storlek · rum | hyra kr/m²', order);
  const unknowns = await js<string>(`document.body.innerText`);
  check('R6 unknown values show as ? (rent, size, kr/m²)', unknowns.includes(`?${NB}kr`) && unknowns.includes(`?${NB}m²`) && unknowns.includes(`?${NB}kr/m²`));

  // R10: route only while open and Visa resväg on
  const count = () => js<number>('__lgh.route.getLayers().length');
  const drawn = await count();
  await js<void>("document.querySelector('main details').open = true"); await wait(100);   // the filters (and Visa resväg) are in a <details>
  await page.click('#f-route'); await wait(100); const off = await count();
  await page.click('#f-route'); await wait(100); const back = await count();
  await close();
  check('R10 route only while open and Visa resväg on', drawn > 0 && off === 0 && back > 0 && (await count()) === 0, `drawn=${drawn} off=${off} back=${back}`);

  // R11: one selection at a time
  await openOne(); await scrollTo(0); await page.locator(`#c${ids[1]}`).scrollIntoViewIfNeeded(); await page.click(`#c${ids[1]}`, { position: { x: 24, y: 8 } }); await wait(1500);
  const one = await js(`document.querySelectorAll('[data-card][aria-pressed="true"]').length===1&&document.querySelectorAll('.leaflet-popup').length===1&&[...__lgh.markers.values()].filter(m=>m.options.weight===2).length===1`);
  check('R11 one popup, one outlined card, one ringed pin', one);
  await close();

  // R13: the first and last card take the list's rounded corners, so a selected or new card is never clipped
  const r13 = await js(`(()=>{const l=document.getElementById('list'),c=[...l.querySelectorAll('[data-card]')].map(b=>b.parentElement),r=(e,k)=>getComputedStyle(e)['border'+k+'Radius'],f=c[0],e=c.at(-1);
    return r(l,'TopLeft')!=='0px'&&['TopLeft','TopRight'].every(k=>r(f,k)===r(l,k))&&['BottomLeft','BottomRight'].every(k=>r(e,k)===r(l,k))})()`);
  check('R13 first and last card follow the list corners', r13);

  // R7
  const txt = await js<string>('document.body.innerText');
  check('R7 no dashes in UI text', !txt.includes('–') && !txt.includes('—'));

  // R8: nya count follows filters (computed here from the raw fields, not with the page's own code)
  const expectedNya = () => js<number>(`(()=>{const v=id=>+document.getElementById(id).value,today=__lgh.today,days=(a,b)=>(Date.parse(a)-Date.parse(b))/864e5;
    return __lgh.all.filter(l=>(v('f-min')>=60||l.t<=v('f-min'))&&(v('f-rent')>=30000||!l.rent||l.rent<=v('f-rent'))&&(!l.m2||l.m2>=v('f-m2'))&&(!l.end||days(l.end,(l.start&&l.start>today)?l.start:today)>=180)&&l.firstSeen===today).length})()`);
  const shown = () => js<string>("document.getElementById('nya').textContent");
  const n1 = await expectedNya(), s1 = await shown();
  await js<void>("document.querySelector('main details').open = true"); await wait(100);
  await page.locator('#f-min').fill('12'); await wait(200);
  const n2 = await expectedNya(), s2 = await shown();
  check('R8 nya counts within filters', s1 === `${n1}${NB}nya` && s2 === `${n2}${NB}nya` && n1 !== n2, `${s1}/${n1} ${s2}/${n2}`);
  await page.check('#f-new'); await wait(200);
  check('R8 Bara nya keeps the nya count and shows only new cards', (await shown()) === `${n2}${NB}nya` && (await js<number>("document.querySelectorAll('[data-card]:not([data-new])').length")) === 0);
  await page.uncheck('#f-new');

  // R9: restid = min(walk, SL), walk = haversine × 1.3 / 80 (written out here, not taken from the page)
  const r9 = await js(`__lgh.all.every(l=>{const R=6371000,r=Math.PI/180,k=[59.3389,18.0907],dp=(k[0]-l.lat)*r,dl=(k[1]-l.lon)*r;
    const h=Math.sin(dp/2)**2+Math.cos(l.lat*r)*Math.cos(k[0]*r)*Math.sin(dl/2)**2,w=Math.max(1,Math.round(2*R*Math.asin(Math.sqrt(h))*1.3/80));
    return l.t===((l.sl==null||w<=l.sl)?w:l.sl)})`);
  check('R9 restid = min(walk, SL)', r9);

  // R12: the accent is only Karlaplan and the selected pin's ring on the map: no other pin, ring or route in it
  await openOne();
  const blue = await js<boolean>(`[...__lgh.markers.entries()].filter(([id])=>id!==__lgh.selectedId).map(([,m])=>m).some(m=>[m.options.color,m.options.fillColor].some(c=>String(c).toUpperCase()==='${ACCENT}'))||__lgh.route.getLayers().some(p=>String(p.options.color).toUpperCase()==='${ACCENT}')`);
  check('R12 accent on the map only for Karlaplan and the selected ring', !blue && (await count()) > 0);
  await close();

  // Datakällor (on Om tjänsten): the scrape's state is on the page, and an incomplete source is not hidden behind a green line
  await page.goto(base + '#/om'); await page.waitForSelector('#sources'); await wait(300);
  const states = await js<string>("[...document.querySelectorAll('#sources [data-source][data-state]')].map(e=>e.dataset.source+':'+e.dataset.state).join()");
  check('Datakällor one row per source with its state', states === 'qasa:ok,homeq:ok,bostadsformedlingen:ok,samtrygg:incomplete', states);
  check('Datakällor shows the error, a check for complete sources and that Facebook is not included', await js<boolean>("(t=>t.includes('page 2: 503')&&t.includes('✓')&&t.includes('ingår inte ännu'))(document.getElementById('sources').textContent)"));

  await page.close();
  console.log('\n' + (failures.length ? `${failures.length} FAILED: ${failures.join(', ')}` : 'ALL PASS'));
  assert.deepEqual(failures, []);
});
