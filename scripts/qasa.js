// Run in a tab on https://qasa.com (covers Blocket Bostad too).
async function fetchQasa() {
  const areas = ['se/stockholm', 'se/solna', 'se/sundbyberg', 'se/lidingo', 'se/nacka'];
  const items = []; let total = 0, skipped = 0;
  for (let off = 0; ; off += 100) {
    const query = `{ homeIndexSearch(order:{direction: descending, orderBy: published_or_bumped_at},
      params:{areaIdentifier:${JSON.stringify(areas)}, maxMonthlyCost:${CFG.maxRent}, homeType:[apartment]}) {
      documents(limit:100, offset:${off}) { totalCount nodes { id monthlyCost roomCount squareMeters shared
        firstHand studentHome seniorHome location { locality route streetNumber point { lat lon } }
        startDate endDate publishedAt } } } }`;
    const j = await (await fetch('https://api.qasa.se/graphql', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }) })).json();
    const d = j.data.homeIndexSearch.documents; total = d.totalCount;
    for (const n of d.nodes) {
      if (n.shared || n.seniorHome) { skipped++; continue; }          // room in someone's home / senior housing
      const L = n.location || {};
      items.push({
        id: n.id, addr: [L.route, L.streetNumber].filter(Boolean).join(' ').trim(), area: (L.locality || '').trim(),
        lat: L.point?.lat, lon: L.point?.lon, rent: n.monthlyCost, m2: n.squareMeters, rooms: n.roomCount,
        start: day(n.startDate), end: day(n.endDate), published: day(n.publishedAt),
        url: '',
        flags: [n.firstHand ? 'first-hand' : '', n.studentHome ? 'student flat – requires student status' : ''].filter(Boolean),
      });
    }
    if (off + 100 >= total) break;
  }
  return { total, items, skipped };
}
start('Qasa', fetchQasa);
