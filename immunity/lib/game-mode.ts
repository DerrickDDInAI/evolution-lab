import {FIELD} from './physics';
export type GameMode = 'survival' | 'motion';
export const modeName = (mode:GameMode) => mode==='motion'?'Motion Hunt':'Survival';
export const arenaKey = (mode:GameMode) => mode==='motion'?'motion':'shared';
export const modeProfile = (token:string,mode:GameMode) => mode==='motion'?`${token}\0motion`:token;
export const RESOURCE = {x:3000,y:2600,radius:48};
export const MOTION_THRESHOLD = 8;
export const MENU_HOLD_MS = 850;
export type MenuPosition = {x:number;y:number};
export type MenuSelection = {mode:GameMode|null;elapsed:number};
// Measured inner pool rims in each art plate. Rendering and hit tests share these ellipses.
export type MenuPad = {x:number;y:number;rX:number;rY:number;rotation:number};
export const MENU_PADS:Record<GameMode,MenuPad> = {survival:{x:582/1672*100,y:599/941*100,rX:134/1672*100,rY:63/941*100,rotation:-8},motion:{x:1100/1672*100,y:599/941*100,rX:134/1672*100,rY:63/941*100,rotation:7}};
export const PORTRAIT_MENU_PADS:Record<GameMode,MenuPad> = {survival:{x:29.5,y:57,rX:12.4,rY:4.8,rotation:-9},motion:{x:70.5,y:57,rX:12.4,rY:4.8,rotation:9}};
export const menuArtSize=(portrait=false)=>portrait?{width:1024,height:1536}:{width:1672,height:941};
export const menuPads=(portrait=false)=>portrait?PORTRAIT_MENU_PADS:MENU_PADS;
export function menuZone(p:MenuPosition,portrait=false):GameMode|null {
  const art=menuArtSize(portrait);
  for(const mode of ['survival','motion'] as const){
    const pad=menuPads(portrait)[mode],angle=pad.rotation*Math.PI/180;
    const dx=(p.x-pad.x)*art.width/100,dy=(p.y-pad.y)*art.height/100;
    const x=dx*Math.cos(angle)+dy*Math.sin(angle),y=-dx*Math.sin(angle)+dy*Math.cos(angle);
    if((x/(pad.rX*art.width/100))**2+(y/(pad.rY*art.height/100))**2<=1)return mode;
  }
  return null;
}
// Preview and selection are separate: hover must not arm a first tap to launch.
export function activateMenuSign(armed:GameMode|null,mode:GameMode){return {armed:mode,enter:armed===mode?mode:null};}
export function advanceMenu(previous:MenuSelection,p:MenuPosition,dt:number,enter=false){
  const mode=menuZone(p),elapsed=mode?(previous.mode===mode?previous.elapsed:0)+Math.max(0,Math.min(dt,50)):0;
  return {mode,elapsed,confirmed:mode&&(enter||elapsed>=MENU_HOLD_MS)?mode:null};
}
export function atExit(p:MenuPosition){
  return (Math.abs(p.x-FIELD.middle)<=95&&(p.y<=FIELD.min-28||p.y>=FIELD.max+28))||
    (Math.abs(p.y-FIELD.middle)<=95&&(p.x<=FIELD.min-28||p.x>=FIELD.max+28));
}
