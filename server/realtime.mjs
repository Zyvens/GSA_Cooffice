import {WebSocketServer} from 'ws';
import {randomUUID} from 'node:crypto';
import {authenticate,checkOrigin} from './auth.mjs';
import {WORLD,validateMove,canHear,zoneAt} from '../shared/world.mjs';
export function attachRealtime(server,repo){
 const wss=new WebSocketServer({noServer:true,maxPayload:24000});const clients=new Map();let ticking=false,closed=false,ticks=0;
 const send=(ws,d)=>{if(ws.readyState===1)ws.send(JSON.stringify(d));};
 server.on('upgrade',async(req,socket,head)=>{
  try{if(new URL(req.url,'http://local').pathname!=='/api/ws')throw Error();checkOrigin(req);const user=await authenticate(req,repo);if(!user)throw Error();wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req,user));}
  catch{socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');socket.destroy();}
 });
 wss.on('connection',async(ws,req,user)=>{
  const connection=randomUUID();const c={ws,user,req,connection,p:{...WORLD.spawn,mic:false},lastMove:Date.now(),lastSeen:Date.now(),lastAuth:Date.now(),pending:null,flushing:false,window:Date.now(),count:0,signalWindow:Date.now(),signalCount:0};
  try{await repo.join(user.id,connection);}catch{ws.close(1011,'Banco indisponível');return;}
  clients.set(connection,c);send(ws,{type:'welcome',self:user,position:c.p,connection});
  ws.on('message',async(raw)=>{try{
   const m=JSON.parse(raw.toString());c.lastSeen=Date.now();if(Date.now()-c.window>1000){c.window=Date.now();c.count=0;}if(++c.count>35){ws.close(1008,'Limite de mensagens');return;}
   if(m.type==='move'){
    if(validateMove(c.p,m,Date.now()-c.lastMove)){c.p={x:m.x,y:m.y,mic:!!m.mic&&zoneAt(m.x,m.y)!=='silent'};c.lastMove=Date.now();c.pending={...c.p};}
    else send(ws,{type:'correct',position:c.p});
   }else if(m.type==='heartbeat'){c.p.mic=!!m.mic&&zoneAt(c.p.x,c.p.y)!=='silent';c.pending={...c.p};}
   else if(m.type==='signal'){
    if(Date.now()-c.signalWindow>10000){c.signalWindow=Date.now();c.signalCount=0;}if(++c.signalCount>60)return;
    const people=await repo.people();const a=people.find(p=>p.id===user.id&&p.connection_id===connection),b=people.find(p=>p.id===m.to);
    if(!a||!b||!canHear(a,b)||!a.mic||!b.mic)return;
    if(!m.payload||!['offer','answer','ice'].includes(m.payload.type))return;
    await repo.signal(user.id,b.id,{...m.payload,fromConnection:connection,toConnection:b.connection_id});
   }else if(m.type==='ack'&&Array.isArray(m.ids)){await repo.ack(user.id,m.ids.filter(x=>typeof x==='string').slice(0,100));}
  }catch{send(ws,{type:'error',message:'Não foi possível processar a atualização.'});}});
  ws.on('close',()=>{clients.delete(connection);void repo.leave(user.id,connection).catch(()=>{});});ws.on('error',()=>ws.close());
 });
 async function tick(){
  if(ticking||closed||!clients.size)return;ticking=true;
  try{
   await Promise.all([...clients.values()].map(async c=>{
    if(Date.now()-c.lastSeen>16000){c.ws.close(1001,'Reconectar');return;}
    if(Date.now()-c.lastAuth>30000){c.lastAuth=Date.now();if(!await authenticate(c.req,repo)){c.ws.close(1008,'Sessão encerrada');return;}}
    if(c.pending){const p=c.pending;c.pending=null;await repo.move(c.user.id,c.connection,p);}
   }));
   const people=await repo.people();
   for(const c of clients.values()){
    const me=people.find(p=>p.id===c.user.id);if(me&&me.connection_id!==c.connection){send(c.ws,{type:'replaced'});c.ws.close(1000,'Outra aba conectada');continue;}
    send(c.ws,{type:'presence',people:people.map(({connection_id,...p})=>({...p,connection:connection_id})),time:Date.now()});
    const signals=await repo.signals(c.user.id);for(const s of signals)if(s.payload.toConnection===c.connection)send(c.ws,{type:'signal',id:s.id,from:s.sender,payload:s.payload});
   }
   if(++ticks%300===0)await repo.cleanup();
  }catch{for(const c of clients.values()){send(c.ws,{type:'error',message:'Sincronização interrompida. Reconectando…'});c.ws.close(1011,'Banco indisponível');}}
  finally{ticking=false;}
 }
 const timer=setInterval(tick,200);timer.unref();
 return {close:()=>{closed=true;clearInterval(timer);for(const c of clients.values())c.ws.close();wss.close();},wss};
}
