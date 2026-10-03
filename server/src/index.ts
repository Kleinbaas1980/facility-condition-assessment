import { app } from './app.js';
import { env } from '../configs/env.js';
import { pool } from '../configs/database.js';
import { verifyBlobStore } from '../configs/blob.js';
import { logger } from '../configs/logger.js';
import { maintain } from './services/maintenance.service.js';
await pool.query('SELECT id FROM schema_migrations LIMIT 1');
await verifyBlobStore();
const server=app.listen(env.PORT,()=>logger.info({port:env.PORT},'FCA API listening'));
server.requestTimeout=60_000;server.headersTimeout=20_000;
let maintenanceRunning=false;
const timer=setInterval(()=>{if(maintenanceRunning)return;maintenanceRunning=true;void maintain().catch(error=>logger.error({error:error.message},'Maintenance failed')).finally(()=>{maintenanceRunning=false})},60_000);timer.unref();
let stopping=false;
async function shutdown(){if(stopping)return;stopping=true;clearInterval(timer);const deadline=setTimeout(()=>process.exit(1),20_000);deadline.unref();server.close(async()=>{await pool.end();process.exit(0)});server.closeIdleConnections()}
process.on('SIGTERM',()=>void shutdown());process.on('SIGINT',()=>void shutdown());
