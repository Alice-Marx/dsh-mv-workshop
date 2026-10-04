/**
 * MV 创意工坊 (workshop): shared, dependency-light rules used by the panel, the
 * Host and the workshop repository's CI (Alice-Marx/dsh-mv-workshop vendors
 * this file together with mv-pack.mjs and mv-scene.mjs).
 *
 * A workshop pack is packs/<id>/ in that GitHub repository: mv.json, scene
 * scripts, an optional cover image and README, and optionally
 * lyrics.timing.json (line times and hashes, never lyric text). It never
 * contains audio or lyric text: installed packs play with the user's own
 * audio, matched by duration and an optional energy fingerprint.
 */
import { assetParts, parseMvPack } from './mv-pack.mjs'

export const WORKSHOP_REPO = 'Alice-Marx/dsh-mv-workshop'
export const WORKSHOP_BRANCH = 'main'
export const WORKSHOP_RAW = 'https://raw.githubusercontent.com'
export const WORKSHOP_INDEX_URL = `${WORKSHOP_RAW}/${WORKSHOP_REPO}/${WORKSHOP_BRANCH}/index.json`
export const WORKSHOP_INDEX_FORMAT = 'dsh-mv-workshop-index'
export const WORKSHOP_TIMING_FORMAT = 'dsh-mv-lyrics-timing'
export const WORKSHOP_TIMING_FILE = 'lyrics.timing.json'
export const WORKSHOP_DEFAULT_LICENSE = 'CC-BY-NC-SA-4.0'
export const FINGERPRINT_KIND = 'energy-2hz-v1'

/**
 * The two MVs that were built into the plugin until 0.8.x and now live in the workshop (0.9.0). The empty
 * library recommends them; `legacyId` is the old built-in id still stored by 0.8.x in localStorage.
 */
export const PRESET_PACKS = Object.freeze([
  Object.freeze({ id: 'world-execute-me', legacyId: 'builtin:world-execute-me', title: 'world.execute(me);', artist: 'Mili', kind: 'ASCII 场景', cover: '>_', hue: 18,
    source: 'https://github.com/yym8224961/world.execute-me-ascii', sourceLabel: 'yym8224961/world.execute-me-ascii' }),
  Object.freeze({ id: 'world-execute-me-dsh-pv', legacyId: 'builtin:dsh-pv', title: 'world.execute(me); dsh PV', artist: 'MisakaZentai', kind: 'dsh PV 画布', cover: 'dsh', hue: 222,
    source: 'https://github.com/MisakaZentai/world-execute-me-dsh-pv', sourceLabel: 'MisakaZentai/world-execute-me-dsh-pv' }),
])

export const WORKSHOP_LIMITS = Object.freeze({
  maxFiles: 40,
  fileBytes: 512 * 1024,
  coverBytes: 1024 * 1024,
  scriptBytes: 256 * 1024,
  /** 0.9.0: 8 MB (was 4) so the dsh PV pack's recorded data fits; single files stay ≤ 512 KB (shard big JSON). */
  packBytes: 8 * 1024 * 1024,
  indexBytes: 8 * 1024 * 1024,
  maxPacks: 5000,
  maxLongLine: 4000,
})

/** File kinds a workshop pack may contain. */
export const WORKSHOP_ALLOWED_EXT = Object.freeze(['.json', '.js', '.mjs', '.md', '.txt', '.png', '.webp', '.jpg', '.jpeg'])
/** Audio, video and lyric/subtitle formats are rejected outright. */
export const WORKSHOP_BANNED_EXT = Object.freeze([
  '.mp3', '.mp2', '.m4a', '.mp4', '.aac', '.webm', '.mka', '.mkv', '.ogg', '.oga', '.opus', '.flac', '.wav', '.wma', '.aiff', '.aif', '.ape', '.amr', '.ac3', '.mov', '.avi', '.mid', '.midi',
  '.lrc', '.srt', '.vtt', '.ass', '.ssa', '.ttml', '.krc', '.qrc', '.yrc', '.lrcx',
])
const BANNED_NAMES = /^(lyrics?|歌词)(\.[\w-]+)?\.(json|txt)$/i
export const COVER_NAMES = Object.freeze(['cover.webp', 'cover.png', 'cover.jpg', 'cover.jpeg'])

export const ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/
export const VERSION_PATTERN = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/
export const SHA256_PATTERN = /^[0-9a-f]{64}$/
const PATH_PATTERN = /^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+){0,2}$/

