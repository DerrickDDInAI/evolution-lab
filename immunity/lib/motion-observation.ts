import {activate,type Genome} from './evolution';
import type {Obstacle} from './physics';

export const MOTION_CONTROLLER='motion-history-v1';
export const MOTION_RULES='immunity-motion-history-v1';
export const MOTION_INPUTS=['player x now','player y now','past x relative to latest (100ms)','past y relative to latest (100ms)','past x relative to latest (200ms)','past y relative to latest (200ms)','history coverage','obstacle dx','obstacle dy','obstacle clearance','bias'];
export type Observation={at:number;x:number;y:number};
export type MotionHistory=Record<string,{life:number;samples:Observation[]}>;
type Candidate={id:string;life:number;x:number;y:number};
type Observer={x:number;y:number;genome:Genome};

// Samples contain position only. Current location is relative to the bot; older
// locations are centered on the latest observed player location. This removes
// translation/ego-motion without calculating speed or classifying movement.
export function observePlayers(history:MotionHistory,players:Candidate[],at:number){
  const ids=new Set(players.map(p=>p.id));
  for(const id of Object.keys(history))if(!ids.has(id))delete history[id];
  for(const p of players){
    let track=history[p.id];
    if(!track||track.life!==p.life)track=history[p.id]={life:p.life,samples:[]};
    track.samples.push({at,x:p.x,y:p.y});
    track.samples=track.samples.filter(s=>at-s.at<=.3+1e-7).slice(-12);
  }
}
export function observationInputs(bot:Pick<Observer,'x'|'y'>,player:Candidate,history:MotionHistory,at:number,obstacle:Obstacle){
  const track=history[player.id],samples=track?.life===player.life?track.samples:[];
  const inputs:number[]=[];let available=0;
  for(const age of [0,.1,.2]){
    const sample=samples.findLast(s=>s.at<=at-age+1e-7);
    if(sample){inputs.push(age===0?(sample.x-bot.x)/800:(sample.x-player.x)/100,age===0?(sample.y-bot.y)/800:(sample.y-player.y)/100);available++;}
    else inputs.push(0,0);
  }
  const distance=Math.max(1,Math.hypot(obstacle.x-bot.x,obstacle.y-bot.y));
  inputs.push(available/3,(obstacle.x-bot.x)/distance,(obstacle.y-bot.y)/distance,Math.max(0,Math.min(1,(distance-obstacle.r)/300)),1);
  return inputs;
}
// Evaluate every player, including stationary ones. The evolved third output
// selects attention; a nonpositive score selects rest. No speed labels enter here.
export function motionDecision<T extends Candidate>(bot:Observer,players:T[],history:MotionHistory,at:number,obstacle:Obstacle){
  const candidates=players.map(player=>{
    const inputs=observationInputs(bot,player,history,at,obstacle);
    const [x,y,attention]=activate(bot.genome,inputs);
    return {player,x,y,attention,complete:inputs[6]===1};
  });
  const selected=candidates.reduce<typeof candidates[number]|null>((best,c)=>c.attention>0&&(!best||c.attention>best.attention)?c:best,null);
  return {candidates,selected};
}
