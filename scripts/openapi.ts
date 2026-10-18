import { writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { filtersSchema, watchlistSchema, chatSchema } from '../packages/validation/index';
import { sourceDefinitions } from '../packages/ingestion/sources';
const ref = (name: string) => ({ $ref: '#/components/schemas/' + name });
const array = (schema: object) => ({ type: 'array', items: schema });
const string = { type: 'string' };
const object = { type: 'object', additionalProperties: true };
const schemas: Record<string, unknown> = {
  Error: {
    type: 'object',
    properties: { error: string, requestId: string, details: array(string) },
    required: ['error'],
  },
  WatchlistInput: z.toJSONSchema(watchlistSchema),
  ChatInput: z.toJSONSchema(chatSchema),
  Event: {
    type: 'object',
    required: ['id', 'title', 'synthetic'],
    properties: {
      id: string,
      title: string,
      summary: string,
      category: string,
      status: string,
      verificationStatus: string,
      relevanceScore: { type: 'number' },
      occurredAt: { type: 'string', format: 'date-time' },
      firstDetectedAt: { type: 'string', format: 'date-time' },
      lastUpdatedAt: { type: 'string', format: 'date-time' },
      sourceId: string,
      sourceName: string,
      sourceUrl: string,
      sourceCount: { type: 'integer' },
      synthetic: { type: 'boolean' },
      latitude: { type: ['number', 'null'] },
      longitude: { type: ['number', 'null'] },
      locationName: string,
      countryCode: { type: ['string', 'null'] },
      precision: string,
      geometry: { description: 'Original provider GeoJSON; null when unknown.' },
    },
  },
  Feed: {
    type: 'object',
    properties: {
      items: array(ref('Event')),
      total: { type: 'integer' },
      page: { type: 'integer' },
      pageSize: { type: 'integer' },
      mode: { enum: ['live', 'demo'] },
      asOf: { type: 'string', format: 'date-time' },
    },
  },
  EventDetail: {
    type: 'object',
    properties: {
      event: ref('Event'),
      sources: array(object),
      versions: array(object),
      claims: array(object),
      related: array(ref('Event')),
      relatedReason: string,
    },
  },
  Watchlist: {
    type: 'object',
    properties: {
      id: string,
      user_id: string,
      name: string,
      keywords: string,
      category: string,
      source: string,
      enabled: { type: 'boolean' },
      created_at: string,
    },
  },
  Preferences: {
    type: 'object',
    required: ['locale', 'theme', 'alertsEnabled'],
    properties: {
      locale: { enum: ['en', 'de', 'fr', 'it', 'es', 'sq'] },
      theme: { enum: ['dark', 'light'] },
      alertsEnabled: { type: 'boolean' },
      quietStart: { type: ['integer', 'null'], minimum: 0, maximum: 23 },
      quietEnd: { type: ['integer', 'null'], minimum: 0, maximum: 23 },
      timezone: { type: 'string', default: 'UTC' },
    },
  },
};
for (const schema of Object.values(schemas))
  if (schema && typeof schema === 'object') delete (schema as any).$schema;
const filterJson = z.toJSONSchema(filtersSchema);
const filters = Object.entries(filterJson.properties ?? {}).map(([name, schema]) => ({
  name,
  in: 'query',
  required: false,
  schema,
}));
const mode = {
  name: 'mode',
  in: 'query',
  schema: { type: 'string', enum: ['live', 'demo'], default: 'live' },
};
const paths: Record<string, any> = {};
function add(
  method: string,
  path: string,
  summary: string,
  schema: object = object,
  options: {
    private?: boolean;
    admin?: boolean;
    body?: object;
    params?: any[];
    description?: string;
    status?: number;
    stream?: boolean;
  } = {},
) {
  const parameters = [
    ...(options.params ?? []),
    ...Array.from(path.matchAll(/\{([^}]+)\}/g), (m) => ({
      name: m[1],
      in: 'path',
      required: true,
      schema: string,
    })),
  ];
  if (method !== 'get')
    parameters.push({
      name: 'Origin',
      in: 'header',
      required: true,
      schema: { type: 'string' },
    } as any);
  paths[path] ??= {};
  paths[path][method] = {
    summary,
    description:
      options.description ?? (options.admin ? 'Administrator role required.' : undefined),
    operationId: method + '_' + path.replace(/[^a-zA-Z0-9]/g, '_'),
    security: options.private || options.admin ? [{ sessionCookie: [] }] : [],
    parameters,
    ...(options.body
      ? {
          requestBody: {
            required: true,
            content: { 'application/json': { schema: options.body } },
          },
        }
      : {}),
    responses: {
      [options.status ?? 200]: {
        description: 'Success',
        content: {
          [options.stream ? 'text/event-stream' : 'application/json']: {
            schema: options.stream ? string : schema,
          },
        },
      },
      ...Object.fromEntries(
        [400, 401, 403, 404, 413, 429, 503].map((code) => [
          code,
          {
            description: (
              {
                400: 'Invalid input',
                401: 'Authentication required',
                403: 'Role or origin denied',
                404: 'Not found',
                413: 'Body exceeds 20,000 bytes',
                429: 'Rate limit',
                503: 'Dependency or internal failure',
              } as any
            )[code],
            content: { 'application/json': { schema: ref('Error') } },
          },
        ]),
      ),
    },
  };
}
for (const path of ['/api/events', '/api/search', '/api/map/events'])
  add('get', path, 'Search collected event records', ref('Feed'), {
    params: filters,
    description:
      'Parameterized full-text search by default. Semantic/hybrid require a signed-in account, pgvector, configured embedding model and indexed data. Historical asOf uses recorded snapshots; semantic history is unsupported. bbox=west,south,east,north supports the dateline. from/to use occurrence time. category accepts comma-separated values. Source filtering uses the primary provider.',
  });
