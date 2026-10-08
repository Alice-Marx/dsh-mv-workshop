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
 *                 "output": "text" | "pixels" | "webgl", "size": [1280, 720], "subtitles": false,
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
 * canvas.output "webgl" uses the same bitmap pipeline but gives paint() a raw
 * WebGL2RenderingContext owned by the sandbox. setup(info, gl) receives that
 * same context once. It still has no DOM, network or imports.
 * Bitmap scenes may opt into canvas.subtitles (0.9.3): the player overlays
 * the user's local lyric cues after the bitmap. It defaults to off.
 * "world-execute-me" (the renderer bundled until 0.8.x) is still accepted and
 * plays with the generic renderer; the scenes now ship as a workshop pack.
 * A "terminal" section written for versions before 0.6.0 is accepted and
 * ignored (the loader reports a warning).
 */

import { normalizeSections, SCENE_FONT_LIMITS, sceneFontFamilyValid, sceneFontUnicodeRangeValid, sceneWebglContextProblems } from './mv-scene.mjs'

export const MV_PACK_FORMAT = 'dsh-mv-pack'
export const MV_PACK_VERSION = 1
export const MV_PACK_MANIFEST = 'mv.json'
export const MV_PACK_SCHEMA_FILE = 'mv.schema.json'
export const MV_CANVAS_RENDERERS = Object.freeze(['generic', 'world-execute-me', 'dsh-pv', 'script'])
/** Pack files the panel may read (only through the pack's own manifest). */
export const MV_PACK_FILE_ROLES = Object.freeze(['audio', 'lyrics', 'spectrum', 'scene', 'timing', 'asset', 'font'])
/** Renderers the plugin itself implements (0.9.0 moved the world.execute(me) scenes to a workshop pack). */
export const MV_RENDERERS_BUILTIN = Object.freeze(['generic', 'dsh-pv', 'script'])
/** What a scene script draws: characters, a 2D bitmap, or a raw WebGL2 bitmap. */
export const MV_SCENE_OUTPUTS = Object.freeze(['text', 'pixels', 'webgl'])
export const MV_PIXEL_LIMITS = Object.freeze({ minWidth: 160, minHeight: 90, maxWidth: 1920, maxHeight: 1080, defaultSize: Object.freeze([1280, 720]) })
export const MV_ASSET_EXTENSIONS = Object.freeze(['.json', '.webp', '.png'])
export const MV_ASSET_NAME = /^[a-z0-9][a-z0-9-]{0,39}$/
/** 0.9.5: only the two upstream OFL dsh-pv faces may be shipped as binary fonts. */
export const DSHPV_FONT_LIMITS = Object.freeze({ fileBytes: 512 * 1024, maxTables: 64, maxNameRecords: 128, maxNameChars: 256 })
export const DSHPV_FONT_ASSETS = Object.freeze({
  'font-head': Object.freeze({ path: 'fonts/SpaceMono-Bold.ttf', licenseFile: 'fonts/OFL_spacemono.txt', family: 'DshMvPvSpaceMono', weight: '700', sourceFamily: 'Space Mono', sourceStyle: 'Bold' }),
  'font-banner': Object.freeze({ path: 'fonts/Anton-Regular.ttf', licenseFile: 'fonts/OFL_anton.txt', family: 'DshMvPvAnton', weight: '400', sourceFamily: 'Anton', sourceStyle: 'Regular' }),
})
export const DSHPV_FONT_NOTICE = 'fonts/NOTICE.md'
export const WINDOWS_FONT_NAME = /^(?:consola[a-z]*|msyh[a-z]*|msyi[a-z]*|simsun[a-z]*|simhei[a-z]*|simfang[a-z]*|simkai[a-z]*|seg(?:oe|ui)[a-z]*|tahoma[a-z]*|arial[a-z]*|calibri[a-z]*|cambria[a-z]*|verdana[a-z]*)\.(?:ttf|ttc|otf|woff2?)$/i
export const MV_FONT_EXTENSIONS = Object.freeze(['.ttf', '.otf', '.woff2'])
export const MV_FONT_LIMITS = SCENE_FONT_LIMITS
/** Local lyric data only. JS/MJS imports extract a static LYRICS array; no code is executed. */
export const MV_LYRICS_EXTENSIONS = Object.freeze(['.lrc', '.srt', '.vtt', '.json', '.txt', '.js', '.mjs'])

