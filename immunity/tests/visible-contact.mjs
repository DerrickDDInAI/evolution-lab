import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const base=process.env.ARENA_TEST_URL||'http://127.0.0.1:5173';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname),'fixture is local only');
const profileToken=crypto.randomUUID();let session;
async function post(body){const r=await fetch(base+'/api/arena',{method:'POST',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.token}:{})},body:JSON.stringify({...body,profileToken})});return {status:r.status,data:await r.json()};}
function sql(command){execFileSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--command',command],{stdio:'pipe'});}
try{
 // An older tab upgrades on its first input. Negotiation must happen before advance().
 const joined=await post({action:'join',name:'Contact regression'});assert.equal(joined.status,200);session=joined.data.session;
 const world=await(await fetch(base+'/api/arena')).json(),i=world.players.findIndex(p=>p.id===session.id),path=`$.players[${i}]`,now=Date.now();
 sql(`UPDATE arena SET revision=revision+1,state=json_set(state,'${path}.x',3000,'${path}.y',3000,'${path}.phase','arena','${path}.runStartedAt',${now-8000},'${path}.runId','${crypto.randomUUID()}','${path}.moveAt',${now-750},'${path}.lastSeen',${now},'$.time',${now-750},'$.elapsed',0,'$.bots[0].spawnWait',0,'$.bots[0].x',3000,'$.bots[0].y',3000,'$.bots[0].vx',0,'$.bots[0].vy',0,'$.bots[0].genome.genes',json('[]')) WHERE id='shared'`);
 const commands=Array.from({length:45},(_,i)=>({seq:i+1,life:0,dt:1/60,x:1,y:0,dash:false}));
 const escaped=await post({action:'input',contactMode:'visible-v1',commands});assert.equal(escaped.status,200);
 const player=escaped.data.players.find(p=>p.id===session.id);assert.equal(player.life,0);assert.equal(player.phase,'arena');assert.ok(player.x>3180);assert.equal(escaped.data.personal.scores.runs.length,0);
 assert.equal(player.contactMode,undefined,'protocol state is private');
 // Omitted negotiation never turns the new protocol off on later requests.
 sql(`UPDATE arena SET revision=revision+1,state=json_set(state,'$.bots[0].x',${player.x+20},'$.bots[0].y',${player.y}) WHERE id='shared'`);
 const overlap=await post({action:'input',commands:[]});assert.equal(overlap.status,200);assert.equal(overlap.data.players.find(p=>p.id===session.id).life,0);
 const report={frameId:overlap.data.personal.contactFrame,life:0,seq:45,bot:0,age:0,x:player.x,y:player.y,bx:player.x+20,by:player.y};
 const dead=await post({action:'input',contactMode:'visible-v1',commands:[],contact:report});assert.equal(dead.status,200);assert.equal(dead.data.contactReply.status,'confirmed');
 const respawn=dead.data.players.find(p=>p.id===session.id);assert.equal(respawn.life,1);assert.equal(respawn.phase,'safe');assert.equal(respawn.runStartedAt,null);
 const saved=await(await fetch(base+'/api/arena?scores=1',{headers:{Authorization:'Bearer '+profileToken}})).json();assert.equal(saved.runs.length,1);
 const repeat=await post({action:'input',commands:[],contact:report});assert.equal(repeat.data.contactReply.status,'confirmed');assert.equal(repeat.data.personal.scores.runs.length,1);
 const invalid=await post({action:'input',contactMode:'ignore-collisions',commands:[]});assert.equal(invalid.status,400);
 console.log('PASS: protocol upgrades before simulation, no unseen server deaths, visible-contact confirmation, atomic score/respawn, retry and protocol validation.');
}finally{if(session)await post({action:'leave'});}
