import {MOTION_RULES} from './motion-observation';
import {z} from 'zod';
import {mutate,type Genome} from './evolution';
import type {Arena} from './arena';
import type {GameMode} from './game-mode';

export const MAX_IMPORT_BYTES=512*1024;
export const TRAINING_RULES='immunity-pursuit-v1';
const id=z.number().int().min(0).max(10_000_000);
const genomeSchema=z.object({
  nodes:z.array(z.object({id:id.min(11),depth:z.number().finite().gt(0).max(1)}).strict()).min(2).max(15),
  genes:z.array(z.object({from:id,to:id.min(11),weight:z.number().finite().min(-5).max(5),enabled:z.boolean()}).strict()).max(512),
  fitness:z.number().finite().min(-1e12).max(1e12),outputs:z.literal(3).optional(),
}).strict();
const artifactSchema=z.object({
  format:z.literal('immunity-training-v2'),rules:z.enum([TRAINING_RULES,MOTION_RULES]),
  kind:z.enum(['champion','checkpoint']),mode:z.enum(['survival','motion']),
  generation:z.number().int().min(1).max(Number.MAX_SAFE_INTEGER-1),
  createdAt:z.number().int().nonnegative().max(8.64e15),
  species:z.number().int().min(1).max(24),
  genomes:z.array(genomeSchema).min(1).max(24),
  evolution:z.object({seed:z.number().int().min(0).max(0xffffffff),nextNode:id.min(13),splits:z.record(id.min(13))}).strict(),
}).strict();
export type TrainingArtifact=z.infer<typeof artifactSchema>;
export type TrainingEvent={branch:number;generation:number;sourceGeneration:number;kind:'import'|'rollback';at:number};
export type PendingTraining={id:string;kind:'import'|'rollback';artifact:TrainingArtifact;queuedAt:number};
export type TrainingState={branch:number;events:TrainingEvent[];pending:PendingTraining|null;checkpointGeneration:number|null;rollbackGeneration:number|null};
export type TrainingWrite={slot:'latest'|'rollback';artifact:TrainingArtifact};
export const emptyTraining=():TrainingState=>({branch:1,events:[],pending:null,checkpointGeneration:null,rollbackGeneration:null});

/** Validate and reconstruct only the supported training contract. Never deserialize executable code. */
export function parseTrainingArtifact(value:unknown,mode:GameMode):TrainingArtifact{
  const result=artifactSchema.safeParse(value);
  if(!result.success)throw new Error('Use an Immunity v2 model or checkpoint with compatible training rules.');
  const file=result.data;
  if(file.rules!==(mode==='motion'?MOTION_RULES:TRAINING_RULES))throw new Error('This model uses incompatible observations. Motion Hunt requires the history controller.');
  if(file.mode!==mode)throw new Error('This file belongs to the other game mode.');
  if(file.genomes.length!==(file.kind==='champion'?1:24))throw new Error('A checkpoint needs 24 bots; a champion file needs one.');
  let largest=12;
  for(const g of file.genomes){
    const outputs=mode==='motion'?3:2;
    if((g.outputs??2)!==outputs||g.nodes.length>outputs+12)throw new Error('Incompatible controller outputs.');
    const depths=new Map(Array.from({length:11},(_,i)=>[i,0]));
    for(const n of g.nodes){
      if(depths.has(n.id)||(n.id<11+outputs?n.depth!==1:n.depth>=1))throw new Error('Invalid or duplicate network nodes.');
      depths.set(n.id,n.depth);largest=Math.max(largest,n.id);
    }
    if(Array.from({length:outputs},(_,i)=>11+i).some(id=>!depths.has(id)))throw new Error('Movement and attention outputs are required.');
    const edges=new Set<string>();
    for(const gene of g.genes){
      const from=depths.get(gene.from),to=depths.get(gene.to),edge=`${gene.from}:${gene.to}`;
      if(from===undefined||to===undefined||from>=to||edges.has(edge))throw new Error('Network connections must be unique and feed forward.');
      edges.add(edge);
    }
  }
  const splits=Object.entries(file.evolution.splits),ids=new Set<number>();
  if(splits.length>16384)throw new Error('Evolution history is too large.');
  for(const [edge,node] of splits){
    if(!/^\d{1,8}:\d{1,8}$/.test(edge)||ids.has(node))throw new Error('Invalid evolution history.');
    const [from,to]=edge.split(':').map(Number);
    if(from===to||to<11||node===from||node===to)throw new Error('Invalid evolution split.');
    ids.add(node);largest=Math.max(largest,node,from,to);
  }
  if(file.evolution.nextNode<=largest)throw new Error('Evolution node identifiers would collide.');
  return file;
}

