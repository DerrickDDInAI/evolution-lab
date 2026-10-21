import {AdminError} from './admin-auth';
export const trainingJson=(body:unknown,status=200,headers:Record<string,string>={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
export async function boundedJson(request:Request,max:number):Promise<Record<string,unknown>>{
  const reader=request.body?.getReader();if(!reader)throw new AdminError('Choose a valid JSON file.',400);
  const chunks:Uint8Array[]=[];let size=0,oversized=false;
  try{
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){oversized=true;continue;}chunks.push(value);}
    // Drain oversized bodies without retaining them so the worker can reuse the connection.
    if(oversized)throw new AdminError('The request is too large. Model files must be at most 512 KiB.',413);
    const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.byteLength;}
    const value:unknown=JSON.parse(new TextDecoder().decode(bytes));
    if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();
    return value as Record<string,unknown>;
  }catch(error){if(error instanceof AdminError)throw error;throw new AdminError('Choose a valid JSON file.',400);}
  finally{reader.releaseLock();}
}
export function trainingFailure(error:unknown){return error instanceof AdminError?trainingJson({error:error.message},error.status):trainingJson({error:'Training controls are temporarily unavailable. Please retry.'},503);}

/** Release unread request data after early auth/origin rejection without buffering it. */
export async function discardRequestBody(request:Request){
  if(!request.body||request.bodyUsed)return;
  const reader=request.body.getReader();
  try{while(!(await reader.read()).done){/* discard */}}catch{/* A disconnected client needs no response recovery. */}finally{reader.releaseLock();}
}
