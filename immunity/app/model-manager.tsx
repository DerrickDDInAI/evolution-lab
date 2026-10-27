'use client';
import {useEffect,useRef,useState} from 'react';
import {X} from 'lucide-react';
import type {GameMode} from '../lib/game-mode';
import {TrainingVault} from './training-vault';

export function ModelManager({onClose}:{onClose:()=>void}){
  const [mode,setMode]=useState<GameMode>('survival');
  const panel=useRef<HTMLElement>(null);
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){e.preventDefault();onClose();}
      if(e.key==='Tab'){
        const items=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select,summary,a[href]')||[]).filter(el=>el.getClientRects().length>0);
        const first=items[0],last=items.at(-1);
        if(!panel.current?.contains(document.activeElement)){e.preventDefault();first?.focus();}
        else if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      }
    };
    addEventListener('keydown',key);
    return()=>{removeEventListener('keydown',key);previous?.focus();};
  },[onClose]);
  return <div className="model-manager-backdrop" onClick={onClose}>
    <aside ref={panel} className="model-manager" role="dialog" aria-modal="true" aria-labelledby="model-manager-title" onClick={e=>e.stopPropagation()}>
      <div className="panel-heading"><div><span className="eyebrow">EvoGoo · Immunity</span><h2 id="model-manager-title">Models & admin</h2></div><button onClick={onClose} aria-label="Close model manager"><X size={20}/></button></div>
      <p>Save the sentinels’ progress or restore a compatible model. Each mode has its own population.</p>
      <label htmlFor="model-mode">Game mode</label>
      <select id="model-mode" value={mode} onChange={e=>setMode(e.target.value as GameMode)}><option value="survival">Survival</option><option value="motion">Motion Hunt</option></select>
      <TrainingVault key={mode} state={null} motion={mode==='motion'} online adminOpen/>
    </aside>
  </div>;
}
