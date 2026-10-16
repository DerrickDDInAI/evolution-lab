// A compact NEAT-inspired implementation: historical connection markings,
// feed-forward topology mutation, compatibility groups and fitter-parent crossover.
// This is not the Python neat package or a compatible genome file format.
export type Gene = { from: number; to: number; weight: number; enabled: boolean };
export type Node = { id: number; depth: number };
export type Genome = { nodes: Node[]; genes: Gene[]; fitness: number };
export type Evolution = { seed: number; nextNode: number; splits: Record<string, number> };
export const INPUTS = 11;
export function random(e: Evolution) { e.seed = (Math.imul(e.seed, 1664525) + 1013904223) >>> 0; return e.seed / 4294967296; }
const signed = (e: Evolution) => random(e) * 2 - 1;
export function createGenome(e: Evolution): Genome {
  return { nodes: [{id:11,depth:1},{id:12,depth:1}], genes: Array.from({length:22},(_,i)=>({from:i%11,to:11+Math.floor(i/11),weight:signed(e),enabled:true})), fitness:0 };
}
type ActivationNode = { id: number; incoming: Gene[] };
const plans = new WeakMap<Genome, ActivationNode[]>();
export function activate(g: Genome, inputs: number[]): number[] {
  let plan=plans.get(g);
  if(!plan){
    const incoming=new Map<number,Gene[]>();
    for(const gene of g.genes)if(gene.enabled){const list=incoming.get(gene.to)||[];list.push(gene);incoming.set(gene.to,list);}
    plan=[...g.nodes].sort((a,b)=>a.depth-b.depth).map(n=>({id:n.id,incoming:incoming.get(n.id)||[]}));
    plans.set(g,plan);
  }
  const values:Record<number,number>={};
  for(let i=0;i<inputs.length;i++)values[i]=inputs[i];
  for(const node of plan){let sum=0;for(const gene of node.incoming)sum+=(values[gene.from]||0)*gene.weight;values[node.id]=Math.tanh(sum);}
  return [values[11]||0,values[12]||0];
}
export function mutate(g: Genome,e: Evolution) {
  plans.delete(g);
  g.fitness=0;
  for(const c of g.genes) if(random(e)<.8) c.weight=Math.max(-5,Math.min(5,c.weight+signed(e)*.35));
  if(random(e)<.18 && g.nodes.length<14) {
    const enabled=g.genes.filter(c=>c.enabled);
    const c=enabled[Math.floor(random(e)*enabled.length)];
    if(c) {
      const key=`${c.from}:${c.to}`;
      const id=e.splits[key]??(e.splits[key]=e.nextNode++);
      if(!g.nodes.some(n=>n.id===id)) {
        c.enabled=false;
        const depth=((g.nodes.find(n=>n.id===c.from)?.depth||0)+g.nodes.find(n=>n.id===c.to)!.depth)/2;
        g.nodes.push({id,depth}); g.genes.push({from:c.from,to:id,weight:1,enabled:true},{from:id,to:c.to,weight:c.weight,enabled:true});
      }
    }
  }
  if(random(e)<.25) {
    const sources=[...Array.from({length:11},(_,id)=>({id,depth:0})),...g.nodes];
    const from=sources[Math.floor(random(e)*sources.length)],to=g.nodes[Math.floor(random(e)*g.nodes.length)];
    if(from.depth<to.depth && !g.genes.some(c=>c.from===from.id&&c.to===to.id)) g.genes.push({from:from.id,to:to.id,weight:signed(e),enabled:true});
  }
  return g;
}
function distance(a: Genome,b: Genome) {
  const matches=new Map(b.genes.map(c=>[`${c.from}:${c.to}`,c]));let disjoint=0,weight=0,shared=0;
  for(const c of a.genes){const d=matches.get(`${c.from}:${c.to}`);if(d){weight+=Math.abs(c.weight-d.weight);shared++;}else disjoint++;}
  disjoint+=b.genes.length-shared;
  return disjoint/Math.max(a.genes.length,b.genes.length)+.5*weight/Math.max(shared,1);
}
export function breed(genomes: Genome[], e: Evolution) {
  const sorted=[...genomes].sort((a,b)=>b.fitness-a.fitness),groups: Genome[][]=[];
  for(const g of sorted){const group=groups.find(s=>distance(g,s[0])<.65);if(group)group.push(g);else groups.push([g]);}
  const minimum=Math.min(...sorted.map(g=>g.fitness));
  const weights=groups.map(s=>s.reduce((sum,g)=>sum+g.fitness-minimum+1,0)/s.length);
  const pickGroup=()=>{let r=random(e)*weights.reduce((a,b)=>a+b,0);return groups[weights.findIndex(w=>(r-=w)<=0)]||groups[0];};
  const next=sorted.slice(0,2).map(g=>({...structuredClone(g),fitness:0}));
  while(next.length<genomes.length){
    const group=pickGroup(), pool=group.slice(0,Math.max(1,Math.ceil(group.length/2)));
    let a=pool[Math.floor(random(e)*pool.length)],b=pool[Math.floor(random(e)*pool.length)];
    if(b.fitness>a.fitness)[a,b]=[b,a];
    const child=structuredClone(a);
    for(const c of child.genes){const other=b.genes.find(d=>d.from===c.from&&d.to===c.to);if(other&&random(e)<.5)c.weight=other.weight;}
    next.push(mutate(child,e));
  }
  return {genomes:next,species:groups.length,best:structuredClone(sorted[0])};
}
