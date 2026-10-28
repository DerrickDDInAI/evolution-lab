'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Maximize2,Minimize2,Plus,Minus,X,ScanEye} from 'lucide-react';
import {TrainingOrgan,TrainingPanel} from './training-organ';
import {TidalShell,TidalPeriphery} from './tidal-shell';
import {ModeMenu} from './mode-menu';
import {ModelManager} from './model-manager';
import {modeName} from '../lib/game-mode';
import {useArena} from './use-arena';
import {generationClock} from '../lib/generation-clock';
const timeScore=(ms:number)=>{const t=Math.floor(Math.max(0,ms)/10);return `${Math.floor(t/6000).toString().padStart(2,'0')}:${(Math.floor(t/100)%60).toString().padStart(2,'0')}.${(t%100).toString().padStart(2,'0')}`;};
export default function Home(){
  const [models,setModels]=useState(false);
  const closeModels=useCallback(()=>setModels(false),[]);
  const [help,setHelp]=useState(false),[training,setTraining]=useState(false),[zoom,setZoom]=useState(1),[expanded,setExpanded]=useState(false),[copied,setCopied]=useState(false),[viewTools,setViewTools]=useState(false);
  const helpButton=useRef<HTMLButtonElement>(null),trainingButton=useRef<HTMLButtonElement>(null);
  const closeTraining=useCallback(()=>{setTraining(false);trainingButton.current?.focus();},[]);
  const {mode,chooseMode,backToMenu,state,session,notice,contact,name,setName,error,setError,busy,online,latency,clock,scores,canvas,stick,predicted,enter,leave}=useArena(help||training||models,zoom);
  useEffect(()=>{
    if(!help)return;
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape')setHelp(false);
      if(e.key==='Tab'){
        const items=Array.from(document.querySelectorAll<HTMLElement>('.modal button')),first=items[0],last=items.at(-1);
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      }
    };
    addEventListener('keydown',key);return()=>{removeEventListener('keydown',key);helpButton.current?.focus();};
  },[help]);
  async function share(){try{await navigator.clipboard.writeText(location.origin);setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{setError('Copy the address from your browser to invite a friend.');}}
  const generation=generationClock(state,clock);
  const motion=mode==='motion',carrying=!!predicted.current?.carrying;
  const active=!contact.current&&predicted.current?.phase==='arena',started=predicted.current?.runStartedAt,survival=active&&started!=null?clock-started:0;
  const clearStick=()=>{stick.current.x=0;stick.current.y=0;};
  const status=!online?'Connecting…':!session?mode?modeName(mode):'Choose an expedition':contact.current?'Contact':active?motion?(Math.hypot(predicted.current?.vx||0,predicted.current?.vy||0)>8?'Moving · experimental hunt':'Still · detection may vary'):'In arena':'Safe outside';
  return <main className={'app'+(expanded?' expanded':'')+(!session&&!mode?' choosing':'')+(mode?' in-expedition':'')}>
    {mode&&<TidalPeriphery/>}
    {mode&&<header className="topbar">
      <a className="brand" href="/" aria-label="Immunity, EvoGoo home">{mode&&<TidalShell lens/>}<svg className="brand-seed" viewBox="0 0 40 48" aria-hidden="true"><path d="M20 3C7 14 3 28 11 38c4 6 14 6 18 0C37 28 33 14 20 3Z"/><path d="M20 7v34M8 27l12 9 12-9M12 18l8 10 8-10"/></svg><span><small>{mode?modeName(mode):"EVOGOO"}</small>Immunity</span></a>
      <span className="connection"><i className={online?'status-dot':'status-dot offline'}/>{state?.players.length||0}/12 players</span>
      <nav><button onClick={share}>{copied?'Link copied':<><span className="invite-full">Copy invite link</span><span className="invite-short">Invite</span></>}</button><button ref={helpButton} onClick={()=>{setTraining(false);setHelp(true);}}>Help</button>{session&&<button onClick={()=>{setExpanded(false);setTraining(false);leave();}}>Leave</button>}</nav>
    </header>}
    <section className="arena-shell" aria-label="Immunity survival arena">
      <canvas ref={canvas} tabIndex={0} className="world" aria-label="Shared Immunity arena. Move with WASD or arrow keys. Hold Shift to sprint."/>
      <div className="arena-status"><i/>{status}{mode&&!session&&<small>Choose a name · begin on the shore</small>}</div>
      {mode&&<TrainingOrgan state={state} online={online} open={training} onToggle={()=>setTraining(v=>!v)} buttonRef={trainingButton}/>}
      <div className={'generation-clock'+(generation.remaining<=5&&generation.running?' urgent':'')} aria-label="Generation countdown" title={generation.running?'Time until the next generation':'Training pauses when nobody is inside'}>
        <TidalShell lens/><span>Gen <b>{state?.generation||1}</b></span><span className="clock-divider"/>
        <span>{generation.running?'Next':'Paused'}</span><strong>{generation.remaining===0?'…':`0:${String(generation.remaining).padStart(2,'0')}`}</strong>
      </div>
      {generation.running&&generation.warming>0&&<div className="spawn-status">{generation.warmup>0?`Seeds opening · ${generation.warmup}s`:`${generation.warming} seeds waiting for clear ground`}</div>}
      {!session&&!mode&&<ModeMenu onChoose={chooseMode} paused={help||models} onModels={()=>setModels(true)}/>}{!session&&mode&&<form className="join-card" onSubmit={enter}>
        <span className="eyebrow">{modeName(mode)}</span><h1>{motion?"Bring back tomorrow.":"Tread lightly."}</h1><p>{motion?"Humanity needs a life-support seed to survive here. Collect it in the shallows, then carry it to any passage. The sentinels are learning to sense movement. Stillness may help; contact is lethal.":"The shallows are alive. Enter their territory, evade the sentinels, and see how long you can survive."}</p>
        <label htmlFor="name">Player name</label><input id="name" value={name} onChange={e=>setName(e.target.value)} maxLength={20} placeholder="Runner" autoComplete="nickname"/>
        <button className="primary" disabled={busy||!online}>{busy?'Joining…':'Enter the shallows'}</button>
        <p className="join-hint">Begin safely on the shore. Cross a passage when you’re ready.</p><button type="button" disabled={busy} onClick={backToMenu}>Back to expeditions</button>
      </form>}
      {session&&<div className="player-hud">
        <TidalShell lens/><span>{contact.current?'Run stopped':active?(motion?'Mission time':'Survival time'):'Ready when you are'}</span>
        <strong>{timeScore(contact.current?.run.durationMs??survival)}</strong>
        <div className="stamina"><span>Stamina</span><div className="breath-organ" aria-hidden="true">{Array.from({length:7},(_,i)=><i key={i} style={{opacity:.18+.82*Math.max(0,Math.min(1,(predicted.current?.energy??1)*7-i))}}/>)}</div><meter className="sr-only" min={0} max={1} value={predicted.current?.energy??1} aria-label="Sprint energy"/></div>
      </div>}
      {session&&motion&&!notice&&<div className="mission-hud" role="status"><strong>{carrying?"Seed secured · reach any passage":"Recover the life-support seed"}</strong><span>{carrying?"Return to a gate to extract. Capture loses the seed.":"Find the gold life-support seed. Touch it to collect."}</span><small>Experimental senses · stillness may help. Contact remains dangerous.</small></div>}
      {notice&&<div className="death-notice" role="status"><strong>{notice.run.bot===-1?'Extraction successful':contact.current?'Touched':motion?'Mission lost':'Run ended'} · {timeScore(notice.run.durationMs)}</strong><span>{notice.run.bot===-1?"Life-support seed delivered · Humanity has a future":`Sentinel ${notice.run.bot+1} · Generation ${notice.run.generation}${contact.current?" · Confirming…":" · Back outside"}`}</span></div>}
      <button className="field-tools-toggle" aria-expanded={viewTools} aria-controls="field-view" onClick={()=>setViewTools(v=>!v)}><ScanEye size={17}/><span>View</span></button>
      <div id="field-view" className={"view-controls"+(viewTools?" field-tools-open":"")}><button aria-label="Zoom out" onClick={()=>setZoom(z=>Math.max(.35,z-.15))}><Minus size={16}/></button><span>{Math.round(zoom*100)}%</span><button aria-label="Zoom in" onClick={()=>setZoom(z=>Math.min(1.5,z+.15))}><Plus size={16}/></button><button aria-label={expanded?'Exit expanded arena':'Expand arena'} onClick={()=>setExpanded(v=>!v)}>{expanded?<Minimize2 size={16}/>:<Maximize2 size={16}/>}</button></div>
      {session&&<div className="touch-controls"><div className="joystick" role="group" aria-label="Drag to move" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);const r=e.currentTarget.getBoundingClientRect();stick.current.x=Math.max(-1,Math.min(1,(e.clientX-r.left-r.width/2)/35));stick.current.y=Math.max(-1,Math.min(1,(e.clientY-r.top-r.height/2)/35));}} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId)){const r=e.currentTarget.getBoundingClientRect();stick.current.x=Math.max(-1,Math.min(1,(e.clientX-r.left-r.width/2)/35));stick.current.y=Math.max(-1,Math.min(1,(e.clientY-r.top-r.height/2)/35));}}} onPointerUp={clearStick} onPointerCancel={clearStick} onLostPointerCapture={clearStick}><span/></div><button className="dash-touch" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);stick.current.dash=true;}} onPointerUp={()=>stick.current.dash=false} onPointerCancel={()=>stick.current.dash=false} onLostPointerCapture={()=>stick.current.dash=false}>Sprint</button></div>}
      {training&&<TrainingPanel state={state} online={online} motion={motion} onClose={closeTraining}/>}
      {error&&<div className="error" role="alert"><span>{error}</span><button aria-label="Dismiss message" onClick={()=>setError('')}><X size={16}/></button></div>}
    </section>
    {models&&<ModelManager onClose={closeModels}/>}
    {mode&&<div className="controls-bar"><span className="key-guide"><kbd>WASD</kbd> / arrows <span>Move</span><kbd>Shift</kbd><span>Sprint</span></span><span className="touch-guide">Drag to move · Hold Sprint to run</span><div className="legend"><span><i className="human-mark"/>Player</span><span><i className="bot-mark"/>Sentinel</span><span><i className="safe-mark"/>Dormant</span></div><button aria-expanded={training} aria-controls="training-panel" onClick={()=>setTraining(v=>!v)}>Adaptation</button><span className="latency" title="Network round-trip time">{online?`${latency} ms`:'Offline'}</span></div>}
    {mode&&<section className="scores-panel" aria-label={motion?"Your extraction records":"Your survival scores"}><TidalShell lens/><div className="score-best"><span>{motion?"Fastest extraction":"Personal best"}</span><strong>{timeScore(scores.bestMs)}</strong></div><details className="recent-runs"><summary><span className="runs-full">Recent runs</span><span className="runs-short">Runs</span></summary><div className="run-history">{scores.runs.length?<ol>{scores.runs.slice(0,5).map(run=><li key={run.id}><strong>{timeScore(run.durationMs)}</strong><span>{motion?(run.bot===-1?"Extracted":"Lost"):`Gen ${run.generation}`}</span></li>)}</ol>:<p>Your completed runs will appear here.</p>}</div></details></section>}
    {help&&<div className="modal-backdrop" onClick={()=>setHelp(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="guide-title" onClick={e=>e.stopPropagation()}><div className="panel-heading"><h2 id="guide-title">How to play</h2><button aria-label="Close guide" autoFocus onClick={()=>setHelp(false)}><X size={20}/></button></div><ol><li>Select a mode by walking, clicking or using Tab. Read its explanation, then press Enter or tap the same sign again and join with a name. Each mode has its own shared arena.</li><li>Move with WASD or arrows. Hold Shift to sprint. On a phone, use the movement pad.</li><li>Enter through a passage. In Survival, stay alive as long as you can. In Motion Hunt, collect the gold-marked life-support seed and return to any passage to extract.</li><li>In experimental Motion Hunt, sentinels learn movement from recent observations. Standing still may help, but detection can make mistakes and physical contact still kills. Capture loses your seed. Extraction or capture returns you outside; records are saved separately for each mode.</li></ol><p>Open amber sentinels are active. Closed pearl seeds are harmless while warming up or waiting for clear ground. The small rings beneath actors show their contact footprints. New generations return to the same central seed beds.</p><p>Training pauses when the arena is empty. The Adaptation organ shows completed-generation fitness and captures. Open it for the full evolution history and training exports.</p><button className="primary" onClick={()=>setHelp(false)}>Back to the arena</button></section></div>}
  </main>;
}
