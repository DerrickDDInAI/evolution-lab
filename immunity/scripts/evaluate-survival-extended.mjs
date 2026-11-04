// Bounded CPU workers, fresh synthetic worlds, no server/database/import options.
import {Worker} from 'node:worker_threads';
import {availableParallelism} from 'node:os';
import {mkdir, mkdtemp, writeFile, rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {loadDomain} from './evaluation/domain.mjs';
import {extendedSourceHashes} from './evaluation/survival-worker.mjs';
import {broadScenarios, suiteFingerprint, extendedSummary, EXTENDED_SEEDS, EXTENDED_VARIANTS} from './evaluation/broad-survival.mjs';

export function extendedOptions(args) {
  const options = {};
  for (const arg of args) {
    const match = /^--(profile|workers)=(.+)$/.exec(arg);
    if (!match || options[match[1]] !== undefined) throw new Error(`Unknown/duplicate option: ${arg}`);
    options[match[1]] = match[2];
  }
  const profile = options.profile ?? 'extended';
  if (!['extended', 'smoke'].includes(profile)) throw new Error('Use extended or smoke profile');
  const workers = Number(options.workers ?? Math.min(4, availableParallelism()));
  if (!Number.isInteger(workers) || workers < 1 || workers > 4) throw new Error('Workers must be 1–4');
  return {profile, workers, mode:'survival', population:24,
    seeds:profile === 'smoke' ? EXTENDED_SEEDS.slice(0, 2) : EXTENDED_SEEDS,
    generations:profile === 'smoke' ? 2 : 100, seconds:profile === 'smoke' ? 2 : 12,
    variants:EXTENDED_VARIANTS, trainScenarioSeed:49979687, holdoutScenarioSeed:67867967,
    timestep:1/30, primaryMetric:'captureRate', secondaryMetric:'cappedCaptureSeconds'};
}

export async function workerJob(job, progress = () => {}) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./evaluation/survival-worker.mjs', import.meta.url), {
      workerData:{kind:'immunity-survival-evaluation', job}});
    let result, failure;
    worker.on('message', message => {
      if (message.type === 'progress') progress(message.row);
      if (message.type === 'result') result = message;
      if (message.type === 'failure') failure = message.error;
    });
    worker.on('error', reject);
    worker.on('exit', code => {
      if (code || failure || !result) reject(new Error(failure ?? `Worker exited ${code} without a result`));
      else resolve(result);
    });
  });
}

function reportMarkdown(report) {
  const {config, summary} = report;
  const percent = n => `${(n * 100).toFixed(2)}%`;
  const value = (metric, n) => metric === 'captureRate' ? percent(n) : n.toFixed(3);
  const lines = ['# Extended Survival comparison', '',
    `${config.seeds.length} new paired seeds × ${config.generations} breeding steps; ${config.seconds}-second episodes; 24 genomes.`, '',
    '16 training scenarios; 60 fresh held-out scenarios. Same initial genomes and scenarios for both algorithms. Only training fitness selects champions. Mutation, crossover, elitism and population size are unchanged.', '',
    '| Metric | Current algorithm | Persistent species | Paired change | 95% paired bootstrap interval |',
    '| --- | ---: | ---: | ---: | --- |'];
  for (const r of summary.overall) lines.push(`| ${r.metric} | ${value(r.metric, r.baselineMean)} | ${value(r.metric, r.speciesMean)} | ${value(r.metric, r.meanDelta)} | ${value(r.metric, r.interval95.lower)} to ${value(r.metric, r.interval95.upper)} |`);
  lines.push('', 'Capture-rate changes are percentage points. Lower capped capture time is better; failures receive the full episode horizon. Higher fitness is diagnostic and is not the primary outcome. Intervals resample seed pairs 10,000 times and are conditional on this fixed synthetic test suite.', '',
    '| Seed | Current capture rate | Species capture rate | Difference (points) |',
    '| --- | ---: | ---: | ---: |');
  for (const p of summary.overall[0].pairs) lines.push(`| ${p.seed} | ${percent(p.baseline)} | ${percent(p.species)} | ${(p.delta * 100).toFixed(2)} |`);
  lines.push('', '## Opponent breakdown', '',
    '| Opponent | Current capture rate | Species capture rate | Difference (points) |',
    '| --- | ---: | ---: | ---: |');
  for (const [kind, rows] of Object.entries(summary.byOpponent)) {
    const r = rows[0];
    lines.push(`| ${kind} | ${percent(r.baselineMean)} | ${percent(r.speciesMean)} | ${(r.meanDelta * 100).toFixed(2)} |`);
  }
  lines.push('', '## Stagnation exposure', '',
    '| Seed | Maximum species | Excluded species (unique) | Excluded species-generations | First exclusion after generation |',
    '| --- | ---: | ---: | ---: | ---: |');
  for (const r of summary.stagnation) lines.push(`| ${r.seed} | ${r.maxSpecies} | ${r.uniqueExcludedSpecies} | ${r.excludedSpeciesGenerations} | ${r.firstExclusionGeneration ?? 'none'} |`);
  lines.push('', 'Persistent species bundles identity/representatives, quotas and stagnation exclusion. Even when exclusions occur, this comparison cannot attribute the overall result to stagnation alone.', '',
    'The protocol and source hashes were frozen before training. The 12 seeds and both scenario seeds are new relative to the earlier screen. Training uses eight opponent families; held-out reversals and figure-eight movement are new. All ten held-out families have open, slalom and cluster layouts and mirrored starts. No tuning or stopping decision used held-out outcomes.', '',
    'These are one-bot/one-scripted-player simulations using actual game physics, observations and fitness. No warm-up, networking, visible-contact negotiation, human opponents, multi-bot competition or live learning. Results remain conditional on this suite; twelve seeds do not prove general superiority. No trained candidate is promoted or written to live storage.', '',
    'report.json includes full configuration, source/scenario hashes, every scenario, initial/final hashes, training trajectories, per-episode outcomes and per-opponent metrics. All runtime sources and stored genomes remain unchanged.', '');
  return lines.join('\n');
}

