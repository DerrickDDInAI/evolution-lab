import {moveBody,clamp,FIELD,BOT_RADIUS,type Obstacle} from './physics';
export type Pose={x:number;y:number;vx:number;vy:number};
export const MAX_REMOTE_AGE=1.75;
export const leadTime=(oneWay:number)=>Math.min(.5,Math.max(0,oneWay));
export function remoteAge(track:Track,now:number){return leadTime(track.oneWay)+Math.min(Math.min(1.25,Math.max(.35,track.oneWay*2+.15)),Math.max(0,(now-track.receivedAt)/1000));}
export function projectBot(sample:Pose,age:number,obstacles:Obstacle[]):Pose {
  const p={...sample};moveBody(p,BOT_RADIUS,age,obstacles);p.x=clamp(p.x,FIELD.min+25,FIELD.max-25);p.y=clamp(p.y,FIELD.min+25,FIELD.max-25);return p;
}
export type Track={sample:Pose;stamp:number;receivedAt:number;frameAt:number;life:number;x:number;y:number;errorX:number;errorY:number;oneWay:number;angle:number};
// Predict remote motion between packets and decay corrections in time, rather than
// easing to a stale position and stopping until the next network response.
export function trackRemote(previous:Track|undefined,sample:Pose,stamp:number,life:number,now:number,oneWay=0,obstacles?:Obstacle[]):Track {
  const project=(p:Pose,age:number)=>obstacles?projectBot(p,age,obstacles):{...p,x:p.x+p.vx*age,y:p.y+p.vy*age};
  if(!previous||previous.life!==life||Math.hypot(sample.x-previous.sample.x,sample.y-previous.sample.y)>700){
    const pose=project(sample,leadTime(oneWay));
    return {sample:{...sample},stamp,receivedAt:now,frameAt:now,life,x:pose.x,y:pose.y,errorX:0,errorY:0,oneWay,angle:Math.atan2(sample.vy,sample.vx)};
  }
  if(previous.stamp!==stamp){
    const pose=project(sample,leadTime(oneWay));
    previous.errorX=previous.x-pose.x;previous.errorY=previous.y-pose.y;
    const error=Math.hypot(previous.errorX,previous.errorY);
    if(error>100){previous.errorX*=100/error;previous.errorY*=100/error;}
    previous.sample={...sample};previous.stamp=stamp;previous.receivedAt=now;previous.oneWay=Math.max(0,oneWay);
  }
  const oldX=previous.x,oldY=previous.y,dt=Math.max(0,(now-previous.frameAt)/1000);
  const elapsed=Math.max(0,(now-previous.receivedAt)/1000),pose=project(previous.sample,remoteAge(previous,now)),decay=Math.exp(-elapsed/.18);
  const target={...pose,x:pose.x+previous.errorX*decay,y:pose.y+previous.errorY*decay};
  if(obstacles){
    // The correction itself must follow collision rules too. Checking only its
    // destination would still let a bot cut across a rock between valid samples.
    target.x=clamp(target.x,FIELD.min+25,FIELD.max-25);target.y=clamp(target.y,FIELD.min+25,FIELD.max-25);
    const safe={x:previous.x,y:previous.y,vx:target.x-previous.x,vy:target.y-previous.y};moveBody(safe,BOT_RADIUS,1,obstacles);
    previous.x=safe.x;previous.y=safe.y;
  }else{previous.x=target.x;previous.y=target.y;}
  if(Math.hypot(previous.x-oldX,previous.y-oldY)>.01){
    const angle=Math.atan2(previous.y-oldY,previous.x-oldX),delta=angle-previous.angle;
    previous.angle+=Math.atan2(Math.sin(delta),Math.cos(delta))*(1-Math.exp(-dt/.10));
  }
  previous.frameAt=now;
  return previous;
}
export type Correction={x:number;y:number};
export function correctionFor(old:Pose|null,next:Pose,sameLife:boolean):Correction {
  if(!old||!sameLife||Math.hypot(old.x-next.x,old.y-next.y)>100)return {x:0,y:0};
  return {x:old.x-next.x,y:old.y-next.y};
}
export function decayCorrection(c:Correction,dt:number){const decay=Math.exp(-dt/.08);c.x*=decay;c.y*=decay;}
