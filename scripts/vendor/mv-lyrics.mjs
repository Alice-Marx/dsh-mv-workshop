/**
 * Lyric loaders. The plugin ships no lyric text: the user picks an LRC / SRT
 * file (bilingual: one English line and one Chinese line per cue, or two
 * timestamps with the same time), or the `lyrics.json` of their own local
 * world.execute-me-ascii copy, or a data-only LYRICS array in a local JS module.
 * Nothing from a lyric module is executed. Everything becomes `{ time, end, en, zh }`.
 */

const CJK = /[\u3000-\u303f\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]/

/** Split one cue's text lines into the English and Chinese rows. */
export function splitBilingual(lines) {
  const en = [], zh = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    // "English / 中文" or "English | 中文" on one line.
    const parts = line.split(/\s+[/|｜]\s+/)
    if (parts.length === 2 && !CJK.test(parts[0]) && CJK.test(parts[1])) { en.push(parts[0]); zh.push(parts[1]); continue }
    ;(CJK.test(line) ? zh : en).push(line)
  }
  return { en: en.join(' '), zh: zh.join(' ') }
}

function finish(cues, duration) {
  const sorted = cues.filter(c => Number.isFinite(c.time) && (c.en || c.zh)).sort((a, b) => a.time - b.time)
  for (let i = 0; i < sorted.length; i++) {
    const next = sorted[i + 1]
    if (!Number.isFinite(sorted[i].end) || sorted[i].end <= sorted[i].time) {
      sorted[i].end = next ? next.time : Math.min(duration, sorted[i].time + 5)
    }
  }
  return sorted.map(({ time, end, en, zh, words }) => ({ time: round3(time), end: round3(end), en: en ?? '', zh: zh ?? '', ...(words?.length ? { words } : {}) }))
}

const round3 = v => Math.round(v * 1000) / 1000

const WORD_STAMP = /<(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)>/g

/** Enhanced LRC (A2): `<mm:ss.xx>word <mm:ss.xx>word` → plain text + [{ text, time }]. */
export function splitWordStamps(line, shift = 0) {
  if (!/<\d{1,3}:\d{1,2}/.test(line)) return { text: line, words: null }
  const words = []
  let text = '', at = null, m, last = 0
  WORD_STAMP.lastIndex = 0
  const push = chunk => {
    text += chunk
    if (at !== null && chunk.trim()) words.push({ text: chunk.trim(), time: round3(at + shift) })
  }
  while ((m = WORD_STAMP.exec(line))) { push(line.slice(last, m.index)); at = Number(m[1]) * 60 + Number(m[2].replace(':', '.')); last = m.index + m[0].length }
  push(line.slice(last))
  return { text: text.replace(/\s+/g, ' ').trim(), words: words.length ? words : null }
}

/** `[mm:ss.xx]` LRC (several stamps per line, `[offset:±ms]` and enhanced `<mm:ss.xx>` word stamps supported). */
export function parseLrc(text, { duration = 1e9 } = {}) {
  const byTime = new Map()
  let offsetMs = 0
  const order = []
  for (const raw of String(text).replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const tag = /^\s*\[offset:\s*([+-]?\d+)\s*\]/i.exec(raw)
    if (tag) { offsetMs = Number(tag[1]); continue }
    const stamps = []
    let rest = raw
    let m
    while ((m = /^\s*\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/.exec(rest))) {
      stamps.push(Number(m[1]) * 60 + Number(m[2].replace(':', '.')))
      rest = rest.slice(m[0].length)
    }
    if (!stamps.length) continue
    for (const t of stamps) {
      const key = round3(t)
      if (!byTime.has(key)) { byTime.set(key, []); order.push(key) }
      byTime.get(key).push(rest)
    }
  }
  // LRC offset: positive values make lyrics appear sooner.
  const shift = -offsetMs / 1000
  const cues = []
  for (const t of order) {
    const lines = byTime.get(t)
    if (lines.every(line => !line.trim())) { cues.push({ time: t + shift, blank: true }); continue }
    let words = null
    const plain = lines.map(line => { const split = splitWordStamps(line, shift); if (split.words && !words) words = split.words; return split.text })
    cues.push({ time: t + shift, ...splitBilingual(plain), ...(words ? { words } : {}) })
  }
  // A blank stamped line ends the previous cue.
  cues.sort((a, b) => a.time - b.time)
  const out = []
  for (const cue of cues) {
    if (cue.blank) { const prev = out.at(-1); if (prev && !Number.isFinite(prev.end)) prev.end = cue.time; continue }
    out.push(cue)
  }
  return finish(out, duration)
}

