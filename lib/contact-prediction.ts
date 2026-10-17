import {FIELD} from './physics';
import type {PredictedPlayer} from './prediction';
import type {Track} from './net-motion';
import type {CollisionEvent} from './collision-effects';
import type {Run} from './arena';
export type LocalContact={event:CollisionEvent;player:PredictedPlayer;run:Run;life:number;seq:number;startedAt:number};
// Test the exact positions painted this frame, not the older network snapshot.
export function predictContact(player:PredictedPlayer|null,bots:{id:number}[],positions:Map<string,Track>,generation:number,now:number,serverNow:number,seq:number):LocalContact|null {
  if(!player||player.phase!=='arena'||player.runStartedAt===null)return null;
  const bot=bots.find(b=>{const p=positions.get('b'+b.id);return p&&now-p.receivedAt<1500&&Math.hypot(player.x-p.x,player.y-p.y)<=29;});
  if(!bot)return null;
  const b=positions.get('b'+bot.id)!;
  const distances=[Math.abs(player.y-FIELD.min),Math.abs(player.x-FIELD.max),Math.abs(player.y-FIELD.max),Math.abs(player.x-FIELD.min)];
  const [x,y]=[[3000,1050],[4950,3000],[3000,4950],[1050,3000]][distances.indexOf(Math.min(...distances))];
  const id=`local:${player.id}:${player.life}`;
  return {life:player.life,seq,startedAt:now,
    event:{id,playerId:player.id,life:player.life,bot:bot.id,x:player.x,y:player.y,bx:b.x,by:b.y,respawnX:x,respawnY:y,at:serverNow},
    player:{...player,x,y,vx:0,vy:0,phase:'safe',runStartedAt:null,respawnUntil:serverNow+1200},
    run:{id,durationMs:Math.max(0,Math.round(serverNow-player.runStartedAt)),generation,bot:bot.id,diedAt:serverNow}};
}
// Only a response to a request sent AFTER this contact can reject it. An older
// in-flight response is not evidence that the local prediction was wrong.
export function contactResult(contact:LocalContact,auth:PredictedPlayer,sentContact:LocalContact|null){
  if(auth.life>contact.life)return 'confirmed';
  if(sentContact===contact&&auth.life===contact.life&&auth.ack>=contact.seq)return 'rejected';
  return 'pending';
}
