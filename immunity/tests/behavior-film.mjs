// Destructive fixtures belong only to a disposable local preview/database.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const base=process.env.ARENA_TEST_URL||'http://127.0.0.1:5196';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname),'local fixture only');
const password=process.env.IMMUNITY_TEST_PASSWORD;
assert.ok(password,'Set IMMUNITY_TEST_PASSWORD to the disposable preview password.');
const profileToken=crypto.randomUUID();let session,seq=0,cookie='';
const sql=command=>execFileSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--command',command],{stdio:'pipe'});
async function post(body){const r=await fetch(base+'/api/arena',{method:'POST',headers:{'content-type':'application/json',...(session?{authorization:'Bearer '+session.token}:{})},body:JSON.stringify({mode:'survival',profileToken,...body})});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;}
async function film(query=''){const r=await fetch(base+'/api/film?mode=survival'+query,{headers:{cookie}});return {status:r.status,data:await r.json()};}
try{
 assert.equal((await film()).status,401);
 const login=await fetch(base+'/api/training?action=login',{method:'POST',headers:{'content-type':'application/json',origin:base},body:JSON.stringify({password})});assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
 const baseline=(await film()).data.clips.length;
 const joined=await post({action:'join',name:'Private film QA',contactMode:'visible-v1'});session=joined.session;const generation=joined.generation;
 const i=joined.players.findIndex(p=>p.id===session.id),p=`$.players[${i}]`,now=Date.now();
 sql(`UPDATE arena SET revision=revision+1,state=json_set(state,'$.elapsed',20,'$.time',${now},'${p}.x',3300,'${p}.y',3000,'${p}.phase','arena','${p}.runStartedAt',${now},'${p}.lastSeen',${now}) WHERE id='shared'`);
 // Drive genuine HTTP movement updates. No invented trajectories are saved by the product.
 for(let j=0;j<45;j++){
   await new Promise(resolve=>setTimeout(resolve,200));
   const data=await post({action:'input',commands:Array.from({length:6},()=>({seq:++seq,life:0,x:j<20?0:-.6,y:j<20?.6:0,dt:1/30,dash:false}))});
   assert.ok(!('film' in data));
 }
 // A confirmed visible contact, then resume play to complete this generation.
 const tick=Date.now();
 sql(`UPDATE arena SET revision=revision+1,state=json_set(state,'$.time',${tick+60000},'${p}.x',3000,'${p}.y',3000,'$.bots[0].x',3020,'$.bots[0].y',3000,'$.bots[0].spawnWait',0,'$.bots[0].vx',0,'$.bots[0].vy',0) WHERE id='shared'`);
 const frame=await post({action:'input',commands:[]});
 const contact=await post({action:'input',commands:[],contact:{frameId:frame.personal.contactFrame,life:0,seq,bot:0,age:0,x:3000,y:3000,bx:3020,by:3000}});assert.equal(contact.contactReply.status,'confirmed');
 const end=Date.now();
 sql(`UPDATE arena SET revision=revision+1,state=json_set(state,'$.elapsed',44.99,'$.time',${end-100},'${p}.x',3300,'${p}.y',3500,'${p}.phase','arena','${p}.runStartedAt',${end},'${p}.lastSeen',${end}) WHERE id='shared'`);
 const boundary=await post({action:'input',commands:[]});assert.equal(boundary.generation,generation+1);
 const list=await film();assert.equal(list.status,200);assert.equal(list.data.clips.length,baseline+1);
 const first=list.data.clips[0];assert.equal(first.generation,generation);assert.equal(first.branch,1);assert.equal(first.captures,1);assert.ok(first.duration>5&&first.duration<=10);
 const exported=await film('&id='+encodeURIComponent(first.id));assert.equal(exported.status,200);assert.equal(exported.data.format,'immunity-live-highlight-v1');
 const text=JSON.stringify(exported.data);for(const secret of ['Private film QA',profileToken,session.token,session.id,'profileId','contactFrames','scores','genomes'])assert.ok(!text.includes(secret),secret);
 assert.ok(exported.data.frames.some(f=>f.capture));
 assert.equal((await film('&id=motion:film:v1:0000000000000001:0000000000000001:0000000000000001')).status,400);
 assert.equal((await film('&before=invalid')).status,400);
 // A second generation creates a new immutable clip, while the first survives.
 for(let j=0;j<10;j++){await new Promise(resolve=>setTimeout(resolve,200));await post({action:'input',commands:[{seq:++seq,life:1,x:-.4,y:0,dt:1/30,dash:false}]});}
 const finish=Date.now();sql(`UPDATE arena SET revision=revision+1,state=json_set(state,'$.elapsed',44.99,'$.time',${finish-100},'${p}.lastSeen',${finish}) WHERE id='shared'`);await post({action:'input',commands:[]});
 assert.equal((await film()).data.clips.length,baseline+2);assert.deepEqual((await film('&id='+encodeURIComponent(first.id))).data,exported.data);
 console.log('PASS: automatic recording over real HTTP input, confirmed capture, generation persistence, immutable clips, private anonymous exports, authenticated access and invalid/cross-mode references.');
}finally{if(session)await post({action:'leave'});}
