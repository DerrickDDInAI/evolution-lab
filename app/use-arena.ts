'use client';
import {useEffect,useRef,useState} from 'react';
import {flushSync} from 'react-dom';
import {predictContact,contactResult,type LocalContact} from '../lib/contact-prediction';
import type {CollisionEvent} from '../lib/collision-effects';
import {renderArena,releaseRenderer,updatePositions,cancelCollision,type View} from '../lib/renderer';
import {movePlayer,MAX_QUEUED_COMMANDS,MAX_PACKET_COMMANDS,type Command} from '../lib/physics';
import {reconcile,type PredictedPlayer} from '../lib/prediction';
import {correctionFor,decayCorrection,type Correction} from '../lib/net-motion';
import type {Scores,Run} from '../lib/arena';
type Session={id:string;token:string};
type ArenaResponse=View & {session?:Session;error?:string};
export function useArena(help:boolean,zoom:number){
  const [state,setState]=useState<View|null>(null),[session,setSession]=useState<Session|null>(null),[name,setName]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[online,setOnline]=useState(false),[latency,setLatency]=useState(0),[clock,setClock]=useState(Date.now()),[scores,setScores]=useState<Scores>({bestMs:0,runs:[]});
  const canvas=useRef<HTMLCanvasElement>(null),mini=useRef<HTMLCanvasElement>(null),view=useRef<View|null>(null),sessionRef=useRef<Session|null>(null),zoomRef=useRef(zoom),keys=useRef(new Set<string>()),taps=useRef(new Set<string>()),stick=useRef({x:0,y:0,dash:false}),positions=useRef(new Map()),joining=useRef(false),profile=useRef(''),commands=useRef<Command[]>([]),sequence=useRef(0),predicted=useRef<PredictedPlayer|null>(null),offset=useRef(0),networkDelay=useRef(0),correction=useRef<Correction>({x:0,y:0}),wake=useRef(()=>{});
  const contact=useRef<LocalContact|null>(null),localEvent=useRef<CollisionEvent|null>(null),localStartedAt=useRef(0),blockedContact=useRef<LocalContact|null>(null),noticeRef=useRef<{run:Run;shownAt:number}|null>(null),[notice,setNotice]=useState<{run:Run;shownAt:number}|null>(null);
  const showNotice=(run:Run|null,shownAt=performance.now())=>{noticeRef.current=run?{run,shownAt}:null;setNotice(noticeRef.current);};
  const onlineRef=useRef(false);onlineRef.current=online;
  zoomRef.current=zoom;
  const clearInput=()=>{keys.current.clear();taps.current.clear();stick.current={x:0,y:0,dash:false};};
  const clearSession=()=>{contact.current=null;localEvent.current=null;blockedContact.current=null;showNotice(null);setSession(null);sessionRef.current=null;commands.current=[];predicted.current=null;correction.current={x:0,y:0};clearInput();try{sessionStorage.removeItem('pursuit-session');}catch{}};
  function update(data:ArenaResponse,rtt=0,sentContact:LocalContact|null=null){
    offset.current=data.serverTime+rtt/2-Date.now();networkDelay.current=rtt/2000;
    const auth=data.players.find(p=>p.id===sessionRef.current?.id);
    if(auth){
      const hit=contact.current;
      if(hit){
        const result=contactResult(hit,auth,sentContact);
        if(result==='confirmed'){contact.current=null;blockedContact.current=null;}
        if(result==='rejected'){
          cancelCollision(canvas.current,hit.event);contact.current=null;localEvent.current=null;blockedContact.current=hit;showNotice(null);
        }
      }
      if(predicted.current&&predicted.current.life!==auth.life){commands.current=[];clearInput();}
      commands.current=commands.current.filter(c=>c.seq>auth.ack&&c.life===auth.life);
      sequence.current=Math.max(sequence.current,auth.ack);
      const next=reconcile(auth,commands.current,data.obstacles,Date.now()+offset.current);
      const old=predicted.current?{...predicted.current,x:predicted.current.x+correction.current.x,y:predicted.current.y+correction.current.y}:null;
      correction.current=correctionFor(old,next,predicted.current?.life===next.life);predicted.current=next;
    }
    if(data.personal){
      setScores(data.personal.scores);
      const death=data.personal.lastDeath;
      if(death&&death.id!==view.current?.personal?.lastDeath?.id&&data.serverTime-death.diedAt<5000){
        const predictedNotice=localEvent.current&&auth&&localEvent.current.life===auth.life-1;
        const shownAt=predictedNotice?localStartedAt.current:performance.now();
        if(performance.now()-shownAt<3500)showNotice(death,shownAt);
      }
    }
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
      const start=performance.now(),s=sessionRef.current,sentContact=contact.current;
      try{
        const response=await fetch('/api/arena',s?{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+s.token},body:JSON.stringify({action:'input',profileToken:profile.current,commands:commands.current.slice(0,MAX_PACKET_COMMANDS)}),signal:AbortSignal.timeout(6000)}:{cache:'no-store',signal:AbortSignal.timeout(6000)});
        const data=await response.json() as ArenaResponse;
        if(stopped)return;
        if(s?.id!==sessionRef.current?.id)return;
        if(!response.ok){if(response.status===401)clearSession();throw new Error(data.error||'Connection interrupted. Reconnecting…');}
        update(data,performance.now()-start,sentContact);setLatency(Math.round(performance.now()-start));setError('');
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
    const surface=canvas.current;let frame:number,last=0,accumulator=0,lastUi=0,previousInput='';
    function draw(time:number){
      const dt=last?Math.min(.05,(time-last)/1000):0;last=time;accumulator+=dt;
      const k=new Set([...keys.current,...taps.current]),input={x:(k.has('d')||k.has('arrowright')?1:0)-(k.has('a')||k.has('arrowleft')?1:0)||stick.current.x,y:(k.has('s')||k.has('arrowdown')?1:0)-(k.has('w')||k.has('arrowup')?1:0)||stick.current.y,dash:k.has('shift')||stick.current.dash};
      const signature=JSON.stringify(input);
      while(accumulator>=1/60){
        accumulator-=1/60;
        if(!contact.current&&sessionRef.current&&predicted.current&&view.current&&!document.hidden&&commands.current.length<MAX_QUEUED_COMMANDS){
          const command={...input,seq:++sequence.current,life:predicted.current.life,dt:1/60};commands.current.push(command);
          movePlayer(predicted.current,command,command.dt,view.current.obstacles,Date.now()+offset.current);taps.current.clear();
          if(signature!==previousInput){previousInput=signature;wake.current();}
        }
      }
      decayCorrection(correction.current,dt);
      let display=predicted.current?{...predicted.current,x:predicted.current.x+correction.current.x,y:predicted.current.y+correction.current.y}:null;
      const world=view.current,self=sessionRef.current?.id||null;
      updatePositions(world,self,positions.current,time,networkDelay.current);
      const touching=world?predictContact(display,world.bots,positions.current,world.generation,time,Date.now()+offset.current,sequence.current):null;
      const blocked=blockedContact.current,blockedBot=blocked?positions.current.get('b'+blocked.event.bot):null;
      if(blocked&&(!display||display.life!==blocked.life||display.phase!=='arena'||!blockedBot||Math.hypot(display.x-blockedBot.x,display.y-blockedBot.y)>60))blockedContact.current=null;
      if(touching&&!contact.current&&!blockedContact.current&&onlineRef.current){
        contact.current=touching;localEvent.current=touching.event;localStartedAt.current=time;clearInput();
        // Commit the DOM notice in this same animation frame as the canvas impact.
        flushSync(()=>showNotice(touching.run));wake.current();
      }
      if(contact.current){
        display=contact.current.player;
        if(time-contact.current.startedAt>6000){cancelCollision(canvas.current,contact.current.event);blockedContact.current=contact.current;contact.current=null;localEvent.current=null;showNotice(null);}
      }
      if(canvas.current)renderArena(canvas.current,mini.current,world,self,positions.current,zoomRef.current,time,display,localEvent.current);
      if(noticeRef.current&&time-noticeRef.current.shownAt>3500)showNotice(null);
      if(time-lastUi>80){setClock(Date.now()+offset.current);lastUi=time;}
      frame=requestAnimationFrame(draw);
    }
    frame=requestAnimationFrame(draw);return()=>{cancelAnimationFrame(frame);releaseRenderer(surface);};
  },[]);
  async function enter(e:React.FormEvent){
    e.preventDefault();if(joining.current)return;joining.current=true;setBusy(true);setError('');
    try{
      const start=performance.now(),r=await fetch('/api/arena',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'join',name:name.trim()||'Runner',profileToken:profile.current}),signal:AbortSignal.timeout(10000)}),data=await r.json() as ArenaResponse;
      if(!r.ok||!data.session)throw new Error(data.error||'Could not join. Please retry.');
      clearInput();contact.current=null;localEvent.current=null;blockedContact.current=null;showNotice(null);commands.current=[];sequence.current=0;predicted.current=null;setSession(data.session);sessionRef.current=data.session;update(data,performance.now()-start);
      try{sessionStorage.setItem('pursuit-session',JSON.stringify(data.session));localStorage.setItem('pursuit-name',name);}catch{}
      canvas.current?.focus();wake.current();
    }catch(e){setError(e instanceof Error?e.message:'Could not join. Please retry.');}finally{setBusy(false);joining.current=false;}
  }
  async function leave(){const s=sessionRef.current;clearSession();if(s)try{const r=await fetch('/api/arena',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+s.token},body:JSON.stringify({action:'leave'})});if(r.ok)update(await r.json() as ArenaResponse);}catch{}}
  return {state,session,notice,contact,name,setName,error,setError,busy,online,latency,clock,scores,canvas,mini,stick,predicted,enter,leave};
}
