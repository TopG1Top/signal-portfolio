import 'dotenv/config';
import { indexEmbeddings } from '../packages/ai/embeddings';
import { pool } from '../packages/database/index';
try {
  console.log(await indexEmbeddings(Number(process.argv[2] ?? 50)));
} finally {
  await pool.end();
}
