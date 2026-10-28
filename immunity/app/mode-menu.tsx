'use client';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {activateMenuSign,menuArtSize,menuPads,menuZone,modeName,type GameMode,type MenuPosition} from '../lib/game-mode';
import {immunityArt,directionalSprite,facingDirection,walkFrame,walkSprite,menuGaitDistance,GROUND_TILT} from '../lib/immunity-art';

type Props={onChoose:(mode:GameMode)=>void;paused?:boolean;onModels:()=>void};
const portraitQuery='(max-aspect-ratio: 4/5)';
const subscribe=(listener:()=>void)=>{const media=matchMedia(portraitQuery);media.addEventListener('change',listener);return()=>media.removeEventListener('change',listener);};
const isPortrait=()=>matchMedia(portraitQuery).matches;
const serverPortrait=()=>false;
const MODE_COPY={
  survival:{goal:'Outlast the sentinels.',text:'Stay alive while sentinels evolve pursuit and obstacle avoidance.'},
  motion:{goal:'Collect a seed. Escape.',text:'Collect a seed and escape while sentinels evolve motion detection and pursuit. Stillness is no guarantee.'},
};
export function ModeMenu({onChoose,paused=false,onModels}:Props){
  const portrait=useSyncExternalStore(subscribe,isPortrait,serverPortrait);
  const stage=useRef<HTMLDivElement>(null),actor=useRef<HTMLCanvasElement>(null),aboutDialog=useRef<HTMLDialogElement>(null);
  const position=useRef<MenuPosition>({x:50,y:68.5}),previousZone=useRef<GameMode|null>(null);
  const keys=useRef(new Set<string>()),goal=useRef<MenuPosition|null>(null),done=useRef(false),choose=useRef(onChoose);
  const [mode,setMode]=useState<GameMode|null>(null),selected=useRef<GameMode|null>(null),armed=useRef<GameMode|null>(null);
  const [about,setAbout]=useState(false),blocked=paused||about;
  const artSize=menuArtSize(portrait),pads=menuPads(portrait);
  useEffect(()=>{choose.current=onChoose;},[onChoose]);
  useEffect(()=>{
    const element=stage.current;
    if(!blocked&&!element?.parentElement?.contains(document.activeElement))element?.focus();
    const art=immunityArt(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0,last=0,facing=4,travel=0,sceneWidth=1672,sceneHeight=941,actorWidth=180;
    const measure=()=>{const box=element?.getBoundingClientRect();if(box){sceneWidth=box.width;sceneHeight=box.height;}actorWidth=actor.current?.getBoundingClientRect().width||180;};
    const resize=new ResizeObserver(measure);if(element)resize.observe(element);measure();
    const confirm=()=>{const mode=selected.current;if(mode&&!done.current){done.current=true;choose.current(mode);}};
    const clear=()=>{keys.current.clear();goal.current=null;last=0;};
    const down=(e:KeyboardEvent)=>{
      if(blocked||document.hidden||e.target instanceof HTMLButtonElement)return;
      const key=e.key.toLowerCase();
      if(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(key)){e.preventDefault();keys.current.add(key);goal.current=null;}
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
        if(goal.current){x=(goal.current.x-p.x)*sceneWidth/100;y=(goal.current.y-p.y)*sceneHeight/100;distance=Math.hypot(x,y);if(distance<1){goal.current=null;x=0;y=0;}}
        const len=Math.hypot(x,y),step=Math.min(dt*Math.min(.34,sceneWidth*.00055),distance);
        const nx=Math.max(15,Math.min(85,p.x+(len?x/len*step/sceneWidth*100:0)));
        const ny=Math.max(portrait?48:54,Math.min(72,p.y+(len?y/len*step/sceneHeight*100:0)));
        dx=(nx-p.x)*sceneWidth/100;dy=(ny-p.y)*sceneHeight/100;p.x=nx;p.y=ny;
        const zone=menuZone(p,portrait);
        if(zone&&zone!==previousZone.current){selected.current=zone;armed.current=zone;setMode(zone);}
        previousZone.current=zone;
      }
      const canvas=actor.current,ctx=canvas?.getContext('2d');
      if(canvas&&ctx){
        canvas.style.left=p.x+'%';canvas.style.top=p.y+'%';
        const moving=Math.hypot(dx,dy)>.01;
        if(moving){facing=facingDirection(dx*100,dy*100,facing);travel+=menuGaitDistance(dx*1672/sceneWidth,dy*941/sceneHeight,sceneWidth,sceneHeight,actorWidth);}
        ctx.clearRect(0,0,180,190);
        ctx.fillStyle='#193f3d45';ctx.beginPath();ctx.ellipse(90,170,24,8,0,0,Math.PI*2);ctx.fill();
        const pose=walkFrame(facing,travel,moving,255,reduced.matches,{x:dx,y:dy/GROUND_TILT});
        if(!pose||!walkSprite(ctx,art.walk,pose,90,170,156))directionalSprite(ctx,art.directions,true,facing,90,170,156);
      }
      frame=requestAnimationFrame(draw);
    };
    element?.addEventListener('keydown',down);addEventListener('keyup',up);addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
    frame=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(frame);resize.disconnect();element?.removeEventListener('keydown',down);removeEventListener('keyup',up);removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear);clear();};
  },[blocked,portrait]);

  function preview(next:GameMode){if(!blocked){selected.current=next;setMode(next);}}
  function confirm(next:GameMode){if(!blocked&&!done.current){done.current=true;choose.current(next);}}
  function walk(e:React.PointerEvent<HTMLDivElement>){
    if(blocked)return;
    const box=e.currentTarget.getBoundingClientRect();
    goal.current={x:Math.max(15,Math.min(85,(e.clientX-box.left)/box.width*100)),y:Math.max(portrait?48:54,Math.min(72,(e.clientY-box.top)/box.height*100))};
    stage.current?.focus();
  }
  function activate(next:GameMode){
    if(blocked)return;
    const action=activateMenuSign(armed.current,next);armed.current=action.armed;
    if(action.enter){confirm(action.enter);return;}
    preview(next);goal.current={...pads[next]};stage.current?.focus();
  }
  return <section className="mode-menu" aria-labelledby="expedition-title">
    <div className="nursery-habitat">
      <div className="nursery-collection"><strong>EvoGoo</strong><span>Evolution games &amp; experiments</span></div>
      <div ref={stage} className="nursery-scene" tabIndex={0} aria-label="Choose a mode. Walk with WASD or arrows. Press Enter to play, or tap a mode sign twice." onPointerDown={walk} onPointerMove={e=>{if(e.buttons)walk(e);}} onBlur={()=>{keys.current.clear();goal.current=null;}}>
        <h1 id="expedition-title">Immunity</h1>
        <svg className="nursery-pools" viewBox={`0 0 ${artSize.width} ${artSize.height}`} preserveAspectRatio="none" aria-hidden="true">
          {(['survival','motion'] as const).map(m=>{const pad=pads[m],cx=pad.x*artSize.width/100,cy=pad.y*artSize.height/100,rx=pad.rX*artSize.width/100,ry=pad.rY*artSize.height/100;return <g key={m} className={'nursery-pool'+(mode===m?' selected':'')} transform={`rotate(${pad.rotation} ${cx} ${cy})`}><ellipse className="pool-wash" cx={cx} cy={cy} rx={rx} ry={ry}/><ellipse className="pool-rim" cx={cx} cy={cy} rx={rx} ry={ry}/></g>;})}
        </svg>
        <canvas ref={actor} width={180} height={190} className="nursery-survivor" aria-hidden="true"/>
      </div>
      <div className="nursery-experiments" aria-label="Choose a mode">
        {(['survival','motion'] as const).map(m=><button key={m} type="button" className={'nursery-label '+m+(mode===m?' selected':'')} disabled={blocked} aria-pressed={mode===m} aria-describedby="nursery-input-hint" onPointerEnter={e=>{if(e.pointerType==='mouse')preview(m);}} onFocus={()=>preview(m)} onKeyDown={e=>{if(e.key==='Enter'&&!e.repeat){e.preventDefault();confirm(m);}}} onClick={()=>activate(m)}><strong>{modeName(m)}</strong><span>{MODE_COPY[m].goal}</span></button>)}
      </div>
      <section className="nursery-reading" aria-label="About this mode">
        <div className="nursery-message" role="status" aria-live="polite" aria-atomic="true">
          <h2>{mode?modeName(mode):'Choose a mode'}</h2>
          <p>{mode?MODE_COPY[mode].text:'Play against sentinels that evolve across generations. Explore a mode to discover what they learn.'}</p>
        </div>
      </section>
      <footer className="nursery-credits">
        <button type="button" disabled={paused} onClick={()=>{setAbout(true);aboutDialog.current?.showModal();}}>About &amp; contact</button>
        <p id="nursery-input-hint" className="nursery-instructions"><span>Walk: WASD / arrows</span><span>Play: Enter or tap a sign twice</span></p>
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
