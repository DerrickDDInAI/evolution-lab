import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {projectRoot} from './sites-env.mjs';

export function previewOptions(args,root=projectRoot){
  let port=5173,hostname='127.0.0.1',logLevel='warn',inspect=false,inspectorPort=9229;
  for(let i=0;i<args.length;i++){
    const separator=args[i].indexOf('='),flag=separator<0?args[i]:args[i].slice(0,separator);
    if(flag==='--inspect'&&separator<0){inspect=true;continue;}
    if(!['--port','--ip','--log-level','--inspector-port'].includes(flag))throw new Error('Unknown preview option: '+flag);
    const value=separator<0?args[++i]:args[i].slice(separator+1);
    if(value===undefined)throw new Error('Missing value for '+flag);
    if(flag==='--port'||flag==='--inspector-port'){
      const number=Number(value);
      if(!/^\d+$/.test(value)||!Number.isInteger(number)||number<0||number>65535)throw new Error('Invalid port for '+flag);
      if(flag==='--port')port=number;else inspectorPort=number;
    }else if(flag==='--ip'){
      if(!['127.0.0.1','localhost','::1'].includes(value))throw new Error('The local preview requires a loopback address.');
      hostname=value;
    }else{
      if(!['none','error','warn','info','debug'].includes(value))throw new Error('Invalid preview log level.');
      logLevel=value;
    }
  }
  const localSecrets=path.join(root,'.dev.vars');
  return {
    config:path.join(root,'dist/server/wrangler.json'),sendMetrics:false,
    ...(existsSync(localSecrets)?{envFiles:[localSecrets]}:{}),
    dev:{remote:false,persist:path.join(root,'.wrangler/state'),watch:false,logLevel,
      // Port 0 still enables Wrangler's inspector. With no debugger attached,
      // our pinned Wrangler buffers Network events without bound (#14191).
      // The programmatic API can actually disable this local-only subsystem.
      inspector:inspect?{hostname:'127.0.0.1',port:inspectorPort}:false,
      server:{hostname,port}},
  };
}

export async function startPreview(args,startWorker){
  const options=previewOptions(args);
  let worker,stopping=false,disposal;
  const stop=()=>{
    stopping=true;
    if(worker)disposal??=worker.dispose();
    return disposal||Promise.resolve();
  };
  const onSignal=()=>{void stop().catch(()=>{console.error('Could not stop the local preview cleanly.');process.exitCode=1;});};
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,onSignal);
  try{
    worker=await startWorker(options);
    if(stopping){await stop();return;}
    await worker.ready;
    if(stopping){await stop();return;}
    console.log('Local preview: '+await worker.url+(options.dev.inspector===false?' (inspector disabled)':''));
  }catch(error){
    await stop();
    for(const signal of ['SIGINT','SIGTERM'])process.removeListener(signal,onSignal);
    throw error;
  }
  return {worker,stop};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const {unstable_startWorker}=await import('wrangler');
  await startPreview(process.argv.slice(2),unstable_startWorker);
}
