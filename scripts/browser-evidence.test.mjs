import test from 'node:test'
import assert from 'node:assert/strict'
import { verifyBrowserEvidence } from './browser-evidence.mjs'
const files = [{ path: 'scenes.js', size: 20, sha256: 'a'.repeat(64) }]
const options = { id: 'test-pack', version: '1.0.0', files }
const good = { format:'dsh-mv-browser-evidence',version:1,status:'passed',packId:'test-pack',packVersion:'1.0.0',browser:'Chromium',gpu:'real GPU',reportSha256:'b'.repeat(64),externalRequests:0,audioFiles:0,errors:0,limitsChecked:true,cleanupChecked:true,coverage:{shots:10,transitions:5,pause:3,seek:3},files }
test('maintainer evidence binds every file and version', () => {
  assert.deepEqual(verifyBrowserEvidence(good,options),[])
  assert.ok(verifyBrowserEvidence(good,{...options,version:'1.0.1'}).length)
  assert.ok(verifyBrowserEvidence(good,{...options,files:[{...files[0],sha256:'c'.repeat(64)}]}).length)
  assert.ok(verifyBrowserEvidence({...good,files:[]},options).length)
})
test('missing/incomplete/failed evidence cannot waive browser validation', () => {
  assert.ok(verifyBrowserEvidence(null,options).length)
  for (const update of [{status:'failed'},{externalRequests:1},{errors:1},{audioFiles:1},{cleanupChecked:false},{limitsChecked:false},{coverage:{shots:0}},{reportSha256:''}]) assert.ok(verifyBrowserEvidence({...good,...update},options).length)
})
