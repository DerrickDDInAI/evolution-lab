'use client';
import {useEffect,useRef,useState} from 'react';
import {Maximize2,Minimize2,Plus,Minus,X,Download} from 'lucide-react';
import {ModeMenu} from './mode-menu';
import {modeName} from '../lib/game-mode';
import {useArena} from './use-arena';
import {generationClock} from '../lib/generation-clock';
const timeScore=(ms:number)=>{const t=Math.floor(Math.max(0,ms)/10);return `${Math.floor(t/6000).toString().padStart(2,'0')}:${(Math.floor(t/100)%60).toString().padStart(2,'0')}.${(t%100).toString().padStart(2,'0')}`;};
export default function Home(){
  const [help,setHelp]=useState(false),[training,setTraining]=useState(false),[zoom,setZoom]=useState(1),[expanded,setExpanded]=useState(false),[copied,setCopied]=useState(false);
  const helpButton=useRef<HTMLButtonElement>(null);
  const {mode,chooseMode,backToMenu,state,session,notice,contact,name,setName,error,setError,busy,online,latency,clock,scores,canvas,mini,stick,predicted,enter,leave}=useArena(help,zoom);
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
  async function exportGenome(){try{const r=await fetch('/api/arena?export=1&mode='+(mode||'survival'));const data=await r.json() as {error?:string;generation:number};if(!r.ok)throw new Error(data.error);const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`pursuit-champion-gen-${data.generation}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setError(e instanceof Error?e.message:'Export failed.');}}
  async function share(){try{await navigator.clipboard.writeText(location.origin);setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{setError('Copy the address from your browser to invite a friend.');}}
  const generation=generationClock(state,clock);
  const motion=mode==='motion',carrying=!!predicted.current?.carrying;
  const active=!contact.current&&predicted.current?.phase==='arena',started=predicted.current?.runStartedAt,survival=active&&started!=null?clock-started:0;
  const history=state?.history||[],fitness=history.map(h=>h.fitness),min=Math.min(0,...fitness),max=Math.max(1,...fitness);
  const chart=fitness.map((f,i)=>`${8+i/Math.max(fitness.length-1,1)*244},${72-(f-min)/(max-min)*60}`).join(' ');
  const clearStick=()=>{stick.current.x=0;stick.current.y=0;};
  const status=!online?'Connecting…':!session?mode?modeName(mode):'Choose an expedition':contact.current?'Contact':active?motion?(Math.hypot(predicted.current?.vx||0,predicted.current?.vy||0)>8?'Movement detectable':'Still · hidden'):'In arena':'Safe outside';
  return <main className={'app'+(expanded?' expanded':'')+(!session&&!mode?' choosing':'')}>
    <header className="topbar">
      <a className="brand" href="/" aria-label="Glass Tide, Pursuit Lab home"><svg className="brand-seed" viewBox="0 0 40 48" aria-hidden="true"><path d="M20 3C7 14 3 28 11 38c4 6 14 6 18 0C37 28 33 14 20 3Z"/><path d="M20 7v34M8 27l12 9 12-9M12 18l8 10 8-10"/></svg><span><small>PURSUIT LAB</small>Glass Tide</span></a>
      <span className="connection"><i className={online?'status-dot':'status-dot offline'}/>{state?.players.length||0}/12 players</span>
      <nav><button onClick={share}>{copied?'Link copied':<><span className="invite-full">Copy invite link</span><span className="invite-short">Invite</span></>}</button><button ref={helpButton} onClick={()=>setHelp(true)}>Help</button>{session&&<button onClick={leave}>Change mode</button>}</nav>
    </header>
    <section className="arena-shell" aria-label="Glass Tide survival arena">
      <canvas ref={canvas} tabIndex={0} className="world" aria-label="Shared pursuit arena. Move with WASD or arrow keys. Hold Shift to sprint."/>
      <div className="arena-status">{status}</div>
      <div className={'generation-clock'+(generation.remaining<=5&&generation.running?' urgent':'')} aria-label="Generation countdown" title={generation.running?'Time until the next generation':'Training pauses when nobody is inside'}>
        <span>Gen {state?.generation||1}</span><span className="clock-divider"/>
        <span>{generation.running?'Next':'Paused'}</span><strong>{generation.remaining===0?'…':`0:${String(generation.remaining).padStart(2,'0')}`}</strong>
      </div>
      {generation.running&&generation.warming>0&&<div className="spawn-status">{generation.warmup>0?`Seeds opening · ${generation.warmup}s`:`${generation.warming} seeds waiting for clear ground`}</div>}
      {!session&&!mode&&<ModeMenu onChoose={chooseMode} paused={help}/>}{!session&&mode&&<form className="join-card" onSubmit={enter}>
        <span className="eyebrow">{modeName(mode)}</span><h1>{motion?"Bring back tomorrow.":"Tread lightly."}</h1><p>{motion?"Humanity needs a life-support seed to survive here. Collect it in the shallows, then carry it to any passage. Move to advance. Freeze to hide.":"The shallows are alive. Enter their territory, evade the sentinels, and see how long you can survive."}</p>
        <label htmlFor="name">Player name</label><input id="name" value={name} onChange={e=>setName(e.target.value)} maxLength={20} placeholder="Runner" autoComplete="nickname"/>
        <button className="primary" disabled={busy||!online}>{busy?'Joining…':'Enter the shallows'}</button>
        <p className="join-hint">Begin safely on the shore. Cross a passage when you’re ready.</p><button type="button" disabled={busy} onClick={backToMenu}>Back to expeditions</button>
      </form>}
      {session&&<div className="player-hud">
        <span>{contact.current?'Run stopped':active?(motion?'Mission time':'Survival time'):'Ready when you are'}</span>
        <strong>{timeScore(contact.current?.run.durationMs??survival)}</strong>
        <div className="stamina"><span>Sprint</span><div className="breath-organ" aria-hidden="true">{Array.from({length:7},(_,i)=><i key={i} style={{opacity:.18+.82*Math.max(0,Math.min(1,(predicted.current?.energy??1)*7-i))}}/>)}</div><meter className="sr-only" min={0} max={1} value={predicted.current?.energy??1} aria-label="Sprint energy"/></div>
      </div>}
      {session&&motion&&!notice&&<div className="mission-hud" role="status"><strong>{carrying?"Seed secured · reach any passage":"Recover the life-support seed"}</strong><span>{carrying?"Return to a gate to extract. Capture loses the seed.":"Follow the gold diamond on your map. Touch the seed to collect."}</span><small>Stillness hides you. Physical contact remains dangerous.</small></div>}
      {notice&&<div className="death-notice" role="status"><strong>{notice.run.bot===-1?'Extraction successful':contact.current?'Touched':motion?'Mission lost':'Run ended'} · {timeScore(notice.run.durationMs)}</strong><span>{notice.run.bot===-1?"Life-support seed delivered · Humanity has a future":`Sentinel ${notice.run.bot+1} · Generation ${notice.run.generation}${contact.current?" · Confirming…":" · Back outside"}`}</span></div>}
      <div className="map-panel"><canvas ref={mini} width={156} height={120} aria-label="Minimap with players, bots, and camera viewport"/><span>FIELD MAP</span></div>
      <div className="view-controls"><button aria-label="Zoom out" onClick={()=>setZoom(z=>Math.max(.35,z-.15))}><Minus size={16}/></button><span>{Math.round(zoom*100)}%</span><button aria-label="Zoom in" onClick={()=>setZoom(z=>Math.min(1.5,z+.15))}><Plus size={16}/></button><button aria-label={expanded?'Exit expanded arena':'Expand arena'} onClick={()=>setExpanded(v=>!v)}>{expanded?<Minimize2 size={16}/>:<Maximize2 size={16}/>}</button></div>
      {session&&<div className="touch-controls"><div className="joystick" role="group" aria-label="Drag to move" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);const r=e.currentTarget.getBoundingClientRect();stick.current.x=Math.max(-1,Math.min(1,(e.clientX-r.left-r.width/2)/35));stick.current.y=Math.max(-1,Math.min(1,(e.clientY-r.top-r.height/2)/35));}} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId)){const r=e.currentTarget.getBoundingClientRect();stick.current.x=Math.max(-1,Math.min(1,(e.clientX-r.left-r.width/2)/35));stick.current.y=Math.max(-1,Math.min(1,(e.clientY-r.top-r.height/2)/35));}}} onPointerUp={clearStick} onPointerCancel={clearStick} onLostPointerCapture={clearStick}><span/></div><button className="dash-touch" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);stick.current.dash=true;}} onPointerUp={()=>stick.current.dash=false} onPointerCancel={()=>stick.current.dash=false} onLostPointerCapture={()=>stick.current.dash=false}>Sprint</button></div>}
      {training&&<aside className="training-panel" id="training-panel" aria-label="Training details">
        <div className="panel-heading"><h2>Field notes</h2><button aria-label="Close training details" onClick={()=>setTraining(false)}><X size={18}/></button></div>
        <dl><div><dt>Generation</dt><dd>{state?.generation||1}</dd></div><div><dt>Sentinels</dt><dd>{state?.population||24}</dd></div><div><dt>Touches</dt><dd>{state?.totalTags||0}</dd></div><div><dt>Best fitness</dt><dd>{(state?.bestFitness||0).toFixed(1)}</dd></div></dl>
        <h3>Fitness by generation</h3><svg viewBox="0 0 260 80" role="img" aria-label="Best fitness for completed generations"><path d="M0 40H260 M0 75H260" stroke="#353d43"/>{fitness.length>1&&<polyline points={chart} fill="none" stroke="#285e59" strokeWidth="2"/>}</svg>{fitness.length<2&&<p>Complete two generations to see a trend.</p>}
        <p>Every 45 seconds of active play, the strongest networks breed and mutate. Sentinels return to their fixed seed beds with a three-second warm-up.</p>
        <button className="export" disabled={!state?.championAvailable} onClick={exportGenome}><Download size={15}/> Export champion</button>
        <p className="technical-note">{motion?"This population learns pursuit from moving targets. Stillness removes the target signal. Motion Hunt training is separate from Survival.":"NEAT-inspired learning, based on Enter the Pygame."}</p>
      </aside>}
      {error&&<div className="error" role="alert"><span>{error}</span><button aria-label="Dismiss message" onClick={()=>setError('')}><X size={16}/></button></div>}
    </section>
    {mode&&<div className="controls-bar"><span className="key-guide"><kbd>WASD</kbd> / arrows <span>Move</span><kbd>Shift</kbd><span>Sprint</span></span><span className="touch-guide">Drag to move · Hold Sprint to run</span><div className="legend"><span><i className="human-mark"/>Player</span><span><i className="bot-mark"/>Sentinel</span><span><i className="safe-mark"/>Dormant</span></div><button aria-expanded={training} aria-controls="training-panel" onClick={()=>setTraining(v=>!v)}>Field notes</button><span className="latency" title="Network round-trip time">{online?`${latency} ms`:'Offline'}</span></div>}
    {mode&&<section className="scores-panel" aria-label={motion?"Your extraction records":"Your survival scores"}><div className="score-best"><span>{motion?"Fastest extraction":"Personal best"}</span><strong>{timeScore(scores.bestMs)}</strong></div><div className="recent-runs"><span>Recent runs <small>{motion?"Time / outcome":"Time / killer generation"}</small></span>{scores.runs.length?<ol>{scores.runs.slice(0,5).map(run=><li key={run.id}><strong>{timeScore(run.durationMs)}</strong><span>{motion?(run.bot===-1?"Extracted":"Lost"):`Gen ${run.generation}`}</span></li>)}</ol>:<p>Your completed runs will appear here.</p>}</div></section>}
    {help&&<div className="modal-backdrop" onClick={()=>setHelp(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="guide-title" onClick={e=>e.stopPropagation()}><div className="panel-heading"><h2 id="guide-title">How to play</h2><button aria-label="Close guide" autoFocus onClick={()=>setHelp(false)}><X size={20}/></button></div><ol><li>Walk into a mode clearing and hold for 0.85 seconds, or press Enter. Then join with a name. Each mode has its own shared arena.</li><li>Move with WASD or arrows. Hold Shift to sprint. On a phone, use the movement pad.</li><li>Enter through a passage. In Survival, stay alive as long as you can. In Motion Hunt, collect the gold-marked life-support seed and return to any passage to extract.</li><li>In Motion Hunt, freezing hides you from the sentinels, but physical contact still kills. Capture loses your seed. Extraction or capture returns you outside; records are saved separately for each mode.</li></ol><p>Open amber sentinels are active. Closed pearl seeds are harmless while warming up or waiting for clear ground. The small rings beneath actors show their contact footprints. New generations return to the same central seed beds.</p><p>Training pauses when the arena is empty. Open Field notes to see progress or export a champion network.</p><button className="primary" onClick={()=>setHelp(false)}>Back to the arena</button></section></div>}
  </main>;
}
