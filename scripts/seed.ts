import 'dotenv/config';
import { pool } from '../packages/database/index';
import { persistItem } from '../packages/ingestion/index';
const demos = [
  ['Exercise: regional earthquake response', 'Natural Disasters', 35.68, 139.76],
  ['Exercise: coastal flood monitoring', 'Environment', 52.37, 4.9],
  ['Exercise: orbital research launch', 'Space', 28.57, -80.65],
  ['Exercise: grid resilience review', 'Energy', 46.95, 7.45],
  ['Exercise: network incident investigation', 'Cybersecurity', 51.5, -0.12],
  ['Exercise: public health coordination', 'Health', -1.29, 36.82],
  ['Exercise: transport corridor restoration', 'Infrastructure', 1.35, 103.82],
  ['Exercise: forest observation campaign', 'Environment', -3.47, -62.22],
] as const;
for (let i = 0; i < demos.length; i++) {
  const [title, category, latitude, longitude] = demos[i];
  await persistItem(
    'demo',
    {
      externalId: String(i),
      title: '[SYNTHETIC] ' + title,
      summary:
        'Synthetic training scenario. This is not a real event or a news report. Coordinates are illustrative exercise locations.',
      category,
      status: 'developing',
      occurredAt: new Date(Date.now() - i * 2 * 3600000).toISOString(),
      sourceUrl: 'https://example.org/synthetic/' + i,
      locationName: 'Illustrative exercise location',
      latitude,
      longitude,
      precision: 'reported_point',
      magnitude: null,
      relevanceScore: 80 - i * 5,
      geometry: { type: 'Point', coordinates: [longitude, latitude] },
      raw: { synthetic: true },
    },
    true,
  );
}
console.log('8 explicitly synthetic events seeded in separate demo mode.');
await pool.end();
