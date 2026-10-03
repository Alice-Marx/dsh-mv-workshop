#!/usr/bin/env node
// Copy the shared rule files from a dsh-mv-cli checkout (or an installed package) into scripts/vendor/.
import { copyFileSync } from 'node:fs'
import { join } from 'node:path'
const from = process.argv[2]
if (!from) { console.error('usage: node scripts/sync-vendor.mjs <dsh-mv-cli folder>'); process.exit(2) }
for (const f of ['mv-pack.mjs', 'mv-scene.mjs', 'mv-scene-host.mjs', 'mv-workshop.mjs']) {
  copyFileSync(join(from, '.dsh-plugin', 'shared', f), join('scripts', 'vendor', f))
  console.log('copied', f)
}
