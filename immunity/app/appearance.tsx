'use client';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {Paintbrush,X} from 'lucide-react';
import {THEME_STORAGE_KEY,VISUAL_THEMES,visualTheme,themePath,type VisualThemeId} from '../lib/visual-theme';
import {loadTheme} from '../lib/theme-art';

let selected:VisualThemeId='original',initialized=false;
const listeners=new Set<()=>void>();
function snapshot(){
  if(!initialized){initialized=true;try{selected=visualTheme(localStorage.getItem(THEME_STORAGE_KEY));}catch{}}
  return selected;
}
function subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
function choose(theme:VisualThemeId){selected=theme;try{localStorage.setItem(THEME_STORAGE_KEY,theme);}catch{}for(const listener of listeners)listener();}
export function useVisualTheme(){return useSyncExternalStore(subscribe,snapshot,()=> 'original' as VisualThemeId);}
export function AppearanceButton({onClick}:{onClick:()=>void}){
  return <button type="button" className="appearance-button" onClick={onClick} aria-label="Choose appearance"><Paintbrush size={17}/><span>Appearance</span></button>;
}
export function AppearanceDialog({theme,onClose}:{theme:VisualThemeId;onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null),request=useRef({ticket:0,active:true});
  const [loading,setLoading]=useState<VisualThemeId|null>(null),[error,setError]=useState('');
  useEffect(()=>{const el=dialog.current,task=request.current;task.active=true;el?.showModal();return()=>{task.active=false;el?.close();};},[]);
  async function select(next:VisualThemeId){
    const ticket=++request.current.ticket;setLoading(next);setError('');
    try{await loadTheme(next);if(request.current.active&&ticket===request.current.ticket){choose(next);setLoading(null);}}
    catch{if(request.current.active&&ticket===request.current.ticket){setLoading(null);setError('This artwork could not load. Try again, or choose Original Glass Tide.');}}
  }
  return <dialog ref={dialog} className="appearance-dialog" aria-labelledby="appearance-title" onClose={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="panel-heading"><div><small>Make yourself at home</small><h2 id="appearance-title">Choose your world</h2></div><button aria-label="Close appearance" onClick={onClose}><X size={22}/></button></div>
    <p>The same arena, in four different styles. Switch whenever you like.</p>
    <div className="appearance-options" role="group" aria-label="Visual themes">
      {VISUAL_THEMES.map(option=><button type="button" className={'appearance-option'+(theme===option.id?' selected':'')} key={option.id} aria-pressed={theme===option.id} onClick={()=>void select(option.id)}>
        <span className="appearance-preview" style={{backgroundColor:option.color,backgroundImage:`url('${option.id==='original'?'/immunity/nursery-menu.webp':themePath(option.id,'menu')}')`}}/>
        <span className="appearance-copy"><strong>{option.name}</strong><span>{option.description}</span><small>{loading===option.id?'Loading artwork…':theme===option.id?'Selected':'Try this style'}</small></span>
      </button>)}
    </div>
    <p className="appearance-note">Your choice is saved on this browser. The arena stays live while this panel is open.</p>
    <div role="status" aria-live="polite">{loading?'Loading artwork…':error||''}</div>
    <button className="primary" onClick={onClose}>Back to the game</button>
  </dialog>;
}
