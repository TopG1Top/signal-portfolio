import 'dotenv/config';
import { Client } from 'pg';
import { readFile, writeFile } from 'node:fs/promises';
const c = new Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
if (!(await c.query("SELECT 1 FROM pg_database WHERE datname='signal_utf8'")).rowCount)
  await c.query(
    "CREATE DATABASE signal_utf8 WITH TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'",
  );
await c.end();
for (const path of ['.env', 'apps/web/.env.local']) {
  const text = await readFile(path, 'utf8');
  await writeFile(path, text.replace(/:55432\/signal\b/, ':55432/signal_utf8'));
}
console.log('UTF-8 development database created; original database preserved.');
