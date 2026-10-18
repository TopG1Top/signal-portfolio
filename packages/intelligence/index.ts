import { createHash } from 'node:crypto';
import type { NormalizedItem } from '../validation/index';
export function canonicalUrl(input: string) {
  const u = new URL(input);
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Unsafe URL');
  u.hash = '';
  for (const key of [...u.searchParams.keys()])
    if (/^(utm_|fbclid|gclid)/i.test(key)) u.searchParams.delete(key);
  u.searchParams.sort();
  return u.toString();
}
export function contentHash(x: unknown) {
  return createHash('sha256').update(JSON.stringify(x)).digest('hex');
}
export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const r = Math.PI / 180;
  const dlat = (b.latitude - a.latitude) * r;
  const dlng = (b.longitude - a.longitude) * r;
  const h =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(a.latitude * r) * Math.cos(b.latitude * r) * Math.sin(dlng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export function clusterDecision(a: NormalizedItem, b: NormalizedItem) {
  const words = (s: string) => new Set(s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
  const x = words(a.title),
    y = words(b.title);
  const similarity =
    [...x].filter((w) => y.has(w)).length / Math.max(1, new Set([...x, ...y]).size);
  const hours = Math.abs(Date.parse(a.occurredAt) - Date.parse(b.occurredAt)) / 3600000;
  const km =
    a.latitude !== null && a.longitude !== null && b.latitude !== null && b.longitude !== null
      ? distanceKm(
          { latitude: a.latitude, longitude: a.longitude },
          { latitude: b.latitude, longitude: b.longitude },
        )
      : null;
  // Conservative candidate suggestion only: distinct provider IDs are never auto-merged.
  return {
    decision:
      similarity >= 0.8 && hours <= 6 && km !== null && km <= 20 && a.category === b.category
        ? 'review'
        : 'separate',
    scores: { similarity, hours, km, sameCategory: a.category === b.category },
  };
}
