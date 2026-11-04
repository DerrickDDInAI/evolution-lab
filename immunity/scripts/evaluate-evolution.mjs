// Offline only: accepts no URL, checkpoint, database or credential options.
import {mkdir, mkdtemp, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {loadDomain, digest} from './evaluation/domain.mjs';
import {scenarios, prepareSuite, suiteHash} from './evaluation/scenarios.mjs';
import {runArm, pairedComparisons, VARIANTS} from './evaluation/experiment.mjs';

export function parseOptions(args) {
  const options = {};
  for (const arg of args) {
    const match = /^--(profile|generations|seconds|seeds|modes)=(.+)$/.exec(arg);
    if (!match || options[match[1]] !== undefined) throw new Error(`Unknown/duplicate option: ${arg}`);
    options[match[1]] = match[2];
  }
  const profile = options.profile ?? 'screen';
  if (!['smoke', 'screen'].includes(profile)) throw new Error('Profile must be smoke or screen');
  const generations = Number(options.generations ?? (profile === 'smoke' ? 2 : 30));
  const seconds = Number(options.seconds ?? (profile === 'smoke' ? 2 : 8));
  const seeds = (options.seeds ?? (profile === 'smoke' ? '71' : '71,42719,982451653,20261031,314159')).split(',').map(Number);
  const modes = (options.modes ?? 'survival,motion').split(',');
  if (!Number.isInteger(generations) || generations < 1 || generations > 200) throw new Error('Generations must be 1–200');
  if (!Number.isInteger(seconds) || seconds < 2 || seconds > 20) throw new Error('Seconds must be 2–20, below the 45-second breeding boundary');
  if (!seeds.length || seeds.length > 20 || new Set(seeds).size !== seeds.length || seeds.some(n => !Number.isInteger(n) || n < 0 || n > 0xffffffff)) throw new Error('Use 1–20 distinct uint32 seeds');
  if (!modes.length || new Set(modes).size !== modes.length || modes.some(m => !['survival', 'motion'].includes(m))) throw new Error('Invalid modes');
  return {profile, generations, seconds, seeds, modes, variants:VARIANTS, population:24,
    trainScenarioSeed:104729, holdoutScenarioSeed:130363, timestep:1/30};
}

function markdown(report) {
  const lines = ['# Controlled evolution screen', '',
    `Protocol: ${report.protocol}. ${report.config.seeds.length} paired seeds; ${report.config.generations} breeding steps; ${report.config.seconds}-second episodes; 24 genomes.`, '',
    'Fresh synthetic populations only. No saved genomes or live training were read or modified.', '',
    '| Mode | Variant | Mean holdout fitness | Capture rate | Rewarded capture rate | Balanced detection accuracy |',
    '| --- | --- | ---: | ---: | ---: | ---: |'];
  const mean = (rows, key) => {
    const values = rows.map(r => r.finalHoldout[key]).filter(n => typeof n === 'number');
    return values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(4) : 'n/a';
  };
  for (const mode of report.config.modes) for (const variant of VARIANTS) {
    const rows = report.runs.filter(r => r.mode === mode && r.variant === variant);
    lines.push(`| ${mode} | ${variant} | ${mean(rows, 'fitness')} | ${mean(rows, 'captureRate')} | ${mean(rows, 'rewardedCaptureRate')} | ${mean(rows, 'balancedAccuracy')} |`);
  }
  lines.push('', '## Paired changes from baseline', '',
    '| Mode | Variant | Metric | Mean delta | Min / max delta | Positive / negative / tied seeds |',
    '| --- | --- | --- | ---: | --- | --- |');
  for (const r of report.comparisons) lines.push(`| ${r.mode} | ${r.variant} | ${r.metric} | ${r.meanDelta.toFixed(4)} | ${r.minDelta.toFixed(4)} / ${r.maxDelta.toFixed(4)} | ${r.positive} / ${r.negative} / ${r.pairs - r.positive - r.negative} |`);
  lines.push('', 'Deltas are variant minus baseline. Lower is better for stationary false positives, stationary captures, and (Survival) capped capture time. Other listed metrics generally favor higher values. Motion Hunt total capture rate/time are not standalone success criteria: catching stationary players is undesirable.', '',
    'Training uses stationary, line, turning and stop/go opponents. Holdout uses different scenario parameters plus unseen zigzag and reactive evasion with sprinting. Each opponent has paired mirrored starts. Final champions are selected only by training fitness; holdout is evaluated after breeding.', '',
    'One bot versus one scripted player; no spawn warm-up, extraction, network latency, visible-contact protocol, multi-bot competition or human opponents. Actual arena fitness, movement, collision and observations are reused. Episodes stop on authoritative physical capture. All metrics are synthetic. Detection samples within a run are correlated; seeds, not frames, are the comparison units. Capture time among successes is selection-biased; capped time assigns the full horizon to failures. Balanced accuracy is unavailable if either class has no observations. These results are exploratory, not proof of live improvement. No variant is automatically promoted.', '',
    'The species arm bundles persistent identities, offspring quotas and stagnation handling; it cannot attribute effects among those three mechanisms. Mutation arms are separate: low-structure changes only insertion probabilities; weight-reset changes only selected weight mutations. No combined arm.', '',
    'Exact configuration, source hashes, scenario definitions, initial/final population hashes, per-seed trajectories, opponent breakdowns and detection denominators are in report.json.', '');
  return lines.join('\n');
}

async function main() {
  const config = parseOptions(process.argv.slice(2));
  const domain = await loadDomain();
  try {
    const root = fileURLToPath(new URL('../', import.meta.url));
    const outputRoot = path.join(root, 'outputs/evolution-evaluation');
    await mkdir(outputRoot, {recursive:true});
    const directory = await mkdtemp(path.join(outputRoot, `${config.profile}-`));
    const trainRows = scenarios(config.trainScenarioSeed, 'train', config.seconds, domain.evolution.random);
    const holdoutRows = scenarios(config.holdoutScenarioSeed, 'holdout', config.seconds, domain.evolution.random);
    const sources = {...domain.hashes};
    for (const name of ['evaluate-evolution.mjs', 'evaluation/domain.mjs', 'evaluation/species.mjs', 'evaluation/scenarios.mjs', 'evaluation/experiment.mjs']) {
      sources[`scripts/${name}`] = digest(await readFile(new URL(name, import.meta.url)));
    }
    const report = {protocol:'immunity-controlled-evolution-v1', createdAt:new Date().toISOString(),
      node:process.version, config, sources, scenarios:{train:trainRows, holdout:holdoutRows},
      scenarioHashes:{train:suiteHash(trainRows), holdout:suiteHash(holdoutRows)}, runs:[]};
    await writeFile(path.join(directory, 'protocol.json'), JSON.stringify(report, null, 2));
    console.log(`Isolated evaluation output: ${directory}`);
    const start = performance.now();
    for (const mode of config.modes) {
      const train = prepareSuite(domain, mode, trainRows), holdout = prepareSuite(domain, mode, holdoutRows);
      for (const seed of config.seeds) for (const variant of VARIANTS) {
        const run = runArm(domain, {...config, seed, mode, variant, train, holdout,
          progress:row => console.log(`${mode} seed=${seed} ${variant} generation=${row.generation}/${config.generations} training=${row.bestTrainingFitness.toFixed(3)}`)});
        report.runs.push(run);
        await writeFile(path.join(directory, 'partial.json'), JSON.stringify(report, null, 2));
      }
    }
    report.elapsedSeconds = (performance.now() - start) / 1000;
    report.comparisons = pairedComparisons(report.runs);
    await writeFile(path.join(directory, 'report.json'), JSON.stringify(report, null, 2));
    await writeFile(path.join(directory, 'report.md'), markdown(report));
    console.log(`Completed ${report.runs.length} arms in ${report.elapsedSeconds.toFixed(1)}s: ${directory}/report.md`);
  } finally { await domain.cleanup(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
