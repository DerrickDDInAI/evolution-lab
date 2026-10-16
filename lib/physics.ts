export const SIZE = 6000;
// Budget for network jitter, not a speed multiplier: credit is earned only by
// elapsed server time, and each input sequence can still be consumed just once.
export const MAX_MOVEMENT_CREDIT = 3;
export const MAX_QUEUED_COMMANDS = 360;
export const MAX_PACKET_COMMANDS = 180;
export const FIELD = { min: 1200, max: 4800, middle: 3000, doorHalf: 125, wall: 24 };
export type Obstacle = { x: number; y: number; r: number };
export type Motion = { x: number; y: number; vx: number; vy: number; energy: number; phase: 'safe' | 'arena'; runStartedAt: number | null; respawnUntil: number };
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
export function moveBody(p:{x:number;y:number;vx:number;vy:number},radius:number,dt:number,obstacles:Obstacle[]) {
  p.x=clamp(p.x+p.vx*dt,radius,SIZE-radius);p.y=clamp(p.y+p.vy*dt,radius,SIZE-radius);
  let hit=false;
  for(const o of obstacles){const dx=p.x-o.x,dy=p.y-o.y,d=Math.hypot(dx,dy),r=o.r+radius;if(d<r){p.x=o.x+(d?dx/d:1)*r;p.y=o.y+(d?dy/d:0)*r;hit=true;}}
  return hit;
}
// The same movement function runs immediately in the browser and authoritatively on the server.
export function movePlayer(p:Motion,c:Pick<Command,'x'|'y'|'dash'>,dt:number,obstacles:Obstacle[],now:number) {
  if(now<p.respawnUntil){p.vx=0;p.vy=0;return;}
  const len=Math.max(1,Math.hypot(c.x,c.y)),boost=c.dash&&p.energy>.08&&(c.x!==0||c.y!==0);
  p.energy=clamp(p.energy+(boost?-.65:.22)*dt,0,1);
  p.vx=c.x/len*(boost?430:255);p.vy=c.y/len*(boost?430:255);
  moveBody(p,16,dt,obstacles);
  if(p.phase==='arena'){
    p.x=clamp(p.x,FIELD.min+28,FIELD.max-28);p.y=clamp(p.y,FIELD.min+28,FIELD.max-28);
  }else{
    collideWalls(p);
    if(inside(p.x,p.y,29)){p.phase='arena';p.runStartedAt=now;}
  }
}
