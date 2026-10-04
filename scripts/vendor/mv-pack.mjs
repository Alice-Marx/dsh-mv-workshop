/**
 * "MV 包" (MV pack): a folder with an `mv.json` manifest describing one song —
 * metadata, the user's own audio / lyrics / spectrum files (paths relative to
 * the manifest folder) and how to render it on the panel's canvas (a built-in
 * renderer or the pack's own scene script).
 *
 * Pure data and validation, shared by the Host (which reads packs from disk),
 * the Desktop client and the tests. Nothing here touches
 * the file system.
 *
 * Format (version 1), see README "MV 包格式" and mv.schema.json:
 * {
 *   "$schema": "./mv.schema.json",
 *   "format": "dsh-mv-pack", "version": 1,
 *   "title": "…", "artist": "…", "album": "…", "credits": ["…"], "notice": "…",
 *   "duration": 211.9,
 *   "audio":    { "file": "song.mp3", "offset": 0 },
 *   "lyrics":   { "file": "lyrics.lrc", "offset": 0 },
 *   "spectrum": { "file": "spectrum.json" },
 *   "canvas":   { "renderer": "generic" | "dsh-pv" | "script", "script": "scenes.js", "fontSize": 14,
 *                 "output": "text" | "pixels", "size": [1280, 720],
 *                 "assets": { "timeline": ["data/timeline-1.json", …], "maid-left": "art/maid-left.webp" } }
 * }
 * canvas.assets (0.9.0) names the data and image files a built-in renderer
 * reads from the pack (dsh-pv: timeline, chat, band, maid-left, whale-*). A
 * list means JSON shards that are merged in order (arrays concatenated).
 * Since 0.9.1 scene scripts get them too: setup(info) receives info.assets
 * (JSON parsed and merged; images as ImageBitmap when the script paints pixels).
 * canvas.output "pixels" (0.9.1, renderer "script") makes the script paint
 * on a sandboxed 2D canvas of canvas.size [w, h] (default 1280 × 720):
 *   function paint(g, t, width, height, ctx) { g.fillRect(…) }
 * "world-execute-me" (the renderer bundled until 0.8.x) is still accepted and
 * plays with the generic renderer; the scenes now ship as a workshop pack.
 * A "terminal" section written for versions before 0.6.0 is accepted and
 * ignored (the loader reports a warning).
 */

import { normalizeSections } from './mv-scene.mjs'

export const MV_PACK_FORMAT = 'dsh-mv-pack'
export const MV_PACK_VERSION = 1
export const MV_PACK_MANIFEST = 'mv.json'
export const MV_PACK_SCHEMA_FILE = 'mv.schema.json'
export const MV_CANVAS_RENDERERS = Object.freeze(['generic', 'world-execute-me', 'dsh-pv', 'script'])
/** Pack files the panel may read (only through the pack's own manifest). */
export const MV_PACK_FILE_ROLES = Object.freeze(['audio', 'lyrics', 'spectrum', 'scene', 'timing', 'asset'])
/** Renderers the plugin itself implements (0.9.0 moved the world.execute(me) scenes to a workshop pack). */
export const MV_RENDERERS_BUILTIN = Object.freeze(['generic', 'dsh-pv', 'script'])
/** What a scene script draws: characters on the grid (render) or pixels on a 2D canvas (paint, 0.9.1). */
export const MV_SCENE_OUTPUTS = Object.freeze(['text', 'pixels'])
export const MV_PIXEL_LIMITS = Object.freeze({ minWidth: 160, minHeight: 90, maxWidth: 1920, maxHeight: 1080, defaultSize: Object.freeze([1280, 720]) })
export const MV_ASSET_EXTENSIONS = Object.freeze(['.json', '.webp', '.png'])
export const MV_ASSET_NAME = /^[a-z0-9][a-z0-9-]{0,39}$/
export const MV_LYRICS_EXTENSIONS = Object.freeze(['.lrc', '.srt', '.vtt', '.json', '.txt'])

export const MV_PACK_LIMITS = Object.freeze({
  manifestBytes: 256 * 1024,
  textFileBytes: 8 * 1024 * 1024,
  sceneBytes: 256 * 1024,
  audioBytes: 1024 * 1024 * 1024,
  readChunkBytes: 512 * 1024,
  maxCredits: 50,
  maxTextChars: 4_000,
  maxShortChars: 200,
  maxPathChars: 1_024,
  maxDuration: 36_000,
  maxOffset: 30,
  maxAssets: 32,
  maxAssetParts: 16,
  assetBytes: 8 * 1024 * 1024,
  recentPacks: 50, // library entries kept (0.8.2: was 8; the list view stays compact)
})

