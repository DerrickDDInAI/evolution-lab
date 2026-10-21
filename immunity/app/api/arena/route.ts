import {type TrainingWrite} from '../../../lib/training-checkpoints';
import {checkpointStatements} from '../../../lib/training-store';
import {arenaKey,modeProfile,type GameMode} from '../../../lib/game-mode';
import { env } from 'cloudflare:workers';
import { createArena,upgradeArena,advance,applyCommands,join,snapshot,rememberContactFrame,confirmContact,type Arena,type Scores,type Run,type FinishedRun } from '../../../lib/arena';
import {validContactReport,type ContactReply} from '../../../lib/contact-report';
import { MAX_PACKET_COMMANDS,type Command } from '../../../lib/physics';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function database(){const db=(env as unknown as {DB:D1Database}).DB;if(!db)throw new Error('The shared arena database is unavailable.');return db;}
async function read(db:D1Database,mode:GameMode){return db.prepare("SELECT revision,state FROM arena WHERE id=?").bind(arenaKey(mode)).first<{revision:number;state:string}>();}
async function digest(token:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
async function loadScores(db:D1Database,profileId:string,mode:GameMode='survival'):Promise<Scores>{
  const [recent,best]=await Promise.all([
    db.prepare('SELECT id,duration_ms AS durationMs,generation,bot,died_at AS diedAt FROM runs WHERE profile_id=? ORDER BY died_at DESC LIMIT 10').bind(profileId).all<Run>(),
    db.prepare(mode==='motion'?'SELECT MIN(duration_ms) AS bestMs FROM runs WHERE profile_id=? AND bot=-1':'SELECT MAX(duration_ms) AS bestMs FROM runs WHERE profile_id=?').bind(profileId).first<{bestMs:number|null}>(),
  ]);
  return {bestMs:best?.bestMs||0,runs:recent.results};
}
export async function GET(request:Request){try{
  const requested=new URL(request.url).searchParams.get('mode');
  if(requested!==null&&requested!=='survival'&&requested!=='motion')return json({error:'Unknown mode.'},400);
  const mode:GameMode=requested==='motion'?'motion':'survival';
  const db=await database();
  // Personal records are read using an anonymous device secret, including while in the lobby.
  if(new URL(request.url).searchParams.has('scores')){
    const token=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
    if(token.length<20||token.length>100)return json({error:'Missing player identity.'},401);
    return json(await loadScores(db,await digest(modeProfile(token,mode)),mode));
  }
  const row=await read(db,mode),state=row?upgradeArena(JSON.parse(row.state),Date.now()):createArena(Date.now(),mode);
  if(new URL(request.url).searchParams.has('export')){
    if(!state.champion)return json({error:'Finish a generation before exporting a champion.'},409);
    return json({mode,format:'immunity-neuroevolution-v1',generation:state.generation-1,inputs:['target dx','target dy','target vx','target vy','self vx','self vy','obstacle dx','obstacle dy','obstacle clearance','target distance','bias'],genome:state.champion});
  }
  state.players=state.players.filter(p=>Date.now()-p.lastSeen<15000);
  return json(snapshot(state));
}catch{return json({error:'The arena is temporarily unavailable. Please retry.'},503);}}
export async function POST(request:Request){
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Invalid request origin.'},403);
  const raw=await request.text();if(raw.length>20000)return json({error:'Request too large.'},413);
  let input:any;try{input=JSON.parse(raw);}catch{return json({error:'Invalid request.'},400);}
  if(input?.mode!==undefined&&input.mode!=='survival'&&input.mode!=='motion')return json({error:'Unknown mode.'},400);
  const mode:GameMode=input?.mode==='motion'?'motion':'survival';
  if(!['join','input','leave'].includes(input?.action))return json({error:'Unknown action.'},400);
  if(input.action==='join'&&(typeof input.name!=='string'||!input.name.trim()||input.name.length>20))return json({error:'Use a name between 1 and 20 characters.'},400);
  if(input.contactMode!==undefined&&input.contactMode!=='visible-v1')return json({error:'Unsupported contact protocol. Reload the game.'},400);
  if(input.action==='input'){
    if(input.contact!==undefined&&!validContactReport(input.contact))return json({error:'Invalid contact report.'},400);
    if(!Array.isArray(input.commands)||input.commands.length>MAX_PACKET_COMMANDS)return json({error:'Reload this page to use the updated movement controls.'},400);
    if(input.commands.some((c:Command)=>!Number.isSafeInteger(c.seq)||c.seq<1||!Number.isSafeInteger(c.life)||c.life<0||!Number.isFinite(c.dt)||c.dt<=0||c.dt>1/30||!Number.isFinite(c.x)||!Number.isFinite(c.y)||Math.abs(c.x)>1||Math.abs(c.y)>1))return json({error:'Invalid movement.'},400);
    if(input.commands.some((c:Command,i:number)=>i>0&&c.seq<=input.commands[i-1].seq))return json({error:'Movement packets must be ordered.'},400);
  }
  const bearer=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
  if(input.action!=='join'&&(!bearer||bearer.length>100))return json({error:'Please rejoin the arena.'},401);
  if(input.action!=='leave'&&(typeof input.profileToken!=='string'||input.profileToken.length<20||input.profileToken.length>100))return json({error:'Missing player identity. Reload and rejoin.'},400);
  const token=input.action==='join'?crypto.randomUUID():bearer;
  const hash=await digest(token),profileId=input.action==='leave'?'':await digest(modeProfile(input.profileToken,mode)),id=crypto.randomUUID();
  try{
    const db=await database();
    let row=await read(db,mode);
    if(!row)await db.prepare("INSERT OR IGNORE INTO arena (id,revision,state) VALUES (?,0,?)").bind(arenaKey(mode),JSON.stringify(createArena(Date.now(),mode))).run();
    const saved=input.action==='join'?await loadScores(db,profileId,mode):null;
    for(let attempt=0;attempt<5;attempt++){
      if(!row||attempt>0)row=(await read(db,mode))!;
      const now=Date.now(),a:Arena=upgradeArena(JSON.parse(row.state),now),finished:FinishedRun[]=[];
      let contactReply:ContactReply|undefined;
      // Negotiate before simulation: an existing tab must not be killed by an
      // unseen server overlap while its first updated input packet is applied.
      const existing=a.players.find(p=>p.token===hash);
      if(existing&&input.contactMode==='visible-v1')existing.contactMode='visible-v1';
      const trainingWrites:TrainingWrite[]=[];
      advance(a,now,finished,trainingWrites);
      if(input.action==='join'){
        if(a.players.length>=12)return json({error:'The arena is full (12 players). Try again shortly.'},409);
        const joined=join(a,id,hash,input.name.trim().replace(/[\u0000-\u001f]/g,''),now,profileId,saved!);
        if(input.contactMode==='visible-v1')joined.contactMode='visible-v1';
      }else{
        const p=a.players.find(p=>p.token===hash);if(!p)return json({error:'Your session expired. Rejoin to keep playing.'},401);
        if(input.action==='leave')a.players=a.players.filter(other=>other.id!==p.id);
        else {
          if(p.profileId&&p.profileId!==profileId)return json({error:'Player identity mismatch. Rejoin the arena.'},401);
          if(!p.profileId){p.profileId=profileId;p.scores=await loadScores(db,profileId,mode);}
          applyCommands(a,p,input.commands,now,finished,!input.contact);
          if(input.contact)contactReply=confirmContact(a,p,input.contact,now,finished);
        }
      }
      // D1 batches are transactional. A unique commit marker guards score inserts
      // so a failed world CAS cannot create a score for a death that never committed.
      const viewer=a.players.find(p=>p.token===hash);if(viewer)rememberContactFrame(a,viewer,now);
      const commitId=crypto.randomUUID();a.commitId=commitId;
      const statements=[db.prepare("UPDATE arena SET state=?,revision=revision+1 WHERE id=? AND revision=?").bind(JSON.stringify(a),arenaKey(mode),row.revision),
        ...checkpointStatements(db,mode,trainingWrites,commitId),
        ...finished.map(run=>db.prepare("INSERT OR IGNORE INTO runs (id,profile_id,duration_ms,generation,bot,died_at) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM arena WHERE id=? AND json_extract(state,'$.commitId')=?)")
          .bind(run.id,run.profileId,run.durationMs,run.generation,run.bot,run.diedAt,arenaKey(mode),commitId))];
      const result=statements.length===1?[await statements[0].run()]:await db.batch(statements);
      if(result[0].meta.changes===1)return json({...snapshot(a,hash),...(contactReply?{contactReply}:{}),...(input.action==='join'?{session:{id,token}}:{})});
    }
    return json({error:'Arena busy. Reconnecting…'},503);
  }catch(error){console.error('Arena update failed',error instanceof Error?error.message:'database failure');return json({error:'The arena is temporarily unavailable. Please retry.'},503);}
}
