import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const base=process.env.ARENA_TEST_URL||'http://127.0.0.1:5173';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname),'fixture is local only');
const profileToken=crypto.randomUUID();let session;
async function post(body){const r=await fetch(base+'/api/arena',{method:'POST',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.token}:{})},body:JSON.stringify({...body,profileToken})});return {status:r.status,data:await r.json()};}
function sql(command){execFileSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--command',command],{stdio:'pipe'});}
try{
 const j=await post({action:'join',name:'Respawn regression'});assert.equal(j.status,200);session=j.data.session;
 // Local-only setup for a moving bot with a deterministic velocity.
 const world=await(await fetch(base+'/api/arena')).json(),i=world.players.findIndex(p=>p.id===session.id),p=`$.players[${i}]`,now=Date.now();
 const genes=JSON.stringify([{from:10,to:11,weight:Math.atanh(-100/290),enabled:true}]);
 sql(`UPDATE arena SET revision=revision+1,state=json_set(state,'${p}.x',3000,'${p}.y',3000,'${p}.phase','arena','${p}.runStartedAt',${now-8000},'${p}.runId','${crypto.randomUUID()}','${p}.lastSeen',${now},'$.time',${now+5000},'$.bots[0].vx',-100,'$.bots[0].vy',0,'$.bots[0].x',3080,'$.bots[0].y',3000,'$.bots[0].genome.genes',json('${genes}')) WHERE id='shared'`);
 const observed=await post({action:'input',commands:[]});assert.equal(observed.status,200);
 const player=observed.data.players.find(p=>p.id===session.id),bot=observed.data.bots[0];assert.equal(player.phase,'arena');
 // Report a valid visual overlap, then move the real bot away before delivery.
 const age=Math.max(0,(bot.x-player.x-20)/100);assert.ok(age<=1.4,`fixture age ${age}`);
 const report={frameId:observed.data.personal.contactFrame,life:player.life,seq:player.ack,bot:0,age,x:player.x,y:player.y,bx:bot.x+bot.vx*age,by:bot.y};
 sql("UPDATE arena SET revision=revision+1,state=json_set(state,'$.bots[0].x',1800,'$.bots[0].y',1800) WHERE id='shared'");
 const dead=await post({action:'input',commands:[],contact:report});assert.equal(dead.status,200);assert.equal(dead.data.contactReply.status,'confirmed');
 const respawned=dead.data.players.find(p=>p.id===session.id);assert.equal(respawned.life,player.life+1);assert.equal(respawned.phase,'safe');assert.equal(respawned.runStartedAt,null);assert.ok(respawned.x<1200||respawned.x>4800||respawned.y<1200||respawned.y>4800);
 const run=dead.data.personal.lastDeath;
 const duplicate=await post({action:'input',commands:[],contact:report});assert.equal(duplicate.data.contactReply.status,'confirmed');assert.equal(duplicate.data.personal.lastDeath.id,run.id);assert.equal(duplicate.data.players.find(p=>p.id===session.id).life,respawned.life);
 const stale=await post({action:'input',commands:[{seq:player.ack+1,life:player.life,dt:1/60,x:0,y:-1,dash:true}]});const stable=stale.data.players.find(p=>p.id===session.id);
 assert.equal(stable.phase,'safe');assert.equal(stable.runStartedAt,null);assert.equal(stable.x,respawned.x);assert.equal(stable.y,respawned.y);
 const saved=await(await fetch(base+'/api/arena?scores=1',{headers:{Authorization:'Bearer '+profileToken}})).json();assert.equal(saved.runs.filter(r=>r.id===run.id).length,1);
 const malformed=await post({action:'input',commands:[],contact:{...report,age:99}});assert.equal(malformed.status,400);
 console.log('PASS: moving-contact report, atomic death/outside respawn, stopped clock, persisted score, retry idempotency, old-life input rejection and invalid-report validation.');
}finally{if(session)await post({action:'leave'});}
