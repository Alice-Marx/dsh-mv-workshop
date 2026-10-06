// Shared helpers for validate.mjs and build-index.mjs (Node 20+, no dependencies).
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

export const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
export const PACKS = join(ROOT, 'packs')

export function packIds() {
  try { return readdirSync(PACKS).filter(name => statSync(join(PACKS, name)).isDirectory()).sort() } catch { return [] }
}

/** Every file under packs/<id>/ as { path, size, sha256 } (hidden files included so the validator can reject them). */
export function packFiles(id) {
  const dir = join(PACKS, id), out = []
  const walk = d => {
    for (const name of readdirSync(d).sort()) {
      const full = join(d, name), st = statSync(full)
      if (st.isDirectory()) walk(full)
      else out.push({ path: relative(dir, full).split(sep).join('/'), size: st.size, sha256: createHash('sha256').update(readFileSync(full)).digest('hex') })
    }
  }
  walk(dir)
  return out
}

export const readPackText = id => path => readFileSync(join(PACKS, id, ...path.split('/')), 'utf8')
export const readPackBytes = id => path => readFileSync(join(PACKS, id, ...path.split('/')))
