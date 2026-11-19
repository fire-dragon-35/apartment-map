// Run in a tab on https://www.homeq.se (covers Slättö and many private landlords).
// Municipality ids: 180 Stockholm, 182 Nacka, 183 Sundbyberg, 184 Solna, 186 Lidingö.
async function fetchHomeQ() {
  const items = []; let total = 0, projects = 0;
  for (let page = 1; ; page++) {
    const j = await (await fetch('https://api.homeq.se/api/v3/search', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shapes: ['municipality.180', 'municipality.182', 'municipality.183', 'municipality.184', 'municipality.186'],
        sorting: 'publish_date.desc', page, amount: 100 }) })).json();
    total = j.total_hits;
    const res = j.results || [];
    for (const x of res) {
      if (x.type !== 'individual') { projects++; continue; }   // new-build projects have no single size/rent
      if (x.audience && !['everyone', 'student'].includes(x.audience)) continue;
      items.push({
        id: x.id, addr: (x.title || '').trim(), area: (x.city || x.municipality || '').trim(),
        lat: x.location?.lat, lon: x.location?.lon, rent: x.rent, m2: x.area, rooms: x.rooms,
        start: day(x.date_access), end: null, published: null, url: x.uri,
        flags: [x.audience === 'student' ? 'student flat – requires student status' : '',
          x.is_short_lease ? 'short lease – check length in ad' : ''].filter(Boolean),
        notes: ['first-hand'],
      });
    }
    if (!res.length || page * 100 >= total) break;
  }
  return { total, items, projects };
}
start('HomeQ', fetchHomeQ);
