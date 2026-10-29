import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {previewOptions} from '../scripts/start-preview.mjs';
const fakeRoot=path.join(tmpdir(),'preview-regression');

test('built preview actually disables the headless inspector, including legacy port zero',()=>{
  for(const args of [[],['--inspector-port','0'],['--port=5186','--log-level','warn']]){
    const options=previewOptions(args,fakeRoot);
    assert.equal(options.dev.inspector,false);
    assert.equal(options.dev.remote,false);
    assert.equal(options.dev.persist,path.join(fakeRoot,'.wrangler/state'));
    assert.equal(options.config,path.join(fakeRoot,'dist/server/wrangler.json'));
    assert.equal(options.dev.server.hostname,'127.0.0.1');
  }
});
test('interactive inspector is an explicit local opt-in',()=>{
  const options=previewOptions(['--inspect','--inspector-port=0','--port','5186'],fakeRoot);
  assert.deepEqual(options.dev.inspector,{hostname:'127.0.0.1',port:0});
  assert.equal(options.dev.server.port,5186);
});
test('built preview preserves local secret-file discovery without reading its contents',()=>{
  const root=mkdtempSync(path.join(tmpdir(),'immunity-preview-options-'));
  try{
    mkdirSync(path.join(root,'dist/server'),{recursive:true});
    assert.equal(previewOptions([],root).envFiles,undefined);
    const secrets=path.join(root,'.dev.vars');writeFileSync(secrets,'TEST_ONLY=synthetic\n');
    assert.deepEqual(previewOptions([],root).envFiles,[secrets]);
  }finally{rmSync(root,{recursive:true,force:true});}
});
test('invalid preview arguments cannot silently enable debugging or expose the listener',()=>{
  for(const args of [['--port'],['--port','-1'],['--port=65536'],['--log-level','invalid'],['--inspect=false'],['--ip','0.0.0.0'],['--remote']])assert.throws(()=>previewOptions(args,fakeRoot));
});
