import {WORLD,ROOMS,AGENTS,FURNITURE,FOCUS,walkable,findPath,roomAt,zoneAt} from '../shared/world.mjs';
export function drawSprite(ctx,x,y,color='#d4af67',frame=0,scale=1,style=0){
 ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale,scale);const r=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
 r(-10,0,21,5,'#17242a40');const leg=Math.sin(frame)*2;
 r(-6,-7,5,9+leg,'#253c4c');r(2,-7,5,9-leg,'#253c4c');r(-7,1+leg,6,3,'#d8d8cc');r(2,1-leg,6,3,'#d8d8cc');
 r(-9,-20,19,15,'#22313e');r(-7,-20,15,14,color);r(-11,-17,4,11,color);r(8,-17,4,11,color);r(-11,-7,4,4,'#c2916d');r(8,-7,4,4,'#c2916d');
 r(-6,-33,13,13,'#b88761');r(-5,-31,12,10,'#d7a77d');r(-7,-34,15,6,style%3===0?'#392c28':style%3===1?'#655044':'#283b42');r(-7,-30,3,7,'#392c28');r(-3,-26,2,2,'#26313b');r(4,-26,2,2,'#26313b');r(0,-21,3,1,'#97624f');
 if(style===2){r(-6,-28,13,1,'#e0cead');r(-5,-27,5,4,'#405963');r(2,-27,5,4,'#405963');}
 r(-1,-18,2,9,'#f4e5c2');ctx.restore();
}
export function portrait(color,style=0){const c=document.createElement('canvas');c.width=48;c.height=52;drawSprite(c.getContext('2d'),24,46,color,0,1.2,style);return c.toDataURL();}
export class OfficeMap{
 constructor(canvas,{getState,onMove,onAgent,onRoom,ambient=false}={}){
  this.canvas=canvas;this.ctx=canvas.getContext('2d');this.getState=getState;this.onMove=onMove;this.onAgent=onAgent;this.onRoom=onRoom;this.ambient=ambient;this.zoom=1;this.keys=new Set();this.path=[];this.local={...WORLD.spawn};this.last=0;this.sendTime=0;this.walkFrame=0;this.peers=new Map();this.running=true;
  this.down=e=>{if(document.querySelector('.modal-overlay')||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||this.ambient)return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'].includes(e.key)){e.preventDefault();this.keys.add(e.key.toLowerCase());this.path=[];}if(e.key.toLowerCase()==='e'){const a=AGENTS.find(a=>Math.hypot(a.x-this.local.x,a.y-this.local.y)<65);if(a)this.onAgent?.(a.id);else this.onRoom?.(roomAt(this.local.x,this.local.y));}};
  this.up=e=>this.keys.delete(e.key.toLowerCase());this.blur=()=>this.keys.clear();
  window.addEventListener('keydown',this.down);window.addEventListener('keyup',this.up);window.addEventListener('blur',this.blur);
  this.canvas.addEventListener('click',e=>this.click(e));this.ro=new ResizeObserver(()=>this.resize());this.ro.observe(canvas);this.resize();this.raf=requestAnimationFrame(t=>this.frame(t));
 }
 resize(){const b=this.canvas.getBoundingClientRect();this.width=b.width;this.height=b.height;const d=Math.min(devicePixelRatio||1,2);this.dpr=d;this.canvas.width=Math.round(b.width*d);this.canvas.height=Math.round(b.height*d);}
 setZoom(n){this.zoom=Math.max(.85,Math.min(2.8,n));return this.zoom;}
 goRoom(id){const r=ROOMS.find(x=>x.id===id);if(r)this.path=findPath(this.local,{x:r.x+r.w/2,y:r.y+r.h-35});}
 click(e){if(this.ambient)return;const b=this.canvas.getBoundingClientRect(),x=(e.clientX-b.left-this.ox)/this.scale,y=(e.clientY-b.top-this.oy)/this.scale;const a=AGENTS.find(a=>Math.hypot(a.x-x,a.y-15-y)<28);if(a){this.onAgent?.(a.id);return;}if(walkable(x,y)){this.path=findPath(this.local,{x,y});this.canvas.focus();}}
 correct(p){this.local={x:p.x,y:p.y};this.path=[];}
 frame(t){if(!this.running)return;const dt=Math.min((t-this.last)/1000||0,.045);this.last=t;const state=this.getState?.()||{};
  if(!this.ambient&&!document.querySelector('.modal-overlay')){
   let dx=(this.keys.has('d')||this.keys.has('arrowright')?1:0)-(this.keys.has('a')||this.keys.has('arrowleft')?1:0),dy=(this.keys.has('s')||this.keys.has('arrowdown')?1:0)-(this.keys.has('w')||this.keys.has('arrowup')?1:0);
   if(!dx&&!dy&&this.path.length){const target=this.path[0],d=Math.hypot(target.x-this.local.x,target.y-this.local.y);if(d<5)this.path.shift();else{dx=(target.x-this.local.x)/d;dy=(target.y-this.local.y)/d;}}
   if(dx||dy){const norm=Math.hypot(dx,dy),nx=this.local.x+dx/norm*160*dt,ny=this.local.y+dy/norm*160*dt;let moved=false;if(walkable(nx,this.local.y)){this.local.x=nx;moved=true;}if(walkable(this.local.x,ny)){this.local.y=ny;moved=true;}if(!moved)this.path=[];this.walkFrame+=dt*14;}
   else this.walkFrame=0;
   if(t-this.sendTime>100){this.onMove?.({...this.local});this.sendTime=t;}
  }
  this.draw(state,t);this.raf=requestAnimationFrame(tt=>this.frame(tt));
 }
 draw(state,t){
  const c=this.ctx,d=this.dpr;c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,this.width,this.height);c.imageSmoothingEnabled=false;
  const fit=Math.min((this.width-30)/WORLD.width,(this.height-36)/WORLD.height);this.scale=Math.max(.05,fit*this.zoom);const s=this.scale;
  let ox=(this.width-WORLD.width*s)/2,oy=(this.height-WORLD.height*s)/2;
  if(this.zoom>1.4){ox=Math.min(20,Math.max(this.width-WORLD.width*s-20,this.width/2-this.local.x*s));oy=Math.min(20,Math.max(this.height-WORLD.height*s-20,this.height/2-this.local.y*s));}
  this.ox=ox;this.oy=oy;c.translate(ox,oy);c.scale(s,s);
  const rect=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),w,h);};
  rect(8,15,1440,1050,'#091a2450');rect(0,0,1440,1040,'#728880');rect(8,8,1424,1024,'#9aa391');
  for(let y=10;y<1040;y+=20)for(let x=10;x<1440;x+=40){rect(x,y,39,19,(Math.floor(x/40)+Math.floor(y/20))%3?'#a3ab98':'#aab09c');rect(x,y+18,39,1,'#798e7b33');}
  for(const r of ROOMS){
   rect(r.x+8,r.y+15,r.w,r.h,'#334a4655');rect(r.x,r.y,r.w,r.h,'#24404a');rect(r.x+8,r.y+14,r.w-16,r.h-22,r.floor);
   for(let yy=r.y+22;yy<r.y+r.h-10;yy+=19){rect(r.x+9,yy,r.w-18,1,'#5c665b38');for(let xx=r.x+14+(yy%2)*35;xx<r.x+r.w-15;xx+=66)rect(xx,yy,1,19,'#63675920');}
   rect(r.x,r.y,r.w,13,'#526a6c');rect(r.x,r.y+13,r.w,10,'#263f48');rect(r.x+3,r.y+2,r.w-6,3,'#79908d');rect(r.x,r.y,9,r.h,'#526b6c');rect(r.x+r.w-9,r.y,9,r.h,'#3c555c');
   rect(r.x,r.y+r.h-12,r.w/2-30,12,'#4c6466');rect(r.x+r.w/2+30,r.y+r.h-12,r.w/2-30,12,'#4c6466');rect(r.x+r.w/2-30,r.y+r.h-11,60,11,'#d6c59d');
   rect(r.x+r.w/2-30,r.y+r.h,60,4,(r.id==='partners'?state.settings?.partners?.color:null)||r.color);rect(r.x+r.w/2-37,r.y+r.h-15,7,18,'#28424b');rect(r.x+r.w/2+30,r.y+r.h-15,7,18,'#28424b');
   // Tall windows, pixel reflections and bright interior trims.
   for(let wx=75;wx<330;wx+=220){rect(r.x+wx,r.y+4,51,14,'#aacacc');rect(r.x+wx+3,r.y+5,21,10,'#7da7b2');rect(r.x+wx+26,r.y+5,21,10,'#94bac0');rect(r.x+wx+5,r.y+5,4,10,'#c1d3cf');}
   const title=r.id==='partners'?(state.settings?.partners?.title||r.name):r.name;
   c.font='600 15px "DM Sans", sans-serif';const tw=c.measureText(title).width;rect(r.x+r.w/2-tw/2-12,r.y+33,tw+24,27,'#213744');rect(r.x+r.w/2-tw/2-12,r.y+33,3,27,(r.id==='partners'?state.settings?.partners?.color:null)||r.color);c.fillStyle='#e9e5cf';c.textAlign='center';c.fillText(title,r.x+r.w/2,r.y+52);
   if(r.audio==='private'){c.font='9px monospace';c.fillStyle='#647774';c.fillText('ÁUDIO PRIVADO',r.x+r.w-75,r.y+r.h-26);}
   if(state.activeRoom===r.id){c.strokeStyle=r.color;c.lineWidth=3;c.strokeRect(r.x-5,r.y-5,r.w+10,r.h+10);}
  }
  for(const f of FOCUS){rect(f.x,f.y,f.w,f.h,'#586c671a');c.strokeStyle='#708975';c.setLineDash([5,5]);c.strokeRect(f.x,f.y,f.w,f.h);c.setLineDash([]);c.font='9px monospace';c.fillStyle='#52695c';c.textAlign='center';c.fillText('FOCO · SEM ÁUDIO',f.x+f.w/2,f.y+f.h-6);}
  for(const f of FURNITURE)this.furniture(f,rect,c,state);
  // Green courtyards and welcoming central lounge.
  for(const [x,y]of [[475,315],[955,315],[475,665],[955,665],[16,315],[1405,665]])this.plant(x,y,rect);
  rect(570,316,270,58,'#728d7c');rect(576,322,258,46,'#879c85');rect(583,329,244,1,'#bdc4a6');rect(583,361,244,1,'#bdc4a6');
  c.fillStyle='#e4e4c5';c.font='bold 20px "Space Grotesk",sans-serif';c.textAlign='center';c.fillText('GSA',704,346);c.font='8px monospace';c.fillText('GUIMARÃES SEGURANÇA E AUTOMAÇÃO',704,358);
  this.sofa(600,677,90,30,rect);this.sofa(780,677,90,30,rect);rect(715,680,40,28,'#926f4b');rect(715,678,40,24,'#cab085');rect(727,681,10,13,'#ede3c9');rect(729,681,6,2,'#698f84');
  c.font='10px monospace';c.fillStyle='#4d6863';c.fillText('LOUNGE · ÁUDIO POR PROXIMIDADE',736,730);
  c.font='10px monospace';c.fillStyle='#657771';c.fillText('UM ESPAÇO PARA CONSTRUIR O FUTURO, JUNTOS.',720,1023);
  if(this.path.length&&!this.ambient){c.strokeStyle='#f8e4a080';c.lineWidth=3;c.setLineDash([3,6]);c.beginPath();c.moveTo(this.local.x,this.local.y);for(const p of this.path)c.lineTo(p.x,p.y);c.stroke();c.setLineDash([]);const p=this.path.at(-1);c.strokeStyle='#e8d8a5';c.strokeRect(p.x-6,p.y-6,12,12);}
  const entities=AGENTS.map((a,i)=>({...a,ai:true,style:i}));
  for(const p of state.people||[]){if(p.id===state.user?.id)continue;let v=this.peers.get(p.id)||{x:p.x,y:p.y};v.x+=(p.x-v.x)*.22;v.y+=(p.y-v.y)*.22;this.peers.set(p.id,v);entities.push({...p,...v,frame:Math.abs(p.x-v.x)+Math.abs(p.y-v.y)>2?t/90:0});}
  if(!this.ambient)entities.push({...state.user,...this.local,self:true,name:state.user?.name?.split(' ')[0]||'Visitante',color:state.user?.color||'#d4af67',frame:this.walkFrame});
  entities.sort((a,b)=>a.y-b.y);
  for(const e of entities){
   if(e.self){c.strokeStyle='#fff1b4';c.lineWidth=2;c.beginPath();c.ellipse(e.x,e.y+2,18,8,0,0,Math.PI*2);c.stroke();}
   drawSprite(c,e.x,e.y,e.color,e.frame||0,1,e.style||0);
   if(e.id==='safety'){rect(e.x-9,e.y-35,18,5,'#e9c354');rect(e.x-6,e.y-40,12,6,'#ead36d');}
   c.font=e.self?'bold 11px sans-serif':'10px sans-serif';const label=e.self?`${e.name} · você`:e.ai?e.name:e.name?.split(' ')[0];const width=c.measureText(label).width+13;
   rect(e.x-width/2,e.y-52,width,15,e.self?'#e5d4a1':'#233944e8');c.fillStyle=e.self?'#22333a':'#e4e7d8';c.textAlign='center';c.fillText(label,e.x,e.y-41);
   if(e.ai){rect(e.x+8,e.y-37,5,5,state.config?.ai?'#8ab89c':'#c2a970');}
   if(e.mic){c.strokeStyle='#7aefbc';c.lineWidth=2;c.beginPath();c.arc(e.x,e.y-18,22,-.8,.8);c.stroke();}
  }
 }
 plant(x,y,r){r(x+3,y+22,20,12,'#78583e');r(x+1,y+20,24,5,'#b8946d');r(x+11,y+2,4,19,'#456444');r(x-3,y+2,14,10,'#426951');r(x+10,y-4,15,12,'#597f58');r(x+16,y+8,14,9,'#658b59');r(x+3,y+10,13,10,'#719867');r(x+3,y+1,5,3,'#89a571');}
 sofa(x,y,w,h,r){r(x,y+3,w,h,'#3e6665');r(x+4,y,w-8,h-5,'#648780');r(x+8,y+8,w-16,h-12,'#779b8b');r(x+w/2,y+8,2,h-12,'#567d73');r(x,y+2,7,h,'#4c7470');r(x+w-7,y+2,7,h,'#4c7470');r(x+8,y+h,7,4,'#35464a');r(x+w-15,y+h,7,4,'#35464a');}
 furniture(f,r,c,state){
  const {x,y,w,h}=f;r(x+4,y+6,w,h,'#2d4b4030');
  if(f.type==='plant'){this.plant(x,y,r);return;}
  if(f.type==='sofa'){this.sofa(x,y,w,h,r);return;}
  if(f.type==='desk'||f.type==='table'){
   r(x+4,y+10,w-8,h,'#735f49');r(x,y,w,h,'#b58f65');r(x+3,y+3,w-6,h-7,'#d1ad7d');r(x+3,y+h-5,w-6,4,'#8b6b48');r(x+8,y+8,w-16,1,'#e0c79a');
   if(f.type==='desk'){
    r(x+w/2-21,y-11,42,25,'#243d49');r(x+w/2-18,y-8,36,19,'#79aab4');r(x+w/2-16,y-6,30,3,'#b3d0cb');r(x+w/2-16,y,y?20:15,2,'#c9dcce');r(x+w/2-3,y+14,6,7,'#465d62');r(x+w/2-11,y+20,22,3,'#46606a');r(x+w/2-17,y+28,33,9,'#727f7b');
    for(let k=0;k<7;k++)r(x+w/2-15+k*4,y+30,2,2,'#b7c1ad');
    r(x+w-19,y+22,8,10,'#e6dcc0');r(x+w-17,y+20,4,3,'#684d3e');r(x+12,y+25,15,17,'#e6d7b5');r(x+15,y+28,10,1,'#989982');
    r(x+w/2-16,y+h+12,32,22,'#2d4e54');r(x+w/2-13,y+h+12,26,15,'#557b7b');r(x+w/2-9,y+h+27,18,5,'#263f49');
   }else{
    for(const xx of [x+25,x+w-45])for(const yy of [y-28,y+h+8]){r(xx,yy,24,20,'#375762');r(xx+3,yy+3,18,12,'#648885');}
    r(x+w/2-13,y+20,26,16,'#354f5b');r(x+w/2-11,y+22,22,12,'#94bcc0');r(x+25,y+43,13,17,'#eadbbb');r(x+w-40,y+40,8,9,'#e7d3a6');
   }return;
  }
  if(f.type==='screen'){r(x,y,w,h,'#162c3a');r(x+3,y+3,w-6,h-6,'#6398a3');r(x+w/2-10,y+4,20,2,'#bdd3cb');return;}
  if(f.type==='shelf'){r(x,y,w,h,'#7d6248');r(x+4,y+4,w-8,h-8,'#3c5351');for(let yy=y+7;yy<y+h-5;yy+=20){for(let xx=x+8;xx<x+w-7;xx+=9)r(xx,yy,6,14,['#a98168','#94aa98','#c0ae7c','#839ca6'][Math.floor(xx/9)%4]);r(x+3,yy+15,w-6,4,'#bba07a');}}
 }
 destroy(){this.running=false;cancelAnimationFrame(this.raf);this.ro.disconnect();window.removeEventListener('keydown',this.down);window.removeEventListener('keyup',this.up);window.removeEventListener('blur',this.blur);}
}
