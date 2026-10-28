import {arenaKey,type GameMode} from './game-mode';
import {filmSummary,type FilmClip} from './behavior-film';
export const filmPrefix=(mode:GameMode)=>`${arenaKey(mode)}:film:v1:`;
export const filmKey=(clip:FilmClip)=>filmPrefix(clip.mode)+[clip.createdAt,clip.branch,clip.generation].map(n=>String(n).padStart(16,'0')).join(':');
export function filmStatements(db:D1Database,mode:GameMode,clips:FilmClip[],commitId:string){
  return clips.map(clip=>db.prepare("INSERT OR IGNORE INTO arena (id,revision,state) SELECT ?,0,? WHERE EXISTS (SELECT 1 FROM arena WHERE id=? AND json_extract(state,'$.commitId')=?)")
    .bind(filmKey(clip),JSON.stringify(clip),arenaKey(mode),commitId));
}
export async function listFilm(db:D1Database,mode:GameMode,before?:string){
  const prefix=filmPrefix(mode);
  const rows=await db.prepare('SELECT id,state FROM arena WHERE id>=? AND id<? ORDER BY id DESC LIMIT 51').bind(prefix,before||prefix+'~').all<{id:string;state:string}>();
  const visible=rows.results.slice(0,50);
  return {clips:visible.map(row=>filmSummary(row.id,JSON.parse(row.state))),before:rows.results.length>50?visible.at(-1)!.id:null};
}
