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

type Art={atlas:HTMLImageElement;floor:HTMLImageElement;directions:HTMLImageElement;sprint:HTMLImageElement;walk:HTMLImageElement};
let art:Art|undefined;
export function immunityArt(){
  if(!art){
    const atlas=new Image(),floor=new Image(),directions=new Image(),sprint=new Image(),walk=new Image();
    atlas.src='/immunity/sprites.webp';floor.src='/immunity/shallows.webp';
    directions.src='/immunity/directions.webp';
    sprint.src='/immunity/sprint.webp';
    walk.src='/immunity/walk.webp';
    art={atlas,floor,directions,sprint,walk};
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
export type ActorPose={x:number;y:number;life:number;time:number;facing:number;travel:number;moving:boolean;speed:number};
export function actorPose(previous:ActorPose|undefined,actor:{x:number;y:number;life:number;vx:number;vy:number},time:number):ActorPose{
  const reset=!previous||previous.life!==actor.life||Math.hypot(actor.x-previous.x,actor.y-previous.y)>160;
  if(reset)return {x:actor.x,y:actor.y,life:actor.life,time,facing:facingDirection(actor.vx,actor.vy),travel:0,moving:false,speed:0};
  const dt=(time-previous.time)/1000,dx=actor.x-previous.x,dy=actor.y-previous.y,distance=Math.hypot(dx,dy);
  const moving=dt>0&&dt<.25&&distance/dt>=8;
  return {x:actor.x,y:actor.y,life:actor.life,time,facing:moving?facingDirection(dx/dt,dy/dt,previous.facing):previous.facing,travel:previous.travel+(moving?distance:0),moving,speed:moving?distance/dt:0};
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

// Walk is 255 world units/s; sprint is 430. Use observed and authoritative
// speeds together so correction jumps or holding Shift against a wall cannot run.
export function sprintFrame(facing:number,travel:number,moving:boolean,speed:number,reducedMotion=false){
  if(!moving||!Number.isFinite(speed)||speed<=300)return null;
  const frame=reducedMotion?0:Math.floor(Math.max(0,travel)/40)%4;
  const row=[0,1,2,3,4,3,2,1][facing];
  // Reverse the frontal/rear strike pair to alternate the visible leading foot.
  const flip=(facing>=1&&facing<=3)||((row===0||row===4)&&frame>=2);
  return {row,frame,flip};
}
export function sprintSprite(ctx:CanvasRenderingContext2D,image:HTMLImageElement,pose:NonNullable<ReturnType<typeof sprintFrame>>,x:number,y:number,size:number){
  return gaitSprite(ctx,image,pose,x,y,size);
}
export function walkFrame(facing:number,travel:number,moving:boolean,speed:number,reducedMotion=false){
  if(!moving||!Number.isFinite(speed)||speed<8||speed>300)return null;
  // One continuous two-step cycle; distance keeps cadence tied to travel.
  const phase=reducedMotion?0:(Math.max(0,travel)%224)/224;
  const frame=Math.floor(phase*4);
  const row=[0,1,2,3,4,3,2,1][facing];
  // Footfalls come from independent legs; mirror only to change heading.
  return {row,frame,phase,flip:facing>=1&&facing<=3};
}
type Point=[number,number];
type WalkView={hip:Point;knee:Point;ankle:Point;center:number;baseline:number;thigh:Point[];shin:Point[];body:Point[]};
// Limb masks sample the existing painted armor. The cape/hips are composited
// over two independently articulated legs, rather than repeating a leading leg.
const WALK_VIEWS:WalkView[]=[
  {hip:[142,185],knee:[141,220],ankle:[145,263],center:154,baseline:288,
    thigh:[[126,178],[157,180],[158,215],[151,233],[128,231],[124,209]],
    shin:[[127,208],[157,210],[162,253],[166,280],[153,289],[129,286],[125,260]],
    body:[[0,0],[280,0],[280,300],[186,300],[184,224],[168,210],[155,189],[130,189],[118,214],[105,245],[0,245]]},
  {hip:[168,166],knee:[174,198],ankle:[177,242],center:171,baseline:265,
    thigh:[[151,153],[181,153],[194,185],[189,211],[159,212],[151,186]],
    shin:[[158,181],[190,181],[195,232],[215,248],[216,260],[197,266],[161,262],[154,230]],
    body:[[0,0],[280,0],[280,220],[209,200],[196,185],[182,164],[154,164],[140,185],[118,215],[101,270],[0,270]]},
  {hip:[181,153],knee:[198,191],ankle:[212,231],center:179,baseline:260,
    thigh:[[169,145],[198,158],[213,187],[210,207],[186,209],[171,187]],
    shin:[[186,177],[211,178],[223,219],[256,237],[259,248],[245,260],[203,260],[188,231]],
    body:[[0,0],[280,0],[280,180],[236,180],[211,166],[194,155],[171,155],[150,173],[126,194],[94,240],[0,240]]},
  {hip:[184,153],knee:[187,187],ankle:[180,231],center:162,baseline:255,
    thigh:[[167,144],[199,144],[207,179],[201,205],[171,205],[167,180]],
    shin:[[168,177],[201,177],[200,220],[214,238],[213,250],[190,258],[162,252],[160,227]],
    body:[[0,0],[280,0],[280,190],[216,180],[197,151],[178,151],[160,175],[145,205],[105,260],[0,260]]},
  {hip:[143,174],knee:[145,212],ankle:[143,253],center:140,baseline:275,
    thigh:[[127,165],[160,165],[165,203],[159,227],[129,227],[125,203]],
    shin:[[128,198],[160,198],[161,245],[158,269],[144,277],[128,272],[124,245]],
    body:[[0,0],[280,0],[280,305],[184,305],[171,211],[156,185],[132,185],[117,217],[111,305],[0,305]]},
];
export function walkLegMotion(phase:number){
  const p=((phase%1)+1)%1,support=p<.6;
  const swing=(p-.6)/.4;
  return {reach:support?1-2*p/.6:-Math.cos(swing*Math.PI),lift:support?0:Math.sin(swing*Math.PI),support};
}
function kneeBetween(hip:Point,ankle:Point,upper:number,lower:number,forward:Point):Point{
  const dx=ankle[0]-hip[0],dy=ankle[1]-hip[1],distance=Math.max(.001,Math.hypot(dx,dy));
  const d=Math.min(distance,upper+lower-.01),ux=dx/distance,uy=dy/distance;
  const along=(upper*upper-lower*lower+d*d)/(2*d),bend=Math.sqrt(Math.max(0,upper*upper-along*along));
  const side=(-uy*forward[0]+ux*forward[1])>=0?1:-1;
  return [hip[0]+ux*along-uy*bend*side,hip[1]+uy*along+ux*bend*side];
}
function mask(ctx:CanvasRenderingContext2D,points:Point[]){
  ctx.beginPath();ctx.moveTo(...points[0]);for(const point of points.slice(1))ctx.lineTo(...point);ctx.closePath();ctx.clip();
}
function paintedLimb(ctx:CanvasRenderingContext2D,image:HTMLImageElement,sy:number,sw:number,sh:number,sourceA:Point,sourceB:Point,targetA:Point,targetB:Point,points:Point[]){
  const sourceLength=Math.hypot(sourceB[0]-sourceA[0],sourceB[1]-sourceA[1]);
  const length=Math.hypot(targetB[0]-targetA[0],targetB[1]-targetA[1]);
  const angle=Math.atan2(targetB[1]-targetA[1],targetB[0]-targetA[0])-Math.atan2(sourceB[1]-sourceA[1],sourceB[0]-sourceA[0]);
  ctx.save();ctx.translate(...targetA);ctx.rotate(angle);ctx.scale(length/sourceLength,length/sourceLength);ctx.translate(-sourceA[0],-sourceA[1]);mask(ctx,points);
  ctx.drawImage(image,0,sy,sw,sh,0,0,280,sh/sw*280);ctx.restore();
}
export function walkSprite(ctx:CanvasRenderingContext2D,image:HTMLImageElement,pose:NonNullable<ReturnType<typeof walkFrame>>,x:number,y:number,size:number){
  if(!ready(image))return false;
  const {row,flip,phase}=pose,view=WALK_VIEWS[row],rows=[0,300,570,835,1095,1400];
  const sw=image.naturalWidth/4,sy=rows[row]/1400*image.naturalHeight,sh=(rows[row+1]-rows[row])/1400*image.naturalHeight;
  const scale=size*.88/280,fx=Math.sin(row*Math.PI/4),fy=Math.cos(row*Math.PI/4);
  const upper=Math.hypot(view.knee[0]-view.hip[0],view.knee[1]-view.hip[1]),lower=Math.hypot(view.ankle[0]-view.knee[0],view.ankle[1]-view.knee[1]);
  const bob=-Math.abs(Math.sin(phase*Math.PI*2))*2;
  ctx.save();ctx.translate(x,y);ctx.scale(flip?-scale:scale,scale);ctx.translate(-view.center,-view.baseline);
  for(const near of [false,true]){
    const motion=walkLegMotion(phase+(near?0:.5));
    const spread=row===0?-8:row===4?8:8*Math.abs(fy);
    const hip:Point=[view.hip[0]-(near?0:2*spread),view.hip[1]-(near?0:8*fx)+bob];
    const ankle:Point=[hip[0]+fx*motion.reach*25,view.hip[1]+(upper+lower)*.94-(near?0:8*fx)+fy*motion.reach*6-motion.lift*15];
    const forward:Point=fx>.001?[fx,fy*.2]:[(row===0?-1:1)*(near?.15:-.15),0];
    const knee=kneeBetween(hip,ankle,upper,lower,forward);
    paintedLimb(ctx,image,sy,sw,sh,view.hip,view.knee,hip,knee,view.thigh);
    paintedLimb(ctx,image,sy,sw,sh,view.knee,view.ankle,knee,ankle,view.shin);
  }
  ctx.save();ctx.translate(0,bob);mask(ctx,view.body);
  ctx.drawImage(image,0,sy,sw,sh,0,0,280,sh/sw*280);ctx.restore();ctx.restore();return true;
}
function gaitSprite(ctx:CanvasRenderingContext2D,image:HTMLImageElement,pose:{row:number;frame:number;flip:boolean},x:number,y:number,size:number){
  if(!ready(image))return false;
  const {row,frame,flip}=pose,rows=[0,300,570,830,1090,1400];
  const anchors=[292,563,820,1080,1365];
  const sw=image.naturalWidth/4,sy=rows[row]/1400*image.naturalHeight,sh=(rows[row+1]-rows[row])/1400*image.naturalHeight;
  const width=size*.88,height=sh/sw*width,hip=[.55,.66,.7,.64,.5][row],anchor=(anchors[row]-rows[row])/(rows[row+1]-rows[row]);
  ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);
  ctx.drawImage(image,frame*sw,sy,sw,sh,-width*hip,-height*anchor,width,height);
  ctx.restore();return true;
}
