import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import {readFileSync,mkdirSync,writeFileSync,copyFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const out=path.resolve('.sites-runtime/training-tests');mkdirSync(out,{recursive:true});
const modules=['film-store','behavior-film','motion-observation','training-checkpoints','training-metrics','game-mode','physics','evolution','arena','contact-report','collision-effects','net-motion','admin-auth','training-http'];
for(const name of modules){
 let code=ts.transpileModule(readFileSync(`lib/${name}.ts`,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
 for(const dep of modules)code=code.replaceAll(`'./${dep}'`,`'./${dep}.mjs'`);
 writeFileSync(`${out}/${name}.mjs`,code);
}
copyFileSync('lib/admin-password.mjs',`${out}/admin-password.mjs`);
const load=name=>import(pathToFileURL(`${out}/${name}.mjs`));
const {createArena,advance,join,snapshot,upgradeArena,resetTraining,ROUND}=await load('arena');
const {checkpoint,parseTrainingArtifact,queueTraining,trainingBoundary,MAX_IMPORT_BYTES}=await load('training-checkpoints');
const {breed}=await load('evolution');
const {fitnessPlot,trainingMetrics}=await load('training-metrics');
const {hashAdminPassword,verifyAdminPassword,secretDigest}=await load('admin-password');
const {requireSameOrigin,sessionCookie,AdminError,adminSession}=await load('admin-auth');
const {boundedJson}=await load('training-http');
function active(a){const p=join(a,'runner','secret','Test runner',0,'private-profile',{bestMs:123,runs:[]});p.phase='arena';p.x=1000;p.y=1000;for(const b of a.bots){b.x=4000;b.y=4000;b.spawnWait=10;}return p;}
function finish(a,now=100){a.elapsed=ROUND-.001;const writes=[];advance(a,now,[],writes);return writes;}
test('best model follows the all-time record, survives later worse generations and does not alias live genomes',()=>{
 const a=createArena(0);active(a);a.bots[0].fitness=100;finish(a);
 assert.equal(a.bestModel.generation,1);assert.equal(a.bestModel.genomes[0].fitness,100);
 const saved=structuredClone(a.bestModel);for(const b of a.bots)b.fitness=-20;finish(a,200);
 assert.deepEqual(a.bestModel,saved);assert.equal(a.champion.fitness,-20);a.bots[0].genome.genes[0].weight=4;
 assert.deepEqual(a.bestModel,saved);assert.equal(snapshot(a).training.bestModelAvailable,true);
});
test('legacy best export recovers only when the retained champion matches the record',()=>{
 const a=createArena(0);active(a);finish(a);delete a.bestModel;
 assert.ok(upgradeArena(structuredClone(a),100).bestModel);
 a.bestGeneration={generation:1,fitness:100,tags:0};a.generation=3;
 assert.equal(upgradeArena(a,100).bestModel,undefined);
});
test('checkpoint preserves the complete population and deterministic evolution state',()=>{
 const a=createArena(0);active(a);const writes=finish(a),file=writes.find(w=>w.slot==='latest').artifact;
 assert.equal(file.generation,2);assert.equal(file.genomes.length,24);assert.deepEqual(parseTrainingArtifact(file,'survival'),file);
 const original=breed(structuredClone(a.bots.map(b=>b.genome)),structuredClone(a.evolution));
 const restored=breed(structuredClone(file.genomes),structuredClone(file.evolution));assert.deepEqual(restored,original);
 file.genomes[0].genes[0].weight=5;assert.notDeepEqual(file.genomes[0],a.bots[0].genome);
});
test('imports reject wrong modes, unknown fields, invalid population, cycles, missing outputs and bad evolution identifiers',()=>{
 const file=checkpoint(createArena(0),0);
 const bad=[f=>f.mode='motion',f=>f.format='other',f=>f.rules='other',f=>f.players=[],f=>f.genomes.pop(),f=>f.genomes[0].nodes.pop(),f=>f.genomes[0].nodes.push({...f.genomes[0].nodes[0]}),f=>f.genomes[0].genes[0].weight=Infinity,f=>f.genomes[0].genes[0].from=999,f=>f.genomes[0].genes.push({...f.genomes[0].genes[0]}),f=>f.genomes[0].genes[0].from=12,f=>f.evolution.nextNode=12,f=>f.evolution.splits={'11:11':13},f=>f.evolution.splits={'0:11':999}];
 for(const change of bad){const invalid=structuredClone(file);change(invalid);assert.throws(()=>parseTrainingArtifact(invalid,'survival'));}
});
test('queue waits for a boundary and active play, applies once, preserves players, scores and historical records',()=>{
 const a=createArena(0),file=checkpoint(createArena(0),0);file.genomes[0].genes[0].weight=4.5;
 queueTraining(a,file,'import','operation-1',0);advance(a,100);assert.equal(a.training.branch,1);assert.ok(a.training.pending);
 const p=active(a);p.lastSeen=100;const profile=p.profileId,scores=structuredClone(p.scores);a.history=[{generation:0,fitness:200,tags:1}];a.bestGeneration=a.history[0];
 const writes=finish(a,200);assert.equal(a.training.branch,2);assert.equal(a.training.pending,null);assert.equal(a.bots[0].genome.genes[0].weight,4.5);
 assert.equal(a.players[0].profileId,profile);assert.deepEqual(a.players[0].scores,scores);assert.equal(a.bestGeneration.fitness,200);assert.equal(a.history.length,2);
 assert.deepEqual(writes.map(w=>w.slot),['rollback','latest']);assert.equal(a.training.events.length,1);
 const again=finish(a,300);assert.equal(a.training.events.length,1);assert.deepEqual(again.map(w=>w.slot),['latest']);assert.equal(a.history.at(-1).branch,2);
});
test('rollback restores the pre-import population and retains the replaced population as a new backup',()=>{
 const a=createArena(0),original=checkpoint(a,0),imported=structuredClone(original);imported.genomes[0].genes[0].weight=4.5;
 queueTraining(a,imported,'import','one',0);const writes=[];trainingBoundary(a,100,writes);
 queueTraining(a,writes[0].artifact,'rollback','two',200);const rollback=[];trainingBoundary(a,200,rollback);
 assert.deepEqual(a.bots.map(b=>b.genome),original.genomes);assert.deepEqual(a.evolution,original.evolution);
 assert.equal(rollback[0].artifact.genomes[0].genes[0].weight,4.5);assert.equal(a.training.branch,3);assert.equal(a.training.events.at(-1).kind,'rollback');
});
test('champion imports seed one preserved model plus mutations without trusting claimed fitness',()=>{
 const a=createArena(0),file=checkpoint(a,0);file.kind='champion';file.genomes=file.genomes.slice(0,1);file.genomes[0].fitness=999999;
 queueTraining(a,file,'import','champion',0);trainingBoundary(a,100,[]);
 assert.deepEqual(a.bots[0].genome,{...file.genomes[0],fitness:0});assert.ok(a.bots.some(b=>JSON.stringify(b.genome)!==JSON.stringify(a.bots[0].genome)));
 assert.equal(a.bestGeneration,null);assert.ok(a.bots.every(b=>b.fitness===0&&b.genome.fitness===0));
});
test('queued payloads and private player data never appear in public snapshots or exports',()=>{
 const a=createArena(0);active(a);queueTraining(a,checkpoint(a,0),'import','one',0);
 const view=JSON.stringify(snapshot(a)),file=JSON.stringify(checkpoint(a,0));
 for(const text of [view,file])for(const secret of ['private-profile','"token"','"contactFrames"','"profileId"'])assert.ok(!text.includes(secret));
 assert.ok(!view.includes('"genomes"'));assert.ok(!view.includes('"evolution"'));assert.ok(!file.includes('"players"'));
 assert.throws(()=>queueTraining(a,checkpoint(a,0),'import','two',0),/already queued/);
});
test('chart segments and change metrics do not imply uninterrupted progress across imports',()=>{
 const history=[{generation:1,fitness:10,meanFitness:2,tags:0},{generation:2,fitness:20,meanFitness:3,tags:0,branch:2}];
 const plot=fitnessPlot(history);assert.equal(plot.bestSegments.length,2);assert.equal(plot.means.length,2);assert.equal(plot.branches.length,1);assert.equal(trainingMetrics(history,[],45).change,null);
});
test('admin passwords use salted hashes and reject wrong or malformed credentials',async()=>{
 const password='disposable test passphrase only',hash=await hashAdminPassword(password);
 assert.notEqual(hash,await hashAdminPassword(password));assert.equal(await verifyAdminPassword(password,hash),true);assert.equal(await verifyAdminPassword('incorrect password here',hash),false);assert.equal(await verifyAdminPassword(password,'bad'),false);
 await assert.rejects(hashAdminPassword('short'));
});
test('admin mutations reject missing, foreign and insecure origins and issue scoped HTTP-only cookies',()=>{
 const make=(url,origin)=>new Request(url,{method:'POST',headers:{...(origin?{Origin:origin}:{}),'Content-Type':'application/json'}});
 assert.throws(()=>requireSameOrigin(make('https://game.example/api/training',undefined)),AdminError);
 assert.throws(()=>requireSameOrigin(make('https://game.example/api/training','https://other.example')),AdminError);
 assert.throws(()=>requireSameOrigin(make('http://game.example/api/training','http://game.example')),AdminError);
 requireSameOrigin(make('http://127.0.0.1/api/training','http://127.0.0.1'));
 const cookie=sessionCookie(new Request('https://game.example'),'token');assert.match(cookie,/__Host-/);assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Strict/);assert.match(cookie,/; Secure/);assert.match(cookie,/Max-Age=1800/);
});
test('streamed upload size is bounded before parsing and malformed JSON fails clearly',async()=>{
 const request=text=>new Request('http://127.0.0.1',{method:'POST',body:text});
 await assert.rejects(boundedJson(request('x'.repeat(MAX_IMPORT_BYTES+1)),MAX_IMPORT_BYTES),e=>e.status===413);
 await assert.rejects(boundedJson(request('{'),100),e=>e.status===400);
 await assert.rejects(boundedJson(request('[]'),100),e=>e.status===400);
 assert.deepEqual(await boundedJson(request('{"ok":true}'),100),{ok:true});
});

test('unconfigured admin and password rotation invalidate existing sessions',async()=>{
 const hash=await hashAdminPassword('disposable admin test password'),token='a'.repeat(64);
 const state={fingerprint:secretDigest(hash),attempts:[],sessions:[{hash:secretDigest(token),expires:Date.now()+60000}]};
 const db={prepare:()=>({bind:()=>({first:async()=>({state:JSON.stringify(state)})})})};
 const request=new Request('https://game.example/api/training',{headers:{Cookie:`__Host-immunity_admin=${token}`}});
 assert.ok(await adminSession(db,request,hash));assert.equal(await adminSession(db,request,undefined),null);
 assert.equal(await adminSession(db,request,await hashAdminPassword('a different admin test password')),null);
 state.sessions[0].expires=0;assert.equal(await adminSession(db,request,hash),null);
});

test('history-controller checkpoints preserve three outputs and reject legacy Motion Hunt artifacts',()=>{
 const a=createArena(0,'motion'),file=checkpoint(a,0);
 assert.equal(file.rules,'immunity-motion-history-v1');assert.deepEqual(parseTrainingArtifact(file,'motion'),file);
 const old=structuredClone(file);old.rules='immunity-pursuit-v1';assert.throws(()=>parseTrainingArtifact(old,'motion'),/incompatible observations/);
 const wrong=structuredClone(file);delete wrong.genomes[0].outputs;assert.throws(()=>parseTrainingArtifact(wrong,'motion'),/outputs/);
 const output=structuredClone(file);output.genomes[0].nodes.find(n=>n.id===13).depth=.5;assert.throws(()=>parseTrainingArtifact(output,'motion'),/nodes/);
 const e=structuredClone(a.evolution);let genomes=structuredClone(file.genomes);
 for(let i=0;i<20;i++){genomes.forEach((g,j)=>g.fitness=j);genomes=breed(genomes,e).genomes;}
 const evolved={...file,genomes,evolution:e};assert.deepEqual(parseTrainingArtifact(evolved,'motion'),evolved);
 a.motionHistory={old:{life:0,samples:[{at:0,x:100,y:100}]}};
 queueTraining(a,file,'import','motion-import',0);trainingBoundary(a,100,[]);assert.deepEqual(a.motionHistory,{});
});

for(const mode of ['survival','motion'])test(`${mode} admin reset restarts training and preserves lives, scores, terrain and a recoverable population`,()=>{
 const a=createArena(0,mode),p=active(a);p.lastSeen=100;
 finish(a,100);a.bots[0].genome.genes[0].weight=4.321;a.bots[0].fitness=99;
 p.carrying=true;p.runStartedAt=80;p.runId='active-run';p.contactFrames=[{id:'old-population'}];
 if(mode==='motion'){a.motionHistory={old:{life:0,samples:[]}};a.detection={truePositive:10,trueNegative:20,falsePositive:3,falseNegative:4};}
 const players=structuredClone(a.players).map(p=>({...p,contactFrames:[]})),terrain=structuredClone(a.obstacles),before=checkpoint(a,200),branch=a.training.branch;
 const writes=resetTraining(a,200);
 assert.equal(a.generation,1);assert.equal(a.elapsed,0);assert.equal(a.totalTags,0);assert.equal(a.roundTags,0);assert.equal(a.species,1);
 assert.deepEqual(a.history,[]);assert.equal(a.champion,null);assert.equal(a.bestModel,undefined);assert.equal(a.bestGeneration,null);
 assert.deepEqual(a.players,players);assert.deepEqual(a.obstacles,terrain);
 assert.equal(a.bots.length,24);assert.ok(a.bots.every(b=>b.fitness===0&&b.tags===0&&b.genome.fitness===0&&b.spawnWait===3));
 assert.notDeepEqual(a.bots.map(b=>b.genome),before.genomes);
 assert.deepEqual(writes[0],{slot:'rollback',artifact:before});assert.deepEqual(writes[1],{slot:'latest',artifact:checkpoint(a,200)});
 assert.equal(a.training.branch,branch+1);assert.equal(a.training.rollbackGeneration,before.generation);assert.equal(a.training.checkpointGeneration,1);assert.equal(a.training.events.at(-1).kind,'reset');
 assert.deepEqual(upgradeArena(structuredClone(a),300).history,[]);
 if(mode==='motion'){assert.deepEqual(a.motionHistory,{});assert.deepEqual(a.detection,createArena(0,mode).detection);}
 queueTraining(a,writes[0].artifact,'rollback','recover',300);trainingBoundary(a,300,[]);
 assert.deepEqual(a.bots.map(b=>b.genome),before.genomes);assert.deepEqual(a.evolution,before.evolution);
});
test('reset rejects a queued change without changing any world state',()=>{
 const a=createArena(0);queueTraining(a,checkpoint(a,0),'import','queued',0);const before=structuredClone(a);
 assert.throws(()=>resetTraining(a,100),/Cancel the queued/);assert.deepEqual(a,before);
});

const {recordFilm,finishFilm,filmFrame,filmSummary,orderedFilm,FILM_MAX_FRAMES}=await load('behavior-film');
const {filmStatements,filmKey,listFilm}=await load('film-store');
function observed(mode='survival'){
 const a=createArena(0,mode),p=active(a);p.x=3000;p.y=3200;p.vx=100;
 for(const b of a.bots){b.x=3000;b.y=3000;b.spawnWait=0;}
 return {a,p};
}
test('real-session recorder keeps bounded windows, records positions without identities and never mutates training',()=>{
 const {a,p}=observed();
 for(let i=0;i<225;i++){a.elapsed=i*.2;p.x=3000+i;recordFilm(a,i*200);}
 assert.ok(a.film.ring.length<=FILM_MAX_FRAMES);assert.ok(a.film.best.length<=FILM_MAX_FRAMES);assert.ok(Object.keys(a.film.slots).length<=12);
 const before=structuredClone(a);delete before.film;
 recordFilm(a,45000);const after=structuredClone(a);delete after.film;assert.deepEqual(after,before);
 const writes=[];finishFilm(a,45000,writes);assert.equal(a.film,undefined);assert.equal(writes.length,1);
 const clip=writes[0];assert.ok(filmSummary('',clip).duration<=10);assert.equal(clip.generation,1);assert.equal(clip.mode,'survival');
 assert.ok(clip.frames.every(f=>f.players.every(v=>v[1]===3000+f.t/200)));
 const text=JSON.stringify(clip);for(const secret of ['Test runner','private-profile','secret','runner','contactFrames','scores','genome','slots'])assert.ok(!text.includes(secret),secret);
 assert.ok(!('film' in snapshot(a)));clip.obstacles[0].r=999;assert.notEqual(a.obstacles[0].r,999);
});
test('confirmed capture outranks other windows and stores observed contact before the respawn',()=>{
 const {a,p}=observed();
 for(let i=0;i<60;i++){a.elapsed=i*.2;p.x=3200+i;recordFilm(a,i*200);}
 const b=a.bots[0];recordFilm(a,12000,{player:p,bot:b,x:3500,y:3200,bx:3520,by:3200});
 for(let i=60;i<225;i++){a.elapsed=i*.2;p.x=3800;recordFilm(a,i*200);}
 const writes=[];finishFilm(a,45000,writes);const frames=writes[0].frames,event=frames.find(f=>f.capture);
 assert.ok(event);assert.deepEqual(event.players.find(v=>v[0]===event.capture.survivor).slice(1),[3500,3200]);assert.deepEqual(event.bots[0].slice(1,3),[3520,3200]);
 assert.ok(frames.every((f,i)=>!i||f.t>frames[i-1].t));
});
test('films survive serialization, separate lives/modes/branches, and cannot span imports or resets',()=>{
 const {a,p}=observed('motion');recordFilm(a,0);a.elapsed=.3;p.x+=20;recordFilm(a,300);
 const restored=JSON.parse(JSON.stringify(a));assert.deepEqual(restored.film,a.film);
 const original=restored.film.ring[0].players[0][0];restored.players[0].life++;restored.elapsed=.6;recordFilm(restored,600);
 assert.notEqual(restored.film.ring.at(-1).players[0][0],original);
 restored.training??={branch:1};restored.training.branch=2;restored.elapsed=.9;recordFilm(restored,900);assert.equal(restored.film.ring.length,1);assert.equal(restored.film.branch,2);
 assert.ok(!('film' in snapshot(restored)));const before=restored.film;restored.generation=3;recordFilm(restored,1000);assert.notEqual(restored.film,before);
});
test('completed generations emit immutable highlights before breeding and imports; paused training emits none',()=>{
 const {a,p}=observed();a.training??={branch:1};
 a.elapsed=44;p.contactMode='visible-v1';recordFilm(a,0);a.elapsed=44.3;recordFilm(a,300);
 const writes=[],training=[];a.elapsed=ROUND-.001;advance(a,100,[],training,writes);
 assert.equal(writes.length,1);assert.equal(writes[0].generation,1);assert.equal(writes[0].branch,1);assert.equal(a.generation,2);assert.equal(writes[0].partial,true);
 const empty=createArena(0);const no=[];advance(empty,100,[],[],no);assert.equal(no.length,0);assert.equal(empty.film,undefined);
 const serialized=JSON.stringify(writes[0]);a.bots[0].x=4000;assert.equal(JSON.stringify(writes[0]),serialized);
});
test('replay interpolation does not join separate lives or interpolate long observation gaps; chronology survives resets',()=>{
 const {a}=observed();recordFilm(a,0);a.elapsed=.2;a.players[0].x+=40;recordFilm(a,200);const writes=[];finishFilm(a,200,writes);const clip=writes[0];
 assert.equal(filmFrame(clip,.1).players[0][1],3020);
 clip.frames[1].players[0][0]=99;assert.equal(filmFrame(clip,.1).players[0][1],3000);
 clip.frames[1].t=1000;assert.equal(filmFrame(clip,.5),clip.frames[0]);
 assert.deepEqual(orderedFilm([{generation:1,createdAt:200},{generation:77,createdAt:100}]).map(v=>v.generation),[77,1]);
});
test('highlight writes are immutable and guarded by the winning world commit; listing is mode-isolated and paginated',async()=>{
 const {DatabaseSync}=await import('node:sqlite'),sql=new DatabaseSync(':memory:');
 sql.exec('CREATE TABLE arena(id TEXT PRIMARY KEY,revision INTEGER NOT NULL,state TEXT NOT NULL)');
 const db={prepare(query){return {bind(...args){return {run(){return sql.prepare(query).run(...args);},async all(){return {results:sql.prepare(query).all(...args)};}};}};}};
 const {a}=observed();recordFilm(a,0);a.elapsed=.2;recordFilm(a,200);const writes=[];finishFilm(a,200,writes);const clip=writes[0];
 sql.prepare('INSERT INTO arena VALUES(?,0,?)').run('shared',JSON.stringify({commitId:'winner'}));
 for(const s of filmStatements(db,'survival',[clip],'loser'))s.run();assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM arena').get().n,1);
 for(const s of filmStatements(db,'survival',[clip],'winner'))s.run();const saved=sql.prepare('SELECT state FROM arena WHERE id=?').get(filmKey(clip)).state;
 const changed=structuredClone(clip);changed.frames[0].bots[0][1]=0;for(const s of filmStatements(db,'survival',[changed],'winner'))s.run();assert.equal(sql.prepare('SELECT state FROM arena WHERE id=?').get(filmKey(clip)).state,saved);
 for(let i=1;i<55;i++){const item={...clip,createdAt:i*1000,generation:i};for(const s of filmStatements(db,'survival',[item],'winner'))s.run();}
 const page=await listFilm(db,'survival');assert.equal(page.clips.length,50);assert.ok(page.before);const older=await listFilm(db,'survival',page.before);assert.equal(older.clips.length,5);assert.equal(older.before,null);
 assert.equal((await listFilm(db,'motion')).clips.length,0);assert.equal(new Set([...page.clips,...older.clips].map(c=>c.id)).size,55);sql.close();
});
