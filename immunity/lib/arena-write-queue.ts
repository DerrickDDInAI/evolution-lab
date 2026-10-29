// Coordinate writers sharing this isolate, without caching arena/session data.
// Only numeric tickets cross requests: sharing promises transfers Workers I/O
// context (including tracing spans) and can fail when a previous request ends.
export const MAX_PENDING_ARENA_WRITES=64;
export class ArenaWriteQueueFull extends Error {
  constructor(){super('Arena busy. Reconnecting…');}
}
type Ticket={id:number;expires:number};
type Queue={tickets:Ticket[];next:number};
type Options={now?:()=>number;wait?:()=>Promise<void>};
export function createArenaWriteQueue({now=Date.now,wait=()=>new Promise<void>(resolve=>setTimeout(resolve,1))}:Options={}){
  const queues=new Map<string,Queue>();
  const reap=(queue:Queue)=>{const at=now();queue.tickets=queue.tickets.filter(ticket=>ticket.expires>at);};
  return async function withArenaWrite<T>(key:string,operation:()=>Promise<T>):Promise<T>{
    const queue=queues.get(key)||{tickets:[],next:0};reap(queue);
    if(queue.tickets.length>=MAX_PENDING_ARENA_WRITES)throw new ArenaWriteQueueFull();
    const ticket={id:queue.next++,expires:now()+5000};queue.tickets.push(ticket);queues.set(key,queue);
    try{
      while(queue.tickets[0]!==ticket){
        reap(queue);
        if(!queue.tickets.includes(ticket))throw new ArenaWriteQueueFull();
        if(queue.tickets[0]!==ticket)await wait(); // Created in this request's I/O context.
      }
      // An abandoned request cannot leave the mode permanently locked. A slow
      // writer exceeding this lease still has to pass the database revision CAS.
      ticket.expires=now()+10000;
      return await operation();
    }finally{
      queue.tickets=queue.tickets.filter(other=>other!==ticket);
      if(queue.tickets.length===0&&queues.get(key)===queue)queues.delete(key);
    }
  };
}
export const withArenaWrite=createArenaWriteQueue();
