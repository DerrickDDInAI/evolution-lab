import assert from 'node:assert/strict';
const base=process.env.ARENA_TEST_URL||'http://127.0.0.1:5173';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname),'The network-delay regression targets the local preview only.');
const profileToken=crypto.randomUUID();let session;
async function post(body){const r=await fetch(base+'/api/arena',{method:'POST',headers:{'content-type':'application/json',...(session?{authorization:'Bearer '+session.token}:{})},body:JSON.stringify(body)});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;}
try{
 const joined=await post({action:'join',name:'Network QA',profileToken});session=joined.session;
 let previous=joined.players.find(p=>p.id===session.id),sequence=0;
 for(let packet=0;packet<4;packet++){
  const commands=Array.from({length:45},()=>({seq:++sequence,life:previous.life,dt:1/60,x:1,y:0,dash:false}));
  await new Promise(resolve=>setTimeout(resolve,750));
  const state=await post({action:'input',profileToken,commands}),player=state.players.find(p=>p.id===session.id);
  assert.ok(Math.abs(player.x-previous.x-255*.75)<.001,`Packet ${packet}: valid movement was discarded`);assert.equal(player.ack,sequence);previous=player;
 }
 console.log('PASS: four 750 ms delayed movement packets preserve full travel and acknowledgements.');
}finally{if(session)await post({action:'leave'});}