async function main() {
  const config = extendedOptions(process.argv.slice(2)), domain = await loadDomain();
  try {
    const root = fileURLToPath(new URL('../', import.meta.url));
    const outputRoot = path.join(root, 'outputs/evolution-evaluation');
    await mkdir(outputRoot, {recursive:true});
    const directory = await mkdtemp(path.join(outputRoot, `survival-${config.profile}-`));
    const trainRows = broadScenarios(config.trainScenarioSeed, 'train', config.seconds, domain.evolution.random);
    const holdoutRows = broadScenarios(config.holdoutScenarioSeed, 'holdout', config.seconds, domain.evolution.random);
    const sources = await extendedSourceHashes(domain);
    const report = {protocol:'immunity-survival-extended-v2', createdAt:new Date().toISOString(), node:process.version,
      config, sources, scenarios:{train:trainRows, holdout:holdoutRows},
      scenarioHashes:{train:suiteFingerprint(trainRows), holdout:suiteFingerprint(holdoutRows)}, runs:[]};
    await writeFile(path.join(directory, 'protocol.json'), JSON.stringify(report, null, 2));
    console.log(`Frozen protocol: ${directory}/protocol.json`);
    const jobs = config.seeds.flatMap(seed => config.variants.map(variant => ({seed, variant,
      generations:config.generations, trainRows, holdoutRows, sources})));
    let cursor = 0, failure;
    const start = performance.now();
    await Promise.all(Array.from({length:config.workers}, async () => {
      while (cursor < jobs.length && !failure) {
        const job = jobs[cursor++];
        try {
          const result = await workerJob(job, row => console.log(
            `seed=${job.seed} ${job.variant} generation=${row.generation}/${config.generations} training=${row.bestTrainingFitness.toFixed(3)}`));
          report.runs.push(result.run);
          await writeFile(path.join(directory, `seed-${job.seed}-${job.variant}.json`), JSON.stringify(result.run, null, 2));
          console.log(`Completed ${report.runs.length}/${jobs.length} arms`);
        } catch (error) { failure = error; }
      }
    }));
    if (failure) throw failure;
    const after = await extendedSourceHashes(domain);
    // Domain hashes are independently re-read in each worker. Runner sources
    // are also re-read here so edits during the final worker cannot pass silently.
    if (JSON.stringify(after) !== JSON.stringify(sources)) throw new Error('Runner source changed during evaluation');
    report.runs.sort((a, b) => a.seed - b.seed || config.variants.indexOf(a.variant) - config.variants.indexOf(b.variant));
    report.elapsedSeconds = (performance.now() - start) / 1000;
    report.summary = extendedSummary(report.runs, domain.evolution.random);
    await writeFile(path.join(directory, 'report.json.tmp'), JSON.stringify(report, null, 2));
    await rename(path.join(directory, 'report.json.tmp'), path.join(directory, 'report.json'));
    await writeFile(path.join(directory, 'report.md'), reportMarkdown(report));
    console.log(`Complete in ${report.elapsedSeconds.toFixed(1)}s: ${directory}/report.md`);
  } finally { await domain.cleanup(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
