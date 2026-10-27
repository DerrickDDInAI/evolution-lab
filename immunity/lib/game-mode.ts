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
// Coordinates are percentages of the uncropped nursery plate, shared by hit tests and UI.
export const MENU_PADS = {survival:{x:34,y:63,rX:8.5,rY:7.5},motion:{x:66,y:63,rX:8.5,rY:7.5}};
export function menuZone(p:MenuPosition):GameMode|null {
  for(const mode of ['survival','motion'] as const){
    const pad=MENU_PADS[mode];
    if(((p.x-pad.x)/pad.rX)**2+((p.y-pad.y)/pad.rY)**2<=1)return mode;
  }
  return null;
}
export function advanceMenu(previous:MenuSelection,p:MenuPosition,dt:number,enter=false){
  const mode=menuZone(p),elapsed=mode?(previous.mode===mode?previous.elapsed:0)+Math.max(0,Math.min(dt,50)):0;
  return {mode,elapsed,confirmed:mode&&(enter||elapsed>=MENU_HOLD_MS)?mode:null};
}
export function atExit(p:MenuPosition){
  return (Math.abs(p.x-FIELD.middle)<=95&&(p.y<=FIELD.min-28||p.y>=FIELD.max+28))||
    (Math.abs(p.y-FIELD.middle)<=95&&(p.x<=FIELD.min-28||p.x>=FIELD.max+28));
}
