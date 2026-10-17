import { activate, breed, createGenome, random, type Evolution, type Genome } from './evolution';
import { SIZE, FIELD, MAX_MOVEMENT_CREDIT, clamp, inside, moveBody, movePlayer, type Motion, type Command, type Obstacle } from './physics';
import type {CollisionEvent} from './collision-effects';
export { SIZE, FIELD }; export type { Obstacle };
export const POPULATION=24, ROUND=45, MAX_PLAYERS=12;
export type Run={id:string;durationMs:number;generation:number;bot:number;diedAt:number};
export type Scores={bestMs:number;runs:Run[]};
export type Player=Motion & {id:string;token:string;profileId:string;name:string;lastSeen:number;tags:number;life:number;ack:number;moveAt:number;credit:number;runId:string|null;scores:Scores;lastDeath:Run|null};
export type Bot={id:number;x:number;y:number;vx:number;vy:number;fitness:number;tags:number;genome:Genome};
export type Arena={version:2;time:number;generation:number;elapsed:number;totalTags:number;species:number;players:Player[];bots:Bot[];obstacles:Obstacle[];history:{generation:number;fitness:number;tags:number}[];champion:Genome|null;evolution:Evolution;roundTags:number;collisions?:CollisionEvent[];commitId?:string};
export type FinishedRun=Run & {profileId:string};
function obstacles(e:Evolution):Obstacle[]{
  return Array.from({length:60},()=>({x:FIELD.min+180+random(e)*3240,y:FIELD.min+180+random(e)*3240,r:35+random(e)*60}))
    .filter(o=>Math.abs(o.x-3000)>180&&Math.abs(o.y-3000)>180);
}
export function createArena(now:number):Arena {
  const evolution={seed:42719,nextNode:13,splits:{}};
  const a:Arena={version:2,time:now,generation:1,elapsed:0,totalTags:0,species:1,players:[],bots:[],obstacles:obstacles(evolution),history:[],champion:null,evolution,roundTags:0,collisions:[]};
  a.bots=Array.from({length:POPULATION},(_,id)=>({id,x:0,y:0,vx:0,vy:0,fitness:0,tags:0,genome:createGenome(evolution)}));
  for(const b of a.bots)spawnBot(a,b);
  return a;
}
// Upgrade an existing live world without discarding its trained genomes or generation history.
export function upgradeArena(raw:any,now:number):Arena {
  raw.collisions??=[];
  if(raw.version===2)return raw;
  raw.version=2;raw.time=now;raw.obstacles=obstacles(raw.evolution);
  raw.players=raw.players.map((old:any)=>{
    const p={...old,profileId:'',phase:'safe',runStartedAt:null,respawnUntil:0,life:0,ack:0,moveAt:now,credit:.25,runId:null,scores:{bestMs:0,runs:[]},lastDeath:null};
    respawn(p,now,false);return p;
  });
  for(const b of raw.bots)spawnBot(raw,b);
  return raw;
}
function safe(a:Arena,x:number,y:number,r:number){return a.obstacles.every(o=>Math.hypot(o.x-x,o.y-y)>o.r+r+5);}
export function spawnBot(a:Arena,b:Bot) {
  const active=a.players.filter(p=>p.phase==='arena');const p=active[b.id%Math.max(active.length,1)]||{x:3000,y:3000};
  for(let i=0;i<40;i++){
    const angle=random(a.evolution)*Math.PI*2,d=260+random(a.evolution)*600;
    b.x=clamp(p.x+Math.cos(angle)*d,FIELD.min+70,FIELD.max-70);b.y=clamp(p.y+Math.sin(angle)*d,FIELD.min+70,FIELD.max-70);
    if(safe(a,b.x,b.y,13)&&active.every(p=>Math.hypot(p.x-b.x,p.y-b.y)>180))break;
  }
  b.vx=0;b.vy=0;
}
export function respawn(p:Player,now:number,dead=true) {
  // Return to the nearest door's outside staging area; first joins use the south door.
  const distances=[Math.abs(p.y-FIELD.min),Math.abs(p.x-FIELD.max),Math.abs(p.y-FIELD.max),Math.abs(p.x-FIELD.min)];
  const side=dead?distances.indexOf(Math.min(...distances)):2;
  const points=[[3000,1050],[4950,3000],[3000,4950],[1050,3000]];
  [p.x,p.y]=points[side];p.vx=0;p.vy=0;p.energy=1;p.phase='safe';p.runStartedAt=null;p.runId=null;p.respawnUntil=dead?now+1200:0;
  if(dead)p.life++;
}
export function join(a:Arena,id:string,token:string,name:string,now:number,profileId='',scores:Scores={bestMs:0,runs:[]}) {
  if(a.players.length>=MAX_PLAYERS)throw new Error('The arena is full (12 players). Try again shortly.');
  const p:Player={id,token,profileId,name,x:3000,y:4950,vx:0,vy:0,energy:1,phase:'safe',runStartedAt:null,respawnUntil:0,lastSeen:now,tags:0,life:0,ack:0,moveAt:now,credit:.25,runId:null,scores,lastDeath:null};
  // Slight spacing keeps new players distinguishable at the shared staging door.
  p.x+=a.players.filter(p=>p.phase==='safe').length%5*34-68;
  a.players.push(p);return p;
}
function kill(a:Arena,p:Player,b:Bot,now:number,finished:FinishedRun[]) {
  if(p.phase!=='arena'||p.runStartedAt===null)return;
  const contact={x:p.x,y:p.y,bx:b.x,by:b.y};
  const run:Run={id:p.runId||crypto.randomUUID(),durationMs:Math.max(0,Math.round(now-p.runStartedAt)),generation:a.generation,bot:b.id,diedAt:now};
  p.scores={bestMs:Math.max(p.scores.bestMs,run.durationMs),runs:[run,...p.scores.runs].slice(0,10)};p.lastDeath=run;p.tags++;
  if(p.profileId)finished.push({...run,profileId:p.profileId});
  b.fitness+=50;b.tags++;a.totalTags++;a.roundTags++;respawn(p,now);
  a.collisions=[...(a.collisions||[]).filter(e=>now-e.at<5000),{id:crypto.randomUUID(),playerId:p.id,bot:b.id,...contact,respawnX:p.x,respawnY:p.y,at:now}].slice(-24);
}
export function applyCommands(a:Arena,p:Player,commands:Command[],now:number,finished:FinishedRun[]) {
  p.credit=Math.min(MAX_MOVEMENT_CREDIT,p.credit+Math.max(0,(now-p.moveAt)/1000));p.moveAt=now;p.lastSeen=now;
  for(const c of commands){
    if(c.seq<=p.ack)continue;
    // Ack stale-life inputs as well so a delayed packet cannot walk a respawned player back into danger.
    p.ack=c.seq;
    if(c.life!==p.life||c.dt>p.credit+1e-7)continue;
    p.credit=Math.max(0,p.credit-c.dt);
    const wasSafe=p.phase==='safe';movePlayer(p,c,c.dt,a.obstacles,now);
    if(wasSafe&&p.phase==='arena')p.runId=crypto.randomUUID();
    if(p.phase==='arena'){
      const bot=a.bots.find(b=>Math.hypot(p.x-b.x,p.y-b.y)<=29);
      if(bot)kill(a,p,bot,now,finished);
    }
  }
  if(!commands.length){p.vx=0;p.vy=0;}
}
export function advance(a:Arena,now:number,finished:FinishedRun[]=[]) {
  a.players=a.players.filter(p=>now-p.lastSeen<15000);
  let remaining=Math.min(MAX_MOVEMENT_CREDIT,Math.max(0,(now-a.time)/1000));a.time=now;
  while(remaining>1e-7){const dt=Math.min(1/30,remaining);remaining-=dt;step(a,dt,now,finished);}
}
function step(a:Arena,dt:number,now:number,finished:FinishedRun[]) {
  const active=a.players.filter(p=>p.phase==='arena');
  if(!active.length){for(const b of a.bots){b.vx=0;b.vy=0;}return;}
  a.elapsed+=dt;
  for(const p of active)if(now-p.lastSeen>750){p.vx=0;p.vy=0;}
  for(const b of a.bots){
    const alive=active.filter(p=>p.phase==='arena');if(!alive.length)break;
    const target=alive.reduce((best,p)=>Math.hypot(p.x-b.x,p.y-b.y)<Math.hypot(best.x-b.x,best.y-b.y)?p:best,alive[0]);
    const dx=target.x-b.x,dy=target.y-b.y,dist=Math.hypot(dx,dy);
    const obstacle=a.obstacles.reduce((best,o)=>Math.hypot(o.x-b.x,o.y-b.y)-o.r<Math.hypot(best.x-b.x,best.y-b.y)-best.r?o:best,a.obstacles[0]);
    const od=Math.max(1,Math.hypot(obstacle.x-b.x,obstacle.y-b.y));
    const inputs=[clamp(dx/800,-1,1),clamp(dy/800,-1,1),target.vx/430,target.vy/430,b.vx/290,b.vy/290,(obstacle.x-b.x)/od,(obstacle.y-b.y)/od,clamp((od-obstacle.r)/300,0,1),dist/Math.max(dist,800),1];
    const [ox,oy]=activate(b.genome,inputs),length=Math.max(1,Math.hypot(ox,oy));b.vx=ox/length*290;b.vy=oy/length*290;
    const hit=moveBody(b,13,dt,a.obstacles),beforeX=b.x,beforeY=b.y;
    b.x=clamp(b.x,FIELD.min+25,FIELD.max-25);b.y=clamp(b.y,FIELD.min+25,FIELD.max-25);
    const after=Math.hypot(target.x-b.x,target.y-b.y);
    b.fitness+=(dist-after)*.04+dt*(1-after/SIZE)*.1-((hit||beforeX!==b.x||beforeY!==b.y)?dt*3:0);
    if(after<=29)kill(a,target,b,now,finished);
  }
  if(a.elapsed>=ROUND){
    for(const b of a.bots)b.genome.fitness=b.fitness;
    const result=breed(a.bots.map(b=>b.genome),a.evolution);
    a.history.push({generation:a.generation,fitness:result.best.fitness,tags:a.roundTags});a.history=a.history.slice(-40);
    a.champion=result.best;a.species=result.species;a.generation++;a.elapsed=0;a.roundTags=0;
    a.bots.forEach((b,i)=>{b.genome=result.genomes[i];b.fitness=0;b.tags=0;spawnBot(a,b);});
  }
}
export function snapshot(a:Arena,selfToken?:string) {
  const me=a.players.find(p=>p.token===selfToken);
  return {version:2,serverTime:Date.now(),field:FIELD,size:SIZE,population:POPULATION,round:ROUND,generation:a.generation,elapsed:a.elapsed,totalTags:a.totalTags,species:a.species,history:a.history,
    players:a.players.map(({token,profileId,scores,lastSeen,moveAt,credit,runId,lastDeath,...p})=>p),
    personal:me?{scores:me.scores,lastDeath:me.lastDeath}:null,
    collisions:(a.collisions||[]).filter(e=>Date.now()-e.at<5000),
    bots:a.bots.map(({genome,...b})=>({...b,nodes:genome.nodes.length+11,connections:genome.genes.filter(c=>c.enabled).length})),obstacles:a.obstacles,
    bestFitness:Math.max(0,...a.bots.map(b=>b.fitness)),championAvailable:!!a.champion};
}
