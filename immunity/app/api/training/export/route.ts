import {env} from 'cloudflare:workers';
import {upgradeArena} from '../../../../lib/arena';
import {arenaKey,type GameMode} from '../../../../lib/game-mode';
import {AdminError,requireAdmin} from '../../../../lib/admin-auth';
import {readCheckpoint} from '../../../../lib/training-store';
import {checkpoint} from '../../../../lib/training-checkpoints';
import {trainingJson as json,trainingFailure} from '../../../../lib/training-http';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{
  const url=new URL(request.url),requested=url.searchParams.get('mode'),kind=url.searchParams.get('kind')||'champion';
  if(requested!==null&&requested!=='survival'&&requested!=='motion')throw new AdminError('Unknown game mode.',400);
  const mode:GameMode=requested==='motion'?'motion':'survival';
  if(!['champion','current','checkpoint','rollback'].includes(kind))throw new AdminError('Unknown export type.',400);
  const {DB:db,IMMUNITY_ADMIN_PASSWORD_HASH:hash}=env as unknown as {DB:D1Database;IMMUNITY_ADMIN_PASSWORD_HASH?:string};
  if(kind==='rollback')await requireAdmin(db,request,hash);
  let artifact;
  if(kind==='champion'||kind==='current'){
    const row=await db.prepare('SELECT state FROM arena WHERE id=?').bind(arenaKey(mode)).first<{state:string}>();
    if(!row)throw new AdminError('This mode has no saved population yet. Play it once before exporting.',409);
    const arena=upgradeArena(JSON.parse(row.state),Date.now());
    artifact=kind==='current'?checkpoint(arena,Date.now()):arena.bestModel;
    if(!artifact)throw new AdminError('The historical best model was not saved. A new record will make it available.',409);
  }else artifact=await readCheckpoint(db,mode,kind==='rollback'?'rollback':'latest');
  if(!artifact)throw new AdminError('No checkpoint is available yet. Complete a generation first.',409);
  return json(artifact,200,{'Content-Disposition':`attachment; filename="immunity-${mode}-${kind}-gen-${artifact.generation}.json"`});
}catch(error){return trainingFailure(error);}}
