import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const base=process.env.ARENA_TEST_URL||'http://127.0.0.1:5173';
const sessions=[],profiles=[crypto.randomUUID(),crypto.randomUUID()];
async function post(body,token){const r=await fetch(base+'/api/arena',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
const command=(seq,life=0,x=1,y=0)=>({seq,life,x,y,dt:1/60,dash:false});
try{
 const joined=await Promise.all(['QA North','QA East'].map((name,i)=>post({action:'join',name,profileToken:profiles[i]})));
 for(const j of joined){assert.equal(j.status,200);sessions.push(j.data.session);assert.equal(j.data.players.find(p=>p.id===j.data.session.id).phase,'safe');}
 const world=await (await fetch(base+'/api/arena')).json();assert.ok(sessions.every(s=>world.players.some(p=>p.id===s.id)));assert.ok(world.players.every(p=>!('token' in p)&&!('profileId' in p)));
 const before=world.players.find(p=>p.id===sessions[0].id);
 for(let i=0;i<10;i++){
  const moved=await Promise.all(sessions.map((s,j)=>post({action:'input',profileToken:profiles[j],commands:Array.from({length:6},(_,k)=>command(i*6+k+1))},s.token)));
  for(const r of moved)assert.equal(r.status,200);await new Promise(resolve=>setTimeout(resolve,110));
 }
 const after=await (await fetch(base+'/api/arena')).json();const player=after.players.find(p=>p.id===sessions[0].id);assert.ok(player.x>before.x+100,'server should apply sequenced movement');
 assert.equal((await post({action:'input',profileToken:profiles[0],commands:[]},'invalid-session')).status,401);
 assert.equal((await post({action:'input',profileToken:profiles[0],commands:[command(61,0,999,0)]},sessions[0].token)).status,400);
 console.log('PASS: simultaneous clients, safe spawns, sequenced movement, identity privacy and input validation.');
 // This fixture is intentionally limited to the local preview database. It places a
 // test runner on a bot to verify the complete death -> atomic score write -> rejoin path.
 if(process.env.ARENA_TEST_DEATH==='1'){
  assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname),'death fixture is local only');
  const me=after.players.findIndex(p=>p.id===sessions[0].id),run=crypto.randomUUID(),now=Date.now(),j=`$.players[${me}]`;
  const sql=`UPDATE arena SET revision=revision+1,state=json_set(state,'${j}.x',3000,'${j}.y',3000,'${j}.phase','arena','${j}.runStartedAt',${now-8000},'${j}.runId','${run}','${j}.lastSeen',${now},'$.bots[0].spawnWait',0,'$.bots[0].x',3000,'$.bots[0].y',3000) WHERE id='shared' AND json_extract(state,'${j}.id')='${sessions[0].id}'`;
  execFileSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--command',sql],{stdio:'pipe'});
  const dead=await post({action:'input',profileToken:profiles[0],commands:[]},sessions[0].token);assert.equal(dead.status,200);
  const respawned=dead.data.players.find(p=>p.id===sessions[0].id);assert.equal(respawned.phase,'safe');assert.equal(respawned.life,1);assert.equal(dead.data.personal.scores.runs[0].id,run);assert.ok(dead.data.personal.scores.bestMs>=8000);
  const collision=dead.data.collisions.find(e=>e.playerId===sessions[0].id);assert.ok(collision);assert.equal(collision.x,3000);assert.equal(collision.y,3000);assert.equal(collision.respawnY,respawned.y);
  const observed=await(await fetch(base+'/api/arena')).json();assert.ok(observed.collisions.some(e=>e.id===collision.id),'other clients must receive the same impact event');
  const stored=await(await fetch(base+'/api/arena?scores=1',{headers:{Authorization:'Bearer '+profiles[0]}})).json();assert.equal(stored.runs[0].id,run);
  await post({action:'leave'},sessions[0].token);const rejoined=await post({action:'join',name:'QA Returning',profileToken:profiles[0]});assert.equal(rejoined.status,200);sessions[0]=rejoined.data.session;assert.equal(rejoined.data.personal.scores.runs[0].id,run);assert.equal(rejoined.data.personal.scores.bestMs,stored.bestMs);
  console.log('PASS: bot contact kills, outside respawn, durable scores, collision-event broadcasting and score restoration on rejoin.');
 }
}finally{for(const s of sessions)await post({action:'leave'},s.token);}
