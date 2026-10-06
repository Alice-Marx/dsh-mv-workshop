#!/usr/bin/env node
// Build index.json (the catalogue the dsh-mv plugin downloads) from packs/. Only packs that pass
// validation are listed. Each file has its size and sha256; the plugin downloads files from
// raw.githubusercontent.com/<repo>/<commit>/packs/<id>/<path> and checks them against this index.
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { WORKSHOP_INDEX_FORMAT, WORKSHOP_REPO, validateWorkshopPack } from './vendor/mv-workshop.mjs'
import { ROOT, packFiles, packIds, readPackText, readPackBytes } from './lib.mjs'

const git = (...a) => { try { return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim() } catch { return '' } }
const commit = process.env.INDEX_COMMIT || git('rev-parse', 'HEAD') || 'main'
const packs = []
for (const id of packIds()) {
  const files = packFiles(id)
  const result = await validateWorkshopPack({ id, files, readText: readPackText(id), readBytes: readPackBytes(id) })
  if (result.errors.length) { console.log(`skip packs/${id}: ${result.errors[0]}`); continue }
  const updated = git('log', '-1', '--format=%cI', '--', `packs/${id}`) || new Date().toISOString()
  const { meta } = result
  packs.push({ ...meta, homepage: meta.homepage ?? undefined, updated, files: files.map(f => ({ path: f.path, size: f.size, sha256: f.sha256 })) })
}
packs.sort((a, b) => b.updated.localeCompare(a.updated))
const index = { format: WORKSHOP_INDEX_FORMAT, version: 1, repo: WORKSHOP_REPO, commit, generated: new Date().toISOString(), packs }
writeFileSync(join(ROOT, 'index.json'), `${JSON.stringify(index, null, 1)}\n`)
console.log(`index.json: ${packs.length} pack(s) at ${commit.slice(0, 12)}`)
