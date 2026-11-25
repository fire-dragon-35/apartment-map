/**
 * The daily email (CORE.md: paid). For every saved search with alerts on, of a paying user: today's new listings that
 * pass its filters with restid to all its pins, sent once a day. Plain function, so the edge function stays a thin
 * wrapper. restid comes from the travel matrix, as on the page.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.ts';
import { KARLAPLAN } from '../domain/place.ts';
import { contractOk, DEFAULT_FILTERS, passesFilters, type PageFilters } from '../format/design.ts';
import { fmt } from '../format/index.ts';
import { destKey, MATRIX_PROFILE } from '../travel/grid.ts';
import { MatrixReader } from '../travel/matrix.ts';

type Row = Database['public']['Views']['listings_karlaplan']['Row'];

export interface NotifyDeps {
  /** the service role: reads every saved search and user email */
  db: SupabaseClient<Database>;
  send(to: string, subject: string, html: string): Promise<void>;
  today: string;
  siteUrl: string;
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function emailHtml(hits: Row[], siteUrl: string): string {
  const items = hits.map(r => `<li style="margin:0 0 12px"><a href="${esc(r.url)}" style="color:#3A2DC2;font-weight:600">${esc(r.street ?? r.area ?? 'Annons')}</a>`
    + `${r.area && r.street ? ` <span style="color:#6E6E6E">${esc(r.area)}</span>` : ''}<br>`
    + `${esc([fmt.hyra(r.rent), r.m2 ? `${r.m2} m²` : null, r.kpm ? `${r.kpm} kr/m²` : null].filter(Boolean).join(' · '))}</li>`).join('');
  return `<div style="font-family:system-ui,sans-serif;font-size:15px;color:#0A0A0A">`
    + `<p>${hits.length === 1 ? 'En ny annons' : `${hits.length} nya annonser`} som passar din sökning:</p><ul style="padding-left:18px">${items}</ul>`
    + `<p><a href="${esc(siteUrl)}/#/karta" style="color:#3A2DC2">Öppna kartan</a> · <a href="${esc(siteUrl)}/#/logga-in" style="color:#6E6E6E">Stäng av bevakningen</a></p></div>`;
}

export async function notifyMatches({ db, send, today, siteUrl }: NotifyDeps): Promise<{ searches: number; sent: number }> {
  const { data: searches, error } = await db.from('saved_searches').select('id, user_id, filters, last_sent_on').eq('alerts', true);
  if (error) throw new Error(`saved_searches: ${error.message}`);
  const { data: rows, error: e2 } = await db.from('listings_karlaplan').select('*').eq('first_seen', today);
  if (e2) throw new Error(`listings_karlaplan: ${e2.message}`);
  let sent = 0;
  if (!searches.length || !rows.length) return { searches: searches.length, sent };

  const matrix = new MatrixReader(db);
  const placeIds = rows.map(r => r.place_id);
  for (const s of searches) {
    if (s.last_sent_on === today) continue;
    const { data: paying } = await db.rpc('is_paying', { uid: s.user_id });
    if (paying !== true) continue;

    const { data: pins } = await db.from('destinations').select('lat, lon').eq('user_id', s.user_id).order('id');
    const dests = (pins?.length ? pins : [KARLAPLAN]).map(p => ({ lat: Number(p.lat), lon: Number(p.lon) }));
    const perPin = await Promise.all(dests.map(d => matrix.minutes(destKey(d), MATRIX_PROFILE, placeIds)));
    const f: PageFilters = { ...DEFAULT_FILTERS, ...(s.filters as Partial<PageFilters>) };

    const hits = rows.filter(r => {
      const times = perPin.map(m => m.get(r.place_id) ?? null);
      if (times.some(t => t === null)) return false;
      const l = { t: Math.max(...(times as number[])), rent: r.rent, kpm: r.kpm, m2: r.m2 === null ? null : Number(r.m2), rooms: r.rooms === null ? null : Number(r.rooms), contractOk: contractOk(r.start_date, r.end_date, today) };
      return passesFilters(l, f);
    });
    if (!hits.length) continue;

    const { data: u } = await db.auth.admin.getUserById(s.user_id);
    const email = u.user?.email;
    if (!email) continue;
    await send(email, `EnkelLGH: ${hits.length === 1 ? 'en ny annons' : `${hits.length} nya annonser`}`, emailHtml(hits, siteUrl));
    await db.from('saved_searches').update({ last_sent_on: today }).eq('id', s.id);
    sent++;
  }
  return { searches: searches.length, sent };
}
