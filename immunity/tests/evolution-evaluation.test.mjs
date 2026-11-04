import assert from 'node:assert/strict';
import test, {after} from 'node:test';
import {readFile} from 'node:fs/promises';
import {loadDomain, mutationSource} from '../scripts/evaluation/domain.mjs';
import {allocate, breedPersistent, speciesState} from '../scripts/evaluation/species.mjs';
import {scenarios, prepareSuite, episode, evaluate, summarizeEpisodes, suiteHash} from '../scripts/evaluation/scenarios.mjs';
import {initialPopulation, runArm, pairedComparisons, VARIANTS} from '../scripts/evaluation/experiment.mjs';
import {parseOptions} from '../scripts/evaluate-evolution.mjs';
import {broadScenarios, BROAD_TEST_KINDS, EXTENDED_SEEDS, pairedInterval, extendedSummary} from '../scripts/evaluation/broad-survival.mjs';
import {command} from '../scripts/evaluation/scenarios.mjs';
import {extendedOptions, workerJob} from '../scripts/evaluate-survival-extended.mjs';
import {runExtendedJob} from '../scripts/evaluation/survival-worker.mjs';

const domain = await loadDomain();
after(() => domain.cleanup());
const rows = split => scenarios(split === 'train' ? 104729 : 130363, split, 2, domain.evolution.random);
const suite = (mode, split) => prepareSuite(domain, mode, rows(split));

test('evaluation rejects external targets, population imports, invalid or duplicate options', () => {
  for (const args of [['--url=https://evogoo.com'], ['--checkpoint=population.json'], ['--output=.wrangler'],
    ['--seconds=45'], ['--generations=NaN'], ['--seeds=1,1'], ['--seeds='], ['--modes=unknown'],
    ['--profile=smoke', '--profile=screen']]) assert.throws(() => parseOptions(args));
  assert.equal(parseOptions(['--profile=smoke']).generations, 2);
  assert.equal(parseOptions([]).seeds.length, 5);
});

test('unmodified isolated breeder reproduces production across successive seeded generations', () => {
  for (const mode of ['survival', 'motion']) {
    const a = initialPopulation(domain, 71, mode), b = structuredClone(a);
    for (let generation = 0; generation < 25; generation++) {
      a.genomes.forEach((g, i) => { g.fitness = Math.sin(i + generation) * 50; });
      b.genomes.forEach((g, i) => { g.fitness = Math.sin(i + generation) * 50; });
      a.genomes = domain.evolution.breed(a.genomes, a.evolution).genomes;
      b.genomes = domain.variants.baseline.breed(b.genomes, b.evolution).genomes;
      assert.deepEqual(a, b);
    }
  }
});

test('mutation experiments fail on changed anchors and leave baseline source byte-identical', async () => {
  const source = await readFile(new URL('../lib/evolution.ts', import.meta.url), 'utf8');
  assert.equal(mutationSource(source, 'baseline'), source);
  assert.equal(mutationSource(source, 'low-structure'), source.replace('random(e)<.18', 'random(e)<.03').replace('random(e)<.25', 'random(e)<.05'));
  assert.ok(mutationSource(source, 'weight-reset').includes('c.weight=random(e)<.1?signed(e):'));
  assert.throws(() => mutationSource(source.replace('random(e)<.18', 'random(e)<.2'), 'low-structure'));
  assert.throws(() => mutationSource(source, 'unknown'));
});

test('scenario suites are deterministic, disjoint and paired with mirrored starts', () => {
  assert.deepEqual(rows('train'), rows('train'));
  assert.notEqual(suiteHash(rows('train')), suiteHash(rows('holdout')));
  assert.ok(rows('holdout').some(s => s.kind === 'evade'));
  assert.ok(!rows('train').some(s => s.kind === 'evade'));
  const train = rows('train');
  for (let i = 0; i < train.length; i += 2) {
    assert.ok(Math.abs(train[i].bot.x + train[i + 1].bot.x - 6000) < 1e-8);
    assert.ok(Math.abs(train[i].bot.y + train[i + 1].bot.y - 6000) < 1e-8);
  }
});

test('physical capture, stationary penalties and no-capture censoring use actual arena rules', () => {
  for (const mode of ['survival', 'motion']) {
    const {genomes} = initialPopulation(domain, 71, mode);
    const genome = genomes[0];
    for (const gene of genome.genes) gene.weight = 0;
    const fixture = suite(mode, 'train')[0];
    Object.assign(fixture.arena.bots[0], fixture.scenario.player);
    const result = episode(domain, genome, fixture);
    assert.equal(result.captured, true);
    assert.ok(result.captureSeconds <= 1 / 30 + 1e-8);
    assert.equal(result.stationaryCapture, mode === 'motion');
    assert.ok(mode === 'motion' ? result.fitness === -25 : result.fitness >= 50);
    const distant = suite(mode, 'train')[0];
    const miss = episode(domain, genome, distant);
    assert.equal(miss.captureSeconds, null);
    assert.equal(miss.cappedCaptureSeconds, 2);
  }
});

