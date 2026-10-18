import { Pool, type PoolClient, type QueryResultRow } from 'pg';
const globalDb = globalThis as unknown as { signalPool?: Pool };
export const pool =
  globalDb.signalPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 12,
    connectionTimeoutMillis: 5000,
    statement_timeout: 15000,
  });
globalDb.signalPool = pool;
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  return (await pool.query<T>(sql, params)).rows;
}
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const result = await fn(c);
    await c.query('COMMIT');
    return result;
  } catch (error) {
    await c.query('ROLLBACK');
    throw error;
  } finally {
    c.release();
  }
}
