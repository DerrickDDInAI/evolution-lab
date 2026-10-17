import {bodyClear,BOT_RADIUS,type Obstacle} from './physics';
import {projectBot,MAX_REMOTE_AGE,type Pose} from './net-motion';
export type ContactFrame={id:string;at:number;life:number;generation:number;bots:(Pose&{id:number})[]};
export type ContactReport={frameId:string;life:number;seq:number;bot:number;age:number;x:number;y:number;bx:number;by:number};
export type ContactReply={life:number;seq:number;status:'pending'|'confirmed'|'rejected'};
export function validContactReport(r:any):r is ContactReport {
  return !!r&&typeof r.frameId==='string'&&r.frameId.length<=100&&['life','seq','bot'].every(k=>Number.isSafeInteger(r[k])&&r[k]>=0)&&['age','x','y','bx','by'].every(k=>Number.isFinite(r[k]))&&r.age>=0&&r.age<=MAX_REMOTE_AGE+.001;
}
// Validate against the frame actually sent to this player, even if a moving bot
// has passed the contact point by the time the report reaches the server.
export function matchesContact(frame:ContactFrame,r:ContactReport,p:{x:number;y:number;life:number},now:number,obstacles:Obstacle[]=[]){
  const bot=frame.bots.find(b=>b.id===r.bot);if(!bot||frame.life!==p.life||frame.life!==r.life||now-frame.at>8000||now<frame.at)return false;
  const {x:bx,y:by}=projectBot(bot,r.age,obstacles);
  if(!bodyClear({x:r.bx,y:r.by},BOT_RADIUS,obstacles))return false;
  return Math.hypot(r.x-r.bx,r.y-r.by)<=29.01&&Math.hypot(r.x-p.x,r.y-p.y)<=100.01&&Math.hypot(r.bx-bx,r.by-by)<=100.01;
}
