import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const base=process.env.ARENA_TEST_URL||'http://127.0.0.1:5173';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname),'fixture is local only');
const profileToken=crypto.randomUUID();let hunt,survival;
async function post(mode,session,body){const r=await fetch(base+'/api/arena',{method:'POST',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.token}:{})},body:JSON.stringify({...body,mode,profileToken})});return {status:r.status,data:await r.json()};}
async function scores(mode){return (await fetch(base+'/api/arena?scores=1&mode='+mode,{headers:{Authorization:'Bearer '+profileToken}})).json();}
function sql(command){execFileSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--command',command],{stdio:'pipe'});}
try{
 const original=await post('survival',null,{action:'join',name:'Survival isolation'});assert.equal(original.status,200);survival=original.data.session;
 const joined=await post('motion',null,{action:'join',name:'Motion fixture',contactMode:'visible-v1'});assert.equal(joined.status,200);hunt=joined.data.session;
 assert.equal(joined.data.mode,'motion');assert.ok(!joined.data.players.some(p=>p.id===survival.id));assert.ok(!original.data.players.some(p=>p.id===hunt.id));
 assert.equal((await post('survival',hunt,{action:'input',commands:[]})).status,401);
 assert.equal((await post('invalid',null,{action:'join',name:'Invalid'})).status,400);
 assert.equal((await fetch(base+'/api/arena?mode=invalid')).status,400);
 // Exercise the one-time release upgrade through HTTP against disposable D1.
 const beforeSurvival=await (await fetch(base+'/api/arena?mode=survival')).json();
 sql(`UPDATE arena SET revision=revision+1,state=json_set(json_remove(state,'$.motionController'),'$.generation',77,'$.elapsed',20,'$.history',json('[{"generation":76,"fitness":999,"tags":2}]'),'$.champion',json('{}'),'$.bestModel',json('{}')) WHERE id='motion'`);
 const reset=await (await fetch(base+'/api/arena?mode=motion')).json();
 assert.equal(reset.controller,'motion-history-v1');assert.equal(reset.generation,1);assert.equal(reset.elapsed,0);assert.equal(reset.bestGeneration,null);assert.equal(reset.championAvailable,false);assert.deepEqual(reset.history,[]);
 assert.deepEqual(reset.players,joined.data.players,'reset preserves current player state');
 const afterSurvival=await (await fetch(base+'/api/arena?mode=survival')).json();
 for(const key of ['generation','elapsed','bots','history'])assert.deepEqual(afterSurvival[key],beforeSurvival[key],'Survival is untouched');
 sql(`UPDATE arena SET revision=revision+1,state=json_set(state,'$.generation',2) WHERE id='motion'`);
 assert.equal((await (await fetch(base+'/api/arena?mode=motion')).json()).generation,2,'reset marker is durable');
 assert.equal((await fetch(base+'/api/training/export?mode=motion&kind=champion')).status,409);
 const i=joined.data.players.findIndex(p=>p.id===hunt.id),p=`$.players[${i}]`,now=Date.now();
 sql(`UPDATE arena SET revision=revision+1,state=json_set(state,'${p}.x',3000,'${p}.y',2600,'${p}.phase','arena','${p}.runStartedAt',${now-8000},'${p}.runId','${crypto.randomUUID()}','${p}.lastSeen',${now},'$.time',${now+60000}) WHERE id='motion'`);
 const command={seq:1,life:0,x:0,y:0,dt:1/60,dash:false};
 const collected=await post('motion',hunt,{action:'input',commands:[command]});assert.equal(collected.status,200);assert.equal(collected.data.players.find(p=>p.id===hunt.id).carrying,true);
 sql(`UPDATE arena SET revision=revision+1,state=json_set(state,'${p}.y',4745) WHERE id='motion'`);
 const extracted=await post('motion',hunt,{action:'input',commands:[{...command,seq:2}]});assert.equal(extracted.status,200);
 const player=extracted.data.players.find(p=>p.id===hunt.id),run=extracted.data.personal.lastDeath;
 assert.equal(player.phase,'safe');assert.equal(player.life,1);assert.equal(player.carrying,false);assert.equal(run.bot,-1);
 assert.equal(extracted.data.personal.scores.bestMs,run.durationMs);
 const duplicate=await post('motion',hunt,{action:'input',commands:[{...command,seq:2},{...command,seq:3,y:-1}]});assert.equal(duplicate.data.personal.scores.runs.length,1);assert.equal(duplicate.data.players.find(p=>p.id===hunt.id).life,1);
 assert.equal((await scores('motion')).runs.filter(r=>r.id===run.id).length,1);assert.equal((await scores('survival')).runs.length,0);
 // Confirm a visible stationary contact while carrying, then restore both outcomes on rejoin.
 const current=Date.now();
 sql(`UPDATE arena SET revision=revision+1,state=json_set(state,'${p}.x',3000,'${p}.y',3000,'${p}.phase','arena','${p}.runStartedAt',${current-1000},'${p}.runId','${crypto.randomUUID()}','${p}.carrying',json('true'),'$.bots[0].x',3020,'$.bots[0].y',3000,'$.bots[0].spawnWait',0,'$.bots[0].vx',0,'$.bots[0].vy',0) WHERE id='motion'`);
 const frame=await post('motion',hunt,{action:'input',commands:[]});assert.equal(frame.data.players.find(p=>p.id===hunt.id).phase,'arena');
 const report={frameId:frame.data.personal.contactFrame,life:1,seq:3,bot:0,age:0,x:3000,y:3000,bx:3020,by:3000};
 const captured=await post('motion',hunt,{action:'input',commands:[],contact:report});assert.equal(captured.data.contactReply.status,'confirmed');assert.equal(captured.data.players.find(p=>p.id===hunt.id).carrying,false);assert.equal(captured.data.personal.scores.bestMs,run.durationMs);
 const saved=await scores('motion');assert.equal(saved.runs.length,2);assert.equal(saved.bestMs,run.durationMs);
 await post('motion',hunt,{action:'leave'});hunt=null;
 const restored=await post('motion',null,{action:'join',name:'Motion restored',contactMode:'visible-v1'});hunt=restored.data.session;assert.equal(restored.data.personal.scores.runs.length,2);assert.equal(restored.data.personal.scores.bestMs,run.durationMs);
 // A completed experimental generation exports the new compatible population.
 const detection={truePositive:60,trueNegative:30,falsePositive:5,falseNegative:5,partial:false};
 sql(`UPDATE arena SET revision=revision+1,state=json_set(state,'$.detection',json('${JSON.stringify(detection)}')) WHERE id='motion'`);
 assert.deepEqual((await (await fetch(base+'/api/arena?mode=motion')).json()).detection,detection);
 const ri=restored.data.players.findIndex(p=>p.id===hunt.id),rp=`$.players[${ri}]`,tick=Date.now();
 sql(`UPDATE arena SET revision=revision+1,state=json_set(state,'$.elapsed',44.99,'$.time',${tick-100},'${rp}.x',1500,'${rp}.y',1500,'${rp}.phase','arena','${rp}.lastSeen',${tick},'${rp}.runStartedAt',${tick}) WHERE id='motion'`);
 const boundary=await post('motion',hunt,{action:'input',commands:[]});assert.equal(boundary.status,200);
 assert.deepEqual(boundary.data.history.at(-1).detection,detection,'completed confusion counts survive the boundary');
 const persisted=await (await fetch(base+'/api/arena?mode=motion')).json();assert.deepEqual(persisted.history.at(-1).detection,detection);assert.deepEqual(persisted.detection,{truePositive:0,trueNegative:0,falsePositive:0,falseNegative:0,partial:false});
 const exported=await fetch(base+'/api/training/export?mode=motion&kind=checkpoint');assert.equal(exported.status,200);
 const file=await exported.json();assert.equal(file.rules,'immunity-motion-history-v1');assert.equal(file.genomes.length,24);assert.ok(file.genomes.every(g=>g.outputs===3));
 for(const key of ['players','motionHistory','contactFrames'])assert.ok(!JSON.stringify(file).includes('"'+key+'"'));
 console.log('PASS: one-time reset, Survival preservation, experimental checkpoint, persisted detection history and live reset, mode isolation, invalid/cross-mode rejection, pickup, extraction, durable fastest success, contact cargo loss, retry/old-life barriers and rejoin.');
}finally{if(hunt)await post('motion',hunt,{action:'leave'});if(survival)await post('survival',survival,{action:'leave'});}
