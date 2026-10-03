// Runs against a REAL isolated PostgreSQL/Neon test database after migration.
// It does not mock the database, Express routes, JWTs or cookie middleware.
// Never point this suite at your production project.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { hashPassword,digest,randomToken } from '../../src/utils/crypto.js';
test('real PostgreSQL: auth cookies, CSRF, ownership, versions and restore',{skip:process.env.RUN_DATABASE_TESTS!=='true'},async()=>{
 const {app}=await import('../../src/app.js');const {pool}=await import('../../configs/database.js');const {env}=await import('../../configs/env.js');
 const ids=[randomUUID(),randomUUID()],email=ids[0]+'@integration.invalid',password='IntegrationPassword1!';
 const server=app.listen(0);await new Promise<void>(resolve=>server.once('listening',resolve));const address=server.address();if(!address||typeof address==='string')throw Error('Missing test server');const base=`http://127.0.0.1:${address.port}`;
 const jar=new Map<string,string>();let csrf='';
 async function call(path:string,method='GET',body?:unknown){const response=await fetch(base+'/api'+path,{method,headers:{Origin:env.CLIENT_ORIGIN,Cookie:[...jar].map(([key,value])=>`${key}=${value}`).join('; '),'X-CSRF-Token':csrf,'Content-Type':'application/json'},body:body==null?undefined:JSON.stringify(body)});for(const cookie of response.headers.getSetCookie()){const first=cookie.split(';')[0],split=first.indexOf('=');jar.set(first.slice(0,split),first.slice(split+1))}return response}
 try{
  assert.equal((await call('/projects')).status,401);
  const token=await call('/auth/csrf');csrf=(await token.json()).csrfToken;
  await pool.query('INSERT INTO users(id,name,email,password_hash,email_verified_at) VALUES($1,\'Integration account\',$2,$3,now()),($4,\'Other account\',$5,$3,now())',[ids[0],email,await hashPassword(password),ids[1],ids[1]+'@integration.invalid']);
  await pool.query("UPDATE users SET role='admin' WHERE id=$1",[ids[0]]);
  assert.equal((await call('/auth/login','POST',{email,password})).status,200);assert.ok(jar.get('fca_access'));assert.ok(jar.get('fca_refresh'));
  const me=await call('/auth/me');assert.equal((await me.json()).user.id,ids[0]);
  const noCsrf=await fetch(base+'/api/projects',{method:'POST',headers:{Origin:env.CLIENT_ORIGIN,Cookie:[...jar].map(([key,value])=>`${key}=${value}`).join('; '),'Content-Type':'application/json'},body:'{}'});assert.equal(noCsrf.status,403);
  const input={name:'Integration project',assetNumber:randomUUID(),client:'',companyName:'Test company',companyAddress:'1 Test Road\nCape Town',clientAddress:'2 Client Road',discipline:'Architect',payload:{areas:[],captures:[]}};
  const created=await call('/projects','POST',input);assert.equal(created.status,201);const project=await created.json();assert.equal(project.version,1);assert.equal(project.companyAddress,input.companyAddress);assert.equal(project.clientAddress,input.clientAddress);
  await pool.query("INSERT INTO assessor_assignments(email,name,profession,active,updated_by) VALUES($1,'Integration account','Architect',true,$2)",[email,ids[0]]);await pool.query("UPDATE users SET role='assessor' WHERE id=$1",[ids[0]]);
  const foreign=randomUUID();await pool.query('INSERT INTO projects(id,owner_id,name,discipline) VALUES($1,$2,\'Other project\',\'Architect\')',[foreign,ids[1]]);assert.equal((await call('/projects/'+foreign)).status,200);
  assert.equal((await call('/projects/'+project.id,'PATCH',{...input,version:1})).status,200);
  assert.equal((await call('/projects/'+project.id,'PATCH',{...input,version:1})).status,409);
  assert.equal((await call('/projects/'+project.id+'/site-plan','POST',{})).status,403);
  const requested=await call('/projects/'+project.id,'DELETE');assert.equal(requested.status,202);const pending=await requested.json();assert.equal(pending.pending,true);assert.equal((await call('/projects/'+project.id)).status,200);
  const duplicate=await call('/projects/'+project.id,'DELETE');assert.equal((await duplicate.json()).requestId,pending.requestId);
  assert.equal((await call('/admin/deletion-requests/'+pending.requestId+'/review','POST',{decision:'approved'})).status,403);
  await pool.query("UPDATE users SET role='admin' WHERE id=$1",[ids[0]]);
  // Database roles apply immediately even to an existing JWT session.
  assert.equal((await call('/admin/deletion-requests/'+pending.requestId+'/review','POST',{decision:'approved',note:'Integration verification'})).status,200);
  assert.equal((await call('/projects/'+project.id)).status,404);
  assert.equal((await call('/admin/deletion-requests/'+pending.requestId+'/review','POST',{decision:'approved'})).status,409);
  await pool.query("UPDATE users SET role='assessor' WHERE id=$1",[ids[0]]);

  assert.equal((await call('/projects/restore','POST',{assetNumber:input.assetNumber})).status,200);
  const oldRefresh=jar.get('fca_refresh');assert.equal((await call('/auth/refresh','POST',{})).status,200);assert.notEqual(jar.get('fca_refresh'),oldRefresh);
  // A reused previous refresh token outside the overlap window revokes the session.
  await pool.query("UPDATE auth_sessions SET rotated_at=now()-interval '10 seconds' WHERE user_id=$1",[ids[0]]);
  const currentRefresh=jar.get('fca_refresh');jar.set('fca_refresh',oldRefresh!);
  assert.equal((await call('/auth/refresh','POST',{})).status,401);
  assert.equal((await call('/auth/me')).status,401);
  jar.set('fca_refresh',currentRefresh!);
  assert.equal((await call('/auth/login','POST',{email,password})).status,200);
  const resetToken=randomToken(),newPassword='ReplacementPassword2!';
  await pool.query("INSERT INTO auth_tokens(id,user_id,purpose,token_hash,expires_at) VALUES($1,$2,'reset',$3,now()+interval '30 minutes')",[randomUUID(),ids[0],digest(resetToken)]);
  assert.equal((await call('/auth/reset-password','POST',{token:resetToken,password:newPassword})).status,200);
  assert.equal((await call('/auth/me')).status,401);
  assert.equal((await call('/auth/reset-password','POST',{token:resetToken,password:newPassword})).status,400);
  assert.equal((await call('/auth/login','POST',{email,password})).status,401);
  assert.equal((await call('/auth/login','POST',{email,password:newPassword})).status,200);
  assert.equal((await call('/auth/logout','POST',{})).status,200);assert.equal((await call('/auth/me')).status,401);
  const verifyToken=randomToken(),secondEmail=ids[1]+'@integration.invalid';
  await pool.query("INSERT INTO assessor_assignments(email,name,profession,active,updated_by) VALUES($1,'Other account','Architect',true,$2)",[secondEmail,ids[0]]);
  await pool.query('UPDATE users SET email_verified_at=NULL WHERE id=$1',[ids[1]]);
  assert.equal((await call('/auth/login','POST',{email:secondEmail,password})).status,403);
  await pool.query("INSERT INTO auth_tokens(id,user_id,purpose,token_hash,expires_at) VALUES($1,$2,'verify',$3,now()+interval '1 hour')",[randomUUID(),ids[1],digest(verifyToken)]);
  assert.equal((await call('/auth/verify-email','POST',{token:verifyToken})).status,200);
  assert.equal((await call('/auth/verify-email','POST',{token:verifyToken})).status,400);
  assert.equal((await call('/auth/login','POST',{email:secondEmail,password})).status,200);
  assert.equal((await call('/auth/logout','POST',{})).status,200);
 }finally{await pool.query('DELETE FROM assessor_assignments WHERE updated_by=ANY($1::uuid[])',[ids]);await pool.query('DELETE FROM deletion_requests WHERE requested_by=ANY($1::uuid[]) OR reviewed_by=ANY($1::uuid[])',[ids]);await pool.query('DELETE FROM audit_events WHERE actor_id=ANY($1::uuid[])',[ids]);await pool.query('DELETE FROM projects WHERE owner_id=ANY($1::uuid[])',[ids]);await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[ids]);await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));await pool.end()}
});
