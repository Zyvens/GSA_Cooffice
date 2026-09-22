import {authenticate,hashPassword,verifyPassword,sameSecret,startSession,clearSession,cookieToken,digest,checkOrigin,iceConfig} from './auth.mjs';
import {fail,text,task,meeting,record} from './validation.mjs';
import {runAgent} from './agents.mjs';
import {AGENTS} from '../shared/world.mjs';
import {runDueSchedules,refreshDailyBrief} from './automation.mjs';
import {projectPrice} from './commercial.mjs';
export function createHandler(repo){
 return async(req,res)=>{
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const json=(d,status=200)=>{res.statusCode=status;res.end(JSON.stringify(d));};
  try{
   const url=new URL(req.url,'http://local'),path=url.pathname,method=req.method;
   if(path==='/api/health')return json({ok:true,version:'0.2.0'});
   if(path==='/api/cron/agents'&&method==='GET'){const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');if(!process.env.CRON_SECRET||!sameSecret(token,process.env.CRON_SECRET))fail('Cron não autorizado.',401);return json(await runDueSchedules(repo));}
   if(path==='/api/config')return json({database:!!process.env.DATABASE_URL,ai:!!process.env.AI_API_KEY,relay:!!(process.env.TURN_URL&&process.env.TURN_SHARED_SECRET)});
   let body={};if(['POST','PUT','PATCH','DELETE'].includes(method)){
    checkOrigin(req);if(method!=='DELETE'&&!(req.headers['content-type']||'').startsWith('application/json'))fail('Formato inválido.',415);
    let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>32000)fail('Conteúdo muito grande.',413);}if(raw){try{body=JSON.parse(raw);}catch{fail('JSON inválido.');}}
   }
   if(path==='/api/auth'&&method==='POST'){
    const id=String(body.id||'').toLowerCase();if(!['vitor','fabio'].includes(id))fail('Usuário ou senha inválidos.',401);
    const ip=process.env.VERCEL?String(req.headers['x-vercel-forwarded-for']||req.socket.remoteAddress):req.socket.remoteAddress;
    const limits=await Promise.all([repo.limit(`login:ip:${digest(ip||'unknown')}`,30,900),repo.limit(`login:user:${id}`,12,900)]);if(limits.some(x=>!x))fail('Muitas tentativas. Aguarde 15 minutos.',429);
    const password=text(body.password,128);let user=await repo.user(id);
    if(body.register){
     if(user||!sameSecret(body.invite,process.env[`INVITE_${id.toUpperCase()}`]))fail('Convite inválido ou conta já ativada.',400);
     if(password.length<12)fail('Use uma senha com pelo menos 12 caracteres.');
     user=await repo.addUser(id,id==='vitor'?'Vitor Guimarães':'Fabio Guimarães',await hashPassword(password),id==='vitor'?'#d4af67':'#83b9ba');
     await repo.audit(id,'account.activated',id);
    }else if(!user||!await verifyPassword(password,user.password_hash))fail('Usuário ou senha inválidos.',401);
    await startSession(res,repo,user);return json({user:{id:user.id,name:user.name,color:user.color}});
   }
   const user=await authenticate(req,repo);if(!user)fail('Entre para acessar o escritório.',401);
   if(path==='/api/me'&&method==='GET')return json({user});
   if(path==='/api/logout'&&method==='POST'){await repo.revoke(digest(cookieToken(req)));clearSession(res);return json({ok:true});}
   if(path==='/api/ice'&&method==='GET')return json(iceConfig(user));
   if(path==='/api/dashboard'&&method==='GET'){let brief=await repo.dailyBrief();if(!brief)brief={brief_date:null,content:await refreshDailyBrief(repo)};return json({notices:await repo.notices(),goals:await repo.goals(),schedules:await repo.agentSchedules(),runs:await repo.agentRuns(),brief});}
   if(path==='/api/notices'){if(method==='POST'){const d=await repo.addNotice(user.id,{body:text(body.body,1000),pinned:!!body.pinned});await repo.audit(user.id,'notice.created',d.id);return json(d,201);}if(method==='DELETE'){const d=await repo.removeNotice(text(body.id));if(!d.length)fail('Recado não encontrado.',404);return json({ok:true});}}
   if(path==='/api/goals'){if(method==='POST'){const target=Number(body.target_value),current=Number(body.current_value||0);if(!Number.isFinite(target)||target<=0||!Number.isFinite(current)||current<0)fail('Valores da meta inválidos.');const d=await repo.addGoal(user.id,{title:text(body.title,160),current_value:current,target_value:target,unit:body.unit?text(body.unit,30):'',due_date:body.due_date||null});return json(d,201);}if(method==='PATCH'){if(body.status&&!['active','done','paused'].includes(body.status))fail('Status da meta inválido.');const d=await repo.updateGoal(text(body.id),{current_value:body.current_value===undefined?undefined:Number(body.current_value),target_value:body.target_value===undefined?undefined:Number(body.target_value),status:body.status});if(!d)fail('Meta não encontrada.',404);return json(d);}}
   if(path==='/api/agent-schedules'){if(method==='GET')return json(await repo.agentSchedules());if(method==='POST'){const agent_id=text(body.agent_id,80);if(!AGENTS.some(a=>a.id===agent_id))fail('Agente inválido.');const hour=Number(body.hour),weekdays=Array.isArray(body.weekdays)?body.weekdays.map(Number):[];if(!Number.isInteger(hour)||hour<0||hour>23||!weekdays.length||weekdays.some(d=>!Number.isInteger(d)||d<0||d>6))fail('Horário ou dias inválidos.');const d=await repo.addAgentSchedule(user.id,{agent_id,label:text(body.label,120),prompt:text(body.prompt,4000),hour,weekdays:[...new Set(weekdays)],enabled:body.enabled!==false});return json(d,201);}if(method==='PATCH'){const d=await repo.updateAgentSchedule(text(body.id),{enabled:body.enabled===undefined?undefined:!!body.enabled});if(!d)fail('Rotina não encontrada.',404);return json(d);}if(method==='DELETE'){const d=await repo.removeAgentSchedule(text(body.id));if(!d.length)fail('Rotina não encontrada.',404);return json({ok:true});}}
   if(path==='/api/agent-runs'&&method==='GET')return json(await repo.agentRuns());
   if(path==='/api/meetings'){
    if(method==='GET')return json(await repo.meetings());
    if(method==='POST'){const d=await repo.addMeeting(user.id,meeting(body));await repo.audit(user.id,'meeting.created',d.id);return json(d,201);}
    if(method==='DELETE'){const d=await repo.removeMeeting(user.id,text(body.id));if(!d.length)fail('Só quem criou pode cancelar a reserva.',403);await repo.audit(user.id,'meeting.cancelled',body.id);return json({ok:true});}
   }
   if(path==='/api/tasks'){
    if(method==='GET')return json(await repo.tasks());
    if(method==='POST'){const d=await repo.addTask(user.id,task(body));await repo.audit(user.id,'task.created',d.id);return json(d,201);}
    if(method==='PATCH'){if(!['todo','doing','done'].includes(body.status))fail('Status inválido.');const d=await repo.updateTask(text(body.id),body.status);if(!d.length)fail('Tarefa não encontrada.',404);await repo.audit(user.id,'task.updated',body.id);return json(d[0]);}
   }
   if(path==='/api/records'){
    if(method==='GET')return json(await repo.records());
    if(method==='POST'){const d=await repo.addRecord(user.id,record(body));await repo.audit(user.id,'record.created',d.id);return json(d,201);}
   }
   if(path==='/api/playbooks'&&method==='GET')return json(await repo.playbooks(url.searchParams.get('q')||null,url.searchParams.get('category')||null));
   if(path==='/api/pricing'&&method==='GET')return json(projectPrice(url.searchParams.get('environments')));
   if(path==='/api/settings'){
    if(method==='GET')return json(await repo.settings());
    if(method==='PUT'){const d={title:text(body.title,45),color:/^#[a-fA-F0-9]{6}$/.test(body.color)?body.color:fail('Cor inválida.')};await repo.saveSettings(d);await repo.audit(user.id,'room.customized','partners');return json(d);}
   }
   if(path==='/api/agents/history'&&method==='GET'){const id=url.searchParams.get('id');if(!AGENTS.some(a=>a.id===id))fail('Agente inexistente.',404);return json(await repo.history(id));}
   if(path==='/api/agents/chat'&&method==='POST')return json(await runAgent(repo,user,text(body.agent),text(body.message,4000)));
   fail('Rota não encontrada.',404);
  }catch(e){if(res.writableEnded)return;if(e.code==='23P01')return json({error:'Esse horário já está reservado. Escolha outro intervalo.'},409);if(e.code==='23505')return json({error:'Esse registro já existe.'},409);json({error:e.status?e.message:'Serviço temporariamente indisponível. Tente novamente.'},e.status||503);}
 };
}
