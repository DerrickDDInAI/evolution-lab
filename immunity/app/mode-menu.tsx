'use client';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {MENU_PADS,menuZone,modeName,type GameMode,type MenuPosition} from '../lib/game-mode';
import {arriveAtMenu,confirmedMenuMode,menuExperience,DISCOVERY_STOPS,DISCOVERY_COPY,MODE_COPY,type MenuExperience,type MenuView} from '../lib/menu-experience';
import {immunityArt,directionalSprite,facingDirection,walkFrame,walkSprite,menuGaitDistance,GROUND_TILT} from '../lib/immunity-art';

type Props={onChoose:(mode:GameMode)=>void;paused?:boolean;onModels:()=>void};
const subscribe=(listener:()=>void)=>{addEventListener('popstate',listener);return()=>removeEventListener('popstate',listener);};
const currentExperience=()=>menuExperience(location.search);
const serverExperience=():MenuExperience=>'living';
export function ModeMenu(props:Props){
  const experience=useSyncExternalStore(subscribe,currentExperience,serverExperience);
  return <Nursery key={experience} {...props} experience={experience}/>;
}
function Nursery({onChoose,paused=false,onModels,experience}:Props&{experience:MenuExperience}){
  const stage=useRef<HTMLDivElement>(null),actor=useRef<HTMLCanvasElement>(null),aboutDialog=useRef<HTMLDialogElement>(null);
  const position=useRef<MenuPosition>({x:50,y:experience==='discovery'?70:68.5}),previousZone=useRef<GameMode|null>(null);
  const keys=useRef(new Set<string>()),goal=useRef<MenuPosition|null>(null),done=useRef(false),choose=useRef(onChoose);
  const [view,setView]=useState<MenuView>({mode:null,step:0}),viewRef=useRef<MenuView>({mode:null,step:0});
  const [about,setAbout]=useState(false),blocked=paused||about;
  const discovering=experience==='discovery'&&view.step<3;
  useEffect(()=>{choose.current=onChoose;},[onChoose]);
  useEffect(()=>{
    const element=stage.current;
    if(!blocked&&!element?.parentElement?.contains(document.activeElement))element?.focus();
    const art=immunityArt(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0,last=0,facing=4,travel=0,sceneWidth=1672,sceneHeight=941,actorWidth=180;
    const measure=()=>{const box=element?.getBoundingClientRect();if(box){sceneWidth=box.width;sceneHeight=box.height;}actorWidth=actor.current?.getBoundingClientRect().width||180;};
    const resize=new ResizeObserver(measure);if(element)resize.observe(element);measure();
    const confirm=()=>{const mode=confirmedMenuMode(viewRef.current,experience,true);if(mode&&!done.current){done.current=true;choose.current(mode);}};
    const clear=()=>{keys.current.clear();goal.current=null;last=0;};
    const down=(e:KeyboardEvent)=>{
      if(blocked||document.hidden||e.target instanceof HTMLButtonElement)return;
      const key=e.key.toLowerCase();
      if(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(key)){e.preventDefault();if(!e.repeat){keys.current.add(key);goal.current=null;}}
      if(key==='enter'&&!e.repeat){e.preventDefault();confirm();}
    };
    const up=(e:KeyboardEvent)=>keys.current.delete(e.key.toLowerCase());
    const draw=(now:number)=>{
      const dt=last?Math.min(50,now-last):0;last=now;
      const p=position.current;
      let dx=0,dy=0;
      if(!blocked&&!document.hidden&&document.hasFocus()&&element?.contains(document.activeElement)&&!done.current){
        const k=keys.current;
        let x=Number(k.has('d')||k.has('arrowright'))-Number(k.has('a')||k.has('arrowleft'));
        let y=Number(k.has('s')||k.has('arrowdown'))-Number(k.has('w')||k.has('arrowup'));
        let distance=Infinity;
        // Correct for the plate aspect ratio so screen-space speed is uniform.
        if(goal.current){x=(goal.current.x-p.x)*16.72;y=(goal.current.y-p.y)*9.41;distance=Math.hypot(x,y);if(distance<1){goal.current=null;x=0;y=0;}}
        const len=Math.hypot(x,y),step=Math.min(dt*.34,distance);
        const nx=Math.max(21,Math.min(79,p.x+(len?x/len*step/16.72:0)));
        const ny=Math.max(54,Math.min(81,p.y+(len?y/len*step/9.41:0)));
        dx=(nx-p.x)*16.72;dy=(ny-p.y)*9.41;p.x=nx;p.y=ny;
        const next=arriveAtMenu(viewRef.current,p,experience,previousZone.current);
        previousZone.current=menuZone(p);
        if(next!==viewRef.current){
          if(next.step!==viewRef.current.step){keys.current.clear();goal.current=null;}
          viewRef.current=next;setView(next);
        }
      }
      const canvas=actor.current,ctx=canvas?.getContext('2d');
      if(canvas&&ctx){
        canvas.style.left=p.x+'%';canvas.style.top=p.y+'%';
        const moving=Math.hypot(dx,dy)>.01;
        if(moving){facing=facingDirection(dx*100,dy*100,facing);travel+=menuGaitDistance(dx,dy,sceneWidth,sceneHeight,actorWidth);}
        ctx.clearRect(0,0,180,190);
        ctx.fillStyle='#193f3d45';ctx.beginPath();ctx.ellipse(90,170,24,8,0,0,Math.PI*2);ctx.fill();
        const pose=walkFrame(facing,travel,moving,255,reduced.matches,{x:dx*sceneWidth/1672,y:dy*sceneHeight/941/GROUND_TILT});
        if(!pose||!walkSprite(ctx,art.walk,pose,90,170,156))directionalSprite(ctx,art.directions,true,facing,90,170,156);
      }
      frame=requestAnimationFrame(draw);
    };
    element?.addEventListener('keydown',down);addEventListener('keyup',up);addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
    frame=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(frame);resize.disconnect();element?.removeEventListener('keydown',down);removeEventListener('keyup',up);removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear);clear();};
  },[blocked,experience]);

  function update(next:MenuView){viewRef.current=next;setView(next);}
  function preview(mode:GameMode){if(!blocked&&!discovering)update({...viewRef.current,mode});}
  function enter(){const mode=confirmedMenuMode(viewRef.current,experience,true);if(!blocked&&mode&&!done.current){done.current=true;choose.current(mode);}}
  function walk(e:React.PointerEvent<HTMLDivElement>){
    if(blocked)return;
    const box=e.currentTarget.getBoundingClientRect();
    goal.current={x:Math.max(21,Math.min(79,(e.clientX-box.left)/box.width*100)),y:Math.max(54,Math.min(81,(e.clientY-box.top)/box.height*100))};
    stage.current?.focus();
  }
  function approach(mode:GameMode){if(!blocked){preview(mode);goal.current={...MENU_PADS[mode]};stage.current?.focus();}}
  function stepTo(step:number){
    if(blocked)return;
    keys.current.clear();goal.current=null;previousZone.current=null;
    position.current={...DISCOVERY_STOPS[step]};update({mode:null,step});stage.current?.focus();
  }
  function nextStop(){if(!blocked&&discovering){goal.current={...DISCOVERY_STOPS[view.step+1]};stage.current?.focus();}}
  function switchExperience(next:MenuExperience){
    if(blocked)return;
    const url=new URL(location.href);url.searchParams.set('menu',next);
    history.pushState(null,'',url);dispatchEvent(new PopStateEvent('popstate'));
  }
  const story=discovering?DISCOVERY_COPY[view.step]:null;
  return <section className={'mode-menu '+(discovering?'is-discovering':'')} aria-labelledby="expedition-title">
    <div className="nursery-habitat">
      <div className="nursery-collection"><strong>EvoGoo</strong><span>Evolution games &amp; experiments</span></div>
      <nav className="nursery-comparison" aria-label="Menu experience">
        <button type="button" aria-pressed={experience==='living'} disabled={blocked} onClick={()=>switchExperience('living')}>Living clearing</button>
        <button type="button" aria-pressed={experience==='discovery'} disabled={blocked} onClick={()=>switchExperience('discovery')}>Discovery walk</button>
      </nav>
      <div ref={stage} className="nursery-scene" tabIndex={0} aria-label={discovering?'Discovery path. Use WASD or arrows to reach the glowing marker, or use the next stop button.':'Choose an expedition. Use WASD or arrows to reach a circle. Read about the mode, then press Enter to continue.'} onPointerDown={walk} onPointerMove={e=>{if(e.buttons)walk(e);}} onBlur={()=>{keys.current.clear();goal.current=null;}}>
        <h1 id="expedition-title">Immunity<small>An EvoGoo experiment</small></h1>
        <svg className="nursery-ornament" viewBox="0 0 240 24" aria-hidden="true"><path d="M0 8h88q20 0 32 14Q132 8 152 8h88M120 22V1m0 15Q105 0 92 3m28 13Q135 0 148 3"/></svg>
        {!discovering&&(['survival','motion'] as const).map(m=>{const pad=MENU_PADS[m];return <svg key={m} className={'nursery-pad'+(view.mode===m?' selected':'')} style={{left:pad.x+'%',top:pad.y+'%',width:pad.rX*2+'%',height:pad.rY*2+'%'}} viewBox="0 0 200 200" preserveAspectRatio="none" aria-hidden="true"><circle className="pad-halo" cx="100" cy="100" r="94"/><path className="pad-veins" d="M100 188V100L66 66 46 32M100 145l45-36 20-53M100 116l-43 15-27-21M100 88l26-35-5-30"/></svg>;})}
        {discovering&&<div className="nursery-waypoint" style={{left:DISCOVERY_STOPS[view.step+1].x+'%',top:DISCOVERY_STOPS[view.step+1].y+'%'}} aria-hidden="true"><span>{view.step+1}</span></div>}
        <canvas ref={actor} width={180} height={190} className="nursery-survivor" aria-hidden="true"/>
      </div>
      {!discovering&&<div className="nursery-experiments" aria-label="Choose a mode">
        {(['survival','motion'] as const).map(m=><button key={m} type="button" className={'nursery-label '+m+(view.mode===m?' selected':'')} disabled={blocked} aria-pressed={view.mode===m} onPointerEnter={e=>{if(e.pointerType==='mouse')preview(m);}} onFocus={()=>preview(m)} onClick={()=>approach(m)}><strong>{modeName(m)}</strong><span>{MODE_COPY[m].goal}</span></button>)}
      </div>}
      <section className="nursery-reading" aria-label="About this expedition">
        <div className="nursery-message" role="status" aria-live="polite" aria-atomic="true">
          <small>{discovering?`Discovery ${view.step+1} of 3`:view.mode?'Sentinels in training':'A living experiment'}</small>
          <h2>{story?story.title:view.mode?modeName(view.mode):'Choose an expedition'}</h2>
          <p>{story?story.text:view.mode?MODE_COPY[view.mode].text:'Play against sentinels that evolve across generations. Choose a mode to discover what they learn.'}</p>
        </div>
        {discovering?<div className="nursery-reading-actions">
          {view.step>0&&<button type="button" disabled={blocked} onClick={()=>stepTo(view.step-1)}>Back</button>}
          <button type="button" className="nursery-enter" disabled={blocked} onClick={nextStop}>{story?.next} <span aria-hidden="true">↗</span></button>
          <button type="button" disabled={blocked} onClick={()=>stepTo(3)}>Skip to modes</button>
        </div>:<div className="nursery-reading-actions">
          {view.mode?<button type="button" className="nursery-enter" disabled={blocked} onClick={enter}>Enter {modeName(view.mode)} <span aria-hidden="true">↗</span></button>:<span className="nursery-hint">Walk, click or use Tab to explore a mode.</span>}
        </div>}
      </section>
      <footer className="nursery-credits">
      <p className="nursery-instructions">{discovering?'Follow the light or choose the next stop.':'WASD / arrows to walk · Select a mode, then Enter'}</p>

        <button type="button" disabled={paused} onClick={()=>{setAbout(true);aboutDialog.current?.showModal();}}>About &amp; contact</button>
        {experience==='discovery'&&!discovering&&<button type="button" disabled={blocked} onClick={()=>stepTo(0)}>Walk again</button>}
        <button type="button" disabled={blocked} onClick={onModels}>Models &amp; admin</button>
      </footer>
      <dialog ref={aboutDialog} className="nursery-about" aria-labelledby="nursery-about-title" onClose={()=>setAbout(false)}>
        <form method="dialog"><button type="submit" aria-label="Close about and contact">Close</button></form>
        <small>EvoGoo</small><h2 id="nursery-about-title">Games shaped by evolution</h2>
        <p>Immunity is one game and experiment in the EvoGoo collection.</p>
        <p>Created by <strong>Derrick Van Frausum</strong></p>
        <nav aria-label="Creator and project links"><a href="https://github.com/DerrickDDInAI/evolution-lab" target="_blank" rel="noopener noreferrer">GitHub ↗</a><a href="mailto:info@evogoo.com">Business inquiries <span>info@evogoo.com</span></a><a href="mailto:contact@evogoo.com">Contact &amp; feedback <span>contact@evogoo.com</span></a></nav>
      </dialog>
    </div>
  </section>;
}
