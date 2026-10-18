'use client';
import { useQuery } from '@tanstack/react-query';
import { useSignal } from './store';
import type { FeedResponse } from '../../../packages/shared/index';
export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch('/api/' + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ?? 'Request failed');
  return data;
}
export function useEventParams(pageSize = 100, page = 1) {
  const { mode, category, source, country, q, hours, asOf } = useSignal();
  const params = new URLSearchParams({
    mode,
    category,
    source,
    country,
    q,
    pageSize: String(pageSize),
    page: String(page),
  });
  if (hours)
    params.set(
      'from',
      new Date(Math.floor(Date.now() / 60000) * 60000 - hours * 3600000).toISOString(),
    );
  if (asOf) params.set('asOf', asOf);
  return params;
}
export function useEvents(pageSize = 100, page = 1) {
  const params = useEventParams(pageSize, page);
  return useQuery<FeedResponse>({
    queryKey: ['events', params.toString()],
    queryFn: () => api('events?' + params),
    staleTime: 30000,
  });
}
