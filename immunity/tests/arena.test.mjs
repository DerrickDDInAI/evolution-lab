import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const out=path.resolve('.sites-runtime/tests');mkdirSync(out,{recursive:true});
for(const name of ['training-metrics','browser-storage','game-mode','physics','evolution','arena','prediction','net-motion','collision-effects','contact-prediction','contact-report','generation-clock','immunity-art','renderer']){
  let code=ts.transpileModule(readFileSync(`lib/${name}.ts`,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
  for(const dep of ['training-metrics','browser-storage','game-mode','physics','evolution','arena','prediction','net-motion','collision-effects','contact-prediction','contact-report','generation-clock','immunity-art','renderer'])code=code.replaceAll(`'./${dep}'`,`'./${dep}.mjs'`);
  writeFileSync(`${out}/${name}.mjs`,code);
}
const {createArena,join,advance,applyCommands,snapshot,upgradeArena,rememberContactFrame,confirmContact,ROUND,FIELD}=await import(pathToFileURL(`${out}/arena.mjs`));
const {inside,movePlayer,moveBody,bodyClear}=await import(pathToFileURL(`${out}/physics.mjs`));
const {reconcile}=await import(pathToFileURL(`${out}/prediction.mjs`));
const {createEffects,updateEffects,cancelEffect,impactCamera,vanishing}=await import(pathToFileURL(`${out}/collision-effects.mjs`));
const {trackRemote,projectBot,remoteAge,correctionFor,decayCorrection}=await import(pathToFileURL(`${out}/net-motion.mjs`));
const {activate,breed,mutate}=await import(pathToFileURL(`${out}/evolution.mjs`));
const {predictContact,contactResult}=await import(pathToFileURL(`${out}/contact-prediction.mjs`));
const command=(seq,life=0,x=0,y=-1)=>({seq,life,x,y,dt:1/60,dash:false});
function runner(a,now=0){const p=join(a,'one','secret','Runner',now,'profile');p.phase='arena';p.x=3000;p.y=3000;p.runStartedAt=now;p.runId='run-one';return p;}
function parkBots(a){for(const b of a.bots){b.spawnWait=0;b.x=1800;b.y=1800;for(const g of b.genome.genes)g.weight=0;}}
test('new players spawn outside, safe contact does not kill, and training waits for entry',()=>{
 const a=createArena(0),p=join(a,'one','secret','Runner',0,'profile');assert.equal(p.phase,'safe');assert.equal(p.runStartedAt,null);assert.ok(!inside(p.x,p.y));
 a.bots[0].x=p.x;a.bots[0].y=p.y;advance(a,200);assert.equal(p.tags,0);assert.equal(a.elapsed,0);assert.equal(p.scores.runs.length,0);
});
test('all four doors start a timer only after fully entering',()=>{
 for(const [x,y,ix,iy] of [[3000,FIELD.min-30,0,1],[FIELD.max+30,3000,-1,0],[3000,FIELD.max+30,0,-1],[FIELD.min-30,3000,1,0]]){
  const a=createArena(0);parkBots(a);const p=join(a,'one','secret','Runner',0);p.x=x;p.y=y;p.credit=.5;
  applyCommands(a,p,Array.from({length:16},(_,i)=>command(i+1,0,ix,iy)),1000,[]);
  assert.equal(p.phase,'arena');assert.equal(p.runStartedAt,1000);assert.ok(inside(p.x,p.y,28));
 }
});
test('solid walls block entry and active runners cannot escape through doors',()=>{
 const a=createArena(0),p=join(a,'one','secret','Runner',0);parkBots(a);p.x=2400;p.y=FIELD.min-35;p.credit=.5;
 applyCommands(a,p,Array.from({length:25},(_,i)=>command(i+1,0,0,1)),100,[]);assert.equal(p.phase,'safe');assert.ok(p.y<=FIELD.min-27);
 p.phase='arena';p.runStartedAt=100;p.x=3000;p.y=FIELD.max-30;p.credit=.5;
 applyCommands(a,p,Array.from({length:20},(_,i)=>command(30+i,0,0,1)),200,[]);assert.ok(p.y<=FIELD.max-28);assert.equal(p.phase,'arena');
});
test('one bot touch kills immediately, records the killer generation and respawns outside',()=>{
 const a=createArena(0);parkBots(a);const p=runner(a,1000);a.generation=7;p.scores.bestMs=9000;a.bots[0].x=p.x;a.bots[0].y=p.y;const finished=[];
 advance(a,2456,finished);assert.equal(p.phase,'safe');assert.ok(!inside(p.x,p.y));assert.equal(p.life,1);assert.equal(p.scores.runs.length,1);assert.equal(p.scores.runs[0].durationMs,1456);assert.equal(p.scores.runs[0].generation,7);assert.equal(p.scores.bestMs,9000);assert.equal(a.totalTags,1);assert.equal(finished.length,1);assert.equal(finished[0].profileId,'profile');
 advance(a,2500,finished);assert.equal(finished.length,1);assert.equal(p.runStartedAt,null);
});
test('killer generation is the one before reproduction at a generation boundary',()=>{
 const a=createArena(0);parkBots(a);const p=runner(a,0);a.generation=11;a.elapsed=ROUND-.001;a.bots[0].x=p.x;a.bots[0].y=p.y;advance(a,20);
 assert.equal(p.lastDeath.generation,11);assert.equal(a.generation,12);
});
test('delayed commands from an old life cannot move a respawned player',()=>{
 const a=createArena(0);parkBots(a);const p=runner(a,0);a.bots[0].x=p.x;a.bots[0].y=p.y;advance(a,1000);const {x,y}=p;
 applyCommands(a,p,Array.from({length:20},(_,i)=>command(i+1,0,1,0)),2500,[]);assert.equal(p.x,x);assert.equal(p.y,y);assert.equal(p.ack,20);
});
test('movement replay is immediate and matches server physics after acknowledgement',()=>{
 const a=createArena(0),p=join(a,'one','secret','Runner',0);const authoritative=structuredClone(p),commands=Array.from({length:10},(_,i)=>command(i+1,0,1,0));
 const predicted=reconcile(authoritative,commands,a.obstacles,150);assert.ok(predicted.x>p.x+40);
 applyCommands(a,p,commands,150,[]);assert.equal(p.x,predicted.x);assert.equal(p.y,predicted.y);
 const corrected=reconcile(p,commands,a.obstacles,150);assert.equal(corrected.x,p.x,'acknowledged inputs must never replay twice');
});
test('server time budget prevents forged input from granting excess movement',()=>{
 const a=createArena(0),p=join(a,'one','secret','Runner',0);const x=p.x;
 applyCommands(a,p,Array.from({length:90},(_,i)=>command(i+1,0,1,0)),0,[]);assert.ok(p.x-x<=255*.25+.001);
 const after=p.x;applyCommands(a,p,[command(91,0,1,0)],0,[]);assert.equal(p.x,after);
});
test('snapshots keep personal histories and device identities private',()=>{
 const a=createArena(0),p=runner(a);p.scores.runs=[{id:'private-run',durationMs:100,generation:1,bot:0,diedAt:1}];
 const publicView=JSON.stringify(snapshot(a));assert.ok(!publicView.includes('secret'));assert.ok(!publicView.includes('private-run'));assert.ok(!publicView.includes('profileId'));assert.equal(snapshot(a,'secret').personal.scores.runs.length,1);
});
test('legacy world upgrades preserve learned genomes and generation',()=>{
 const a=createArena(0);join(a,'one','secret','Runner',0);a.version=1;a.generation=33;const genome=structuredClone(a.bots[0].genome);
 const upgraded=upgradeArena(a,500);assert.equal(upgraded.version,2);assert.equal(upgraded.generation,33);assert.deepEqual(upgraded.bots[0].genome,genome);assert.equal(upgraded.players[0].phase,'safe');assert.ok(!inside(upgraded.players[0].x,upgraded.players[0].y));
});
test('disconnected players expire and empty arenas stop training',()=>{
 const a=createArena(0);runner(a);parkBots(a);advance(a,100);assert.ok(a.elapsed>0);advance(a,20000);assert.equal(a.players.length,0);const elapsed=a.elapsed;advance(a,30000);assert.equal(a.elapsed,elapsed);
});
test('topology mutation and breeding keep finite feed-forward networks',()=>{
 const a=createArena(0);let genomes=a.bots.map(b=>b.genome),grew=false;
 for(let i=0;i<40;i++){genomes.forEach((g,j)=>{g.fitness=j;mutate(g,a.evolution);if(g.nodes.length>2)grew=true;for(const gene of g.genes){const from=g.nodes.find(n=>n.id===gene.from)?.depth||0,to=g.nodes.find(n=>n.id===gene.to)?.depth;assert.ok(from<to);}assert.ok(activate(g,Array(11).fill(.5)).every(Number.isFinite));});genomes=breed(genomes,a.evolution).genomes;assert.equal(genomes.length,24);}assert.ok(grew);
});

test('750 ms network updates preserve all legitimate movement instead of pulling the player back',()=>{
 const a=createArena(0),p=join(a,'one','secret','Runner',0);const start=p.x;
 const commands=Array.from({length:45},(_,i)=>command(i+1,0,1,0));
 const client=reconcile(structuredClone(p),commands,a.obstacles,750);
 applyCommands(a,p,commands,750,[]);
 assert.equal(p.x,client.x);assert.equal(p.x-start,255*.75);assert.equal(p.ack,45);
 const x=p.x;applyCommands(a,p,commands,800,[]);assert.equal(p.x,x,'a retransmitted packet never moves twice');
});
test('a three second jitter budget remains bounded by elapsed server time',()=>{
 const a=createArena(0),p=join(a,'one','secret','Runner',0),start=p.x;
 applyCommands(a,p,Array.from({length:360},(_,i)=>command(i+1,0,1,0)),6000,[]);
 assert.ok(p.x-start<=255*3+.001);assert.ok(p.x-start>255*2.9);
});
test('remote movement continues between 250 ms snapshots and corrections are continuous',()=>{
 let track;const samples=[0,250,500,750];let previous=-Infinity,minStep=Infinity;
 for(let t=0;t<1000;t+=10){const stamp=samples.filter(s=>s<=t).at(-1),sample={x:stamp*.1,y:100,vx:100,vy:0};track=trackRemote(track,sample,stamp,0,t,.1);if(Number.isFinite(previous)&&t%250!==0)minStep=Math.min(minStep,track.x-previous);assert.ok(track.x>=previous-.001);previous=track.x;}
 assert.ok(minStep>.1,'remote entities should not freeze between normal network updates');
 const teleported=trackRemote(track,{x:1000,y:2000,vx:0,vy:0},1001,1,1001,.1);assert.equal(teleported.x,1000);assert.equal(teleported.y,2000);
 const stalled=trackRemote(undefined,{x:0,y:0,vx:100,vy:0},0,0,0,.1);trackRemote(stalled,stalled.sample,0,0,5000,.1);assert.ok(stalled.x<=45,'extrapolation must stop on a lost connection');
});
test('minor prediction errors ease out while deaths and large corrections snap',()=>{
 const next={x:100,y:100,vx:0,vy:0},c=correctionFor({...next,x:120},next,true);assert.equal(c.x,20);decayCorrection(c,.08);assert.ok(c.x>7&&c.x<8);
 assert.deepEqual(correctionFor({...next,x:120},next,false),{x:0,y:0});assert.deepEqual(correctionFor({...next,x:1000},next,true),{x:0,y:0});
});
test('cached neural activation matches the original calculation through topology mutations',()=>{
 const a=createArena(0),g=a.bots[0].genome,inputs=Array.from({length:11},(_,i)=>Math.sin(i));
 function reference(g,inputs){const v={};inputs.forEach((x,i)=>v[i]=x);for(const node of [...g.nodes].sort((a,b)=>a.depth-b.depth)){let sum=0;for(const c of g.genes)if(c.enabled&&c.to===node.id)sum+=(v[c.from]||0)*c.weight;v[node.id]=Math.tanh(sum);}return [v[11]||0,v[12]||0];}
 for(let i=0;i<50;i++){assert.deepEqual(activate(g,inputs),reference(g,inputs));assert.deepEqual(activate(g,inputs),reference(g,inputs));mutate(g,a.evolution);}
});

test('remote movement stays continuous at the observed 750 ms round trip',()=>{
 let track=trackRemote(undefined,{x:0,y:0,vx:100,vy:0},0,0,0,.375);
 let previous=track.x;
 for(let t=10;t<750;t+=10){track=trackRemote(track,track.sample,0,0,t,.375);assert.ok(track.x-previous>.5,'high latency must not exhaust extrapolation immediately');previous=track.x;}
});

test('a lethal contact records the actual impact point and safe respawn for every viewer',()=>{
 const a=createArena(1000);parkBots(a);const p=runner(a,1000);a.bots[0].x=p.x;a.bots[0].y=p.y;
 advance(a,1100);
 assert.equal(a.collisions.length,1);const event=a.collisions[0];
 assert.equal(event.playerId,p.id);assert.equal(event.bot,0);assert.equal(event.x,3000);assert.equal(event.y,3000);assert.equal(event.at,1100);
 assert.equal(event.respawnX,p.x);assert.equal(event.respawnY,p.y);assert.ok(!inside(event.respawnX,event.respawnY));
 assert.ok(!JSON.stringify(event).includes('secret'));assert.ok(!('profileId' in event));
 advance(a,1200);assert.equal(a.collisions.length,1,'a dead player cannot emit repeated collision events');
});
test('collision effects play once, expire, and honor reduced motion without replaying old deaths',()=>{
 const event={id:'hit',playerId:'one',bot:0,x:3000,y:3000,bx:2990,by:3000,respawnX:3000,respawnY:4950,at:1000};
 const initial=createEffects();updateEffects(initial,[event],0,1000);assert.equal(initial.active.length,0,'page load must not replay an old death');
 const effects=createEffects();updateEffects(effects,[],0,1000);updateEffects(effects,[event],10,1000);updateEffects(effects,[event],30,1020);assert.equal(effects.active.length,1);
 assert.equal(impactCamera(effects,'one',200,false)?.id,'hit');assert.equal(impactCamera(effects,'one',200,true),null);
 assert.equal(vanishing(effects,'one',200,false),true);assert.equal(vanishing(effects,'one',200,true),false);assert.equal(vanishing(effects,'one',600,false),false);
 updateEffects(effects,[event],1400,2400);assert.equal(effects.active.length,0);assert.equal(effects.seen.size,1);
 updateEffects(effects,[{...event,id:'too-old'}],1500,8000);assert.equal(effects.active.length,0,'late historical packets must not resurrect old animations');
});


test('visible contact produces an immediate impact and frozen run before a delayed server reply',()=>{
 const a=createArena(0),p=runner(a,1000),positions=new Map();
 // The drawn bot reaches us while its last server position is still 80 units away.
 const track=trackRemote(undefined,{x:3080,y:3000,vx:-100,vy:0},1000,1,0,.375);
 trackRemote(track,track.sample,1000,1,600,.375);positions.set('b0',track);
 const hit=predictContact(p,[{id:0}],positions,7,600,1600,36,'frame');
 assert.ok(hit);assert.equal(hit.run.durationMs,600);assert.equal(hit.run.generation,7);
 assert.equal(hit.event.x,p.x);assert.equal(hit.event.bx,track.x);assert.equal(hit.player.phase,'arena');assert.equal(hit.player.x,p.x,'no fake respawn before confirmation');
 assert.equal(p.phase,'arena','prediction must not mutate authoritative state');assert.equal(p.scores.runs.length,0);
 const effects=createEffects();updateEffects(effects,[],0,1000);updateEffects(effects,[hit.event],600,1600);
 assert.equal(effects.active[0].startedAt,600,'no network response or animation delay is required');
 assert.equal(contactResult(hit,{...p,ack:36},null),'pending','a pre-contact request cannot reject the hit');
 assert.equal(contactResult(hit,{...p,ack:35},hit),'pending','all contact inputs must be acknowledged first');
 assert.equal(contactResult(hit,{...p,ack:36,life:1},hit),'confirmed');
 const confirmed={...hit.event,id:'server-event',at:2000};updateEffects(effects,[hit.event,confirmed],1000,2000);
 assert.equal(effects.active.length,1);assert.equal(effects.active[0].startedAt,600,'confirmation cannot restart the effect');
});
test('safe players, near misses and stale disconnected bot tracks cannot predict a death',()=>{
 const a=createArena(0),p=runner(a,0),positions=new Map([['b0',trackRemote(undefined,{x:3030,y:3000,vx:0,vy:0},0,1,0,0)]]);
 assert.equal(predictContact(p,[{id:0}],positions,1,10,10,1,'frame'),null);
 positions.get('b0').x=3028;
 assert.equal(predictContact({...p,phase:'safe'},[{id:0}],positions,1,10,10,1,'frame'),null);
 assert.equal(predictContact(p,[{id:0}],positions,1,1501,1501,1,'frame'),null);
});
test('a rejected prediction removes its effect and leaves server scores untouched',()=>{
 const a=createArena(0),p=runner(a,0),positions=new Map([['b0',trackRemote(undefined,{x:3028,y:3000,vx:0,vy:0},0,1,0,0)]]);
 const hit=predictContact(p,[{id:0}],positions,1,300,300,1,'frame');assert.ok(hit);
 assert.equal(contactResult(hit,{...p,ack:1},hit),'pending','movement acknowledgement alone cannot reject a contact');
 assert.equal(contactResult(hit,{...p,ack:1},hit,{life:0,seq:1,status:'rejected'}),'rejected');
 const effects=createEffects();updateEffects(effects,[],0,0);updateEffects(effects,[hit.event],10,10);cancelEffect(effects,hit.event);
 assert.equal(effects.active.length,0);assert.equal(p.scores.runs.length,0);assert.equal(a.totalTags,0);
 updateEffects(effects,[{...hit.event,id:'later-real-death'}],100,100);assert.equal(effects.active.length,1,'a real later death remains visible');
});


test('a moving bot that has passed the visible contact still commits death and outside respawn',()=>{
 const a=createArena(1000),p=runner(a,1000);parkBots(a);p.ack=36;a.bots[0].x=3080;a.bots[0].y=3000;a.bots[0].vx=-100;
 const frameId=rememberContactFrame(a,p,1000),r={frameId,life:0,seq:36,bot:0,age:.6,x:3000,y:3000,bx:3020,by:3000};
 a.bots[0].x=2800;const finished=[];
 assert.equal(confirmContact(a,p,r,2000,finished).status,'confirmed');assert.equal(p.life,1);assert.equal(p.phase,'safe');assert.equal(p.runStartedAt,null);assert.ok(!inside(p.x,p.y));assert.equal(finished.length,1);assert.equal(a.totalTags,1);assert.equal(p.lastDeath.durationMs,600,'network confirmation delay must not inflate the score');
 assert.equal(confirmContact(a,p,r,2600,finished).status,'confirmed');assert.equal(p.life,1);assert.equal(finished.length,1,'lost-response retries cannot score or respawn twice');
 const outside={x:p.x,y:p.y};applyCommands(a,p,[command(37,0,0,-1)],4000,finished);assert.equal(p.x,outside.x);assert.equal(p.y,outside.y);assert.equal(p.runStartedAt,null);
 const client=reconcile(p,[command(38,0,0,-1)],a.obstacles,4000);assert.equal(client.phase,'safe');assert.equal(client.runStartedAt,null,'old-life replay cannot restart the timer');
});
test('contact confirmation waits for all movement commands and rejects fabricated distant contacts',()=>{
 const a=createArena(1000),p=runner(a,1000);parkBots(a);a.bots[0].x=3020;a.bots[0].y=3000;
 const frameId=rememberContactFrame(a,p,1000),r={frameId,life:0,seq:36,bot:0,age:0,x:3000,y:3000,bx:3020,by:3000};
 assert.equal(confirmContact(a,p,r,1500,[]).status,'pending');assert.equal(p.phase,'arena');p.ack=36;
 for(const bad of [{...r,frameId:'fabricated'},{...r,x:1000,y:1000,bx:1000,by:1000},{...r,bx:3500},{...r,bot:23}])assert.equal(confirmContact(a,p,bad,1500,[]).status,'rejected');
 assert.equal(p.life,0);assert.equal(p.scores.runs.length,0);
 assert.equal(confirmContact(a,p,r,1500,[]).status,'confirmed');
});
test('contact frames remain private and preserve the killer generation across reproduction',()=>{
 const a=createArena(1000),p=runner(a,1000);parkBots(a);p.ack=1;a.generation=8;a.bots[0].x=3020;a.bots[0].y=3000;
 const frameId=rememberContactFrame(a,p,1000);assert.ok(!JSON.stringify(snapshot(a)).includes(frameId));assert.ok(!('contactFrames' in snapshot(a).players[0]));assert.equal(snapshot(a,'secret').personal.contactFrame,frameId);
 a.generation=9;a.bots[0].x=1800;
 assert.equal(confirmContact(a,p,{frameId,life:0,seq:1,bot:0,age:0,x:3000,y:3000,bx:3020,by:3000},1600,[]).status,'confirmed');
 assert.equal(p.lastDeath.generation,8);assert.equal(a.bots[0].tags,0,'do not reward a newly bred bot for its predecessor');
});
test('repeated deaths leave the timer stopped outside until a fresh door entry',()=>{
 const a=createArena(0),p=runner(a,0);parkBots(a);
 for(let life=0;life<4;life++){
  p.x=3000;p.y=4760;p.phase='arena';p.runStartedAt=life*4000;p.runId='run-'+life;p.ack=life+1;
  a.bots[0].x=3010;a.bots[0].y=4760;
  const now=life*4000+1000,frameId=rememberContactFrame(a,p,now);
  confirmContact(a,p,{frameId,life,seq:p.ack,bot:0,age:0,x:3000,y:4760,bx:3010,by:4760},now+100,[]);
  assert.equal(p.life,life+1);assert.equal(p.phase,'safe');assert.equal(p.runStartedAt,null);assert.equal(p.y,4950);assert.equal(p.scores.runs.length,life+1);
  for(let n=0;n<100;n++)movePlayer(p,{x:0,y:0,dash:false},1/60,a.obstacles,now+2000);
  assert.equal(p.runStartedAt,null);assert.equal(p.phase,'safe');
 }
 // After the latest respawn lock, a new trip through the door starts a new clock.
 for(let n=0;n<50;n++)movePlayer(p,{x:0,y:-1,dash:false},1/60,a.obstacles,16000);
 assert.equal(p.phase,'arena');assert.equal(p.runStartedAt,16000);
});


test('swept movement cannot tunnel through a rock even in a long delayed frame',()=>{
 const rocks=[{x:3000,y:3000,r:80}],p={x:2800,y:3000,vx:290,vy:0};
 assert.equal(moveBody(p,13,1.5,rocks),true);assert.ok(p.x<=2907.001);assert.ok(bodyClear(p,13,rocks));
 const diagonal={x:2800,y:2920,vx:290,vy:120};moveBody(diagonal,13,1.5,rocks);assert.ok(bodyClear(diagonal,13,rocks));assert.ok(diagonal.y<2920||diagonal.x<3100,'slide along the near side instead of crossing the rock');
});
test('server motion and legacy overlap repair stay outside intersecting obstacles',()=>{
 const rocks=[{x:3000,y:3000,r:80},{x:3100,y:3000,r:80},{x:3050,y:2930,r:65}];
 const embedded={x:3050,y:3000,vx:0,vy:0};moveBody(embedded,13,0,rocks);assert.ok(bodyClear(embedded,13,rocks));
 const p={x:2800,y:2850,vx:0,vy:0};
 for(let i=0;i<3000;i++){p.vx=Math.sin(i*.17)*290;p.vy=Math.cos(i*.11)*290;moveBody(p,13,1/30,rocks);assert.ok(bodyClear(p,13,rocks),`penetration at step ${i}`);}
});
test('every predicted bot frame respects rocks at 750 ms and 1200 ms round trips',()=>{
 const rocks=[{x:3000,y:3000,r:80}];
 for(const latency of [.375,.6]){
  let track=trackRemote(undefined,{x:2800,y:3000,vx:290,vy:0},1000,1,0,latency,rocks);
  for(let t=16;t<=1600;t+=16){track=trackRemote(track,track.sample,1000,1,t,latency,rocks);assert.ok(bodyClear(track,13,rocks),`visible penetration at ${t} ms`);assert.ok(track.x<=2907.001);}
 }
});
test('network corrections cannot cut through a rock between valid sample positions',()=>{
 const rocks=[{x:3000,y:3000,r:80}];let track=trackRemote(undefined,{x:2890,y:3000,vx:0,vy:0},1,1,0,0,rocks);
 const otherSide={x:3110,y:3000,vx:0,vy:0};
 for(let t=16;t<1000;t+=16){track=trackRemote(track,otherSide,2,1,t,0,rocks);assert.ok(bodyClear(track,13,rocks));assert.ok(track.x<=2907.001,'correction must not cross the obstacle');}
 // Reproduction is an intentional teleport, so a new generation may reset to a valid spawn.
 track=trackRemote(track,otherSide,3,2,1000,0,rocks);assert.equal(track.x,3110);
});
test('blocked server bots publish actual zero velocity instead of pointing through the rock',()=>{
 const a=createArena(0),p=runner(a,0);parkBots(a);p.x=3500;p.y=3000;a.obstacles=[{x:3000,y:3000,r:80}];
 const b=a.bots[0];b.x=2907;b.y=3000;b.genome.genes=[{from:10,to:11,weight:10,enabled:true}];
 advance(a,500);assert.ok(bodyClear(b,13,a.obstacles));assert.ok(b.x<=2907.001);assert.ok(Math.abs(b.vx)<.01);assert.ok(Math.abs(b.vy)<.01);
});
test('latency compensation follows constant motion without the old 150 ms lead cap',()=>{
 let track;
 const oneWay=.375,speed=200;
 for(let t=0;t<3000;t+=16){
  const sampleAt=Math.floor(t/750)*750,sample={x:2000+sampleAt/1000*speed,y:2500,vx:speed,vy:0};
  track=trackRemote(track,sample,sampleAt,1,t,oneWay,[]);
  const expected=2000+(t/1000+oneWay)*speed;
  assert.ok(Math.abs(track.x-expected)<10,`bot lag ${expected-track.x} at ${t} ms`);
 }
});
test('contact validation shares obstacle-aware prediction and rejects through-rock reports',()=>{
 const a=createArena(1000),p=runner(a,1000);parkBots(a);a.obstacles=[{x:3000,y:3000,r:80}];p.x=2880;p.y=3000;p.ack=1;
 const b=a.bots[0];b.x=2800;b.y=3000;b.vx=290;
 const frameId=rememberContactFrame(a,p,1000),pose=projectBot(b,.75,a.obstacles);
 assert.equal(confirmContact(a,p,{frameId,life:0,seq:1,bot:0,age:.75,x:3000,y:3000,bx:3000,by:3000},1500,[]).status,'rejected');
 assert.equal(confirmContact(a,p,{frameId,life:0,seq:1,bot:0,age:.75,x:p.x,y:p.y,bx:pose.x,by:pose.y},1500,[]).status,'confirmed');assert.equal(p.phase,'safe');assert.equal(p.runStartedAt,null);
});
test('snapshot simulation timestamps do not advance just because a spectator reads the world',()=>{
 const a=createArena(1234);assert.equal(snapshot(a).simulationTime,1234);assert.equal(snapshot(a).simulationTime,1234);
 advance(a,1300);assert.equal(snapshot(a).simulationTime,1300);
});

test('same-generation corrections never teleport, even after a large position error',()=>{
 let track=trackRemote(undefined,{x:2500,y:3000,vx:290,vy:0},0,-1,0,.375,[]),last={x:track.x,y:track.y};
 for(let frame=1;frame<=360;frame++){
  const now=frame*1000/60,stamp=Math.floor(frame/45),reverse=stamp%2===1;
  const sample={x:reverse?3500:2400,y:3000,vx:reverse?-290:290,vy:0};
  track=trackRemote(track,sample,stamp,-1,now,.375,[]);
  assert.ok(Math.hypot(track.x-last.x,track.y-last.y)<=435/60+.001,'a late packet must not jump the bot');
  assert.ok(Number.isFinite(track.x)&&Number.isFinite(track.y));last={x:track.x,y:track.y};
 }
 const x=track.x,y=track.y;trackRemote(track,{x:4100,y:3000,vx:0,vy:0},99,-1,track.frameAt,.375,[]);
 assert.equal(track.x,x);assert.equal(track.y,y,'receiving a packet alone cannot move an entity');
});

test('a stalled browser resumes with a bounded movement step and no new entity life',()=>{
 const track=trackRemote(undefined,{x:2800,y:3000,vx:290,vy:0},0,-4,0,0,[]),x=track.x;
 trackRemote(track,{x:4000,y:3000,vx:290,vy:0},4000,-4,4000,0,[]);
 assert.ok(Math.abs(track.x-x)<=435*.05+.001);assert.equal(track.life,-4);
});

test('players, bots and remote prediction use the same collision and arena boundary rules',async()=>{
 const {moveActor}=await import(pathToFileURL(`${out}/physics.mjs`));
 const rocks=[{x:3200,y:3000,r:80}];
 const player={x:3000,y:3000,vx:0,vy:0,energy:1,phase:'arena',runStartedAt:0,respawnUntil:0};
 const bot={x:player.x,y:player.y,vx:0,vy:0};
 for(let i=0;i<500;i++){
  const input={x:1,y:i<150?0:.2,dash:false},length=Math.max(1,Math.hypot(input.x,input.y));
  movePlayer(player,input,1/60,rocks,i*1000/60);bot.vx=input.x/length*255;bot.vy=input.y/length*255;
  moveActor(bot,16,1/60,rocks);
  assert.equal(bot.x,player.x);assert.equal(bot.y,player.y);assert.equal(bot.vx,player.vx);assert.equal(bot.vy,player.vy);
  assert.ok(bodyClear(bot,16,rocks));
 }
 for(const radius of [13,16]){
  const body={x:3000,y:4770,vx:0,vy:255};moveActor(body,radius,1,[]);
  assert.equal(body.y,FIELD.max-FIELD.wall/2-radius);
 }
 const remote=trackRemote(undefined,{x:3000,y:4770,vx:0,vy:255},1,0,0,.5,[],16,'arena');
 assert.equal(remote.y,4772);
 const outside=trackRemote(undefined,{x:2400,y:1150,vx:0,vy:255},1,0,0,.5,[],16,'safe');
 assert.ok(outside.y<=1172,'a remote player must not pass through a solid wall');
});

test('every new generation returns every bot to its own fixed, clear starting point',()=>{
 const a=createArena(0),homes=a.bots.map(b=>({x:b.x,y:b.y}));const p=runner(a);p.x=3000;p.y=4300;
 assert.equal(new Set(homes.map(h=>`${h.x},${h.y}`)).size,24);
 for(let gen=1;gen<=4;gen++){
  for(const b of a.bots){b.x=2000;b.y=2000;b.spawnWait=0;b.genome.genes=[];}
  a.elapsed=ROUND-.001;p.lastSeen=gen*20;advance(a,gen*20);
  assert.equal(a.generation,gen+1);
  a.bots.forEach((b,i)=>{assert.equal(b.x,homes[i].x);assert.equal(b.y,homes[i].y);assert.ok(bodyClear(b,13,a.obstacles));assert.ok(b.spawnWait>2.9);assert.equal(b.vx,0);assert.equal(b.vy,0);});
  assert.equal(p.life,0);assert.equal(p.runStartedAt,0);
 }
});

test('generation warm-up stays harmless when a player occupies a bot home',()=>{
 const a=createArena(0),p=runner(a),b=a.bots[0];p.x=b.x;p.y=b.y;
 for(const bot of a.bots)bot.genome.genes=[];
 for(let t=100;t<=6000;t+=100){p.lastSeen=t;advance(a,t);applyCommands(a,p,[command(t,0,0,0)],t,[]);}
 assert.equal(p.life,0);assert.equal(p.phase,'arena');assert.equal(p.runStartedAt,0);assert.ok(b.spawnWait>0);assert.equal(b.x,b.homeX);assert.equal(b.y,b.homeY);
 const frameId=rememberContactFrame(a,p,6000),track=trackRemote(undefined,b,6000,-1,0,0,a.obstacles);
 assert.equal(predictContact(p,a.bots,new Map([['b0',track]]),1,0,6000,p.ack,frameId),null);
 assert.equal(confirmContact(a,p,{frameId,life:0,seq:p.ack,bot:0,age:0,x:p.x,y:p.y,bx:b.x,by:b.y},6000,[]).status,'rejected');
 p.x=3000;p.y=4300;p.lastSeen=6100;advance(a,6100);assert.equal(b.spawnWait,0);
 p.x=b.x;p.y=b.y;applyCommands(a,p,[command(7000,0,0,0)],6200,[]);assert.equal(p.life,1,'a released bot remains lethal');
});

test('newly spawned bots cannot move or kill during their full three second warm-up',()=>{
 const a=createArena(0),p=runner(a);p.x=3000;p.y=4300;const homes=a.bots.map(b=>[b.x,b.y]);
 advance(a,2900);a.bots.forEach((b,i)=>{assert.ok(b.spawnWait>0);assert.deepEqual([b.x,b.y],homes[i]);});
 p.lastSeen=3100;advance(a,3100);assert.ok(a.bots.every(b=>b.spawnWait===0));assert.equal(p.life,0);
});

test('upgrading the live world assigns homes without moving current bots or changing genomes',()=>{
 const a=createArena(0);for(const b of a.bots){delete b.homeX;delete b.homeY;delete b.spawnWait;b.x=2000;b.y=2400;}
 const before=structuredClone(a.bots.map(b=>b.genome));a.generation=44;
 upgradeArena(a,1000);assert.equal(a.generation,44);
 a.bots.forEach((b,i)=>{assert.equal(b.x,2000);assert.equal(b.y,2400);assert.ok(Number.isFinite(b.homeX));assert.deepEqual(b.genome,before[i]);assert.equal(b.spawnWait,undefined);});
});

test('the prominent countdown advances smoothly and pauses when the arena is empty',async()=>{
 const {generationClock}=await import(pathToFileURL(`${out}/generation-clock.mjs`));
 const state={round:45,elapsed:40,simulationTime:1000,players:[{phase:'arena'}],bots:[]};
 assert.equal(generationClock(state,2250).remaining,4);assert.equal(generationClock(state,9000).remaining,0);
 state.players=[];assert.equal(generationClock(state,9000).remaining,5);assert.equal(generationClock(state,9000).running,false);
 state.bots=[{spawnWait:3}];assert.equal(generationClock(state,9000).warmup,3);
 state.players=[{phase:'arena'}];assert.equal(generationClock(state,2250).warmup,2);
});

test('an unseen server collision cannot kill a visible-contact player before delayed movement arrives',()=>{
 const a=createArena(0);parkBots(a);const p=runner(a);p.contactMode='visible-v1';
 const b=a.bots[0];b.x=p.x;b.y=p.y;const finished=[];
 advance(a,750,finished);
 assert.equal(p.life,0);assert.equal(p.phase,'arena');assert.equal(p.lastDeath,null);assert.equal(finished.length,0);
 applyCommands(a,p,Array.from({length:45},(_,i)=>command(i+1,0,1,0)),750,finished);
 assert.equal(p.x,3000+255*.75);assert.equal(p.life,0);assert.equal(p.scores.runs.length,0);
 assert.equal(a.totalTags,0,'unseen overlaps must not train a successful touch');
});

test('visible contacts still commit one authoritative death, score and outside respawn',()=>{
 const a=createArena(0);parkBots(a);const p=runner(a);p.contactMode='visible-v1';p.ack=3;
 const b=a.bots[0];b.x=p.x+20;b.y=p.y;b.vx=0;b.vy=0;
 const frameId=rememberContactFrame(a,p,400),report={frameId,life:0,seq:3,bot:0,age:0,x:p.x,y:p.y,bx:b.x,by:b.y},finished=[];
 // Another participant's update can move the bot while this report travels.
 b.x=3600;advance(a,750,finished);assert.equal(p.life,0);
 assert.equal(confirmContact(a,p,report,800,finished).status,'confirmed');
 assert.equal(p.life,1);assert.equal(p.phase,'safe');assert.equal(p.runStartedAt,null);assert.equal(finished.length,1);
 assert.equal(confirmContact(a,p,report,900,finished).status,'confirmed');assert.equal(p.life,1);assert.equal(finished.length,1);
});

test('a new bot track cannot cause a first-frame death, but an established visible touch can',()=>{
 const a=createArena(0),p=runner(a);const track=trackRemote(undefined,{x:3020,y:3000,vx:0,vy:0},10,-2,1000,0,[]),positions=new Map([['b0',track]]);
 assert.equal(predictContact(p,[{id:0}],positions,2,1000,1000,1,'frame'),null);
 assert.equal(predictContact(p,[{id:0}],positions,2,1249,1249,1,'frame'),null);
 assert.ok(predictContact(p,[{id:0}],positions,2,1250,1250,1,'frame'));
});

test('visible contact mode and issued frame history are never exposed to other players',()=>{
 const a=createArena(0),p=runner(a);p.contactMode='visible-v1';rememberContactFrame(a,p,0);
 const view=JSON.stringify(snapshot(a));assert.ok(!view.includes('visible-v1'));assert.ok(!view.includes('contactFrames'));assert.ok(!view.includes(p.contactFrames[0].id));
});

test('a delayed new-generation snapshot starts at the fixed home and approaches its sample continuously',async()=>{
 const {updatePositions}=await import(pathToFileURL(`${out}/renderer.mjs`));
 const a=createArena(0),b=a.bots[0];b.spawnWait=0;b.x=4000;b.y=3000;
 const positions=new Map();updatePositions(snapshot(a),null,positions,0,.375);
 const old=positions.get('b0');assert.ok(old.x>=4000);
 a.generation++;a.time=1000;b.x=3500;b.y=3000;b.vx=290;
 updatePositions(snapshot(a),null,positions,1000,.375);
 assert.equal(positions.get('b0').x,b.homeX);assert.equal(positions.get('b0').y,b.homeY);
 let previous=positions.get('b0').x;
 for(let time=1016;time<=2000;time+=16){updatePositions(snapshot(a),null,positions,time,.375);const t=positions.get('b0');assert.ok(Math.abs(t.x-previous)<=435*.016+.001);previous=t.x;}
});

test('tilted camera keeps contact footprints faithful in every direction and zoom',async()=>{
 const {projectGround,GROUND_TILT}=await import(pathToFileURL(`${out}/immunity-art.mjs`));
 const camera={x:3000,y:4800},p={x:3042,y:4700};
 for(const zoom of [.35,1,1.5])for(const distance of [28.99,29,29.01])for(let i=0;i<16;i++){
  const angle=i*Math.PI/8,b={x:p.x+Math.cos(angle)*distance,y:p.y+Math.sin(angle)*distance};
  const a=projectGround(p,camera,zoom,1280,720),s=projectGround(b,camera,zoom,1280,720);
  const normalized=Math.hypot((s.x-a.x)/zoom,(s.y-a.y)/zoom/GROUND_TILT);
  assert.ok(Math.abs(normalized-distance)<1e-9);
  assert.equal(normalized<=29+1e-9,distance<=29,'projected ground ellipses must not imply a different contact distance');
 }
});
test('tilted minimap viewport includes the full visible depth and round-trips to world coordinates',async()=>{
 const {projectGround,unprojectGround,visibleGround}=await import(pathToFileURL(`${out}/immunity-art.mjs`));
 for(const [width,height] of [[1440,800],[390,600]])for(const zoom of [.35,1,1.5]){
  const camera={x:3050,y:4850},bounds=visibleGround(camera,zoom,width,height);
  for(const screen of [{x:0,y:0},{x:width,y:height},{x:width/2,y:height/2}]){
   const world=unprojectGround(screen,camera,zoom,width,height),back=projectGround(world,camera,zoom,width,height);
   assert.ok(Math.abs(back.x-screen.x)<1e-9&&Math.abs(back.y-screen.y)<1e-9);
   assert.ok(world.x>=bounds.left-1e-9&&world.x<=bounds.right+1e-9&&world.y>=bounds.top-1e-9&&world.y<=bounds.bottom+1e-9);
  }
  assert.ok(bounds.bottom-bounds.top>height/zoom,'depth compression must increase visible world height');
 }
});
test('depth ordering interleaves actors and plants without changing input and fades head-only overlaps',async()=>{
 const {depthOrder,overlaps}=await import(pathToFileURL(`${out}/immunity-art.mjs`));
 const items=[{name:'front player',y:50,order:2},{name:'plant',y:40,order:1},{name:'rear player',y:30,order:2},{name:'same-depth player',y:40,order:2}];
 assert.deepEqual(depthOrder(items).map(x=>x.name),['rear player','plant','same-depth player','front player']);
 assert.equal(items[0].name,'front player');
 assert.equal(overlaps({x:0,y:0,width:100,height:100},{x:40,y:90,width:20,height:50}),true,'fade even when feet are below the canopy');
 assert.equal(overlaps({x:0,y:0,width:100,height:100},{x:101,y:90,width:20,height:50}),false);
});

test('actor facing covers eight world headings and holds still near a sector boundary',async()=>{
 const {facingDirection}=await import(pathToFileURL(`${out}/immunity-art.mjs`));
 for(let direction=0;direction<8;direction++){
  const angle=direction*Math.PI/4;
  assert.equal(facingDirection(-Math.sin(angle)*200,Math.cos(angle)*200),direction);
  assert.equal(facingDirection(0,0,direction),direction);
  assert.equal(facingDirection(NaN,4,direction),direction);
 }
 const angle=25*Math.PI/180;
 assert.equal(facingDirection(-Math.sin(angle)*200,Math.cos(angle)*200,0),0);
 assert.equal(facingDirection(-Math.sin(angle)*200,Math.cos(angle)*200,1),1);
 assert.equal(facingDirection(-100,100,0),1);
});
test('facing and gait follow visible travel, stop at rest and reset on new lives',async()=>{
 const {actorPose}=await import(pathToFileURL(`${out}/immunity-art.mjs`));
 const actor={x:100,y:100,vx:200,vy:0,life:1};
 const initial=actorPose(undefined,actor,0);
 const moved=actorPose(initial,{...actor,x:104},20);
 assert.equal(moved.facing,6);assert.equal(moved.moving,true);assert.equal(moved.travel,4);
 const idle=actorPose(moved,{...actor,x:104},40);
 assert.equal(idle.moving,false);assert.equal(idle.facing,6);assert.equal(idle.travel,4);
 const newborn=actorPose(idle,{...actor,life:2,vx:0},60);
 assert.equal(newborn.travel,0);assert.equal(newborn.facing,0);assert.equal(newborn.moving,false);
 const teleport=actorPose(moved,{...actor,x:900},40);
 assert.equal(teleport.travel,0);assert.equal(teleport.moving,false);
});
test('directional art uses valid frame mappings and leaves a missing sheet to fallback',async()=>{
 const {directionalFrame,directionalSprite}=await import(pathToFileURL(`${out}/immunity-art.mjs`));
 for(const human of [true,false])for(let direction=0;direction<8;direction++){
  const frame=directionalFrame(human,direction);
  assert.ok(frame.cell>=(human?0:8)&&frame.cell<(human?8:16));
  assert.equal(frame.flip,direction>=1&&direction<=3);
 }
 assert.equal(directionalSprite({}, {complete:false,naturalWidth:0},true,0,0,0,60),false);
});

test('sprint cycle uses distance, preserves eight-way facing and stops below sprint speed',async()=>{
 const {sprintFrame}=await import(pathToFileURL(`${out}/immunity-art.mjs`));
 for(let direction=0;direction<8;direction++){
  for(let phase=0;phase<4;phase++){
   const pose=sprintFrame(direction,phase*40,true,430);
   assert.equal(pose.frame,phase);assert.equal(pose.row,[0,1,2,3,4,3,2,1][direction]);
  }
  assert.equal(sprintFrame(direction,160,true,430).frame,0);
  assert.equal(sprintFrame(direction,100,false,430),null,'blocked or idle actors must not animate');
  assert.equal(sprintFrame(direction,100,true,255),null,'walking or exhausted actors must not animate');
  assert.equal(sprintFrame(direction,100,true,NaN),null);
  assert.equal(sprintFrame(direction,100,true,430,true).frame,0,'reduced motion keeps a stable sprint pose');
 }
});
test('sprint sheet fallback and sampled rows keep the draw anchor fixed',async()=>{
 const {sprintFrame,sprintSprite}=await import(pathToFileURL(`${out}/immunity-art.mjs`));
 assert.equal(sprintSprite({}, {complete:false,naturalWidth:0},sprintFrame(0,0,true,430),10,20,59),false);
 const draws=[],translations=[];const ctx={save(){},restore(){},scale(){},translate(x,y){translations.push([x,y]);},drawImage(...args){draws.push(args);}};
 const image={complete:true,naturalWidth:1120,naturalHeight:1400};
 for(let direction=0;direction<8;direction++)for(let phase=0;phase<4;phase++){
  sprintSprite(ctx,image,sprintFrame(direction,phase*40,true,430),10,20,59);
  const [,x,y,w,h]=draws.at(-1);
  assert.ok(x>=0&&y>=0&&x+w<=image.naturalWidth&&y+h<=image.naturalHeight);
  assert.deepEqual(translations.at(-1),[10,20]);
 }
});

test('walking and sprinting select exclusive gaits across headings and speed changes',async()=>{
 const {walkFrame,sprintFrame}=await import(pathToFileURL(`${out}/immunity-art.mjs`));
 for(let facing=0;facing<8;facing++){
  for(let frame=0;frame<4;frame++)assert.equal(walkFrame(facing,frame*42,true,255).frame,frame);
  assert.equal(walkFrame(facing,168,true,255).frame,0);
  assert.equal(walkFrame(facing,120,true,255,true).frame,0);
  for(const speed of [8,120,255,300]){assert.ok(walkFrame(facing,100,true,speed));assert.equal(sprintFrame(facing,100,true,speed),null);}
  for(const speed of [301,430]){assert.equal(walkFrame(facing,100,true,speed),null);assert.ok(sprintFrame(facing,100,true,speed));}
  for(const speed of [0,7,NaN])assert.equal(walkFrame(facing,100,true,speed),null);
  assert.equal(walkFrame(facing,100,false,255),null);
 }
});
test('walking atlas preserves draw origins, valid source bounds and loading fallback',async()=>{
 const {walkFrame,walkSprite}=await import(pathToFileURL(`${out}/immunity-art.mjs`));
 assert.equal(walkSprite({}, {complete:false,naturalWidth:0},walkFrame(0,0,true,255),10,20,59),false);
 const draws=[],translations=[];const ctx={save(){},restore(){},scale(){},translate(x,y){translations.push([x,y]);},drawImage(...args){draws.push(args);}};
 const image={complete:true,naturalWidth:1120,naturalHeight:1400};
 for(let facing=0;facing<8;facing++)for(let phase=0;phase<4;phase++){
  walkSprite(ctx,image,walkFrame(facing,phase*42,true,255),10,20,59);
  const [,x,y,w,h]=draws.at(-1);assert.ok(x>=0&&y>=0&&x+w<=1120&&y+h<=1400);
  assert.deepEqual(translations.at(-1),[10,20]);
 }
});

const {RESOURCE,MENU_HOLD_MS,advanceMenu,menuZone,arenaKey,modeProfile}=await import(pathToFileURL(`${out}/game-mode.mjs`));
const {missionProgress}=await import(pathToFileURL(`${out}/arena.mjs`));
test('mode menu requires continuous 850 ms occupancy and resets outside or across choices',()=>{
 let s={mode:null,elapsed:0};
 for(let i=0;i<16;i++)s=advanceMenu(s,{x:34,y:63},50);
 assert.equal(s.confirmed,null);assert.equal(s.elapsed,800);
 s=advanceMenu(s,{x:50,y:48},16);assert.equal(s.elapsed,0);
 for(let i=0;i<17;i++)s=advanceMenu(s,{x:66,y:63},50);
 assert.equal(s.elapsed,MENU_HOLD_MS);assert.equal(s.confirmed,'motion');
 s=advanceMenu(s,{x:34,y:63},16);assert.equal(s.confirmed,null);assert.equal(s.elapsed,16);
 assert.equal(advanceMenu(s,{x:34,y:63},0,true).confirmed,'survival');
 assert.equal(advanceMenu(s,{x:50,y:48},0,true).confirmed,null);
 assert.equal(advanceMenu({mode:null,elapsed:0},{x:66,y:63},10000).confirmed,null,'tab suspension must not instantly confirm');
});
test('mode storage keeps legacy survival identity and isolates motion learning and records',()=>{
 assert.equal(arenaKey('survival'),'shared');assert.equal(modeProfile('token','survival'),'token');
 assert.notEqual(arenaKey('motion'),arenaKey('survival'));assert.notEqual(modeProfile('token','motion'),modeProfile('token','survival'));
 const original=createArena(0),hunt=createArena(0,'motion');hunt.bots[0].genome.genes[0].weight=999;
 assert.notEqual(original.bots[0].genome.genes[0].weight,999);assert.equal(snapshot(hunt).mode,'motion');assert.deepEqual(snapshot(hunt).resource,RESOURCE);assert.equal(snapshot(original).resource,null);
});
test('motion bots halt and earn no proximity fitness from stationary humans',()=>{
 const a=createArena(0,'motion'),p=runner(a);p.x=3600;p.y=3000;
 for(const b of a.bots){b.spawnWait=0;b.vx=100;b.vy=100;}
 const before=a.bots.map(b=>({x:b.x,y:b.y,fitness:b.fitness}));advance(a,100);
 for(const [i,b] of a.bots.entries()){assert.deepEqual({x:b.x,y:b.y,fitness:b.fitness},before[i]);assert.equal(b.vx,0);assert.equal(b.vy,0);}
});
test('motion pursuit ignores nearer stationary humans and stops when the signal disappears',()=>{
 const a=createArena(0,'motion'),p=runner(a);p.x=3800;p.y=3000;p.vx=255;
 for(const b of a.bots)b.spawnWait=0;
 const other=join(a,'hidden','secret2','Hidden',0);other.phase='arena';other.x=3400;other.y=3000;other.runStartedAt=0;
 const alternative=structuredClone(a);alternative.players[1].x=1600;alternative.players[1].y=2000;
 advance(a,100);advance(alternative,100);
 assert.deepEqual(a.bots,alternative.bots,'hidden coordinates must not alter pursuit or fitness');
 assert.ok(a.bots.some(b=>Math.hypot(b.vx,b.vy)>0));
 p.vx=0;p.vy=0;advance(a,150);assert.ok(a.bots.every(b=>b.vx===0&&b.vy===0));
});
test('motion senses realized velocity: pushing a wall does not create movement',()=>{
 const a=createArena(0,'motion'),p=runner(a);p.x=FIELD.max-28;p.y=3000;
 applyCommands(a,p,[command(1,0,1,0)],100,[]);assert.equal(p.vx,0);assert.equal(p.vy,0);
 advance(a,110);assert.ok(a.bots.every(b=>b.vx===0&&b.vy===0));
});
test('motion collection is personal and cannot complete a mission without reaching an exit',()=>{
 const a=createArena(0,'motion'),p=runner(a),q=join(a,'two','secret2','Other',0);parkBots(a);
 p.x=RESOURCE.x;p.y=RESOURCE.y;const finished=[];
 applyCommands(a,p,[command(1,0,0,0)],100,finished);
 assert.equal(p.carrying,true);assert.ok(!q.carrying);assert.equal(finished.length,0);assert.equal(p.phase,'arena');
});
test('each extraction gate requires a seed and records one success with an old-life barrier',()=>{
 for(const [x,y] of [[3000,1250],[4750,3000],[3000,4750],[1250,3000]]){
  const a=createArena(0,'motion'),p=runner(a);parkBots(a);p.x=x;p.y=y;const finished=[];
  missionProgress(a,p,1000,finished);assert.equal(p.phase,'arena');assert.equal(finished.length,0);
  p.carrying=true;missionProgress(a,p,1000,finished);assert.equal(p.phase,'safe');assert.equal(p.carrying,false);assert.equal(p.life,1);assert.equal(p.scores.bestMs,1000);assert.equal(p.lastDeath.bot,-1);assert.equal(finished.length,1);assert.equal(a.totalTags,0);
  missionProgress(a,p,1100,finished);applyCommands(a,p,[command(1,0,0,-1)],1200,finished);assert.equal(finished.length,1);assert.equal(p.phase,'safe');
 }
});
test('motion capture loses cargo and does not replace fastest extraction',()=>{
 const a=createArena(0,'motion'),p=runner(a);parkBots(a);p.carrying=true;p.scores.bestMs=900;a.bots[0].x=p.x;a.bots[0].y=p.y;
 advance(a,1200);assert.equal(p.phase,'safe');assert.equal(p.carrying,false);assert.equal(p.scores.bestMs,900);assert.equal(p.lastDeath.bot,0);assert.equal(a.bots[0].fitness,0,'stationary contact does not train pursuit');
});
test('motion extraction waits while a visible contact report is being resolved',()=>{
 const a=createArena(0,'motion'),p=runner(a);parkBots(a);p.x=3000;p.y=4750;p.carrying=true;const finished=[];
 applyCommands(a,p,[command(1,0,0,0)],1000,finished,false);assert.equal(p.phase,'arena');assert.equal(finished.length,0);
 applyCommands(a,p,[command(2,0,0,0)],1100,finished,true);assert.equal(p.phase,'safe');assert.equal(finished.length,1);
});
test('motion contact still requires an issued visible frame and records once',()=>{
 const a=createArena(0,'motion'),p=runner(a);parkBots(a);p.contactMode='visible-v1';p.carrying=true;a.bots[0].x=p.x+20;a.bots[0].y=p.y;
 advance(a,100);assert.equal(p.life,0);const frame=rememberContactFrame(a,p,100),finished=[];
 const report={frameId:frame,life:0,seq:0,bot:0,age:0,x:p.x,y:p.y,bx:a.bots[0].x,by:a.bots[0].y};
 assert.equal(confirmContact(a,p,report,100,finished).status,'confirmed');assert.equal(p.carrying,false);assert.equal(p.life,1);assert.equal(finished.length,1);
 confirmContact(a,p,report,120,finished);assert.equal(finished.length,1);
});

test('motion capture rewards use private observed motion even after a stop packet',()=>{
 const a=createArena(0,'motion'),p=runner(a);parkBots(a);p.contactMode='visible-v1';p.vx=255;a.bots[0].x=p.x+20;a.bots[0].y=p.y;
 const frame=rememberContactFrame(a,p,100);applyCommands(a,p,[],110,[]);assert.equal(p.vx,0);
 const report={frameId:frame,life:0,seq:0,bot:0,age:0,x:p.x,y:p.y,bx:a.bots[0].x,by:a.bots[0].y};
 assert.equal(confirmContact(a,p,report,120,[]).status,'confirmed');assert.equal(a.bots[0].fitness,50);
 assert.ok(!JSON.stringify(snapshot(a)).includes('moving'),'issued movement observation stays private');
});

test('nursery selection follows elliptical floor pads, not surrounding specimens or labels',()=>{
 assert.equal(menuZone({x:34,y:63}),'survival');assert.equal(menuZone({x:66,y:63}),'motion');
 for(const p of [{x:50,y:68.5},{x:34,y:27},{x:66,y:27},{x:42,y:70},{x:58,y:56},{x:34,y:72}])assert.equal(menuZone(p),null);
 assert.equal(menuZone({x:34,y:70}),'survival');
});

const {readGameStorage,clearGameSession}=await import(pathToFileURL(`${out}/browser-storage.mjs`));
function memoryStorage(entries){
 const values=new Map(entries);
 return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
}
test('renaming the game preserves existing profile, name and session values',()=>{
 for(const [key,value] of [['profile','saved-score-identity'],['name','Runner'],['session','{"id":"existing","mode":"motion"}']]){
  const storage=memoryStorage([[`pursuit-${key}`,value]]);
  assert.equal(readGameStorage(storage,key),value);
  assert.equal(storage.getItem(`immunity-${key}`),value);
  assert.equal(storage.getItem(`pursuit-${key}`),value,'existing tabs retain their storage');
 }
});
test('current saved values take precedence over legacy browser storage',()=>{
 const storage=memoryStorage([['immunity-profile','current'],['pursuit-profile','legacy'],['immunity-name',''],['pursuit-name','old name']]);
 assert.equal(readGameStorage(storage,'profile'),'current');
 assert.equal(readGameStorage(storage,'name'),'');
 assert.equal(readGameStorage(storage,'session'),null);
});
test('leaving clears both session keys so a legacy session cannot be restored',()=>{
 const storage=memoryStorage([['immunity-session','current'],['pursuit-session','legacy'],['immunity-profile','saved-score-identity']]);
 clearGameSession(storage);
 assert.equal(readGameStorage(storage,'session'),null);
 assert.equal(readGameStorage(storage,'profile'),'saved-score-identity');
});

test('completed generation records actual population mean before fitness resets',()=>{
 const a=createArena(1000);a.obstacles=[];
 const p=join(a,'runner','token','Runner',1000);p.phase='arena';p.x=1500;p.y=1500;p.runStartedAt=1000;
 // Keep all seeds dormant so this step cannot change the assigned rewards.
 a.bots.forEach((b,i)=>{b.fitness=i-12;b.spawnWait=3;});
 a.elapsed=ROUND-.01;advance(a,1034);
 assert.equal(a.generation,2);assert.equal(a.history[0].fitness,11);assert.equal(a.history[0].meanFitness,-.5);
 assert.ok(a.bots.every(b=>b.fitness===0));assert.equal(snapshot(a).history[0].meanFitness,-.5);
});

test('training metrics preserve negative fitness, separate provisional results and keep old history usable',async()=>{
 const {trainingMetrics,fitnessPlot}=await import(pathToFileURL(`${out}/training-metrics.mjs`));
 const history=[{generation:6,fitness:-4,tags:0},{generation:7,fitness:-2,meanFitness:-8,tags:3}];
 const bots=[{id:2,fitness:-9,tags:0},{id:1,fitness:-3,tags:1},{id:0,fitness:-3,tags:2}];
 const m=trainingMetrics(history,bots,45);
 assert.equal(m.best,-3);assert.equal(m.average,-5);assert.equal(m.change,2);assert.equal(m.capturesPerMinute,4);assert.equal(m.captures,3);
 assert.deepEqual(m.leaders.map(b=>b.id),[0,1,2]);assert.deepEqual(bots.map(b=>b.id),[2,1,0]);
 const plot=fitnessPlot(history);assert.equal(plot.min,-8);assert.equal(plot.means.length,1);assert.ok(plot.means[0].startsWith('268,'));
 assert.ok(!plot.best.includes('NaN'));assert.equal(history[0].meanFitness,undefined);
 const empty=trainingMetrics([],[],45);assert.equal(empty.best,null);assert.equal(empty.average,null);assert.equal(empty.change,null);assert.equal(empty.capturesPerMinute,null);
 assert.equal(fitnessPlot([]).points.length,0);assert.equal(trainingMetrics(history.slice(0,1),bots,45).change,null);
});

test('best completed generation uses actual fitness and keeps the earliest tied generation',async()=>{
 const {bestCompletedGeneration,trainingMetrics}=await import(pathToFileURL(`${out}/training-metrics.mjs`));
 assert.equal(bestCompletedGeneration([]),null);
 const history=[{generation:8,fitness:-2,tags:0},{generation:4,fitness:-2,tags:0},{generation:9,fitness:-10,tags:0}];
 assert.equal(bestCompletedGeneration(history).generation,4);
 const record={generation:1,fitness:50,tags:1};
 assert.deepEqual(trainingMetrics(history,[],45,record).bestGeneration,record);
 assert.deepEqual(history.map(h=>h.generation),[8,4,9]);
});

test('best generation survives history rollover, upgrades legacy worlds and advances only for a better result',()=>{
 const a=createArena(1000);a.obstacles=[];a.generation=41;
 a.history=Array.from({length:40},(_,i)=>({generation:i+1,fitness:i===0?100:2,tags:0}));
 delete a.bestGeneration;
 const learned=JSON.stringify(a.bots.map(b=>b.genome));
 upgradeArena(a,1000);assert.equal(a.bestGeneration.generation,1);assert.equal(a.bestGeneration.fitness,100);
 assert.equal(JSON.stringify(a.bots.map(b=>b.genome)),learned);
 const p=join(a,'runner','token','Runner',1000);p.phase='arena';p.x=1500;p.y=1500;p.runStartedAt=1000;
 a.bots.forEach(b=>{b.fitness=10;b.spawnWait=3;});a.elapsed=ROUND-.01;advance(a,1034);
 assert.equal(a.history.length,40);assert.equal(a.history[0].generation,2);assert.equal(snapshot(a).bestGeneration.generation,1);
 const restored=upgradeArena(JSON.parse(JSON.stringify(a)),1034);
 assert.equal(snapshot(restored).bestGeneration.generation,1,'saved record survives loading');
 restored.bots.forEach(b=>{b.fitness=101;b.spawnWait=3;});restored.elapsed=ROUND-.01;advance(restored,1068);
 assert.equal(restored.bestGeneration.generation,42);assert.equal(restored.bestGeneration.fitness,101);
 const motion=createArena(1000,'motion');assert.equal(snapshot(motion).bestGeneration,null,'mode records remain independent');
});