const TOP_KEYS = new Set(['$schema', 'format', 'version', 'title', 'artist', 'album', 'credits', 'notice', 'duration', 'audio', 'lyrics', 'spectrum', 'canvas', 'terminal'])

export class MvPackError extends Error {
  constructor(problems) {
    const list = Array.isArray(problems) ? problems : [String(problems)]
    super(list.join('\n'))
    this.name = 'MvPackError'
    this.problems = list
  }
}

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const extOf = path => { const name = basenameOf(path); const at = name.lastIndexOf('.'); return at > 0 ? name.slice(at).toLowerCase() : '' }
export const basenameOf = path => String(path).split(/[\\/]/).filter(Boolean).pop() ?? ''

/** Absolute path on Windows (drive or UNC) or POSIX. */
export function isAbsolutePackPath(value) {
  return typeof value === 'string' && (value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value) || /^\\\\[^\\]+\\[^\\]+/.test(value))
}

/**
 * A file reference inside the manifest: relative to the manifest folder (no
 * `..` segment, so a pack stays self-contained) or absolute.
 */
export function checkPackPath(value, subject, problems) {
  if (typeof value !== 'string' || !value.trim()) { problems.push(`${subject} 必须是非空字符串`); return undefined }
  const path = value.trim()
  if (path.length > MV_PACK_LIMITS.maxPathChars) { problems.push(`${subject} 过长`); return undefined }
  if (/[\0\r\n"<>|?*]/.test(path) || /[\u0000-\u001f]/.test(path)) { problems.push(`${subject} 含有路径中不允许的字符：${path}`); return undefined }
  if (isAbsolutePackPath(path)) return path
  if (/^[A-Za-z]:/.test(path) || path.startsWith('\\')) { problems.push(`${subject} 不是有效的相对或绝对路径：${path}`); return undefined }
  const parts = path.split(/[\\/]+/).filter(part => part && part !== '.')
  if (parts.includes('..')) { problems.push(`${subject} 的相对路径不能含 ..（请改用绝对路径）：${path}`); return undefined }
  if (!parts.length) { problems.push(`${subject} 不是文件路径：${path}`); return undefined }
  return parts.join('/')
}

function optionalText(source, key, max, problems, subject = key) {
  const value = source[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') { problems.push(`${subject} 必须是字符串`); return undefined }
  if (value.length > max) { problems.push(`${subject} 超过 ${max} 个字符`); return undefined }
  return value.trim() || undefined
}

function optionalNumber(source, key, min, max, problems, subject = key) {
  const value = source[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) { problems.push(`${subject} 必须是 ${min} 到 ${max} 之间的数字`); return undefined }
  return value
}

function unknownKeys(source, allowed, subject, problems) {
  for (const key of Object.keys(source)) if (!allowed.has(key) && !key.startsWith('x-')) problems.push(`${subject} 有未知字段 "${key}"（扩展字段请用 x- 前缀）`)
}

function mediaSection(source, key, problems, { offset = false } = {}) {
  const value = source[key]
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') return mediaSection({ [key]: { file: value } }, key, problems, { offset })
  if (!isObject(value)) { problems.push(`${key} 必须是 { "file": … } 对象或路径字符串`); return undefined }
  unknownKeys(value, new Set(offset ? ['file', 'offset'] : ['file']), key, problems)
  const file = checkPackPath(value.file, `${key}.file`, problems)
  const result = { file }
  if (offset) {
    const shift = optionalNumber(value, 'offset', -MV_PACK_LIMITS.maxOffset, MV_PACK_LIMITS.maxOffset, problems, `${key}.offset`)
    result.offset = shift ?? 0
  }
  return file === undefined ? undefined : result
}

/**
 * Validate a manifest (object or JSON text). Returns the normalised pack or
 * throws MvPackError listing every problem found.
 */
export function parseMvPack(input) {
  let data = input
  if (typeof input === 'string') {
    if (input.length > MV_PACK_LIMITS.manifestBytes) throw new MvPackError([`mv.json 超过 ${MV_PACK_LIMITS.manifestBytes / 1024} KB`])
    try { data = JSON.parse(input.replace(/^\uFEFF/, '')) } catch (error) { throw new MvPackError([`mv.json 不是有效的 JSON：${error.message}`]) }
  }
  if (!isObject(data)) throw new MvPackError(['mv.json 顶层必须是对象'])
  const problems = []
  unknownKeys(data, TOP_KEYS, 'mv.json', problems)
  if (data.format !== MV_PACK_FORMAT) problems.push(`format 必须是 "${MV_PACK_FORMAT}"`)
  if (data.version !== MV_PACK_VERSION) problems.push(`version 必须是 ${MV_PACK_VERSION}（本插件支持的清单版本）`)
  const title = optionalText(data, 'title', MV_PACK_LIMITS.maxShortChars, problems)
  if (!title) problems.push('title 必填')
  let credits = []
  if (data.credits !== undefined && data.credits !== null) {
    if (!Array.isArray(data.credits) || data.credits.length > MV_PACK_LIMITS.maxCredits || data.credits.some(item => typeof item !== 'string' || item.length > 500)) {
      problems.push(`credits 必须是最多 ${MV_PACK_LIMITS.maxCredits} 条、每条不超过 500 字的字符串数组`)
    } else credits = data.credits.map(item => item.trim()).filter(Boolean)
  }
  const pack = {
    format: MV_PACK_FORMAT,
    version: MV_PACK_VERSION,
    title: title ?? '',
    artist: optionalText(data, 'artist', MV_PACK_LIMITS.maxShortChars, problems),
    album: optionalText(data, 'album', MV_PACK_LIMITS.maxShortChars, problems),
    credits,
    notice: optionalText(data, 'notice', MV_PACK_LIMITS.maxTextChars, problems),
    duration: optionalNumber(data, 'duration', 1, MV_PACK_LIMITS.maxDuration, problems),
    audio: mediaSection(data, 'audio', problems, { offset: true }),
    lyrics: mediaSection(data, 'lyrics', problems, { offset: true }),
    spectrum: mediaSection(data, 'spectrum', problems),
  }
  if (pack.lyrics && !MV_LYRICS_EXTENSIONS.includes(extOf(pack.lyrics.file))) problems.push(`lyrics.file 应是 ${MV_LYRICS_EXTENSIONS.join(' / ')} 文件`)
  if (pack.spectrum && extOf(pack.spectrum.file) !== '.json') problems.push('spectrum.file 应是 .json 文件（{ fps, frames }）')
  const canvas = data.canvas ?? {}
  if (!isObject(canvas)) problems.push('canvas 必须是对象')
  else {
    unknownKeys(canvas, new Set(['renderer', 'fontSize', 'script', 'bpm', 'beatOffset', 'assets', 'output', 'size']), 'canvas', problems)
    const renderer = canvas.renderer ?? (canvas.script ? 'script' : 'generic')
    if (!MV_CANVAS_RENDERERS.includes(renderer)) problems.push(`canvas.renderer 必须是 ${MV_CANVAS_RENDERERS.join(' / ')}`)
    let script
    if (canvas.script !== undefined && canvas.script !== null) {
      script = checkPackPath(canvas.script, 'canvas.script', problems)
      if (script && !['.js', '.mjs'].includes(extOf(script))) problems.push('canvas.script 应是 .js 文件（定义 render(t, cols, rows, ctx) 的场景脚本）')
    }
    if (renderer === 'script' && !script && !problems.some(p => p.startsWith('canvas.script'))) problems.push('canvas.renderer 为 script 时必须提供 canvas.script（如 "scenes.js"）')
    const assets = canvasAssets(canvas.assets, problems)
    // 0.9.1: a scene script may paint pixels (paint(g, t, width, height, ctx) on a sandboxed 2D canvas).
    const output = canvas.output ?? 'text'
    if (!MV_SCENE_OUTPUTS.includes(output)) problems.push(`canvas.output 必须是 ${MV_SCENE_OUTPUTS.join(' / ')}`)
    else if (output !== 'text' && renderer !== 'script') problems.push('canvas.output 只用于 renderer "script"')
    let size
    if (canvas.size !== undefined && canvas.size !== null) {
      const [w, h] = Array.isArray(canvas.size) ? canvas.size : []
      const { minWidth, minHeight, maxWidth, maxHeight } = MV_PIXEL_LIMITS
      if (!Array.isArray(canvas.size) || canvas.size.length !== 2 || !Number.isInteger(w) || !Number.isInteger(h) || w < minWidth || h < minHeight || w > maxWidth || h > maxHeight) problems.push(`canvas.size 应是 [宽, 高]（整数像素，${minWidth}–${maxWidth} × ${minHeight}–${maxHeight}）`)
      else if (output !== 'pixels') problems.push('canvas.size 只用于 canvas.output "pixels"')
      else size = [w, h]
    }
    pack.canvas = {
      renderer, ...(script ? { script } : {}), ...(assets ? { assets } : {}), ...(output !== 'text' && MV_SCENE_OUTPUTS.includes(output) ? { output } : {}),
      ...(output === 'pixels' ? { size: size ?? MV_PIXEL_LIMITS.defaultSize } : {}), fontSize: optionalNumber(canvas, 'fontSize', 8, 32, problems, 'canvas.fontSize'),
      bpm: optionalNumber(canvas, 'bpm', 20, 400, problems, 'canvas.bpm'), beatOffset: optionalNumber(canvas, 'beatOffset', -60, 60, problems, 'canvas.beatOffset'),
    }
  }
  // Song sections written by 自动制作 (x-dsh-mv-ai.sections): passed to scene scripts as ctx.section.
  const sections = normalizeSections(data['x-dsh-mv-ai']?.sections)
  if (sections.length) pack.sections = sections
  // Workshop metadata (x-dsh-mv-workshop): license, author, audio match info.
  const workshop = workshopMeta(data['x-dsh-mv-workshop'])
  if (workshop) pack.workshop = workshop
  // 0.6.0 removed the 面板终端 / 独立窗口 players: an old "terminal" section is ignored, not an error.
  if (data.terminal !== undefined) pack.ignored = ['terminal']
  if (problems.length) throw new MvPackError(problems)
  return stripUndefined(pack)
}

const httpsUrl = v => (typeof v === 'string' && /^https:\/\/[^\s"<>]{3,300}$/.test(v.trim()) ? v.trim() : undefined)

/** canvas.assets: { name: "path" | ["shard", …] } with relative paths only. */
function canvasAssets(value, problems) {
  if (value === undefined || value === null) return undefined
  if (!isObject(value)) { problems.push('canvas.assets 必须是对象 { 名称: 路径或路径数组 }'); return undefined }
  const names = Object.keys(value)
  if (names.length > MV_PACK_LIMITS.maxAssets) { problems.push(`canvas.assets 最多 ${MV_PACK_LIMITS.maxAssets} 项`); return undefined }
  const out = {}
  for (const name of names) {
    if (!MV_ASSET_NAME.test(name)) { problems.push(`canvas.assets 的名称「${name}」无效（小写字母、数字和 -）`); continue }
    const list = Array.isArray(value[name]) ? value[name] : [value[name]]
    if (!list.length || list.length > MV_PACK_LIMITS.maxAssetParts) { problems.push(`canvas.assets.${name} 应有 1–${MV_PACK_LIMITS.maxAssetParts} 个文件`); continue }
    const paths = []
    for (const item of list) {
      const path = checkPackPath(item, `canvas.assets.${name}`, problems)
      if (!path) continue
      if (isAbsolutePackPath(path)) { problems.push(`canvas.assets.${name} 只能用包内的相对路径：${path}`); continue }
      if (!MV_ASSET_EXTENSIONS.includes(extOf(path))) { problems.push(`canvas.assets.${name} 只能是 ${MV_ASSET_EXTENSIONS.join(' / ')} 文件：${path}`); continue }
      paths.push(path)
    }
    if (paths.length === list.length) out[name] = Array.isArray(value[name]) ? paths : paths[0]
  }
  return Object.keys(out).length ? out : undefined
}

/** Files of one canvas asset (always a list). */
export const assetParts = (pack, name) => { const v = pack?.canvas?.assets?.[name]; return v === undefined ? [] : Array.isArray(v) ? v : [v] }

/** The parts of x-dsh-mv-workshop the panel uses (anything malformed is dropped, never an error). */
export function workshopMeta(value) {
  if (!isObject(value)) return null
  const str = (v, n) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : undefined)
  const audio = isObject(value.audio) ? value.audio : {}
  const fp = isObject(audio.fingerprint) && typeof audio.fingerprint.values === 'string' && /^[A-Za-z0-9+/=]{1,4096}$/.test(audio.fingerprint.values)
    ? { kind: str(audio.fingerprint.kind, 40) ?? 'energy-2hz-v1', values: audio.fingerprint.values } : undefined
  return stripUndefined({
    id: str(value.id, 64), version: str(value.version, 32), license: str(value.license, 120), author: str(value.author, 120),
    homepage: httpsUrl(value.homepage), source: httpsUrl(value.source),
    audio: stripUndefined({ duration: Number.isFinite(audio.duration) && audio.duration > 0 ? Math.round(audio.duration * 1000) / 1000 : undefined, fingerprint: fp, sha256: typeof audio.sha256 === 'string' && /^[0-9a-f]{64}$/.test(audio.sha256) ? audio.sha256 : undefined }),
    lyricsTiming: typeof value.lyricsTiming === 'string' && /^[\w.-]{1,64}\.json$/.test(value.lyricsTiming) ? value.lyricsTiming : undefined,
  })
}

function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined)
  if (!isObject(value)) return value
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).map(([k, v]) => [k, stripUndefined(v)]))
}

