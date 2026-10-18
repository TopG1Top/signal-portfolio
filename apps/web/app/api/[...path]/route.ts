import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { query, transaction } from '../../../../../packages/database/index';
import { watchlistSchema, chatSchema } from '../../../../../packages/validation/index';
import { groundedAnswer } from '../../../../../packages/ai/index';
import { listEvents, eventSelect } from '../../../lib/events';
import { sourceDefinitions } from '../../../../../packages/ingestion/sources';
import { countries } from '../../../../../packages/shared/countries';
import { isPortfolio } from '../../../../../packages/shared/portfolio';
import { portfolioGet } from '../../../../../packages/portfolio/index';
import {
  body,
  checkOrigin,
  failure,
  HttpError,
  json,
  rateLimit,
  requireUser,
} from '../../../lib/server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params;
    const route = path.join('/'),
      url = new URL(request.url),
      mode = url.searchParams.get('mode') === 'demo';
    if (isPortfolio) {
      if (url.searchParams.has('searchMode') && url.searchParams.get('searchMode') !== 'fulltext')
        return json(
          { error: 'Semantic search requires the database-backed edition.', portfolio: true },
          501,
        );
      const result = portfolioGet(path, url.searchParams);
      return result === null
        ? json(
            {
              error: 'This endpoint is not part of the read-only portfolio demo.',
              portfolio: true,
            },
            404,
          )
        : json(result);
    }
    await rateLimit('public-api', 1200);
    if (route === 'events' || route === 'search' || route === 'map/events') {
      if (url.searchParams.get('searchMode') && url.searchParams.get('searchMode') !== 'fulltext') {
        const u = await requireUser(request);
        await rateLimit('semantic:' + u.id, 10);
      }
      return json(await listEvents(url.searchParams));
    }
    if (route === 'map/clusters') {
      const data = await listEvents(
        new URLSearchParams({ ...Object.fromEntries(url.searchParams), pageSize: '500' }),
      );
      const cells = new Map<string, { longitude: number; latitude: number; count: number }>();
      for (const e of data.items) {
        if (e.longitude === null || e.latitude === null) continue;
        const k = `${Math.floor(e.longitude / 5)}:${Math.floor(e.latitude / 5)}`;
        const c = cells.get(k) ?? { longitude: 0, latitude: 0, count: 0 };
        c.longitude += e.longitude;
        c.latitude += e.latitude;
        c.count++;
        cells.set(k, c);
      }
      return json({
        items: [...cells.values()].map((c) => ({
          ...c,
          longitude: c.longitude / c.count,
          latitude: c.latitude / c.count,
        })),
        total: data.total,
        coverage: 'First 500 viewport results; client clustering also available',
      });
    }
    if (path[0] === 'events' && path[1]) {
      const id = path[1],
        section = path[2];
      const [event] = await query(eventSelect + ' WHERE e.id=$1', [id]);
      if (!event) throw new HttpError(404, 'Event not found');
      if (section === 'timeline')
        return json(
          await query('SELECT * FROM event_versions WHERE event_id=$1 ORDER BY recorded_at', [id]),
        );
      if (section === 'sources')
        return json(
          await query(
            'SELECT a.*,s.name FROM articles a JOIN event_articles ea ON ea.article_id=a.id JOIN news_sources s ON s.id=a.source_id WHERE ea.event_id=$1',
            [id],
          ),
        );
      if (section === 'relations')
        return json(
          await query('SELECT * FROM event_relations WHERE from_id=$1 OR to_id=$1', [id]),
        );
      const [sources, versions, claims, related] = await Promise.all([
        query(
          'SELECT a.id,a.title,a.canonical_url,a.published_at,a.fetched_at,s.name,s.license FROM articles a JOIN event_articles ea ON ea.article_id=a.id JOIN news_sources s ON s.id=a.source_id WHERE ea.event_id=$1',
          [id],
        ),
        query(
          'SELECT id,recorded_at,snapshot FROM event_versions WHERE event_id=$1 ORDER BY recorded_at DESC LIMIT 50',
          [id],
        ),
        query(
          'SELECT c.*,ce.excerpt,a.canonical_url FROM event_claims c JOIN claim_evidence ce ON ce.claim_id=c.id JOIN articles a ON a.id=ce.article_id WHERE c.event_id=$1',
          [id],
        ),
        query(
          eventSelect +
            ' WHERE e.category=$1 AND e.synthetic=$2 AND e.id<>$3 ORDER BY e.occurred_at DESC LIMIT 4',
          [event.category, event.synthetic, id],
        ),
      ]);
      return json({
        event,
        sources,
        versions,
        claims,
        related,
        relatedReason: 'Shared category only. No causal relationship is asserted.',
      });
    }
    if (route === 'sources')
      return json(
        await query(
          "SELECT id,name,type,endpoint,enabled,last_success,last_attempt,status,error,license,poll_interval FROM news_sources WHERE type<>'synthetic' ORDER BY id",
        ),
      );
    if (route === 'categories') return json(await query('SELECT * FROM categories ORDER BY id'));
    if (route === 'countries') {
      const counts = await query(
        'SELECT code,count(DISTINCT e.id)::int AS count FROM events e JOIN event_locations l ON l.event_id=e.id CROSS JOIN LATERAL unnest(l.country_codes) AS code WHERE e.synthetic=$1 AND e.merged_into IS NULL GROUP BY code',
        [mode],
      );
      return json(
        countries.map((country) => ({
          code: country.code,
          name: country.name,
          nameDe: country.nameDe,
          continent: country.continent,
          bbox: country.bbox,
          count: counts.find((row) => row.code === country.code)?.count ?? 0,
        })),
      );
    }
    if (['analytics/activity', 'analytics/overview', 'analytics/trends'].includes(route)) {
      const { analytics } = await import('../../../lib/analytics');
      return json(await analytics(path[1], url.searchParams));
    }
    if (route === 'system/status') {
      await query('SELECT 1');
      return json({
        status: 'ok',
        database: 'connected',
        extensions: (await query('SELECT extname FROM pg_extension')).map((r) => r.extname),
        ai: process.env.AI_PROVIDER ?? 'none',
        queue: process.env.REDIS_URL ? 'redis-configured' : 'local-polling',
        smtpConfigured: !!process.env.SMTP_HOST,
        time: new Date().toISOString(),
      });
    }
    if (route === 'watchlists') {
      const u = await requireUser(request);
      return json(
        await query('SELECT * FROM watchlists WHERE user_id=$1 ORDER BY created_at DESC', [u.id]),
      );
    }
    if (route === 'saved') {
      const u = await requireUser(request);
      return json(
        await query(
          eventSelect +
            ' JOIN saved_events se ON se.event_id=e.id WHERE se.user_id=$1 ORDER BY se.created_at DESC',
          [u.id],
        ),
      );
    }
    if (route === 'notifications') {
      const u = await requireUser(request);
      return json(
        await query(
          'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',
          [u.id],
        ),
      );
    }
    if (route === 'preferences') {
      const u = await requireUser(request);
      return json(
        (await query('SELECT * FROM user_preferences WHERE user_id=$1', [u.id]))[0] ?? {},
      );
    }
    if (route === 'account/export') {
      const u = await requireUser(request);
      const data = {
        profile: u,
        watchlists: await query('SELECT * FROM watchlists WHERE user_id=$1', [u.id]),
        saved: await query('SELECT * FROM saved_events WHERE user_id=$1', [u.id]),
        preferences: await query('SELECT * FROM user_preferences WHERE user_id=$1', [u.id]),
        notifications: await query('SELECT * FROM notifications WHERE user_id=$1', [u.id]),
        chat: await query('SELECT * FROM chat_messages WHERE user_id=$1', [u.id]),
      };
      return new Response(JSON.stringify(data, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="signal-personal-data.json"',
          'Cache-Control': 'no-store',
        },
      });
    }
    if (route === 'ai/history') {
      const u = await requireUser(request);
      return json(
        await query(
          'SELECT * FROM chat_messages WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT 50',
          [u.id],
        ),
      );
    }
    if (path[0] === 'admin') {
      await requireUser(request, ['admin']);
      if (path[1] === 'users')
        return json(
          await query(
            'SELECT id,name,email,role,"createdAt" FROM "user" ORDER BY "createdAt" DESC LIMIT 100',
          ),
        );
      if (path[1] === 'audit')
        return json(await query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200'));
      if (path[1] === 'sources') return json(await query('SELECT * FROM news_sources ORDER BY id'));
      if (path[1] === 'events')
        return json({
          candidates: await query(
            'SELECT * FROM cluster_decisions ORDER BY created_at DESC LIMIT 100',
          ),
          merges: await query(
            'SELECT id,title,merged_into FROM events WHERE merged_into IS NOT NULL',
          ),
        });
      return json({
        jobs: await query('SELECT * FROM ingestion_jobs ORDER BY started_at DESC LIMIT 100'),
        sources: await query('SELECT * FROM news_sources'),
        usage: await query(
          'SELECT provider,model,count(*)::int AS requests FROM ai_usage GROUP BY provider,model',
        ),
        outbox: await query('SELECT count(*)::int AS count,max(id) AS cursor FROM outbox'),
      });
    }
    throw new HttpError(404, 'Endpoint not found');
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (isPortfolio)
    return json(
      {
        error: 'The portfolio demo is read-only and has no user accounts or external services.',
        portfolio: true,
      },
      501,
    );
  try {
    checkOrigin(request);
    const u = await requireUser(request);
    await rateLimit('write:' + u.id, 60);
    const { path } = await params,
      route = path.join('/');
    if (route === 'watchlists') {
      const w = await body(request, watchlistSchema);
      const [row] = await query(
        'INSERT INTO watchlists(id,user_id,name,keywords,category,source,enabled) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
        [randomUUID(), u.id, w.name, w.keywords, w.category, w.source, w.enabled],
      );
      return json(row, 201);
    }
    if (route === 'saved') {
      const { eventId } = await body(request, z.object({ eventId: z.string().max(220) }));
      await query(
        'INSERT INTO saved_events(user_id,event_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
        [u.id, eventId],
      );
      return json({ saved: true });
    }
    if (route === 'notifications/read') {
      await query('UPDATE notifications SET read=true WHERE user_id=$1', [u.id]);
      return json({ ok: true });
    }
    if (route === 'ai/chat') {
      await rateLimit('ai:' + u.id, 10);
      const input = await body(request, chatSchema);
      const search = new URLSearchParams({
        q: input.message.slice(0, 300),
        mode: input.mode,
        pageSize: '8',
      });
      let data = await listEvents(search);
      if (!data.items.length) {
        search.set(
          'q',
          input.message
            .split(/\s+/)
            .filter((w) => w.length > 4)
            .slice(0, 3)
            .join(' OR '),
        );
        data = await listEvents(search);
      }
      const answer = await groundedAnswer(input.message, data.items, input.locale);
      await transaction(async (c) => {
        await c.query(
          "INSERT INTO chat_messages(user_id,role,content,mode) VALUES($1,'user',$2,$3)",
          [u.id, input.message, input.mode],
        );
        await c.query(
          "INSERT INTO chat_messages(user_id,role,content,citations,mode,provider,uncertainties) VALUES($1,'assistant',$2,$3,$4,$5,$6)",
          [
            u.id,
            answer.answer,
            JSON.stringify(answer.citations),
            input.mode,
            answer.provider,
            JSON.stringify(answer.uncertainties),
          ],
        );
      });
      await query('INSERT INTO ai_usage(user_id,provider,model) VALUES($1,$2,$3)', [
        u.id,
        answer.provider,
        process.env.AI_MODEL ?? 'none',
      ]);
      const encoder = new TextEncoder();
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                `event: answer\ndata: ${JSON.stringify({ ...answer, events: data.items })}\n\n`,
              ),
            );
            controller.close();
          },
        }),
        { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' } },
      );
    }
    if (path[0] === 'admin') {
      await requireUser(request, ['admin']);
      if (path[1] === 'clusters') {
        const input = await body(
          request,
          z.object({
            sourceId: z.string().max(220),
            targetId: z.string().max(220),
            action: z.enum(['merge', 'split']),
            reason: z.string().min(10).max(1000),
          }),
        );
        const { correctCluster } = await import('../../../../../packages/intelligence/clusters');
        try {
          return json(
            await correctCluster(u.id, input.sourceId, input.targetId, input.action, input.reason),
          );
        } catch (e) {
          throw new HttpError(400, (e as Error).message);
        }
      }
      if (path[1] === 'embeddings') {
        await rateLimit('index:' + u.id, 1);
        const { indexEmbeddings } = await import('../../../../../packages/ai/embeddings');
        const result = await indexEmbeddings(25);
        await query(
          "INSERT INTO audit_logs(user_id,action,target,details) VALUES($1,'embeddings.index','events',$2)",
          [u.id, JSON.stringify(result)],
        );
        return json(result);
      }
      if (path[1] === 'import') {
        const { sourceId } = await body(
          request,
          z.object({
            sourceId: z
              .string()
              .refine(
                (id) => sourceDefinitions.some((source) => source.id === id),
                'Unknown approved source',
              ),
          }),
        );
        await rateLimit('import:' + sourceId, 1);
        const { ingestSource } = await import('../../../../../packages/ingestion/index');
        const result = await ingestSource(sourceId);
        await query("INSERT INTO audit_logs(user_id,action,target) VALUES($1,'source.import',$2)", [
          u.id,
          sourceId,
        ]);
        return json(result);
      }
      if (path[1] === 'categories') {
        const input = await body(
          request,
          z.object({
            name: z.string().min(2).max(50),
            color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
          }),
        );
        await transaction(async (c) => {
          await c.query('INSERT INTO categories(id,color) VALUES($1,$2)', [
            input.name,
            input.color,
          ]);
          await c.query(
            "INSERT INTO audit_logs(user_id,action,target) VALUES($1,'category.create',$2)",
            [u.id, input.name],
          );
        });
        return json({ ok: true });
      }
    }
    throw new HttpError(404, 'Endpoint not found');
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (isPortfolio) return json({ error: 'The portfolio demo is read-only.', portfolio: true }, 501);
  try {
    checkOrigin(request);
    const u = await requireUser(request);
    await rateLimit('write:' + u.id, 60);
    const { path } = await params;
    if (path[0] === 'watchlists' && path[1]) {
      const w = await body(request, watchlistSchema);
      const rows = await query(
        'UPDATE watchlists SET name=$3,keywords=$4,category=$5,source=$6,enabled=$7 WHERE id=$1 AND user_id=$2 RETURNING *',
        [path[1], u.id, w.name, w.keywords, w.category, w.source, w.enabled],
      );
      if (!rows.length) throw new HttpError(404, 'Watchlist not found');
      return json(rows[0]);
    }
    if (path[0] === 'preferences') {
      const p = await body(
        request,
        z.object({
          locale: z.enum(['en', 'de', 'fr', 'it', 'es', 'sq']),
          theme: z.enum(['dark', 'light']),
          alertsEnabled: z.boolean(),
          quietStart: z.number().int().min(0).max(23).nullable().optional(),
          quietEnd: z.number().int().min(0).max(23).nullable().optional(),
          timezone: z.string().max(80).default('UTC'),
        }),
      );
      try {
        new Intl.DateTimeFormat('en', { timeZone: p.timezone });
      } catch {
        throw new HttpError(400, 'Invalid timezone');
      }
      await query(
        `INSERT INTO user_preferences(user_id,locale,theme,alerts_enabled,quiet_start,quiet_end,timezone) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(user_id) DO UPDATE SET locale=$2,theme=$3,alerts_enabled=$4,quiet_start=$5,quiet_end=$6,timezone=$7`,
        [
          u.id,
          p.locale,
          p.theme,
          p.alertsEnabled,
          p.quietStart ?? null,
          p.quietEnd ?? null,
          p.timezone,
        ],
      );
      return json({ ok: true });
    }
    if (path[0] === 'admin' && path[1] === 'sources' && path[2]) {
      await requireUser(request, ['admin']);
      const { enabled } = await body(request, z.object({ enabled: z.boolean() }));
      await transaction(async (c) => {
        await c.query('UPDATE news_sources SET enabled=$2 WHERE id=$1', [path[2], enabled]);
        await c.query(
          "INSERT INTO audit_logs(user_id,action,target,details) VALUES($1,'source.toggle',$2,$3)",
          [u.id, path[2], JSON.stringify({ enabled })],
        );
      });
      return json({ ok: true });
    }
    throw new HttpError(404, 'Endpoint not found');
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  if (isPortfolio) return json({ error: 'The portfolio demo is read-only.', portfolio: true }, 501);
  try {
    checkOrigin(request);
    const u = await requireUser(request);
    await rateLimit('write:' + u.id, 60);
    const { path } = await params;
    if (path[0] === 'watchlists' && path[1])
      await query('DELETE FROM watchlists WHERE id=$1 AND user_id=$2', [path[1], u.id]);
    else if (path[0] === 'saved' && path[1])
      await query('DELETE FROM saved_events WHERE event_id=$1 AND user_id=$2', [path[1], u.id]);
    else throw new HttpError(404, 'Endpoint not found');
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
