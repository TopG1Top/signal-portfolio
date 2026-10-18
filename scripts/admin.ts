import 'dotenv/config';
import { pool } from '../packages/database/index';
const email = process.argv[2];
if (!email) throw new Error('Usage: npm run admin -- registered@example.org');
const r = await pool.query('UPDATE "user" SET role=\'admin\' WHERE email=$1 RETURNING id', [email]);
console.log(r.rowCount ? 'Role updated.' : 'No matching registered account.');
await pool.end();