const SRT_TIME = /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/
const srtSeconds = m => Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4].padEnd(3, '0')) / 1000

/** SubRip (also accepts WebVTT-style `.` separators). */
export function parseSrt(text, { duration = 1e9 } = {}) {
  const blocks = String(text).replace(/^\uFEFF/, '').replace(/\r/g, '').split(/\n\s*\n/)
  const cues = []
  for (const block of blocks) {
    const lines = block.split('\n')
    const at = lines.findIndex(line => line.includes('-->'))
    if (at < 0) continue
    const [a, b] = lines[at].split('-->')
    const ma = SRT_TIME.exec(a), mb = SRT_TIME.exec(b)
    if (!ma) continue
    const body = lines.slice(at + 1).map(line => line.replace(/<[^>]+>/g, ''))
    cues.push({ time: srtSeconds(ma), end: mb ? srtSeconds(mb) : NaN, ...splitBilingual(body) })
  }
  return finish(cues, duration)
}

/** JSON cues: `[{time,end,en,zh}]` or the equivalent `{t,en,cn}` fields. */
export function parseLyricsJson(text, { duration = 1e9 } = {}) {
  const data = typeof text === 'string' ? JSON.parse(text.replace(/^\uFEFF/, '')) : text
  const list = Array.isArray(data) ? data : Array.isArray(data?.lyrics) ? data.lyrics : null
  if (!list) throw new Error('歌词 JSON 应为 [{ time, end, en, zh }] 数组。')
  return finish(list.map(item => ({
    time: Number(item?.time ?? item?.t), end: Number(item?.end),
    en: typeof item?.en === 'string' ? item.en : '',
    zh: typeof item?.zh === 'string' ? item.zh : typeof item?.cn === 'string' ? item.cn : '',
    words: jsonWords(item?.words),
  })), duration)
}

function jsonWords(value) {
  if (value === undefined || value === null) return undefined
  if (!Array.isArray(value) || value.length > 400 || value.some(w => !w || typeof w.text !== 'string' || !Number.isFinite(w.time))) throw new Error('歌词 words 应为最多 400 个 { text, time }，不能截断或丢弃逐词时间。')
  return value.map(w => ({ text: w.text, time: w.time }))
}

