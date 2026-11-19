// Run in a tab on https://www.samtrygg.se/RentalObject/NewSearch?search=stockholm
async function fetchSamtrygg() {
  const j = await (await fetch('/RentalObject/SearchResult?search=stockholm')).json();
  const ms = v => (v ? day(Number(String(v).match(/\d+/)[0])) : null);
  const items = (j.SearchResult || []).map(x => ({
    id: x.ID, addr: [x.StreetName, x.StreetNumber].filter(Boolean).join(' '), area: x.PostalTown,
    lat: x.GeographicPositionLat, lon: x.GeographicPositionLong,
    rent: Number(String(x.FormatedHGPrice || '').replace(/\D/g, '')) || null, m2: x.SquareMeters, rooms: x.NoOfRooms,
    start: ms(x.StartRentalDate), end: ms(x.EndRentalDate), published: ms(x.PublishedTs),
    url: x.RentalObjectLink,
    flags: x.HasExtensionChance ? ['extension possible'] : [],
  }));
  return { total: items.length, items };
}
start('Samtrygg', fetchSamtrygg);
