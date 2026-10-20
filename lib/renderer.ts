import {GROUND_TILT,visibleGround,glassArt,ready,sprite,groundEllipse,depthOrder,overlaps,actorPose,directionalSprite,sprintFrame,sprintSprite,walkFrame,walkSprite,type ActorPose} from './glass-tide';
import { FIELD, walls } from './physics';
import {createEffects,updateEffects,cancelEffect,impactCamera,vanishing,drawImpacts,drawRespawns,drawHitFlash,type EffectTimeline,type CollisionEvent} from './collision-effects';
import {trackRemote,type Track} from './net-motion';
import type { snapshot } from './arena';
import type { PredictedPlayer } from './prediction';
export type View=ReturnType<typeof snapshot>;
type CanvasSize={width:number;height:number;observer:ResizeObserver|null;effects:EffectTimeline;motion:MediaQueryList|null;poses:Map<string,ActorPose>};
const surfaces=new WeakMap<HTMLCanvasElement,CanvasSize>();
function canvasSize(canvas:HTMLCanvasElement){
  let size=surfaces.get(canvas);
  if(!size){
    const rect=canvas.getBoundingClientRect();size={width:rect.width,height:rect.height,observer:null,effects:createEffects(),poses:new Map(),motion:typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null};
    if(typeof ResizeObserver!=='undefined'){
      const surface=size;surface.observer=new ResizeObserver(entries=>{const rect=entries[0]?.contentRect;if(rect){surface.width=rect.width;surface.height=rect.height;}});surface.observer.observe(canvas);
    }
    surfaces.set(canvas,size);
  }
  return size;
}
export function releaseRenderer(canvas:HTMLCanvasElement|null){if(canvas){surfaces.get(canvas)?.observer?.disconnect();surfaces.delete(canvas);}}
export function cancelCollision(canvas:HTMLCanvasElement|null,event:CollisionEvent){if(canvas){const surface=surfaces.get(canvas);if(surface)cancelEffect(surface.effects,event);}}
export function updatePositions(state:View|null,self:string|null,positions:Map<string,Track>,time:number,oneWay:number){
  const entities=[...(state?.bots||[]).map(b=>({...b,key:'b'+b.id,life:-(state?.generation||1)})),...(state?.players||[]).map(p=>({...p,key:'p'+p.id}))];
  for(const e of entities){
    if(e.key==='p'+self)continue;
    const bot=e.key[0]==='b',phase='phase' in e?e.phase:'arena';
    let previous=positions.get(e.key);
    if(bot&&previous&&previous.life!==e.life&&'homeX' in e&&Number.isFinite(e.homeX)&&Number.isFinite(e.homeY)){
      previous=trackRemote(undefined,{x:e.homeX!,y:e.homeY!,vx:0,vy:0},-1,e.life,time,0,state?.obstacles);
    }
    const track=trackRemote(previous,e,state?.simulationTime??state?.serverTime??0,e.life,time,oneWay,state?.obstacles,bot?13:16,phase);
    positions.set(e.key,track);
  }
}
export function renderArena(canvas:HTMLCanvasElement,mini:HTMLCanvasElement|null,state:View|null,self:string|null,positions:Map<string,Track>,zoom:number,time:number,predicted:PredictedPlayer|null=null,localEvent:CollisionEvent|null=null,pendingContact=false){
  const rect=canvasSize(canvas),dpr=Math.min(devicePixelRatio||1,1.5);
  if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);}
  const effects=rect.effects,reducedMotion=rect.motion?.matches||false;
  if(state)updateEffects(effects,[...(localEvent?[localEvent]:[]),...(state.collisions||[])],time,Math.max(state.serverTime,localEvent?.at||0));
  const heldImpact=impactCamera(effects,self,time,reducedMotion),ctx=canvas.getContext('2d')!;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const w=rect.width,h=rect.height,me=state?.players.find(p=>p.id===self);
  const camera=heldImpact||(me&&predicted?predicted:positions.get('p'+me?.id))||{x:3000,y:4850};
  const sx=(x:number)=>(x-camera.x)*zoom+w/2,sy=(y:number)=>(y-camera.y)*zoom*GROUND_TILT+h/2;
  const bounds=visibleGround(camera,zoom,w,h),art=glassArt();
  const visible=(x:number,y:number,pad=220)=>sx(x)>-pad&&sx(x)<w+pad&&sy(y)>-pad&&sy(y)<h+pad;
  ctx.fillStyle='#7fa6a3';ctx.fillRect(0,0,w,h);

  // A world-anchored texture: it never swims underneath the moving camera.
  if(ready(art.floor)){
    const tile=640;
    for(let y=Math.floor(bounds.top/tile)*tile;y<bounds.bottom;y+=tile){
      for(let x=Math.floor(bounds.left/tile)*tile;x<bounds.right;x+=tile){
        ctx.drawImage(art.floor,sx(x),sy(y),tile*zoom+.5,tile*zoom*GROUND_TILT+.5);
      }
    }
  }
  // The outside staging zone is pearl silt. The arena retains its exact square geometry.
  ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.rect(sx(FIELD.min),sy(FIELD.min),(FIELD.max-FIELD.min)*zoom,(FIELD.max-FIELD.min)*zoom*GROUND_TILT);ctx.clip('evenodd');
  ctx.fillStyle='#e9ddc790';ctx.fillRect(0,0,w,h);ctx.restore();

  type Actor={x:number;y:number;kind:'human'|'bot';id:string;name:string;own:boolean;warming:boolean;life:number;vx:number;vy:number};
  const actors:Actor[]=[];
  for(const b of state?.bots||[]){const p=positions.get('b'+b.id)||b;if(visible(p.x,p.y,80))actors.push({x:p.x,y:p.y,kind:'bot',id:String(b.id),name:'',own:false,warming:(b.spawnWait??0)>0,life:-(state?.generation||1),vx:b.vx,vy:b.vy});}
  for(const p of state?.players||[]){
    if((pendingContact&&p.id===self)||vanishing(effects,p.id,time,reducedMotion))continue;
    const pos=p.id===self&&predicted?predicted:positions.get('p'+p.id)||p;
    if(visible(pos.x,pos.y,80))actors.push({x:pos.x,y:pos.y,kind:'human',id:p.id,name:p.name,own:p.id===self,warming:false,life:p.life,vx:'vx' in pos?pos.vx:p.vx,vy:'vy' in pos?pos.vy:p.vy});
  }
  const liveKeys=new Set(actors.map(a=>a.kind+':'+a.id));
  for(const key of rect.poses.keys())if(!liveKeys.has(key))rect.poses.delete(key);
  const actorBoxes=actors.map(a=>({actor:a,box:{x:sx(a.x)-24*zoom,y:sy(a.y)-51*zoom,width:48*zoom,height:60*zoom}}));
  const objects:{y:number;order:number;draw:()=>void}[]=[];
  const plant=(x:number,y:number,r:number,cell:number,order:number)=>{
    if(!visible(x,y,r*3*zoom+50))return;
    const px=sx(x),py=sy(y),size=r*2.55*zoom;
    const box={x:px-size/2,y:py-size*.94,width:size,height:size};
    const obscures=actorBoxes.some(({actor,box:body})=>actor.y<y&&overlaps(box,body));
    objects.push({y,order,draw:()=>{
      ctx.save();ctx.globalAlpha=obscures ? .27 : 1;
      if(!sprite(ctx,art.atlas,cell,px,py+r*.12*zoom,size)){
        groundEllipse(ctx,px,py,r*zoom);ctx.fillStyle='#d7e2cf';ctx.fill();ctx.strokeStyle='#758e89';ctx.stroke();
      }
      ctx.restore();
    }});
  };

  // Walls remain solid at their original narrow footprint. Upright reeds are decoration.
  for(const wall of walls()){
    const wallVisible=wall.x+wall.w>=bounds.left&&wall.x<=bounds.right&&wall.y+wall.h>=bounds.top&&wall.y<=bounds.bottom;
    const x=sx(wall.x),y=sy(wall.y),ww=wall.w*zoom,hh=wall.h*zoom*GROUND_TILT;
    if(wallVisible){ctx.fillStyle='#eff1d9';ctx.strokeStyle='#718f85';ctx.lineWidth=1.5;ctx.fillRect(x,y,ww,hh);ctx.strokeRect(x,y,ww,hh);}
    const horizontal=wall.w>wall.h,length=horizontal?wall.w:wall.h;
    for(let offset=65;offset<length;offset+=155){
      const px=wall.x+(horizontal?offset:wall.w/2),py=wall.y+(horizontal?wall.h/2:offset);
      plant(px,py,34,5,0);
    }
  }
  const gates=[{x:3000,y:1200,label:'NORTH',horizontal:true},{x:4800,y:3000,label:'EAST',horizontal:false},{x:3000,y:4800,label:'SOUTH',horizontal:true},{x:1200,y:3000,label:'WEST',horizontal:false}];
  for(const gate of gates){
    if(!visible(gate.x,gate.y,180))continue;
    const x=sx(gate.x),y=sy(gate.y),extracting=state?.mode==='motion'&&predicted?.carrying,locked=predicted?.phase==='arena'&&!extracting;
    ctx.save();ctx.translate(x,y);ctx.scale(zoom,zoom*GROUND_TILT);
    ctx.fillStyle=locked?'#c38e6850':'#eef7da90';ctx.strokeStyle=locked?'#b87845':'#476a62';ctx.lineWidth=2;
    ctx.fillRect(gate.horizontal?-125:-12,gate.horizontal?-12:-125,gate.horizontal?250:24,gate.horizontal?24:250);
    ctx.setLineDash([6,9]);ctx.strokeRect(gate.horizontal?-125:-12,gate.horizontal?-12:-125,gate.horizontal?250:24,gate.horizontal?24:250);ctx.restore();
    ctx.font='600 10px system-ui';ctx.textAlign='center';ctx.fillStyle='#244d4c';
    ctx.fillText(gate.label+' PASSAGE',x,y+32*zoom);
    ctx.font='10px system-ui';ctx.fillText(extracting?'Reach this passage to extract':locked?(state?.mode==='motion'?'Collect the seed first':'Run in progress'):'Enter the shallows',x,y+47*zoom);
  }
  if(state?.resource&&!predicted?.carrying){
    const seed=state.resource,x=sx(seed.x),y=sy(seed.y);
    groundEllipse(ctx,x,y,seed.radius*zoom);ctx.fillStyle='#f9db7a55';ctx.fill();ctx.strokeStyle='#ffe5a0';ctx.lineWidth=2;ctx.stroke();
    if(!sprite(ctx,art.atlas,4,x,y+7*zoom,76*zoom)){ctx.fillStyle='#ffe5a0';ctx.beginPath();ctx.arc(x,y,15*zoom,0,Math.PI*2);ctx.fill();}
    ctx.font='600 12px system-ui';ctx.textAlign='center';ctx.fillStyle='#183f3d';ctx.fillText('LIFE-SUPPORT SEED',x,y+35*zoom);
  }
  for(let i=0;i<(state?.obstacles.length||0);i++){
    const o=state!.obstacles[i];if(!visible(o.x,o.y,o.r*3*zoom+50))continue;
    const x=sx(o.x),y=sy(o.y);
    groundEllipse(ctx,x,y,o.r*zoom);ctx.fillStyle='#527a7550';ctx.fill();ctx.strokeStyle='#355e5c80';ctx.lineWidth=1.2;ctx.stroke();
    plant(o.x,o.y,o.r,i%4===0?1:0,1);
  }
  // Small, low decoration has no collision: keep it away from obstacle-like silhouettes.
  const step=220;
  for(let y=Math.floor(bounds.top/step)*step;y<bounds.bottom;y+=step){
    for(let x=Math.floor(bounds.left/step)*step;x<bounds.right;x+=step){
      const seed=Math.abs(Math.sin(x*12.9898+y*78.233));if(seed<.68)continue;
      const px=sx(x+seed*85),py=sy(y+seed*63);
      ctx.save();ctx.globalAlpha=.19;sprite(ctx,art.atlas,5,px,py,28*zoom);ctx.restore();
    }
  }
  // Ground contact rings stay at the real world radius, even while upright art is animated.
  for(const actor of actors){
    const x=sx(actor.x),y=sy(actor.y),radius=actor.kind==='human'?16:13;
    groundEllipse(ctx,x,y,radius*zoom);ctx.fillStyle=actor.kind==='human'?'#173d4155':'#72543833';ctx.fill();
    ctx.strokeStyle=actor.own?'#fcf7dc':actor.kind==='human'?'#d7eff7':actor.warming?'#e2eeeb':'#b15b2c';
    ctx.lineWidth=(actor.own?2:1.3)*zoom;ctx.setLineDash(actor.warming?[3,3]:[]);ctx.stroke();ctx.setLineDash([]);
    if(!reducedMotion&&Math.hypot(actor.vx,actor.vy)>10){
      const ripple=(time%1300)/1300;ctx.globalAlpha=.28*(1-ripple);groundEllipse(ctx,x,y,(radius+8+20*ripple)*zoom);ctx.strokeStyle='#f5f3dc';ctx.stroke();ctx.globalAlpha=1;
    }
    const key=actor.kind+':'+actor.id,pose=actorPose(rect.poses.get(key),actor,time);
    rect.poses.set(key,pose);
    objects.push({y:actor.y,order:2,draw:()=>{
      const moving=pose.moving;
      const sway=reducedMotion?0:actor.kind==='human'?(moving?-Math.abs(Math.sin(pose.travel/9))*1.8*zoom:0):Math.sin(time/300+actor.x)*.7*zoom;
      const human=actor.kind==='human',size=(human?59:actor.warming?39:47)*zoom;
      const speed=Math.min(pose.speed,Math.hypot(actor.vx,actor.vy));
      const sprint=human?sprintFrame(pose.facing,pose.travel,pose.moving,speed,reducedMotion):null;
      const walk=human?walkFrame(pose.facing,pose.travel,pose.moving,speed,reducedMotion):null;
      const drawn=(sprint&&sprintSprite(ctx,art.sprint,sprint,x,y+4*zoom,size))||(walk&&walkSprite(ctx,art.walk,walk,x,y+4*zoom,size))||(!actor.warming&&directionalSprite(ctx,art.directions,human,pose.facing,x,y+4*zoom+sway,size));
      if(!drawn&&!sprite(ctx,art.atlas,human?2:actor.warming?4:3,x,y+4*zoom+sway,size,pose.facing>=1&&pose.facing<=3)){
        groundEllipse(ctx,x,y,radius*zoom);ctx.fillStyle=human?'#f5e9b3':actor.warming?'#e0e7dc':'#d78542';ctx.fill();
      }
    }});
  }
  for(const object of depthOrder(objects))object.draw();
  // Labels are a final layer and therefore never disappear behind foreground scenery.
  for(const a of actors.filter(a=>a.kind==='human')){
    const text=(a.own?'YOU · ':'')+a.name,x=sx(a.x),y=sy(a.y)-54*zoom;
    ctx.font=(a.own?'600 ':'')+'11px system-ui';const tw=ctx.measureText(text).width;
    ctx.fillStyle='#173a3ce0';ctx.beginPath();ctx.roundRect(x-tw/2-7,y-12,tw+14,19,8);ctx.fill();ctx.fillStyle='#faf3db';ctx.textAlign='center';ctx.fillText(text,x,y+1);
  }
  // Existing effect timelines use the same ground transform as contacts and respawns.
  ctx.save();ctx.scale(1,GROUND_TILT);
  const effectY=(y:number)=>sy(y)/GROUND_TILT;
  drawImpacts(ctx,effects,sx,effectY,zoom,time,self,w,h/GROUND_TILT,reducedMotion);
  drawRespawns(ctx,pendingContact?{...effects,active:effects.active.filter(e=>e.playerId!==self)}:effects,sx,effectY,zoom,time,self,reducedMotion);
  ctx.restore();drawHitFlash(ctx,effects,time,self,w,h,reducedMotion);
  if(me&&predicted?.phase==='safe'&&!heldImpact){
    const text='Walk through a passage to begin',tw=240;
    ctx.fillStyle='#1e4547db';ctx.beginPath();ctx.roundRect(w/2-tw/2,h/2+66,tw,29,14);ctx.fill();
    ctx.fillStyle='#f5efd7';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText(text,w/2,h/2+85);
  }
  // Gentle atmosphere at the edge, never a visibility mask over collision positions.
  const shade=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.35,w/2,h/2,Math.max(w,h)*.68);
  shade.addColorStop(0,'#173e4500');shade.addColorStop(1,'#173e4540');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
  if(mini){
    const c=mini.getContext('2d')!,mw=mini.width,mh=mini.height;
    c.clearRect(0,0,mw,mh);c.fillStyle='#153b3d';c.fillRect(0,0,mw,mh);
    c.strokeStyle='#789d91';c.lineWidth=1.5;c.strokeRect(FIELD.min/6000*mw,FIELD.min/6000*mh,(FIELD.max-FIELD.min)/6000*mw,(FIELD.max-FIELD.min)/6000*mh);
    c.strokeStyle='#bdd0b52b';c.lineWidth=.7;
    for(const o of state?.obstacles||[]){c.beginPath();c.moveTo(mw/2,mh/2);c.lineTo(o.x/6000*mw,o.y/6000*mh);c.stroke();c.fillStyle='#73958a';c.beginPath();c.arc(o.x/6000*mw,o.y/6000*mh,Math.max(1,o.r/6000*mw),0,Math.PI*2);c.fill();}
    if(state?.resource&&!predicted?.carrying){const x=state.resource.x/6000*mw,y=state.resource.y/6000*mh;c.fillStyle='#ffe17c';c.beginPath();c.moveTo(x,y-5);c.lineTo(x+5,y);c.lineTo(x,y+5);c.lineTo(x-5,y);c.closePath();c.fill();}
    c.fillStyle=state?.mode==='motion'&&predicted?.carrying?'#ffe17c':'#f4e9c8';for(const gate of gates)c.fillRect(gate.x/6000*mw-2,gate.y/6000*mh-2,4,4);
    for(const b of state?.bots||[]){const p=positions.get('b'+b.id)||b;c.fillStyle=(b.spawnWait??0)>0?'#c6dad5':'#f7ad68';c.beginPath();c.arc(p.x/6000*mw,p.y/6000*mh,1.8,0,Math.PI*2);c.fill();}
    for(const p of state?.players||[]){const pos=p.id===self&&predicted?predicted:positions.get('p'+p.id)||p;c.fillStyle=p.id===self?'#fff7dc':'#a7dae1';c.beginPath();c.arc(pos.x/6000*mw,pos.y/6000*mh,p.id===self?3:2,0,Math.PI*2);c.fill();}
    c.strokeStyle='#f7edceaa';c.lineWidth=1;c.strokeRect(bounds.left/6000*mw,bounds.top/6000*mh,(bounds.right-bounds.left)/6000*mw,(bounds.bottom-bounds.top)/6000*mh);
  }
}
