import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import http from 'node:http';import {once} from 'node:events';
import {PGlite} from '@electric-sql/pglite';import WebSocket from 'ws';
import {Repository} from '../server/db.mjs';import {createHandler} from '../server/http.mjs';import {attachRealtime} from '../server/realtime.mjs';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,timeout=5000){const end=Date.now()+timeout;while(Date.now()<end){const v=fn();if(v)return v;await delay(30);}throw Error('Condição não observada dentro do prazo.');}
test('Duas sessões, duas instâncias, PostgreSQL compartilhado, login, reservas, tarefas e isolamento de sinalização',async t=>{
 const db=new PGlite();await db.exec(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));const repo=new Repository(db);
 const serverA=http.createServer(createHandler(repo)),serverB=http.createServer(createHandler(new Repository(db)));const realtimeA=attachRealtime(serverA,repo),realtimeB=attachRealtime(serverB,new Repository(db));
 serverA.listen(0,'127.0.0.1');serverB.listen(0,'127.0.0.1');await Promise.all([once(serverA,'listening'),once(serverB,'listening')]);
 const origin=`http://127.0.0.1:${serverA.address().port}`,other=`http://127.0.0.1:${serverB.address().port}`;process.env.APP_ORIGIN=origin;process.env.INVITE_VITOR='v'.repeat(32);process.env.INVITE_FABIO='f'.repeat(32);const sockets=[];
 t.after(async()=>{sockets.forEach(s=>s.terminate());realtimeA.close();realtimeB.close();serverA.closeAllConnections();serverB.closeAllConnections();await Promise.all([new Promise(r=>serverA.close(r)),new Promise(r=>serverB.close(r))]);await delay(300);await db.close();});
 async function call(path,method='GET',body,cookie){const r=await fetch(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return{status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 const reg=async id=>call('/api/auth','POST',{id,password:'senha-segura-de-teste',invite:(id==='vitor'?'v':'f').repeat(32),register:true});
 assert.equal((await call('/api/tasks')).status,401);
 const v=await reg('vitor'),f=await reg('fabio');assert.equal(v.status,200);assert.equal(f.status,200);assert.ok(v.cookie);assert.equal((await reg('vitor')).status,400);
 assert.equal((await call('/api/auth','POST',{id:'vitor',password:'errada'})).status,401);assert.equal((await call('/api/me','GET',null,v.cookie)).body.user.id,'vitor');
 const when=new Date(Date.now()+86400000).toISOString(),end=new Date(Date.now()+90000000).toISOString();
 const reservations=await Promise.all([call('/api/meetings','POST',{title:'Alinhamento',starts_at:when,ends_at:end},v.cookie),call('/api/meetings','POST',{title:'Conflito',starts_at:when,ends_at:end},f.cookie)]);
 assert.deepEqual(reservations.map(r=>r.status).sort(),[201,409]);assert.equal((await call('/api/meetings','GET',null,v.cookie)).body.length,1);
 const task=await call('/api/tasks','POST',{title:'Visita técnica',sector:'operations',assignee:'fabio'},v.cookie);assert.equal(task.status,201);assert.equal((await call('/api/tasks','GET',null,f.cookie)).body[0].title,'Visita técnica');assert.equal((await call('/api/tasks','PATCH',{id:task.body.id,status:'done'},f.cookie)).body.status,'done');
 assert.equal((await call('/api/records','POST',{title:'Material',sector:'finance',kind:'expense',amount_cents:170000,details:'Registrado no teste'},v.cookie)).status,201);assert.equal((await repo.costs())[0].total_cents,'170000');
 const recvA=[],recvB=[];const wa=new WebSocket(origin.replace('http','ws')+'/api/ws',{headers:{Origin:origin,Cookie:v.cookie}}),wb=new WebSocket(other.replace('http','ws')+'/api/ws',{headers:{Origin:origin,Cookie:f.cookie}});sockets.push(wa,wb);wa.on('message',m=>recvA.push(JSON.parse(m)));wb.on('message',m=>recvB.push(JSON.parse(m)));await Promise.all([once(wa,'open'),once(wb,'open')]);
 await until(()=>recvA.some(m=>m.type==='presence'&&m.people.length===2)&&recvB.some(m=>m.type==='presence'&&m.people.length===2));
 wa.send(JSON.stringify({type:'move',x:760,y:340,mic:true}));wb.send(JSON.stringify({type:'heartbeat',mic:true}));
 await until(()=>recvB.some(m=>m.type==='presence'&&m.people.some(p=>p.id==='vitor'&&p.x===760&&p.mic)));
 wa.send(JSON.stringify({type:'move',x:200,y:220,mic:true}));await until(()=>recvA.some(m=>m.type==='correct'));assert.equal((await repo.people()).find(p=>p.id==='vitor').x,760);
 await until(()=>recvA.some(m=>m.type==='presence'&&m.people.find(p=>p.id==='fabio')?.mic));
 wa.send(JSON.stringify({type:'signal',to:'fabio',payload:{type:'offer',sdp:{type:'offer',sdp:'test'}}}));const signal=await until(()=>recvB.find(m=>m.type==='signal'));assert.equal(signal.from,'vitor');wb.send(JSON.stringify({type:'ack',ids:[signal.id]}));await delay(250);assert.equal((await repo.signals('fabio')).length,0);
 // Force a different room in the shared database, simulating server-accepted travel.
 const person=(await repo.people()).find(p=>p.id==='fabio');await repo.move('fabio',person.connection_id,{x:180,y:230,mic:true});wa.send(JSON.stringify({type:'signal',to:'fabio',payload:{type:'offer',sdp:{type:'offer',sdp:'blocked'}}}));await delay(250);assert.equal((await repo.signals('fabio')).length,0);
 assert.equal((await call('/api/logout','POST',{},v.cookie)).status,200);assert.equal((await call('/api/me','GET',null,v.cookie)).status,401);
});
