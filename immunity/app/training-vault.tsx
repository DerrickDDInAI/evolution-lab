'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Download,LockKeyhole} from 'lucide-react';
import type {View} from '../lib/renderer';
import type {GameMode} from '../lib/game-mode';
const MAX_IMPORT_BYTES=512*1024;
type Status={configured:boolean;authenticated:boolean;expires:number|null;generation:number|null;training:View['training']};
type Preview={kind:'champion'|'checkpoint';mode:GameMode;generation:number;createdAt:number;bots:number;fitness:number|null};
export function TrainingVault({state,motion,online,adminOpen=false}:{state:View|null;motion:boolean;online:boolean;adminOpen?:boolean}){
  const mode=motion?'motion':'survival';
  const [status,setStatus]=useState<Status|null>(null),[password,setPassword]=useState(''),[preview,setPreview]=useState<Preview|null>(null);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[confirmRollback,setConfirmRollback]=useState(false);
  const [confirmReset,setConfirmReset]=useState<{generation:number;branch:number}|null>(null);
  const artifact=useRef<unknown>(null),fileInput=useRef<HTMLInputElement>(null);
  const refresh=useCallback(async()=>{
    const response=await fetch(`/api/training?mode=${mode}`,{cache:'no-store'});
    const data=await response.json().catch(()=>({error:'Connection interrupted. Refresh training status before retrying.'})) as Status & {error?:string};if(!response.ok)throw new Error(data.error||'Could not refresh training controls.');setStatus(data as Status);
  },[mode]);
  useEffect(()=>{
    let active=true;
    const poll=()=>{if(active)void refresh().catch(()=>setError('Cannot reach model storage. Check your connection and retry.'));};poll();const timer=setInterval(poll,10000);
    return()=>{active=false;clearInterval(timer);};
  },[refresh,state?.generation]);
  const t=status?.training||state?.training;
  async function action(name:string,body:Record<string,unknown>={}){
    const response=await fetch(`/api/training?action=${name}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,...body})});
    const data=await response.json().catch(()=>({error:'Connection interrupted. Refresh training status before retrying.'})) as {error?:string;message:string;preview:Preview};if(response.status===401)setStatus(old=>old?{...old,authenticated:false}:old);
    if(!response.ok)throw new Error(data.error||'The training change could not be saved.');return data;
  }
  async function run(operation:()=>Promise<void>){
    setBusy(true);setError('');setMessage('');
    try{await operation();}catch(e){setError(e instanceof Error?e.message:'Please retry.');}
    finally{await refresh().catch(()=>{});setBusy(false);}
  }
  async function download(kind:'champion'|'current'|'checkpoint'|'rollback'){
    await run(async()=>{
      const response=await fetch(`/api/training/export?mode=${mode}&kind=${kind}`);const data=await response.json().catch(()=>({error:'Connection interrupted. Refresh training status before retrying.'})) as {error?:string;generation:number};
      if(!response.ok)throw new Error(data.error||'Export failed.');
      const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download=`immunity-${mode}-${kind}-gen-${data.generation}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      setMessage('Training file downloaded. It contains no player data.');
    });
  }
  return <section className="training-vault" aria-label="Training archive">
    <h3>Save models <small>{status?.generation?`Current generation ${status.generation}`:'Shared training progress'}</small></h3>
    <button className="export" disabled={busy||!online||!t?.bestModelAvailable} onClick={()=>void download('champion')}><Download size={15}/>Export best model</button>
    {!t?.bestModelAvailable&&<p>A new fitness record will save the best model. Older record scores may predate model archiving.</p>}
    <button className="vault-button" disabled={busy||!online||!status?.generation} onClick={()=>void download('current')}><Download size={15}/>Export current generation</button>
    <p>All 24 active models and their evolution state, ready to resume as a fresh generation. In-progress fitness and player data are excluded.</p>
    <details><summary>Automatic checkpoint</summary>
    <button className="vault-button" disabled={busy||!online||!t?.checkpointGeneration} onClick={()=>void download('checkpoint')}><Download size={15}/>Export training checkpoint</button>
    <p>{t?.checkpointGeneration?`Checkpoint ready for generation ${t.checkpointGeneration}.`:'The first checkpoint is saved when a generation completes.'} Includes all 24 bots and their evolution state.</p></details>
    {t?.pending&&<p className="vault-notice" role="status">{t.pending.kind==='rollback'?'Rollback':'Import'} queued from generation {t.pending.sourceGeneration}. Applies when the active generation ends; waits while training is paused.</p>}
    <details className="training-admin" open={adminOpen||undefined} onToggle={e=>{if(e.currentTarget.open)void refresh().catch(()=>setError('Cannot reach administrator controls. Try again when connected.'));}}>
      <summary><LockKeyhole size={14}/> Administrator</summary>
      {!status?<><p>Checking administrator access…</p><button className="vault-button" disabled={busy} onClick={()=>void run(refresh)}>Retry connection</button></>:!status.configured?<p>Admin sign-in is not configured on this host yet. Model downloads are still available. The owner must finish the private password setup before importing.</p>:!status.authenticated?
        <form onSubmit={e=>{e.preventDefault();void run(async()=>{try{await action('login',{password});setMessage('Signed in for 30 minutes.');}finally{setPassword('');}});}}>
          <label htmlFor="training-password">Administrator password</label><input id="training-password" type="password" autoComplete="current-password" value={password} maxLength={256} onChange={e=>setPassword(e.target.value)} required disabled={busy}/>
          <button className="vault-button" disabled={busy||!online||!password} type="submit">{busy?'Signing in…':'Sign in'}</button>
        </form>:<>
          <div className="vault-session"><span>Administrator · expires {status.expires?new Date(status.expires).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'soon'}</span><button disabled={busy} onClick={()=>void run(async()=>{await action('logout');artifact.current=null;setPreview(null);setConfirmRollback(false);setConfirmReset(null);setMessage('Signed out.');})}>Sign out</button></div>
          <label htmlFor="training-file">Import model or checkpoint</label><input ref={fileInput} id="training-file" type="file" accept=".json,application/json" disabled={busy||!!t?.pending||!online} onChange={e=>{
            const file=e.target.files?.[0];artifact.current=null;setPreview(null);if(!file)return;
            void run(async()=>{
              if(file.size>MAX_IMPORT_BYTES)throw new Error('Choose a JSON file smaller than 512 KiB.');
              let parsed:unknown;try{parsed=JSON.parse(await file.text());}catch{throw new Error('This file is not valid JSON.');}
              const data=await action('preview',{artifact:parsed});artifact.current=parsed;setPreview(data.preview);setConfirmRollback(false);
            });
          }}/>
          {preview&&<div className="vault-preview"><strong>{preview.kind==='champion'?'Best bot model':'Full training checkpoint'}</strong><dl><div><dt>Mode</dt><dd>{preview.mode==='motion'?'Motion Hunt':'Survival'}</dd></div><div><dt>Source generation</dt><dd>{preview.generation}</dd></div><div><dt>Saved</dt><dd>{new Date(preview.createdAt).toLocaleString()}</dd></div>{preview.fitness!==null&&<div><dt>File’s reported fitness</dt><dd>{preview.fitness.toFixed(1)}</dd></div>}</dl>
            <p>{preview.kind==='champion'?'Starts a new population from this bot and mutated copies.':'Resumes the saved population and evolution state.'} Replaces the next generation’s population. The current training is backed up first. Player scores and previous history are preserved.</p><p>Compatibility checked. Playing strength has not been independently evaluated.</p>
            <button className="export" disabled={busy||!online||!!t?.pending} onClick={()=>void run(async()=>{const result=await action('import',{artifact:artifact.current});setMessage(result.message);artifact.current=null;setPreview(null);if(fileInput.current)fileInput.current.value='';})}>Queue import for next generation</button>
          </div>}
          {t?.pending&&<button className="vault-button" disabled={busy||!online} onClick={()=>void run(async()=>{const result=await action('cancel',{pendingId:t.pending!.id});setMessage(result.message);})}>Cancel queued {t.pending.kind}</button>}
          {t?.rollbackGeneration&&<div className="vault-rollback"><p>Pre-change backup: population prepared for generation {t.rollbackGeneration}.</p><button className="vault-button" disabled={busy||!online} onClick={()=>void download('rollback')}>Download backup</button>
            {!confirmRollback?<button className="vault-button" disabled={busy||!online||!!t.pending} onClick={()=>setConfirmRollback(true)}>Restore pre-change backup…</button>:<><p>Restore this population at the next boundary? The population it replaces will become the new backup.</p><button className="vault-button" disabled={busy||!online||!!t.pending} onClick={()=>void run(async()=>{const result=await action('rollback',{rollbackGeneration:t.rollbackGeneration});setMessage(result.message);setConfirmRollback(false);})}>Queue rollback</button><button className="vault-button" disabled={busy} onClick={()=>setConfirmRollback(false)}>Keep current training</button></>}
          </div>}
          <div className="vault-rollback">
            <h4>Reset {motion?'Motion Hunt':'Survival'} training</h4>
            <p>Start again at generation 1 with 24 untrained bots. Clears this mode’s fitness history and best model. Player scores and the other mode’s training are preserved.</p>
            {!confirmReset?<button className="vault-button" disabled={busy||!online||!status.generation||!!t?.pending} onClick={()=>{setConfirmRollback(false);setConfirmReset({generation:status.generation!,branch:t!.branch});}}>Reset generation…</button>:<div role="group" aria-label="Confirm generation reset">
              <p>Reset {motion?'Motion Hunt':'Survival'} from generation {confirmReset.generation} to 1 now? The current population will replace the pre-change backup. Download any existing backup you want to keep first.</p>
              <button className="vault-button" disabled={busy||!online||!!t?.pending} onClick={()=>void run(async()=>{const expected=confirmReset;setConfirmReset(null);const result=await action('reset',expected);artifact.current=null;setPreview(null);if(fileInput.current)fileInput.current.value='';setMessage(result.message);})}>Confirm reset to generation 1</button>
              <button className="vault-button" disabled={busy} onClick={()=>setConfirmReset(null)}>Keep current generation</button>
            </div>}
            {t?.pending&&<p>Cancel the queued training change before resetting.</p>}
          </div>
        </>}
    </details>
    <button className="vault-refresh" disabled={busy} onClick={()=>void run(refresh)}>Refresh model status</button>{busy&&<p role="status">Working…</p>}{message&&<p className="vault-notice" role="status">{message}</p>}{error&&<p className="vault-error" role="alert">{error}</p>}
  </section>;
}
