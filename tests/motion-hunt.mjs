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
 console.log('PASS: mode isolation, invalid/cross-mode rejection, pickup, extraction, durable fastest success, contact cargo loss, retry/old-life barriers and rejoin.');
}finally{if(hunt)await post('motion',hunt,{action:'leave'});if(survival)await post('survival',survival,{action:'leave'});}
