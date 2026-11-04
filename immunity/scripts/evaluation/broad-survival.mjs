import {digest} from './domain.mjs';

export const EXTENDED_SEEDS = [101, 211, 307, 401, 503, 601, 701, 809, 907, 1009, 1103, 1201];
export const EXTENDED_VARIANTS = ['baseline', 'persistent-species'];
export const BROAD_TRAIN_KINDS = ['stationary', 'line', 'turn', 'stop-go', 'zigzag', 'evade', 'orbit', 'burst'];
export const BROAD_TEST_KINDS = [...BROAD_TRAIN_KINDS, 'reverse', 'figure-eight'];
export const LAYOUTS = ['open', 'slalom', 'cluster'];

// Deliberately different protocol/seeds from v1. Held-out rows never enter the
// training suite, and their extra behavior families are not used for selection.
export function broadScenarios(seed, split, seconds, random) {
  const rng = {seed}, rows = [];
  const kinds = split === 'train' ? BROAD_TRAIN_KINDS : BROAD_TEST_KINDS;
  for (const [index, kind] of kinds.entries()) {
    const layouts = split === 'train' ? [LAYOUTS[index % LAYOUTS.length]] : LAYOUTS;
    for (const layout of layouts) {
      const center = {x:2600 + random(rng) * 800, y:2600 + random(rng) * 800};
      const approach = random(rng) * Math.PI * 2;
      const heading = random(rng) * Math.PI * 2;
      const gap = 180 + random(rng) * 420;
      const turn = .35 + random(rng) * 1.15;
      const offset = random(rng) * 2;
      const radius = 30 + random(rng) * 25;
      for (const mirror of [0, 1]) {
        const a = approach + mirror * Math.PI, x = Math.cos(a), y = Math.sin(a);
        const localRocks = layout === 'open' ? [] : layout === 'slalom'
          ? [[-.25 * gap, 90, radius], [-.65 * gap, -90, radius]]
          : [[-.45 * gap, 0, radius], [100, 160, radius + 5], [180, -130, radius]];
        const obstacles = localRocks.map(([along, side, r]) => ({
          x:center.x + x * along - y * side, y:center.y + y * along + x * side, r}));
        rows.push({id:`broad-${split}-${kind}-${layout}-${mirror}`, split, kind, layout,
          seconds, heading:heading + mirror * Math.PI, turn, offset,
          player:{...center}, bot:{x:center.x - x * gap, y:center.y - y * gap}, obstacles});
      }
    }
  }
  return rows;
}

export function suiteFingerprint(rows) { return digest(JSON.stringify(rows)); }

// Descriptive paired percentile intervals; resample independent evolutionary
// seeds, never correlated frames/episodes. RNG is separate from all training.
export function pairedInterval(deltas, random, samples = 10000) {
  if (!deltas.length) throw new Error('At least one pair required');
  const rng = {seed:32452843}, estimates = [];
  for (let sample = 0; sample < samples; sample++) {
    let sum = 0;
    for (let i = 0; i < deltas.length; i++) sum += deltas[Math.floor(random(rng) * deltas.length)];
    estimates.push(sum / deltas.length);
  }
  estimates.sort((a, b) => a - b);
  return {method:'paired seed bootstrap percentile', samples, resamplingSeed:32452843,
    lower:estimates[Math.floor(samples * .025)], upper:estimates[Math.ceil(samples * .975) - 1]};
}

export function extendedSummary(runs, random) {
  const baseline = runs.filter(r => r.variant === 'baseline').sort((a, b) => a.seed - b.seed);
  const metrics = ['captureRate', 'cappedCaptureSeconds', 'fitness'];
  const compare = select => metrics.map(metric => {
    const pairs = baseline.map(a => {
      const b = runs.find(r => r.seed === a.seed && r.variant === 'persistent-species');
      if (!b || b.initialHash !== a.initialHash) throw new Error('Missing/mismatched seed pair');
      const current = select(a)[metric], species = select(b)[metric];
      return {seed:a.seed, baseline:current, species, delta:species - current};
    });
    const deltas = pairs.map(p => p.delta);
    const mean = values => values.reduce((a, b) => a + b, 0) / values.length;
    return {metric, pairs, baselineMean:mean(pairs.map(p => p.baseline)), speciesMean:mean(pairs.map(p => p.species)),
      meanDelta:mean(deltas), interval95:pairedInterval(deltas, random),
      positive:deltas.filter(d => d > 1e-9).length, negative:deltas.filter(d => d < -1e-9).length,
      ties:deltas.filter(d => Math.abs(d) <= 1e-9).length};
  });
  const byOpponent = Object.fromEntries(BROAD_TEST_KINDS.map(kind => [kind, compare(r => r.finalHoldout.byOpponent[kind])]));
  const stagnation = runs.filter(r => r.variant === 'persistent-species').map(r => {
    const entries = r.curve.flatMap(c => (c.speciesDetails ?? []).map(s => ({generation:c.generation, ...s})));
    const excluded = entries.filter(s => s.excludedForStagnation);
    return {seed:r.seed, maxSpecies:Math.max(...r.curve.map(c => c.species ?? 0)),
      maximumStagnantAge:Math.max(...entries.map(s => s.stagnantFor)),
      excludedSpeciesGenerations:excluded.length, uniqueExcludedSpecies:new Set(excluded.map(s => s.id)).size,
      firstExclusionGeneration:excluded[0]?.generation ?? null};
  });
  return {overall:compare(r => r.finalHoldout), byOpponent, stagnation};
}
