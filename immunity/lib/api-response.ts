/** Hosts and proxies can return HTML or cut off JSON when a Worker runs out of CPU. */
export async function readApiJson<T>(response:Response,fallback:string):Promise<T>{
  let text:string;
  try{text=await response.text();}catch{throw new Error(fallback);}
  let value:unknown;
  try{value=JSON.parse(text);}catch{
    if(/\berror(?: code)?[ :]+1102\b|Worker exceeded (?:resource|CPU time) limit/i.test(text)){
      throw new Error('The game server reached its processing limit. Please retry shortly. Repeated failures need the host’s CPU allowance increased.');
    }
    throw new Error(fallback);
  }
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(fallback);
  return value as T;
}
