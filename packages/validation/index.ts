import { z } from 'zod';
export const filtersSchema = z
  .object({
    q: z.string().max(300).default(''),
    category: z.string().max(200).default(''),
    source: z.string().max(80).default(''),
    country: z
      .string()
      .regex(/^(?:[a-zA-Z]{2})?$/)
      .default(''),
    searchMode: z.enum(['fulltext', 'semantic', 'hybrid']).default('fulltext'),
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
    asOf: z.iso.datetime().optional(),
    bbox: z
      .string()
      .regex(/^-?[\d.]+,-?[\d.]+,-?[\d.]+,-?[\d.]+$/)
      .optional(),
    mode: z.enum(['live', 'demo']).default('live'),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    pageSize: z.coerce.number().int().min(1).max(500).default(50),
    sort: z.enum(['recent', 'relevance', 'oldest']).default('recent'),
  })
  .superRefine((x, ctx) => {
    if (x.from && x.to && x.from > x.to)
      ctx.addIssue({ code: 'custom', message: 'from must precede to' });
    if (x.bbox) {
      const [w, s, e, n] = x.bbox.split(',').map(Number);
      if (
        [w, s, e, n].some((v) => !Number.isFinite(v)) ||
        Math.abs(w) > 180 ||
        Math.abs(e) > 180 ||
        Math.abs(s) > 90 ||
        Math.abs(n) > 90 ||
        s > n
      )
        ctx.addIssue({ code: 'custom', message: 'Invalid geographic bounds' });
    }
  });
export const watchlistSchema = z.object({
  name: z.string().trim().min(1).max(80),
  keywords: z.string().max(300).default(''),
  category: z.string().max(100).default(''),
  source: z.string().max(80).default(''),
  enabled: z.boolean().default(true),
});
export const chatSchema = z.object({
  message: z.string().trim().min(2).max(2000),
  mode: z.enum(['live', 'demo']).default('live'),
  locale: z.enum(['en', 'de', 'fr', 'it', 'es', 'sq']).default('en'),
});
export const normalizedSchema = z.object({
  externalId: z.string().min(1).max(200),
  title: z.string().min(1).max(600),
  summary: z.string().max(2000),
  category: z.string(),
  status: z.string(),
  occurredAt: z.iso.datetime(),
  sourceUrl: z.url().refine((v) => /^https?:\/\//.test(v)),
  locationName: z.string(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  precision: z.enum(['reported_point', 'reported_area', 'country', 'unknown']),
  countryCodes: z
    .array(z.string().regex(/^[A-Z]{2}$/))
    .max(12)
    .default([]),
  countryBasis: z
    .array(
      z.object({
        code: z.string().regex(/^[A-Z]{2}$/),
        basis: z.enum(['source_section', 'headline_mention']),
        evidence: z.string().max(600),
      }),
    )
    .max(12)
    .default([]),
  timeBasis: z.enum(['provider_event', 'publication']).default('provider_event'),
  language: z.string().max(10).default('en'),
  magnitude: z.number().nullable(),
  relevanceScore: z.number().min(0).max(100),
  geometry: z.unknown().optional(),
  raw: z.unknown(),
});
export type NormalizedItem = z.infer<typeof normalizedSchema>;
export type NormalizedInput = z.input<typeof normalizedSchema>;
