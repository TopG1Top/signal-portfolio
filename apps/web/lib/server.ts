import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { query } from '../../../packages/database/index';
import { trustedOrigins } from './origins';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function requireUser(request: Request, roles?: string[]) {
  const { auth } = await import('./auth');
  const s = await auth.api.getSession({ headers: request.headers });
  if (!s) throw new HttpError(401, 'Sign in to continue.');
  if (roles) {
    const [u] = await query('SELECT role FROM "user" WHERE id=$1', [s.user.id]);
    if (!u || !roles.includes(u.role))
      throw new HttpError(403, 'This action requires an administrator.');
  }
  return s.user;
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || !trustedOrigins.includes(origin))
    throw new HttpError(403, 'Untrusted request origin.');
}
export async function body<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  if (Number(request.headers.get('content-length') ?? 0) > 20000)
    throw new HttpError(413, 'Request too large');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'JSON body required');
  const decoder = new TextDecoder();
  let text = '',
    size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 20000) {
        await reader.cancel();
        throw new HttpError(413, 'Request too large');
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  return schema.parse(JSON.parse(text));
}
export async function rateLimit(key: string, max = 120) {
  const [r] = await query(
    `INSERT INTO rate_limits(key,count,expires_at) VALUES($1,1,now()+interval '1 minute') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.expires_at<now() THEN 1 ELSE rate_limits.count+1 END,expires_at=CASE WHEN rate_limits.expires_at<now() THEN now()+interval '1 minute' ELSE rate_limits.expires_at END RETURNING count`,
    [key],
  );
  if (r.count > max) throw new HttpError(429, 'Rate limit reached. Try again in one minute.');
}
export function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Request-ID': randomUUID() },
  });
}
export function failure(e: unknown) {
  if (e instanceof z.ZodError)
    return json({ error: 'Invalid request', details: e.issues.map((i) => i.message) }, 400);
  if (e instanceof HttpError) return json({ error: e.message }, e.status);
  if (e instanceof SyntaxError) return json({ error: 'Invalid JSON' }, 400);
  const id = randomUUID();
  console.error(
    JSON.stringify({
      level: 'error',
      requestId: id,
      message: e instanceof Error ? e.message : String(e),
    }),
  );
  return Response.json(
    { error: 'Service unavailable. Please retry.', requestId: id },
    { status: 503 },
  );
}
