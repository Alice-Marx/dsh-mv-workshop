import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { gitPackReader } from './git-pack-reader.mjs'

test('catalogue uses committed LF bytes, not a CRLF working copy', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-git-catalogue-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const git = args => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  git(['init', '-q'])
  await mkdir(join(dir, 'packs', 'example'), { recursive: true })
  await writeFile(join(dir, '.gitattributes'), 'packs/** text eol=lf\n')
  await writeFile(join(dir, 'packs', 'example', 'mv.json'), '{\r\n  "value": 1\r\n}\r\n')
  git(['add', '.'])
  git(['-c', 'user.name=QA', '-c', 'user.email=qa@example.invalid', 'commit', '-qm', 'fixture'])
  const source = gitPackReader(git(['rev-parse', 'HEAD']), dir)
  const expected = Buffer.from('{\n  "value": 1\n}\n')
  assert.deepEqual(source.ids(), ['example'])
  assert.deepEqual(source.readBytes('example')('mv.json'), expected)
  assert.deepEqual(source.files('example'), [{ path: 'mv.json', size: expected.length, sha256: createHash('sha256').update(expected).digest('hex') }])
  assert.throws(() => source.readBytes('example')('../secret'), /Missing immutable/)
  assert.throws(() => gitPackReader('main', dir), /complete Git SHA/)
})