/** Recognition only; the parser below checks tokens and never imports/evaluates JS. */
const JS_GAP = String.raw`(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*(?:\r\n?|\n|$))*`
const JS_LYRICS_DECL = new RegExp(`\\b(?:const|let|var)\\b${JS_GAP}LYRICS\\b${JS_GAP}=`, 'i')
export const looksLikeLyricsJs = text => {
  const body = String(text)
  // JSON text may quote a declaration; keep it JSON, and avoid repeatedly
  // scanning leading whitespace from every line of a large plain text file.
  return !/^\s*[\[{]/.test(body) && JS_LYRICS_DECL.test(body)
}

/** Small bounded literal reader, not a JavaScript interpreter. */
function lyricModuleReader(text) {
  const source = String(text).replace(/^\uFEFF/, '')
  if (source.length > 2 * 1024 * 1024) throw new Error('歌词 JS 超过 2 Mi 字符限制。')
  let at = 0, cached = null, items = 0, literalMode = false, regexAllowed = true
  const numberPattern = /[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/iy
  const fail = message => { throw new Error(`歌词 JS：${message}（位置 ${at}）。只读取 LYRICS 静态数组，不执行代码。`) }
  const token = () => {
    while (at < source.length) {
      if (/\s/.test(source[at])) { at++; continue }
      if (source.startsWith('//', at)) { while (at < source.length && !/[\r\n]/.test(source[at])) at++; continue }
      if (source.startsWith('/*', at)) { const end = source.indexOf('*/', at + 2); if (end < 0) fail('注释未闭合'); at = end + 2; continue }
      break
    }
    if (at >= source.length) return { kind: 'eof', value: '' }
    const c = source[at++]
    // Regex literals in ignored module glue must not look like declarations.
    if (!literalMode && c === '/' && regexAllowed) {
      let inClass = false, closed = false
      while (at < source.length) {
        const ch = source[at++]
        if (/[\r\n]/.test(ch)) fail('前置正则字面量未闭合')
        if (ch === '\\') { at++; continue }
        if (ch === '[') inClass = true
        if (ch === ']') inClass = false
        if (ch === '/' && !inClass) { closed = true; break }
      }
      if (!closed) fail('前置正则字面量未闭合')
      while (at < source.length && /[a-z]/i.test(source[at])) at++
      return { kind: 'opaque', value: '' }
    }
    if (c === '"' || c === "'" || c === '`') {
      let value = '', closed = false
      while (at < source.length) {
        const ch = source[at++]
        if (ch === c) { closed = true; break }
        if (c === '`' && ch === '$' && source[at] === '{') fail('不支持模板插值')
        if (c !== '`' && /[\r\n]/.test(ch)) fail('字符串未闭合')
        if (ch !== '\\') { value += ch; continue }
        if (at >= source.length) fail('字符串转义未闭合')
        const esc = source[at++]
        if (esc === '\n') continue
        if (esc === '\r') { if (source[at] === '\n') at++; continue }
        const simple = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '0': '\0', '\\': '\\', '"': '"', "'": "'", '`': '`', '/': '/', '$': '$' }
        if (Object.hasOwn(simple, esc)) {
          if (esc === '0' && /\d/.test(source[at] ?? '')) fail('不支持八进制转义')
          value += simple[esc]; continue
        }
        if (esc === 'x' || esc === 'u') {
          let hex
          if (esc === 'u' && source[at] === '{') {
            const end = source.indexOf('}', ++at)
            if (end < 0) fail('Unicode 转义未闭合')
            hex = source.slice(at, end)
            if (!/^[\da-f]{1,6}$/i.test(hex) || parseInt(hex, 16) > 0x10ffff) fail('Unicode 转义无效')
            at = end + 1
          } else {
            const size = esc === 'x' ? 2 : 4
            hex = source.slice(at, at + size)
            if (!(size === 2 ? /^[\da-f]{2}$/i : /^[\da-f]{4}$/i).test(hex)) fail('字符串转义无效')
            at += size
          }
          value += String.fromCodePoint(parseInt(hex, 16)); continue
        }
        fail('不支持的字符串转义')
      }
      if (!closed) fail('字符串未闭合')
      return { kind: 'string', value }
    }
    if (/[A-Za-z_$]/.test(c)) {
      const start = at - 1
      while (at < source.length && /[\w$]/.test(source[at])) at++
      return { kind: 'id', value: source.slice(start, at) }
    }
    if (/[\d.+-]/.test(c)) {
      numberPattern.lastIndex = at - 1
      const match = numberPattern.exec(source)
      if (match) { at += match[0].length - 1; return { kind: 'number', value: Number(match[0]) } }
    }
    if (c === '=' && source[at] === '>') { at++; return { kind: 'punct', value: '=>' } }
    return { kind: 'punct', value: c }
  }
  const peek = () => cached ?? (cached = token())
  const next = () => {
    const result = peek(); cached = null
    regexAllowed = result.kind === 'punct' && /^(?:[=(:,;!&|?{}]|=>)$/.test(result.value)
      || result.kind === 'id' && ['return', 'throw', 'case', 'typeof', 'void', 'delete', 'yield', 'await'].includes(result.value)
    return result
  }
  const isPunct = (t, value) => t.kind === 'punct' && t.value === value
  const expect = value => { if (!isPunct(next(), value)) fail(`期望 ${value}`) }
  const literal = (depth = 0) => {
    if (depth > 3 || ++items > 100_000) fail('数据结构过深或过大')
    const t = next()
    if (t.kind === 'string') return t.value
    if (t.kind === 'number' && Number.isFinite(t.value)) return t.value
    if (t.kind === 'id' && ['null', 'true', 'false'].includes(t.value)) return t.value === 'null' ? null : t.value === 'true'
    if (isPunct(t, '[')) {
      const array = []
      while (!isPunct(peek(), ']')) {
        if (array.length >= 10_000) fail('数组超过 10000 项')
        array.push(literal(depth + 1))
        if (isPunct(peek(), ']')) break
        expect(',')
      }
      expect(']'); return array
    }
    if (isPunct(t, '{')) {
      const object = Object.create(null)
      while (!isPunct(peek(), '}')) {
        const key = next()
        if (!['id', 'string'].includes(key.kind) || ['__proto__', 'constructor', 'prototype'].includes(key.value)) fail('不允许计算键、展开、方法或原型字段')
        if (Object.hasOwn(object, key.value)) fail('重复字段')
        expect(':'); object[key.value] = literal(depth + 1)
        if (isPunct(peek(), '}')) break
        expect(',')
      }
      expect('}'); return object
    }
    fail('数组里只能使用字符串、有限数字和静态对象，不能使用表达式或函数调用')
  }
  // The upstream module has imports and helpers BEFORE LYRICS. Tokenize them
  // without evaluating them; strings/comments cannot masquerade as declarations.
  let depth = 0, state = 0
  for (let t = next(); t.kind !== 'eof'; t = next()) {
    if (depth === 0 && t.kind === 'id' && ['const', 'let', 'var'].includes(t.value)) { state = 1; continue }
    if (state === 1) { state = t.kind === 'id' && t.value.toUpperCase() === 'LYRICS' ? 2 : 0; if (state) continue }
    else if (state === 2) {
      if (!isPunct(t, '=')) fail('LYRICS 应直接赋值为静态数组')
      literalMode = true
      if (!isPunct(peek(), '[')) fail('LYRICS 应为静态数组')
      const data = literal()
      const after = next()
      if (after.kind !== 'eof' && !isPunct(after, ';')) fail('不允许在数组后调用方法或计算表达式；请用分号结束声明')
      return data
    }
    if (t.kind === 'punct' && ['{', '[', '('].includes(t.value)) depth++
    else if (t.kind === 'punct' && ['}', ']', ')'].includes(t.value)) depth = Math.max(0, depth - 1)
  }
  fail('找不到 const LYRICS = [...] 数据声明')
}

/** wiers-jack-style module: only the literal LYRICS array; other code is ignored. */
export function parseLyricsJs(text, options) {
  const data = lyricModuleReader(text)
  if (!data.every(item => item !== null && typeof item === 'object' && !Array.isArray(item))) throw new Error('歌词 JS 的 LYRICS 应为 [{ t, en, cn }] 或 [{ time, en, zh }] 静态对象数组。')
  const ordered = data.slice().sort((a, b) => Number(a.time ?? a.t) - Number(b.time ?? b.t))
  for (let i = 0; i < ordered.length; i++) {
    const item = ordered[i], next = ordered[i + 1]
    // wiers-jack lyricAt(): hide 80 ms before the next cue and after at most
    // 6.5 seconds, including long instrumental gaps and the final subtitle.
    if (!Object.hasOwn(item, 'time') && Number.isFinite(item.t) && !Object.hasOwn(item, 'end')) {
      const nextTime = Number(next?.time ?? next?.t)
      item.end = Math.min(Number.isFinite(nextTime) ? nextTime - 0.08 : Infinity, item.t + 6.5, options?.duration ?? 1e9)
    }
  }
  return parseLyricsJson(ordered, options)
}

/** Pick the parser from the file name, falling back to sniffing the text. */
export function parseLyrics(name, text, options) {
  const lower = String(name ?? '').toLowerCase()
  const body = String(text)
  if (lower.endsWith('.js') || lower.endsWith('.mjs') || looksLikeLyricsJs(body)) return parseLyricsJs(body, options)
  if (lower.endsWith('.json')) return parseLyricsJson(body, options)
  if (lower.endsWith('.srt') || lower.endsWith('.vtt')) return parseSrt(body, options)
  if (lower.endsWith('.lrc')) return parseLrc(body, options)
  if (/^\uFEFF?\s*(?:\{|\[\s*[{\]])/.test(body)) return parseLyricsJson(body, options)
  if (/-->/.test(body)) return parseSrt(body, options)
  return parseLrc(body, options)
}
