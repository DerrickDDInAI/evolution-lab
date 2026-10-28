'use client';
import {useEffect,useRef,useState} from 'react';
import {orderedFilm,filmSummary,type FilmClip,type FilmSummary} from '../lib/behavior-film';
import {createFilmRenderer,prepareFilmArt} from '../lib/film-renderer';
import type {GameMode} from '../lib/game-mode';
import styles from './film-studio.module.css';

type Listing={clips:FilmSummary[];before:string|null};
const MAX_SELECTED=24;
async function read<T>(url:string,signal?:AbortSignal):Promise<T>{
  const response=await fetch(url,{cache:'no-store',signal});
  const data=await response.json().catch(()=>({error:'Connection interrupted. Retry loading highlights.'}));
  if(!response.ok)throw new Error((data as {error?:string}).error||'Could not load highlights.');return data as T;
}
function save(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function FilmStudio({mode}:{mode:GameMode}){
  const [listing,setListing]=useState<Listing|null>(null),[selected,setSelected]=useState<string[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[video,setVideo]=useState<{url:string;name:string}|null>(null);
  const canvas=useRef<HTMLCanvasElement>(null),cancel=useRef<(()=>void)|null>(null),abort=useRef<AbortController|null>(null),alive=useRef(true),videoUrl=useRef<string|null>(null);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;abort.current?.abort();cancel.current?.();if(videoUrl.current)URL.revokeObjectURL(videoUrl.current);};},[]);
  const endpoint=`/api/film?mode=${mode}`;
  async function run(operation:(signal:AbortSignal)=>Promise<void>){
    setBusy(true);setError('');setMessage('');const controller=new AbortController();abort.current=controller;
    try{await operation(controller.signal);}catch(e){if(alive.current){setMessage('');if(controller.signal.aborted)setMessage(typeof controller.signal.reason==='string'?controller.signal.reason:'Stopped. Your saved highlights are still available.');else setError(e instanceof Error?e.message:'Please retry.');}}
    finally{if(alive.current)setBusy(false);abort.current=null;}
  }
  async function load(older=false){await run(async signal=>{
    const data=await read<Listing>(endpoint+(older&&listing?.before?`&before=${encodeURIComponent(listing.before)}`:''),signal);
    if(!alive.current)return;
    setListing(old=>({clips:older?[...(old?.clips||[]),...data.clips]:data.clips,before:data.before}));
    if(!older){const sorted=orderedFilm(data.clips);const chosen=sorted.length<=6?sorted: Array.from({length:6},(_,i)=>sorted[Math.round(i*(sorted.length-1)/5)]);setSelected(chosen.map(c=>c.id));}
    setMessage(data.clips.length?`${older?'Older highlights loaded.':'Highlights ready.'} Choose up to ${MAX_SELECTED} generations.`:'No completed-generation highlights yet. Recording happens automatically during play.');
  });}
  async function clips(signal:AbortSignal){
    const items:FilmClip[]=[];
    for(const id of selected){items.push(await read<FilmClip>(endpoint+`&id=${encodeURIComponent(id)}`,signal));}
    return orderedFilm(items);
  }
  async function play(record:boolean){await run(async signal=>{
    if(document.hidden)throw new Error('Keep this tab visible while playing or exporting.');
    if(record&&(typeof MediaRecorder==='undefined'||!HTMLCanvasElement.prototype.captureStream))throw new Error('Video recording is unavailable in this browser. You can still download the replay data.');
    const items=await clips(signal);if(!items.length)throw new Error('Select at least one generation.');
    await prepareFilmArt();if(signal.aborted||!alive.current)return;
    const surface=canvas.current;if(!surface)throw new Error('Open the film panel and retry.');
    const painter=createFilmRenderer(surface);let stream:MediaStream|undefined,recorder:MediaRecorder|undefined;
    let animation=0,stopped=false;
    const chunks:Blob[]=[];
    let stopRecording:Promise<void>=Promise.resolve(),failed=false;
    try{
      painter.draw(items[0],0,0,items.length);
      if(record){
        const mime=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));
        if(!mime)throw new Error('No supported video format was found. Download replay data or try another browser.');
        stream=surface.captureStream(30);recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:5_000_000});
        recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
        stopRecording=new Promise<void>(resolve=>{recorder!.onstop=()=>resolve();});
        recorder.onerror=()=>{failed=true;stop('Video recording failed. Download the replay data and retry.');};
        recorder.start(1000);
      }
      const durations=items.map(c=>filmSummary('',c).duration),total=durations.reduce((a,b)=>a+b,0);
      await new Promise<void>((resolve,reject)=>{
        let start=performance.now(),lastFrame=start,lastPaint=0,index=0,offset=0,lastReport='';
        function finish(reason?:string){if(stopped)return;stopped=true;cancelAnimationFrame(animation);document.removeEventListener('visibilitychange',hidden);signal.removeEventListener('abort',aborted);cancel.current=null;if(reason)reject(new Error(reason));else resolve();}
        const aborted=()=>finish(typeof signal.reason==='string'?signal.reason:'Stopped. Your saved highlights are still available.');
        const hidden=()=>{if(document.hidden)finish('Playback stopped because the tab was hidden. Keep it visible and retry.');};
        const stop=(reason?:string)=>finish(reason);
        cancel.current=()=>stop('Stopped. Your saved highlights are still available.');
        signal.addEventListener('abort',aborted,{once:true});document.addEventListener('visibilitychange',hidden);
        function tick(now:number){
          if(stopped)return;
          if(record&&now-lastFrame>1500){finish('Video export paused for too long. Close other busy tabs and retry.');return;}
          lastFrame=now;
          if(now-lastPaint<1000/30-1){animation=requestAnimationFrame(tick);return;}
          lastPaint=now;const elapsed=(now-start)/1000;
          while(index<items.length-1&&elapsed-offset>=durations[index]){offset+=durations[index];index++;}
          try{painter.draw(items[index],Math.min(durations[index],elapsed-offset),index,items.length);}catch(e){finish(e instanceof Error?e.message:'Could not render this highlight.');return;}
          const report=`${record?'Exporting':'Playing'} · ${Math.min(total,elapsed).toFixed(0)} / ${total.toFixed(0)} seconds · Generation ${items[index].generation}`;
          if(alive.current&&report!==lastReport){setMessage(report);lastReport=report;}
          if(elapsed>=total)finish();else animation=requestAnimationFrame(tick);
        }
        // Stop after a long render stall instead of silently skipping a section of the film.
        start=performance.now();animation=requestAnimationFrame(tick);
      });
      if(recorder){
        if(recorder.state!=='inactive')recorder.stop();await stopRecording;
        if(failed||!chunks.length)throw new Error('The browser produced no video. Retry or download replay data.');
        const mime=recorder.mimeType||chunks[0].type,name=`immunity-${mode}-generations-${items[0].generation}-${items.at(-1)!.generation}.${mime.includes('mp4')?'mp4':'webm'}`;
        const url=URL.createObjectURL(new Blob(chunks,{type:mime}));if(videoUrl.current)URL.revokeObjectURL(videoUrl.current);videoUrl.current=url;
        if(alive.current){setVideo({url,name});setMessage('Video ready. Download it below.');}
      }else if(alive.current)setMessage('Preview finished. Export the selected generations when ready.');
    }finally{
      stopped=true;cancelAnimationFrame(animation);cancel.current=null;
      if(recorder&&recorder.state!=='inactive'){recorder.stop();await stopRecording;}
      stream?.getTracks().forEach(t=>t.stop());painter.dispose();
    }
    function stop(reason:string){abort.current?.abort(reason);}
  });}
  return <details className={styles.studio} onToggle={e=>{if(!e.currentTarget.open)abort.current?.abort();}}>
    <summary>Sentinel behavior film</summary>
    <p>Real player chases across generations. One anonymous, sampled highlight is saved automatically when each generation ends. Replays use recorded movement, with confirmed captures marked.</p>
    <p>Changing opponents and selected highlights do not establish improved performance. Earlier generations have no footage. Recording stays on the server when this panel is closed.</p>
    <div className={styles.actions}><button className="vault-button" disabled={busy} onClick={()=>void load()}>Refresh highlights</button>{listing?.before&&<button className="vault-button" disabled={busy} onClick={()=>void load(true)}>Load older generations</button>}</div>
    {listing&&listing.clips.length>0&&<><fieldset disabled={busy}><legend>{selected.length} / {MAX_SELECTED} selected · played chronologically</legend><div className={styles.list}>{orderedFilm(listing.clips).map(clip=><label key={clip.id}><input type="checkbox" checked={selected.includes(clip.id)} disabled={!selected.includes(clip.id)&&selected.length>=MAX_SELECTED} onChange={e=>setSelected(old=>e.target.checked?[...old,clip.id]:old.filter(id=>id!==clip.id))}/><span>Gen {clip.generation} · branch {clip.branch} · {clip.duration.toFixed(1)} s{clip.captures?' · capture':''}{clip.partial?' · partial generation':''}</span></label>)}</div></fieldset>
      <div className={styles.actions}><button className="vault-button" disabled={busy||!selected.length} onClick={()=>void play(false)}>Preview selected</button><button className="export" disabled={busy||!selected.length} onClick={()=>void play(true)}>Export video</button><button className="vault-button" disabled={busy||!selected.length} onClick={()=>void run(async signal=>{const items=await clips(signal);save(new Blob([JSON.stringify({format:'immunity-film-selection-v1',clips:items})],{type:'application/json'}),`immunity-${mode}-replays.json`);setMessage('Replay data downloaded.');})}>Download replay data</button></div></>}
    <canvas ref={canvas} className={styles.canvas} width={1280} height={720} aria-label="Sentinel behavior film preview"/>
    {busy&&<button className="vault-button" onClick={()=>abort.current?.abort()}>Stop</button>}
    <p role="status">{message||'Sign-in protects the highlight archive. Refresh to browse saved generations. Video export takes the film’s full duration; keep this tab visible.'}</p>
    {error&&<p className="vault-error" role="alert">{error}</p>}
    {video&&<div><video className={styles.video} controls src={video.url} aria-label="Exported behavior film"/><a className="vault-button" href={video.url} download={video.name}>Download video</a></div>}
  </details>;
}
