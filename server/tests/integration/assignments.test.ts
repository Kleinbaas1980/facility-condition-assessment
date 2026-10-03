import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {hashPassword} from '../../src/utils/crypto.js';
test('assigned profession gates login, capture and active sessions',{skip:process.env.RUN_DATABASE_TESTS!=='true'},async()=>{
 const {app}=await import('../../src/app.js');const {pool}=await import('../../configs/database.js');const {env}=await import('../../configs/env.js');const admin=randomUUID(),assessor=randomUUID(),email=`${assessor}@test.invalid`,adminEmail=`${admin}@test.invalid`,password='AssignmentTestPassword1!';
 await pool.query("INSERT INTO users(id,name,email,password_hash,email_verified_at,role) VALUES($1,'Admin',$2,$3,now(),'admin'),($4,'Assessor',$5,$3,now(),'assessor')",[admin,adminEmail,await hashPassword(password),assessor,email]);
 const server=app.listen(0);await new Promise<void>(resolve=>server.once('listening',resolve));const address=server.address();if(!address||typeof address==='string')throw Error('Test server unavailable');const base=`http://127.0.0.1:${address.port}/api`;
 const jar=new Map<string,string>();let csrf='';async function call(path:string,method='GET',body?:unknown){const res=await fetch(base+path,{method,headers:{Origin:env.CLIENT_ORIGIN,Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),'X-CSRF-Token':csrf,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});for(const cookie of res.headers.getSetCookie()){const first=cookie.split(';')[0],split=first.indexOf('=');jar.set(first.slice(0,split),first.slice(split+1))}return res}
 try{
  csrf=(await(await call('/auth/csrf')).json()).csrfToken;
  assert.equal((await call('/auth/login','POST',{email,password})).status,403);
  assert.equal((await call('/auth/login','POST',{email:adminEmail,password})).status,200);
  const assignments=[{name:'Assessor',email,profession:'Architect',active:true}];assert.equal((await call('/admin/professionals','POST',{assessors:assignments})).status,200);
  const capture={area:'Area',section:'',element:'Roof',component:'Covering',type:'',exists:'Yes',extent:1,ratings:[100,0,0,0,0],comment:'',discipline:'Architect'};
  const created=await call('/projects','POST',{name:'Assigned project',assetNumber:'Test',client:'',discipline:'Architect',payload:{areas:[{code:'A',unit:'',type:'Custom',name:'Area',sqm:null}],captures:[capture,{...capture,element:'Electrical',component:'Wiring',discipline:'Electrician'}]}});assert.equal(created.status,201);const full=await created.json();
  await call('/auth/logout','POST',{});assert.equal((await call('/auth/login','POST',{email,password})).status,200);
  const visible=await(await call(`/projects/${full.id}`)).json();assert.equal(visible.payload.captures.length,1);visible.payload.captures[0].comment='Architect finding';
  assert.equal((await call(`/projects/${full.id}`,'PATCH',{name:visible.name,client:visible.client,assetNumber:visible.assetNumber,discipline:visible.discipline,version:visible.version,payload:visible.payload})).status,200);
  assert.equal((await call('/admin/professionals')).status,403);
  assert.equal((await call('/projects','POST',{name:'Forbidden'})).status,403);
  const own=await(await call(`/projects/${full.id}`)).json();own.payload.captures.push(full.payload.captures.find((c:{discipline:string})=>c.discipline==='Electrician'));assert.equal((await call(`/projects/${full.id}`,'PATCH',{name:own.name,client:own.client,assetNumber:own.assetNumber,discipline:own.discipline,version:own.version,payload:own.payload})).status,403);
  // File access and deletion requests obey the same profession boundary.
  const foreignCapture=full.payload.captures.find((c:{discipline:string})=>c.discipline==='Electrician');
  const foreignPhoto=randomUUID(),ownPhoto=randomUUID();
  for(const [photo,capture] of [[foreignPhoto,foreignCapture.id],[ownPhoto,own.payload.captures[0].id]])await pool.query("INSERT INTO attachments(id,project_id,capture_id,kind,blob_key,original_name,content_type,size_bytes,sha256,created_by) VALUES($1,$2,$3,'photo',($1::uuid)::text,'test.png','image/png',1,$4,$5)",[photo,full.id,capture,'0'.repeat(64),admin]);
  assert.equal((await call(`/projects/${full.id}/photos/${foreignPhoto}`)).status,404);
  assert.equal((await call(`/projects/${full.id}/photos/${foreignPhoto}`,'DELETE')).status,404);
  assert.equal((await call(`/projects/${full.id}/deletion-requests`,'POST',{kind:'capture',targetId:foreignCapture.id})).status,403);
  const photoRequest=await call(`/projects/${full.id}/photos/${ownPhoto}`,'DELETE');assert.equal(photoRequest.status,202);const removal=await photoRequest.json();
  assert.equal((await pool.query('SELECT id FROM attachments WHERE id=$1',[ownPhoto])).rowCount,1);
  await call('/auth/logout','POST',{});await call('/auth/login','POST',{email:adminEmail,password});
  assert.equal((await call(`/admin/deletion-requests/${removal.requestId}/review`,'POST',{decision:'approved'})).status,200);
  assert.equal((await pool.query('SELECT id FROM attachments WHERE id=$1',[ownPhoto])).rowCount,0);
  assert.equal((await pool.query('SELECT blob_key FROM blob_deletions WHERE blob_key=$1',[ownPhoto])).rowCount,1);
  await call('/auth/logout','POST',{});await call('/auth/login','POST',{email,password});
  assert.equal((await call(`/projects/${full.id}`,'PATCH',{name:own.name,client:own.client,assetNumber:own.assetNumber,discipline:own.discipline,version:own.version,payload:own.payload})).status,409);
  await pool.query('UPDATE assessor_assignments SET active=false WHERE email=$1',[email]);assert.equal((await call('/projects')).status,403);assert.equal((await call('/auth/refresh','POST',{})).status,403);assert.equal((await call('/auth/login','POST',{email,password})).status,403);
 }finally{await pool.query('DELETE FROM blob_deletions WHERE blob_key IN (SELECT target_id::text FROM deletion_requests WHERE requested_by=$1)',[assessor]);await pool.query('DELETE FROM deletion_requests WHERE project_id IN (SELECT id FROM projects WHERE owner_id=$1)',[admin]);await pool.query('DELETE FROM assessor_assignments WHERE updated_by=$1',[admin]);await pool.query('DELETE FROM audit_events WHERE actor_id=ANY($1::uuid[])',[ [admin,assessor] ]);await pool.query('DELETE FROM projects WHERE owner_id=$1',[admin]);await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[[admin,assessor]]);await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));await pool.end()}
});
