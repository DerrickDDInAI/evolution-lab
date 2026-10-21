import {hashAdminPassword} from '../lib/admin-password.mjs';
import {readFile,writeFile,chmod} from 'node:fs/promises';
// Read from a hidden terminal prompt; never pass passwords as shell arguments or log them.
if(!process.stdin.isTTY)throw new Error('Run this command in an interactive terminal.');
async function hidden(prompt){
  process.stdout.write(prompt);process.stdin.setRawMode(true);process.stdin.resume();
  return new Promise((resolve,reject)=>{
    let value='';
    const done=()=>{process.stdin.off('data',onData);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');};
    function onData(chunk){for(const c of chunk.toString()){
      if(c==='\u0003'){done();reject(new Error('Cancelled.'));return;}
      if(c==='\r'||c==='\n'){done();resolve(value);return;}
      if(c==='\u007f'||c==='\b')value=value.slice(0,-1);else if(c>=' ')value+=c;
    }}process.stdin.on('data',onData);
  });
}
try{
  const password=await hidden('Administrator passphrase (16+ characters): '),again=await hidden('Repeat passphrase: ');
  if(password!==again)throw new Error('The passphrases did not match. Nothing was changed.');
  const hash=await hashAdminPassword(password),file='.dev.vars';
  let previous='';try{previous=await readFile(file,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
  const line=`IMMUNITY_ADMIN_PASSWORD_HASH="${hash}"`;
  const next=/^IMMUNITY_ADMIN_PASSWORD_HASH=.*$/m.test(previous)?previous.replace(/^IMMUNITY_ADMIN_PASSWORD_HASH=.*$/m,()=>line):`${previous}${previous&&!previous.endsWith('\n')?'\n':''}${line}\n`;
  await writeFile(file,next,{mode:0o600});await chmod(file,0o600);
  console.log('Saved the password hash in ignored .dev.vars. Restart the local preview. Existing administrator sessions expire after rotation.');
  console.log('For hosting, configure IMMUNITY_ADMIN_PASSWORD_HASH as a server secret using this file’s value; never publish .dev.vars.');
}catch(error){console.error(error.message);process.exitCode=1;}
