import { transaction } from '../../configs/database.js';
import { deleteBlob } from './blob.service.js';
import { logger } from '../../configs/logger.js';
// Durable deletion outbox: DB removals remain correct if Azure is temporarily offline.
export async function maintain(){await transaction(async db=>{const rows=(await db.query('SELECT blob_key FROM blob_deletions ORDER BY created_at LIMIT 20 FOR UPDATE SKIP LOCKED')).rows;for(const row of rows){try{await deleteBlob(row.blob_key);await db.query('DELETE FROM blob_deletions WHERE blob_key=$1',[row.blob_key])}catch{await db.query('UPDATE blob_deletions SET attempts=attempts+1 WHERE blob_key=$1',[row.blob_key]);logger.warn('Blob deletion will be retried')}}await db.query('DELETE FROM rate_limits WHERE window_start<now()-interval \'1 day\'');await db.query('DELETE FROM auth_tokens WHERE expires_at<now()-interval \'7 days\'');await db.query('DELETE FROM auth_sessions WHERE expires_at<now()-interval \'30 days\'')})}
