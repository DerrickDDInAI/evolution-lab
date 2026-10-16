import {activate,breed,createGenome,random,type Evolution,type Genome} from './evolution';
export const SIZE=6000, POPULATION=24, ROUND=45, MAX_PLAYERS=12;
export type Player={id:string;token:string;name:string;x:number;y:number;vx:number;vy:number;ix:number;iy:number;dash:boolean;energy:number;lastSeen:number;tags:number;invulnerable:number};
export type Bot={id:number;x:number;y:number;vx:number;vy:number;fitness:number;tags:number;genome:Genome;trail?:number[]};
export type Obstacle={x:number;y:number;r:number};
export type Arena={version:1;time:number;generation:number;elapsed:number;totalTags:number;species:number;players:Player[];bots:Bot[];obstacles:Obstacle[];history:{generation:number;fitness:number;tags:number}[];champion:Genome|null;evolution:Evolution;roundTags:number};
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export function createArena(now:number):Arena {
  const evolution={seed:42719,nextNode:13,splits:{}};
  const obstacles=Array.from({length:65},()=>({x:200+random(evolution)*5600,y:200+random(evolution)*5600,r:35+random(evolution)*65})).filter(o=>Math.hypot(o.x-3000,o.y-3000)>200);
  const a:Arena={version:1,time:now,generation:1,elapsed:0,totalTags:0,species:1,players:[],bots:[],obstacles,history:[],champion:null,evolution,roundTags:0};
  a.bots=Array.from({length:POPULATION},(_,id)=>({id,x:0,y:0,vx:0,vy:0,fitness:0,tags:0,genome:createGenome(evolution)}));
  for(const b of a.bots)spawnBot(a,b);
  return a;
}
function safe(a:Arena,x:number,y:number,r:number){return a.obstacles.every(o=>Math.hypot(o.x-x,o.y-y)>o.r+r+5);}
export function spawnBot(a:Arena,b:Bot) {
  const p=a.players[b.id%Math.max(a.players.length,1)]||{x:3000,y:3000};
  for(let i=0;i<30;i++) {const angle=random(a.evolution)*Math.PI*2,d=220+random(a.evolution)*650;b.x=clamp(p.x+Math.cos(angle)*d,30,SIZE-30);b.y=clamp(p.y+Math.sin(angle)*d,30,SIZE-30);if(safe(a,b.x,b.y,13))break;}
  b.vx=0;b.vy=0;
}
export function join(a:Arena,id:string,token:string,name:string,now:number){
  if(a.players.length>=MAX_PLAYERS)throw new Error('The arena is full (12 players). Try again shortly.');
  const anchor=a.players[0]||{x:3000,y:3000};let x=anchor.x,y=anchor.y;
  for(let i=0;i<30;i++){x=clamp(anchor.x+(random(a.evolution)-.5)*350,30,SIZE-30);y=clamp(anchor.y+(random(a.evolution)-.5)*350,30,SIZE-30);if(safe(a,x,y,16))break;}
  a.players.push({id,token,name,x,y,vx:0,vy:0,ix:0,iy:0,dash:false,energy:1,lastSeen:now,tags:0,invulnerable:2});
  if(a.players.length===1)for(const b of a.bots)spawnBot(a,b);
}
function move(a:Arena,p:{x:number;y:number;vx:number;vy:number},radius:number,dt:number){
  p.x=clamp(p.x+p.vx*dt,radius,SIZE-radius);p.y=clamp(p.y+p.vy*dt,radius,SIZE-radius);let hit=false;
  for(const o of a.obstacles){const dx=p.x-o.x,dy=p.y-o.y,d=Math.hypot(dx,dy),r=o.r+radius;if(d<r){const nx=d?dx/d:1,ny=d?dy/d:0;p.x=o.x+nx*r;p.y=o.y+ny*r;hit=true;}}
  return hit;
}
export function advance(a:Arena,now:number){
  a.players=a.players.filter(p=>now-p.lastSeen<15000);
  // Do not grant training time for periods without humans or while nobody polls.
  let remaining=Math.min(.25,Math.max(0,(now-a.time)/1000));a.time=now;
  if(!a.players.length)return;
  while(remaining>1e-7){const dt=Math.min(1/30,remaining);remaining-=dt;step(a,dt,now);}
}
function step(a:Arena,dt:number,now:number){
  a.elapsed+=dt;
  for(const p of a.players){
    const active=now-p.lastSeen<750,len=Math.hypot(p.ix,p.iy)||1,boost=active&&p.dash&&p.energy>.08;
    p.energy=clamp(p.energy+(boost?-.65:.22)*dt,0,1);p.vx=active?p.ix/Math.max(1,len)*(boost?430:255):0;p.vy=active?p.iy/Math.max(1,len)*(boost?430:255):0;
    move(a,p,16,dt);p.invulnerable=Math.max(0,p.invulnerable-dt);
  }
  for(const b of a.bots){
    const target=a.players.reduce((best,p)=>Math.hypot(p.x-b.x,p.y-b.y)<Math.hypot(best.x-b.x,best.y-b.y)?p:best,a.players[0]);
    const dx=target.x-b.x,dy=target.y-b.y,dist=Math.hypot(dx,dy);
    const obstacle=a.obstacles.reduce((best,o)=>Math.hypot(o.x-b.x,o.y-b.y)-o.r<Math.hypot(best.x-b.x,best.y-b.y)-best.r?o:best,a.obstacles[0]);
    const od=Math.max(1,Math.hypot(obstacle.x-b.x,obstacle.y-b.y));
    const inputs=[clamp(dx/800,-1,1),clamp(dy/800,-1,1),target.vx/430,target.vy/430,b.vx/290,b.vy/290,(obstacle.x-b.x)/od,(obstacle.y-b.y)/od,clamp((od-obstacle.r)/300,0,1),dist/Math.max(dist,800),1];
    const [ox,oy]=activate(b.genome,inputs);const length=Math.max(1,Math.hypot(ox,oy));b.vx=ox/length*290;b.vy=oy/length*290;
    const hit=move(a,b,13,dt),after=Math.hypot(target.x-b.x,target.y-b.y);
    // Measure only distance closed by the bot, after player movement has occurred.
    b.fitness+=(dist-after)*.04 + dt*(1-after/SIZE)*.1-(hit?dt*3:0);
    if(after<29 && target.invulnerable<=0){b.fitness+=50;b.tags++;a.totalTags++;a.roundTags++;target.tags++;target.invulnerable=1.2;spawnBot(a,b);}
  }
  if(a.elapsed>=ROUND){
    for(const b of a.bots)b.genome.fitness=b.fitness;
    const result=breed(a.bots.map(b=>b.genome),a.evolution);
    a.history.push({generation:a.generation,fitness:result.best.fitness,tags:a.roundTags});a.history=a.history.slice(-40);
    a.champion=result.best;a.species=result.species;a.generation++;a.elapsed=0;a.roundTags=0;
    a.bots.forEach((b,i)=>{b.genome=result.genomes[i];b.fitness=0;b.tags=0;spawnBot(a,b);});
  }
}
export function snapshot(a:Arena){
  return {size:SIZE,population:POPULATION,round:ROUND,generation:a.generation,elapsed:a.elapsed,totalTags:a.totalTags,species:a.species,history:a.history,
    players:a.players.map(({token,ix,iy,dash,lastSeen,...p})=>p),
    bots:a.bots.map(({genome,...b})=>({...b,nodes:genome.nodes.length+11,connections:genome.genes.filter(c=>c.enabled).length})),obstacles:a.obstacles,
    bestFitness:Math.max(0,...a.bots.map(b=>b.fitness)),championAvailable:!!a.champion};
}
