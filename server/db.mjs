import pg from 'pg';
import {randomUUID} from 'node:crypto';
let pool;
export function getPool(){if(!process.env.DATABASE_URL)throw Object.assign(new Error('Banco não configurado.'),{status:503});return pool??=new pg.Pool({connectionString:process.env.DATABASE_URL,max:5,connectionTimeoutMillis:10000,idleTimeoutMillis:15000});}
export class Repository {
 constructor(db=getPool()){this.db=db;}
 async query(sql,args=[]){return (await this.db.query(sql,args)).rows;}
 async user(id){return (await this.query('SELECT * FROM users WHERE id=$1',[id]))[0];}
 async addUser(id,name,password,color){return (await this.query('INSERT INTO users(id,name,password_hash,color) VALUES($1,$2,$3,$4) RETURNING id,name,color',[id,name,password,color]))[0];}
 async session(hash){return (await this.query('SELECT u.id,u.name,u.color FROM sessions s JOIN users u ON u.id=s.user_id WHERE token_hash=$1 AND expires_at>now()',[hash]))[0];}
 async createSession(hash,id){await this.query("INSERT INTO sessions VALUES($1,$2,now()+interval '12 hours')",[hash,id]);}
 async revoke(hash){await this.query('DELETE FROM sessions WHERE token_hash=$1',[hash]);}
 async limit(key,max,seconds){const r=await this.query(`INSERT INTO rate_limits VALUES($1,1,now()+($2::text||' seconds')::interval) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.resets_at<now() THEN 1 ELSE rate_limits.count+1 END, resets_at=CASE WHEN rate_limits.resets_at<now() THEN excluded.resets_at ELSE rate_limits.resets_at END RETURNING count`,[key,seconds]);return r[0].count<=max;}
 async join(id,connection){await this.query('INSERT INTO presence(user_id,connection_id,x,y,mic) VALUES($1,$2,740,340,false) ON CONFLICT(user_id) DO UPDATE SET connection_id=$2,x=740,y=340,mic=false,updated_at=now()',[id,connection]);}
 async move(id,connection,p){return this.query('UPDATE presence SET x=$3,y=$4,mic=$5,updated_at=now() WHERE user_id=$1 AND connection_id=$2 RETURNING user_id',[id,connection,p.x,p.y,!!p.mic]);}
 async leave(id,connection){await this.query('DELETE FROM presence WHERE user_id=$1 AND connection_id=$2',[id,connection]);}
 async people(){return this.query("SELECT p.user_id AS id,p.x,p.y,p.mic,p.connection_id,u.name,u.color FROM presence p JOIN users u ON u.id=p.user_id WHERE updated_at>now()-interval '15 seconds'");}
 async signal(sender,recipient,payload){await this.query('INSERT INTO signals(id,sender,recipient,payload) VALUES($1,$2,$3,$4)',[randomUUID(),sender,recipient,JSON.stringify(payload)]);}
 async signals(id){return this.query("SELECT * FROM signals WHERE recipient=$1 AND created_at>now()-interval '30 seconds' ORDER BY created_at LIMIT 100",[id]);}
 async ack(id,ids){await this.query('DELETE FROM signals WHERE recipient=$1 AND id=ANY($2::text[])',[id,ids]);}
 async meetings(){return this.query("SELECT * FROM meetings WHERE ends_at>now()-interval '1 day' ORDER BY starts_at LIMIT 200");}
 async addMeeting(u,d){return (await this.query('INSERT INTO meetings(id,title,starts_at,ends_at,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *',[randomUUID(),d.title,d.starts_at,d.ends_at,u]))[0];}
 async removeMeeting(u,id){return this.query('DELETE FROM meetings WHERE id=$1 AND created_by=$2 RETURNING id',[id,u]);}
 async tasks(){return this.query('SELECT * FROM tasks ORDER BY created_at DESC LIMIT 300');}
 async addTask(u,d){return (await this.query('INSERT INTO tasks(id,title,sector,assignee,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *',[randomUUID(),d.title,d.sector,d.assignee,u]))[0];}
 async updateTask(id,status){return this.query('UPDATE tasks SET status=$2 WHERE id=$1 RETURNING *',[id,status]);}
 async records(sector){return this.query('SELECT * FROM records WHERE ($1::text IS NULL OR sector=$1) ORDER BY created_at DESC LIMIT 500',[sector||null]);}
 async addRecord(u,d){return (await this.query('INSERT INTO records(id,title,sector,kind,amount_cents,details,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[randomUUID(),d.title,d.sector,d.kind,d.amount_cents??null,d.details||'',u]))[0];}
 async costs(){return this.query("SELECT kind, count(*)::int AS count, COALESCE(sum(amount_cents),0)::text AS total_cents FROM records WHERE kind IN ('income','expense') GROUP BY kind");}
 async history(agent){return this.query('SELECT * FROM (SELECT * FROM messages WHERE agent_id=$1 ORDER BY created_at DESC LIMIT 24) m ORDER BY created_at',[agent]);}
 async message(agent,u,role,content){await this.query('INSERT INTO messages(id,agent_id,user_id,role,content) VALUES($1,$2,$3,$4,$5)',[randomUUID(),agent,u,role,content]);}
 async settings(){return Object.fromEntries((await this.query('SELECT * FROM settings')).map(r=>[r.key,r.value]));}
 async saveSettings(d){await this.query("INSERT INTO settings VALUES('partners',$1) ON CONFLICT(key) DO UPDATE SET value=$1",[JSON.stringify(d)]);}

 async notices(){return this.query('SELECT * FROM notices ORDER BY pinned DESC, created_at DESC LIMIT 100');}
 async addNotice(u,d){return (await this.query('INSERT INTO notices(id,body,created_by,pinned) VALUES($1,$2,$3,$4) RETURNING *',[randomUUID(),d.body,u,!!d.pinned]))[0];}
 async removeNotice(id){return this.query('DELETE FROM notices WHERE id=$1 RETURNING id',[id]);}
 async goals(){return this.query('SELECT * FROM goals ORDER BY status, due_date NULLS LAST, created_at DESC LIMIT 100');}
 async addGoal(u,d){return (await this.query('INSERT INTO goals(id,title,current_value,target_value,unit,due_date,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[randomUUID(),d.title,d.current_value||0,d.target_value,d.unit||'',d.due_date||null,u]))[0];}
 async updateGoal(id,d){return (await this.query(`UPDATE goals SET title=COALESCE($2,title),current_value=COALESCE($3,current_value),target_value=COALESCE($4,target_value),unit=COALESCE($5,unit),status=COALESCE($6,status),due_date=COALESCE($7,due_date),updated_at=now() WHERE id=$1 RETURNING *`,[id,d.title??null,d.current_value??null,d.target_value??null,d.unit??null,d.status??null,d.due_date??null]))[0];}
 async agentSchedules(enabledOnly=false){return this.query(`SELECT * FROM agent_schedules WHERE ($1::boolean=false OR enabled=true) ORDER BY hour,agent_id`,[enabledOnly]);}
 async addAgentSchedule(u,d){return (await this.query('INSERT INTO agent_schedules(id,agent_id,label,prompt,hour,weekdays,enabled,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[randomUUID(),d.agent_id,d.label,d.prompt,d.hour,d.weekdays,d.enabled!==false,u]))[0];}
 async updateAgentSchedule(id,d){return (await this.query(`UPDATE agent_schedules SET label=COALESCE($2,label),prompt=COALESCE($3,prompt),hour=COALESCE($4,hour),weekdays=COALESCE($5,weekdays),enabled=COALESCE($6,enabled),updated_at=now() WHERE id=$1 RETURNING *`,[id,d.label??null,d.prompt??null,d.hour??null,d.weekdays??null,d.enabled??null]))[0];}
 async removeAgentSchedule(id){return this.query('DELETE FROM agent_schedules WHERE id=$1 RETURNING id',[id]);}
 async beginAgentRun(schedule,runDate){return (await this.query(`INSERT INTO agent_runs(id,schedule_id,agent_id,run_date,status) VALUES($1,$2,$3,$4,'running') ON CONFLICT(schedule_id,run_date) DO NOTHING RETURNING *`,[randomUUID(),schedule.id,schedule.agent_id,runDate]))[0];}
 async finishAgentRun(id,status,output='',error=''){return (await this.query('UPDATE agent_runs SET status=$2,output=$3,error=$4,finished_at=now() WHERE id=$1 RETURNING *',[id,status,output,error]))[0];}
 async agentRuns(date=null){return this.query(`SELECT r.*,s.label FROM agent_runs r JOIN agent_schedules s ON s.id=r.schedule_id WHERE ($1::date IS NULL OR r.run_date=$1::date) ORDER BY r.started_at DESC LIMIT 200`,[date]);}
 async dailyBrief(){return (await this.query('SELECT * FROM daily_briefs ORDER BY brief_date DESC LIMIT 1'))[0];}
 async saveDailyBrief(date,content){await this.query(`INSERT INTO daily_briefs(brief_date,content) VALUES($1,$2) ON CONFLICT(brief_date) DO UPDATE SET content=$2,generated_at=now()`,[date,JSON.stringify(content)]);}
 async audit(u,action,target){await this.query('INSERT INTO audit(actor,action,target) VALUES($1,$2,$3)',[u,action,target]);}
 async cleanup(){await this.query("DELETE FROM signals WHERE created_at<now()-interval '2 minutes'");await this.query('DELETE FROM sessions WHERE expires_at<now()');await this.query('DELETE FROM rate_limits WHERE resets_at<now()');}
}
