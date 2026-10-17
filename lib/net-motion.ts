import {moveActor,BOT_RADIUS,type Obstacle} from './physics';
export type Pose={x:number;y:number;vx:number;vy:number};
export const MAX_REMOTE_AGE=1.75;
export const leadTime=(oneWay:number)=>Math.min(.5,Math.max(0,oneWay));
export function remoteAge(track:Track,now:number){return leadTime(track.oneWay)+Math.min(Math.min(1.25,Math.max(.35,track.oneWay*2+.15)),Math.max(0,(now-track.receivedAt)/1000));}
export function projectBot(sample:Pose,age:number,obstacles:Obstacle[]):Pose {
  const p={...sample};moveActor(p,BOT_RADIUS,age,obstacles);return p;
}
export type Track={sample:Pose;stamp:number;receivedAt:number;frameAt:number;life:number;x:number;y:number;errorX:number;errorY:number;oneWay:number;angle:number;contactError?:number};
// Predict remote motion between packets and decay corrections in time, rather than
// easing to a stale position and stopping until the next network response.
export function trackRemote(previous:Track|undefined,sample:Pose,stamp:number,life:number,now:number,oneWay=0,obstacles?:Obstacle[],radius=BOT_RADIUS,phase:'safe'|'arena'='arena'):Track {
  const project=(p:Pose,age:number)=>{if(!obstacles)return {...p,x:p.x+p.vx*age,y:p.y+p.vy*age};const next={...p};moveActor(next,radius,age,obstacles,phase);return next;};
  if(!previous||previous.life!==life){
    const pose=project(sample,leadTime(oneWay));
    return {sample:{...sample},stamp,receivedAt:now,frameAt:now,life,x:pose.x,y:pose.y,errorX:0,errorY:0,oneWay,angle:Math.atan2(sample.vy,sample.vx)};
  }
  if(previous.stamp!==stamp){
    const pose=project(sample,leadTime(oneWay));
    previous.errorX=previous.x-pose.x;previous.errorY=previous.y-pose.y;
    // Preserve the entire offset: clipping it teleports the rendered actor on
    // packet arrival. Only a new life / generation is allowed to teleport.
    previous.sample={...sample};previous.stamp=stamp;previous.receivedAt=now;previous.oneWay=Math.max(0,oneWay);
  }
  const oldX=previous.x,oldY=previous.y,dt=Math.max(0,(now-previous.frameAt)/1000);
  const elapsed=Math.max(0,(now-previous.receivedAt)/1000),pose=project(previous.sample,remoteAge(previous,now)),decay=Math.exp(-elapsed/.18);
  const target={...pose,x:pose.x+previous.errorX*decay,y:pose.y+previous.errorY*decay};
  // Bound corrections per rendered frame, including after stalls or reversals.
  // A packet can change the destination, never the current displayed position.
  const dx=target.x-oldX,dy=target.y-oldY,distance=Math.hypot(dx,dy);
  const budget=Math.max(290,Math.hypot(sample.vx,sample.vy))*1.5*Math.min(dt,.05);
  const scale=distance?Math.min(1,budget/distance):0;
  const stepTime=Math.min(dt,.05)||1/60;
  const safe={x:oldX,y:oldY,vx:dx*scale/stepTime,vy:dy*scale/stepTime};
  if(obstacles)moveActor(safe,radius,stepTime,obstacles,phase);else{safe.x+=safe.vx*stepTime;safe.y+=safe.vy*stepTime;}
  previous.x=safe.x;previous.y=safe.y;
  previous.contactError=Math.hypot(previous.x-pose.x,previous.y-pose.y);
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
