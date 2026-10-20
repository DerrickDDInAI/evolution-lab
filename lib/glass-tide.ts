// Presentation only. Physics, input, prediction and contact reports stay in world space.
export const GROUND_TILT = 0.68;
export type GroundPoint = {x:number;y:number};
export function projectGround(point:GroundPoint,camera:GroundPoint,zoom:number,width:number,height:number){
  return {x:(point.x-camera.x)*zoom+width/2,y:(point.y-camera.y)*zoom*GROUND_TILT+height/2};
}
export function unprojectGround(point:GroundPoint,camera:GroundPoint,zoom:number,width:number,height:number){
  return {x:(point.x-width/2)/zoom+camera.x,y:(point.y-height/2)/(zoom*GROUND_TILT)+camera.y};
}
export function visibleGround(camera:GroundPoint,zoom:number,width:number,height:number){
  return {left:camera.x-width/2/zoom,right:camera.x+width/2/zoom,top:camera.y-height/2/zoom/GROUND_TILT,bottom:camera.y+height/2/zoom/GROUND_TILT};
}
export type ScreenBox={x:number;y:number;width:number;height:number};
export function overlaps(a:ScreenBox,b:ScreenBox){
  return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
}
export function depthOrder<T extends {y:number;order:number}>(items:T[]):T[]{
  return [...items].sort((a,b)=>a.y-b.y||a.order-b.order);
}

type Art={atlas:HTMLImageElement;floor:HTMLImageElement;directions:HTMLImageElement};
let art:Art|undefined;
export function glassArt(){
  if(!art){
    const atlas=new Image(),floor=new Image(),directions=new Image();
    atlas.src='/glass-tide/sprites.png';floor.src='/glass-tide/shallows.png';
    directions.src='/glass-tide/directions.png';
    art={atlas,floor,directions};
  }
  return art;
}
export function ready(image:HTMLImageElement){return image.complete&&image.naturalWidth>0;}
// Equal atlas cells are sampled directly, preserving the original generated alpha.
export function sprite(ctx:CanvasRenderingContext2D,image:HTMLImageElement,cell:number,x:number,y:number,size:number,flip=false){
  if(!ready(image))return false;
  const sw=image.naturalWidth/3,sh=image.naturalHeight/2;
  ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);
  ctx.drawImage(image,(cell%3)*sw,Math.floor(cell/3)*sh,sw,sh,-size/2,-size*.94,size,size);
  ctx.restore();return true;
}
export function groundEllipse(ctx:CanvasRenderingContext2D,x:number,y:number,r:number){
  ctx.beginPath();ctx.ellipse(x,y,r,r*GROUND_TILT,0,0,Math.PI*2);
}

// Clockwise world headings, starting south: S, SW, W, NW, N, NE, E, SE.
export function facingDirection(vx:number,vy:number,previous=0){
  if(!Number.isFinite(vx)||!Number.isFinite(vy)||Math.hypot(vx,vy)<8)return previous;
  const angle=(Math.atan2(-vx,vy)+Math.PI*2)%(Math.PI*2),sector=Math.PI/4;
  const difference=Math.abs(Math.atan2(Math.sin(angle-previous*sector),Math.cos(angle-previous*sector)));
  // Extra six degrees beyond a sector edge prevents tiny corrections flipping poses.
  return difference<=sector/2+Math.PI/30?previous:Math.round(angle/sector)%8;
}
export type ActorPose={x:number;y:number;life:number;time:number;facing:number;travel:number;moving:boolean};
export function actorPose(previous:ActorPose|undefined,actor:{x:number;y:number;life:number;vx:number;vy:number},time:number):ActorPose{
  const reset=!previous||previous.life!==actor.life||Math.hypot(actor.x-previous.x,actor.y-previous.y)>160;
  if(reset)return {x:actor.x,y:actor.y,life:actor.life,time,facing:facingDirection(actor.vx,actor.vy),travel:0,moving:false};
  const dt=(time-previous.time)/1000,dx=actor.x-previous.x,dy=actor.y-previous.y,distance=Math.hypot(dx,dy);
  const moving=dt>0&&dt<.25&&distance/dt>=8;
  return {x:actor.x,y:actor.y,life:actor.life,time,facing:moving?facingDirection(dx/dt,dy/dt,previous.facing):previous.facing,travel:previous.travel+(moving?distance:0),moving};
}
// Generated views are mapped explicitly after visual inspection. Mirroring the
// matching three-quarter/profile view gives consistent left/right anatomy.
export function directionalFrame(human:boolean,facing:number){
  const frames=human?[0,7,6,3,4,3,6,7]:[8,15,10,11,12,11,10,15];
  return {cell:frames[facing],flip:facing>=1&&facing<=3};
}
export function directionalSprite(ctx:CanvasRenderingContext2D,image:HTMLImageElement,human:boolean,facing:number,x:number,y:number,size:number){
  if(!ready(image))return false;
  const {cell,flip}=directionalFrame(human,facing),row=Math.floor(cell/4);
  // The generated sheet has slightly unequal row spacing; preserve complete
  // silhouettes and align their actual feet/tails, instead of clipping a grid.
  const rows=[0,330,640,930,1280],anchors=[320,620,915,1195],unit=image.naturalWidth/1280;
  const sy=rows[row]*unit,sh=(rows[row+1]-rows[row])*unit,sw=image.naturalWidth/4;
  ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);
  ctx.drawImage(image,(cell%4)*sw,sy,sw,sh,-size/2,-(anchors[row]-rows[row])/320*size,size,sh/sw*size);
  ctx.restore();return true;
}
