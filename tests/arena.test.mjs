import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const out=path.resolve('.sites-runtime/tests');mkdirSync(out,{recursive:true});
for(const name of ['evolution','arena']){
  const code=ts.transpileModule(readFileSync(`lib/${name}.ts`,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace("'./evolution'","'./evolution.mjs'");
  writeFileSync(`${out}/${name}.mjs`,code);
}
const {createArena,join,advance,snapshot,ROUND}=await import(pathToFileURL(`${out}/arena.mjs`));
const {activate,breed,mutate}=await import(pathToFileURL(`${out}/evolution.mjs`));
test('training pauses without humans and expires disconnected players',()=>{
 const a=createArena(0);advance(a,1000);assert.equal(a.elapsed,0);join(a,'one','secret','Runner',1000);advance(a,1100);assert.ok(a.elapsed>.09);advance(a,20000);assert.equal(a.players.length,0);const elapsed=a.elapsed;advance(a,30000);assert.equal(a.elapsed,elapsed);
});
test('movement is bounded, stale input stops, and snapshots never reveal tokens',()=>{
 const a=createArena(0);join(a,'one','secret','Runner',0);let p=a.players[0];p.ix=1;p.iy=1;const {x,y}=p;advance(a,200);assert.ok(Math.hypot(p.x-x,p.y-y)<=255*.2+.001);p.lastSeen=0;advance(a,1000);assert.equal(p.vx,0);assert.equal(p.vy,0);assert.ok(!JSON.stringify(snapshot(a)).includes('secret'));assert.ok(!('token' in snapshot(a).players[0]));
});
test('contact earns a reward once, respawns bot and grants player grace',()=>{
 const a=createArena(0);join(a,'one','secret','Runner',0);const p=a.players[0];p.invulnerable=0;const b=a.bots[0];b.x=p.x;b.y=p.y;advance(a,16);assert.equal(a.totalTags,1);assert.equal(p.tags,1);assert.ok(b.fitness>=49);assert.ok(Math.hypot(b.x-p.x,b.y-p.y)>100);assert.ok(p.invulnerable>0);
});
test('generation turnover preserves population, history and champion',()=>{
 const a=createArena(0);join(a,'one','secret','Runner',0);a.elapsed=ROUND-.01;advance(a,30);assert.equal(a.generation,2);assert.equal(a.bots.length,24);assert.equal(a.history.length,1);assert.ok(a.champion);assert.equal(a.elapsed,0);assert.ok(a.bots.every(b=>b.fitness===0));
});
test('topology mutation and breeding keep finite feed-forward networks',()=>{
 const a=createArena(0);let genomes=a.bots.map(b=>b.genome);let grew=false;
 for(let i=0;i<40;i++){genomes.forEach((g,j)=>{g.fitness=j;mutate(g,a.evolution);if(g.nodes.length>2)grew=true;for(const gene of g.genes){const from=g.nodes.find(n=>n.id===gene.from)?.depth||0,to=g.nodes.find(n=>n.id===gene.to)?.depth;assert.ok(from<to);}assert.ok(activate(g,Array(11).fill(.5)).every(Number.isFinite));});genomes=breed(genomes,a.evolution).genomes;assert.equal(genomes.length,24);}
 assert.ok(grew);
});
test('one arena holds multiple players but enforces capacity',()=>{
 const a=createArena(0);for(let i=0;i<12;i++)join(a,String(i),'token'+i,'Runner',0);assert.equal(snapshot(a).players.length,12);assert.throws(()=>join(a,'13','token13','Runner',0),/full/);
});
