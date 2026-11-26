/** Facebook posts and what was read from them (table `fb_posts`), so a post is read once per extractor version. */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@lk/shared';

export interface FbPost {
  postId: string;
  url: string;
  group: string | null;
  postedAt: string | null;
  text: string;
  /** null until read; then the validated fields plus the area's centre */
  extracted: Json | null;
  extractorVersion: number | null;
}

export interface FbPostRepository {
  /** Insert new posts; a known post keeps what was read from it. */
  add(posts: Omit<FbPost, 'extracted' | 'extractorVersion'>[]): Promise<void>;
  /** Every post posted on or after `day` (ISO). */
  since(day: string): Promise<FbPost[]>;
  saveExtracted(postId: string, isOffer: boolean, extracted: Json, version: number): Promise<void>;
}

type Row = Database['public']['Tables']['fb_posts']['Row'];
const fromRow = (r: Row): FbPost => ({
  postId: r.post_id, url: r.url, group: r.group_name, postedAt: r.posted_at, text: r.text,
  extracted: r.extracted, extractorVersion: r.extractor_version,
});

export class SupabaseFbPosts implements FbPostRepository {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async add(posts: Omit<FbPost, 'extracted' | 'extractorVersion'>[]) {
    if (!posts.length) return;
    const rows = posts.map(p => ({ post_id: p.postId, url: p.url, group_name: p.group, posted_at: p.postedAt, text: p.text }));
    const { error } = await this.db.from('fb_posts').upsert(rows, { onConflict: 'post_id', ignoreDuplicates: true });
    if (error) throw new Error(`add fb_posts: ${error.message}`);
  }

  async since(day: string) {
    const { data, error } = await this.db.from('fb_posts').select('*').gte('posted_at', day).order('posted_at');
    if (error) throw new Error(`load fb_posts: ${error.message}`);
    return data.map(fromRow);
  }

  async saveExtracted(postId: string, isOffer: boolean, extracted: Json, version: number) {
    const { error } = await this.db.from('fb_posts').update({ is_offer: isOffer, extracted, extractor_version: version }).eq('post_id', postId);
    if (error) throw new Error(`save fb_posts ${postId}: ${error.message}`);
  }
}

/** For tests. */
export class MemoryFbPosts implements FbPostRepository {
  readonly rows = new Map<string, FbPost>();

  async add(posts: Omit<FbPost, 'extracted' | 'extractorVersion'>[]) {
    for (const p of posts) if (!this.rows.has(p.postId)) this.rows.set(p.postId, { ...p, extracted: null, extractorVersion: null });
  }

  async since(day: string) {
    return [...this.rows.values()].filter(p => (p.postedAt ?? '') >= day);
  }

  async saveExtracted(postId: string, _isOffer: boolean, extracted: Json, version: number) {
    const p = this.rows.get(postId);
    if (p) this.rows.set(postId, { ...p, extracted, extractorVersion: version });
  }
}
