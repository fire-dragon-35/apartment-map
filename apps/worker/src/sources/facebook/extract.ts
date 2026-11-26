/**
 * Reads one Facebook post and returns listing fields with a fixed schema (ARCHITECTURE.md §6 step 4).
 * Claude does the reading; zod decides what is kept. A post is read once per EXTRACTOR_VERSION.
 */
import { z } from 'zod';
import type { HttpClient } from '../../http.ts';

/** Raise when the prompt or the schema changes: every post in the window is then read again. */
export const EXTRACTOR_VERSION = 1;

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const maybe = <T extends z.ZodTypeAny>(t: T) => t.nullable().catch(null);

/** What a post says, nothing guessed. `kind` decides whether it becomes a listing at all. */
export const Extracted = z.object({
  kind: z.enum(['offer', 'wanted', 'swap', 'room', 'other']),
  scam: z.boolean(),
  area: maybe(z.string().trim().min(2)),
  street: maybe(z.string().trim().min(2)),
  rent: maybe(z.number().int().positive()),
  m2: maybe(z.number().positive()),
  rooms: maybe(z.number().positive()),
  start: maybe(z.union([isoDay, z.literal('now')])),
  end: maybe(isoDay),
  furnished: maybe(z.boolean()),
  firstHand: maybe(z.boolean()),
});
export type Extracted = z.infer<typeof Extracted>;

export interface Extractor {
  extract(post: { text: string; postedAt: string | null }): Promise<Extracted>;
}

const nullable = (type: string, description: string) => ({ type: [type, 'null'], description });
const SCHEMA = {
  type: 'object',
  required: ['kind', 'scam', 'area', 'street', 'rent', 'm2', 'rooms', 'start', 'end', 'furnished', 'firstHand'],
  properties: {
    kind: {
      type: 'string', enum: ['offer', 'wanted', 'swap', 'room', 'other'],
      description: 'offer = a whole home for rent; wanted = someone looking for a home; swap = exchange only; room = a room in a shared home; other = anything else',
    },
    scam: { type: 'boolean', description: 'obvious scam signs: central flat far below market, contact through an outside site or email, landlord abroad, pay before viewing' },
    area: nullable('string', 'district, suburb or municipality as written, e.g. "Södermalm", "Solna", "Hägersten"; null if not stated'),
    street: nullable('string', 'street name with number if stated'),
    rent: nullable('integer', 'monthly rent in kronor, including fees as stated'),
    m2: nullable('number', 'living area in square metres'),
    rooms: nullable('number', 'number of rooms (1 rok = 1, 2:a = 2)'),
    start: nullable('string', 'move-in date YYYY-MM-DD, or "now" for immediately'),
    end: nullable('string', 'last day YYYY-MM-DD; null when open-ended or not stated'),
    furnished: nullable('boolean', 'true furnished, false unfurnished, null not stated'),
    firstHand: nullable('boolean', 'true for a first-hand contract, false for a sublet, null not stated'),
  },
} as const;

const prompt = (text: string, postedAt: string | null) => `This is a post from a Facebook group for rentals in Stockholm, posted ${postedAt ?? 'recently'}.
Fill in the listing fields with what the post states. Never guess: anything not stated is null.
Dates without a year are the next such date after the posting day.

<post>
${text}
</post>`;

interface MessagesResponse { content: { type: string; input?: unknown }[] }

/** Claude Haiku through the Messages API, forced to answer with the `listing` tool. */
export class ClaudeExtractor implements Extractor {
  constructor(private readonly http: HttpClient, private readonly apiKey: string, private readonly model = 'claude-haiku-5-5') {}

  async extract({ text, postedAt }: { text: string; postedAt: string | null }): Promise<Extracted> {
    const res = await this.http.postJson<MessagesResponse>('https://api.anthropic.com/v1/messages', {
      model: this.model,
      max_tokens: 400,
      tools: [{ name: 'listing', description: 'The rental listing fields stated in the post.', input_schema: SCHEMA }],
      tool_choice: { type: 'tool', name: 'listing' },
      messages: [{ role: 'user', content: prompt(text.slice(0, 6000), postedAt) }],
    }, { 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01' });
    const input = res.content.find(c => c.type === 'tool_use')?.input;
    return Extracted.parse(input);
  }
}
