import { readdir,readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import pg from 'pg';
import { env } from '../../configs/env.js';
import { connectionOptions,pool } from '../../configs/database.js';
if(!env.DATABASE_DIRECT_URL)throw new Error('Set DATABASE_DIRECT_URL to the direct Neon URL before running migrations.');
const db=new pg.Client(connectionOptions(env.DATABASE_DIRECT_URL));
try{await db.connect();await db.query('SELECT pg_advisory_lock(79384721)');await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (id text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');const directory=fileURLToPath(new URL('../../sql/migrations/',import.meta.url));for(const name of (await readdir(directory)).filter(value=>value.endsWith('.sql')).sort()){const sql=await readFile(directory+name,'utf8'),checksum=createHash('sha256').update(sql).digest('hex');const prior=(await db.query('SELECT checksum FROM schema_migrations WHERE id=$1',[name])).rows[0];if(prior){if(prior.checksum!==checksum)throw new Error(`Applied migration changed: ${name}`);continue}await db.query('BEGIN');try{await db.query(sql);await db.query('INSERT INTO schema_migrations(id,checksum) VALUES($1,$2)',[name,checksum]);await db.query('COMMIT');console.log('Applied '+name)}catch(error){await db.query('ROLLBACK');throw error}}}finally{await db.end();await pool.end()}
