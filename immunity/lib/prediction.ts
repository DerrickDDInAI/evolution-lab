import { movePlayer,type Command,type Motion,type Obstacle } from './physics';
export type PredictedPlayer = Motion & {carrying?:boolean;id:string;life:number;ack:number;name:string};
// Replay only commands the server has not acknowledged. Other entities are interpolated.
export function reconcile(authoritative:PredictedPlayer,commands:Command[],obstacles:Obstacle[],now:number):PredictedPlayer {
  const p={...authoritative};
  for(const c of commands)if(c.seq>p.ack&&c.life===p.life)movePlayer(p,c,c.dt,obstacles,now);
  return p;
}
