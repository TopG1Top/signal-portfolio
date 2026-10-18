import { isPortfolio } from '../../../../../../packages/shared/portfolio';
async function handle(request: Request) {
  if (isPortfolio)
    return new URL(request.url).pathname.endsWith('/get-session')
      ? Response.json(null, { headers: { 'Cache-Control': 'no-store' } })
      : Response.json(
          { error: 'The public portfolio demo has no registration, sign-in or stored accounts.' },
          { status: 501 },
        );
  const { auth } = await import('../../../../lib/auth');
  return auth.handler(request);
}
export const GET = handle;
export const POST = handle;
