// Synthetic capacity measurements. HTTP runs are restricted to a marked copy in
// a temporary directory with its own local D1 database. Never use production.
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,readdirSync,realpathSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {performance,monitorEventLoopDelay} from 'node:perf_hooks';
import {setTimeout as delay} from 'node:timers/promises';
import ts from 'typescript';

const root=realpathSync(fileURLToPath(new URL('../',import.meta.url)));
assert.equal(realpathSync(process.cwd()),root,'Run from the game directory.');
const args=Object.fromEntries(process.argv.slice(2).map(arg=>{
  assert.match(arg,/^--[a-z]+=/,'Use --option=value');
  const at=arg.indexOf('=');return [arg.slice(2,at),arg.slice(at+1)];
}));
for(const key of Object.keys(args))assert.ok(['kind','url','seconds','warmup','players','bots','modes','output','repeats','complexity','workload'].includes(key),'Unknown option: '+key);
const kind=args.kind||'simulation';assert.ok(['simulation','http'].includes(kind));
function numbers(value,fallback,max){
  const values=(value||fallback).split(',').map(Number);
  assert.ok(values.length&&values.every(n=>Number.isInteger(n)&&n>0&&n<=max));return values;
}
const counts=numbers(args.players,'1,4,8,12',12),populations=numbers(args.bots,kind==='http'?'24':'8,16,24,32,48,64',256);
const modes=(args.modes||'survival,motion').split(',');assert.ok(modes.every(m=>['survival','motion'].includes(m)));
const seconds=Number(args.seconds||60),warmup=Number(args.warmup||10),repeats=Number(args.repeats||1);
assert.ok(Number.isFinite(seconds)&&seconds>=1&&seconds<=3600&&Number.isFinite(warmup)&&warmup>=0&&warmup<=120);
assert.ok(Number.isInteger(repeats)&&repeats>=1&&repeats<=10);
const complexities=(args.complexity||'fresh').split(',');assert.ok(complexities.every(c=>['fresh','grown'].includes(c)));
const workload=args.workload||'journey';assert.ok(['journey','sustained'].includes(workload));
const output=path.resolve(args.output||'outputs/load-test-'+kind+'.json');mkdirSync(path.dirname(output),{recursive:true});
const moduleDir=path.join(root,'.sites-runtime/load-test');mkdirSync(moduleDir,{recursive:true});
for(const name of readdirSync(path.join(root,'lib')).filter(n=>n.endsWith('.ts'))){
  const compiled=ts.transpileModule(readFileSync(path.join(root,'lib',name),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
    .replace(/(['"])(\.\/[\w-]+)\1/g,'$1$2.mjs$1');
  writeFileSync(path.join(moduleDir,name.replace(/\.ts$/,'.mjs')),compiled);
}
const {createArena,join,advance,applyCommands,snapshot,rememberContactFrame}=await import(pathToFileURL(path.join(moduleDir,'arena.mjs')));
const {mutate}=await import(pathToFileURL(path.join(moduleDir,'evolution.mjs')));
const {moveActor,playerObstacles,MAX_PACKET_COMMANDS,MAX_QUEUED_COMMANDS}=await import(pathToFileURL(path.join(moduleDir,'physics.mjs')));
const {recordFilm}=await import(pathToFileURL(path.join(moduleDir,'behavior-film.mjs')));
const stats=values=>{
  if(!values.length)return {n:0,p50:null,p95:null,p99:null,max:null};
  const sorted=[...values].sort((a,b)=>a-b),p=q=>+sorted[Math.min(sorted.length-1,Math.ceil(q*sorted.length)-1)].toFixed(3);
  return {n:values.length,p50:p(.5),p95:p(.95),p99:p(.99),max:p(1)};
};
function fixture(mode,bots,complexity,now){
  const a=createArena(now,mode),original=a.bots;
  a.bots=Array.from({length:bots},(_,id)=>{
    const b=structuredClone(original[id%original.length]),angle=id/bots*Math.PI*2;
    b.id=id;b.homeX=3000+Math.cos(angle)*140;b.homeY=3000+Math.sin(angle)*140;b.x=b.homeX;b.y=b.homeY;
    if(complexity==='grown')for(let i=0;i<150;i++)mutate(b.genome,a.evolution);
    return b;
  });return a;
}
function placePlayers(a,now){
  for(const [i,p] of a.players.entries()){
    const angle=i/a.players.length*Math.PI*2;
    Object.assign(p,{x:3000+Math.cos(angle)*400,y:3000+Math.sin(angle)*400,phase:'arena',runStartedAt:now,runId:crypto.randomUUID(),lastSeen:now,moveAt:now,credit:.25,contactMode:'visible-v1'});
    moveActor(p,16,0,playerObstacles(a.obstacles,a.players,p.id),'arena');
  }
}
function direction(p,world,index,time){
  let target;
  if(workload==='sustained'&&p.phase==='arena')target={x:3000+650*Math.cos(time/5000+index*1.7),y:3000+650*Math.sin(time/5000+index*1.7)};
  else if(p.phase==='safe'){
    const distances=[Math.abs(p.y-1200),Math.abs(p.x-4800),Math.abs(p.y-4800),Math.abs(p.x-1200)];
    const side=distances.indexOf(Math.min(...distances));
    target=[{x:3000,y:1500},{x:4500,y:3000},{x:3000,y:4500},{x:1500,y:3000}][side];
    // Line up with the gate before moving inward after a respawn.
    if((side===0||side===2)&&Math.abs(p.x-3000)>65)target={x:3000,y:p.y};
    if((side===1||side===3)&&Math.abs(p.y-3000)>65)target={x:p.x,y:3000};
  }else if(world.mode==='motion'&&p.carrying)target={x:3000,y:1000};
  else if(world.mode==='motion'&&index%3===0)target={x:3000,y:2600};
  else {
    const nearest=world.bots.reduce((best,b)=>Math.hypot(b.x-p.x,b.y-p.y)<Math.hypot(best.x-p.x,best.y-p.y)?b:best,world.bots[0]);
    target=index%3===1?{x:3000+700*Math.cos(time/4000+index),y:3000+700*Math.sin(time/4000+index)}:nearest;
  }
  const dx=target.x-p.x,dy=target.y-p.y,length=Math.hypot(dx,dy)||1;
  return {x:dx/length,y:dy/length,dash:Math.floor(time/3000+index)%2===0};
}
const report={startedAt:new Date().toISOString(),kind,workload,source:process.env.LOAD_TEST_REVISION||'working-copy',machine:{platform:os.platform(),arch:os.arch(),cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,memoryGiB:+(os.totalmem()/2**30).toFixed(1),node:process.version},thresholds:{responseP95Ms:200,errorRate:.01,simulationP95Ms:1000/30},limitations:['Local single-machine measurements, not hosted D1 or WAN capacity.','Synthetic populations; grown genomes are mutations, not trained live models.','Nondefault sentinel counts are fixture-only; production settings stay unchanged.',...(workload==='sustained'?['Sustained clients withhold contact reports to maintain active population; this is a capacity stress case, not normal play.']:[])],cases:[]};
const save=()=>writeFileSync(output,JSON.stringify(report,null,2)+'\n');
save();
if(kind==='simulation'){
  for(const complexity of complexities)for(const mode of modes)for(const bots of populations)for(const players of counts){
    const a=fixture(mode,bots,complexity,0);
    for(let i=0;i<players;i++)join(a,'synthetic-'+i,'token-'+i,'Load '+i,0);
    placePlayers(a,0);
    const steps=[],serialization=[],combined=[],stateBytes=[],rounds=[];
    // Twenty seconds of unmeasured simulation fills film and contact buffers.
    const warmSteps=600,totalSteps=Math.max(600,Math.round(seconds*30));
    for(let tick=0;tick<warmSteps+totalSteps;tick++){
      const now=(tick+1)*1000/30,start=performance.now(),finished=[],training=[],film=[];
      advance(a,now,finished,training,film);
      for(const [i,p] of a.players.entries()){
        const input=direction(p,a,i,now);
        applyCommands(a,p,[1,2].map(n=>({...input,seq:p.ack+n,life:p.life,dt:1/60})),now,finished);
        rememberContactFrame(a,p,now);
      }
      recordFilm(a,now);
      const simulationMs=performance.now()-start,serialStart=performance.now();
      const encoded=JSON.stringify(a);JSON.parse(encoded);
      // One public response, while the private world includes every frame buffer.
      JSON.stringify(snapshot(a,a.players[0]?.token));
      if(tick>=warmSteps){const serialMs=performance.now()-serialStart;steps.push(simulationMs);serialization.push(serialMs);combined.push(simulationMs+serialMs);stateBytes.push(Buffer.byteLength(encoded));if(training.length||film.length)rounds.push({tick,generation:a.generation,simulationMs});}
    }
    const result={mode,players,bots,complexity,simulatedSeconds:totalSteps/30,stepMs:stats(steps),serializationMs:stats(serialization),combinedMs:stats(combined),stateBytes:stats(stateBytes),generation:a.generation,generationEvents:rounds,genomeNodes:stats(a.bots.map(b=>b.genome.nodes.length)),genomeGenes:stats(a.bots.map(b=>b.genome.genes.length)),pass:stats(combined).p95<1000/30};
    report.cases.push(result);save();console.log(JSON.stringify(result));
  }
}else{
  // Both the URL and the physical checkout must pass before opening a database.
  const target=new URL(args.url||'http://127.0.0.1:5186');
  assert.ok(target.protocol==='http:'&&['127.0.0.1','localhost'].includes(target.hostname)&&!target.username&&!target.password&&target.pathname==='/'&&!target.search&&!target.hash,'HTTP loopback origin required.');
  assert.ok(['/private/tmp/','/tmp/',realpathSync(os.tmpdir())+path.sep].some(prefix=>root.startsWith(prefix))&&existsSync(path.join(root,'.immunity-load-test')),'HTTP requires a marked disposable checkout under a temporary directory.');
  const {DatabaseSync}=await import('node:sqlite');
  function sqliteFiles(directory){return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?sqliteFiles(path.join(directory,entry.name)):entry.name.endsWith('.sqlite')?[path.join(directory,entry.name)]:[]);}
  const databases=sqliteFiles(path.join(root,'.wrangler/state/v3/d1')).filter(file=>path.basename(file)!=='metadata.sqlite');assert.equal(databases.length,1,'Exactly one local D1 database required.');
  const database=new DatabaseSync(databases[0]);database.exec('PRAGMA busy_timeout=5000');
  const loop=monitorEventLoopDelay({resolution:20});loop.enable();
  const post=async (mode,profile,session,body)=>{
    const start=performance.now();
    const response=await fetch(target.origin+'/api/arena',{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.token}:{})},body:JSON.stringify({mode,profileToken:profile,contactMode:'visible-v1',...body}),signal:AbortSignal.timeout(6000)});
    const raw=await response.text();let data;try{data=JSON.parse(raw);}catch{data={error:'Invalid JSON'};}
    return {status:response.status,data,ms:performance.now()-start,bytes:Buffer.byteLength(raw)};
  };
  try{
    caseLoop: for(let repetition=1;repetition<=repeats;repetition++)for(const complexity of complexities)for(const bots of populations)for(const players of counts){
      const clients=[],caseModes=modes,now=Date.now();
      for(const mode of caseModes){
        const a=fixture(mode,bots,complexity,now),id=mode==='motion'?'motion':'shared';
        // This is exclusively a synthetic database. Keep each case independent.
        database.prepare('INSERT INTO arena(id,revision,state) VALUES(?,0,?) ON CONFLICT(id) DO UPDATE SET revision=revision+1,state=excluded.state').run(id,JSON.stringify(a));
        // Prove that this server uses this exact disposable database before joins.
        const probe=await fetch(target.origin+'/api/arena?mode='+mode,{redirect:'error',signal:AbortSignal.timeout(6000)});
        assert.equal(probe.status,200,'Local preview probe failed.');
        const probed=await probe.json();
        assert.ok(probed.simulationTime===a.time&&probed.bots.length===bots&&probed.players.length===0,'The preview does not use this disposable database.');
        for(let index=0;index<players;index++){
          const profile=crypto.randomUUID(),joined=await post(mode,profile,null,{action:'join',name:'Load '+index});
          assert.equal(joined.status,200,'Synthetic join failed: '+joined.status);
          clients.push({mode,index,profile,session:joined.data.session,world:joined.data,queue:[],seq:0,generatedAt:performance.now(),generatedLife:0,contact:null,requests:0,activeSamples:0,samples:0,lastLife:0,captures:0,queueMax:0,moved:0,lastPosition:null});
        }
        const row=database.prepare('SELECT state FROM arena WHERE id=?').get(id),world=JSON.parse(row.state);placePlayers(world,Date.now());
        database.prepare('UPDATE arena SET revision=revision+1,state=? WHERE id=?').run(JSON.stringify(world),id);
      }
      const begin=performance.now(),measureAt=begin+warmup*1000,end=measureAt+seconds*1000;
      const times=[],bytes=[],status={},updates=[],stateBytes=[],observedPlayers=[],errors=[];
      const perMode=Object.fromEntries(caseModes.map(mode=>[mode,{times:[],status:{}}]));loop.reset();
      let sampling=true,finishedAt=0,progressAt=measureAt,lastSuccessAt=begin,serverUnavailable=false;
      const sampler=(async()=>{while(sampling){
        for(const mode of caseModes){const row=database.prepare("SELECT length(CAST(state AS BLOB)) AS bytes,json_array_length(state,'$.players') AS players FROM arena WHERE id=?").get(mode==='motion'?'motion':'shared');if(performance.now()>=measureAt){stateBytes.push(row.bytes);observedPlayers.push(row.players);}}
        if(performance.now()-lastSuccessAt>6000)serverUnavailable=true;
        if(performance.now()>=progressAt){
          progressAt=performance.now()+30000;
          report.currentCase={modes:caseModes,playersPerMode:players,botsPerMode:bots,complexity,repetition,elapsedSeconds:+((performance.now()-measureAt)/1000).toFixed(1),requestedSeconds:seconds,status:{...status}};
          save();console.log(JSON.stringify({event:'progress',...report.currentCase}));
        }
        await delay(1000);
      }})();
      console.log(JSON.stringify({event:'case-start',modes:caseModes,playersPerMode:players,botsPerMode:bots,complexity,repetition,seconds,warmup}));
      try{
        await Promise.all(clients.map(async c=>{
          // Stagger the initial packets, then retain real completion + 60 ms pacing.
          await delay(c.index*5);
          while(performance.now()<end&&!serverUnavailable){
            const tick=performance.now(),me=c.world.players.find(p=>p.id===c.session.id);
            assert.ok(me,'Synthetic player disappeared');
            if(me.life!==c.generatedLife){c.queue=[];c.generatedLife=me.life;c.generatedAt=tick;c.contact=null;}
            const frameCount=Math.min(MAX_QUEUED_COMMANDS-c.queue.length,Math.floor((tick-c.generatedAt)/(1000/60)));
            const input=direction(me,c.world,c.index,tick-begin);
            for(let f=0;f<frameCount;f++)c.queue.push({...input,seq:++c.seq,life:me.life,dt:1/60});
            c.generatedAt+=frameCount*1000/60;c.queueMax=Math.max(c.queueMax,c.queue.length);
            if(workload==='journey'&&!c.contact&&me.phase==='arena'&&c.world.personal?.contactFrame){
              const bot=c.world.bots.find(b=>(b.spawnWait??0)<=0&&Math.hypot(me.x-b.x,me.y-b.y)<=29);
              if(bot)c.contact={frameId:c.world.personal.contactFrame,life:me.life,seq:me.ack,bot:bot.id,age:0,x:me.x,y:me.y,bx:bot.x,by:bot.y};
            }
            const measured=tick>=measureAt;
            try{
              const r=await post(c.mode,c.profile,c.session,{action:'input',commands:c.contact?[]:c.queue.slice(0,MAX_PACKET_COMMANDS),...(c.contact?{contact:c.contact}:{})});
              if(measured){times.push(r.ms);perMode[c.mode].times.push(r.ms);perMode[c.mode].status[r.status]=(perMode[c.mode].status[r.status]||0)+1;bytes.push(r.bytes);status[r.status]=(status[r.status]||0)+1;c.requests++;c.samples++;if(me.phase==='arena')c.activeSamples++;}
              if(r.status===200){
                lastSuccessAt=performance.now();
                c.world=r.data;const auth=r.data.players.find(p=>p.id===c.session.id);
                if(c.lastPosition&&measured)c.moved+=Math.hypot(auth.x-c.lastPosition.x,auth.y-c.lastPosition.y);
                c.lastPosition={x:auth.x,y:auth.y};
                if(auth.life>c.lastLife){if(measured)c.captures+=auth.life-c.lastLife;c.lastLife=auth.life;}
                c.queue=c.queue.filter(cmd=>cmd.seq>auth.ack&&cmd.life===auth.life);
                if(c.contact&&(auth.life>c.contact.life||r.data.contactReply?.status==='rejected'))c.contact=null;
                if(measured)updates.push(r.ms+60);
              }else if(measured&&errors.length<12)errors.push({status:r.status,message:r.data.error||'Request failed'});
            }catch(error){if(measured){status.network=(status.network||0)+1;perMode[c.mode].status.network=(perMode[c.mode].status.network||0)+1;if(errors.length<12)errors.push({message:error.name});}}
            await delay(60);
          }
        }));
      }finally{finishedAt=performance.now();sampling=false;await sampler;}
      const actualSeconds=Math.max(0,(finishedAt-measureAt)/1000),total=Object.values(status).reduce((a,b)=>a+b,0),failed=Object.entries(status).filter(([s])=>s!=='200').reduce((a,[,n])=>a+n,0);
      const result={modes:caseModes,playersPerMode:players,totalPlayers:clients.length,botsPerMode:bots,complexity,repetition,requestedSeconds:seconds,actualSeconds:+actualSeconds.toFixed(2),responseMs:stats(times),responseBytes:stats(bytes),stateBytes:stats(stateBytes),observedPlayersPerMode:stats(observedPlayers),status,errorRate:total?failed/total:1,successfulUpdatesPerPlayerSecond:(status[200]||0)/clients.length/Math.max(.001,actualSeconds),updateIntervalEstimateMs:stats(updates),generatorEventLoopP99Ms:+(loop.percentile(99)/1e6).toFixed(2),generatorMemoryMiB:+(process.memoryUsage().rss/2**20).toFixed(1),activePlayerFraction:clients.reduce((s,c)=>s+c.activeSamples,0)/Math.max(1,clients.reduce((s,c)=>s+c.samples,0)),lifeTransitions:clients.reduce((s,c)=>s+c.captures,0),maxCommandQueue:Math.max(...clients.map(c=>c.queueMax)),minPlayerDistanceMoved:Math.min(...clients.map(c=>c.moved)),generations:caseModes.map(mode=>({mode,generation:JSON.parse(database.prepare('SELECT state FROM arena WHERE id=?').get(mode==='motion'?'motion':'shared').state).generation})),errors};
      result.endedEarly=serverUnavailable;
      result.perMode=Object.entries(perMode).map(([mode,m])=>{
        const total=Object.values(m.status).reduce((a,b)=>a+b,0),failed=Object.entries(m.status).filter(([s])=>s!=='200').reduce((a,[,n])=>a+n,0);
        return {mode,responseMs:stats(m.times),status:m.status,errorRate:total?failed/total:1};
      });
      result.pass=!serverUnavailable&&actualSeconds>=seconds-.5&&observedPlayers.length>0&&Math.min(...observedPlayers)>=players&&result.perMode.every(m=>m.responseMs.p95!==null&&m.responseMs.p95<200&&m.errorRate<.01);
      delete report.currentCase;
      report.cases.push(result);save();console.log(JSON.stringify(result));
      let cleanupErrors=0;
      for(const c of clients)try{const r=await post(c.mode,c.profile,c.session,{action:'leave'});if(r.status!==200)cleanupErrors++;}catch{cleanupErrors++;}
      if(cleanupErrors){result.cleanupErrors=cleanupErrors;report.stoppedReason='Local preview did not accept synthetic-player cleanup; remaining cases were not started.';save();break caseLoop;}
    }
  }finally{loop.disable();database.close();}
}
report.finishedAt=new Date().toISOString();save();console.log('Saved aggregate results to '+output);
if(report.cases.some(result=>!result.pass))process.exitCode=1;
