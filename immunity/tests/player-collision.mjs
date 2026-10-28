// This fixture alters only a disposable local preview database.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const base=process.env.ARENA_TEST_URL||'http://127.0.0.1:5173';
const origin=new URL(base);
assert.ok(origin.protocol==='http:'&&['127.0.0.1','localhost'].includes(origin.hostname),'local fixture only');
const sql=statement=>execFileSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--command',statement],{stdio:'pipe'});
for(const mode of ['survival','motion']){
 const sessions=[],profiles=[crypto.randomUUID(),crypto.randomUUID()];
 async function post(i,body){
  const response=await fetch(base+'/api/arena',{method:'POST',headers:{'content-type':'application/json',...(sessions[i]?{authorization:'Bearer '+sessions[i].token}:{})},body:JSON.stringify({mode,profileToken:profiles[i],...body})});
  const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data;
 }
 try{
  for(let i=0;i<2;i++)sessions[i]=(await post(i,{action:'join',name:'Collision QA '+i,contactMode:'visible-v1'})).session;
  const world=await(await fetch(base+'/api/arena?mode='+mode)).json(),now=Date.now();
  const paths=sessions.map(s=>'$.players['+world.players.findIndex(p=>p.id===s.id)+']');
  const updates=paths.flatMap((p,i)=>[`'${p}.x'`,i?3000:2800,`'${p}.y'`,3200,`'${p}.phase'` ,"'arena'",`'${p}.runStartedAt'`,now,`'${p}.moveAt'`,now-2000,`'${p}.lastSeen'`,now]);
  // Hold bot simulation so the assertions isolate player contact.
  sql(`UPDATE arena SET revision=revision+1,state=json_set(state,'$.time',${now+60000},'$.obstacles',json('[]'),${updates.join(',')}) WHERE id='${mode==='motion'?'motion':'shared'}'`);
  const commands=(start,x,y)=>Array.from({length:60},(_,i)=>({seq:start+i,life:0,x,y,dash:true,dt:1/60}));
  const first=await post(0,{action:'input',commands:commands(1,1,0)});
  const a=first.players.find(p=>p.id===sessions[0].id),b=first.players.find(p=>p.id===sessions[1].id);
  assert.ok(a.x>2967&&a.x<=2968.001);assert.equal(b.x,3000);assert.equal(a.life,0);assert.equal(a.tags,0);
  assert.equal(first.personal.scores.runs.length,0);assert.equal(first.collisions.filter(e=>e.playerId===a.id).length,0);
  const opposing=await post(1,{action:'input',commands:commands(1,-1,0)});
  const pair=sessions.map(s=>opposing.players.find(p=>p.id===s.id));
  assert.ok(Math.hypot(pair[0].x-pair[1].x,pair[0].y-pair[1].y)>=32-1e-6);assert.equal(pair[0].x,a.x);assert.equal(pair[1].life,0);
  const around=await post(0,{action:'input',commands:commands(61,1,1)}),moved=around.players.find(p=>p.id===sessions[0].id);
  assert.ok(moved.x>3000&&moved.y>3232);assert.equal(moved.life,0);assert.equal(around.personal.scores.runs.length,0);
  console.log('PASS: '+mode+' player sprint/head-on blocking, sliding, unchanged lives/scores and no contact damage over HTTP/D1.');
 }finally{for(let i=0;i<sessions.length;i++)await post(i,{action:'leave'});}
}
