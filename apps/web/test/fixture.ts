/**
 * Fixture for the page rules test: about 30 listings in the shape of the view `listings_karlaplan`, built around
 * Karlaplan from a fixed seed, so the same page is tested every time. Dates are relative to `today`.
 * It covers every price band, unknown rent and size, every kind of area, contracts of every kind, listings new today,
 * every tag and the warning, transit routes and listings where walking wins.
 */
import { metresBetween, type Leg } from '@lk/shared';

export const KARLAPLAN = { lat: 59.3389, lon: 18.0907 };

export interface Row {
  id: number; source: string; source_id: string; url: string; street: string | null; area: string | null;
  rent: number | null; m2: number | null; rooms: number | null; kpm: number | null;
  start_date: string | null; end_date: string | null; first_hand: boolean | null; student: boolean | null; furnished: boolean | null;
  notes: string[]; flags: string[]; first_seen: string | null; lat: number; lon: number; exact: boolean;
  transit_min: number | null; minutes: number | null; legs: Leg[] | null; also_on: string[];
}

const day = (today: string, offset: number) => new Date(Date.parse(today) + offset * 864e5).toISOString().slice(0, 10);

/** mulberry32: a small seeded generator */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STREETS = ['Hornsgatan', 'Valhallavägen', 'Strandvägen', 'Odengatan', 'Sveavägen', 'Bondegatan', 'Götgatan', 'Karlavägen', 'Folkungagatan', 'Birger Jarlsgatan', 'Torsgatan', 'Skånegatan'];
const AREAS = ['Södermalm', 'Östermalm', 'Vasastan', 'Norrmalm', 'Gärdet', 'Kungsholmen'];
const SOURCES = ['qasa', 'homeq', 'bostadsformedlingen', 'samtrygg'];

export function buildRows(today: string, count = 32): Row[] {
  const rnd = rng(20261123);
  const rows: Row[] = [];
  for (let i = 0; i < count; i++) {
    const metres = 500 + rnd() * 5200, bearing = rnd() * 2 * Math.PI;
    const lat = KARLAPLAN.lat + (metres * Math.cos(bearing)) / 111_320;
    const lon = KARLAPLAN.lon + (metres * Math.sin(bearing)) / (111_320 * Math.cos((KARLAPLAN.lat * Math.PI) / 180));
    const pin = { lat: Number(lat.toFixed(4)), lon: Number(lon.toFixed(4)) };
    const walk = Math.max(1, Math.round((metresBetween(pin, KARLAPLAN) * 1.3) / 80));

    // sizes and kr/m² chosen to hit every price band, then rent follows
    const m2 = [22, 28, 35, 42, 55, 64, 31, 48][i % 8]!;
    const kpm = [210, 270, 320, 370, 430, 290, 240, 340][(i * 3) % 8]!;
    const rent = Math.round((m2 * kpm) / 50) * 50;

    // routes: most listings have a SL trip that beats walking; the closest ones are faster on foot or have no trip
    const transit = i % 7 === 3 || walk <= 10 ? (i % 2 ? null : walk + 6) : Math.max(8, Math.round(walk * 0.3) + 6);
    const sl = transit;
    const byFoot = sl === null || walk <= sl;
    const mid = { lat: (pin.lat + KARLAPLAN.lat) / 2 + 0.002, lon: (pin.lon + KARLAPLAN.lon) / 2 };
    const legs: Leg[] | null = byFoot ? null : [
      ['walk', '', [[pin.lat, pin.lon], [mid.lat, mid.lon]], 4, 0],
      [['metro', 'bus', 'tram'][i % 3] as Leg[0], ['13', '687', '7'][i % 3]!, [[mid.lat, mid.lon], [KARLAPLAN.lat + 0.001, KARLAPLAN.lon - 0.001]], Math.max(2, sl! - 9), 3 + (i % 4)],
      ['walk', '', [[KARLAPLAN.lat + 0.001, KARLAPLAN.lon - 0.001], [KARLAPLAN.lat, KARLAPLAN.lon]], 5, 0],
    ];

    const row: Row = {
      id: 1000 + i, source: SOURCES[i % 4]!, source_id: `fx${i}`, url: `https://example.test/ad/${i}`,
      street: STREETS[i % STREETS.length]!, area: AREAS[i % AREAS.length]!, rent, m2, rooms: [1, 2, 3, 1.5][i % 4]!,
      kpm: Math.round(rent / m2),
      start_date: [day(today, -20), day(today, 12), day(today, 140), null][i % 4]!, end_date: [null, day(today, 400), day(today, 500), null][i % 4]!,
      first_hand: i % 5 === 0 ? true : i % 5 === 1 ? false : null, student: i % 11 === 2 ? true : null, furnished: i % 13 === 4 ? true : i % 13 === 5 ? false : null,
      notes: i % 9 === 1 ? ['extension_possible'] : [], flags: [...(i % 8 === 6 ? ['short_lease'] : []), ...(i % 10 === 7 ? ['below_market'] : [])],
      first_seen: i % 4 === 0 ? today : i % 4 === 1 ? day(today, -9) : i % 4 === 2 ? day(today, -1) : i % 6 === 3 ? null : day(today, -30),
      ...pin, exact: true, transit_min: sl, minutes: Math.min(walk, sl ?? walk), legs, also_on: i % 12 === 5 ? ['homeq'] : [],
    };
    rows.push(row);
  }

  // the odd ones: unknown rent and size, an area equal to the street or "Stockholm", too short a contract, too far for the default filter
  Object.assign(rows[0]!, { rent: null, kpm: null });
  Object.assign(rows[1]!, { m2: null, kpm: null, rooms: null });
  Object.assign(rows[2]!, { area: null });
  Object.assign(rows[3]!, { area: 'Stockholm' });
  Object.assign(rows[4]!, { area: rows[4]!.street });
  Object.assign(rows[5]!, { start_date: day(today, 30), end_date: day(today, 120) });   // 90 days: filtered out
  // small and dear (450 till 549 and 550+ kr/m²), close to Karlaplan: the two top bands within the rent limit
  Object.assign(rows[8]!, { m2: 30, rent: 14700, kpm: 490, lat: 59.3465, lon: 18.0907, transit_min: null, legs: null, end_date: null });
  Object.assign(rows[9]!, { m2: 26, rent: 15100, kpm: 581, lat: 59.3389, lon: 18.1043, transit_min: null, legs: null, end_date: null });
  Object.assign(rows[6]!, { transit_min: 45, legs: null, lat: 59.3689, lon: 18.2407 }); // far: restid over 30, filtered out
  return rows;
}
