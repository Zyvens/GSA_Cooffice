import {scrypt as scryptCb,randomBytes,createHash,timingSafeEqual,createHmac} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCb);
export const digest=s=>createHash('sha256').update(s).digest('hex');
export async function hashPassword(password){const salt=randomBytes(16).toString('hex');const key=await scrypt(password,salt,64);return `${salt}:${key.toString('hex')}`;}
export async function verifyPassword(password,stored){const [salt,hash]=stored.split(':');const key=await scrypt(password,salt,64);return timingSafeEqual(key,Buffer.from(hash,'hex'));}
export function sameSecret(a,b){return typeof a==='string'&&typeof b==='string'&&b.length>=24&&timingSafeEqual(Buffer.from(digest(a)),Buffer.from(digest(b)));}
export function cookieToken(req){const parts=(req.headers.cookie||'').split(';').map(x=>x.trim());return parts.find(x=>x.startsWith('gsa_session='))?.slice(12)||'';}
export async function authenticate(req,repo){const token=cookieToken(req);return token?repo.session(digest(token)):null;}
export async function startSession(res,repo,user){const token=randomBytes(32).toString('base64url');await repo.createSession(digest(token),user.id);res.setHeader('Set-Cookie',`gsa_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${process.env.APP_ORIGIN?.startsWith('https:')?'; Secure':''}`);}
export function clearSession(res){res.setHeader('Set-Cookie',`gsa_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${process.env.APP_ORIGIN?.startsWith('https:')?'; Secure':''}`);}
export function checkOrigin(req){const origin=process.env.APP_ORIGIN;if(!origin||req.headers.origin!==origin)throw Object.assign(new Error('Origem não autorizada.'),{status:403});}
export function iceConfig(user){const iceServers=[{urls:'stun:stun.l.google.com:19302'}];if(process.env.TURN_URL&&process.env.TURN_SHARED_SECRET){const username=`${Math.floor(Date.now()/1000)+3600}:${user.id}`;iceServers.push({urls:process.env.TURN_URL.split(','),username,credential:createHmac('sha1',process.env.TURN_SHARED_SECRET).update(username).digest('base64')});}return {iceServers,relayConfigured:iceServers.length>1};}