test('motion detection reports real denominators and missing classes as null', () => {
  const genome = initialPopulation(domain, 71, 'motion').genomes[0];
  for (const gene of genome.genes) gene.weight = gene.to === 13 && gene.from === 10 ? 2 : 0;
  const result = episode(domain, genome, suite('motion', 'train')[0]);
  assert.ok(result.detection.fp > 0);
  assert.equal(result.detection.tp, 0);
  const metrics = summarizeEpisodes([result]);
  assert.equal(metrics.stationaryFalsePositiveRate, 1);
  assert.equal(metrics.movingRecall, null);
  assert.equal(metrics.balancedAccuracy, null);
});

test('evaluation is deterministic and does not mutate genomes or scenario templates', () => {
  const genome = initialPopulation(domain, 71, 'motion').genomes[0];
  const fixtures = suite('motion', 'train');
  const before = JSON.stringify({genome, fixtures});
  assert.deepEqual(evaluate(domain, genome, fixtures, true), evaluate(domain, genome, fixtures, true));
  assert.equal(JSON.stringify({genome, fixtures}), before);
});

test('all arms start identically and held-out observations cannot affect selection', () => {
  const args = {seed:71, mode:'motion', generations:2, train:suite('motion', 'train'), holdout:suite('motion', 'holdout')};
  const runs = VARIANTS.map(variant => runArm(domain, {...args, variant}));
  assert.equal(new Set(runs.map(r => r.initialHash)).size, 1);
  assert.ok(runs.every(r => JSON.stringify(r.initialHoldout) === JSON.stringify(runs[0].initialHoldout)));
  const alternate = suite('motion', 'train');
  for (const fixture of alternate) fixture.arena.bots[0].x += 200;
  const repeated = runArm(domain, {...args, variant:'persistent-species', holdout:alternate});
  assert.equal(repeated.populationHash, runs[1].populationHash);
  assert.deepEqual(repeated.curve, runs[1].curve);
  assert.notDeepEqual(repeated.finalHoldout, runs[1].finalHoldout);
});

test('species identities and progress persist; stagnant niches lose reproduction but champion survives', () => {
  const {genomes, evolution} = initialPopulation(domain, 123, 'survival');
  genomes.forEach((g, i) => { g.fitness = i < 12 ? 10 : 5; for (const c of g.genes) c.weight = i < 12 ? -3 : 3; });
  const before = structuredClone(genomes), state = speciesState();
  const operators = {random:domain.evolution.random, mutate:g => ({...g, fitness:0})};
  const first = breedPersistent(genomes, evolution, state, operators, 2);
  assert.equal(first.species, 2);
  assert.ok(first.diagnostics.every(d => d.offspring > 0));
  const ids = first.diagnostics.map(d => d.id);
  breedPersistent(genomes, evolution, state, operators, 2);
  const last = breedPersistent(genomes, evolution, state, operators, 2);
  assert.deepEqual(last.diagnostics.map(d => d.id), ids);
  assert.equal(last.diagnostics[1].offspring, 0);
  assert.equal(last.diagnostics[0].offspring, 22);
  assert.equal(last.genomes.length, 24);
  assert.deepEqual(genomes, before);
});

test('offspring allocation preserves the exact budget and deterministic ties', () => {
  assert.deepEqual(allocate([1, 1, 1], 5), [2, 2, 1]);
  assert.deepEqual(allocate([1, 2, 3], 0), [0, 0, 0]);
  for (let slots = 0; slots < 25; slots++) assert.equal(allocate([.01, 2, 30], slots).reduce((a, b) => a + b), slots);
});

test('paired comparisons match seeds, retain ties and omit unavailable detection rates', () => {
  const runs = [1, 2].flatMap(seed => [
    {seed, mode:'survival', variant:'baseline', finalHoldout:{fitness:seed * 10, balancedAccuracy:null}},
    {seed, mode:'survival', variant:'low-structure', finalHoldout:{fitness:seed * 10 + (seed === 1 ? 2 : 0), balancedAccuracy:null}},
  ]).reverse();
  const rows = pairedComparisons(runs);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].meanDelta, 1);
  assert.equal(rows[0].pairs, 2);
  assert.equal(rows[0].positive, 1);
});

