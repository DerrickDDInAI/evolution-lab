import {env} from 'cloudflare:workers';
import {AdminError,requireAdmin} from '../../../lib/admin-auth';
import {filmPrefix,listFilm} from '../../../lib/film-store';
import type {GameMode} from '../../../lib/game-mode';
import {trainingJson as json,trainingFailure} from '../../../lib/training-http';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{
  const {DB:db,IMMUNITY_ADMIN_PASSWORD_HASH:hash}=env as unknown as {DB:D1Database;IMMUNITY_ADMIN_PASSWORD_HASH?:string};
  await requireAdmin(db,request,hash);
  const url=new URL(request.url),requested=url.searchParams.get('mode');
  if(requested!==null&&requested!=='survival'&&requested!=='motion')throw new AdminError('Unknown game mode.',400);
  const mode:GameMode=requested==='motion'?'motion':'survival',id=url.searchParams.get('id'),before=url.searchParams.get('before');
  for(const key of [id,before])if(key!==null&&(!key.startsWith(filmPrefix(mode))||!/^\d{16}:\d{16}:\d{16}$/.test(key.slice(filmPrefix(mode).length))))throw new AdminError('Invalid highlight reference.',400);
  if(id){
    const row=await db.prepare('SELECT state FROM arena WHERE id=?').bind(id).first<{state:string}>();
    if(!row)throw new AdminError('This highlight is unavailable. Refresh the list.',404);
    return json(JSON.parse(row.state));
  }
  return json(await listFilm(db,mode,before||undefined));
}catch(error){return trainingFailure(error);}}
