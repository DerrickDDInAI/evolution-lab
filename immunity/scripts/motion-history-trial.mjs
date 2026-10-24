// Offline detector feasibility trial. No live arena, player records or deployed
// population are read or changed. Run npm test first to transpile domain modules.
import {activate,breed,createGenome,random} from '../.sites-runtime/tests/evolution.mjs';
import {observationInputs} from '../.sites-runtime/tests/motion-observation.mjs';
const rounds=Number(process.env.MOTION_TRIAL_GENERATIONS||200);
function cases(seed,count){
 const rng={seed},rows=[];
 for(let i=0;i<count;i++){
  const angle=random(rng)*Math.PI*2,speed=i%2?30+random(rng)*400:0;
  const x=2200+random(rng)*1600,y=2200+random(rng)*1600,dx=Math.cos(angle)*speed,dy=Math.sin(angle)*speed;
  const player={id:'sample',life:0,x,y},history={sample:{life:0,samples:[0,.1,.2].map(at=>({at,x:x-dx*(.2-at),y:y-dy*(.2-at)}))}};
  const bot={x:2200+random(rng)*1600,y:2200+random(rng)*1600};
  rows.push({inputs:observationInputs(bot,player,history,.2,{x:1800,y:1800,r:50}),label:speed?1:-1});
 }
 return rows;
}
function evaluate(genome,rows){
 let loss=0,tp=0,fp=0;
 for(const {inputs,label} of rows){const score=activate(genome,inputs)[2];loss+=(score-label)**2;if(score>0){if(label===1)tp++;else fp++;}}
 return {fitness:-loss/rows.length,accuracy:(tp+rows.length/2-fp)/rows.length,movingRecall:tp/(rows.length/2),stationaryFalsePositiveRate:fp/(rows.length/2)};
}
for(const seed of [71,42719,982451653]){
 const evolution={seed,nextNode:14,splits:{}},train=cases(seed+1,128),holdout=cases(seed+2,256);
 let population=Array.from({length:24},()=>createGenome(evolution,3));
 const rank=()=>{for(const g of population)g.fitness=evaluate(g,train).fitness;return [...population].sort((a,b)=>b.fitness-a.fitness)[0];};
 const baseline=evaluate(rank(),holdout);
 for(let generation=0;generation<rounds;generation++){rank();population=breed(population,evolution).genomes;}
 console.log(JSON.stringify({seed,generations:rounds,baseline,holdout:evaluate(rank(),holdout)}));
}
