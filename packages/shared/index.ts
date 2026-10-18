export const categories = [
  'Politics',
  'Geopolitics',
  'Conflicts',
  'Economy',
  'Finance',
  'Technology',
  'Artificial Intelligence',
  'Cybersecurity',
  'Science',
  'Space',
  'Energy',
  'Environment',
  'Natural Disasters',
  'Health',
  'Society',
  'Transportation',
  'Infrastructure',
  'Sports',
  'Culture',
] as const;
export const categoryColors: Record<string, string> = {
  'Natural Disasters': '#fb923c',
  Environment: '#34d399',
  Space: '#a78bfa',
  Science: '#38bdf8',
  Technology: '#818cf8',
  Conflicts: '#f87171',
  Politics: '#fbbf24',
  Energy: '#fde047',
  Economy: '#2dd4bf',
  Finance: '#10b981',
  'Artificial Intelligence': '#c084fc',
  Cybersecurity: '#f472b6',
  Health: '#fb7185',
  Society: '#60a5fa',
  Sports: '#a3e635',
  Culture: '#e879f9',
  Geopolitics: '#f59e0b',
  Transportation: '#22d3ee',
  Infrastructure: '#94a3b8',
};
export type EventRecord = {
  id: string;
  title: string;
  summary: string;
  category: string;
  status: string;
  verificationStatus: string;
  relevanceScore: number;
  occurredAt: string;
  firstDetectedAt: string;
  lastUpdatedAt: string;
  locationName: string;
  countryCode: string | null;
  countryCodes?: string[];
  countryBasis?: import('./countries').CountryReference[];
  timeBasis?: 'provider_event' | 'publication';
  latitude: number | null;
  longitude: number | null;
  precision: string;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  sourceCount: number;
  magnitude: number | null;
  synthetic: boolean;
  geometry?: unknown;
};
export type FeedResponse = {
  items: EventRecord[];
  total: number;
  page: number;
  pageSize: number;
  asOf: string;
  mode: 'live' | 'demo';
};
export const formatTime = (value: string) =>
  new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }) + ' UTC';
