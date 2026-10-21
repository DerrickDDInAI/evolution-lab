/** Public training summaries only. Fitness is an observed reward, not an evaluation score. */
export type TrainingSample = {generation:number;fitness:number;tags:number;meanFitness?:number;branch?:number};
// Earliest generation wins tied fitness; a saved record survives the 40-result window.
export function bestCompletedGeneration(history:TrainingSample[],record:TrainingSample|null=null):TrainingSample|null{
  return history.reduce<TrainingSample|null>((best,h)=>!best||h.fitness>best.fitness||(h.fitness===best.fitness&&h.generation<best.generation)?h:best,record);
}
type TrainingBot = {id:number;fitness:number;tags:number};
export function trainingMetrics(history:TrainingSample[],bots:TrainingBot[],round:number,record:TrainingSample|null=null){
  const latest=history.at(-1),previous=history.at(-2);
  const average=bots.length?bots.reduce((sum,b)=>sum+b.fitness,0)/bots.length:null;
  const best=bots.length?Math.max(...bots.map(b=>b.fitness)):null;
  const captures=bots.reduce((sum,b)=>sum+b.tags,0);
  return {latest,previous,average,best,captures,bestGeneration:bestCompletedGeneration(history,record),
    change:latest&&previous&&(latest.branch||1)===(previous.branch||1)?latest.fitness-previous.fitness:null,
    capturesPerMinute:latest&&round>0?latest.tags*60/round:null,
    leaders:[...bots].sort((a,b)=>b.fitness-a.fitness||a.id-b.id).slice(0,3)};
}
export function fitnessPlot(history:TrainingSample[]){
  const values=history.flatMap(h=>h.meanFitness==null?[h.fitness]:[h.fitness,h.meanFitness]);
  const min=Math.min(0,...values),max=Math.max(1,...values);
  const x=(i:number)=>12+i/Math.max(history.length-1,1)*256;
  const y=(v:number)=>80-(v-min)/(max-min)*64;
  return {min,max,best:history.map((h,i)=>`${x(i)},${y(h.fitness)}`).join(' '),
    // Separate segments prevent inventing average fitness across older, unmeasured generations.
    branches:history.map((h,i)=>({index:i,branch:h.branch||1})).filter((h,i)=>i>0&&h.branch!==(history[i-1].branch||1)).map(h=>({x:x(h.index),branch:h.branch})),
    bestSegments:history.reduce<string[]>((lines,h,i)=>{if(i===0||(h.branch||1)!==(history[i-1].branch||1))lines.push('');lines[lines.length-1]+=`${x(i)},${y(h.fitness)} `;return lines;},[]),
    means:history.reduce<string[]>((lines,h,i)=>{
      if(h.meanFitness!=null){if(i===0||history[i-1].meanFitness==null||(h.branch||1)!==(history[i-1].branch||1))lines.push('');lines[lines.length-1]+=`${x(i)},${y(h.meanFitness)} `;}
      return lines;
    },[]),points:history.map((h,i)=>({x:x(i),y:y(h.fitness)})),zero:y(0)};
}
