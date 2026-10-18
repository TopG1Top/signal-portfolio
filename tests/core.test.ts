import { describe, it, expect } from 'vitest';
import { normalizeUSGS, normalizeEONET } from '../packages/ingestion/connectors';
import {
  canonicalUrl,
  clusterDecision,
  contentHash,
  distanceKm,
} from '../packages/intelligence/index';
import { filtersSchema } from '../packages/validation/index';
const fixture = {
  id: 'fixture-quake',
  properties: {
    title: 'Synthetic M4 test',
    place: 'Synthetic test region',
    mag: 4,
    time: 1700000000000,
    updated: 1700000000000,
    url: 'https://earthquake.usgs.gov/earthquakes/eventpage/test',
    status: 'reviewed',
  },
  geometry: { type: 'Point', coordinates: [12, 48, 5] },
};
describe('normalization and evidence integrity', () => {
  it('preserves source coordinates and UTC timestamps', () => {
    const x = normalizeUSGS(fixture);
    expect(x.longitude).toBe(12);
    expect(x.latitude).toBe(48);
    expect(x.occurredAt).toBe('2023-11-14T22:13:20.000Z');
    expect(x.precision).toBe('reported_point');
  });
  it('rejects malformed coordinates and unsafe source URLs', () => {
    expect(() =>
      normalizeUSGS({ ...fixture, geometry: { type: 'Point', coordinates: [190, 0, 0] } }),
    ).toThrow();
    expect(() =>
      normalizeUSGS({
        ...fixture,
        properties: { ...fixture.properties, url: 'javascript:alert(1)' },
      }),
    ).toThrow();
  });
  it('does not manufacture a point for an EONET polygon', () => {
    const x = normalizeEONET({
      id: 'test',
      title: 'Synthetic area',
      link: 'https://eonet.gsfc.nasa.gov/api/v3/events/test',
      closed: null,
      categories: [{ id: 'wildfires', title: 'Wildfires' }],
      sources: [],
      geometry: [
        {
          date: '2024-01-01T00:00:00Z',
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 0],
            ],
          ],
        },
      ],
    });
    expect(x.latitude).toBeNull();
    expect(x.precision).toBe('reported_area');
  });
  it('removes tracking, preserves meaningful query, rejects unsafe protocols', () => {
    expect(canonicalUrl('https://example.org/report?id=5&utm_source=x#top')).toBe(
      'https://example.org/report?id=5',
    );
    expect(() => canonicalUrl('file:///etc/passwd')).toThrow();
  });
  it('hashes normalized changes deterministically', () => {
    expect(contentHash({ title: 'A' })).toBe(contentHash({ title: 'A' }));
    expect(contentHash({ title: 'A' })).not.toBe(contentHash({ title: 'B' }));
  });
  it('never auto-merges similar titles and rejects distant events', () => {
    const a = normalizeUSGS(fixture),
      b = { ...a, latitude: -40, longitude: 150 };
    expect(clusterDecision(a, b).decision).toBe('separate');
    expect(clusterDecision(a, a).decision).toBe('review');
  });
  it('handles antimeridian distance', () => {
    expect(
      distanceKm({ latitude: 0, longitude: 179.9 }, { latitude: 0, longitude: -179.9 }),
    ).toBeLessThan(23);
  });
});
describe('query validation', () => {
  it('bounds pagination and dates', () => {
    expect(() => filtersSchema.parse({ pageSize: 501 })).toThrow();
    expect(() =>
      filtersSchema.parse({ from: '2026-02-01T00:00:00Z', to: '2026-01-01T00:00:00Z' }),
    ).toThrow();
  });
  it('accepts dateline crossing and rejects impossible latitudes', () => {
    expect(filtersSchema.parse({ bbox: '170,-20,-170,20' }).bbox).toBeTruthy();
    expect(() => filtersSchema.parse({ bbox: '-180,-95,180,90' })).toThrow();
  });
  it('defaults to real data and limits injection surface', () => {
    expect(filtersSchema.parse({}).mode).toBe('live');
    expect(() => filtersSchema.parse({ sort: 'id; DROP TABLE events' })).toThrow();
  });
});
