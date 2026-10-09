// Catalogue bytes must come from the immutable Git commit, never a platform's
// checkout line-ending conversion. No repository hooks or downloaded code run.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { ROOT } from './lib.mjs'

export function gitPackReader(commit, repo = ROOT) {
  if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Catalogue resource commit must be a complete Git SHA')
  const git = args => execFileSync('git', args, { cwd: repo, maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
  const rows = git(['ls-tree', '-rz', commit, '--', 'packs/']).toString('utf8').split('\0').filter(Boolean)
  const packs = new Map(), cache = new Map()
  for (const row of rows) {
    const match = /^(100644|100755) blob ([a-f0-9]{40})\tpacks\/([^/]+)\/(.+)$/.exec(row)
    if (!match) throw new Error('Catalogue contains a non-regular pack entry')
    const [, , blob, id, path] = match
    if (!packs.has(id)) packs.set(id, new Map())
    packs.get(id).set(path, blob)
  }
  const read = (id, path) => {
    const blob = packs.get(id)?.get(path)
    if (!blob) throw new Error('Missing immutable pack file: ' + id + '/' + path)
    if (!cache.has(blob)) cache.set(blob, git(['cat-file', 'blob', blob]))
    return cache.get(blob)
  }
  return {
    ids: () => [...packs.keys()].sort(),
    files: id => [...packs.get(id).keys()].sort().map(path => {
      const bytes = read(id, path)
      return { path, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
    }),
    readBytes: id => path => read(id, path),
    readText: id => path => read(id, path).toString('utf8'),
  }
}
