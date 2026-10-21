import {secretDigest,validPasswordHash,verifyAdminPassword} from './admin-password.mjs';
const AUTH_KEY='immunity:admin-auth:v1';
export const SESSION_MS=30*60*1000;
const WINDOW_MS=15*60*1000;
type Session={hash:string;expires:number};
type AuthState={fingerprint:string;attempts:{ip:string;at:number}[];sessions:Session[]};
export class AdminError extends Error{constructor(message:string,public status:number){super(message);}}
export const adminConfigured=(hash:unknown)=>validPasswordHash(hash);
export function transportAllowed(request:Request){const url=new URL(request.url);return url.protocol==='https:'||(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname));}
export function requireSameOrigin(request:Request){
  if(!transportAllowed(request)||request.headers.get('origin')!==new URL(request.url).origin||!request.headers.get('content-type')?.startsWith('application/json'))throw new AdminError('Use the administrator controls on this game’s own secure page.',403);
}
function cookieName(request:Request){return new URL(request.url).protocol==='https:'?'__Host-immunity_admin':'immunity_admin_local';}
export function sessionCookie(request:Request,token:string,maxAge=SESSION_MS/1000){
  return `${cookieName(request)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol==='https:'?'; Secure':''}`;
}
function tokenFrom(request:Request){return request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName(request)+'='))?.split('=')[1]||'';}
function normalized(raw:AuthState|null,hash:string,now:number):AuthState{
  const fingerprint=secretDigest(hash);
  if(!raw||raw.fingerprint!==fingerprint)return {fingerprint,attempts:[],sessions:[]};
  return {fingerprint,attempts:raw.attempts.filter(a=>a.at>now-WINDOW_MS),sessions:raw.sessions.filter(s=>s.expires>now)};
}
async function authRow(db:D1Database){return db.prepare('SELECT revision,state FROM arena WHERE id=?').bind(AUTH_KEY).first<{revision:number;state:string}>();}
async function changeAuth<T>(db:D1Database,hash:string,change:(state:AuthState)=>T):Promise<T>{
  await db.prepare('INSERT OR IGNORE INTO arena (id,revision,state) VALUES (?,0,?)').bind(AUTH_KEY,JSON.stringify(normalized(null,hash,Date.now()))).run();
  for(let attempt=0;attempt<6;attempt++){
    const row=(await authRow(db))!,state=normalized(JSON.parse(row.state),hash,Date.now()),result=change(state);
    const saved=await db.prepare('UPDATE arena SET revision=revision+1,state=? WHERE id=? AND revision=?').bind(JSON.stringify(state),AUTH_KEY,row.revision).run();
    if(saved.meta.changes===1)return result;
  }
  throw new AdminError('Administrator controls are busy. Try again shortly.',503);
}
export async function adminSession(db:D1Database,request:Request,hash:string|undefined){
  if(!adminConfigured(hash)||!transportAllowed(request))return null;
  const token=tokenFrom(request);if(!/^[a-f0-9]{64}$/.test(token))return null;
  const row=await authRow(db);if(!row)return null;
  return normalized(JSON.parse(row.state),hash!,Date.now()).sessions.find(s=>s.hash===secretDigest(token))||null;
}
export async function requireAdmin(db:D1Database,request:Request,hash:string|undefined){
  if(!await adminSession(db,request,hash))throw new AdminError('Administrator session expired. Sign in again.',401);
}
export async function loginAdmin(db:D1Database,request:Request,hash:string|undefined,password:unknown){
  if(!adminConfigured(hash))throw new AdminError('Administrator access has not been configured by the host.',503);
  // Cloudflare supplies CF-Connecting-IP. Do not trust arbitrary forwarded-IP headers.
  const ip=secretDigest(request.headers.get('cf-connecting-ip')||'local-or-unknown');
  await changeAuth(db,hash!,state=>{
    if(state.attempts.length>=40||state.attempts.filter(a=>a.ip===ip).length>=5)throw new AdminError('Too many sign-in attempts. Try again in 15 minutes.',429);
    state.attempts.push({ip,at:Date.now()});
  });
  if(!await verifyAdminPassword(password,hash))throw new AdminError('Incorrect administrator password.',401);
  const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join(''),expires=Date.now()+SESSION_MS;
  await changeAuth(db,hash!,state=>{state.sessions.push({hash:secretDigest(token),expires});state.sessions=state.sessions.slice(-8);});
  return {token,expires};
}
export async function logoutAdmin(db:D1Database,request:Request,hash:string|undefined){
  if(adminConfigured(hash))await changeAuth(db,hash!,state=>{state.sessions=state.sessions.filter(s=>s.hash!==secretDigest(tokenFrom(request)));});
}
