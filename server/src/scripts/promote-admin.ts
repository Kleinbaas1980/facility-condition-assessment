import {pool} from '../../configs/database.js';
const email=process.argv[2]?.trim().toLowerCase();
if(!email||!email.includes('@'))throw Error('Usage: npm run admin:promote -w server -- registered-admin@example.com');
try{const result=await pool.query("UPDATE users SET role='admin',updated_at=now() WHERE email=$1 AND email_verified_at IS NOT NULL RETURNING id",[email]);if(result.rowCount!==1)throw Error('Register and verify the account before promoting it.');console.log('Admin role assigned. Sign in with this account.')}finally{await pool.end()}
