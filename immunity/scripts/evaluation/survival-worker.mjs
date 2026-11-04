import {isMainThread, parentPort, workerData} from 'node:worker_threads';
import {readFile} from 'node:fs/promises';
import {loadDomain, digest} from './domain.mjs';
import {prepareSuite} from './scenarios.mjs';
import {runArm} from './experiment.mjs';

export async function extendedSourceHashes(domain) {
  const hashes = {...domain.hashes};
  for (const name of Object.keys(hashes).filter(name => name.startsWith('lib/'))) {
    hashes[name] = digest(await readFile(new URL(`../../${name}`, import.meta.url)));
  }
  for (const name of ['../evaluate-survival-extended.mjs', 'domain.mjs', 'species.mjs',
    'scenarios.mjs', 'experiment.mjs', 'broad-survival.mjs', 'survival-worker.mjs']) {
    hashes[`scripts/${name.startsWith('../') ? name.slice(3) : `evaluation/${name}`}`]
      = digest(await readFile(new URL(name, import.meta.url)));
  }
  return hashes;
}

export async function runExtendedJob(job, progress = () => {}) {
  const domain = await loadDomain();
  try {
    const sources = await extendedSourceHashes(domain);
    if (job.sources && JSON.stringify(sources) !== JSON.stringify(job.sources)) throw new Error('Source changed after protocol was frozen');
    const train = prepareSuite(domain, 'survival', job.trainRows);
    const holdout = prepareSuite(domain, 'survival', job.holdoutRows);
    const run = runArm(domain, {seed:job.seed, mode:'survival', variant:job.variant,
      generations:job.generations, train, holdout, progress});
    return {run, sources};
  } finally { await domain.cleanup(); }
}

if (!isMainThread && workerData?.kind === 'immunity-survival-evaluation') {
  try {
    const result = await runExtendedJob(workerData.job, row => {
      if (row.generation % 20 === 0 || row.generation === workerData.job.generations) {
        parentPort.postMessage({type:'progress', row});
      }
    });
    parentPort.postMessage({type:'result', ...result});
  } catch (error) {
    parentPort.postMessage({type:'failure', error:error.stack ?? String(error)});
    process.exitCode = 1;
  }
}
