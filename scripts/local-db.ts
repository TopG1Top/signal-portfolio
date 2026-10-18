import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import EmbeddedPostgres from 'embedded-postgres';
import 'dotenv/config';
const password = process.env.LOCAL_DB_PASSWORD ?? 'signal-local-' + randomBytes(16).toString('hex');
const pg = new EmbeddedPostgres({
  databaseDir: '.data/postgres',
  user: 'signal',
  password,
  port: 55432,
  persistent: true,
  authMethod: 'scram-sha-256',
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  postgresFlags: ['-h', '127.0.0.1'],
  onLog: () => {},
  onError: console.error,
});
await mkdir('.data', { recursive: true });
if (!existsSync('.data/postgres/PG_VERSION')) {
  await pg.initialise();
  await writeFile('.data/local-password', password, { mode: 0o600 });
}
await pg.start();
const { readFile } = await import('node:fs/promises');
const savedPassword = await readFile('.data/local-password', 'utf8');
const { Client } = await import('pg');
const c = new Client({
  connectionString: `postgresql://signal:${savedPassword}@127.0.0.1:55432/postgres`,
});
await c.connect();
if (!(await c.query("SELECT 1 FROM pg_database WHERE datname='signal'")).rowCount)
  await c.query('CREATE DATABASE signal');
await c.end();
if (!existsSync('.env')) {
  const env = `DATABASE_URL=postgresql://signal:${savedPassword}@127.0.0.1:55432/signal\nBETTER_AUTH_SECRET=${randomBytes(32).toString('hex')}\nBETTER_AUTH_URL=http://localhost:3000\nAPP_ORIGIN=http://localhost:3000\nAI_PROVIDER=none\nRSS_ENABLED=true\n`;
  await writeFile('.env', env, { mode: 0o600 });
  await writeFile('apps/web/.env.local', env, { mode: 0o600 });
}
console.log(
  'Local PostgreSQL ready on 127.0.0.1:55432. Credentials stored only in ignored local files.',
);
for (const sig of ['SIGINT', 'SIGTERM'] as const)
  process.on(sig, async () => {
    await pg.stop();
    process.exit(0);
  });
setInterval(() => {}, 60000);