const extOf = name => { const at = name.lastIndexOf('.'); return at > 0 ? name.slice(at).toLowerCase() : '' }
const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v)

/** Slug for a pack id from a title (ASCII letters/digits/dashes; falls back to "mv-<random>"). */
export function workshopSlug(title, artist = '', random = () => Math.random().toString(36).slice(2, 8)) {
  const base = `${artist ? `${artist}-` : ''}${title}`.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48).replace(/-+$/, '')
  return ID_PATTERN.test(base) ? base : `mv-${base ? `${base.slice(0, 20).replace(/-+$/, '')}-` : ''}${random()}`.replace(/-+/g, '-')
}

/**
 * Static checks on a scene script before it is accepted into the workshop. The
 * panel runs scripts in a Web Worker sandbox anyway; this keeps obviously
 * unsafe or obfuscated code out of the catalogue. Returns { errors, warnings }.
 */
export function checkScriptSafety(source, name = 'scenes.js') {
  const errors = [], warnings = []
  const text = String(source ?? '')
  if (new TextEncoder().encode(text).length > WORKSHOP_LIMITS.scriptBytes) errors.push(`${name}：超过 ${WORKSHOP_LIMITS.scriptBytes / 1024} KB`)
  const rules = [
    [/^\s*import\s[^(]|\bimport\s*\(/m, 'import'],
    [/\brequire\s*\(/, 'require()'],
    [/\beval\s*\(/, 'eval()'],
    [/\bnew\s+Function\b|\bFunction\s*\(/, 'Function()'],
    [/\b(fetch|XMLHttpRequest|WebSocket|WebTransport|EventSource|importScripts|indexedDB|localStorage|sessionStorage|caches|BroadcastChannel|SharedWorker|Worker|RTCPeerConnection|WebAssembly|Notification|navigator|location|document|window|process|globalThis|self|postMessage|setTimeout|setInterval|queueMicrotask|Atomics|SharedArrayBuffer)\b/, 'network / storage / global API'],
    [/\bconstructor\s*\.\s*constructor\b|\[\s*['"`]constructor['"`]\s*\]/, 'constructor escape'],
    [/__proto__|\bReflect\b|\bProxy\b/, 'prototype tricks'],
    [/\\x[0-9a-f]{2}.*\\x[0-9a-f]{2}.*\\x[0-9a-f]{2}|\\u00[0-9a-f]{2}.*\\u00[0-9a-f]{2}.*\\u00[0-9a-f]{2}/i, 'escaped / obfuscated identifiers'],
    [/\b(atob|btoa|String\.fromCharCode)\s*\(/, 'string decoding (obfuscation)'],
  ]
  // Comments and string contents may legitimately mention these words; check code only.
  const code = stripCommentsAndStrings(text)
  for (const [pattern, label] of rules) {
    const target = label.startsWith('escaped') ? text : code
    if (pattern.test(target)) errors.push(`${name}：不允许使用 ${label}`)
  }
  if (!/\bfunction\s+render\s*\(/.test(code) && !/\brender\s*=\s*(function|\()/.test(code)) errors.push(`${name}：没有定义 render(t, cols, rows, ctx)`)
  const longest = text.split('\n').reduce((max, line) => Math.max(max, line.length), 0)
  if (longest > WORKSHOP_LIMITS.maxLongLine) errors.push(`${name}：有一行超过 ${WORKSHOP_LIMITS.maxLongLine} 个字符（像是压缩或混淆过的代码；请提交可读的源码）`)
  if (/Math\.random\s*\(/.test(code)) warnings.push(`${name}：使用了 Math.random()，拖动进度时画面会不一致（建议用确定性的 hash）`)
  return { errors, warnings }
}

/** Code with comments removed and string / template literal contents blanked (good enough for static checks). */
export function stripCommentsAndStrings(source) {
  let out = '', i = 0
  const s = String(source)
  while (i < s.length) {
    const c = s[i], d = s[i + 1]
    if (c === '/' && d === '/') { while (i < s.length && s[i] !== '\n') i++; continue }
    if (c === '/' && d === '*') { const end = s.indexOf('*/', i + 2); i = end < 0 ? s.length : end + 2; out += ' '; continue }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; out += q; i++
      while (i < s.length && s[i] !== q) {
        if (s[i] === '\\') i++
        else if (q === '`' && s[i] === '$' && s[i + 1] === '{') {
          // keep template expressions as code
          let depth = 1; i += 2; out += '${'
          while (i < s.length && depth) { if (s[i] === '{') depth++; else if (s[i] === '}') depth--; if (depth) out += s[i]; i++ }
          out += '}'; continue
        }
        i++
      }
      out += q; i++; continue
    }
    out += c; i++
  }
  return out
}

/** Normalise a lyric line for hashing (case, width, spaces and punctuation do not matter). */
export function normalizeLyricLine(text) {
  return String(text ?? '').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '')
}

/** Check lyrics.timing.json: { format, version, lines: [{ t, e?, h, w? }] } — times and hashes only. */
export function checkTiming(value, duration = 36_000) {
  const errors = []
  if (!isObject(value) || value.format !== WORKSHOP_TIMING_FORMAT || value.version !== 1 || !Array.isArray(value.lines)) return { errors: [`${WORKSHOP_TIMING_FILE}：格式应为 { "format": "${WORKSHOP_TIMING_FORMAT}", "version": 1, "lines": [...] }`] }
  const extra = Object.keys(value).filter(k => !['format', 'version', 'lines', 'normalize', 'hash'].includes(k))
  if (extra.length) errors.push(`${WORKSHOP_TIMING_FILE}：不允许的字段 ${extra.join(', ')}`)
  if (value.lines.length > 5000) errors.push(`${WORKSHOP_TIMING_FILE}：行数太多`)
  let last = -Infinity
  value.lines.forEach((line, i) => {
    if (!isObject(line)) { errors.push(`${WORKSHOP_TIMING_FILE}：第 ${i + 1} 行不是对象`); return }
    const keys = Object.keys(line).filter(k => !['t', 'e', 'h', 'w', 'n'].includes(k))
    if (keys.length) errors.push(`${WORKSHOP_TIMING_FILE}：第 ${i + 1} 行有不允许的字段 ${keys.join(', ')}（只能有时间和哈希，不能有歌词文字）`)
    if (!Number.isFinite(line.t) || line.t < 0 || line.t > duration) errors.push(`${WORKSHOP_TIMING_FILE}：第 ${i + 1} 行时间无效`)
    else if (line.t < last) errors.push(`${WORKSHOP_TIMING_FILE}：第 ${i + 1} 行时间比上一行早`)
    else last = line.t
    if (line.e !== undefined && !(Number.isFinite(line.e) && line.e >= line.t)) errors.push(`${WORKSHOP_TIMING_FILE}：第 ${i + 1} 行结束时间无效`)
    if (typeof line.h !== 'string' || !/^[0-9a-f]{16}$/.test(line.h)) errors.push(`${WORKSHOP_TIMING_FILE}：第 ${i + 1} 行哈希应为 16 位十六进制`)
    if (line.n !== undefined && !(Number.isInteger(line.n) && line.n >= 0 && line.n < 1000)) errors.push(`${WORKSHOP_TIMING_FILE}：第 ${i + 1} 行 n 无效`)
    if (line.w !== undefined && !(Array.isArray(line.w) && line.w.length <= 400 && line.w.every(x => Number.isFinite(x) && x >= 0))) errors.push(`${WORKSHOP_TIMING_FILE}：第 ${i + 1} 行 w 应为逐词时间（数字数组）`)
  })
  return { errors: errors.slice(0, 20) }
}

/** Heuristic: does a JSON value look like it carries lyric text (arrays of objects with text-ish fields)? */
export function looksLikeLyricText(value) {
  let hits = 0
  const visit = (v, depth) => {
    if (depth > 6 || hits > 5) return
    if (Array.isArray(v)) {
      const texty = v.filter(x => isObject(x) && ['text', 'en', 'zh', 'line', 'lyric', 'lyrics'].some(k => typeof x[k] === 'string' && x[k].trim().length > 1) && ['time', 't', 'start'].some(k => Number.isFinite(x[k])))
      if (texty.length >= 4) hits++
      for (const x of v.slice(0, 200)) visit(x, depth + 1)
    } else if (isObject(v)) for (const x of Object.values(v)) visit(x, depth + 1)
    else if (typeof v === 'string' && (v.match(/^\s*\[\d{1,3}:\d{2}[.:]\d{1,3}\]/gm) ?? []).length >= 3) hits++
  }
  visit(value, 0)
  return hits > 0
}

/**
 * Validate one workshop pack. `files` = [{ path, size }] relative to packs/<id>/,
 * `readText(path)` returns a file's text (only called for text files).
 * Returns { errors, warnings, pack, meta } where meta feeds index.json.
 */
export async function validateWorkshopPack({ id, files, readText }) {
  const errors = [], warnings = []
  if (!ID_PATTERN.test(String(id))) errors.push(`包 id「${id}」无效：只能用小写字母、数字和 -（3–64 个字符）`)
  if (!Array.isArray(files) || !files.length) return { errors: [...errors, '包是空的'], warnings }
  if (files.length > WORKSHOP_LIMITS.maxFiles) errors.push(`文件太多（上限 ${WORKSHOP_LIMITS.maxFiles}）`)
  let total = 0
  for (const file of files) {
    const name = file.path.split('/').pop()
    const ext = extOf(name)
    total += file.size
    if (!PATH_PATTERN.test(file.path) || file.path.split('/').some(part => part === '..' || part.startsWith('.'))) { errors.push(`文件路径不允许：${file.path}（只能用字母数字 . _ -，最多两层子文件夹，不能以 . 开头）`); continue }
    if (WORKSHOP_BANNED_EXT.includes(ext)) { errors.push(`不允许上传音频 / 视频 / 歌词文件：${file.path}`); continue }
    if (BANNED_NAMES.test(name) && file.path !== WORKSHOP_TIMING_FILE) { errors.push(`不允许上传歌词文件：${file.path}（只提交 ${WORKSHOP_TIMING_FILE} 时间轴）`); continue }
    if (!WORKSHOP_ALLOWED_EXT.includes(ext)) { errors.push(`不支持的文件类型：${file.path}`); continue }
    const isImage = ['.png', '.webp', '.jpg', '.jpeg'].includes(ext)
    const max = isImage ? WORKSHOP_LIMITS.coverBytes : ['.js', '.mjs'].includes(ext) ? WORKSHOP_LIMITS.scriptBytes : WORKSHOP_LIMITS.fileBytes
    if (file.size > max) errors.push(`${file.path} 太大（上限 ${Math.round(max / 1024)} KB）`)
  }
  if (total > WORKSHOP_LIMITS.packBytes) errors.push(`整个包太大（上限 ${WORKSHOP_LIMITS.packBytes / 1048576} MB）`)
  const paths = new Set(files.map(f => f.path))
  if (!paths.has('mv.json')) return { errors: [...errors, '缺少 mv.json'], warnings }
  let pack = null, raw = null
  try {
    const text = await readText('mv.json')
    raw = JSON.parse(text)
    pack = parseMvPack(text)
  } catch (error) {
    errors.push(`mv.json 无效：${(error?.problems ?? [error?.message ?? String(error)]).join('；')}`)
    return { errors, warnings }
  }
  const ws = isObject(raw['x-dsh-mv-workshop']) ? raw['x-dsh-mv-workshop'] : null
  if (!ws) errors.push('mv.json 缺少 "x-dsh-mv-workshop"（id、version、license、author）')
  else {
    if (ws.id !== id) errors.push(`x-dsh-mv-workshop.id 应与文件夹名一致：${id}`)
    if (!VERSION_PATTERN.test(String(ws.version ?? ''))) errors.push('x-dsh-mv-workshop.version 应为 x.y.z')
    if (typeof ws.license !== 'string' || !ws.license.trim()) errors.push('x-dsh-mv-workshop.license 必填（例如 CC-BY-NC-SA-4.0、CC-BY-4.0、MIT）')
    if (typeof ws.author !== 'string' || !ws.author.trim()) errors.push('x-dsh-mv-workshop.author 必填（GitHub 用户名或署名）')
  }
  if (raw.audio !== undefined) errors.push('mv.json 不能包含 "audio"：工坊包不带音频，用户用自己的音频播放（发布时会自动去掉）')
  if (raw.lyrics !== undefined) errors.push('mv.json 不能包含 "lyrics"：工坊包不带歌词文本，只带时间轴 lyrics.timing.json')
  if (raw.spectrum !== undefined) errors.push('mv.json 不能包含 "spectrum"：频谱由用户自己的音频实时分析')
  if (pack.canvas?.renderer === 'script') {
    const script = pack.canvas.script
    if (!script || !paths.has(script)) errors.push(`canvas.script 指向的文件不在包里：${script ?? '(空)'}`)
  }
  for (const name of Object.keys(pack.canvas?.assets ?? {})) {
    for (const ref of assetParts(pack, name)) if (!paths.has(ref)) errors.push(`canvas.assets.${name} 指向的文件不在包里：${ref}`)
  }
  if (pack.canvas?.renderer === 'world-execute-me') errors.push('canvas.renderer "world-execute-me" 自 0.9.0 起不再内置：请把场景写成 scene script（renderer "script"）')
  if (pack.canvas?.renderer === 'dsh-pv' && !['timeline', 'chat', 'band'].every(n => pack.canvas?.assets?.[n])) errors.push('dsh-pv 渲染器需要 canvas.assets 里的 timeline、chat、band')
  if (ws?.source !== undefined && !(typeof ws.source === 'string' && /^https:\/\/[^\s"<>]{3,300}$/.test(ws.source))) errors.push('x-dsh-mv-workshop.source 应是 https:// 链接（原作的仓库或主页）')
  for (const file of files.filter(f => ['.js', '.mjs'].includes(extOf(f.path)))) {
    const result = checkScriptSafety(await readText(file.path), file.path)
    errors.push(...result.errors); warnings.push(...result.warnings)
  }
  let timing = null
  for (const file of files.filter(f => extOf(f.path) === '.json' && f.path !== 'mv.json')) {
    let value
    try { value = JSON.parse(await readText(file.path)) } catch { errors.push(`${file.path} 不是有效的 JSON`); continue }
    if (file.path === WORKSHOP_TIMING_FILE) { timing = value; errors.push(...checkTiming(value, pack.duration ?? 36_000).errors) }
    else if (looksLikeLyricText(value)) errors.push(`${file.path} 看起来包含歌词文本（不允许）`)
  }
  for (const file of files.filter(f => ['.md', '.txt'].includes(extOf(f.path)))) {
    const text = await readText(file.path)
    if ((text.match(/^\s*\[\d{1,3}:\d{2}[.:]\d{1,3}\]/gm) ?? []).length >= 3) errors.push(`${file.path} 看起来包含带时间轴的歌词（不允许）`)
  }
  if (ws?.lyricsTiming && !paths.has(ws.lyricsTiming)) errors.push(`x-dsh-mv-workshop.lyricsTiming 指向的文件不在包里：${ws.lyricsTiming}`)
  const cover = COVER_NAMES.find(name => paths.has(name)) ?? null
  if (!cover) warnings.push('没有封面（cover.webp / cover.png / cover.jpg）')
  if (!paths.has('README.md')) warnings.push('没有 README.md')
  const audioDuration = Number.isFinite(ws?.audio?.duration) ? ws.audio.duration : pack.duration
  if (!audioDuration) warnings.push('没有写歌曲时长（duration 或 x-dsh-mv-workshop.audio.duration），安装后无法检查用户的音频是否匹配')
  const meta = {
    id, title: pack.title, artist: pack.artist ?? '', author: String(ws?.author ?? '').slice(0, 120), license: String(ws?.license ?? '').slice(0, 120),
    version: String(ws?.version ?? ''), duration: audioDuration ? Math.round(audioDuration * 1000) / 1000 : null,
    renderer: pack.canvas?.renderer ?? 'generic', description: String(ws?.description ?? pack.notice ?? '').slice(0, 500),
    tags: Array.isArray(ws?.tags) ? ws.tags.filter(t => typeof t === 'string').map(t => t.slice(0, 24)).slice(0, 8) : [],
    homepage: typeof ws?.homepage === 'string' && /^https:\/\//.test(ws.homepage) ? ws.homepage.slice(0, 300) : undefined,
    source: typeof ws?.source === 'string' && /^https:\/\/[^\s"<>]{3,300}$/.test(ws.source) ? ws.source : undefined,
    cover, fingerprint: Boolean(pack.workshop?.audio?.fingerprint), timing: Boolean(timing), sections: pack.sections?.length ?? 0,
  }
  return { errors, warnings, pack, meta }
}

/** Sanitise index.json for the panel (drops malformed entries). */
export function parseWorkshopIndex(value) {
  if (!isObject(value) || value.format !== WORKSHOP_INDEX_FORMAT || value.version !== 1 || !Array.isArray(value.packs)) throw new Error('工坊索引格式不对（index.json）')
  const commit = typeof value.commit === 'string' && /^[0-9a-f]{7,40}$/.test(value.commit) ? value.commit : WORKSHOP_BRANCH
  const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '')
  const packs = []
  for (const p of value.packs.slice(0, WORKSHOP_LIMITS.maxPacks)) {
    if (!isObject(p) || !ID_PATTERN.test(String(p.id)) || !Array.isArray(p.files)) continue
    const files = p.files.filter(f => isObject(f) && typeof f.path === 'string' && PATH_PATTERN.test(f.path) && !f.path.split('/').some(x => x.startsWith('.')) && Number.isInteger(f.size) && f.size >= 0 && SHA256_PATTERN.test(String(f.sha256)) && !WORKSHOP_BANNED_EXT.includes(extOf(f.path)))
    if (!files.some(f => f.path === 'mv.json') || files.length !== p.files.length || files.length > WORKSHOP_LIMITS.maxFiles) continue
    packs.push({
      id: p.id, title: str(p.title, 200) || p.id, artist: str(p.artist, 200), author: str(p.author, 120), license: str(p.license, 120) || WORKSHOP_DEFAULT_LICENSE,
      version: VERSION_PATTERN.test(String(p.version)) ? p.version : '0.0.0', duration: Number.isFinite(p.duration) ? p.duration : null,
      renderer: str(p.renderer, 40), description: str(p.description, 500), tags: Array.isArray(p.tags) ? p.tags.filter(t => typeof t === 'string').slice(0, 8).map(t => t.slice(0, 24)) : [],
      homepage: typeof p.homepage === 'string' && /^https:\/\//.test(p.homepage) ? p.homepage.slice(0, 300) : '',
      source: typeof p.source === 'string' && /^https:\/\/[^\s"<>]{3,300}$/.test(p.source) ? p.source : '',
      cover: typeof p.cover === 'string' && COVER_NAMES.includes(p.cover) && files.some(f => f.path === p.cover) ? p.cover : '',
      fingerprint: p.fingerprint === true, timing: p.timing === true, sections: Number.isInteger(p.sections) ? p.sections : 0,
      updated: str(p.updated, 40), size: files.reduce((s, f) => s + f.size, 0), files,
    })
  }
  return { commit, generated: str(value.generated, 40), repo: str(value.repo, 100) || WORKSHOP_REPO, packs }
}

/** Raw URL of a file of a pack at the index's commit. */
export const workshopFileUrl = (commit, id, path) => `${WORKSHOP_RAW}/${WORKSHOP_REPO}/${commit}/packs/${id}/${path.split('/').map(encodeURIComponent).join('/')}`

/** Compare dotted versions: 1 if a > b, -1 if a < b, 0 if equal. */
export function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number)
  for (let i = 0; i < 3; i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d > 0 ? 1 : -1 }
  return 0
}

/** Filter / search the catalogue (title, artist, author, tags; license and renderer filters). */
export function filterWorkshop(packs, { query = '', license = '', renderer = '', installed = null, onlyInstalled = false } = {}) {
  const q = normalizeLyricLine(query)
  return packs.filter(p => {
    if (license && !p.license.toLowerCase().includes(license.toLowerCase())) return false
    if (renderer && p.renderer !== renderer) return false
    if (onlyInstalled && !installed?.[p.id]) return false
    if (!q) return true
    return [p.title, p.artist, p.author, p.description, ...(p.tags ?? [])].some(v => normalizeLyricLine(v).includes(q))
  })
}

// ---- audio fingerprint (energy-2hz-v1) -----------------------------------------------------------
// RMS energy of the mono signal in 0.5 s windows, log-scaled to 0..255. It is a coarse "shape" of the
// song: enough to tell whether the user's audio is the same recording/edit, useless for rebuilding it.

/** Fingerprint bytes from mono PCM samples. */
export function energyFingerprint(samples, sampleRate) {
  const win = Math.max(1, Math.round(sampleRate / 2))
  const count = Math.min(3000, Math.floor(samples.length / win))
  const out = new Uint8Array(count)
  for (let i = 0; i < count; i++) {
    let sum = 0
    for (let j = i * win, end = j + win; j < end; j += 4) sum += samples[j] * samples[j]
    const rms = Math.sqrt(sum / (win / 4))
    const db = 20 * Math.log10(rms + 1e-6)              // −120 … 0 dBFS
    out[i] = Math.max(0, Math.min(255, Math.round((db + 60) / 60 * 255)))
  }
  return out
}

export const encodeFingerprint = bytes => btoa(String.fromCharCode(...bytes))
export function decodeFingerprint(text) {
  try { const s = atob(String(text)); return Uint8Array.from(s, c => c.charCodeAt(0)) } catch { return new Uint8Array(0) }
}

/** Best normalised correlation of two fingerprints over offsets of ±maxShift windows. */
export function compareFingerprints(a, b, maxShift = 20) {
  if (!a?.length || !b?.length) return { score: 0, shift: 0 }
  let best = { score: -1, shift: 0 }
  for (let shift = -maxShift; shift <= maxShift; shift++) {
    let n = 0, sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0
    for (let i = Math.max(0, -shift); i < a.length && i + shift < b.length; i++) {
      const x = a[i], y = b[i + shift]
      n++; sa += x; sb += y; saa += x * x; sbb += y * y; sab += x * y
    }
    if (n < 20) continue
    const cov = sab - sa * sb / n, va = saa - sa * sa / n, vb = sbb - sb * sb / n
    const score = va > 0 && vb > 0 ? cov / Math.sqrt(va * vb) : 0
    if (score > best.score) best = { score, shift }
  }
  return { score: Math.round(Math.max(0, best.score) * 1000) / 1000, shift: best.shift / 2 }
}

/**
 * Does the user's audio match the pack? { ok, level: 'ok' | 'warn' | 'unknown', message }.
 * Duration within 2 s and (when both have one) fingerprint correlation ≥ 0.8.
 */
export function audioMatch(expected, actual) {
  if (!expected?.duration) return { ok: true, level: 'unknown', message: '这个工坊包没有记录歌曲时长，无法检查音频是否匹配。' }
  const diff = Math.abs((actual?.duration ?? 0) - expected.duration)
  const lines = []
  let ok = diff <= 2
  if (!ok) lines.push(`时长不一致：工坊包按 ${expected.duration.toFixed(1)} 秒制作，你的音频 ${Number(actual?.duration ?? 0).toFixed(1)} 秒（可能是不同版本 / 剪辑），画面可能对不上。`)
  if (expected.fingerprint && actual?.fingerprint) {
    const r = compareFingerprints(decodeFingerprint(expected.fingerprint), actual.fingerprint)
    if (r.score < 0.8) { ok = false; lines.push(`音频指纹相似度 ${Math.round(r.score * 100)}%（低于 80%）：可能不是同一个录音版本。`) }
    else if (Math.abs(r.shift) >= 0.5) lines.push(`音频指纹匹配（${Math.round(r.score * 100)}%），但整体偏移约 ${r.shift > 0 ? '+' : ''}${r.shift} 秒，可以用音频偏移键调整。`)
    else lines.push(`音频指纹匹配（${Math.round(r.score * 100)}%）。`)
  }
  return { ok, level: ok ? 'ok' : 'warn', message: lines.join('\n') || `时长匹配（相差 ${diff.toFixed(1)} 秒）。` }
}

/**
 * Re-time the user's own lyric cues with a pack's lyrics.timing.json. `hashOf(text)` returns the 16-hex hash
 * of normalizeLyricLine(text) (sha256 prefix). Lines are matched in order by hash; matched cues take the pack's
 * times and word stamps (as many words as the user's line has). Returns { cues, matched, total }.
 */
export async function retimeCues(cues, timing, hashOf) {
  const lines = Array.isArray(timing?.lines) ? timing.lines : []
  if (!lines.length || !cues.length) return { cues, matched: 0, total: lines.length }
  const hashes = await Promise.all(cues.map(c => hashOf(normalizeLyricLine(c.en || c.zh || ''))))
  let from = 0, matched = 0
  const out = cues.map(c => ({ ...c }))
  for (let i = 0; i < out.length; i++) {
    let found = -1
    for (let j = from; j < Math.min(lines.length, from + 40); j++) if (lines[j].h === hashes[i]) { found = j; break }
    if (found < 0) continue
    const line = lines[found]
    out[i].time = line.t
    if (Number.isFinite(line.e)) out[i].end = line.e
    if (Array.isArray(line.w) && line.w.length) {
      const words = String(out[i].en || out[i].zh || '').split(/\s+/).filter(Boolean)
      if (words.length === line.w.length) out[i].words = words.map((text, k) => ({ text, time: line.w[k] }))
    }
    from = found + 1; matched++
  }
  for (let i = 0; i < out.length; i++) if (!Number.isFinite(out[i].end) || out[i].end <= out[i].time) out[i].end = out[i + 1]?.time ?? out[i].time + 4
  return { cues: out, matched, total: lines.length }
}

/** The GitHub pages a contributor uses to submit a prepared pack (no API, no token). */
export function publishLinks(id) {
  const repo = `https://github.com/${WORKSHOP_REPO}`
  return {
    repo,
    upload: `${repo}/upload/${WORKSHOP_BRANCH}/packs/${encodeURIComponent(id)}`,
    fork: `${repo}/fork`,
    compare: `${repo}/compare`,
    contributing: `${repo}/blob/${WORKSHOP_BRANCH}/CONTRIBUTING.md`,
    issues: `${repo}/issues/new?title=${encodeURIComponent(`[pack] ${id}`)}`,
  }
}

// ---- request parsers (Typert gateway + Host) ------------------------------------------------------
const onlyKeys = (value, keys, subject) => {
  if (!isObject(value)) throw new TypeError(`${subject} must be an object`)
  const extra = Object.keys(value).filter(k => !keys.includes(k))
  if (extra.length) throw new TypeError(`${subject} has unexpected fields: ${extra.join(', ')}`)
  return value
}
const packId = v => { if (typeof v !== 'string' || !ID_PATTERN.test(v)) throw new TypeError('工坊包 id 无效'); return v }

export function parseWorkshopIndexRequest(value = {}) {
  onlyKeys(value ?? {}, ['refresh'], 'workshop index request')
  return { refresh: value?.refresh === true }
}
export function parseWorkshopId(value) {
  onlyKeys(value, ['id'], 'workshop request')
  return { id: packId(value.id) }
}
export function parseWorkshopInstalled(value = {}) {
  onlyKeys(value ?? {}, [], 'workshop installed request')
  return {}
}
export function parseWorkshopPublish(value) {
  onlyKeys(value, ['manifestPath', 'id', 'version', 'license', 'author', 'description', 'tags', 'homepage', 'duration', 'fingerprint', 'coverPng'], 'workshop publish request')
  const str = (v, n, name, required = false) => {
    if (v === undefined || v === '') { if (required) throw new TypeError(`${name} 必填`); return '' }
    if (typeof v !== 'string' || v.length > n || /[\0\r]/.test(v)) throw new TypeError(`${name} 无效`)
    return v.trim()
  }
  if (typeof value.manifestPath !== 'string' || !value.manifestPath.trim() || value.manifestPath.length > 1000) throw new TypeError('manifestPath 无效')
  const version = str(value.version, 20, 'version', true)
  if (!VERSION_PATTERN.test(version)) throw new TypeError('version 应为 x.y.z')
  const tags = value.tags === undefined ? [] : value.tags
  if (!Array.isArray(tags) || tags.length > 8 || !tags.every(t => typeof t === 'string' && t.length <= 24)) throw new TypeError('tags 无效（最多 8 个，每个不超过 24 字符）')
  const homepage = str(value.homepage, 300, 'homepage')
  if (homepage && !/^https:\/\/[^\s]+$/.test(homepage)) throw new TypeError('homepage 必须是 https:// 链接')
  if (value.duration !== undefined && !(Number.isFinite(value.duration) && value.duration > 0 && value.duration <= 36_000)) throw new TypeError('duration 无效')
  if (value.fingerprint !== undefined && !(typeof value.fingerprint === 'string' && /^[A-Za-z0-9+/=]{1,4096}$/.test(value.fingerprint))) throw new TypeError('fingerprint 无效')
  if (value.coverPng !== undefined && !(typeof value.coverPng === 'string' && value.coverPng.length <= 1_400_000 && /^[A-Za-z0-9+/=]+$/.test(value.coverPng))) throw new TypeError('coverPng 无效（base64 PNG，最大约 1 MB）')
  return {
    manifestPath: value.manifestPath.trim(), id: packId(value.id), version,
    license: str(value.license, 120, 'license', true), author: str(value.author, 120, 'author', true),
    description: str(value.description, 500, 'description'), tags: tags.map(t => t.trim()).filter(Boolean), homepage,
    duration: value.duration, fingerprint: value.fingerprint, coverPng: value.coverPng,
  }
}
