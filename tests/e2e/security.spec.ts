import { test, expect, request as requests } from '@playwright/test';
test('private ownership, validation, CSRF, role denial and durable stream', async ({ request }) => {
  const baseURL = 'http://127.0.0.1:3000',
    stamp = Date.now();
  const alice = await requests.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } }),
    bob = await requests.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
  for (const [ctx, name] of [
    [alice, 'alice'],
    [bob, 'bob'],
  ] as const) {
    const r = await ctx.post('/api/auth/sign-up/email', {
      data: {
        name: 'Synthetic QA ' + name,
        email: `qa-${name}-${stamp}@example.org`,
        password: 'Synthetic-test-password-948!',
      },
    });
    expect(r.ok()).toBe(true);
  }
  const created = await alice.post('/api/watchlists', {
    data: { name: 'Synthetic ownership test', keywords: 'earthquake' },
  });
  expect(created.status()).toBe(201);
  const watch = await created.json();
  expect(
    (
      await bob.patch('/api/watchlists/' + watch.id, {
        data: { name: 'tampered', keywords: '', category: '', source: '', enabled: false },
      })
    ).status(),
  ).toBe(404);
  expect((await bob.get('/api/watchlists')).ok()).toBe(true);
  expect(await (await bob.get('/api/watchlists')).json()).toEqual([]);
  expect(
    (
      await alice.post('/api/watchlists', {
        headers: { Origin: 'https://untrusted.example' },
        data: { name: 'CSRF' },
      })
    ).status(),
  ).toBe(403);
  expect((await alice.post('/api/watchlists', { data: { name: '' } })).status()).toBe(400);
  expect(
    (await alice.post('/api/watchlists', { data: { name: 'x'.repeat(21000) } })).status(),
  ).toBe(413);
  await alice.post('/api/ai/chat', { data: { message: 'orbital', mode: 'demo' } });
  expect((await (await alice.get('/api/ai/history')).json()).length).toBe(2);
  expect(await (await bob.get('/api/ai/history')).json()).toEqual([]);
  expect((await alice.get('/api/admin/audit')).status()).toBe(403);
  expect(
    (
      await request.get('/api/stream/events', { headers: { 'Last-Event-ID': 'injection' } })
    ).status(),
  ).toBe(400);
  const demo = await (await request.get('/api/events?mode=demo')).json(),
    live = await (await request.get('/api/events?mode=live')).json();
  expect(demo.items.every((e: any) => e.synthetic)).toBe(true);
  expect(live.items.every((e: any) => !e.synthetic)).toBe(true);
  await alice.dispose();
  await bob.dispose();
});
