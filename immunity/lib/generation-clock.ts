// Only active simulation time counts; an empty arena pauses the generation.
export function generationClock(state:{round:number;elapsed:number;simulationTime:number;players:{phase:string}[];bots:{spawnWait?:number}[]}|null,now:number){
  const running=!!state?.players.some(p=>p.phase==='arena');
  const ahead=running?Math.max(0,(now-(state?.simulationTime??now))/1000):0;
  const round=state?.round??45,elapsed=Math.min(round,(state?.elapsed??0)+ahead);
  const warming=state?.bots.filter(b=>(b.spawnWait??0)>0)??[];
  const warmup=Math.max(0,...warming.map(b=>(b.spawnWait??0)-ahead));
  return {running,remaining:Math.max(0,Math.ceil(round-elapsed)),progress:elapsed/round*100,warming:warming.length,warmup:Math.ceil(warmup)};
}