/** Absolute path of an mv.json or of the folder holding one. */
export function parseManifestPath(value) {
  if (typeof value !== 'string') throw new TypeError('MV 包路径必须是字符串')
  const path = value.trim().replace(/^"(.*)"$/, '$1')
  if (!path || path.length > MV_PACK_LIMITS.maxPathChars || /[\0\r\n"]/.test(path)) throw new TypeError('MV 包路径无效')
  if (!isAbsolutePackPath(path)) throw new TypeError('MV 包路径必须是绝对路径（mv.json 文件或它所在的文件夹）')
  return path
}

export function parsePackLoad(value) {
  if (!isObject(value)) throw new TypeError('pack load request must be an object')
  const extra = Object.keys(value).filter(key => key !== 'path')
  if (extra.length) throw new TypeError(`pack load request has unexpected fields: ${extra.join(', ')}`)
  return { path: parseManifestPath(value.path) }
}

export function parsePackRead(value) {
  if (!isObject(value)) throw new TypeError('pack read request must be an object')
  const extra = Object.keys(value).filter(key => !['manifestPath', 'role', 'offset', 'length', 'asset', 'part'].includes(key))
  if (extra.length) throw new TypeError(`pack read request has unexpected fields: ${extra.join(', ')}`)
  if (!MV_PACK_FILE_ROLES.includes(value.role)) throw new TypeError(`role must be ${MV_PACK_FILE_ROLES.join(' / ')}`)
  const offset = value.offset ?? 0
  const length = value.length ?? MV_PACK_LIMITS.readChunkBytes
  if (!Number.isInteger(offset) || offset < 0 || offset > MV_PACK_LIMITS.audioBytes) throw new TypeError('offset is invalid')
  if (!Number.isInteger(length) || length < 1 || length > MV_PACK_LIMITS.readChunkBytes) throw new TypeError(`length must be 1..${MV_PACK_LIMITS.readChunkBytes}`)
  const request = { manifestPath: parseManifestPath(value.manifestPath), role: value.role, offset, length }
  if (value.role === 'asset') {
    if (typeof value.asset !== 'string' || !MV_ASSET_NAME.test(value.asset)) throw new TypeError('asset must be a canvas.assets name')
    const part = value.part ?? 0
    if (!Number.isInteger(part) || part < 0 || part >= MV_PACK_LIMITS.maxAssetParts) throw new TypeError('part is invalid')
    return { ...request, asset: value.asset, part }
  }
  if (value.asset !== undefined || value.part !== undefined) throw new TypeError('asset / part are only for role "asset"')
  return request
}

export function parseTemplateWrite(value) {
  if (!isObject(value)) throw new TypeError('template request must be an object')
  const extra = Object.keys(value).filter(key => key !== 'dir')
  if (extra.length) throw new TypeError(`template request has unexpected fields: ${extra.join(', ')}`)
  return { dir: parseManifestPath(value.dir) }
}

/** Short one-line description of a pack for lists. */
export function packSummary(pack) {
  return [pack.title, pack.artist].filter(Boolean).join(' — ')
}
