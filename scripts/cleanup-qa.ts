import 'dotenv/config';
import { pool } from '../packages/database/index';
const result = await pool.query(
  `DELETE FROM "user" WHERE name LIKE 'Synthetic QA%' AND email ~ '^qa-[a-z0-9-]+@example[.]org$' RETURNING id`,
);
console.log(
  `Removed ${result.rowCount} explicitly synthetic Playwright QA accounts and their owned test data.`,
);
await pool.end();
