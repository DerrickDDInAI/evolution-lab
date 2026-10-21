import {arenaKey,type GameMode} from './game-mode';
import type {TrainingWrite,TrainingArtifact} from './training-checkpoints';
export const checkpointKey=(mode:GameMode,slot:'latest'|'rollback')=>`${arenaKey(mode)}:training:${slot}`;
export function checkpointStatements(db:D1Database,mode:GameMode,writes:TrainingWrite[],commitId:string){
  return writes.map(({slot,artifact})=>db.prepare("INSERT INTO arena (id,revision,state) SELECT ?,0,? WHERE EXISTS (SELECT 1 FROM arena WHERE id=? AND json_extract(state,'$.commitId')=?) ON CONFLICT(id) DO UPDATE SET state=excluded.state,revision=arena.revision+1")
    .bind(checkpointKey(mode,slot),JSON.stringify(artifact),arenaKey(mode),commitId));
}
export async function readCheckpoint(db:D1Database,mode:GameMode,slot:'latest'|'rollback'){
  const row=await db.prepare('SELECT state FROM arena WHERE id=?').bind(checkpointKey(mode,slot)).first<{state:string}>();
  return row?JSON.parse(row.state) as TrainingArtifact:null;
}
