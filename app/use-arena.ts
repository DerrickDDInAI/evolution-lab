'use client';
import {useEffect,useRef,useState} from 'react';
import {renderArena,type View} from '../lib/renderer';
import {movePlayer,type Command} from '../lib/physics';
import {reconcile,type PredictedPlayer} from '../lib/prediction';
import type {Scores} from '../lib/arena';
type Session={id:string;token:string};
type ArenaResponse=View & {session?:Session;error?:string};
export function useArena(help:boolean,zoom:number){
  const [state,setState]=useState<View|null>(null),[session,setSession]=useState<Session|null>(null),[name,setName]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[online,setOnline]=useState(false),[latency,setLatency]=useState(0),[clock,setClock]=useState(Date.now()),[scores,setScores]=useState<Scores>({bestMs:0,runs:[]});
  const canvas=useRef<HTMLCanvasElement>(null),mini=useRef<HTMLCanvasElement>(null),view=useRef<View|null>(null),sessionRef=useRef<Session|null>(null),zoomRef=useRef(zoom),keys=useRef(new Set<string>()),taps=useRef(new Set<string>()),stick=useRef({x:0,y:0,dash:false}),positions=useRef(new Map()),joining=useRef(false),profile=useRef(''),commands=useRef<Command[]>([]),sequence=useRef(0),predicted=useRef<PredictedPlayer|null>(null),offset=useRef(0),wake=useRef(()=>{});
  zoomRef.current=zoom;
  const clearInput=()=>{keys.current.clear();taps.current.clear();stick.current={x:0,y:0,dash:false};};
  const clearSession=()=>{setSession(null);sessionRef.current=null;commands.current=[];predicted.current=null;clearInput();try{sessionStorage.removeItem('pursuit-session');}catch{}};
  function update(data:ArenaResponse,rtt=0){
    offset.current=data.serverTime+rtt/2-Date.now();
    const auth=data.players.find(p=>p.id===sessionRef.current?.id);
    if(auth){
      if(predicted.current&&predicted.current.life!==auth.life){commands.current=[];clearInput();}
      commands.current=commands.current.filter(c=>c.seq>auth.ack&&c.life===auth.life);
      sequence.current=Math.max(sequence.current,auth.ack);
      predicted.current=reconcile(auth,commands.current,data.obstacles,Date.now()+offset.current);
    }
    if(data.personal)setScores(data.personal.scores);
    view.current=data;setState(data);setOnline(true);
  }
  useEffect(()=>{
    try{
      profile.current=localStorage.getItem('pursuit-profile')||crypto.randomUUID();localStorage.setItem('pursuit-profile',profile.current);
      const saved=sessionStorage.getItem('pursuit-session');if(saved){const s=JSON.parse(saved);setSession(s);sessionRef.current=s;}
      setName(localStorage.getItem('pursuit-name')||'');
    }catch{profile.current=crypto.randomUUID();}
    fetch('/api/arena?scores=1',{headers:{Authorization:'Bearer '+profile.current}}).then(async r=>{if(r.ok)setScores(await r.json() as Scores);}).catch(()=>{});
    let stopped=false,inFlight=false,urgent=false,timer:ReturnType<typeof setTimeout>;
    async function poll(){
      if(stopped)return;if(inFlight){urgent=true;return;}inFlight=true;clearTimeout(timer);
      const start=performance.now(),s=sessionRef.current;
      try{
        const response=await fetch('/api/arena',s?{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+s.token},body:JSON.stringify({action:'input',profileToken:profile.current,commands:commands.current.slice(0,90)}),signal:AbortSignal.timeout(6000)}:{cache:'no-store',signal:AbortSignal.timeout(6000)});
        const data=await response.json() as ArenaResponse;
        if(stopped)return;
        if(s?.id!==sessionRef.current?.id)return;
        if(!response.ok){if(response.status===401)clearSession();throw new Error(data.error||'Connection interrupted. Reconnecting…');}
        update(data,performance.now()-start);setLatency(Math.round(performance.now()-start));setError('');
      }catch(e){if(!stopped){setOnline(false);setError(e instanceof Error?e.message:'Connection interrupted. Reconnecting…');}}
      finally{inFlight=false;if(!stopped){timer=setTimeout(poll,urgent?0:sessionRef.current?60:1000);urgent=false;}}
    }
    wake.current=()=>{if(sessionRef.current){urgent=true;if(!inFlight)void poll();}};
    void poll();return()=>{stopped=true;clearTimeout(timer);wake.current=()=>{};};
  },[]);
  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{if(!sessionRef.current||(e.target as HTMLElement).matches('input,textarea')||help)return;const key=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(key)){if(!keys.current.has(key))taps.current.add(key);keys.current.add(key);if(sessionRef.current)e.preventDefault();}};
    const up=(e:KeyboardEvent)=>keys.current.delete(e.key.toLowerCase());
    addEventListener('keydown',down);addEventListener('keyup',up);addEventListener('blur',clearInput);document.addEventListener('visibilitychange',clearInput);
    if(help)clearInput();
    return()=>{removeEventListener('keydown',down);removeEventListener('keyup',up);removeEventListener('blur',clearInput);document.removeEventListener('visibilitychange',clearInput);};
  },[help]);
  useEffect(()=>{
    let frame:number,last=0,accumulator=0,lastUi=0,previousInput='';
    function draw(time:number){
      const dt=last?Math.min(.05,(time-last)/1000):0;last=time;accumulator+=dt;
      const k=new Set([...keys.current,...taps.current]),input={x:(k.has('d')||k.has('arrowright')?1:0)-(k.has('a')||k.has('arrowleft')?1:0)||stick.current.x,y:(k.has('s')||k.has('arrowdown')?1:0)-(k.has('w')||k.has('arrowup')?1:0)||stick.current.y,dash:k.has('shift')||stick.current.dash};
      const signature=JSON.stringify(input);
      while(accumulator>=1/60){
        accumulator-=1/60;
        if(sessionRef.current&&predicted.current&&view.current&&!document.hidden&&commands.current.length<90){
          const command={...input,seq:++sequence.current,life:predicted.current.life,dt:1/60};commands.current.push(command);
          movePlayer(predicted.current,command,command.dt,view.current.obstacles,Date.now()+offset.current);taps.current.clear();
          if(signature!==previousInput){previousInput=signature;wake.current();}
        }
      }
      if(canvas.current)renderArena(canvas.current,mini.current,view.current,sessionRef.current?.id||null,positions.current,zoomRef.current,time,predicted.current);
      if(time-lastUi>80){setClock(Date.now()+offset.current);lastUi=time;}
      frame=requestAnimationFrame(draw);
    }
    frame=requestAnimationFrame(draw);return()=>cancelAnimationFrame(frame);
  },[]);
  async function enter(e:React.FormEvent){
    e.preventDefault();if(joining.current)return;joining.current=true;setBusy(true);setError('');
    try{
      const start=performance.now(),r=await fetch('/api/arena',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'join',name:name.trim()||'Runner',profileToken:profile.current}),signal:AbortSignal.timeout(10000)}),data=await r.json() as ArenaResponse;
      if(!r.ok||!data.session)throw new Error(data.error||'Could not join. Please retry.');
      clearInput();commands.current=[];sequence.current=0;predicted.current=null;setSession(data.session);sessionRef.current=data.session;update(data,performance.now()-start);
      try{sessionStorage.setItem('pursuit-session',JSON.stringify(data.session));localStorage.setItem('pursuit-name',name);}catch{}
      canvas.current?.focus();wake.current();
    }catch(e){setError(e instanceof Error?e.message:'Could not join. Please retry.');}finally{setBusy(false);joining.current=false;}
  }
  async function leave(){const s=sessionRef.current;clearSession();if(s)try{const r=await fetch('/api/arena',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+s.token},body:JSON.stringify({action:'leave'})});if(r.ok)update(await r.json() as ArenaResponse);}catch{}}
  return {state,session,name,setName,error,setError,busy,online,latency,clock,scores,canvas,mini,stick,predicted,enter,leave};
}
