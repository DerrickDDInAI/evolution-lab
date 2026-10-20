import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const base = process.env.ARENA_TEST_URL || 'http://127.0.0.1:5173';
const url = new URL(base);
assert.ok(
  url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname)
    && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash,
  'Integration fixtures require an HTTP loopback origin and disposable local database.',
);

const cwd = fileURLToPath(new URL('../', import.meta.url));
const env = { ...process.env, ARENA_TEST_URL: url.origin, ARENA_TEST_DEATH: '1' };
console.log('Running sequential fixtures against', url.origin, '(local arena and scores will change).');
for (const name of ['visible-contact', 'contact-respawn', 'multiplayer', 'network-lag']) {
  const result = spawnSync(process.execPath, [`tests/${name}.mjs`], { cwd, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
