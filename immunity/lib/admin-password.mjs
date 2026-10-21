import {scrypt,randomBytes,timingSafeEqual,createHash} from 'node:crypto';
// OWASP's scrypt N=2^14, r=8, p=5 profile: bounded memory for the worker runtime.
const options={N:16384,r:8,p:5,maxmem:64*1024*1024};
const derive=(password,salt)=>new Promise((resolve,reject)=>scrypt(password,salt,32,options,(error,key)=>error?reject(error):resolve(key)));
export const validPasswordHash=value=>typeof value==='string'&&/^scrypt-v1:[a-f0-9]{32}:[a-f0-9]{64}$/.test(value);
export const secretDigest=value=>createHash('sha256').update(value).digest('hex');
export async function hashAdminPassword(password){
  if(typeof password!=='string'||password.length<16||password.length>256)throw new Error('Use a password or passphrase between 16 and 256 characters.');
  const salt=randomBytes(16).toString('hex'),key=await derive(password,salt);
  return `scrypt-v1:${salt}:${key.toString('hex')}`;
}
export async function verifyAdminPassword(password,encoded){
  if(typeof password!=='string'||password.length<16||password.length>256||!validPasswordHash(encoded))return false;
  const [,salt,expected]=encoded.split(':'),key=await derive(password,salt);
  return timingSafeEqual(key,Buffer.from(expected,'hex'));
}
