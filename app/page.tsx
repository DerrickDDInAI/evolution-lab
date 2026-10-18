'use client';
import {useEffect,useRef,useState} from 'react';
import {Maximize2,Minimize2,Plus,Minus,X,Download} from 'lucide-react';
import {useArena} from './use-arena';
import {generationClock} from '../lib/generation-clock';
const timeScore=(ms:number)=>{const t=Math.floor(Math.max(0,ms)/10);return `${Math.floor(t/6000).toString().padStart(2,'0')}:${(Math.floor(t/100)%60).toString().padStart(2,'0')}.${(t%100).toString().padStart(2,'0')}`;};
export default function Home(){
  const [help,setHelp]=useState(false),[training,setTraining]=useState(false),[zoom,setZoom]=useState(.85),[expanded,setExpanded]=useState(false),[copied,setCopied]=useState(false);
  const helpButton=useRef<HTMLButtonElement>(null);
  const {state,session,notice,contact,name,setName,error,setError,busy,online,latency,clock,scores,canvas,mini,stick,predicted,enter,leave}=useArena(help,zoom);
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
  async function exportGenome(){try{const r=await fetch('/api/arena?export=1');const data=await r.json() as {error?:string;generation:number};if(!r.ok)throw new Error(data.error);const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`pursuit-champion-gen-${data.generation}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setError(e instanceof Error?e.message:'Export failed.');}}
  async function share(){try{await navigator.clipboard.writeText(location.origin);setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{setError('Copy the address from your browser to invite a friend.');}}
  const me=state?.players.find(p=>p.id===session?.id),generation=generationClock(state,clock);
  const active=!contact.current&&predicted.current?.phase==='arena',started=predicted.current?.runStartedAt,survival=active&&started!=null?clock-started:0;
  const history=state?.history||[],fitness=history.map(h=>h.fitness),min=Math.min(0,...fitness),max=Math.max(1,...fitness);
  const chart=fitness.map((f,i)=>`${8+i/Math.max(fitness.length-1,1)*244},${72-(f-min)/(max-min)*60}`).join(' ');
  const clearStick=()=>{stick.current.x=0;stick.current.y=0;};
  const status=!online?'Connecting…':!session?'Watching':contact.current?'Contact':active?'In arena':'Safe outside';
  return <main className={expanded?'app expanded':'app'}>
    <header className="topbar">
      <a className="brand" href="/" aria-label="Pursuit Lab home">Pursuit <span>Lab</span></a>
      <span className="connection"><i className={online?'status-dot':'status-dot offline'}/>{state?.players.length||0}/12 players</span>
      <nav><button onClick={share}>{copied?'Link copied':<><span className="invite-full">Copy invite link</span><span className="invite-short">Invite</span></>}</button><button ref={helpButton} onClick={()=>setHelp(true)}>Help</button>{session&&<button onClick={leave}>Leave arena</button>}</nav>
    </header>
    <section className="arena-shell" aria-label="Pursuit arena">
      <canvas ref={canvas} tabIndex={0} className="world" aria-label="Shared pursuit arena. Move with WASD or arrow keys. Hold Shift to sprint."/>
      <div className="arena-status">{status}</div>
      <div className={'generation-clock'+(generation.remaining<=5&&generation.running?' urgent':'')} aria-label="Generation countdown" title={generation.running?'Time until the next generation':'Training pauses when nobody is inside'}>
        <span>Gen {state?.generation||1}</span><span className="clock-divider"/>
        <span>{generation.running?'Next':'Paused'}</span><strong>{generation.remaining===0?'…':`0:${String(generation.remaining).padStart(2,'0')}`}</strong>
      </div>
      {generation.running&&generation.warming>0&&<div className="spawn-status">{generation.warmup>0?`New bots · ${generation.warmup}s warm-up`:`${generation.warming} bots waiting for a clear spawn`}</div>}
      {!session&&<form className="join-card" onSubmit={enter}>
        <h1>Join the arena</h1><p>Avoid the bots. Your score is how long you survive.</p>
        <label htmlFor="name">Player name</label><input id="name" value={name} onChange={e=>setName(e.target.value)} maxLength={20} placeholder="Runner" autoComplete="nickname"/>
        <button className="primary" disabled={busy||!online}>{busy?'Joining…':'Play'}</button>
        <p className="join-hint">You start safely outside. Walk through a door when you’re ready.</p>
      </form>}
      {session&&<div className="player-hud">
        <span>{contact.current?'Run stopped':active?'Survival time':'Ready when you are'}</span>
        <strong>{timeScore(contact.current?.run.durationMs??survival)}</strong>
        <div className="stamina"><span>Sprint</span><meter min={0} max={1} value={predicted.current?.energy??1} aria-label="Sprint energy"/></div>
      </div>}
      {notice&&<div className="death-notice" role="status"><strong>{contact.current?'Touched':'Run ended'} · {timeScore(notice.run.durationMs)}</strong><span>Bot {notice.run.bot+1} · Generation {notice.run.generation}{contact.current?' · Confirming…':' · Back outside'}</span></div>}
      <div className="map-panel"><canvas ref={mini} width={156} height={120} aria-label="Minimap with players, bots, and camera viewport"/><span>{Math.round(predicted.current?.x??me?.x??3000)}, {Math.round(predicted.current?.y??me?.y??4950)}</span></div>
      <div className="view-controls"><button aria-label="Zoom out" onClick={()=>setZoom(z=>Math.max(.35,z-.15))}><Minus size={16}/></button><span>{Math.round(zoom*100)}%</span><button aria-label="Zoom in" onClick={()=>setZoom(z=>Math.min(1.5,z+.15))}><Plus size={16}/></button><button aria-label={expanded?'Exit expanded arena':'Expand arena'} onClick={()=>setExpanded(v=>!v)}>{expanded?<Minimize2 size={16}/>:<Maximize2 size={16}/>}</button></div>
      {session&&<div className="touch-controls"><div className="joystick" role="group" aria-label="Drag to move" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);const r=e.currentTarget.getBoundingClientRect();stick.current.x=Math.max(-1,Math.min(1,(e.clientX-r.left-r.width/2)/35));stick.current.y=Math.max(-1,Math.min(1,(e.clientY-r.top-r.height/2)/35));}} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId)){const r=e.currentTarget.getBoundingClientRect();stick.current.x=Math.max(-1,Math.min(1,(e.clientX-r.left-r.width/2)/35));stick.current.y=Math.max(-1,Math.min(1,(e.clientY-r.top-r.height/2)/35));}}} onPointerUp={clearStick} onPointerCancel={clearStick} onLostPointerCapture={clearStick}><span/></div><button className="dash-touch" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);stick.current.dash=true;}} onPointerUp={()=>stick.current.dash=false} onPointerCancel={()=>stick.current.dash=false} onLostPointerCapture={()=>stick.current.dash=false}>Sprint</button></div>}
      {training&&<aside className="training-panel" id="training-panel" aria-label="Training details">
        <div className="panel-heading"><h2>Training</h2><button aria-label="Close training details" onClick={()=>setTraining(false)}><X size={18}/></button></div>
        <dl><div><dt>Generation</dt><dd>{state?.generation||1}</dd></div><div><dt>Bots</dt><dd>{state?.population||24}</dd></div><div><dt>Touches</dt><dd>{state?.totalTags||0}</dd></div><div><dt>Best fitness</dt><dd>{(state?.bestFitness||0).toFixed(1)}</dd></div></dl>
        <h3>Fitness by generation</h3><svg viewBox="0 0 260 80" role="img" aria-label="Best fitness for completed generations"><path d="M0 40H260 M0 75H260" stroke="#353d43"/>{fitness.length>1&&<polyline points={chart} fill="none" stroke="#a8c8b2" strokeWidth="2"/>}</svg>{fitness.length<2&&<p>Complete two generations to see a trend.</p>}
        <p>Every 45 seconds of active play, the strongest networks breed and mutate. Bots return to their fixed starting points with a three-second warm-up.</p>
        <button className="export" disabled={!state?.championAvailable} onClick={exportGenome}><Download size={15}/> Export champion</button>
        <p className="technical-note">NEAT-inspired learning, based on Enter the Pygame.</p>
      </aside>}
      {error&&<div className="error" role="alert"><span>{error}</span><button aria-label="Dismiss message" onClick={()=>setError('')}><X size={16}/></button></div>}
    </section>
    <div className="controls-bar"><span className="key-guide"><kbd>WASD</kbd> / arrows <span>Move</span><kbd>Shift</kbd><span>Sprint</span></span><span className="touch-guide">Drag to move · Hold Sprint to run</span><div className="legend"><span><i className="human-mark"/>Player</span><span><i className="bot-mark"/>Bot</span><span><i className="safe-mark"/>Warming up</span></div><button aria-expanded={training} aria-controls="training-panel" onClick={()=>setTraining(v=>!v)}>Training details</button><span className="latency" title="Network round-trip time">{online?`${latency} ms`:'Offline'}</span></div>
    <section className="scores-panel" aria-label="Your survival scores"><div className="score-best"><span>Personal best</span><strong>{timeScore(scores.bestMs)}</strong></div><div className="recent-runs"><span>Recent runs <small>Time / killer generation</small></span>{scores.runs.length?<ol>{scores.runs.slice(0,5).map(run=><li key={run.id}><strong>{timeScore(run.durationMs)}</strong><span>Gen {run.generation}</span></li>)}</ol>:<p>Your completed runs will appear here.</p>}</div></section>
    {help&&<div className="modal-backdrop" onClick={()=>setHelp(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="guide-title" onClick={e=>e.stopPropagation()}><div className="panel-heading"><h2 id="guide-title">How to play</h2><button aria-label="Close guide" autoFocus onClick={()=>setHelp(false)}><X size={20}/></button></div><ol><li>Join with a name. Everyone shares the same arena.</li><li>Move with WASD or arrows. Hold Shift to sprint. On a phone, use the movement pad.</li><li>Enter through any door to start your timer. Once inside, survive until a bot touches you.</li><li>After a touch, you return outside. Your best time and recent runs are saved in this browser.</li></ol><p>Orange bots are active. Gray bots are warming up or waiting for their starting point to clear. New generations return to the same central spawn points.</p><p>Training pauses when the arena is empty. Open Training details to see progress or export a champion network.</p><button className="primary" onClick={()=>setHelp(false)}>Back to the arena</button></section></div>}
  </main>;
}
