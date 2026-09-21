import {canHear,zoneAt} from '../shared/world.mjs';
export class Realtime {
 constructor(state,{onUpdate,onCorrect,onStatus,onSignal,onWelcome,onReplaced}){this.state=state;Object.assign(this,{onUpdate,onCorrect,onStatus,onSignal,onWelcome,onReplaced});this.closed=false;this.retry=0;this.seen=new Set();this.connect();}
 connect(){if(this.closed)return;this.onStatus('connecting');const ws=this.ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/api/ws`);
  ws.onopen=()=>{this.retry=0;this.onStatus('online');clearInterval(this.heartbeat);this.heartbeat=setInterval(()=>this.send({type:'heartbeat',mic:this.state.mic&&zoneAt(this.state.position.x,this.state.position.y)!=='silent'}),4000);};
  ws.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.type==='presence')this.onUpdate(m.people);if(m.type==='welcome'){this.state.connection=m.connection;this.onWelcome?.(m);}if(m.type==='correct')this.onCorrect(m.position);if(m.type==='signal'){this.send({type:'ack',ids:[m.id]});if(!this.seen.has(m.id)){this.seen.add(m.id);if(this.seen.size>1000)this.seen.delete(this.seen.values().next().value);this.onSignal(m);}}if(m.type==='replaced'){this.close();this.onReplaced?.();}if(m.type==='error')this.onStatus('error');}catch{this.onStatus('error');}};
  ws.onclose=e=>{clearInterval(this.heartbeat);this.onStatus('offline');if(e.code===1008){this.closed=true;this.onReplaced?.();return;}if(!this.closed)this.timer=setTimeout(()=>this.connect(),Math.min(1000*2**this.retry++,15000)+Math.random()*500);};ws.onerror=()=>ws.close();
 }
 send(m){if(this.ws?.readyState===1)this.ws.send(JSON.stringify(m));}
 close(){this.closed=true;clearTimeout(this.timer);clearInterval(this.heartbeat);this.ws?.close();}
}
export class Voice {
 constructor(state,send,notify){this.state=state;this.send=send;this.notify=notify;this.peers=new Map();this.stream=null;this.generation=0;this.lastZone=null;}
 async enable(){const gen=++this.generation;try{const r=await fetch('/api/ice');if(!r.ok)throw Error('Entre novamente para usar o áudio.');const config=await r.json();this.iceServers=config.iceServers;this.state.config.relay=config.relayConfigured;
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});if(gen!==this.generation){stream.getTracks().forEach(t=>t.stop());return;}
  this.stream=stream;this.state.mic=true;this.update();if(!config.relayConfigured)this.notify('Áudio sem servidor TURN: algumas redes podem impedir a conexão.');
 }catch(e){this.state.mic=false;this.notify(e.name==='NotAllowedError'?'Permita o microfone no navegador para entrar no áudio.':e.message||'Não foi possível abrir o microfone.');}}
 disable(){this.generation++;this.state.mic=false;this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;for(const id of [...this.peers.keys()])this.drop(id);}
 drop(id){const p=this.peers.get(id);if(!p)return;p.pc.close();p.audio.pause();p.audio.srcObject=null;p.audio.remove();this.peers.delete(id);}
 update(){const s=this.state,zone=zoneAt(s.position.x,s.position.y);if(this.lastZone!==zone){for(const id of [...this.peers.keys()])this.drop(id);this.lastZone=zone;}this.stream?.getAudioTracks().forEach(t=>t.enabled=s.mic&&zone!=='silent');
  const eligible=(s.people||[]).filter(p=>p.id!==s.user?.id&&p.mic&&s.mic&&canHear(s.position,p));
  for(const [id,p]of this.peers)if(!eligible.some(x=>x.id===id&&x.connection===p.connection))this.drop(id);
  if(!this.stream||zone==='silent')return;
  for(const p of eligible)if(!this.peers.has(p.id)&&s.user.id<p.id){const peer=this.create(p);void this.offer(p.id,peer);}
 }
 create(person){const pc=new RTCPeerConnection({iceServers:this.iceServers});const audio=document.createElement('audio');audio.autoplay=true;audio.playsInline=true;document.body.append(audio);const peer={pc,audio,connection:person.connection,queue:[],making:false};this.peers.set(person.id,peer);
  this.stream.getTracks().forEach(track=>pc.addTrack(track,this.stream));
  pc.onicecandidate=e=>{if(e.candidate&&this.peers.get(person.id)===peer)this.send({type:'signal',to:person.id,payload:{type:'ice',candidate:e.candidate.toJSON()}});};
  pc.ontrack=e=>{if(this.peers.get(person.id)!==peer)return;audio.srcObject=e.streams[0];audio.play().catch(()=>this.notify('Clique em “Retomar áudio” para liberar a reprodução.'));};
  pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed'){this.drop(person.id);this.notify('Não foi possível conectar o áudio. Confira a configuração TURN e entre novamente.');}};
  return peer;
 }
 async offer(id,peer){try{peer.making=true;await peer.pc.setLocalDescription(await peer.pc.createOffer());if(this.peers.get(id)!==peer)return;this.send({type:'signal',to:id,payload:{type:'offer',sdp:peer.pc.localDescription.toJSON()}});}catch{if(this.peers.get(id)===peer)this.drop(id);}finally{peer.making=false;}}
 async signal(m){const s=this.state,p=s.people.find(p=>p.id===m.from);if(!s.mic||!this.stream||!p||!p.mic||!canHear(s.position,p)||m.payload.fromConnection!==p.connection||m.payload.toConnection!==s.connection)return;
  let peer=this.peers.get(m.from);if(!peer)peer=this.create(p);
  try{if(m.payload.type==='ice'){if(peer.pc.remoteDescription)await peer.pc.addIceCandidate(m.payload.candidate);else peer.queue.push(m.payload.candidate);return;}
   if(m.payload.type==='offer'&&s.user.id<m.from)return;
   await peer.pc.setRemoteDescription(m.payload.sdp);for(const candidate of peer.queue)await peer.pc.addIceCandidate(candidate);peer.queue=[];
   if(m.payload.type==='offer'){await peer.pc.setLocalDescription(await peer.pc.createAnswer());if(this.peers.get(m.from)===peer)this.send({type:'signal',to:m.from,payload:{type:'answer',sdp:peer.pc.localDescription.toJSON()}});}
  }catch{this.drop(m.from);}
 }
 resume(){for(const p of this.peers.values())void p.audio.play().catch(()=>{});}
}
