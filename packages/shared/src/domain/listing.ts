import { z } from 'zod';

export const SOURCES = ['qasa', 'homeq', 'bostadsformedlingen', 'samtrygg', 'facebook'] as const;
export type Source = (typeof SOURCES)[number];

export const SOURCE_NAMES: Record<Source, string> = {
  qasa: 'Qasa',
  homeq: 'HomeQ',
  bostadsformedlingen: 'Bostadsförmedlingen',
  samtrygg: 'Samtrygg',
  facebook: 'Facebook',
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
/** Missing or unparsable optional values become null instead of rejecting the listing (ARCHITECTURE.md §12). */
const optional = <T extends z.ZodTypeAny>(t: T) => t.nullable().catch(null);

/**
 * One ad on one site, as an adapter hands it to the pipeline.
 * Only source, id, link and position are required; everything else may be unknown.
 */
export const ListingInput = z.object({
  source: z.enum(SOURCES),
  sourceId: z.string().min(1),
  url: z.string().url(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  exactLocation: z.boolean().default(true),
  street: optional(z.string().trim().min(1)),
  area: optional(z.string().trim().min(1)),
  rent: optional(z.number().int().positive()),
  m2: optional(z.number().positive()),
  rooms: optional(z.number().positive()),
  startDate: optional(isoDate),
  endDate: optional(isoDate),
  firstHand: optional(z.boolean()),
  student: optional(z.boolean()),
  furnished: optional(z.boolean()),
  notes: z.array(z.string()).catch([]),
  flags: z.array(z.string()).catch([]),
});
export type ListingInput = z.infer<typeof ListingInput>;

/** ISO date (YYYY-MM-DD) of a date-like value, or null. */
export function isoDay(v: string | number | Date | null | undefined): string | null {
  if (v === null || v === undefined || v === '') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
