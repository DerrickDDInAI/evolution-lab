import {digest} from './domain.mjs';
import {breedPersistent, speciesState} from './species.mjs';
import {evaluate} from './scenarios.mjs';

export const VARIANTS = ['baseline', 'persistent-species', 'low-structure', 'weight-reset'];
export function initialPopulation(domain, seed, mode) {
  const evolution = {seed, nextNode:mode === 'motion' ? 14 : 13, splits:{}};
  const genomes = Array.from({length:24}, () => domain.evolution.createGenome(evolution, mode === 'motion' ? 3 : 2));
  return {evolution, genomes};
}

// Selection sees training only. Holdout is evaluated after all breeding ends.
// No candidate/variant is automatically promoted to the game or exported as an
// importable training artifact.
export function runArm(domain, {seed, mode, variant, generations, train, holdout, progress = () => {}}) {
  let {evolution, genomes} = initialPopulation(domain, seed, mode);
  const initialHash = digest(JSON.stringify({evolution, genomes}));
  const state = speciesState(), curve = [];
  const operators = domain.variants[variant === 'persistent-species' ? 'baseline' : variant];
  let initialChampion, champion;
  for (let generation = 0; generation <= generations; generation++) {
    for (const genome of genomes) genome.fitness = evaluate(domain, genome, train).fitness;
    champion = [...genomes].sort((a, b) => b.fitness - a.fitness)[0];
    if (generation === 0) initialChampion = structuredClone(champion);
    const sample = {generation, bestTrainingFitness:champion.fitness,
      meanTrainingFitness:genomes.reduce((sum, g) => sum + g.fitness, 0) / genomes.length,
      meanHiddenNodes:genomes.reduce((sum, g) => sum + g.nodes.length - (g.outputs ?? 2), 0) / genomes.length};
    curve.push(sample);
    if (generation % 5 === 0 || generation === generations) progress(sample);
    if (generation === generations) break;
    const result = variant === 'persistent-species'
      ? breedPersistent(genomes, evolution, state, operators)
      : operators.breed(genomes, evolution);
    sample.species = result.species;
    if (result.diagnostics) sample.speciesDetails = result.diagnostics;
    genomes = result.genomes;
  }
  const populationHash = digest(JSON.stringify({evolution, genomes}));
  return {seed, mode, variant, generations, initialHash, populationHash,
    initialHoldout:evaluate(domain, initialChampion, holdout, true),
    finalHoldout:evaluate(domain, champion, holdout, true), curve,
    champion:{hiddenNodes:champion.nodes.length - (champion.outputs ?? 2),
      connections:champion.genes.length, enabledConnections:champion.genes.filter(g => g.enabled).length}};
}

export function pairedComparisons(runs) {
  const rows = [];
  for (const mode of [...new Set(runs.map(r => r.mode))]) {
    for (const variant of VARIANTS.filter(v => v !== 'baseline')) {
      for (const metric of ['fitness', 'captureRate', 'rewardedCaptureRate', 'stationaryCaptureRate',
        'cappedCaptureSeconds', 'balancedAccuracy', 'movingRecall', 'stationaryFalsePositiveRate']) {
        const deltas = runs.filter(r => r.mode === mode && r.variant === variant).flatMap(r => {
          const baseline = runs.find(b => b.mode === mode && b.variant === 'baseline' && b.seed === r.seed);
          const a = r.finalHoldout[metric], b = baseline?.finalHoldout[metric];
          return typeof a === 'number' && typeof b === 'number' ? [{seed:r.seed, delta:a - b}] : [];
        });
        if (!deltas.length) continue;
        const values = deltas.map(d => d.delta).sort((a, b) => a - b);
        rows.push({mode, variant, metric, pairs:deltas.length, deltas,
          meanDelta:values.reduce((a, b) => a + b, 0) / values.length,
          medianDelta:(values[Math.floor((values.length - 1) / 2)] + values[Math.floor(values.length / 2)]) / 2,
          minDelta:values[0], maxDelta:values.at(-1),
          positive:values.filter(v => v > 1e-9).length, negative:values.filter(v => v < -1e-9).length});
      }
    }
  }
  return rows;
}
