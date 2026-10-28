import {menuZone,type GameMode,type MenuPosition} from './game-mode';
export type MenuExperience = 'living' | 'discovery';
export type MenuView = {mode:GameMode|null;step:number};
export const DISCOVERY_STOPS = [{x:50,y:70},{x:50,y:61},{x:50,y:54},{x:50,y:63}];
export const DISCOVERY_COPY = [
  {title:'Welcome to EvoGoo',text:'A collection of games and experiments exploring evolution. Walk the path to discover this one.',next:'Discover Immunity'},
  {title:'This is Immunity',text:'One EvoGoo experiment. You are a survivor in a world guarded by evolving sentinels.',next:'Meet the sentinels'},
  {title:'Every generation is an experiment',text:'Sentinels inherit and vary their behavior. Successful traits can spread. Your play shapes what they encounter.',next:'Explore the two modes'},
];
export const MODE_COPY = {
  survival:{goal:'Outlast the sentinels.',text:'Stay alive while sentinels evolve pursuit and obstacle avoidance.'},
  motion:{goal:'Collect a seed. Escape.',text:'Collect a seed and escape while sentinels evolve motion detection and pursuit. Stillness is no guarantee.'},
};
export function menuExperience(search:string):MenuExperience{return new URLSearchParams(search).get('menu')==='discovery'?'discovery':'living';}
// Arrival reveals information only. Starting a game always requires an explicit action.
export function arriveAtMenu(view:MenuView,p:MenuPosition,experience:MenuExperience,previousZone:GameMode|null):MenuView{
  if(experience==='discovery'&&view.step<3){
    const target=DISCOVERY_STOPS[view.step+1];
    return Math.hypot((p.x-target.x)*1.7768,p.y-target.y)<2?{mode:null,step:view.step+1}:view;
  }
  const zone=menuZone(p);
  return zone&&zone!==previousZone&&zone!==view.mode?{...view,mode:zone}:view;
}
export function confirmedMenuMode(view:MenuView,experience:MenuExperience,explicit:boolean):GameMode|null{
  return explicit&&(experience==='living'||view.step===3)?view.mode:null;
}
