import assert from 'node:assert/strict';
const base=process.env.ARENA_TEST_URL||'http://127.0.0.1:5173';
const sessions=[];
async function post(body,token){const r=await fetch(base+'/api/arena',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
try{
 const joined=await Promise.all(['QA North','QA East'].map(name=>post({action:'join',name})));
 for(const j of joined){assert.equal(j.status,200);sessions.push(j.data.session);}
 const world=await (await fetch(base+'/api/arena')).json();assert.ok(sessions.every(s=>world.players.some(p=>p.id===s.id)));assert.ok(world.players.every(p=>!('token' in p)));
 const before=world.players.find(p=>p.id===sessions[0].id);
 for(let i=0;i<10;i++){const moved=await Promise.all(sessions.map(s=>post({action:'input',x:1,y:0,dash:false},s.token)));for(const r of moved)assert.equal(r.status,200);await new Promise(resolve=>setTimeout(resolve,130));}
 const after=await (await fetch(base+'/api/arena')).json();const player=after.players.find(p=>p.id===sessions[0].id);assert.ok(player.x>before.x+10,'server should advance movement');
 assert.equal((await post({action:'input',x:1,y:0},'invalid-session')).status,401);
 assert.equal((await post({action:'input',x:999,y:0},sessions[0].token)).status,400);
 console.log('PASS: simultaneous joins, shared visibility, concurrent movement, private tokens, session validation, and input bounds.');
}finally{for(const s of sessions)await post({action:'leave'},s.token);}
