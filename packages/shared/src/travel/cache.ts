/** The travel_times table as a TravelCache. Types only from supabase-js, so Deno needs nothing to resolve. */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.ts';
import type { LatLon } from '../domain/place.ts';
import type { Leg } from './sl.ts';
import type { TravelCache, TravelRow } from './service.ts';

type Db = SupabaseClient<Database>;

/** `read` is whoever asks (row level security applies); `write` is the service role. The worker passes one for both. */
export class SupabaseTravelCache implements TravelCache {
  constructor(private readonly read: Db, private readonly write: Db = read) {}

  async fresh(placeIds: number[], dest: LatLon, profile: string, since: Date): Promise<TravelRow[]> {
    const { data, error } = await this.read.from('travel_times')
      .select('place_id, walk_min, transit_min, minutes, legs')
      .in('place_id', placeIds).eq('dest_lat', dest.lat).eq('dest_lon', dest.lon).eq('profile', profile)
      .gte('computed_at', since.toISOString());
    if (error) throw new Error(`travel_times read: ${error.message}`);
    return data.map(r => ({
      placeId: r.place_id, minutes: r.minutes, walkMin: r.walk_min, transitMin: r.transit_min, legs: r.legs as Leg[] | null,
    }));
  }

  async save(rows: TravelRow[], dest: LatLon, profile: string, at: Date): Promise<void> {
    if (!rows.length) return;
    const { error } = await this.write.from('travel_times').upsert(rows.map(r => ({
      place_id: r.placeId, dest_lat: dest.lat, dest_lon: dest.lon, profile,
      walk_min: r.walkMin, transit_min: r.transitMin, minutes: r.minutes, legs: r.legs as never, computed_at: at.toISOString(),
    })));
    if (error) throw new Error(`travel_times write: ${error.message}`);
  }
}