test('extended protocol has new seeds, broader fresh suites, mirrored clear starts and novel held-out families', () => {
  const config = extendedOptions([]);
  assert.equal(config.generations, 100);
  assert.equal(config.seconds, 12);
  assert.equal(config.seeds.length, 12);
  assert.deepEqual(config.variants, ['baseline', 'persistent-species']);
  assert.ok(EXTENDED_SEEDS.every(s => ![71, 42719, 982451653, 20261031, 314159].includes(s)));
  for (const split of ['train', 'holdout']) {
    const seed = split === 'train' ? config.trainScenarioSeed : config.holdoutScenarioSeed;
    const broad = broadScenarios(seed, split, 12, domain.evolution.random);
    assert.equal(broad.length, split === 'train' ? 16 : 60);
    assert.deepEqual(broad, broadScenarios(seed, split, 12, domain.evolution.random));
    assert.equal(new Set(broad.map(s => s.id)).size, broad.length);
    assert.ok(split !== 'train' || broad.every(s => !['reverse', 'figure-eight'].includes(s.kind)));
    for (let i = 0; i < broad.length; i += 2) {
      const a = broad[i], b = broad[i + 1];
      assert.ok(Math.abs(a.bot.x + b.bot.x - a.player.x * 2) < 1e-8);
      assert.ok(Math.abs(a.bot.y + b.bot.y - a.player.y * 2) < 1e-8);
      assert.ok(domain.physics.bodyClear(a.bot, 13, a.obstacles));
      assert.ok(domain.physics.bodyClear(a.player, 16, a.obstacles));
      for (const p of [a.bot, a.player]) assert.ok(domain.physics.inside(p.x, p.y, 29));
    }
    if (split === 'holdout') for (const kind of BROAD_TEST_KINDS) {
      assert.deepEqual([...new Set(broad.filter(s => s.kind === kind).map(s => s.layout))], ['open', 'slalom', 'cluster']);
    }
  }
  for (const args of [['--url=https://evogoo.com'], ['--workers=5'], ['--workers=NaN'], ['--profile=custom'],
    ['--workers=2', '--workers=3'], ['--seeds=71']]) assert.throws(() => extendedOptions(args));
});

test('new opponent policies reverse direction and alternate sprint demand; orbit stays finite', () => {
  const scenario = {heading:0, turn:.6, offset:0, player:{x:3000, y:3000}};
  const player = {x:3000, y:3000}, bot = {x:2700, y:3000};
  assert.equal(command({...scenario, kind:'reverse'}, 0, player, bot).x, 1);
  assert.equal(command({...scenario, kind:'reverse'}, 2, player, bot).x, -1);
  assert.equal(command({...scenario, kind:'burst'}, .5, player, bot).dash, true);
  assert.equal(command({...scenario, kind:'burst'}, 2, player, bot).dash, false);
  for (const kind of ['orbit', 'figure-eight']) {
    for (const t of [0, 1, 4, 12]) {
      const c = command({...scenario, kind}, t, player, bot);
      assert.ok(Number.isFinite(c.x) && Number.isFinite(c.y));
      assert.ok(Math.abs(Math.hypot(c.x, c.y) - 1) < 1e-9);
    }
  }
});

test('CPU worker and serial evaluation agree exactly; source drift is refused', async () => {
  const trainRows = broadScenarios(49979687, 'train', 2, domain.evolution.random).slice(0, 2);
  const holdoutRows = broadScenarios(67867967, 'holdout', 2, domain.evolution.random).slice(-2);
  for (const variant of ['baseline', 'persistent-species']) {
    const job = {seed:101, variant, generations:2, trainRows, holdoutRows};
    const serial = await runExtendedJob(job);
    const parallel = await workerJob({...job, sources:serial.sources});
    assert.deepEqual(parallel.run, serial.run);
  }
  await assert.rejects(workerJob({seed:101, variant:'baseline', generations:1, trainRows, holdoutRows, sources:{bad:'hash'}}), /Source changed/);
});

test('paired seed intervals are deterministic, retain exact constant differences and detect exclusions', () => {
  assert.deepEqual(pairedInterval([2, 2, 2], domain.evolution.random, 1000), {
    method:'paired seed bootstrap percentile', samples:1000, resamplingSeed:32452843, lower:2, upper:2});
  assert.deepEqual(pairedInterval([-1, 0, 2], domain.evolution.random), pairedInterval([-1, 0, 2], domain.evolution.random));
  assert.throws(() => pairedInterval([], domain.evolution.random));
  const runs = [101, 211].flatMap(seed => ['baseline', 'persistent-species'].map(variant => {
    const metrics = {captureRate:variant === 'baseline' ? .25 : .5, cappedCaptureSeconds:10, fitness:20};
    return {seed, variant, initialHash:'same', finalHoldout:{...metrics,
      byOpponent:Object.fromEntries(BROAD_TEST_KINDS.map(k => [k, metrics]))},
      curve:[{generation:20, species:2, speciesDetails:[{id:3, stagnantFor:16, excludedForStagnation:true}]}]};
  }));
  const summary = extendedSummary(runs, domain.evolution.random);
  assert.equal(summary.overall[0].meanDelta, .25);
  assert.equal(summary.overall[0].positive, 2);
  assert.equal(summary.stagnation[0].uniqueExcludedSpecies, 1);
  assert.equal(summary.stagnation[0].firstExclusionGeneration, 20);
});
