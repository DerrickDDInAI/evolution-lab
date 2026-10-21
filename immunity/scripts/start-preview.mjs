import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {projectRoot} from './sites-env.mjs';
const localSecrets=path.join(projectRoot,'.dev.vars');
const args=['./node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to','.wrangler/state','--ip','127.0.0.1','--inspector-port','0',
  ...(existsSync(localSecrets)?['--env-file',localSecrets]:[]),...process.argv.slice(2)];
const child=spawn(process.execPath,args,{cwd:projectRoot,env:process.env,stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??0;});