export function checkpoint(a:Arena,now:number):TrainingArtifact{
  return {format:'immunity-training-v2',rules:a.mode==='motion'?MOTION_RULES:TRAINING_RULES,kind:'checkpoint',mode:a.mode||'survival',generation:a.generation,createdAt:now,species:a.species,
    genomes:a.bots.map(b=>({...structuredClone(b.genome),fitness:0})),evolution:structuredClone(a.evolution)};
}
export function rememberBestModel(a:Arena,genome:Genome,now:number){
  if(a.bestGeneration?.generation===a.generation){
    a.bestModel={...checkpoint(a,now),kind:'champion',genomes:[structuredClone(genome)]};
  }
}
export function recoverBestModel(a:Arena){
  // Legacy worlds only retain the last champion: never claim it is an older best.
  if(!a.bestModel&&a.champion&&a.bestGeneration?.generation===a.generation-1&&a.champion.fitness===a.bestGeneration.fitness){
    a.bestModel={...checkpoint(a,a.time),generation:a.generation-1,kind:'champion',genomes:[structuredClone(a.champion)]};
  }
}
export function queueTraining(a:Arena,artifact:TrainingArtifact,kind:PendingTraining['kind'],id:string,now:number){
  a.training??=emptyTraining();
  if(a.training.pending)throw new Error('A training change is already queued. Cancel it first.');
  a.training.pending={id,kind,artifact:parseTrainingArtifact(artifact,a.mode||'survival'),queuedAt:now};
}
/** Called once after breeding, before spawning the next generation. Persist writes with the world CAS. */
export function trainingBoundary(a:Arena,now:number,writes:TrainingWrite[]){
  a.training??=emptyTraining();
  const pending=a.training.pending;
  if(pending){
    writes.push({slot:'rollback',artifact:checkpoint(a,now)});
    a.training.rollbackGeneration=a.generation;
    const file=pending.artifact;
    a.evolution=structuredClone(file.evolution);
    const genomes=file.kind==='checkpoint'?structuredClone(file.genomes):Array.from({length:24},(_,i)=>i===0?structuredClone(file.genomes[0]):mutate(structuredClone(file.genomes[0]),a.evolution));
    a.bots.forEach((b,i)=>{b.genome=genomes[i];b.genome.fitness=0;b.fitness=0;b.tags=0;});
    a.species=file.kind==='checkpoint'?file.species:1;
    a.training.branch++;
    a.training.events.push({branch:a.training.branch,generation:a.generation,sourceGeneration:file.generation,kind:pending.kind,at:now});
    a.training.events=a.training.events.slice(-40);
    a.training.pending=null;
    if(a.mode==='motion')a.motionHistory={};
  }
  writes.push({slot:'latest',artifact:checkpoint(a,now)});
  a.training.checkpointGeneration=a.generation;
}
export function trainingSummary(a:Arena){
  const t=a.training||emptyTraining();
  return {branch:t.branch,events:t.events,checkpointGeneration:t.checkpointGeneration,rollbackGeneration:t.rollbackGeneration,
    bestModelAvailable:!!a.bestModel,pending:t.pending?{id:t.pending.id,kind:t.pending.kind,sourceGeneration:t.pending.artifact.generation,queuedAt:t.pending.queuedAt}:null};
}
