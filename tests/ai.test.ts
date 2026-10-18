import { describe, it, expect, vi, afterEach } from 'vitest';
import { groundedAnswer } from '../packages/ai/index';
import { vectorSchema } from '../packages/ai/embeddings';
import type { EventRecord } from '../packages/shared/index';
const record: EventRecord = {
  id: 'synthetic-test',
  title: 'Synthetic exercise',
  summary: 'Synthetic test evidence only.',
  category: 'Science',
  status: 'reported',
  verificationStatus: 'source_reported',
  relevanceScore: 1,
  occurredAt: '2024-01-01T00:00:00Z',
  firstDetectedAt: '2024-01-02T00:00:00Z',
  lastUpdatedAt: '2024-01-02T00:00:00Z',
  locationName: 'Unknown',
  countryCode: null,
  latitude: null,
  longitude: null,
  precision: 'unknown',
  sourceId: 'demo',
  sourceName: 'Synthetic dataset',
  sourceUrl: 'https://example.org',
  sourceCount: 1,
  magnitude: null,
  synthetic: true,
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe('grounded AI boundary', () => {
  it('labels retrieval-only mode and never invents a source', async () => {
    vi.stubEnv('AI_PROVIDER', 'none');
    const r = await groundedAnswer('exercise', [record], 'en');
    expect(r.provider).toBe('retrieval-only');
    expect(r.citations[0].quote).toBe(record.title);
  });
  it('rejects invented citations even if model returns schema-valid JSON', async () => {
    vi.stubEnv('AI_PROVIDER', 'openai');
    vi.stubEnv('AI_MODEL', 'test-model');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  answer: 'An invented assertion',
                  citations: [{ eventId: 'not-in-evidence', quote: 'Fake quote' }],
                  uncertainties: [],
                }),
              },
            },
          ],
        }),
      ),
    );
    await expect(groundedAnswer('test', [record], 'en')).rejects.toThrow('citation failed');
  });
  it('rejects fabricated quotations attached to a real ID', async () => {
    vi.stubEnv('AI_PROVIDER', 'openai');
    vi.stubEnv('AI_MODEL', 'test-model');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  answer: 'Fake',
                  citations: [{ eventId: record.id, quote: 'This was independently confirmed.' }],
                  uncertainties: [],
                }),
              },
            },
          ],
        }),
      ),
    );
    await expect(groundedAnswer('test', [record], 'en')).rejects.toThrow('citation failed');
  });
  it('rejects empty quotes and invalid embedding dimensions', () => {
    expect(() => vectorSchema.parse([1, 2, 3])).toThrow();
    expect(() => vectorSchema.parse(Array(1536).fill(Infinity))).toThrow();
    expect(vectorSchema.parse(Array(1536).fill(0.1))).toHaveLength(1536);
  });
});
