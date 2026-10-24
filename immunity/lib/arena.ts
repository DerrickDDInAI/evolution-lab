import {MOTION_CONTROLLER,observePlayers,motionDecision,type MotionHistory} from './motion-observation';
import {emptyTraining,recoverBestModel,rememberBestModel,trainingBoundary,trainingSummary,type TrainingArtifact,type TrainingState,type TrainingWrite} from './training-checkpoints';
import {RESOURCE,MOTION_THRESHOLD,atExit,type GameMode} from './game-mode';
import { activate, breed, createGenome, random, type Evolution, type Genome } from './evolution';
import { SIZE, FIELD, MAX_MOVEMENT_CREDIT, clamp, inside, moveBody, moveActor, movePlayer, type Motion, type Command, type Obstacle } from './physics';
import {matchesContact,type ContactFrame,type ContactReport,type ContactReply} from './contact-report';
import type {CollisionEvent} from './collision-effects';
import {bestCompletedGeneration,emptyDetection,recordDetection,type DetectionCounts,type TrainingSample} from './training-metrics';
export { SIZE, FIELD }; export type { Obstacle };
export const POPULATION=24, ROUND=45, MAX_PLAYERS=12, SPAWN_WARMUP=3;
export type Run={id:string;durationMs:number;generation:number;bot:number;diedAt:number};
export type Scores={bestMs:number;runs:Run[]};
export type Player=Motion & {id:string;token:string;profileId:string;name:string;lastSeen:number;tags:number;life:number;ack:number;moveAt:number;credit:number;runId:string|null;scores:Scores;lastDeath:Run|null;carrying?:boolean;contactMode?:'visible-v1';contactFrames?:ContactFrame[]};
export type Bot={id:number;x:number;y:number;vx:number;vy:number;fitness:number;tags:number;genome:Genome;homeX?:number;homeY?:number;spawnWait?:number};
export type Arena={version:2;mode?:GameMode;time:number;generation:number;elapsed:number;totalTags:number;species:number;players:Player[];bots:Bot[];obstacles:Obstacle[];history:TrainingSample[];bestGeneration?:TrainingSample|null;champion:Genome|null;evolution:Evolution;roundTags:number;collisions?:CollisionEvent[];commitId?:string;bestModel?:TrainingArtifact;training?:TrainingState;motionController?:string;motionHistory?:MotionHistory;detection?:DetectionCounts};
export type FinishedRun=Run & {profileId:string};
function obstacles(e:Evolution):Obstacle[]{
  return Array.from({length:60},()=>({x:FIELD.min+180+random(e)*3240,y:FIELD.min+180+random(e)*3240,r:35+random(e)*60}))
    .filter(o=>Math.abs(o.x-3000)>180&&Math.abs(o.y-3000)>180);
}
export function createArena(now:number,mode:GameMode='survival'):Arena {
  const evolution={seed:42719,nextNode:mode==='motion'?14:13,splits:{}};
  const a:Arena={version:2,mode,time:now,generation:1,elapsed:0,totalTags:0,species:1,players:[],bots:[],obstacles:obstacles(evolution),history:[],bestGeneration:null,champion:null,evolution,roundTags:0,collisions:[]};
  if(mode==='motion'){a.motionController=MOTION_CONTROLLER;a.motionHistory={};a.detection=emptyDetection();}
  a.bots=Array.from({length:POPULATION},(_,id)=>({id,x:0,y:0,vx:0,vy:0,fitness:0,tags:0,genome:createGenome(evolution,mode==='motion'?3:2)}));
  for(const b of a.bots)spawnBot(a,b);
  return a;
}
// Upgrade an existing live world without discarding its trained genomes or generation history.
export function upgradeArena(raw:any,now:number):Arena {
  // One-time user-authorized reset. Keep player lives, cargo, scores, terrain and
  // Survival intact; invalidate issued frames from the replaced bot population.
  if(raw.mode==='motion'&&raw.motionController!==MOTION_CONTROLLER){
    const fresh=createArena(now,'motion');
    Object.assign(raw,{motionController:MOTION_CONTROLLER,motionHistory:{},detection:emptyDetection(),time:now,generation:1,elapsed:0,totalTags:0,species:1,bots:fresh.bots,evolution:fresh.evolution,history:[],bestGeneration:null,champion:null,roundTags:0,collisions:[],training:emptyTraining()});
    delete raw.bestModel;
    for(const p of raw.players)p.contactFrames=[];
  }
  if(raw.mode==='motion')raw.detection??=emptyDetection(raw.elapsed>0);
  raw.collisions??=[];
  raw.training??=emptyTraining();
  raw.bestGeneration=bestCompletedGeneration(raw.history||[],raw.bestGeneration??null);
  recoverBestModel(raw);
  for(const b of raw.bots)ensureHome(raw,b);
  if(raw.version===2)return raw;
  raw.version=2;raw.time=now;raw.obstacles=obstacles(raw.evolution);
  raw.players=raw.players.map((old:any)=>{
    const p={...old,profileId:'',phase:'safe',runStartedAt:null,respawnUntil:0,life:0,ack:0,moveAt:now,credit:.25,runId:null,scores:{bestMs:0,runs:[]},lastDeath:null};
    respawn(p,now,false);return p;
  });
  for(const b of raw.bots)spawnBot(raw,b);
  return raw;
}
function ensureHome(a:Arena,b:Bot){
  if(Number.isFinite(b.homeX)&&Number.isFinite(b.homeY))return;
  // The central clearing is free of generated obstacles. Stable bot IDs retain
  // these homes across breeding, reconnects and upgrades of the live world.
  const angle=b.id/POPULATION*Math.PI*2;
  const home={x:FIELD.middle+Math.cos(angle)*140,y:FIELD.middle+Math.sin(angle)*140,vx:0,vy:0};
  moveBody(home,13,0,a.obstacles);b.homeX=home.x;b.homeY=home.y;
}
export function spawnBot(a:Arena,b:Bot) {
  ensureHome(a,b);b.x=b.homeX!;b.y=b.homeY!;b.vx=0;b.vy=0;b.spawnWait=SPAWN_WARMUP;
}
export const botReady=(b:Pick<Bot,'spawnWait'>)=>(b.spawnWait??0)<=0;
export function respawn(p:Player,now:number,dead=true) {
  // Return to the nearest door's outside staging area; first joins use the south door.
  const distances=[Math.abs(p.y-FIELD.min),Math.abs(p.x-FIELD.max),Math.abs(p.y-FIELD.max),Math.abs(p.x-FIELD.min)];
  const side=dead?distances.indexOf(Math.min(...distances)):2;
  const points=[[3000,1050],[4950,3000],[3000,4950],[1050,3000]];
  p.carrying=false;[p.x,p.y]=points[side];p.vx=0;p.vy=0;p.energy=1;p.phase='safe';p.runStartedAt=null;p.runId=null;p.respawnUntil=dead?now+1200:0;
  if(dead)p.life++;
}
export function join(a:Arena,id:string,token:string,name:string,now:number,profileId='',scores:Scores={bestMs:0,runs:[]}) {
  if(a.players.length>=MAX_PLAYERS)throw new Error('The arena is full (12 players). Try again shortly.');
  const p:Player={id,token,profileId,name,x:3000,y:4950,vx:0,vy:0,energy:1,phase:'safe',runStartedAt:null,respawnUntil:0,lastSeen:now,tags:0,life:0,ack:0,moveAt:now,credit:.25,runId:null,scores,lastDeath:null};
  // Slight spacing keeps new players distinguishable at the shared staging door.
  p.x+=a.players.filter(p=>p.phase==='safe').length%5*34-68;
  a.players.push(p);return p;
}
function kill(a:Arena,p:Player,b:Bot,now:number,finished:FinishedRun[],observed?:{generation:number;x:number;y:number;bx:number;by:number;at?:number;moving?:boolean}) {
  if(p.phase!=='arena'||p.runStartedAt===null)return;
  // HTTP snapshots and local prediction are different timelines. A current
  // server overlap is not evidence that this player has seen a collision.
  // Modern clients commit only a validated contact against an issued frame.
  if(p.contactMode==='visible-v1'&&!observed)return;
  const contact={life:p.life,x:observed?.x??p.x,y:observed?.y??p.y,bx:observed?.bx??b.x,by:observed?.by??b.y};
  const endedAt=observed?.at??now;
  const run:Run={id:p.runId||crypto.randomUUID(),durationMs:Math.max(0,Math.round(endedAt-p.runStartedAt)),generation:observed?.generation??a.generation,bot:b.id,diedAt:endedAt};
  p.scores={bestMs:a.mode==='motion'?p.scores.bestMs:Math.max(p.scores.bestMs,run.durationMs),runs:[run,...p.scores.runs].slice(0,10)};p.lastDeath=run;p.tags++;
  if(p.profileId)finished.push({...run,profileId:p.profileId});
  if(!observed||observed.generation===a.generation){
    const rewarded=a.mode!=='motion'||(observed?.moving??Math.hypot(p.vx,p.vy)>MOTION_THRESHOLD);
    b.fitness+=rewarded?50:-25;
    if(rewarded){b.tags++;a.roundTags++;}
  }
  a.totalTags++;respawn(p,now);
  a.collisions=[...(a.collisions||[]).filter(e=>now-e.at<5000),{id:crypto.randomUUID(),playerId:p.id,bot:b.id,...contact,respawnX:p.x,respawnY:p.y,at:now}].slice(-24);
}
// Keep a bounded, private history of frames issued to each player for contact validation.
export function rememberContactFrame(a:Arena,p:Player,now:number){
  const frame:ContactFrame={id:crypto.randomUUID(),at:now,life:p.life,generation:a.generation,moving:Math.hypot(p.vx,p.vy)>MOTION_THRESHOLD,bots:a.bots.filter(botReady).map(({id,x,y,vx,vy})=>({id,x,y,vx,vy}))};
  p.contactFrames=[...(p.contactFrames||[]).filter(f=>now-f.at<8000),frame].slice(-8);
  return frame.id;
}
export function confirmContact(a:Arena,p:Player,r:ContactReport,now:number,finished:FinishedRun[]):ContactReply {
  const reply=(status:ContactReply['status']):ContactReply=>({life:r.life,seq:r.seq,status});
  if(p.life>r.life)return reply('confirmed'); // Retry after a lost response: never kill twice.
  if(p.life!==r.life)return reply('rejected');
  if(p.ack<r.seq)return reply('pending'); // A long movement queue can span packets.
  const frame=p.contactFrames?.find(f=>f.id===r.frameId),bot=a.bots.find(b=>b.id===r.bot);
  if(p.phase!=='arena'||p.runStartedAt===null||!frame||!bot||!matchesContact(frame,r,p,now,a.obstacles))return reply('rejected');
  kill(a,p,bot,now,finished,{moving:frame.moving,generation:frame.generation,x:r.x,y:r.y,bx:r.bx,by:r.by,at:Math.max(p.runStartedAt,Math.min(now,frame.at+r.age*1000))});
  return reply('confirmed');
}
// Collection and extraction are authoritative and belong to this player’s life.
export function missionProgress(a:Arena,p:Player,now:number,finished:FinishedRun[],allowExtraction=true){
  if(a.mode!=='motion'||p.phase!=='arena'||p.runStartedAt===null)return;
  if(!p.carrying&&Math.hypot(p.x-RESOURCE.x,p.y-RESOURCE.y)<=RESOURCE.radius)p.carrying=true;
  if(!allowExtraction||!p.carrying||!atExit(p))return;
  const run:Run={id:p.runId||crypto.randomUUID(),durationMs:Math.max(0,Math.round(now-p.runStartedAt)),generation:a.generation,bot:-1,diedAt:now};
  p.scores={bestMs:p.scores.bestMs?Math.min(p.scores.bestMs,run.durationMs):run.durationMs,runs:[run,...p.scores.runs].slice(0,10)};
  p.lastDeath=run;if(p.profileId)finished.push({...run,profileId:p.profileId});
  respawn(p,now); // Increment life: delayed movement/contact cannot affect the next mission.
}
export function applyCommands(a:Arena,p:Player,commands:Command[],now:number,finished:FinishedRun[],allowExtraction=true) {
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
      const bot=a.bots.find(b=>botReady(b)&&Math.hypot(p.x-b.x,p.y-b.y)<=29);
      if(bot)kill(a,p,bot,now,finished);
      missionProgress(a,p,now,finished,allowExtraction);
    }
  }
  if(!commands.length){p.vx=0;p.vy=0;}
}
export function advance(a:Arena,now:number,finished:FinishedRun[]=[],trainingWrites:TrainingWrite[]=[]) {
  a.players=a.players.filter(p=>now-p.lastSeen<15000);
  let remaining=Math.min(MAX_MOVEMENT_CREDIT,Math.max(0,(now-a.time)/1000));a.time=now;
  while(remaining>1e-7){const dt=Math.min(1/30,remaining);remaining-=dt;step(a,dt,now,finished,trainingWrites);}
}
function step(a:Arena,dt:number,now:number,finished:FinishedRun[],trainingWrites:TrainingWrite[]) {
  const active=a.players.filter(p=>p.phase==='arena');
  if(!active.length){for(const b of a.bots){b.vx=0;b.vy=0;}return;}
  a.elapsed+=dt;
  for(const p of active)if(now-p.lastSeen>750){p.vx=0;p.vy=0;}
  if(a.mode==='motion')observePlayers(a.motionHistory??={},active,a.elapsed);
  for(const b of a.bots){
    const alive=active.filter(p=>p.phase==='arena');if(!alive.length)break;
    if(!botReady(b)){
      b.vx=0;b.vy=0;b.spawnWait=Math.max(.001,(b.spawnWait??SPAWN_WARMUP)-dt);
      // Stay harmless and stationary if a player occupies this starting area,
      // even after the warm-up expires. Never activate underneath a runner.
      if(b.spawnWait<=.001&&alive.every(p=>Math.hypot(p.x-b.x,p.y-b.y)>120))b.spawnWait=0;
      continue;
    }
    const obstacle=a.obstacles.length?a.obstacles.reduce((best,o)=>Math.hypot(o.x-b.x,o.y-b.y)-o.r<Math.hypot(best.x-b.x,best.y-b.y)-best.r?o:best,a.obstacles[0]):{x:b.x+1000,y:b.y,r:0};
    const od=Math.max(1,Math.hypot(obstacle.x-b.x,obstacle.y-b.y));
    if(a.mode==='motion'){
      const decision=motionDecision(b,alive,a.motionHistory!,a.elapsed,obstacle);
      // Ground-truth speed is used ONLY by the fitness evaluator, never by the
      // sensor/controller. Per-candidate classification feedback supplies selection
      // pressure even for bots that initially choose rest on every observation.
      for(const c of decision.candidates)if(c.complete){
        const moving=Math.hypot(c.player.vx,c.player.vy)>MOTION_THRESHOLD;
        recordDetection(a.detection??=emptyDetection(true),moving,c.attention);
        const label=moving?1:-1;
        b.fitness+=dt*2*(1-(c.attention-label)**2)/decision.candidates.length;
      }
      const chosen=decision.selected;
      const length=chosen?Math.max(1,Math.hypot(chosen.x,chosen.y)):1;
      b.vx=chosen?chosen.x/length*290:0;b.vy=chosen?chosen.y/length*290:0;
      const before=chosen?Math.hypot(chosen.player.x-b.x,chosen.player.y-b.y):0;
      const hit=moveActor(b,13,dt,a.obstacles),speed=Math.hypot(b.vx,b.vy)/290;
      b.fitness-=dt*(speed*.1+(hit?3:0));
      if(chosen){
        const after=Math.hypot(chosen.player.x-b.x,chosen.player.y-b.y);
        if(Math.hypot(chosen.player.vx,chosen.player.vy)>MOTION_THRESHOLD)b.fitness+=(before-after)*.04+dt*(1-after/SIZE)*.1;
        else b.fitness-=dt*4*(.5+speed);
      }
      for(const p of alive)if(Math.hypot(p.x-b.x,p.y-b.y)<=29)kill(a,p,b,now,finished);
      continue;
    }
    const target=alive.reduce((best,p)=>Math.hypot(p.x-b.x,p.y-b.y)<Math.hypot(best.x-b.x,best.y-b.y)?p:best,alive[0]);
    const dx=target.x-b.x,dy=target.y-b.y,dist=Math.hypot(dx,dy);
    const inputs=[clamp(dx/800,-1,1),clamp(dy/800,-1,1),target.vx/430,target.vy/430,b.vx/290,b.vy/290,(obstacle.x-b.x)/od,(obstacle.y-b.y)/od,clamp((od-obstacle.r)/300,0,1),dist/Math.max(dist,800),1];
    const [ox,oy]=activate(b.genome,inputs),length=Math.max(1,Math.hypot(ox,oy));b.vx=ox/length*290;b.vy=oy/length*290;
    const hit=moveActor(b,13,dt,a.obstacles);
    const after=Math.hypot(target.x-b.x,target.y-b.y);
    b.fitness+=(dist-after)*.04+dt*(1-after/SIZE)*.1-(hit?dt*3:0);
    if(after<=29)kill(a,target,b,now,finished);
  }
  if(!a.players.some(p=>p.phase==='arena'))for(const b of a.bots){b.vx=0;b.vy=0;}
  if(a.elapsed>=ROUND){
    for(const b of a.bots)b.genome.fitness=b.fitness;
    const result=breed(a.bots.map(b=>b.genome),a.evolution);
    a.history.push({branch:a.training?.branch||1,generation:a.generation,fitness:result.best.fitness,meanFitness:a.bots.reduce((sum,b)=>sum+b.fitness,0)/a.bots.length,tags:a.roundTags,...(a.mode==='motion'&&a.detection?{detection:{...a.detection}}:{})});
    a.bestGeneration=bestCompletedGeneration(a.history,a.bestGeneration??null);a.history=a.history.slice(-40);
    rememberBestModel(a,result.best,now);
    a.champion=result.best;a.species=result.species;a.generation++;a.elapsed=0;a.roundTags=0;
    a.bots.forEach((b,i)=>{b.genome=result.genomes[i];b.fitness=0;b.tags=0;});
    trainingBoundary(a,now,trainingWrites);
    if(a.mode==='motion'){a.motionHistory={};a.detection=emptyDetection();}
    for(const b of a.bots)spawnBot(a,b);
  }
}
export function snapshot(a:Arena,selfToken?:string) {
  const me=a.players.find(p=>p.token===selfToken);
  return {...(a.mode==='motion'?{detection:a.detection??null}:{}),version:2,controller:a.mode==='motion'?MOTION_CONTROLLER:'pursuit-v1',mode:a.mode||'survival',resource:a.mode==='motion'?RESOURCE:null,serverTime:Date.now(),simulationTime:a.time,field:FIELD,size:SIZE,population:POPULATION,round:ROUND,generation:a.generation,elapsed:a.elapsed,totalTags:a.totalTags,species:a.species,history:a.history,bestGeneration:bestCompletedGeneration(a.history,a.bestGeneration??null),
    players:a.players.map(({token,profileId,scores,lastSeen,moveAt,credit,runId,lastDeath,contactMode,contactFrames,...p})=>p),
    personal:me?{scores:me.scores,lastDeath:me.lastDeath,contactFrame:me.contactFrames?.at(-1)?.id}:null,
    collisions:(a.collisions||[]).filter(e=>Date.now()-e.at<5000),
    bots:a.bots.map(({genome,...b})=>({...b,nodes:genome.nodes.length+11,connections:genome.genes.filter(c=>c.enabled).length})),obstacles:a.obstacles,
    bestFitness:Math.max(0,...a.bots.map(b=>b.fitness)),training:trainingSummary(a),championAvailable:!!a.champion};
}
