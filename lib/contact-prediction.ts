import type {ContactReport,ContactReply} from './contact-report';
import type {PredictedPlayer} from './prediction';
import type {Track} from './net-motion';
import type {CollisionEvent} from './collision-effects';
import type {Run} from './arena';
export type LocalContact={event:CollisionEvent;player:PredictedPlayer;run:Run;life:number;seq:number;startedAt:number;report:ContactReport};
// Test the exact positions painted this frame, not the older network snapshot.
export function predictContact(player:PredictedPlayer|null,bots:{id:number}[],positions:Map<string,Track>,generation:number,now:number,serverNow:number,seq:number,frameId=''):LocalContact|null {
  if(!frameId||!player||player.phase!=='arena'||player.runStartedAt===null)return null;
  const bot=bots.find(b=>{const p=positions.get('b'+b.id);return p&&now-p.receivedAt<1500&&Math.hypot(player.x-p.x,player.y-p.y)<=29;});
  if(!bot)return null;
  const b=positions.get('b'+bot.id)!;
  const id=`local:${player.id}:${player.life}`;
  const elapsed=Math.max(0,(now-b.receivedAt)/1000),age=Math.min(.15,b.oneWay)+Math.min(Math.min(1.25,Math.max(.35,b.oneWay*2+.15)),elapsed);
  return {life:player.life,seq,startedAt:now,
    report:{frameId,life:player.life,seq,bot:bot.id,age,x:player.x,y:player.y,bx:b.x,by:b.y},
    event:{id,playerId:player.id,life:player.life,bot:bot.id,x:player.x,y:player.y,bx:b.x,by:b.y,respawnX:player.x,respawnY:player.y,at:serverNow},
    player:{...player,vx:0,vy:0},
    run:{id,durationMs:Math.max(0,Math.round(serverNow-player.runStartedAt)),generation,bot:bot.id,diedAt:serverNow}};
}
// Only a response to a request sent AFTER this contact can reject it. An older
// in-flight response is not evidence that the local prediction was wrong.
export function contactResult(contact:LocalContact,auth:PredictedPlayer,sentContact:LocalContact|null,reply?:ContactReply){
  if(auth.life>contact.life)return 'confirmed';
  if(sentContact===contact&&reply?.life===contact.life&&reply.seq===contact.seq&&reply.status==='rejected')return 'rejected';
  return 'pending';
}
