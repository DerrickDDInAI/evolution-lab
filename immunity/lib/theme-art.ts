import {ready} from './immunity-art';
import {themePath,type VisualThemeId} from './visual-theme';

type ThemeArt={atlas:HTMLImageElement;human:HTMLImageElement;floor:HTMLImageElement;menu:HTMLImageElement;sign:HTMLImageElement;ground:HTMLImageElement};
const cache=new Map<VisualThemeId,ThemeArt>();
type AtlasLayout={rows:number[];columns:number[][]};
// Inspected gutters in the 1448 × 1086 paintings. The generated columns
// are not evenly spaced; equal cells would cut leaves off the scenery.
const layouts:Record<Exclude<VisualThemeId,'original'>,AtlasLayout>={
  sunseed:{rows:[0,375,720,1086],columns:[[0,400,790,1120,1448],[0,400,755,1110,1448],[0,400,770,1095,1448]]},
  watercolor:{rows:[0,390,710,1086],columns:[[0,395,790,1120,1448],[0,395,755,1110,1448],[0,395,770,1095,1448]]},
  moonbloom:{rows:[0,390,690,1086],columns:[[0,380,770,1120,1448],[0,380,755,1080,1448],[0,380,755,1075,1448]]},
};
const imageLayouts=new WeakMap<HTMLImageElement,AtlasLayout>();
export function themeArt(theme:VisualThemeId):ThemeArt|null{
  if(theme==='original')return null;
  let art=cache.get(theme);
  if(!art){
    const atlas=new Image(),floor=new Image(),menu=new Image(),sign=new Image(),ground=new Image();
    imageLayouts.set(atlas,layouts[theme]);
    // The Moonbloom board uses the same cream-clad human traveller, not a glowing-eyed spirit.
    const human=theme==='moonbloom'?new Image():atlas;
    if(theme==='moonbloom'){imageLayouts.set(human,layouts.sunseed);human.src=themePath('sunseed','atlas');}
    atlas.src=themePath(theme,'atlas');floor.src=themePath(theme,'floor');menu.src=themePath(theme,'menu');sign.src=themePath(theme,'sign');ground.src=themePath(theme,'ground');
    art={atlas,human,floor,menu,sign,ground};cache.set(theme,art);
  }
  return art;
}
export async function loadTheme(theme:VisualThemeId){
  const art=themeArt(theme);if(!art)return;
  try{
    await Promise.all(Object.values(art).map(image=>ready(image)?Promise.resolve():image.decode()));
  }catch(error){
    // A retry must make fresh image requests after a failed download.
    if(cache.get(theme)===art)cache.delete(theme);
    throw error;
  }
}
type Crop={x:number;y:number;w:number;h:number;unit:number};
const crops=new WeakMap<HTMLImageElement,Crop[]>();
/** Measure alpha once: generated padding varies, but feet must not float. */
function atlasCrops(image:HTMLImageElement){
  let result=crops.get(image);if(result)return result;
  const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0);
  const {data}=ctx.getImageData(0,0,canvas.width,canvas.height),sw=canvas.width/4,sh=canvas.height/3,layout=imageLayouts.get(image);
  result=Array.from({length:12},(_,cell)=>{
    const row=Math.floor(cell/4),col=cell%4;
    const x0=Math.round(layout?layout.columns[row][col]*canvas.width/1448:col*sw),x1=Math.round(layout?layout.columns[row][col+1]*canvas.width/1448:(col+1)*sw);
    const y0=Math.round(layout?layout.rows[row]*canvas.height/1086:row*sh),y1=Math.round(layout?layout.rows[row+1]*canvas.height/1086:(row+1)*sh);
    let left=x1,top=y1,right=x0,bottom=y0;
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(data[(y*canvas.width+x)*4+3]>100){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    return right<left?{x:x0,y:y0,w:sw,h:sh,unit:sw}:{x:left,y:top,w:right-left+1,h:bottom-top+1,unit:sw};
  });crops.set(image,result);return result;
}
export function themeSprite(ctx:CanvasRenderingContext2D,image:HTMLImageElement,cell:number,x:number,y:number,size:number,flip=false){
  if(!ready(image))return false;
  const crop=atlasCrops(image)[cell],w=crop.w/crop.unit*size,h=crop.h/crop.unit*size;
  ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);
  ctx.drawImage(image,crop.x,crop.y,crop.w,crop.h,-w/2,-h,w,h);
  ctx.restore();return true;
}
export function themeActorFrame(human:boolean,warming:boolean,facing:number){
  if(!human)return {cell:warming?3:facing===0||facing===4?8:9,flip:facing>=1&&facing<=3};
  return {cell:facing===0?4:facing===4?5:facing===2||facing===6?6:7,flip:facing>=1&&facing<=3};
}
export function drawThemeActor(ctx:CanvasRenderingContext2D,image:HTMLImageElement,human:boolean,warming:boolean,facing:number,travel:number,moving:boolean,reduced:boolean,x:number,y:number,size:number){
  const frame=themeActorFrame(human,warming,facing);
  // A restrained weight shift follows actual distance, not wall-clock time.
  // Ground contacts remain drawn independently at the authoritative footprint.
  const phase=travel/13,shift=human&&moving&&!reduced?Math.sin(phase)*.025:0;
  ctx.save();ctx.translate(x,y);ctx.rotate(shift);
  let drawn=false;
  if(human&&moving&&!reduced&&ready(image)){
    const crop=atlasCrops(image)[frame.cell],scale=size/crop.unit,w=crop.w*scale,h=crop.h*scale;
    if(frame.flip)ctx.scale(-1,1);
    // Two overlapping lower-body pieces articulate beneath the painted coat.
    // Movement phase comes from real travel, so blocked players stop stepping.
    for(let leg=0;leg<2;leg++){
      const step=Math.sin(phase+leg*Math.PI),lift=Math.max(0,step)*size*.035;
      const dx=step*size*.025,half=crop.w/2,split=crop.h*.72;
      ctx.drawImage(image,crop.x+leg*half,crop.y+split,half,crop.h-split,-w/2+leg*w/2+dx,-h+split*scale-lift,w/2,(crop.h-split)*scale);
    }
    ctx.drawImage(image,crop.x,crop.y,crop.w,crop.h*.79,-w/2,-h-Math.abs(Math.sin(phase))*size*.012,w,h*.79);
    drawn=true;
  }else drawn=themeSprite(ctx,image,frame.cell,0,0,size,frame.flip);
  ctx.restore();return drawn;
}
