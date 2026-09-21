export const WORLD = { width: 1440, height: 1060, tile: 20, spawn: { x: 740, y: 340 } };
export const ROOMS = [
 {id:'meeting',name:'Sala de Reunião',short:'Reunião',x:40,y:40,w:400,h:260,color:'#d4af67',floor:'#b8a588',audio:'room',label:'Áudio da sala',description:'Um espaço para alinhar ideias e decidir juntos.',icon:'video'},
 {id:'sales',name:'Comercial',short:'Comercial',x:520,y:40,w:400,h:260,color:'#69b3a0',floor:'#adab8e',audio:'room',label:'Áudio da sala',description:'Relacionamentos que viram oportunidades.',icon:'chart'},
 {id:'executive',name:'Executivo',short:'Executivo',x:1000,y:40,w:400,h:260,color:'#859dc4',floor:'#a8a7a1',audio:'private',label:'Áudio privado',description:'Direção estratégica e o apoio da EVA à gestão.',icon:'briefcase'},
 {id:'finance',name:'Financeiro',short:'Financeiro',x:40,y:390,w:400,h:260,color:'#8bb6be',floor:'#aaa994',audio:'private',label:'Áudio privado',description:'Clareza sobre custos, caixa e resultados.',icon:'wallet'},
 {id:'partners',name:'Sala dos Sócios',short:'Sócios',x:520,y:390,w:400,h:260,color:'#d4af67',floor:'#bba78c',audio:'private',label:'Áudio privado · foco nas mesas',description:'O espaço de Vitor e Fabio. Personalize e construa o próximo passo.',icon:'crown'},
 {id:'operations',name:'Operacional',short:'Operacional',x:1000,y:390,w:400,h:260,color:'#b09cc7',floor:'#aaa193',audio:'room',label:'Áudio da sala',description:'Projetos, técnicos e manutenção em um só lugar.',icon:'tool'},
 {id:'supply',name:'Supply Chain',short:'Supply Chain',x:40,y:740,w:400,h:260,color:'#c89778',floor:'#b7a58d',audio:'room',label:'Áudio da sala',description:'Materiais certos, no lugar certo e na hora certa.',icon:'box'},
 {id:'hr',name:'Recursos Humanos',short:'RH',x:520,y:740,w:400,h:260,color:'#a9ba86',floor:'#aaa98e',audio:'private',label:'Áudio privado',description:'Pessoas, benefícios e preparação para crescer.',icon:'users'},
 {id:'safety',name:'Segurança do Trabalho',short:'Segurança',x:1000,y:740,w:400,h:260,color:'#d0b56a',floor:'#b6ae95',audio:'room',label:'Áudio da sala',description:'Planejamento preventivo, EPIs e referências oficiais.',icon:'shield'}
];
export const AGENTS = [
 {id:'sales-lead',name:'Lucas',role:'Coordenador de vendas',room:'sales',color:'#5aa78e',x:605,y:205,prompt:'Qualifique leads, organize follow-ups e prepare propostas. Não invente clientes ou oportunidades.'},
 {id:'marketing',name:'Clara',role:'Coordenadora de marketing',room:'sales',color:'#c58570',x:805,y:205,prompt:'Planeje posicionamento, campanhas e parcerias para automação residencial e empresarial.'},
 {id:'social',name:'Lia',role:'Analista de redes sociais',room:'sales',color:'#d9b875',x:605,y:260,prompt:'Crie calendários editoriais e rascunhos de posts. Nunca publique ou envie mensagens externamente.'},
 {id:'commercial',name:'Rafael',role:'Gerente comercial',room:'sales',color:'#668eb6',x:805,y:260,prompt:'Analise funil, conversão, metas e margem das propostas usando apenas os registros cadastrados.'},
 {id:'accountant',name:'Helena',role:'Contadora',room:'finance',color:'#65aeb6',x:140,y:565,prompt:'Organize documentos contábeis e pendências para validação do contador habilitado. Não ateste conformidade fiscal.'},
 {id:'finance',name:'Bruno',role:'Analista financeiro',room:'finance',color:'#829e65',x:330,y:565,prompt:'Use analyze_costs para consolidar receitas e despesas reais. Separe registrado, previsto e desconhecido.'},
 {id:'director',name:'Atlas',role:'Assessor de diretoria',room:'executive',color:'#718da8',x:1100,y:215,prompt:'Apoie decisões estratégicas dos dois sócios. Não assuma poder de representação ou assinatura.'},
 {id:'eva',name:'EVA',role:'Secretária executiva',room:'executive',color:'#b0a2d5',x:1290,y:215,prompt:'Apoie toda a gestão dos sócios, organize prioridades, consulte agenda e crie tarefas com responsáveis claros.'},
 {id:'supply',name:'Caio',role:'Coordenador de logística',room:'supply',color:'#c48e62',x:230,y:910,prompt:'Organize materiais, compras e fornecimento. Liste dependências e prazos; não efetue compras.'},
 {id:'operations',name:'Diego',role:'Gerente operacional',room:'operations',color:'#aa8bbb',x:1110,y:565,prompt:'Organize projetos, técnicos disponíveis, atividades e prazos a partir dos registros. Não invente disponibilidade.'},
 {id:'maintenance',name:'Nina',role:'Coordenadora de manutenção',room:'operations',color:'#c9a968',x:1290,y:565,prompt:'Faça triagem de chamados, serviços ativos, manutenção preventiva e demandas pontuais de suporte.'},
 {id:'hr',name:'Marina',role:'Gerente de pessoas',room:'hr',color:'#94b577',x:720,y:910,prompt:'A empresa tem atualmente dois sócios e nenhum colaborador cadastrado. Apoie folha, benefícios e planejamento de contratações sem presumir empregados existentes.'},
 {id:'safety',name:'Pedro',role:'Coordenador de segurança',room:'safety',color:'#d5b654',x:1200,y:910,prompt:'Ofereça checklist preliminar, nunca garanta ausência de risco ou autorize trabalho. Consulte fontes oficiais via list_safety_sources; texto integral atualizado deve ser verificado antes de citar exigências. Não invente itens de NRs. Riscos elétricos/altura exigem avaliação por profissional habilitado.'}
];
export const FOCUS = [{x:550,y:455,w:130,h:145},{x:770,y:455,w:120,h:145}];
export function roomAt(x,y){return ROOMS.find(r=>x>r.x+8&&x<r.x+r.w-8&&y>r.y+8&&y<r.y+r.h-8)||null;}
export function zoneAt(x,y){if(FOCUS.some(r=>inside(x,y,r)))return 'silent';return roomAt(x,y)?.id||'lounge';}
export function inside(x,y,r,p=0){return x>=r.x-p&&x<=r.x+r.w+p&&y>=r.y-p&&y<=r.y+r.h+p;}
export const FURNITURE = ROOMS.flatMap(r=>{
 const list=[]; const add=(type,x,y,w,h)=>list.push({type,x:r.x+x,y:r.y+y,w,h,room:r.id});
 add('plant',20,35,25,30);add('plant',350,35,25,30);
 if(r.id==='meeting'){add('table',125,90,150,85);add('screen',140,22,120,12);}
 else if(r.id==='partners'){add('desk',45,95,100,48);add('desk',250,95,100,48);add('sofa',155,65,90,32);}
 else if(r.id==='supply'){add('shelf',55,45,75,50);add('shelf',260,45,85,50);add('desk',140,100,120,48);}
 else if(r.id==='hr'||r.id==='safety'){add('desk',140,100,120,48);add('sofa',50,60,70,30);add('shelf',280,55,55,60);}
 else{add('desk',55,88,110,48);add('desk',240,88,110,48);add('screen',160,24,80,12);}
 return list;
});
export function walkable(x,y){
 if(x<22||y<22||x>WORLD.width-22||y>WORLD.height-22)return false;
 for(const r of ROOMS){
  if(!inside(x,y,r,7))continue;
  const atDoor=Math.abs(x-(r.x+r.w/2))<27&&y>r.y+r.h-16;
  const onWall=x<r.x+16||x>r.x+r.w-16||y<r.y+25||y>r.y+r.h-12;
  if(onWall&&!atDoor)return false;
 }
 return !FURNITURE.some(f=>inside(x,y,f,7));
}
export function canHear(a,b){const za=zoneAt(a.x,a.y),zb=zoneAt(b.x,b.y);return za!=='silent'&&za===zb&&(za!=='lounge'||Math.hypot(a.x-b.x,a.y-b.y)<=180);}
export function validateMove(from,to,elapsed=100){
 if(!Number.isFinite(to.x)||!Number.isFinite(to.y)||!walkable(to.x,to.y))return false;
 const d=Math.hypot(to.x-from.x,to.y-from.y); if(d>Math.min(220,Math.max(36,elapsed*.25+16)))return false;
 for(let t=0;t<=1;t+=1/Math.max(1,Math.ceil(d/5)))if(!walkable(from.x+(to.x-from.x)*t,from.y+(to.y-from.y)*t))return false;
 return true;
}
export function findPath(start,end){
 const T=20,cols=WORLD.width/T,rows=WORLD.height/T;
 const cell=p=>({x:Math.floor(p.x/T),y:Math.floor(p.y/T)}),s=cell(start),e=cell(end),key=p=>p.y*cols+p.x;
 const q=[s],prev=new Map([[key(s),null]]);let last=null;
 for(let head=0;head<q.length;head++){const p=q[head];if(p.x===e.x&&p.y===e.y){last=p;break;}
  for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const n={x:p.x+dx,y:p.y+dy};if(n.x<0||n.y<0||n.x>=cols||n.y>=rows||prev.has(key(n))||!walkable(n.x*T+10,n.y*T+10))continue;prev.set(key(n),p);q.push(n);}
 }
 if(!last)return [];
 const path=[];for(let p=last;prev.get(key(p));p=prev.get(key(p)))path.unshift({x:p.x*T+10,y:p.y*T+10});return path;
}
export const SECTORS=ROOMS.filter(r=>r.id!=='meeting'&&r.id!=='partners');
