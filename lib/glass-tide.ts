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

type Art={atlas:HTMLImageElement;floor:HTMLImageElement};
let art:Art|undefined;
export function glassArt(){
  if(!art){
    const atlas=new Image(),floor=new Image();
    atlas.src='/glass-tide/sprites.png';floor.src='/glass-tide/shallows.png';
    art={atlas,floor};
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