add(
  'get',
  '/api/events/{id}',
  'Current event, evidence, revisions and related records',
  ref('EventDetail'),
);
for (const section of ['timeline', 'sources', 'relations'])
  add('get', `/api/events/{id}/${section}`, `Event ${section}`, array(object));
add('get', '/api/map/clusters', 'Five-degree aggregate grid', object, {
  params: filters,
  description:
    'Only first 500 matching results are aggregated. Response includes coverage warning and total. This is not an unlimited server-clustering endpoint.',
});
for (const path of ['overview', 'trends', 'activity'])
  add('get', '/api/analytics/' + path, 'Database-derived ' + path, object, {
    params: [mode],
    description:
      'Selected mode with country, category, source, date and full-text filters; merged child events excluded. UTC publication dates for news and provider event dates for natural events. Activity covers 48 hours.',
  });
add('get', '/api/sources', 'Public source health and license metadata', array(object));
add('get', '/api/categories', 'Configured taxonomy', array(object));
add('get', '/api/countries', 'Country catalog and current-mode report counts', array(object), {
  params: [mode],
  description:
    'Country associations derive from domestic feed sections or explicit headline terms. Counts cover all stored reports in the selected mode. They do not establish exact event locations. Country filters use ISO alpha-2 codes, e.g. CH or DE.',
});
add('get', '/api/system/status', 'Database health and capability configuration');
add('get', '/api/watchlists', 'Account-owned watchlists', array(ref('Watchlist')), {
  private: true,
});
add('post', '/api/watchlists', 'Create watchlist', ref('Watchlist'), {
  private: true,
  body: ref('WatchlistInput'),
  status: 201,
});
add('patch', '/api/watchlists/{id}', 'Replace watchlist fields', ref('Watchlist'), {
  private: true,
  body: ref('WatchlistInput'),
  description:
    'Owner-only. Submit complete values; omitted optional fields reset to schema defaults.',
});
add('delete', '/api/watchlists/{id}', 'Delete owned watchlist', object, { private: true });
add('get', '/api/saved', 'Account-owned saved events', array(ref('Event')), { private: true });
add('post', '/api/saved', 'Save event', object, {
  private: true,
  body: {
    type: 'object',
    required: ['eventId'],
    properties: { eventId: { type: 'string', maxLength: 220 } },
  },
});
add('delete', '/api/saved/{id}', 'Remove saved event', object, { private: true });
add('get', '/api/notifications', 'Most recent 100 account notifications', array(object), {
  private: true,
});
add('post', '/api/notifications/read', 'Mark all own notifications read', object, {
  private: true,
});
add('get', '/api/preferences', 'Own notification and display preferences', object, {
  private: true,
});
add('patch', '/api/preferences', 'Save preferences', object, {
  private: true,
  body: ref('Preferences'),
});
add('get', '/api/account/export', 'Download account research data', object, { private: true });
add('get', '/api/ai/history', 'Last 50 own chat messages', array(object), { private: true });
add('post', '/api/ai/chat', 'Grounded evidence answer', string, {
  private: true,
  body: ref('ChatInput'),
  stream: true,
  description:
    'One validated SSE answer event after generation, not incremental token streaming. With AI_PROVIDER=none returns explicitly labeled source-title retrieval. Account history is persisted with mode/provider context. 10 requests/minute/user.',
});
add('get', '/api/stream/events', 'Durable public event stream', string, {
  stream: true,
  params: [
    mode,
    { name: 'Last-Event-ID', in: 'header', schema: { type: 'string', pattern: '^[0-9]{1,18}$' } },
    { name: 'cursor', in: 'query', schema: { type: 'string', pattern: '^[0-9]{1,18}$' } },
  ],
  description:
    'Last-Event-ID takes priority over cursor. Without either, starts at current outbox head. Connected/heartbeat plus persisted event.created, event.updated, event.merged, event.corrected. Poll interval and retry 4 seconds; batch 200. Filters synthetic mode. No private notification payloads.',
});
for (const name of ['monitoring', 'sources', 'events', 'jobs', 'users', 'audit'])
  add('get', '/api/admin/' + name, 'Inspect ' + name, object, { admin: true });
