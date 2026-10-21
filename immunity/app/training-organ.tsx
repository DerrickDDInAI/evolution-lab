'use client';
import {useRef,useEffect} from 'react';
import {X,ArrowRight,Leaf} from 'lucide-react';
import {TrainingVault} from './training-vault';
import {TidalShell} from './tidal-shell';
import {fitnessPlot,trainingMetrics,type TrainingSample} from '../lib/training-metrics';
import type {View} from '../lib/renderer';
const number=(n:number|null|undefined)=>n==null?'—':n.toFixed(1);
function FitnessChart({history,compact=false}:{history:TrainingSample[];compact?:boolean}){
  const plot=fitnessPlot(history);
  if(!history.length)return <span className="training-empty">First generation growing<span>Results appear after 45s of active play.</span></span>;
  return <span className={'fitness-visual'+(compact?' compact':'')}><svg className="fitness-chart" viewBox="0 0 352 112" role="img" aria-label={`Completed generation fitness, ${history[0].generation} through ${history.at(-1)!.generation}. Latest best ${number(history.at(-1)!.fitness)}. Solid amber: best; dashed cyan: average.`}>
    {[16,48,80].map((y,i)=><g key={y}><path d={`M36 ${y+5}H292`} className="chart-grid"/><text x="29" y={y+8} textAnchor="end">{number(plot.max-(plot.max-plot.min)*i/2)}</text></g>)}
    <g transform="translate(24 5)"><path d={`M12 16V80H268`} className="chart-baseline"/>
      {plot.means.map((points,i)=><polyline key={i} points={points} className="chart-mean"/>)}
      {plot.bestSegments.map((points,i)=><polyline key={i} points={points} className="chart-best"/>)}
      {plot.branches.map(b=><g key={b.branch}><path d={`M${b.x} 12V84`} className="chart-branch"/><title>Training branch {b.branch} starts here</title></g>)}
      {plot.points.map((p,i)=><circle key={history[i].generation} cx={p.x} cy={p.y} r={i===history.length-1?3:2} className="chart-point"/>)}</g>
    <path d="M303 31h12" className="chart-best"/><text x="319" y="34" className="chart-best-label">Best</text>
    <path d="M303 51h12" className="chart-mean"/><text x="319" y="54" className="chart-mean-label">Avg</text>
    <text x="292" y="105" textAnchor="end">Generations {history[0].generation}–{history.at(-1)!.generation}</text>
  </svg><span className="chart-key"><span><i/>{compact?"Best":"Best fitness"}</span><span><i/>Average</span>{compact&&<span className="chart-range">Gen {history[0].generation}–{history.at(-1)!.generation}</span>}</span></span>;
}
export function TrainingOrgan({state,online,open,onToggle,buttonRef}:{state:View|null;online:boolean;open:boolean;onToggle:()=>void;buttonRef:React.RefObject<HTMLButtonElement|null>}){
  const metrics=trainingMetrics(state?.history||[],state?.bots||[],state?.round||45,state?.bestGeneration??null);
  return <button ref={buttonRef} className="adaptation-organ" aria-expanded={open} aria-controls="training-panel" onClick={onToggle} aria-label="Adaptation: open bot training performance">
    <TidalShell/><span className="organ-eyebrow"><Leaf size={17}/>Adaptation<span className="training-link">View training <ArrowRight size={15}/></span></span>
    <span className="adaptation-metrics"><span className="adaptation-value"><small>{metrics.latest?"Latest fitness":"Live fitness"}</small><strong className={number(metrics.latest?.fitness??metrics.best).length>5?"fitness-wide":undefined}>{number(metrics.latest?.fitness??metrics.best)}</strong></span>
      <span className="adaptation-record"><span><span className="record-full">Best generation</span><span className="record-short">Best gen</span> <b>{metrics.bestGeneration?.generation??'—'}</b></span><span>Best fitness <strong>{number(metrics.bestGeneration?.fitness)}</strong></span></span></span>
    <FitnessChart history={state?.history||[]} compact/>
    <span className={'adaptation-caption'+(!online?' disconnected':'')}><i/>{!online?'Connection lost · last known results':metrics.latest?`Gen ${metrics.latest.generation} completed · ${metrics.latest.tags} captures`:'Awaiting first completed result'}</span>
  </button>;
}
export function TrainingPanel({state,online,motion,onClose}:{state:View|null;online:boolean;motion:boolean;onClose:()=>void}){
  const panel=useRef<HTMLElement>(null);
  const metrics=trainingMetrics(state?.history||[],state?.bots||[],state?.round||45,state?.bestGeneration??null);
  useEffect(()=>{
    const first=panel.current?.querySelector<HTMLButtonElement>('button');first?.focus();
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){e.preventDefault();onClose();}
      if(e.key==='Tab'){
        const items=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),summary,input:not(:disabled),a[href]')||[]).filter(el=>el.getClientRects().length>0),first=items[0],last=items.at(-1);
        if(!panel.current?.contains(document.activeElement)){e.preventDefault();first?.focus();}
        else if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      }
    };addEventListener('keydown',key);return()=>removeEventListener('keydown',key);
  },[onClose]);
  return <div className="training-backdrop" onClick={onClose}><aside ref={panel} className="training-panel" id="training-panel" role="dialog" aria-modal="true" aria-labelledby="training-title" onClick={e=>e.stopPropagation()}>
    <div className="panel-heading"><div><span className="eyebrow">The shallows remember</span><h2 id="training-title">Sentinel adaptation</h2></div><button aria-label="Close training details" onClick={onClose}><X size={20}/></button></div>
    <p className="training-state">{!online?'Connection lost · showing last known results':!state?'Connecting to the colony…':state.players.some(p=>p.phase==='arena')?'Training active · observations from this shared mode':'Training paused · enter the arena to continue'}</p>
    <div className="training-summary"><div><span>Last completed best</span><strong>{number(metrics.latest?.fitness)}</strong></div><div><span>Change from prior gen</span><strong>{metrics.change==null?'—':`${metrics.change>0?'+':''}${number(metrics.change)}`}</strong></div></div>
    <h3>Fitness evolution <small>Last {state?.history.length||0} / 40 generations</small></h3><FitnessChart history={state?.history||[]}/>
    <p className="training-context">Branch {state?.training.branch||1} · dotted lines mark imports or rollbacks. Higher fitness means more pursuit reward. Human opponents and activity change, so a rising line alone does not prove better bots.</p>
    <dl><div><dt>Best generation so far</dt><dd>{metrics.bestGeneration?`Gen ${metrics.bestGeneration.generation} · ${number(metrics.bestGeneration.fitness)} fitness`:"Awaiting first result"}</dd></div><div><dt>Completed-generation captures</dt><dd>{metrics.latest?.tags??'—'}</dd></div><div><dt>Captures / active minute</dt><dd>{number(metrics.capturesPerMinute)}</dd></div><div><dt>Live generation</dt><dd>{state?.generation??'—'} <small>in progress</small></dd></div><div><dt>Live best / average fitness</dt><dd>{number(metrics.best)} / {number(metrics.average)}</dd></div><div><dt>Live rewarded captures</dt><dd>{state?metrics.captures:'—'}</dd></div><div><dt>Population / species</dt><dd>{state?`${state.population} / ${state.species}`:'—'}</dd></div></dl>
    <h3>Leading bots <small>Current generation · provisional</small></h3><ol className="bot-leaders">{metrics.leaders.map(bot=><li key={bot.id}><span>Sentinel {bot.id+1}</span><strong>{number(bot.fitness)}<small> fitness · {bot.tags} captures</small></strong></li>)}</ol>
    {!!state?.history.length&&<details className="generation-results"><summary>Generation results</summary><div className="table-scroll"><table><caption className="sr-only">Completed generation training results, newest first</caption><thead><tr><th scope="col">Gen / branch</th><th scope="col">Best</th><th scope="col">Average</th><th scope="col">Captures</th></tr></thead><tbody>{[...state.history].reverse().map(h=><tr key={h.generation}><th scope="row">{h.generation} / {h.branch||1}</th><td>{number(h.fitness)}</td><td>{number(h.meanFitness)}</td><td>{h.tags}</td></tr>)}</tbody></table></div></details>}
    <details className="fitness-explainer"><summary>What are the bots learning?</summary><p>Fitness rewards closing distance (+0.04 per unit), proximity, and a validated capture (+50). Obstacle contact costs 3 per second. Captures here count those rewarded by training in the same generation.</p><p>Every 45 seconds of active simulation, the strongest networks breed and mutate. Training pauses without players inside. New generations reset live fitness and return to their seed beds with a three-second warm-up.</p><p>{motion?'Motion Hunt learns pursuit of moving targets. Stillness removes the target signal; physical contact remains lethal. Its training is separate from Survival.':'Survival learns pursuit of players. Its population and history are separate from Motion Hunt.'} This is NEAT-inspired learning. Older generations without recorded average fitness show “—”. Best generation uses the highest recorded completed fitness; ties keep the earliest generation. The record survives the 40-generation chart window. Older results already discarded before tracking began cannot be recovered.</p></details>
    {!!state?.training.events.length&&<details><summary>Training changes</summary><ol className="training-events">{[...state.training.events].reverse().map(event=><li key={event.branch}>Branch {event.branch} · {event.kind==='rollback'?'rollback':'import'} at gen {event.generation}, from source gen {event.sourceGeneration}</li>)}</ol></details>}
    <TrainingVault state={state} motion={motion} online={online}/>
  </aside></div>;
}
