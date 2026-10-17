import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const out=path.resolve('.sites-runtime/tests');mkdirSync(out,{recursive:true});
for(const name of ['physics','evolution','arena','prediction','net-motion','collision-effects','contact-prediction']){
  let code=ts.transpileModule(readFileSync(`lib/${name}.ts`,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
  for(const dep of ['physics','evolution','arena','prediction','net-motion','collision-effects','contact-prediction'])code=code.replaceAll(`'./${dep}'`,`'./${dep}.mjs'`);
  writeFileSync(`${out}/${name}.mjs`,code);
}
const {createArena,join,advance,applyCommands,snapshot,upgradeArena,ROUND,FIELD}=await import(pathToFileURL(`${out}/arena.mjs`));
const {inside,movePlayer}=await import(pathToFileURL(`${out}/physics.mjs`));
const {reconcile}=await import(pathToFileURL(`${out}/prediction.mjs`));
const {createEffects,updateEffects,cancelEffect,impactCamera,vanishing}=await import(pathToFileURL(`${out}/collision-effects.mjs`));
const {trackRemote,correctionFor,decayCorrection}=await import(pathToFileURL(`${out}/net-motion.mjs`));
const {activate,breed,mutate}=await import(pathToFileURL(`${out}/evolution.mjs`));
const {predictContact,contactResult}=await import(pathToFileURL(`${out}/contact-prediction.mjs`));
const command=(seq,life=0,x=0,y=-1)=>({seq,life,x,y,dt:1/60,dash:false});
function runner(a,now=0){const p=join(a,'one','secret','Runner',now,'profile');p.phase='arena';p.x=3000;p.y=3000;p.runStartedAt=now;p.runId='run-one';return p;}
function parkBots(a){for(const b of a.bots){b.x=1800;b.y=1800;for(const g of b.genome.genes)g.weight=0;}}
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
 const hit=predictContact(p,[{id:0}],positions,7,600,1600,36);
 assert.ok(hit);assert.equal(hit.run.durationMs,600);assert.equal(hit.run.generation,7);
 assert.equal(hit.event.x,p.x);assert.equal(hit.event.bx,track.x);assert.equal(hit.player.phase,'safe');assert.ok(!inside(hit.player.x,hit.player.y));
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
 assert.equal(predictContact(p,[{id:0}],positions,1,10,10,1),null);
 positions.get('b0').x=3028;
 assert.equal(predictContact({...p,phase:'safe'},[{id:0}],positions,1,10,10,1),null);
 assert.equal(predictContact(p,[{id:0}],positions,1,1501,1501,1),null);
});
test('a rejected prediction removes its effect and leaves server scores untouched',()=>{
 const a=createArena(0),p=runner(a,0),positions=new Map([['b0',trackRemote(undefined,{x:3028,y:3000,vx:0,vy:0},0,1,0,0)]]);
 const hit=predictContact(p,[{id:0}],positions,1,10,10,1);assert.ok(hit);
 assert.equal(contactResult(hit,{...p,ack:1},hit),'rejected');
 const effects=createEffects();updateEffects(effects,[],0,0);updateEffects(effects,[hit.event],10,10);cancelEffect(effects,hit.event);
 assert.equal(effects.active.length,0);assert.equal(p.scores.runs.length,0);assert.equal(a.totalTags,0);
 updateEffects(effects,[{...hit.event,id:'later-real-death'}],100,100);assert.equal(effects.active.length,1,'a real later death remains visible');
});
