import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const out=path.resolve('.sites-runtime/tests');mkdirSync(out,{recursive:true});
for(const name of ['physics','evolution','arena','prediction']){
  let code=ts.transpileModule(readFileSync(`lib/${name}.ts`,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
  for(const dep of ['physics','evolution','arena','prediction'])code=code.replaceAll(`'./${dep}'`,`'./${dep}.mjs'`);
  writeFileSync(`${out}/${name}.mjs`,code);
}
const {createArena,join,advance,applyCommands,snapshot,upgradeArena,ROUND,FIELD}=await import(pathToFileURL(`${out}/arena.mjs`));
const {inside,movePlayer}=await import(pathToFileURL(`${out}/physics.mjs`));
const {reconcile}=await import(pathToFileURL(`${out}/prediction.mjs`));
const {activate,breed,mutate}=await import(pathToFileURL(`${out}/evolution.mjs`));
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
