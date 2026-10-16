import { FIELD, walls } from './physics';
import {trackRemote,type Track} from './net-motion';
import type { snapshot } from './arena';
import type { PredictedPlayer } from './prediction';
export type View=ReturnType<typeof snapshot>;
type CanvasSize={width:number;height:number;observer:ResizeObserver|null};
const surfaces=new WeakMap<HTMLCanvasElement,CanvasSize>();
function canvasSize(canvas:HTMLCanvasElement){
  let size=surfaces.get(canvas);
  if(!size){
    const rect=canvas.getBoundingClientRect();size={width:rect.width,height:rect.height,observer:null};
    if(typeof ResizeObserver!=='undefined'){
      const surface=size;surface.observer=new ResizeObserver(entries=>{const rect=entries[0]?.contentRect;if(rect){surface.width=rect.width;surface.height=rect.height;}});surface.observer.observe(canvas);
    }
    surfaces.set(canvas,size);
  }
  return size;
}
export function releaseRenderer(canvas:HTMLCanvasElement|null){if(canvas){surfaces.get(canvas)?.observer?.disconnect();surfaces.delete(canvas);}}
export function renderArena(canvas:HTMLCanvasElement,mini:HTMLCanvasElement|null,state:View|null,self:string|null,positions:Map<string,Track>,zoom:number,time:number,predicted:PredictedPlayer|null=null,oneWay=0){
  const rect=canvasSize(canvas),dpr=Math.min(devicePixelRatio||1,1.5);
  if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);}
  const ctx=canvas.getContext('2d')!;ctx.setTransform(dpr,0,0,dpr,0,0);const w=rect.width,h=rect.height;
  const entities=[...(state?.bots||[]).map(b=>({...b,key:'b'+b.id,life:-(state?.generation||1)})),...(state?.players||[]).map(p=>({...p,key:'p'+p.id}))];
  for(const e of entities){if(e.key==='p'+self&&predicted)continue;const track=trackRemote(positions.get(e.key),e,state?.serverTime||0,e.life,time,oneWay);if(e.key[0]==='b'||('phase' in e&&e.phase==='arena')){track.x=Math.max(FIELD.min+25,Math.min(FIELD.max-25,track.x));track.y=Math.max(FIELD.min+25,Math.min(FIELD.max-25,track.y));}positions.set(e.key,track);}
  const me=state?.players.find(p=>p.id===self),camera=(me&&predicted?predicted:positions.get('p'+me?.id))||{x:3000,y:4850};
  const sx=(x:number)=>(x-camera.x)*zoom+w/2,sy=(y:number)=>(y-camera.y)*zoom+h/2;
  ctx.fillStyle='#14261f';ctx.fillRect(0,0,w,h);ctx.fillStyle='#0c171c';ctx.fillRect(sx(FIELD.min),sy(FIELD.min),(FIELD.max-FIELD.min)*zoom,(FIELD.max-FIELD.min)*zoom);
  ctx.strokeStyle='#1b2a2e';ctx.lineWidth=.6;
  const unit=100*zoom,offsetX=((w/2-camera.x*zoom)%unit+unit)%unit,offsetY=((h/2-camera.y*zoom)%unit+unit)%unit;
  ctx.beginPath();for(let x=offsetX;x<w;x+=unit){ctx.moveTo(x,0);ctx.lineTo(x,h);}for(let y=offsetY;y<h;y+=unit){ctx.moveTo(0,y);ctx.lineTo(w,y);}ctx.stroke();
  ctx.fillStyle='#334246';for(let x=offsetX;x<w;x+=unit)for(let y=offsetY;y<h;y+=unit)ctx.fillRect(x-1,y-1,2,2);
  ctx.strokeStyle='#637472';ctx.lineWidth=2;ctx.strokeRect(sx(0),sy(0),6000*zoom,6000*zoom);
  ctx.font='10px monospace';ctx.fillStyle='#46595d';ctx.textAlign='left';
  for(let x=Math.floor((camera.x-w/2/zoom)/500)*500;x<camera.x+w/2/zoom;x+=500)ctx.fillText(String(x).padStart(4,'0'),sx(x)+8,20);
  // Four physical walls with real door openings and a safe staging area outside.
  for(const wall of walls()){ctx.fillStyle='#28423e';ctx.fillRect(sx(wall.x),sy(wall.y),wall.w*zoom,wall.h*zoom);ctx.strokeStyle='#658e76';ctx.lineWidth=1;ctx.strokeRect(sx(wall.x),sy(wall.y),wall.w*zoom,wall.h*zoom);}
  const gates=[{x:3000,y:1200,label:'NORTH',angle:Math.PI/2},{x:4800,y:3000,label:'EAST',angle:Math.PI},{x:3000,y:4800,label:'SOUTH',angle:-Math.PI/2},{x:1200,y:3000,label:'WEST',angle:0}];
  for(const gate of gates){
    const x=sx(gate.x),y=sy(gate.y);if(x< -180||x>w+180||y< -180||y>h+180)continue;
    const locked=predicted?.phase==='arena';ctx.save();ctx.translate(x,y);ctx.rotate(gate.angle);
    ctx.fillStyle=locked?'#e6a86a55':'#b6f1b355';ctx.fillRect(-10*zoom,-125*zoom,20*zoom,250*zoom);
    ctx.strokeStyle=locked?'#e6a86a':'#b6f1b3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-25*zoom,-16*zoom);ctx.lineTo(-9*zoom,0);ctx.lineTo(-25*zoom,16*zoom);ctx.stroke();ctx.restore();
    ctx.fillStyle=locked?'#d3a474':'#b6f1b3';ctx.font='10px monospace';ctx.textAlign='center';ctx.fillText(gate.label+' DOOR',x,y-27*zoom);ctx.fillStyle='#8fae96';ctx.font='9px monospace';ctx.fillText(locked?'RUN ACTIVE · NO EXIT':'CROSS TO START YOUR RUN',x,y+43*zoom);
  }
  if(me&&predicted?.phase==='safe'){ctx.font='11px monospace';ctx.textAlign='center';ctx.fillStyle='#aac9b0';ctx.fillText('SAFE ZONE · ENTER THROUGH A DOOR',w/2,h/2+90);}
  const obstacles=state?.obstacles||[];
  for(const o of obstacles){const x=sx(o.x),y=sy(o.y),r=o.r*zoom;if(x+r<0||y+r<0||x-r>w||y-r>h)continue;
    ctx.fillStyle='#172b2d';ctx.strokeStyle='#2c4647';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.strokeStyle='#233c3d';ctx.beginPath();ctx.arc(x,y,r-7,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#3b5554';ctx.fillRect(x-2,y-2,4,4);
  }
  for(const b of state?.bots||[]){const p=positions.get('b'+b.id)||b,x=sx(p.x),y=sy(p.y),r=12*zoom;
    if(x< -30||y< -30||x>w+30||y>h+30)continue;
    ctx.strokeStyle='#d68f4933';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,r+7,0,Math.PI*2);ctx.stroke();
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(b.vy,b.vx));ctx.fillStyle='#f1ac69';ctx.beginPath();ctx.moveTo(r,0);ctx.lineTo(-r*.65,-r*.7);ctx.lineTo(-r*.4,0);ctx.lineTo(-r*.65,r*.7);ctx.closePath();ctx.fill();ctx.restore();
    ctx.font='9px monospace';ctx.textAlign='center';ctx.fillStyle='#ae865f';ctx.fillText('B'+String(b.id+1).padStart(2,'0'),x,y+r+17);
  }
  for(const p of state?.players||[]){const pos=p.id===self&&predicted?predicted:positions.get('p'+p.id)||p,x=sx(pos.x),y=sy(pos.y),r=15*zoom;ctx.fillStyle=p.id===self?'#b6f1b3':'#89bbdf';
    ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=16;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    ctx.strokeStyle=p.id===self?'#b6f1b366':'#89bbdf55';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,r+8,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#10291c';ctx.beginPath();ctx.arc(x+4*zoom,y-3*zoom,3*zoom,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#d2e3da';ctx.font='11px monospace';ctx.textAlign='center';ctx.fillText(p.id===self?'YOU · '+p.name:p.name,x,y-r-15);
  }
  if(!me){ctx.strokeStyle='#b6f1b322';ctx.setLineDash([4,8]);ctx.beginPath();ctx.arc(w/2,h/2,70*zoom,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#b6f1b344';ctx.fillRect(w/2-5,h/2-1,10,2);ctx.fillRect(w/2-1,h/2-5,2,10);}
  if(mini){const c=mini.getContext('2d')!,mw=mini.width,mh=mini.height;c.fillStyle='#101e23';c.fillRect(0,0,mw,mh);c.strokeStyle='#718b75';c.lineWidth=2;c.strokeRect(FIELD.min/6000*mw,FIELD.min/6000*mh,(FIELD.max-FIELD.min)/6000*mw,(FIELD.max-FIELD.min)/6000*mh);c.fillStyle='#b6f1b3';for(const gate of [[3000,1200],[4800,3000],[3000,4800],[1200,3000]])c.fillRect(gate[0]/6000*mw-2,gate[1]/6000*mh-2,4,4);c.fillStyle='#2c4141';for(const o of obstacles){c.beginPath();c.arc(o.x/6000*mw,o.y/6000*mh,Math.max(1,o.r/6000*mw),0,7);c.fill();}
    c.fillStyle='#e5a568';for(const b of state?.bots||[])c.fillRect(b.x/6000*mw,b.y/6000*mh,2,2);
    for(const p of state?.players||[]){c.fillStyle=p.id===self?'#b6f1b3':'#89bbdf';c.beginPath();c.arc(p.x/6000*mw,p.y/6000*mh,3,0,7);c.fill();}
    c.strokeStyle='#b6f1b388';c.lineWidth=1;c.strokeRect((camera.x-w/2/zoom)/6000*mw,(camera.y-h/2/zoom)/6000*mh,w/zoom/6000*mw,h/zoom/6000*mh);
  }
}
