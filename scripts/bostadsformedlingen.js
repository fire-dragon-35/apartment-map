// Run in a tab on https://bostad.stockholm.se/bostad/
async function fetchBF() {
  const all = await (await fetch('/AllaAnnonser/')).json();
  const items = [];
  for (const x of all) {
    if (x.Ungdom || x.Senior) continue;
    const s = x.LiknadeLagenhetStatistik;
    const flags = [];
    if (x.Student) flags.push('student flat – requires student status');
    if (x.Korttid) flags.push('short-term contract – check length in ad');
    if (s && s.KotidFordelningQ3 != null) flags.push(`similar flats went to ${s.KotidFordelningQ1}–${s.KotidFordelningQ3} yrs queue`);
    items.push({
      id: x.AnnonsId, addr: x.Gatuadress, area: x.Stadsdel || x.Kommun, lat: x.KoordinatLatitud, lon: x.KoordinatLongitud,
      rent: x.Hyra, m2: x.Yta, rooms: x.AntalRum, start: day(x.Inflyttningsdatum), end: null,
      published: day(x.AnnonseradFran), url: 'https://bostad.stockholm.se' + x.Url, flags,
    });
  }
  return { total: all.length, items };
}
start('Bostadsförmedlingen', fetchBF);
