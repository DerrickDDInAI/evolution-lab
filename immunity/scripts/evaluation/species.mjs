// Offline species-management experiment. Production evolution.ts stays unchanged.
export function compatibility(a, b) {
  const matches = new Map(b.genes.map(c => [`${c.from}:${c.to}`, c]));
  let disjoint = 0, weight = 0, shared = 0;
  for (const c of a.genes) {
    const d = matches.get(`${c.from}:${c.to}`);
    if (d) { weight += Math.abs(c.weight - d.weight); shared++; }
    else disjoint++;
  }
  disjoint += b.genes.length - shared;
  return disjoint / Math.max(a.genes.length, b.genes.length) + .5 * weight / Math.max(shared, 1);
}

export const speciesState = () => ({nextId:1, generation:0, species:[]});

// Largest-remainder allocation avoids losing small niches merely through repeated
// roulette draws. It does not guarantee survival to every low-fitness species.
export function allocate(weights, slots) {
  const total = weights.reduce((a, b) => a + b, 0);
  const exact = weights.map(w => slots * w / total);
  const result = exact.map(Math.floor);
  const order = exact.map((n, i) => ({i, fraction:n - result[i]}))
    .sort((a, b) => b.fraction - a.fraction || a.i - b.i);
  const left = slots - result.reduce((a, b) => a + b, 0);
  for (let i = 0; i < left; i++) result[order[i].i]++;
  return result;
}

export function breedPersistent(genomes, evolution, state, operators, patience = 15) {
  const {random, mutate} = operators;
  state.generation++;
  const sorted = [...genomes].sort((a, b) => b.fitness - a.fitness);
  for (const species of state.species) species.members = [];
  for (const genome of sorted) {
    let species = state.species.find(s => compatibility(genome, s.representative) < .65);
    if (!species) {
      species = {id:state.nextId++, representative:structuredClone(genome), best:null,
        improved:state.generation, members:[]};
      state.species.push(species);
    }
    species.members.push(genome);
  }
  state.species = state.species.filter(s => s.members.length);
  for (const s of state.species) {
    if (s.best === null || s.members[0].fitness > s.best + 1e-9) {
      s.best = s.members[0].fitness;
      s.improved = state.generation;
    }
  }
  // Protect the current global champion's species, including all-stagnant cases.
  const eligible = state.species.filter(s => s.members.includes(sorted[0]) || state.generation - s.improved < patience);
  const minimum = sorted.at(-1).fitness;
  const weights = eligible.map(s => s.members.reduce((sum, g) => sum + g.fitness - minimum + 1, 0) / s.members.length);
  // Keep the same two global elites as baseline: this experiment changes species
  // persistence, allocation and stagnation, not mutation/crossover or elitism.
  const next = sorted.slice(0, 2).map(g => ({...structuredClone(g), fitness:0}));
  const quotas = allocate(weights, genomes.length - next.length);
  eligible.forEach((s, index) => {
    const pool = s.members.slice(0, Math.max(1, Math.ceil(s.members.length / 2)));
    for (let i = 0; i < quotas[index]; i++) {
      let a = pool[Math.floor(random(evolution) * pool.length)];
      let b = pool[Math.floor(random(evolution) * pool.length)];
      if (b.fitness > a.fitness) [a, b] = [b, a];
      const child = structuredClone(a);
      for (const c of child.genes) {
        const other = b.genes.find(d => d.from === c.from && d.to === c.to);
        if (other && random(evolution) < .5) c.weight = other.weight;
      }
      next.push(mutate(child, evolution));
    }
  });
  const diagnostics = state.species.map(s => ({id:s.id, size:s.members.length,
    best:s.best, stagnantFor:state.generation - s.improved,
    excludedForStagnation:!eligible.includes(s),
    offspring:eligible.includes(s) ? quotas[eligible.indexOf(s)] : 0}));
  for (const s of state.species) {
    s.representative = structuredClone(s.members[Math.floor(random(evolution) * s.members.length)]);
    delete s.members;
  }
  return {genomes:next, species:state.species.length, diagnostics};
}
