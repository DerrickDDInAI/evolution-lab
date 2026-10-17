export type CollisionEvent = {
  id:string;playerId:string;life?:number;bot:number;x:number;y:number;bx:number;by:number;
  respawnX:number;respawnY:number;at:number;
};
export type CollisionEffect = CollisionEvent & {startedAt:number};
export type EffectTimeline = {ready:boolean;seen:Set<string>;active:CollisionEffect[]};
export const IMPACT_HOLD_MS=500, EFFECT_LIFETIME_MS=1250;
const eventKey=(e:CollisionEvent)=>e.life===undefined?e.id:`${e.playerId}:${e.life}`;
export function cancelEffect(timeline:EffectTimeline,event:CollisionEvent){timeline.active=timeline.active.filter(e=>eventKey(e)!==eventKey(event));timeline.seen.delete(eventKey(event));}
export const createEffects=():EffectTimeline=>({ready:false,seen:new Set(),active:[]});
// Receive each authoritative collision once. Do not replay old deaths on page load.
export function updateEffects(timeline:EffectTimeline,events:CollisionEvent[],now:number,serverTime:number){
  timeline.active=timeline.active.filter(e=>now-e.startedAt<EFFECT_LIFETIME_MS);
  for(const event of events){
    if(timeline.seen.has(eventKey(event)))continue;
    timeline.seen.add(eventKey(event));
    if(timeline.ready&&serverTime-event.at<5000)timeline.active.push({...event,startedAt:now});
  }
  timeline.ready=true;
  while(timeline.seen.size>96)timeline.seen.delete(timeline.seen.values().next().value!);
  if(timeline.active.length>24)timeline.active=timeline.active.slice(-24);
}
export function impactCamera(timeline:EffectTimeline,self:string|null,now:number,reducedMotion:boolean){
  if(reducedMotion||!self)return null;
  return [...timeline.active].reverse().find(e=>e.playerId===self&&now-e.startedAt<IMPACT_HOLD_MS)||null;
}
export function vanishing(timeline:EffectTimeline,player:string,now:number,reducedMotion:boolean){
  return !reducedMotion&&timeline.active.some(e=>e.playerId===player&&now-e.startedAt<IMPACT_HOLD_MS);
}
function circle(ctx:CanvasRenderingContext2D,x:number,y:number,r:number){ctx.beginPath();ctx.arc(x,y,Math.max(0,r),0,Math.PI*2);}
// A small fixed particle count keeps impacts cheap even when several players die.
export function drawImpacts(ctx:CanvasRenderingContext2D,timeline:EffectTimeline,sx:(x:number)=>number,sy:(y:number)=>number,zoom:number,now:number,self:string|null,width:number,height:number,reducedMotion:boolean){
  for(const e of timeline.active){
    const age=now-e.startedAt,duration=reducedMotion?220:850,t=Math.min(1,age/duration),x=sx(e.x),y=sy(e.y);
    if(t>=1||x< -130||x>width+130||y< -130||y>height+130)continue;
    const own=e.playerId===self,player=own?'#b6f1b3':'#89bbdf';
    ctx.save();ctx.globalAlpha=1-t;ctx.strokeStyle='#ffba83';ctx.lineWidth=(reducedMotion?3:3*(1-t)+1)*zoom;
    const radius=reducedMotion?32:18+88*(1-Math.pow(1-t,2));circle(ctx,x,y,radius*zoom);ctx.stroke();
    if(!reducedMotion){
      ctx.globalAlpha=(1-t)*.65;ctx.strokeStyle=player;ctx.lineWidth=1.5*zoom;circle(ctx,x,y,(15+t*65)*zoom);ctx.stroke();
      const direction=Math.atan2(e.y-e.by,e.x-e.bx);
      for(let i=0;i<16;i++){
        const angle=direction+i*Math.PI*2/16+(i%3)*.13,speed=45+(i%5)*16,travel=(1-Math.pow(1-t,3))*speed;
        const px=x+Math.cos(angle)*travel*zoom,py=y+Math.sin(angle)*travel*zoom;
        ctx.globalAlpha=Math.max(0,1-t*1.2);ctx.fillStyle=i%3===0?player:i%2?'#ffcb9a':'#fff4dd';
        const size=(2+(i%3))*(1-t)*zoom;ctx.fillRect(px-size/2,py-size/2,size,size);
      }
      // Leave a shrinking silhouette at the contact point as the real player respawns.
      const ghost=Math.max(0,1-age/IMPACT_HOLD_MS);
      ctx.globalAlpha=ghost;ctx.fillStyle=player;circle(ctx,x,y,(7+8*ghost)*zoom);ctx.fill();
      if(age<140){ctx.globalAlpha=(1-age/140)*.9;ctx.fillStyle='#fff8df';circle(ctx,x,y,(10+age*.09)*zoom);ctx.fill();}
      ctx.globalAlpha=(1-t)*.8;ctx.strokeStyle='#efad73';ctx.lineWidth=2*zoom;circle(ctx,sx(e.bx),sy(e.by),(17+t*20)*zoom);ctx.stroke();
    }
    ctx.restore();
  }
}
export function drawRespawns(ctx:CanvasRenderingContext2D,timeline:EffectTimeline,sx:(x:number)=>number,sy:(y:number)=>number,zoom:number,now:number,self:string|null,reducedMotion:boolean){
  for(const e of timeline.active){
    const age=now-e.startedAt,delay=reducedMotion?0:IMPACT_HOLD_MS,t=(age-delay)/(EFFECT_LIFETIME_MS-delay);
    if(t<0||t>=1)continue;
    ctx.save();ctx.globalAlpha=(1-t)*.8;ctx.strokeStyle=e.playerId===self?'#b6f1b3':'#89bbdf';ctx.lineWidth=2*zoom;
    circle(ctx,sx(e.respawnX),sy(e.respawnY),(reducedMotion?28:20+t*52)*zoom);ctx.stroke();
    if(!reducedMotion){ctx.globalAlpha=(1-t)*.3;circle(ctx,sx(e.respawnX),sy(e.respawnY),(24+t*72)*zoom);ctx.stroke();}
    ctx.restore();
  }
}
export function drawHitFlash(ctx:CanvasRenderingContext2D,timeline:EffectTimeline,now:number,self:string|null,width:number,height:number,reducedMotion:boolean){
  const hit=timeline.active.find(e=>e.playerId===self&&now-e.startedAt<240);if(!hit)return;
  const t=(now-hit.startedAt)/240;ctx.save();ctx.globalAlpha=(1-t)*(reducedMotion ? .035 : .12);ctx.fillStyle='#ff9e70';ctx.fillRect(0,0,width,height);ctx.restore();
}