add('post', '/api/admin/import', 'Run approved source import', object, {
  admin: true,
  body: {
    type: 'object',
    required: ['sourceId'],
    properties: { sourceId: { enum: sourceDefinitions.map((source) => source.id) } },
  },
});
add('patch', '/api/admin/sources/{id}', 'Enable or disable source', object, {
  admin: true,
  body: { type: 'object', required: ['enabled'], properties: { enabled: { type: 'boolean' } } },
});
add('post', '/api/admin/clusters', 'Audited merge or split', object, {
  admin: true,
  body: {
    type: 'object',
    required: ['sourceId', 'targetId', 'action', 'reason'],
    properties: {
      sourceId: string,
      targetId: string,
      action: { enum: ['merge', 'split'] },
      reason: { type: 'string', minLength: 10, maxLength: 1000 },
    },
  },
});
add('post', '/api/admin/embeddings', 'Index up to 25 missing embeddings', object, { admin: true });
add('post', '/api/admin/categories', 'Add taxonomy category', object, {
  admin: true,
  body: {
    type: 'object',
    required: ['name', 'color'],
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 50 },
      color: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
    },
  },
});
const doc = {
  openapi: '3.1.0',
  info: {
    title: 'SIGNAL local API',
    version: '0.1.0',
    description:
      'Implemented route contract. Better Auth /api/auth/* is handled by Better Auth and documented separately. JSON APIs return no-store and X-Request-ID on ordinary responses. Global public read budget 1200/min; account writes 60/min. No public API-key auth. Authenticate through the same-origin Better Auth session cookie. Generic object responses expose current database field names; detailed schemas remain partial.',
  },
  servers: [{ url: 'http://127.0.0.1:3000' }],
  paths,
  components: {
    securitySchemes: {
      sessionCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'better-auth.session_token',
        description:
          'Better Auth cookie; production HTTPS may use the __Secure- prefix. Use the web login flow.',
      },
    },
    schemas,
  },
};
await writeFile('docs/openapi.json', JSON.stringify(doc, null, 2) + '\n');
console.log(`Documented ${Object.keys(paths).length} API paths.`);
