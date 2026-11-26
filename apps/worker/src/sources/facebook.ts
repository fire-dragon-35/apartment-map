/**
 * Facebook: public rental groups, fetched through Apify, read by Claude, placed at the area's centre.
 *
 * Apify returns only the last day's posts, so the result is the last WINDOW_DAYS of posts from `fb_posts`:
 * a listing then leaves the map 14 days after its post, through the normal "not seen in a complete run" rule.
 * A post that could not be read makes the run incomplete, so a Claude outage never removes listings.
 */
import type { Json } from '@lk/shared';
import type { HttpClient } from '../http.ts';
import type { FbPost, FbPostRepository } from '../store/fb-posts.ts';
import { SourceAdapter } from './base.ts';
import { EXTRACTOR_VERSION, Extracted, type Extractor } from './facebook/extract.ts';
import type { Geocoder } from './facebook/geocode.ts';

export const WINDOW_DAYS = 14;

/** A post with what was read from it, as stored in the raw file (replayable without the network). */
interface ReadPost extends FbPost {
  fields: Extracted | null;
  centre: { lat: number; lon: number } | null;
}
interface ApifyPost { postId?: string; url?: string; date?: string; text?: string; groupName?: string; listingTitle?: string; listingPrice?: string }

export interface FacebookDeps {
  apifyToken: string;
  groups: string[];
  posts: FbPostRepository;
  extractor: Extractor;
  geocoder: Geocoder;
  /** today, ISO */
  today: string;
  /** Apify waits for the actor; its own limit is 300 s */
  apifyHttp: HttpClient;
}

const daysBefore = (day: string, n: number) => new Date(Date.parse(day) - n * 86_400_000).toISOString().slice(0, 10);

export class Facebook extends SourceAdapter<ReadPost> {
  readonly source = 'facebook';

  constructor(private readonly deps: FacebookDeps) { super(); }

  protected async *pages() {
    const { posts, today } = this.deps;
    await posts.add((await this.#fetch()).flatMap(p => (p.postId && p.url && (p.text || p.listingTitle) ? [{
      postId: p.postId, url: p.url, group: p.groupName ?? null, postedAt: p.date ?? null,
      text: [p.listingTitle, p.listingPrice, p.text].filter(Boolean).join('\n'),
    }] : [])));

    const read: ReadPost[] = [];
    let failed = 0;
    for (const post of await posts.since(daysBefore(today, WINDOW_DAYS))) {
      try {
        read.push(await this.#read(post));
      } catch {
        failed++;
        read.push({ ...post, fields: null, centre: null });
      }
    }
    yield { posts: read };
    if (failed) throw new Error(`${failed} posts could not be read; they are retried next run`);
  }

  protected items(page: unknown) {
    return (page as { posts: ReadPost[] }).posts;
  }

  protected toListing(p: ReadPost) {
    const f = p.fields;
    if (!f || f.kind !== 'offer' || f.scam || !p.centre) return null;
    const posted = p.postedAt?.slice(0, 10) ?? null;
    return {
      sourceId: p.postId, url: p.url, lat: p.centre.lat, lon: p.centre.lon, exactLocation: false,
      street: f.street, area: f.area, rent: f.rent, m2: f.m2, rooms: f.rooms,
      startDate: f.start === 'now' ? posted : f.start, endDate: f.end,
      firstHand: f.firstHand, furnished: f.furnished,
    };
  }

  async #fetch(): Promise<ApifyPost[]> {
    const { apifyHttp, apifyToken, groups } = this.deps;
    return apifyHttp.postJson<ApifyPost[]>(
      `https://api.apify.com/v2/acts/eiv~facebook-groups-scraper/run-sync-get-dataset-items?token=${apifyToken}&timeout=280`,
      { startUrls: groups.map(url => ({ url })), resultsLimit: 200, onlyPostsNewerThan: '1 day' },
    );
  }

  /** Read once per extractor version; the stored result (fields and centre) is reused after that. */
  async #read(post: FbPost): Promise<ReadPost> {
    const stored = post.extracted as { fields?: unknown; centre?: ReadPost['centre'] } | null;
    if (post.extractorVersion === EXTRACTOR_VERSION && stored) {
      return { ...post, fields: Extracted.parse(stored.fields), centre: stored.centre ?? null };
    }
    const fields = await this.deps.extractor.extract({ text: post.text, postedAt: post.postedAt });
    const isOffer = fields.kind === 'offer' && !fields.scam;
    const place = fields.area ?? fields.street;
    const centre = isOffer && place ? await this.deps.geocoder.locate(place) : null;
    const extracted = { fields, centre } as unknown as Json;
    await this.deps.posts.saveExtracted(post.postId, isOffer, extracted, EXTRACTOR_VERSION);
    return { ...post, extracted, extractorVersion: EXTRACTOR_VERSION, fields, centre };
  }
}
