// Isolated, fresh compilation of the actual domain code. No database or HTTP imports.
import {mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import ts from 'typescript';

export const digest = value => createHash('sha256').update(value).digest('hex');
const root = new URL('../../', import.meta.url);

function replaceOnce(source, from, to) {
  if (source.split(from).length !== 2) throw new Error(`Evolution source changed; review experimental patch: ${from}`);
  return source.replace(from, to);
}

// Patches are applied ONLY to temporary copies. Guarded anchors fail on source
// drift rather than silently comparing a different experiment or stale build.
export function mutationSource(source, variant) {
  if (variant === 'baseline') return source;
  if (variant === 'low-structure') {
    source = replaceOnce(source, 'random(e)<.18', 'random(e)<.03');
    return replaceOnce(source, 'random(e)<.25', 'random(e)<.05');
  }
  if (variant === 'weight-reset') {
    return replaceOnce(source,
      'c.weight=Math.max(-5,Math.min(5,c.weight+signed(e)*.35))',
      'c.weight=random(e)<.1?signed(e):Math.max(-5,Math.min(5,c.weight+signed(e)*.35))');
  }
  throw new Error(`Unknown mutation variant: ${variant}`);
}

export async function loadDomain() {
  const directory = await mkdtemp(path.join(tmpdir(), 'immunity-evaluation-'));
  const hashes = {}, seen = new Set();
  const cleanup = () => rm(directory, {recursive:true, force:true});
  try {
    async function compile(name) {
      if (seen.has(name)) return;
      seen.add(name);
      const source = await readFile(new URL(`lib/${name}.ts`, root), 'utf8');
      hashes[`lib/${name}.ts`] = digest(source);
      let code = ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.ES2022}}).outputText;
      const dependencies = [...code.matchAll(/from ['"]\.\/([\w-]+)['"]/g)].map(m => m[1]);
      code = code.replace(/(['"])(\.\/[\w-]+)\1/g, '$1$2.mjs$1');
      // training-checkpoints uses only zod as an external domain dependency.
      code = code.replace(/from ['"]zod['"]/, `from '${import.meta.resolve('zod')}'`);
      await writeFile(path.join(directory, `${name}.mjs`), code);
      for (const dep of dependencies) await compile(dep);
    }
    await compile('arena');
    const evolutionSource = await readFile(new URL('lib/evolution.ts', root), 'utf8');
    const variants = {};
    for (const name of ['baseline', 'low-structure', 'weight-reset']) {
      const source = mutationSource(evolutionSource, name);
      hashes[`experiment/${name}`] = digest(source);
      const code = ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.ES2022}}).outputText;
      await writeFile(path.join(directory, `${name}.mjs`), code);
      variants[name] = await import(pathToFileURL(path.join(directory, `${name}.mjs`)));
    }
    const modules = {};
    for (const name of ['arena', 'physics', 'evolution', 'motion-observation']) {
      modules[name] = await import(pathToFileURL(path.join(directory, `${name}.mjs`)));
    }
    return {...modules, variants, hashes, cleanup};
  } catch (error) {
    await cleanup();
    throw error;
  }
}
