import {env} from 'cloudflare:workers';
import {createArena,upgradeArena,type Arena} from '../../../lib/arena';
import {arenaKey,type GameMode} from '../../../lib/game-mode';
import {MAX_IMPORT_BYTES,parseTrainingArtifact,queueTraining,trainingSummary} from '../../../lib/training-checkpoints';
import {adminConfigured,adminSession,requireAdmin,requireSameOrigin,loginAdmin,logoutAdmin,sessionCookie,AdminError} from '../../../lib/admin-auth';
import {readCheckpoint} from '../../../lib/training-store';
import {boundedJson,discardRequestBody,trainingJson as json,trainingFailure} from '../../../lib/training-http';
export const dynamic='force-dynamic';
const config=()=>env as unknown as {DB:D1Database;IMMUNITY_ADMIN_PASSWORD_HASH?:string};
const modeFrom=(value:unknown):GameMode=>{if(value!==undefined&&value!==null&&value!=='survival'&&value!=='motion')throw new AdminError('Unknown game mode.',400);return value==='motion'?'motion':'survival';};
async function read(db:D1Database,mode:GameMode){return db.prepare('SELECT revision,state FROM arena WHERE id=?').bind(arenaKey(mode)).first<{revision:number;state:string}>();}
export async function GET(request:Request){try{
  const {DB:db,IMMUNITY_ADMIN_PASSWORD_HASH:hash}=config(),mode=modeFrom(new URL(request.url).searchParams.get('mode'));
  const session=await adminSession(db,request,hash),row=await read(db,mode),a=row?upgradeArena(JSON.parse(row.state),Date.now()):createArena(Date.now(),mode);
  return json({configured:adminConfigured(hash),authenticated:!!session,expires:session?.expires??null,training:trainingSummary(a)});
}catch(error){return trainingFailure(error);}}
export async function POST(request:Request){try{
  requireSameOrigin(request);
  const {DB:db,IMMUNITY_ADMIN_PASSWORD_HASH:hash}=config();
  // Authenticate before reading a potentially large model. Login has a separate small body limit.
  const action=new URL(request.url).searchParams.get('action');
  if(action==='login'){
    const input=await boundedJson(request,2048),session=await loginAdmin(db,request,hash,input.password);
    return json({authenticated:true,expires:session.expires},200,{'Set-Cookie':sessionCookie(request,session.token)});
  }
  if(action==='logout'){
    await logoutAdmin(db,request,hash);return json({authenticated:false},200,{'Set-Cookie':sessionCookie(request,'',0)});
  }
  await requireAdmin(db,request,hash);
  const input=await boundedJson(request,MAX_IMPORT_BYTES+2048),mode=modeFrom(input.mode);
  if(!['preview','import','rollback','cancel'].includes(action||''))throw new AdminError('Unknown training action.',400);
  let artifact;
  if(action==='preview'||action==='import'){
    if(JSON.stringify(input.artifact??null).length>MAX_IMPORT_BYTES)throw new AdminError('The file is too large (maximum 512 KiB).',413);
    try{artifact=parseTrainingArtifact(input.artifact,mode);}catch(error){throw new AdminError(error instanceof Error?error.message:'Invalid model.',400);}
    if(action==='preview')return json({preview:{kind:artifact.kind,mode:artifact.mode,generation:artifact.generation,createdAt:artifact.createdAt,bots:artifact.genomes.length,fitness:artifact.kind==='champion'?artifact.genomes[0].fitness:null}});
  }
  const operationId=crypto.randomUUID();
  for(let attempt=0;attempt<5;attempt++){
    const row=await read(db,mode);if(!row)throw new AdminError('Enter this mode once before changing its training.',409);
    const a:Arena=upgradeArena(JSON.parse(row.state),Date.now());
    if(action==='cancel'){
      if(!a.training?.pending||a.training.pending.id!==input.pendingId)throw new AdminError('That queued change has already changed or completed. Refresh the training panel.',409);
      a.training.pending=null;
    }else{
      if(action==='rollback'){
        // Read backup before the world CAS. A concurrent boundary changes world revision,
        // forcing a retry so an outdated backup cannot silently become the queued restore.
        if(input.rollbackGeneration!==a.training?.rollbackGeneration)throw new AdminError('The backup has changed. Review it again before restoring.',409);
        artifact=await readCheckpoint(db,mode,'rollback');
        if(!artifact||a.training?.rollbackGeneration==null)throw new AdminError('No pre-import backup is available yet.',409);
      }
      try{queueTraining(a,artifact!,'rollback'===action?'rollback':'import',operationId,Date.now());}catch(error){throw new AdminError(error instanceof Error?error.message:'Cannot queue model.',409);}
    }
    const result=await db.prepare('UPDATE arena SET state=?,revision=revision+1 WHERE id=? AND revision=?').bind(JSON.stringify(a),arenaKey(mode),row.revision).run();
    if(result.meta.changes===1)return json({training:trainingSummary(a),message:action==='cancel'?'Queued change cancelled.':'Queued for the next generation boundary. Training waits for active players.'});
  }
  throw new AdminError('The arena is busy. Please retry.',503);
}catch(error){return trainingFailure(error);}finally{await discardRequestBody(request);}}
