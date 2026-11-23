/** One listing as the page needs it: the database row plus the rules of DESIGN.md that depend only on the row. */
import {
  contractOk, isBelowMarket, KARLAPLAN, omrade, pinRadius, SOURCE_NAMES, tags, travelMinutes, walkMinutes,
  type Database, type Leg, type Source,
} from '@lk/shared';

export type ListingRow = Database['public']['Views']['listings_karlaplan']['Row'];

export class Listing {
  readonly id: number;
  readonly url: string | null;
  readonly sourceName: string;
  /** adress: the street, else the area, else ? */
  readonly street: string;
  readonly area: string;
  readonly rent: number | null;
  readonly m2: number | null;
  readonly rooms: number | null;
  readonly kpm: number | null;
  readonly start: string | null;
  readonly end: string | null;
  readonly firstSeen: string | null;
  readonly lat: number;
  readonly lon: number;
  readonly latlng: [number, number];
  readonly tags: string[];
  readonly warn: boolean;
  /** DESIGN.md §6 */
  readonly walk: number;
  readonly sl: number | null;
  readonly byFoot: boolean;
  /** restid */
  readonly t: number;
  /** the route to draw; null when walking is faster or there is no route */
  readonly legs: Leg[] | null;
  readonly radius: number;
  readonly isNew: boolean;
  readonly contractOk: boolean;

  constructor(row: ListingRow, today: string) {
    this.id = row.id!;
    this.url = row.url;
    this.sourceName = SOURCE_NAMES[row.source as Source] ?? row.source ?? '?';
    this.street = row.street ?? row.area ?? '?';
    this.area = omrade(row.area, this.street);
    this.rent = row.rent;
    this.m2 = row.m2 === null ? null : Number(row.m2);
    this.rooms = row.rooms === null ? null : Number(row.rooms);
    this.kpm = row.kpm;
    this.start = row.start_date;
    this.end = row.end_date;
    this.firstSeen = row.first_seen;
    this.lat = Number(row.lat);
    this.lon = Number(row.lon);
    this.latlng = [this.lat, this.lon];
    this.tags = tags({ firstHand: row.first_hand, student: row.student, furnished: row.furnished, flags: row.flags ?? [], notes: row.notes ?? [], alsoOn: row.also_on ?? [] });
    this.warn = isBelowMarket(row.flags ?? []);

    this.walk = walkMinutes(this, KARLAPLAN);
    this.sl = row.transit_min;
    this.t = travelMinutes(this.walk, this.sl);
    this.byFoot = this.t === this.walk;
    this.legs = this.byFoot ? null : (row.legs as unknown as Leg[] | null);

    this.radius = pinRadius(this.m2);
    this.isNew = row.first_seen === today;
    this.contractOk = contractOk(this.start, this.end, today);
  }
}
