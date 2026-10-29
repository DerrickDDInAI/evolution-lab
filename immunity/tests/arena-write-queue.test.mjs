import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const out=path.resolve('.sites-runtime/queue-tests');mkdirSync(out,{recursive:true});
writeFileSync(path.join(out,'arena-write-queue.mjs'),ts.transpileModule(readFileSync('lib/arena-write-queue.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
const {withArenaWrite,createArenaWriteQueue,MAX_PENDING_ARENA_WRITES,ArenaWriteQueueFull}=await import(pathToFileURL(path.join(out,'arena-write-queue.mjs')));
const turn=()=>new Promise(resolve=>setImmediate(resolve));

test('twelve concurrent world writers commit once each without starving any player',async()=>{
  let revision=0;const commits=[];
  await Promise.all(Array.from({length:12},(_,player)=>withArenaWrite('twelve',async()=>{
    const readRevision=revision;await turn();
    assert.equal(revision,readRevision,'another local writer must not invalidate this turn');
    revision++;commits.push(player);
  })));
  assert.equal(revision,12);assert.deepEqual(commits,Array.from({length:12},(_,i)=>i));
});
test('a failed write releases its turn and another game mode proceeds independently',async()=>{
  let release;const blocked=new Promise(resolve=>{release=resolve;});
  const failure=withArenaWrite('survival-test',async()=>{await blocked;throw new Error('synthetic database failure');});
  const rejected=assert.rejects(failure,/synthetic database failure/);
  let nextRan=false;const next=withArenaWrite('survival-test',async()=>{nextRan=true;return 'recovered';});
  assert.equal(await withArenaWrite('motion-test',async()=>'independent'),'independent');
  assert.equal(nextRan,false);release();await rejected;assert.equal(await next,'recovered');
});
test('overload is bounded and the queue recovers after its pending writes finish',async()=>{
  let release;const blocked=new Promise(resolve=>{release=resolve;});
  const pending=Array.from({length:MAX_PENDING_ARENA_WRITES},(_,i)=>withArenaWrite('bounded',async()=>{if(i===0)await blocked;return i;}));
  await assert.rejects(withArenaWrite('bounded',async()=>-1),ArenaWriteQueueFull);
  release();assert.equal((await Promise.all(pending)).length,MAX_PENDING_ARENA_WRITES);
  assert.equal(await withArenaWrite('bounded',async()=>'available'),'available');
});
test('abandoned request leases expire without keeping the mode locked',async()=>{
  let time=0,release;
  const writer=createArenaWriteQueue({now:()=>time,wait:async()=>{time+=1000;}});
  const abandoned=writer('leases',()=>new Promise(resolve=>{release=resolve;}));
  time=11000;
  assert.equal(await writer('leases',async()=>'recovered'),'recovered');
  release('late result');await abandoned;
  assert.equal(await writer('leases',async()=>'still available'),'still available');
});
test('a waiting request has a bounded deadline and its rejection does not poison later writes',async()=>{
  let time=0,release;
  const writer=createArenaWriteQueue({now:()=>time,wait:async()=>{time+=1000;}});
  const first=writer('deadline',()=>new Promise(resolve=>{release=resolve;}));
  await assert.rejects(writer('deadline',async()=>'must not run'),ArenaWriteQueueFull);
  release();await first;
  assert.equal(await writer('deadline',async()=>'available'),'available');
});
