// Presentation only. Physics, input, prediction and contact reports stay in world space.
export const GROUND_TILT = 0.68;
export const SURVIVOR_SIZE = 59;
// Model-space foot travel must equal world travel during ground contact.
export function survivorGait(sprinting=false){
  const stride=sprinting?68:55,cycle=sprinting?216:156;
  return {stride,cycle,stance:2*stride*(SURVIVOR_SIZE*.88/280)/cycle};
}
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
export type ActorPose={x:number;y:number;life:number;time:number;facing:number;travel:number;moving:boolean;speed:number;direction?:GroundPoint;motionTime?:number};
export function actorPose(previous:ActorPose|undefined,actor:{x:number;y:number;life:number;vx:number;vy:number},time:number):ActorPose{
  const reset=!previous||previous.life!==actor.life||Math.hypot(actor.x-previous.x,actor.y-previous.y)>160;
  if(reset)return {x:actor.x,y:actor.y,life:actor.life,time,facing:facingDirection(actor.vx,actor.vy),travel:0,moving:false,speed:0,motionTime:time};
  const dt=(time-previous.time)/1000,dx=actor.x-previous.x,dy=actor.y-previous.y,distance=Math.hypot(dx,dy);
  const stepped=dt>0&&dt<.25&&distance/dt>=8,motionTime=stepped?time:previous.motionTime??previous.time;
  // Rendering may run faster than the 60 Hz movement simulation. An unchanged
  // position between ticks is not idle; hold the pose without inventing travel.
  const betweenTicks=dt>0&&dt<.25&&distance===0&&previous.moving&&time-motionTime<50&&Math.hypot(actor.vx,actor.vy)>=8;
  const moving=stepped||betweenTicks;
  return {x:actor.x,y:actor.y,life:actor.life,time,facing:stepped?facingDirection(dx/dt,dy/dt,previous.facing):previous.facing,travel:previous.travel+(stepped?distance:0),moving,speed:stepped?distance/dt:betweenTicks?previous.speed:0,direction:stepped?{x:dx/distance,y:dy/distance}:previous.direction,motionTime};
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
export function sprintFrame(facing:number,travel:number,moving:boolean,speed:number,reducedMotion=false,direction?:GroundPoint){
  if(!moving||!Number.isFinite(speed)||speed<=300)return null;
  const phase=reducedMotion?0:(Math.max(0,travel)%survivorGait(true).cycle)/survivorGait(true).cycle,frame=Math.floor(phase*4);
  const row=[0,1,2,3,4,3,2,1][facing];
  // Reverse the frontal/rear strike pair to alternate the visible leading foot.
  const flip=(facing>=1&&facing<=3)||((row===0||row===4)&&frame>=2);
  return {row,frame,flip,phase,direction};
}
export function sprintSprite(ctx:CanvasRenderingContext2D,image:HTMLImageElement,pose:NonNullable<ReturnType<typeof sprintFrame>>,x:number,y:number,size:number){
  return gaitSprite(ctx,image,pose,x,y,size);
}
export function walkFrame(facing:number,travel:number,moving:boolean,speed:number,reducedMotion=false,direction?:GroundPoint){
  if(!moving||!Number.isFinite(speed)||speed<8||speed>300)return null;
  // One continuous two-step cycle; distance keeps cadence tied to travel.
  const phase=reducedMotion?0:(Math.max(0,travel)%survivorGait().cycle)/survivorGait().cycle;
  const frame=Math.floor(phase*4);
  const row=[0,1,2,3,4,3,2,1][facing];
  // Footfalls come from independent legs; mirror only to change heading.
  return {row,frame,phase,flip:facing>=1&&facing<=3,direction};
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
export function walkLegMotion(phase:number,stance=survivorGait().stance){
  const p=((phase%1)+1)%1,support=p<stance;
  if(support)return {reach:1-2*p/stance,lift:0,support};
  const swing=(p-stance)/(1-stance),transition=stance*.08;
  let reach:number;
  // Match planted velocity at lift-off and landing, easing into the longer
  // return swing. A small follow-through avoids an abrupt direction reversal.
  if(p<stance+transition){
    const t=(p-stance)/transition;
    reach=-1-transition/stance*(2*t-t*t);
  }else if(p>1-transition){
    const t=(p-1+transition)/transition;
    reach=1+transition/stance*(1-t*t);
  }else{
    const t=(p-stance-transition)/(1-stance-2*transition),ease=t*t*t*(t*(6*t-15)+10);
    reach=(2*ease-1)*(1+transition/stance);
  }
  return {reach,lift:Math.sin(swing*Math.PI)**2,support};
}
function kneeBetween(hip:Point,ankle:Point,upper:number,lower:number,forward:Point):Point{
  const dx=ankle[0]-hip[0],dy=ankle[1]-hip[1],distance=Math.max(.001,Math.hypot(dx,dy));
  const d=Math.min(distance,upper+lower-.01),ux=dx/distance,uy=dy/distance;
  const along=(upper*upper-lower*lower+d*d)/(2*d),bend=Math.sqrt(Math.max(0,upper*upper-along*along));
  const side=(-uy*forward[0]+ux*forward[1])>=0?1:-1;
  return [hip[0]+ux*along-uy*bend*side,hip[1]+uy*along+ux*bend*side];
}
function mask(ctx:CanvasRenderingContext2D,points:Point[],holes:Point[][]=[]){
  ctx.beginPath();
  for(const polygon of [points,...holes]){ctx.moveTo(...polygon[0]);for(const point of polygon.slice(1))ctx.lineTo(...point);ctx.closePath();}
  ctx.clip('evenodd');
}
function paintedLimb(ctx:CanvasRenderingContext2D,image:HTMLImageElement,sy:number,sw:number,sh:number,sourceA:Point,sourceB:Point,targetA:Point,targetB:Point,points:Point[],bottom?:number){
  const sourceLength=Math.hypot(sourceB[0]-sourceA[0],sourceB[1]-sourceA[1]);
  const length=Math.hypot(targetB[0]-targetA[0],targetB[1]-targetA[1]);
  const sourceAngle=Math.atan2(sourceB[1]-sourceA[1],sourceB[0]-sourceA[0]);
  const targetAngle=Math.atan2(targetB[1]-targetA[1],targetB[0]-targetA[0]);
  // Foreshortening changes length, not armor thickness. Uniform scaling made
  // front/rear limbs vanish as their projected endpoints approached each other.
  ctx.save();ctx.translate(...targetA);ctx.rotate(targetAngle);ctx.scale(length/sourceLength,1);ctx.rotate(-sourceAngle);ctx.translate(-sourceA[0],-sourceA[1]);mask(ctx,points);
  if(bottom!==undefined)mask(ctx,[[0,0],[280,0],[280,bottom],[0,bottom]]);
  ctx.drawImage(image,0,sy,sw,sh,0,0,280,sh/sw*280);ctx.restore();
}
type ArmView={shoulder:Point;elbow:Point;hand:Point;far:Point;upper:Point[];fore:Point[];holes:Point[][];patches:Point[];coat:Point[]};
const RUN_ARMS:ArmView[]=[
  {shoulder:[103,111],elbow:[100,138],hand:[108,166],far:[199,111],
    upper:[[90,107],[114,108],[119,133],[112,148],[91,145],[87,125]],fore:[[91,129],[114,129],[125,155],[122,175],[109,183],[96,178],[88,156]],
    holes:[[[87,107],[116,107],[124,142],[127,173],[112,186],[92,180],[84,144]],[[184,108],[214,108],[223,146],[225,179],[202,187],[185,151]]],patches:[[20,-30],[-20,-30]],
    coat:[[78,110],[105,100],[142,105],[200,100],[222,120],[237,222],[207,239],[180,227],[160,186],[130,186],[110,234],[66,225]]},
  {shoulder:[128,104],elbow:[123,130],hand:[135,153],far:[207,91],
    upper:[[114,99],[140,100],[147,125],[141,142],[115,144],[108,121]],fore:[[112,122],[140,119],[151,147],[149,162],[135,170],[118,163],[109,146]],
    holes:[[[110,99],[142,98],[151,137],[153,163],[136,172],[114,165],[106,131]],[[201,91],[224,93],[239,119],[239,139],[219,147],[207,128]]],patches:[[40,-60],[102,-60]],
    coat:[[105,70],[157,76],[188,91],[208,126],[211,190],[193,213],[167,168],[147,186],[106,244],[56,218],[72,150]]},
  {shoulder:[186,94],elbow:[198,118],hand:[229,144],far:[169,88],
    upper:[[174,89],[199,91],[210,112],[208,129],[184,131],[174,114]],fore:[[185,110],[209,107],[229,124],[247,133],[253,149],[243,161],[222,155],[201,137]],
    holes:[[[173,90],[202,91],[217,114],[248,129],[255,151],[243,165],[215,152],[189,134],[172,115]]],patches:[[80,-40]],
    coat:[[103,82],[175,83],[199,96],[214,137],[174,161],[145,181],[121,214],[78,217],[53,191],[70,143]]},
  {shoulder:[201,95],elbow:[213,122],hand:[225,146],far:[172,88],
    upper:[[187,91],[215,92],[224,116],[220,133],[199,136],[186,115]],fore:[[199,116],[222,114],[238,133],[242,152],[229,164],[211,157],[198,137]],
    holes:[[[186,91],[216,91],[225,112],[241,137],[242,157],[226,166],[201,151],[190,126]]],patches:[[80,-40]],
    coat:[[106,68],[176,71],[199,91],[215,136],[200,171],[157,205],[127,240],[70,232],[55,195]]},
  {shoulder:[201,105],elbow:[208,132],hand:[214,158],far:[100,105],
    upper:[[188,100],[215,100],[226,125],[224,142],[200,146],[189,128]],fore:[[195,128],[222,126],[232,153],[231,174],[216,183],[199,176],[193,152]],
    holes:[[[187,101],[217,100],[229,139],[233,173],[217,186],[195,177],[186,139]],[[82,101],[111,101],[119,139],[112,177],[91,184],[73,171],[74,136]]],patches:[[30,-25],[-30,-25]],
    coat:[[76,100],[130,85],[188,94],[238,137],[248,222],[191,242],[171,218],[156,185],[132,185],[112,239],[57,222]]},
];
export function runBodyMotion(phase:number,sprinting=false){
  const p=((phase%1)+1)%1;
  const {stance}=survivorGait(sprinting);
  return {near:walkLegMotion(p,stance),far:walkLegMotion(p+.5,stance),arm:-Math.cos(p*Math.PI*2),twist:Math.sin(p*Math.PI*2)*.018};
}
// Normalize menu travel by its actual CSS/canvas scale and larger actor size.
// Arena zoom scales travel and the actor together, so its world distance is used directly.
export function menuGaitDistance(dx:number,dy:number,sceneWidth:number,sceneHeight:number,canvasWidth:number){
  if(sceneWidth<=0||sceneHeight<=0||canvasWidth<=0)return 0;
  return Math.hypot(dx*sceneWidth/1672,dy*sceneHeight/941/GROUND_TILT)*180/canvasWidth*SURVIVOR_SIZE/156;
}
export function runPose(row:number,phase:number,sprinting=false,direction?:GroundPoint){
  const view=WALK_VIEWS[row],arms=RUN_ARMS[row],fx=Math.sin(row*Math.PI/4),fy=Math.cos(row*Math.PI/4),motion=runBodyMotion(phase,sprinting);
  const frontal=Math.abs(fy)**4;
  const distance=direction?Math.hypot(direction.x,direction.y):0;
  const gx=direction&&Number.isFinite(distance)&&distance>0?direction.x/distance:fx,gy=direction&&Number.isFinite(distance)&&distance>0?direction.y/distance:fy;
  const legs:{near:boolean;hip:Point;knee:Point;ankle:Point;bootAngle:number}[]=[],armPoses:{near:boolean;shoulder:Point;elbow:Point;hand:Point}[]=[];
  const lengthScale=sprinting?1.12:1.08;
  const upper=Math.hypot(view.knee[0]-view.hip[0],view.knee[1]-view.hip[1])*lengthScale;
  const lower=Math.hypot(view.ankle[0]-view.knee[0],view.ankle[1]-view.knee[1])*lengthScale;
  const {stride,stance}=survivorGait(sprinting),vertical=view.ankle[1]-view.hip[1];
  const extension=(upper+lower)*.97;
  // Keep enough knee flexion for the long stride, with a small, smooth rise
  // between contacts instead of snapping into a separate airborne bounce.
  const contactDrop=vertical-Math.sqrt(Math.max(1,extension*extension-stride*stride));
  const drop=contactDrop-(sprinting?2.5:1.5)*(1-Math.cos((phase-stance/2)*Math.PI*4));
  const hipHeight=view.baseline-view.hip[1]-drop,boot=view.baseline-view.ankle[1];
  for(const near of [false,true]){
    const foot=near?motion.near:motion.far,spread=row===0?-8:row===4?8:8*Math.abs(fy);
    const hx=view.hip[0]-(near?0:2*spread),depth=near?0:-8*fx;
    const knee=kneeBetween([0,-hipHeight],[foot.reach*stride,-boot+foot.lift*-25],upper,lower,[1,0]);
    const hip:Point=[hx,view.baseline-hipHeight+depth];
    const joint:Point=[hx+gx*knee[0],view.baseline+knee[1]+gy*knee[0]*GROUND_TILT+depth];
    const ankle:Point=[hx+gx*foot.reach*stride,view.baseline-boot-foot.lift*25+gy*foot.reach*stride*GROUND_TILT+depth];
    // A depth-facing knee needs a small lateral bend. A purely sagittal
    // projection crosses the ankle/hip and flips the painted limb by 180 degrees.
    const fraction=upper/(upper+lower),outward=hx<view.center?-1:1;
    joint[0]=joint[0]*(1-frontal)+(hx+(ankle[0]-hx)*fraction+outward*(8+4*foot.lift))*frontal;
    joint[1]=joint[1]*(1-frontal)+(hip[1]+(ankle[1]-hip[1])*fraction)*frontal;
    legs.push({near,hip,knee:joint,ankle,bootAngle:foot.support?0:fx*.2*foot.lift});
  }
  for(const near of [false,true]){
    const shoulder=near?arms.shoulder:arms.far,sign=near?1:-1,angle=motion.arm*(sprinting?.95:.75)*sign;
    const u=Math.hypot(arms.elbow[0]-arms.shoulder[0],arms.elbow[1]-arms.shoulder[1]);
    const l=Math.hypot(arms.hand[0]-arms.elbow[0],arms.hand[1]-arms.elbow[1]);
    const elbow:Point=[shoulder[0]+fx*Math.sin(angle)*u,shoulder[1]+Math.cos(angle)*u+fy*Math.sin(angle)*u*GROUND_TILT];
    const hand:Point=[elbow[0]+fx*Math.sin(angle+(sprinting?1.3:1.05))*l,elbow[1]+Math.cos(angle+(sprinting?1.3:1.05))*l+fy*Math.sin(angle+(sprinting?1.3:1.05))*l*GROUND_TILT];
    const inward=shoulder[0]<view.center?1:-1;
    elbow[0]+=inward*(frontal*10+Math.abs(fy)*Math.sin(angle)*4);
    hand[0]+=inward*(frontal*22+Math.abs(fy)*Math.sin(angle)*12);
    armPoses.push({near,shoulder,elbow,hand});
  }
  return {legs,arms:armPoses,drop,lean:fx*(sprinting?.17:.1)+fy*motion.twist};
}
export function walkSprite(ctx:CanvasRenderingContext2D,image:HTMLImageElement,pose:NonNullable<ReturnType<typeof walkFrame>>,x:number,y:number,size:number,sprinting=false){
  if(!ready(image))return false;
  const {row,flip,phase}=pose,view=WALK_VIEWS[row],arms=RUN_ARMS[row],rows=[0,300,570,835,1095,1400];
  const mirror=!(sprinting&&(row===0||row===4))&&flip;
  const direction=pose.direction?{x:pose.direction.x*(mirror?-1:1),y:pose.direction.y}:undefined;
  const rig=runPose(row,phase,sprinting,direction);
  const sw=image.naturalWidth/4,sy=rows[row]/1400*image.naturalHeight,sh=(rows[row+1]-rows[row])/1400*image.naturalHeight;
  const scale=size*.88/280;
  ctx.save();ctx.translate(x,y);ctx.scale(mirror?-scale:scale,scale);ctx.translate(-view.center,-view.baseline);
  for(const leg of rig.legs){
    paintedLimb(ctx,image,sy,sw,sh,view.hip,view.knee,leg.hip,leg.knee,view.thigh);
    paintedLimb(ctx,image,sy,sw,sh,view.knee,view.ankle,leg.knee,leg.ankle,view.shin,view.ankle[1]);
    // The sole stays level and fixed during contact; shin rotation must not
    // swing the painted boot around the ankle and drag it across the floor.
    ctx.save();ctx.translate(...leg.ankle);ctx.rotate(leg.bootAngle);ctx.translate(-view.ankle[0],-view.ankle[1]);
    mask(ctx,view.shin);mask(ctx,[[0,view.ankle[1]-8],[280,view.ankle[1]-8],[280,320],[0,320]]);
    ctx.drawImage(image,0,sy,sw,sh,0,0,280,sh/sw*280);ctx.restore();
  }
  ctx.save();ctx.translate(view.hip[0],view.hip[1]+rig.drop);ctx.rotate(rig.lean);ctx.translate(-view.hip[0],-view.hip[1]);
  const drawArm=(near:boolean)=>{
    const arm=rig.arms.find(a=>a.near===near)!;
    paintedLimb(ctx,image,sy,sw,sh,arms.shoulder,arms.elbow,arm.shoulder,arm.elbow,arms.upper);
    paintedLimb(ctx,image,sy,sw,sh,arms.elbow,arms.hand,arm.elbow,arm.hand,arms.fore);
  };
  if(row>=2)drawArm(false);
  for(const [i,hole] of arms.holes.entries()){
    ctx.save();mask(ctx,arms.coat);mask(ctx,hole);const [px,py]=arms.patches[i];
    ctx.fillStyle='#35554d';ctx.fillRect(0,0,280,sh/sw*280);
    ctx.drawImage(image,0,sy,sw,sh,px,py,280,sh/sw*280);ctx.restore();
  }
  ctx.save();mask(ctx,view.body,arms.holes);ctx.drawImage(image,0,sy,sw,sh,0,0,280,sh/sw*280);ctx.restore();
  if(row<2)drawArm(false);drawArm(true);ctx.restore();ctx.restore();return true;
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
