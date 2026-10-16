import { env } from 'cloudflare:workers';
import { createArena,advance,join,snapshot,type Arena } from '../../../lib/arena';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function database(){const db=(env as unknown as {DB:D1Database}).DB;if(!db)throw new Error('The shared arena database is unavailable.');return db;}
async function read(db:D1Database){return await db.prepare("SELECT revision,state FROM arena WHERE id='shared'").first<{revision:number;state:string}>();}
export async function GET(request:Request){try{
  const row=await read(await database());const state=row?JSON.parse(row.state):createArena(Date.now());
  if(new URL(request.url).searchParams.has('export')){
    if(!state.champion)return json({error:'Finish a generation before exporting a champion.'},409);
    return json({format:'pursuit-neuroevolution-v1',generation:state.generation-1,inputs:['target dx','target dy','target vx','target vy','self vx','self vy','obstacle dx','obstacle dy','obstacle clearance','target distance','bias'],genome:state.champion});
  }
  state.players=state.players.filter((p:{lastSeen:number})=>Date.now()-p.lastSeen<15000);
  return json(snapshot(state));
}catch{return json({error:'The arena is temporarily unavailable. Please retry.'},503);}}
export async function POST(request:Request){
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Invalid request origin.'},403);
  const raw=await request.text();if(raw.length>2048)return json({error:'Request too large.'},413);
  let input:any;try{input=JSON.parse(raw);}catch{return json({error:'Invalid request.'},400);}
  if(!['join','input','leave'].includes(input?.action))return json({error:'Unknown action.'},400);
  if(input.action==='join'&&(typeof input.name!=='string'||!input.name.trim()||input.name.length>20))return json({error:'Use a name between 1 and 20 characters.'},400);
  if(input.action==='input'&&(!Number.isFinite(input.x)||!Number.isFinite(input.y)||Math.abs(input.x)>1||Math.abs(input.y)>1))return json({error:'Invalid movement.'},400);
  const bearer=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
  if(input.action!=='join'&&(!bearer||bearer.length>100))return json({error:'Please rejoin the arena.'},401);
  const token=input.action==='join'?crypto.randomUUID():bearer;
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const id=crypto.randomUUID();
  try{
    const db=await database();
    if(!await read(db))await db.prepare("INSERT OR IGNORE INTO arena (id,revision,state) VALUES ('shared',0,?)").bind(JSON.stringify(createArena(Date.now()))).run();
    for(let attempt=0;attempt<5;attempt++){
      const row=(await read(db))!;const a:Arena=JSON.parse(row.state),now=Date.now();advance(a,now);
      if(input.action==='join'){
        if(a.players.length>=12)return json({error:'The arena is full (12 players). Try again shortly.'},409);
        join(a,id,hash,input.name.trim().replace(/[\u0000-\u001f]/g,''),now);
      }else{
        const p=a.players.find(p=>p.token===hash);if(!p)return json({error:'Your session expired. Rejoin to keep playing.'},401);
        if(input.action==='leave')a.players=a.players.filter(other=>other.id!==p.id);
        else {p.ix=input.x;p.iy=input.y;p.dash=!!input.dash;p.lastSeen=now;}
      }
      const result=await db.prepare("UPDATE arena SET state=?,revision=revision+1 WHERE id='shared' AND revision=?").bind(JSON.stringify(a),row.revision).run();
      if(result.meta.changes===1)return json({...snapshot(a),...(input.action==='join'?{session:{id,token}}:{})});
    }
    return json({error:'Arena busy. Reconnecting…'},503);
  }catch{return json({error:'The arena is temporarily unavailable. Please retry.'},503);}
}