export const MV_PACK_LIMITS = Object.freeze({
  manifestBytes: 256 * 1024,
  textFileBytes: 8 * 1024 * 1024,
  sceneBytes: 256 * 1024,
  /** 0.9.2: webgl scenes may be larger (Three.js bundles etc.); the workshop limit is the source of truth. */
  webglSceneBytes: 2 * 1024 * 1024,
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
    unknownKeys(canvas, new Set(['renderer', 'fontSize', 'script', 'bpm', 'beatOffset', 'assets', 'output', 'size', 'subtitles', 'fonts', 'preroll', 'context']), 'canvas', problems)
    const renderer = canvas.renderer ?? (canvas.script ? 'script' : 'generic')
    if (!MV_CANVAS_RENDERERS.includes(renderer)) problems.push(`canvas.renderer 必须是 ${MV_CANVAS_RENDERERS.join(' / ')}`)
    let script
    if (canvas.script !== undefined && canvas.script !== null) {
      script = checkPackPath(canvas.script, 'canvas.script', problems)
      if (script && !['.js', '.mjs'].includes(extOf(script))) problems.push('canvas.script 应是 .js 文件（定义 render(t, cols, rows, ctx) 的场景脚本）')
    }
    if (renderer === 'script' && !script && !problems.some(p => p.startsWith('canvas.script'))) problems.push('canvas.renderer 为 script 时必须提供 canvas.script（如 "scenes.js"）')
    const assets = canvasAssets(canvas.assets, problems, renderer)
    // Bitmap scenes paint an OffscreenCanvas in the worker: 2D (pixels) or raw WebGL2 (webgl).
    const output = canvas.output ?? 'text'
    if (!MV_SCENE_OUTPUTS.includes(output)) problems.push(`canvas.output 必须是 ${MV_SCENE_OUTPUTS.join(' / ')}`)
    else if (output !== 'text' && renderer !== 'script') problems.push('canvas.output 只用于 renderer "script"')
    const fonts = canvasFonts(canvas.fonts, problems, renderer, output)
    if (canvas.context !== undefined) {
      problems.push(...sceneWebglContextProblems(canvas.context, output))
      if (renderer !== 'script' || output !== 'webgl') problems.push('canvas.context 只用于 script WebGL 输出')
    }
    const preroll = optionalNumber(canvas, 'preroll', 0, 30, problems, 'canvas.preroll')
    if (preroll !== undefined && (renderer !== 'script' || !['pixels', 'webgl'].includes(output))) problems.push('canvas.preroll 只用于 script 位图场景，歌曲开始前静默播放，不能移动音频或歌词时间轴')
    if (canvas.subtitles !== undefined) {
      if (typeof canvas.subtitles !== 'boolean') problems.push('canvas.subtitles 必须是布尔值（true / false）')
      else if (renderer !== 'script' || !['pixels', 'webgl'].includes(output)) problems.push('canvas.subtitles 只用于 renderer "script" 的 "pixels" / "webgl" 输出')
    }
    let size
    if (canvas.size !== undefined && canvas.size !== null) {
      const [w, h] = Array.isArray(canvas.size) ? canvas.size : []
      const { minWidth, minHeight, maxWidth, maxHeight } = MV_PIXEL_LIMITS
      if (!Array.isArray(canvas.size) || canvas.size.length !== 2 || !Number.isInteger(w) || !Number.isInteger(h) || w < minWidth || h < minHeight || w > maxWidth || h > maxHeight) problems.push(`canvas.size 应是 [宽, 高]（整数像素，${minWidth}–${maxWidth} × ${minHeight}–${maxHeight}）`)
      else if (output !== 'pixels' && output !== 'webgl') problems.push('canvas.size 只用于 canvas.output "pixels" 或 "webgl"')
      else size = [w, h]
    }
    pack.canvas = {
      renderer, ...(script ? { script } : {}), ...(assets ? { assets } : {}), ...(output !== 'text' && MV_SCENE_OUTPUTS.includes(output) ? { output } : {}),
      ...(typeof canvas.subtitles === 'boolean' ? { subtitles: canvas.subtitles } : {}),
      ...(fonts?.length ? { fonts } : {}), ...(preroll !== undefined ? { preroll } : {}),
      ...(canvas.context !== undefined && isObject(canvas.context) ? { context: canvas.context } : {}),
      ...(['pixels', 'webgl'].includes(output) ? { size: size ?? MV_PIXEL_LIMITS.defaultSize } : {}), fontSize: optionalNumber(canvas, 'fontSize', 8, 32, problems, 'canvas.fontSize'),
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
function canvasAssets(value, problems, renderer) {
  if (value === undefined || value === null) return undefined
  if (!isObject(value)) { problems.push('canvas.assets 必须是对象 { 名称: 路径或路径数组 }'); return undefined }
  const names = Object.keys(value)
  if (names.length > MV_PACK_LIMITS.maxAssets) { problems.push(`canvas.assets 最多 ${MV_PACK_LIMITS.maxAssets} 项`); return undefined }
  const out = {}
  for (const name of names) {
    if (!MV_ASSET_NAME.test(name)) { problems.push(`canvas.assets 的名称「${name}」无效（小写字母、数字和 -）`); continue }
    const list = Array.isArray(value[name]) ? value[name] : [value[name]]
    if (!list.length || list.length > MV_PACK_LIMITS.maxAssetParts) { problems.push(`canvas.assets.${name} 应有 1–${MV_PACK_LIMITS.maxAssetParts} 个文件`); continue }
    const font = Object.hasOwn(DSHPV_FONT_ASSETS, name) ? DSHPV_FONT_ASSETS[name] : undefined
    if (font && (renderer !== 'dsh-pv' || Array.isArray(value[name]))) { problems.push(`canvas.assets.${name} 只允许 dsh-pv 渲染器的单个 OFL TTF 文件（不能是分片数组）`); continue }
    const paths = []
    for (const item of list) {
      const path = checkPackPath(item, `canvas.assets.${name}`, problems)
      if (!path) continue
      if (isAbsolutePackPath(path)) { problems.push(`canvas.assets.${name} 只能用包内的相对路径：${path}`); continue }
      if (font) {
        if (path !== font.path) { problems.push(`canvas.assets.${name} 只能引用已支持的 OFL 字体 ${font.path}（Windows 字体不能随包分发）`); continue }
        paths.push(path); continue
      }
      if (!MV_ASSET_EXTENSIONS.includes(extOf(path))) { problems.push(`canvas.assets.${name} 只能是 ${MV_ASSET_EXTENSIONS.join(' / ')} 文件：${path}`); continue }
      paths.push(path)
    }
    if (paths.length === list.length) out[name] = Array.isArray(value[name]) ? paths : paths[0]
  }
  return Object.keys(out).length ? out : undefined
}

/** Files of one canvas asset (always a list). */
export const assetParts = (pack, name) => { const v = pack?.canvas?.assets?.[name]; return v === undefined ? [] : Array.isArray(v) ? v : [v] }

/** Local-only fonts, loaded by the worker supervisor, never by scene code or a URL. */
function canvasFonts(value, problems, renderer, output) {
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.length > MV_FONT_LIMITS.maxFaces) { problems.push(`canvas.fonts 应是最多 ${MV_FONT_LIMITS.maxFaces} 项的字体数组`); return undefined }
  if (renderer !== 'script' || !['pixels', 'webgl'].includes(output)) problems.push('canvas.fonts 只用于 script 的 pixels / webgl 输出')
  const out = [], seen = new Set()
  for (const [index, face] of value.entries()) {
    const subject = `canvas.fonts[${index}]`
    if (!isObject(face)) { problems.push(`${subject} 必须是字体描述对象`); continue }
    unknownKeys(face, new Set(['family', 'file', 'weight', 'style', 'unicodeRange', 'licenseFile']), subject, problems)
    const family = face.family, weight = face.weight ?? '400', style = face.style ?? 'normal'
    if (!sceneFontFamilyValid(family) || /^(?:Consolas|Microsoft YaHei|Arial|Calibri|Cambria|Verdana|Tahoma|Segoe UI)$/i.test(family)) problems.push(`${subject}.family 无效（安全字体族名，Windows 专有字体不随包分发）`)
    if (typeof weight !== 'string' || !/^[1-9]00$/.test(weight)) problems.push(`${subject}.weight 应是 100–900 的数字字符串`)
    if (!['normal', 'italic', 'oblique'].includes(style)) problems.push(`${subject}.style 无效`)
    if (face.unicodeRange !== undefined && !sceneFontUnicodeRangeValid(face.unicodeRange)) problems.push(`${subject}.unicodeRange 无效或超过受限范围`)
    const file = checkPackPath(face.file, `${subject}.file`, problems), licenseFile = checkPackPath(face.licenseFile, `${subject}.licenseFile`, problems)
    if (file && (isAbsolutePackPath(file) || file.includes(':') || !MV_FONT_EXTENSIONS.includes(extOf(file)) || WINDOWS_FONT_NAME.test(basenameOf(file)))) problems.push(`${subject}.file 必须是包内 .woff2 / .ttf / .otf 字体（不能是 Windows 专有字体）`)
    if (licenseFile && (isAbsolutePackPath(licenseFile) || licenseFile.includes(':') || !['.txt', '.md'].includes(extOf(licenseFile)))) problems.push(`${subject}.licenseFile 必须是包内许可文本路径`)
    const identity = JSON.stringify([family, weight, style, face.unicodeRange ?? ''])
    if (seen.has(identity)) problems.push(`${subject} 重复的字体描述`)
    seen.add(identity)
    out.push({ family, file, weight, style, ...(face.unicodeRange !== undefined ? { unicodeRange: face.unicodeRange } : {}), licenseFile })
  }
  return out
}

/** Bounded binary header/table validation. Licensing still requires human-reviewed OFL provenance. */
export function checkSceneFont(value, path = 'font.woff2') {
  const bytes = value instanceof Uint8Array ? value : value instanceof ArrayBuffer ? new Uint8Array(value) : null
  const invalid = message => ({ errors: [`${path}：${message}`] })
  if (!bytes || bytes.byteLength < 12 || bytes.byteLength > MV_FONT_LIMITS.fileBytes) return invalid('字体大小无效（上限 2 MiB）')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), signature = view.getUint32(0, false)
  if (extOf(path) === '.woff2') {
    if (bytes.byteLength < 48 || signature !== 0x774f4632 || view.getUint32(8, false) !== bytes.byteLength || view.getUint16(12, false) < 1 || view.getUint16(12, false) > 128 || view.getUint16(14, false) !== 0 || view.getUint32(16, false) < 12 || view.getUint32(16, false) > 8 * 1024 * 1024 || view.getUint32(20, false) > bytes.byteLength - 48) return invalid('WOFF2 签名/长度/表数/解压大小无效')
    if (![0x00010000, 0x4f54544f].includes(view.getUint32(4, false))) return invalid('不支持的 WOFF2 字体类型')
    for (const [offAt, lenAt] of [[28, 32], [40, 44]]) {
      const off = view.getUint32(offAt, false), len = view.getUint32(lenAt, false)
      if (off > bytes.byteLength || len > bytes.byteLength - off || (off === 0 && len !== 0)) return invalid('WOFF2 扩展数据范围无效')
    }
  } else {
    const count = view.getUint16(4, false), directory = 12 + count * 16
    if (!['.ttf', '.otf'].includes(extOf(path)) || signature !== (extOf(path) === '.ttf' ? 0x00010000 : 0x4f54544f) || count < 1 || count > 128 || directory > bytes.byteLength) return invalid('SFNT 签名/表目录无效')
    for (let i = 0; i < count; i++) {
      const at = 12 + i * 16, off = view.getUint32(at + 8, false), len = view.getUint32(at + 12, false)
      if (off < directory || off > bytes.byteLength || len > bytes.byteLength - off) return invalid('SFNT 表范围无效')
    }
  }
  return { errors: [] }
}

/** Data-only bounded sfnt/name check; known font assets must identify the supported family and style. */
export function checkDshPvFont(value, name = 'font.ttf') {
  const bytes = value instanceof Uint8Array ? value : value instanceof ArrayBuffer ? new Uint8Array(value) : null
  const errors = []
  if (!bytes || bytes.byteLength < 12 || bytes.byteLength > DSHPV_FONT_LIMITS.fileBytes) return { errors: [`${name}：TTF 字体大小无效（12 字节–512 KiB）`] }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const tables = view.getUint16(4, false)
  if (view.getUint32(0, false) !== 0x00010000 || tables < 1 || tables > DSHPV_FONT_LIMITS.maxTables || 12 + tables * 16 > bytes.byteLength) return { errors: [`${name}：不是受支持的 TrueType TTF 字体（sfnt 签名 / 表目录无效）`] }
  let nameTable = null
  for (let i = 0; i < tables; i++) {
    const at = 12 + i * 16, offset = view.getUint32(at + 8, false), length = view.getUint32(at + 12, false)
    if (offset < 12 + tables * 16 || offset > bytes.byteLength || length > bytes.byteLength - offset) { errors.push(`${name}：TTF 第 ${i + 1} 个表超出文件范围`); break }
    if (view.getUint32(at, false) === 0x6e616d65) {
      if (nameTable) { errors.push(`${name}：TTF 有重复的 name 表`); break }
      nameTable = { offset, length }
    }
  }
  const descriptor = (Object.hasOwn(DSHPV_FONT_ASSETS, name) ? DSHPV_FONT_ASSETS[name] : undefined) ?? Object.values(DSHPV_FONT_ASSETS).find(font => font.path === name || basenameOf(font.path) === name)
  if (!errors.length && descriptor) errors.push(...checkDshPvFontName(view, nameTable, descriptor, name))
  return { errors }
}

function checkDshPvFontName(view, table, descriptor, name) {
  const invalid = message => [`${name}：TTF name 表${message}`]
  if (!table || table.length < 6) return invalid('缺失或无效，不能确认受支持的 OFL 字体身份')
  const { offset, length } = table, format = view.getUint16(offset), count = view.getUint16(offset + 2), strings = view.getUint16(offset + 4)
  if (format > 1 || count < 1 || count > DSHPV_FONT_LIMITS.maxNameRecords || 6 + count * 12 > length || strings < 6 + count * 12 || strings > length) return invalid('记录数量 / 字符串范围无效')
  const families = new Set(), styles = new Set()
  for (let i = 0; i < count; i++) {
    const at = offset + 6 + i * 12, platform = view.getUint16(at), id = view.getUint16(at + 6), size = view.getUint16(at + 8), start = view.getUint16(at + 10)
    if (size > DSHPV_FONT_LIMITS.maxNameChars * 2 || start > length - strings || size > length - strings - start) return invalid('字符串超出文件范围或过长')
    // The supplied upstream faces have Unicode/Windows records. Ignore legacy
    // Mac encodings; they do not independently establish a supported identity.
    if (![0, 3].includes(platform) || ![1, 2, 16, 17].includes(id)) continue
    if (size % 2) return invalid('Unicode 字符串长度不是偶数')
    let text = ''
    for (let pos = offset + strings + start; pos < offset + strings + start + size; pos += 2) text += String.fromCharCode(view.getUint16(pos))
    if (/[\u0000-\u001f\u007f]/.test(text)) return invalid('字体名称含控制字符')
    if (id === 1 || id === 16) families.add(text.trim())
    else styles.add(text.trim())
  }
  if (!families.size || !styles.size || [...families].some(family => family !== descriptor.sourceFamily) || [...styles].some(style => style !== descriptor.sourceStyle)) return invalid(`身份不符（只支持 ${descriptor.sourceFamily} ${descriptor.sourceStyle}；重命名 Windows / 其他字体不能随包分发）`)
  return []
}

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
    lyricsLicense: str(value.lyricsLicense, 120), lyricsCredit: str(value.lyricsCredit, 500), lyricsSource: httpsUrl(value.lyricsSource),
    fontsLicense: str(value.fontsLicense, 120), fontsCredit: str(value.fontsCredit, 500), fontsNotice: value.fontsNotice === DSHPV_FONT_NOTICE ? DSHPV_FONT_NOTICE : undefined,
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
  const extra = Object.keys(value).filter(key => !['manifestPath', 'role', 'offset', 'length', 'asset', 'part', 'font'].includes(key))
  if (extra.length) throw new TypeError(`pack read request has unexpected fields: ${extra.join(', ')}`)
  if (!MV_PACK_FILE_ROLES.includes(value.role)) throw new TypeError(`role must be ${MV_PACK_FILE_ROLES.join(' / ')}`)
  const offset = value.offset ?? 0
  const length = value.length ?? MV_PACK_LIMITS.readChunkBytes
  if (!Number.isInteger(offset) || offset < 0 || offset > MV_PACK_LIMITS.audioBytes) throw new TypeError('offset is invalid')
  if (!Number.isInteger(length) || length < 1 || length > MV_PACK_LIMITS.readChunkBytes) throw new TypeError(`length must be 1..${MV_PACK_LIMITS.readChunkBytes}`)
  const request = { manifestPath: parseManifestPath(value.manifestPath), role: value.role, offset, length }
  if (value.role === 'asset') {
    if (value.font !== undefined) throw new TypeError('font is only for role "font"')
    if (typeof value.asset !== 'string' || !MV_ASSET_NAME.test(value.asset)) throw new TypeError('asset must be a canvas.assets name')
    const part = value.part ?? 0
    if (!Number.isInteger(part) || part < 0 || part >= MV_PACK_LIMITS.maxAssetParts) throw new TypeError('part is invalid')
    return { ...request, asset: value.asset, part }
  }
  if (value.asset !== undefined || value.part !== undefined) throw new TypeError('asset / part are only for role "asset"')
  if (value.role === 'font') {
    if (!Number.isInteger(value.font) || value.font < 0 || value.font >= MV_FONT_LIMITS.maxFaces) throw new TypeError('font must be a canvas.fonts index')
    return { ...request, font: value.font }
  }
  if (value.font !== undefined) throw new TypeError('font is only for role "font"')
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
