import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const base=process.env.ARENA_TEST_URL||'http://127.0.0.1:5173',origin=new URL(base);
assert.ok(origin.protocol==='http:'&&['127.0.0.1','localhost'].includes(origin.hostname)&&!origin.username&&!origin.password&&origin.pathname==='/'&&!origin.search&&!origin.hash,'Training fixtures require a disposable HTTP loopback database.');
assert.ok(process.env.IMMUNITY_TEST_PASSWORD,'Set IMMUNITY_TEST_PASSWORD to a test-only credential.');
const password=process.env.IMMUNITY_TEST_PASSWORD,profileToken=crypto.randomUUID();let cookie='',session;
const sql=statement=>JSON.parse(execFileSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--command',statement,'--json'],{encoding:'utf8'}));
async function api(path,body,headers={}){const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json',Origin:origin.origin}),...(cookie?{Cookie:cookie}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:response.status,data:await response.json(),headers:response.headers};}
const admin=(action,body={})=>api(`/api/training?action=${action}`,{mode:'survival',...body});
const world=()=>api('/api/arena');
const readState=()=>JSON.parse(sql("SELECT state FROM arena WHERE id='shared'")[0].results[0].state);
async function boundary(concurrent=false){
 const now=Date.now();
 sql(`UPDATE arena SET revision=revision+1,state=json_set(state,'$.elapsed',44.999,'$.time',${now-100},'$.players[0].phase','arena','$.players[0].x',1000,'$.players[0].y',1000,'$.players[0].lastSeen',${now}) WHERE id='shared'`);
 const post=()=>api('/api/arena',{action:'input',profileToken,commands:[]},{Authorization:'Bearer '+session.token});
 const results=concurrent?await Promise.all([post(),post()]):[await post()];for(const result of results)assert.equal(result.status,200,JSON.stringify(result.data));return results[0].data;
}
try{
 const status=await api('/api/training');assert.equal(status.data.configured,true);assert.equal(status.data.authenticated,false);
 assert.equal((await admin('import',{artifact:{}})).status,401);assert.equal((await api('/api/training/export?kind=rollback')).status,401);
 assert.equal((await admin('reset',{generation:1,branch:1})).status,401);
 assert.equal((await api('/api/training?action=login',{password},{Origin:'https://foreign.example'})).status,403);
 assert.equal((await admin('login',{password:'wrong test-only password'})).status,401);
 const login=await admin('login',{password});assert.equal(login.status,200,JSON.stringify(login.data));cookie=login.headers.get('set-cookie').split(';')[0];assert.match(login.headers.get('set-cookie'),/HttpOnly/);
 assert.equal((await api('/api/training')).data.authenticated,true);
 const joined=await api('/api/arena',{action:'join',name:'Checkpoint test',profileToken});assert.equal(joined.status,200);session=joined.data.session;
 const liveBefore=readState(),current=await api('/api/training/export?kind=current');
 assert.equal(current.status,200);assert.equal(current.data.generation,liveBefore.generation);assert.equal(current.data.kind,'checkpoint');
 assert.deepEqual(current.data.genomes,liveBefore.bots.map(b=>({...b.genome,fitness:0})));assert.deepEqual(current.data.evolution,liveBefore.evolution);
 assert.deepEqual(readState(),liveBefore,'current export must not mutate the world');
 assert.equal((await api('/api/training')).data.generation,liveBefore.generation);
 assert.equal((await admin('preview',{artifact:current.data})).status,200,'current population must round-trip through importer');
 for(const field of ['players','profileId','token','contactFrames','runs'])assert.ok(!JSON.stringify(current.data).includes(`"${field}"`));
 const first=await boundary();const best=await api('/api/training/export?kind=champion'),checkpoint=await api('/api/training/export?kind=checkpoint');
 assert.equal(best.status,200);assert.equal(best.data.generation,first.bestGeneration.generation);assert.equal(checkpoint.status,200);assert.equal(checkpoint.data.genomes.length,24);
 for(const file of [best.data,checkpoint.data])for(const field of ['players','profileId','token','contactFrames','runs'])assert.ok(!JSON.stringify(file).includes(`"${field}"`));
 const file=structuredClone(checkpoint.data);file.genomes[0].genes[0].weight=4.321;
 assert.equal((await admin('preview',{artifact:{...file,mode:'motion'}})).status,400);assert.equal((await admin('preview',{artifact:{...file,players:[]}})).status,400);assert.equal((await admin('preview')).status,400);
 assert.equal((await admin('preview',{artifact:'x'.repeat(530000)})).status,413);assert.equal((await admin('preview',{artifact:file})).data.preview.bots,24);
 const before=readState(),otherBefore=(await api('/api/arena?mode=motion')).data;
 const simultaneous=await Promise.all([admin('import',{artifact:file}),admin('import',{artifact:file})]);assert.deepEqual(simultaneous.map(r=>r.status).sort(),[200,409]);
 const pending=(await world()).data;assert.ok(pending.training.pending);assert.equal(pending.training.branch,before.training.branch);assert.ok(!JSON.stringify(pending).includes('"genomes"'));
 assert.deepEqual(readState().bots.map(b=>b.genome),before.bots.map(b=>b.genome),'queuing must not change active bots');
 const applied=await boundary(true);assert.equal(applied.training.pending,null);assert.equal(applied.training.branch,before.training.branch+1);assert.equal(applied.training.events.length,before.training.events.length+1);assert.equal(applied.generation,before.generation+1);
 const after=readState();assert.deepEqual(after.bots.map(b=>b.genome),file.genomes);assert.deepEqual(after.evolution,file.evolution);assert.deepEqual(after.players[0].scores,before.players[0].scores);assert.equal(after.players[0].token,before.players[0].token);assert.equal(after.players[0].profileId,before.players[0].profileId);assert.ok(after.history.length>=before.history.length);
 const otherAfter=(await api('/api/arena?mode=motion')).data;assert.equal(otherAfter.generation,otherBefore.generation);assert.deepEqual(otherAfter.history,otherBefore.history);
 const backup=await api('/api/training/export?kind=rollback');assert.equal(backup.status,200);assert.equal(backup.data.genomes.length,24);
 assert.equal((await admin('rollback',{rollbackGeneration:-1})).status,409);
 assert.equal((await admin('rollback',{rollbackGeneration:applied.training.rollbackGeneration})).status,200);
 const restored=await boundary();assert.equal(restored.training.branch,before.training.branch+2);assert.equal(restored.training.events.at(-1).kind,'rollback');assert.deepEqual(readState().bots.map(b=>b.genome),backup.data.genomes);assert.deepEqual(readState().evolution,backup.data.evolution);
 const queued=await admin('import',{artifact:file});assert.equal(queued.status,200);assert.equal((await admin('cancel',{pendingId:'stale'})).status,409);assert.equal((await admin('cancel',{pendingId:queued.data.training.pending.id})).status,200);assert.equal((await world()).data.training.pending,null);
 // Reset is immediate, mode-scoped, recoverable and guarded against duplicate/stale confirmations.
 const motionJoined=await api('/api/arena',{mode:'motion',action:'join',name:'Reset test',profileToken});assert.equal(motionJoined.status,200);
 try{
  for(const mode of ['survival','motion']){
   const key=mode==='motion'?'motion':'shared';
   const stored=id=>sql(`SELECT revision,state FROM arena WHERE id='${id}'`)[0].results;
   const own=()=>JSON.parse(stored(key)[0].state),otherKey=mode==='motion'?'shared':'motion';
   const beforeReset=own(),other=stored(otherKey),otherLatest=stored(`${otherKey}:training:latest`),otherBackup=stored(`${otherKey}:training:rollback`);
   const currentFile=(await api(`/api/training/export?mode=${mode}&kind=current`)).data;
   const pendingReset=await admin('import',{mode,artifact:currentFile});assert.equal(pendingReset.status,200);
   const confirmation={mode,generation:beforeReset.generation,branch:beforeReset.training.branch};
   assert.equal((await admin('reset',confirmation)).status,409,'pending imports must be cancelled first');
   assert.equal((await admin('cancel',{mode,pendingId:pendingReset.data.training.pending.id})).status,200);
   assert.equal((await admin('reset',{mode})).status,409,'a reviewed generation and branch are required');
   assert.equal((await api('/api/training?action=reset',confirmation,{Origin:'https://foreign.example'})).status,403);
   const resets=await Promise.all([admin('reset',confirmation),admin('reset',confirmation)]);
   assert.deepEqual(resets.map(r=>r.status).sort(),[200,409]);
   const afterReset=own();assert.equal(afterReset.generation,1);assert.equal(afterReset.elapsed,0);assert.deepEqual(afterReset.history,[]);assert.equal(afterReset.bestModel,undefined);assert.equal(afterReset.champion,null);assert.equal(afterReset.training.branch,beforeReset.training.branch+1);
   assert.deepEqual(afterReset.players,beforeReset.players.map(p=>({...p,contactFrames:[]})));assert.deepEqual(afterReset.obstacles,beforeReset.obstacles);
   const recovery=await api(`/api/training/export?mode=${mode}&kind=rollback`),latest=await api(`/api/training/export?mode=${mode}&kind=checkpoint`);
   assert.equal(recovery.status,200);assert.deepEqual(recovery.data.genomes,beforeReset.bots.map(b=>({...b.genome,fitness:0})));assert.deepEqual(recovery.data.evolution,beforeReset.evolution);
   assert.equal(latest.status,200);assert.equal(latest.data.generation,1);assert.deepEqual(latest.data.genomes,afterReset.bots.map(b=>b.genome));
   assert.equal((await api(`/api/training/export?mode=${mode}&kind=champion`)).status,409);
   assert.deepEqual(stored(otherKey),other);assert.deepEqual(stored(`${otherKey}:training:latest`),otherLatest);assert.deepEqual(stored(`${otherKey}:training:rollback`),otherBackup);
   assert.equal((await admin('reset',confirmation)).status,409,'replaying a successful reset must preserve its backup');
  }
 }finally{await api('/api/arena',{mode:'motion',action:'leave'},{Authorization:'Bearer '+motionJoined.data.session.token});}
 assert.equal((await admin('logout')).status,200);assert.equal((await admin('import',{artifact:file})).status,401);
 const again=await admin('login',{password});assert.equal(again.status,200);cookie=again.headers.get('set-cookie').split(';')[0];
 sql("UPDATE arena SET revision=revision+1,state=json_set(state,'$.sessions[0].expires',0) WHERE id='immunity:admin-auth:v1'");assert.equal((await admin('preview',{artifact:file})).status,401);
 // Persistent limiter survives separate requests/worker invocations; do this last.
 await admin('login',{password:'wrong test-only password'});await admin('login',{password:'wrong test-only password'});assert.equal((await admin('login',{password})).status,429);
 console.log('PASS: exports, authenticated imports, concurrent queue/boundary changes, backup/rollback, confirmed mode-specific resets, duplicate/stale reset rejection, archive/player/mode preservation, cancellation, expiry/logout and login throttling.');
}finally{if(session)await api('/api/arena',{action:'leave'},{Authorization:'Bearer '+session.token});}
