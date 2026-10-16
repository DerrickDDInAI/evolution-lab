export type Pose={x:number;y:number;vx:number;vy:number};
export type Track={sample:Pose;stamp:number;receivedAt:number;frameAt:number;life:number;x:number;y:number;errorX:number;errorY:number;oneWay:number};
// Predict remote motion between packets and decay corrections in time, rather than
// easing to a stale position and stopping until the next network response.
export function trackRemote(previous:Track|undefined,sample:Pose,stamp:number,life:number,now:number,oneWay=0):Track {
  if(!previous||previous.life!==life||Math.hypot(sample.x-previous.sample.x,sample.y-previous.sample.y)>700){
    return {sample:{...sample},stamp,receivedAt:now,frameAt:now,life,x:sample.x+sample.vx*Math.min(.15,Math.max(0,oneWay)),y:sample.y+sample.vy*Math.min(.15,Math.max(0,oneWay)),errorX:0,errorY:0,oneWay};
  }
  if(previous.stamp!==stamp){
    const age=Math.min(.15,Math.max(0,oneWay));
    previous.errorX=previous.x-(sample.x+sample.vx*age);previous.errorY=previous.y-(sample.y+sample.vy*age);
    previous.sample={...sample};previous.stamp=stamp;previous.receivedAt=now;previous.oneWay=Math.max(0,oneWay);
  }
  const elapsed=Math.max(0,(now-previous.receivedAt)/1000),horizon=Math.min(1.25,Math.max(.35,previous.oneWay*2+.15)),age=Math.min(.15,previous.oneWay)+Math.min(horizon,elapsed),decay=Math.exp(-elapsed/.09);
  previous.x=previous.sample.x+previous.sample.vx*age+previous.errorX*decay;
  previous.y=previous.sample.y+previous.sample.vy*age+previous.errorY*decay;
  previous.frameAt=now;
  return previous;
}
export type Correction={x:number;y:number};
export function correctionFor(old:Pose|null,next:Pose,sameLife:boolean):Correction {
  if(!old||!sameLife||Math.hypot(old.x-next.x,old.y-next.y)>100)return {x:0,y:0};
  return {x:old.x-next.x,y:old.y-next.y};
}
export function decayCorrection(c:Correction,dt:number){const decay=Math.exp(-dt/.08);c.x*=decay;c.y*=decay;}
