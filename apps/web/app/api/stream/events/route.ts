import { query } from '../../../../../../packages/database/index';
import { isPortfolio } from '../../../../../../packages/shared/portfolio';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  if (isPortfolio)
    return new Response(
      'event: portfolio\ndata: {"synthetic":true,"live":false,"message":"Static synthetic scenarios; no live import stream."}\n\n',
      { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' } },
    );
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') === 'demo';
  let cursor = request.headers.get('last-event-id') ?? url.searchParams.get('cursor');
  if (cursor && !/^\d{1,18}$/.test(cursor))
    return Response.json({ error: 'Invalid cursor' }, { status: 400 });
  if (!cursor) cursor = String((await query('SELECT COALESCE(max(id),0) AS id FROM outbox'))[0].id);
  const encoder = new TextEncoder();
  let closed = false,
    active = false;
  let timer: ReturnType<typeof setInterval>;
  const stream = new ReadableStream({
    start(controller) {
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(timer);
        try {
          controller.close();
        } catch {}
      };
      const tick = async () => {
        if (closed || active) return;
        active = true;
        try {
          const rows = await query(
            'SELECT id,type,payload FROM outbox WHERE id>$1 ORDER BY id LIMIT 200',
            [cursor],
          );
          for (const row of rows) {
            cursor = String(row.id);
            if (Boolean(row.payload.synthetic) !== mode) continue;
            controller.enqueue(
              encoder.encode(
                `id: ${row.id}\nevent: ${row.type}\ndata: ${JSON.stringify(row.payload)}\n\n`,
              ),
            );
          }
          controller.enqueue(
            encoder.encode(
              `id: ${cursor}\nevent: heartbeat\ndata: {"time":"${new Date().toISOString()}"}\n\n`,
            ),
          );
        } catch {
          close();
        } finally {
          active = false;
        }
      };
      controller.enqueue(
        encoder.encode(`retry: 4000\nid: ${cursor}\nevent: connected\ndata: {}\n\n`),
      );
      timer = setInterval(() => void tick(), 4000);
      request.signal.addEventListener('abort', close, { once: true });
    },
    cancel() {
      closed = true;
      clearInterval(timer);
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
