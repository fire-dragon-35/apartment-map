// Shared config + helpers. The daily task prepends this file to each source script
// and runs the result with javascript_tool in a tab open on that source's site.
var CFG = {
  karlaplan: [59.3389, 18.0907],
  maxRent: 15000,        // kr/month incl. platform fee
  maxKpm: 600,           // kr per m²
  minM2: 25,
  maxKm: 8,              // straight-line pre-filter before asking SL
  maxMin: 30,            // door-to-door, arrive 08:00 on a weekday
  latestStart: '2027-03-31',
  minDays: 180,          // contract length
};

var dist = (lat, lon) => {
  const t = x => x * Math.PI / 180, [a, b] = CFG.karlaplan;
  const h = Math.sin(t(lat - a) / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(lat)) * Math.sin(t(lon - b) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
var day = v => (v ? new Date(v).toISOString().slice(0, 10) : null);
var today = new Date().toISOString().slice(0, 10);

function nextWeekday() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  while ([0, 6].includes(d.getDay())) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

async function slMinutes(lat, lon) {
  const [kl, kn] = CFG.karlaplan;
  const u = `https://journeyplanner.integration.sl.se/v2/trips?type_origin=coord&name_origin=${lon}:${lat}:WGS84[dd.ddddd]` +
    `&type_destination=coord&name_destination=${kn}:${kl}:WGS84[dd.ddddd]&calc_number_of_trips=3` +
    `&itd_date=${nextWeekday()}&itd_time=0800&itdTripDateTimeDepArr=arr`;
  for (let i = 0; i < 2; i++) {
    try {
      const j = await (await fetch(u)).json();
      const m = (j.journeys || []).map(x => Math.round(x.tripDuration / 60));
      if (m.length) return Math.min(...m);
    } catch (e) { /* retry once */ }
  }
  return null;
}

// item: {id, addr, area, lat, lon, rent, m2, rooms, start, end, published, url, flags:[] (warnings), notes:[] (info)}
async function run(source, fetchAll) {
  const res = await fetchAll();
  const { total, items } = res;
  const seen = items.length;
  let c = items.filter(x =>
    x.lat && x.lon && x.rent > 1000 && x.rent <= CFG.maxRent && (x.m2 || 0) >= CFG.minM2 && x.rent / x.m2 <= CFG.maxKpm &&
    dist(x.lat, x.lon) <= CFG.maxKm &&
    (!x.start || x.start <= CFG.latestStart) &&
    (!x.end || (new Date(x.end) - new Date(x.start && x.start > today ? x.start : today)) / 864e5 >= CFG.minDays));
  for (let i = 0; i < c.length; i += 12) {
    await Promise.all(c.slice(i, i + 12).map(async x => { x.t = await slMinutes(x.lat, x.lon); }));
  }
  c = c.filter(x => x.t !== null && x.t <= CFG.maxMin);
  const r = n => Math.round(n * 1e4) / 1e4;
  // compact rows (the task copies this output into results/<source>.json, so keep it small)
  return JSON.stringify({
    source, total, fetched: seen, skipped: res.skipped || 0, run: new Date().toISOString(),
    cols: ['id', 'a', 'ar', 'la', 'lo', 'r', 'm', 'k', 'st', 'en', 't', 'f', 'n', 'u'],
    rows: c.map(x => [String(x.id), x.addr, x.area || '', r(x.lat), r(x.lon), x.rent, x.m2, x.rooms ?? null,
      x.start && x.start > today ? x.start : (x.start ? 'now' : null), x.end || null, x.t,
      (x.flags || []).join('; '), (x.notes || []).join('; '), x.url || '']),
  });
}

// javascript_tool calls time out after ~45 s, so a run is started in the background
// and its result collected with POLL (see README): returns the result object when done.
function start(source, fetchAll) {
  window.__status = 'running'; window.__res = null;
  run(source, fetchAll).then(r => { window.__res = r; window.__status = 'done'; })
    .catch(e => { window.__status = 'error: ' + (e && e.message || e); });
  return 'started ' + source;
}
