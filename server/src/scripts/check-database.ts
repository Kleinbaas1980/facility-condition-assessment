import { pool } from '../../configs/database.js';
try{const version=await pool.query('SELECT version()');const result=await pool.query('SELECT id,applied_at FROM schema_migrations ORDER BY id');console.log(version.rows[0].version);console.table(result.rows)}finally{await pool.end()}
