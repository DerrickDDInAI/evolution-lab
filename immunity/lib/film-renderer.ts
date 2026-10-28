import {filmFrame,filmSummary,type FilmClip} from './behavior-film';
import {renderArena,releaseRenderer,type View} from './renderer';
import {FIELD,SIZE} from './physics';
import {RESOURCE,modeName} from './game-mode';
import {immunityArt} from './immunity-art';
import type {Track} from './net-motion';

export const FILM_WIDTH=1280,FILM_HEIGHT=720;
export async function prepareFilmArt(){
  const images=Object.values(immunityArt());
  await Promise.all(images.map(async image=>{if(!image.complete)await new Promise<void>((resolve)=>{image.addEventListener('load',()=>resolve(),{once:true});image.addEventListener('error',()=>resolve(),{once:true});});}));
}
function view(clip:FilmClip,seconds:number):View{
  const f=filmFrame(clip,seconds),next=filmFrame(clip,seconds+.05),dt=.05;
  const velocity=(id:number,x:number,y:number,human:boolean)=>{
    const q=(human?next.players:next.bots).find(v=>v[0]===id);
    if(!q||next===f||next.t-f.t>600)return {vx:0,vy:0};
    return {vx:(q[1]-x)/dt,vy:(q[2]-y)/dt};
  };
  return {version:2,controller:clip.controller,mode:clip.mode,resource:clip.mode==='motion'?RESOURCE:null,serverTime:f.t,simulationTime:f.t,field:FIELD,size:SIZE,population:f.bots.length,round:45,generation:clip.generation,elapsed:f.t/1000,totalTags:0,species:1,history:[],bestGeneration:null,
    players:f.players.map(([id,x,y])=>({id:String(id),name:`Survivor ${id}`,x,y,...velocity(id,x,y,true),energy:1,phase:'arena',runStartedAt:null,respawnUntil:0,tags:0,life:id,ack:0})),
    bots:f.bots.map(([id,x,y,warming])=>({id,x,y,...velocity(id,x,y,false),fitness:0,tags:0,spawnWait:warming?1:0,nodes:0,connections:0})),
    obstacles:clip.obstacles,personal:null,collisions:[],bestFitness:0,training:{branch:clip.branch,events:[],checkpointGeneration:null,rollbackGeneration:null,bestModelAvailable:false,pending:null},championAvailable:false};
}
export function createFilmRenderer(canvas:HTMLCanvasElement){
  const arenaCanvas=document.createElement('canvas');
  canvas.width=FILM_WIDTH;canvas.height=FILM_HEIGHT;
  const positions=new Map<string,Track>();
  let current:FilmClip|null=null;
  return {
    draw(clip:FilmClip,seconds:number,index:number,total:number){
      if(current!==clip){releaseRenderer(arenaCanvas);current=clip;}
      const frame=filmFrame(clip,seconds),state=view(clip,seconds);
      // Use the most eventful sample's survivor consistently throughout this clip.
      const peak=clip.frames.reduce((a,b)=>a.interest>=b.interest?a:b),focus=frame.players.find(p=>p[0]===peak.focus)||frame.players[0];
      const held=clip.frames.filter(f=>f.t<=frame.t).flatMap(f=>f.players.filter(p=>p[0]===peak.focus)).at(-1);
      const followed=frame.players.find(p=>p[0]===peak.focus)||held||focus;
      const center=followed?{x:followed[1],y:followed[2]}:{x:3000,y:3000};
      renderArena(arenaCanvas,state,null,positions,.72,seconds*1000,null,null,false,{width:FILM_WIDTH,height:560,camera:center});
      const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Your browser could not prepare the film canvas.');
      ctx.fillStyle='#102f31';ctx.fillRect(0,0,FILM_WIDTH,FILM_HEIGHT);ctx.drawImage(arenaCanvas,0,94);
      ctx.textAlign='left';ctx.fillStyle='#f3deb0';ctx.font='28px Georgia, serif';ctx.fillText(`Immunity · ${modeName(clip.mode)}`,30,38);
      ctx.font='19px system-ui';ctx.fillStyle='#f7f0dc';ctx.fillText(`Generation ${clip.generation} · Training branch ${clip.branch}`,30,72);
      ctx.textAlign='right';ctx.fillText(`Highlight ${index+1} / ${total}`,FILM_WIDTH-30,40);
      const capture=clip.frames.find(f=>f.capture&&f.t<=frame.t&&f.t>frame.t-1400);
      ctx.fillStyle='#f3deb0';ctx.font='18px system-ui';ctx.fillText(capture?`Confirmed capture · Sentinel ${capture.capture!.bot+1}`:'Real player session',FILM_WIDTH-30,72);
      const duration=filmSummary('',clip).duration;
      ctx.fillStyle='#102f31';ctx.fillRect(0,654,FILM_WIDTH,66);ctx.fillStyle='#f7f0dc';ctx.textAlign='left';ctx.font='17px system-ui';
      ctx.fillText(`Sampled live movement · Anonymous survivors${clip.partial?' · Recording began during this generation':''}`,30,685);
      ctx.textAlign='right';ctx.fillText(`${Math.min(seconds,duration).toFixed(1)} / ${duration.toFixed(1)} s`,FILM_WIDTH-30,685);
      ctx.fillStyle='#e6c27c';ctx.fillRect(0,714,FILM_WIDTH*Math.min(1,seconds/Math.max(.01,duration)),6);
    },
    dispose(){releaseRenderer(arenaCanvas);},
  };
}
