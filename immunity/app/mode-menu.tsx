'use client';
import {useEffect,useRef,useState} from 'react';
import {advanceMenu,MENU_HOLD_MS,MENU_PADS,modeName,type GameMode,type MenuPosition,type MenuSelection} from '../lib/game-mode';
import {immunityArt,directionalSprite,facingDirection,walkFrame,walkSprite,menuGaitDistance,GROUND_TILT} from '../lib/immunity-art';

export function ModeMenu({onChoose,paused=false}:{onChoose:(mode:GameMode)=>void;paused?:boolean}){
  const stage=useRef<HTMLDivElement>(null),actor=useRef<HTMLCanvasElement>(null);
  const position=useRef<MenuPosition>({x:50,y:68.5}),selection=useRef<MenuSelection>({mode:null,elapsed:0});
  const keys=useRef(new Set<string>()),goal=useRef<MenuPosition|null>(null),done=useRef(false),choose=useRef(onChoose);
  const [display,setDisplay]=useState({mode:null as GameMode|null,elapsed:0});
  useEffect(()=>{choose.current=onChoose;},[onChoose]);
  useEffect(()=>{
    const element=stage.current;
    if(!paused)element?.focus();
    const art=immunityArt(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0,last=0,facing=4,travel=0,sceneWidth=1672,sceneHeight=941,actorWidth=180;
    const measure=()=>{const box=element?.getBoundingClientRect();if(box){sceneWidth=box.width;sceneHeight=box.height;}actorWidth=actor.current?.getBoundingClientRect().width||180;};
    const resize=new ResizeObserver(measure);if(element)resize.observe(element);measure();
    const confirm=(mode:GameMode)=>{if(!done.current){done.current=true;choose.current(mode);}};
    const clear=()=>{keys.current.clear();goal.current=null;selection.current={mode:null,elapsed:0};last=0;};
    const down=(e:KeyboardEvent)=>{
      if(paused||document.hidden||e.target instanceof HTMLButtonElement)return;
      const key=e.key.toLowerCase();
      if(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(key)){e.preventDefault();keys.current.add(key);goal.current=null;}
      if(key==='enter'&&!e.repeat){const next=advanceMenu(selection.current,position.current,0,true);if(next.confirmed){e.preventDefault();confirm(next.confirmed);}}
    };
    const up=(e:KeyboardEvent)=>keys.current.delete(e.key.toLowerCase());
    const draw=(now:number)=>{
      const dt=last?Math.min(50,now-last):0;last=now;
      const p=position.current;
      let dx=0,dy=0;
      if(!paused&&!document.hidden&&document.hasFocus()&&element?.contains(document.activeElement)&&!done.current){
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
        const next=advanceMenu(selection.current,p,dt);selection.current=next;
        if(next.confirmed)confirm(next.confirmed);
      }else selection.current={mode:null,elapsed:0};
      setDisplay({mode:selection.current.mode,elapsed:selection.current.elapsed});
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
  },[paused]);
  function walk(e:React.PointerEvent<HTMLDivElement>){
    if(paused)return;
    const box=e.currentTarget.getBoundingClientRect();goal.current={x:Math.max(21,Math.min(79,(e.clientX-box.left)/box.width*100)),y:Math.max(54,Math.min(81,(e.clientY-box.top)/box.height*100))};
    stage.current?.focus();
  }
  function approach(mode:GameMode){if(!paused){goal.current=MENU_PADS[mode];stage.current?.focus();}}
  return <section className="mode-menu" aria-labelledby="expedition-title" aria-describedby="nursery-purpose">
    <div ref={stage} className="nursery-scene" tabIndex={0} aria-label="Choose an expedition. Move with WASD or arrows into a floor circle. Stay for 0.85 seconds or press Enter." onPointerDown={walk} onPointerMove={e=>{if(e.buttons)walk(e);}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget)){keys.current.clear();goal.current=null;selection.current={mode:null,elapsed:0};}}}>
      <h1 id="expedition-title">Immunity</h1>
      <svg className="nursery-ornament" viewBox="0 0 240 24" aria-hidden="true"><path d="M0 8h88q20 0 32 14Q132 8 152 8h88M120 22V1m0 15Q105 0 92 3m28 13Q135 0 148 3"/></svg>
      <p id="nursery-purpose" className="nursery-inscription"><small>A living experiment</small><strong>How skilled can the sentinels become?</strong><span>They learn by hunting you. Every survivor shapes the next generation.</span></p>
      {(['survival','motion'] as const).map(m=><button key={m} className={'nursery-label '+m+(display.mode===m?' selected':'')} disabled={paused} onPointerDown={e=>e.stopPropagation()} onClick={()=>approach(m)} onKeyDown={e=>{if(e.key==='Enter'&&!e.repeat&&!paused){e.preventDefault();e.stopPropagation();if(!done.current){done.current=true;choose.current(m);}}}} aria-label={`${modeName(m)}. ${m==='survival'?'Survive the sentinels.':'Collect the seed. Freeze to hide. Reach an exit.'} Click to walk there, or press Enter to choose.`}>
        <strong>{modeName(m)}</strong><span>{m==='survival'?'Survive the sentinels':'Collect the seed. Reach an exit.'}</span>
      </button>)}
      {(['survival','motion'] as const).map(m=>{const pad=MENU_PADS[m],selected=display.mode===m;return <svg key={m} className={'nursery-pad'+(selected?' selected':'')} style={{left:pad.x+'%',top:pad.y+'%',width:pad.rX*2+'%',height:pad.rY*2+'%'}} viewBox="0 0 200 200" preserveAspectRatio="none" aria-hidden="true">
        <circle className="pad-halo" cx="100" cy="100" r="94"/><path className="pad-veins" d="M100 188V100L66 66 46 32M100 145l45-36 20-53M100 116l-43 15-27-21M100 88l26-35-5-30M66 66l-30 8m109 35 30 12M100 165l-30-10"/>
        <circle className="pad-progress" cx="100" cy="100" r="94" pathLength="100" strokeDasharray={`${selected?Math.min(100,display.elapsed/MENU_HOLD_MS*100):0} 100`}/>
      </svg>;})}
      <canvas ref={actor} width={180} height={190} className="nursery-survivor" aria-hidden="true"/>
      <p className="nursery-instructions">Move to choose <span>·</span> Hold 0.85s <span>·</span> Enter to confirm</p>
      <p className="nursery-touch-hint">WASD / arrows to move · Tap a circle to walk there</p>
      <div className="sr-only" role="status">{display.mode?`${modeName(display.mode)} selected. Stay to confirm or press Enter.`:'Choose Survival on the left or Motion Hunt on the right.'}</div>
    </div>
  </section>;
}
