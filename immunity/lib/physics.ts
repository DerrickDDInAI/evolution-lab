export const SIZE = 6000;
// Budget for network jitter, not a speed multiplier: credit is earned only by
// elapsed server time, and each input sequence can still be consumed just once.
export const MAX_MOVEMENT_CREDIT = 3;
export const MAX_QUEUED_COMMANDS = 360;
export const MAX_PACKET_COMMANDS = 180;
export const FIELD = { min: 1200, max: 4800, middle: 3000, doorHalf: 125, wall: 24 };
export type Obstacle = { x: number; y: number; r: number };
export type Motion = { x: number; y: number; vx: number; vy: number; energy: number; phase: 'safe' | 'arena'; runStartedAt: number | null; respawnUntil: number; carrying?: boolean };
export type Command = { seq: number; life: number; dt: number; x: number; y: number; dash: boolean };
export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export const inside = (x: number, y: number, inset = 0) => x > FIELD.min + inset && x < FIELD.max - inset && y > FIELD.min + inset && y < FIELD.max - inset;
export function walls() {
  const {min,max,middle,doorHalf,wall} = FIELD, h=wall/2;
  return [min,max].flatMap(edge => [
    {x:min-h,y:edge-h,w:middle-doorHalf-min+h,h:wall},
    {x:middle+doorHalf,y:edge-h,w:max-middle-doorHalf+h,h:wall},
    {x:edge-h,y:min-h,w:wall,h:middle-doorHalf-min+h},
    {x:edge-h,y:middle+doorHalf,w:wall,h:max-middle-doorHalf+h},
  ]);
}
export function collideWalls(p: {x:number;y:number}, radius=16) {
  for (const wall of walls()) {
    const x=clamp(p.x,wall.x,wall.x+wall.w),y=clamp(p.y,wall.y,wall.y+wall.h),dx=p.x-x,dy=p.y-y,d=Math.hypot(dx,dy);
    if(d < radius && d>0){p.x=x+dx/d*radius;p.y=y+dy/d*radius;}
  }
}
export const BOT_RADIUS=13;
export function bodyClear(p:{x:number;y:number},radius:number,obstacles:Obstacle[]){
  return obstacles.every(o=>{const dx=p.x-o.x,dy=p.y-o.y,r=o.r+radius-1e-6;return dx*dx+dy*dy>=r*r;});
}
// Repair legacy/spawn overlaps before sweeping. Repeated projection handles
// overlapping rocks; a bounded radial search covers an enclosed intersection.
function resolveBody(p:{x:number;y:number},radius:number,obstacles:Obstacle[]){
  if(bodyClear(p,radius,obstacles))return false;
  const origin={x:p.x,y:p.y};
  for(let pass=0;pass<16;pass++){
    for(const o of obstacles){const dx=p.x-o.x,dy=p.y-o.y,d=Math.hypot(dx,dy),r=o.r+radius+.001;
      if(d<r){p.x=o.x+(d?dx/d:1)*r;p.y=o.y+(d?dy/d:0)*r;}
    }
    if(bodyClear(p,radius,obstacles))return true;
  }
  for(let distance=radius;distance<=600;distance+=radius)for(let i=0;i<32;i++){
    const angle=i*Math.PI/16,candidate={x:clamp(origin.x+Math.cos(angle)*distance,radius,SIZE-radius),y:clamp(origin.y+Math.sin(angle)*distance,radius,SIZE-radius)};
    if(bodyClear(candidate,radius,obstacles)){Object.assign(p,candidate);return true;}
  }
  return true;
}
export function moveBody(p:{x:number;y:number;vx:number;vy:number},radius:number,dt:number,obstacles:Obstacle[]) {
  let hit=resolveBody(p,radius,obstacles);
  let dx=clamp(p.x+p.vx*dt,radius,SIZE-radius)-p.x,dy=clamp(p.y+p.vy*dt,radius,SIZE-radius)-p.y;
  // Sweep the whole segment: neither a long frame nor a correction can jump
  // through a rock. Consume the remaining movement along the collision tangent.
  for(let pass=0;pass<8;pass++){
    const length2=dx*dx+dy*dy;if(length2<1e-12)break;
    let earliest=1,rock:Obstacle|undefined;
    for(const o of obstacles){
      const ox=p.x-o.x,oy=p.y-o.y,r=o.r+radius,b=ox*dx+oy*dy;
      if(b>=0)continue;
      const c=ox*ox+oy*oy-r*r,discriminant=b*b-length2*c;if(discriminant<0)continue;
      const t=(-b-Math.sqrt(discriminant))/length2;
      if(t>=-1e-8&&t<=earliest){earliest=Math.max(0,t);rock=o;}
    }
    if(!rock){p.x+=dx;p.y+=dy;break;}
    hit=true;const travel=Math.max(0,earliest-.0001/Math.sqrt(length2));p.x+=dx*travel;p.y+=dy*travel;
    const nx=p.x-rock.x,ny=p.y-rock.y,n=Math.hypot(nx,ny),ux=nx/n,uy=ny/n;
    dx*=1-earliest;dy*=1-earliest;const into=Math.min(0,dx*ux+dy*uy);dx-=into*ux;dy-=into*uy;
  }
  return hit;
}
// Shared collision, wall, boundary and realized-velocity rules for every actor.
// Radius is the physical size of the actor, not a different collision algorithm.
export function moveActor(p:{x:number;y:number;vx:number;vy:number},radius:number,dt:number,obstacles:Obstacle[],phase:'safe'|'arena'='arena') {
  const x=p.x,y=p.y,speed=Math.hypot(p.vx,p.vy);let hit=false;
  const steps=phase==='safe'?Math.max(1,Math.ceil(dt*60)):1;
  for(let i=0;i<steps;i++){
    hit=moveBody(p,radius,dt/steps,obstacles)||hit;
    if(phase==='arena'){
      const inset=FIELD.wall/2+radius,bx=p.x,by=p.y;
      p.x=clamp(p.x,FIELD.min+inset,FIELD.max-inset);p.y=clamp(p.y,FIELD.min+inset,FIELD.max-inset);
      hit=hit||bx!==p.x||by!==p.y;
    }else collideWalls(p,radius);
  }
  if(dt>0){p.vx=(p.x-x)/dt;p.vy=(p.y-y)/dt;const actual=Math.hypot(p.vx,p.vy);if(actual>speed){p.vx*=speed/actual;p.vy*=speed/actual;}}
  return hit;
}
// The same movement function runs immediately in the browser and authoritatively on the server.
export function movePlayer(p:Motion,c:Pick<Command,'x'|'y'|'dash'>,dt:number,obstacles:Obstacle[],now:number) {
  if(now<p.respawnUntil){p.vx=0;p.vy=0;return;}
  const len=Math.max(1,Math.hypot(c.x,c.y)),boost=c.dash&&p.energy>.08&&(c.x!==0||c.y!==0);
  p.energy=clamp(p.energy+(boost?-.65:.22)*dt,0,1);
  p.vx=c.x/len*(boost?430:255);p.vy=c.y/len*(boost?430:255);
  // Seed carriers use the real gate openings; other active actors stay contained.
  moveActor(p,16,dt,obstacles,p.carrying?'safe':p.phase);
  if(p.phase==='safe'&&inside(p.x,p.y,29)){p.phase='arena';p.runStartedAt=now;}
}
