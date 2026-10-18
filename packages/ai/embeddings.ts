import { z } from 'zod';
import { query } from '../database/index';
export const vectorSchema = z.array(z.number().finite()).length(1536);
export async function embed(input: string): Promise<number[]> {
  const provider = process.env.EMBEDDING_PROVIDER ?? 'none',
    model = process.env.EMBEDDING_MODEL;
  if (!model || provider === 'none')
    throw new Error('Embedding provider and model are not configured');
  if (input.length > 12000) throw new Error('Embedding input exceeds character budget');
  let raw: unknown;
  if (provider === 'openai') {
    const r = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (process.env.EMBEDDING_API_KEY ?? process.env.AI_API_KEY ?? ''),
      },
      body: JSON.stringify({ model, input, dimensions: 1536, encoding_format: 'float' }),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) throw new Error('Embedding provider request failed: ' + r.status);
    raw = (await r.json()).data?.[0]?.embedding;
  } else if (provider === 'ollama') {
    const r = await fetch((process.env.AI_BASE_URL ?? 'http://127.0.0.1:11434') + '/api/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input }),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) throw new Error('Ollama embedding request failed');
    raw = (await r.json()).embeddings?.[0];
  } else throw new Error('Unsupported embedding provider');
  return vectorSchema.parse(raw);
}
export async function indexEmbeddings(limit = 50) {
  if (!(await query("SELECT 1 FROM pg_extension WHERE extname='vector'")).length)
    throw new Error('pgvector is not installed');
  const rows = await query(
    'SELECT id,title,summary FROM events WHERE embedding IS NULL AND synthetic=false AND merged_into IS NULL ORDER BY last_updated_at DESC LIMIT $1',
    [Math.min(100, limit)],
  );
  let indexed = 0;
  for (const row of rows) {
    const vector = await embed(row.title + '\n' + row.summary);
    const updated = await query(
      'UPDATE events SET embedding=$1::vector WHERE id=$2 AND title=$3 AND summary=$4 AND merged_into IS NULL RETURNING id',
      [JSON.stringify(vector), row.id, row.title, row.summary],
    );
    indexed += updated.length;
  }
  return { indexed };
}
export async function semanticIds(question: string, synthetic: boolean, limit = 50) {
  if (!(await query("SELECT 1 FROM pg_extension WHERE extname='vector'")).length)
    throw new Error('Semantic search requires pgvector');
  const v = await embed(question);
  return query<{ id: string; distance: number }>(
    'SELECT id,embedding <=> $1::vector AS distance FROM events WHERE synthetic=$2 AND embedding IS NOT NULL AND merged_into IS NULL ORDER BY embedding <=> $1::vector LIMIT $3',
    [JSON.stringify(v), synthetic, limit],
  );
}
