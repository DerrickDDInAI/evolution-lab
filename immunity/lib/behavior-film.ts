import type {Arena,Player,Bot} from './arena';
import type {GameMode} from './game-mode';
import type {Obstacle} from './physics';

export const FILM_INTERVAL=.2,FILM_SECONDS=10,FILM_MAX_FRAMES=52;
// Positions only. Slot numbers are local to one generation and one survivor life.
export type FilmActor=[slot:number,x:number,y:number];
export type FilmBot=[id:number,x:number,y:number,warming:number];
export type FilmFrame={t:number;players:FilmActor[];bots:FilmBot[];focus:number;interest:number;capture?:{survivor:number;bot:number}};
export type FilmCapture={generation:number;branch:number;startedAt:number;partial:boolean;slots:Record<string,number>;nextSlot:number;ring:FilmFrame[];best:FilmFrame[];score:number};
export type FilmClip={format:'immunity-live-highlight-v1';mode:GameMode;controller:string;generation:number;branch:number;createdAt:number;partial:boolean;obstacles:Obstacle[];frames:FilmFrame[]};
export type FilmSummary={id:string;generation:number;branch:number;createdAt:number;duration:number;captures:number;partial:boolean};

const round=(n:number)=>Math.round(n);
function captureState(a:Arena,now:number){
  const branch=a.training?.branch||1;
  if(!a.film||a.film.generation!==a.generation||a.film.branch!==branch){
    a.film={generation:a.generation,branch,startedAt:now,partial:a.elapsed>.25,slots:{},nextSlot:1,ring:[],best:[],score:-1};
  }
  return a.film;
}
/** Called after simulation / authoritative input, and immediately before confirmed captures. */
export function recordFilm(a:Arena,now:number,contact?:{player:Player;bot:Bot;x:number;y:number;bx:number;by:number}){
  const active=a.players.filter(p=>p.phase==='arena');
  if(!active.length&&!contact)return;
  const c=captureState(a,now),t=round(a.elapsed*1000),last=c.ring.at(-1);
  if(!contact&&last&&t-last.t<FILM_INTERVAL*1000)return;
  // Discard stale private lookup keys. Archived frames contain only numeric slots.
  const slots:Record<string,number>={};
  for(const p of active){const key=p.id+':'+p.life;slots[key]=c.slots[key]??c.nextSlot++;}
  c.slots=slots;
  const players:FilmActor[]=active.map(p=>[slots[p.id+':'+p.life],round(p===contact?.player?contact.x:p.x),round(p===contact?.player?contact.y:p.y)]);
  const bots:FilmBot[]=a.bots.map(b=>[b.id,round(b===contact?.bot?contact.bx:b.x),round(b===contact?.bot?contact.by:b.y),(b.spawnWait??0)>0?1:0]);
  let focus=players[0]?.[0]??0,interest=.1,bestGap=Infinity;
  for(let i=0;i<players.length;i++){
    const [,x,y]=players[i],p=active[i],moving=Math.hypot(p.vx,p.vy)>8;
    const gap=Math.min(...bots.filter(b=>!b[3]).map(b=>Math.hypot(x-b[1],y-b[2])));
    const value=(moving?2:0)+Math.max(0,1-gap/1000)*3;
    if(value>interest||(value===interest&&gap<bestGap)){interest=value;focus=players[i][0];bestGap=gap;}
  }
  const event=contact?{survivor:slots[contact.player.id+':'+contact.player.life],bot:contact.bot.id}:undefined;
  if(event){interest+=1000;focus=event.survivor;}
  const frame:FilmFrame={t,players,bots,focus,interest,...(event?{capture:event}:{})};
  // A contact at the same simulation instant replaces that sample, never creates a zero-time interval.
  if(last?.t===t)c.ring[c.ring.length-1]=frame;else c.ring.push(frame);
  c.ring=c.ring.filter(f=>t-f.t<=FILM_SECONDS*1000).slice(-FILM_MAX_FRAMES);
  const score=c.ring.reduce((sum,f)=>sum+f.interest,0);
  if(score>=c.score){c.best=structuredClone(c.ring);c.score=score;}
}
export function finishFilm(a:Arena,now:number,writes:FilmClip[]){
  const c=a.film;
  if(c&&c.generation===a.generation&&c.branch===(a.training?.branch||1)&&c.best.length>1){
    writes.push({format:'immunity-live-highlight-v1',mode:a.mode||'survival',controller:a.mode==='motion'?a.motionController||'unknown':'pursuit-v1',generation:c.generation,branch:c.branch,createdAt:c.startedAt,partial:c.partial,obstacles:structuredClone(a.obstacles),frames:structuredClone(c.best)});
  }
  delete a.film;
}
export function filmSummary(id:string,clip:FilmClip):FilmSummary{
  return {id,generation:clip.generation,branch:clip.branch,createdAt:clip.createdAt,duration:((clip.frames.at(-1)?.t??0)-(clip.frames[0]?.t??0))/1000,captures:clip.frames.filter(f=>f.capture).length,partial:clip.partial};
}
export function orderedFilm<T extends {generation:number;createdAt:number}>(clips:T[]){
  return [...clips].sort((a,b)=>a.createdAt-b.createdAt||a.generation-b.generation);
}
/** Interpolate only continuously observed actors. Never bridge a death or a long observation gap. */
export function filmFrame(clip:FilmClip,seconds:number):FilmFrame{
  const at=clip.frames[0].t+Math.max(0,seconds)*1000;
  let index=0;while(index<clip.frames.length-1&&clip.frames[index+1].t<=at)index++;
  const a=clip.frames[index],b=clip.frames[index+1];
  if(!b||b.t-a.t>600)return a;
  const mix=Math.max(0,Math.min(1,(at-a.t)/(b.t-a.t)));
  return {...a,players:a.players.map(p=>{const q=b.players.find(v=>v[0]===p[0]);return q?[p[0],p[1]+(q[1]-p[1])*mix,p[2]+(q[2]-p[2])*mix]:p;}),bots:a.bots.map(p=>{const q=b.bots.find(v=>v[0]===p[0]);return q&&p[3]===q[3]?[p[0],p[1]+(q[1]-p[1])*mix,p[2]+(q[2]-p[2])*mix,p[3]]:p;})};
}
