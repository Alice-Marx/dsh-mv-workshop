// scenes.js — "Neon Terminal", a complete multi-section example for dsh-mv scene scripts.
//
// It shows how the small examples in ../*.scene.js fit together in one MV:
//   intro   boot log typed line by line + heartbeat trace      (heartbeat.scene.js)
//   verse   chat window, the lyric typed as the reply, token band (chat-window, token-bar)
//   chorus  spectrum ring, big karaoke lyric, ops ticker       (post-effects, ops-ticker)
//   bridge  heartbeat monitor full screen, slow and dim
//   chorus2 red EXECUTION-style screen with beat glitches      (execution-split)
//   outro   sinking silhouette in marine snow, closing captions (whale-fall)
// plus transitions (1 s fade at section edges) and post effects (scanlines, vignette).
//
// Sections come from mv.json → x-dsh-mv-ai.sections (ctx.section), the beat from canvas.bpm
// (ctx.beat), words from enhanced-LRC word stamps (ctx.lyric.words). This pack has NO audio and
// placeholder lyrics: it plays silently, and the helpers fake motion when ctx.energy is 0. Add
// "audio": { "file": "song.mp3" } and your own lyrics to use it with a real song, then re-time the
// sections and bpm for that song.

// ---- grid helpers (shared by every example; copy them into your own scenes.js) ----------------
// A frame is a grid of cells. ch[y][x] holds one character, st[y][x] its style digit:
// 0 dim, 1 normal, 2 bright, 3 white, 4 red, 5 brown, 6 olive.
// Wide characters (CJK, full-width punctuation) take two cells; the second cell holds '' so that
// lines and styles stay aligned when joined.
var WIDE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/
function cellWidth(c) { return WIDE.test(c) ? 2 : 1 }
function textWidth(s) { var w = 0; for (var c of String(s)) w += cellWidth(c); return w }
function makeGrid(cols, rows) {
  var ch = [], st = []
  for (var y = 0; y < rows; y++) { ch.push(new Array(cols).fill(' ')); st.push(new Array(cols).fill('0')) }
  return { cols: cols, rows: rows, ch: ch, st: st }
}
function setCell(g, x, y, c, s) {
  if (y < 0 || y >= g.rows || x < 0 || x >= g.cols) return
  var row = g.ch[y], sty = g.st[y], w = cellWidth(c)
  if (x + w > g.cols) return
  if (row[x] === '' && x > 0) { row[x - 1] = ' '; sty[x - 1] = '0' }        // we hit the right half of a wide char
  if (w === 1 && row[x + 1] === '') { row[x + 1] = ' '; sty[x + 1] = '0' }  // we cover the left half of one
  if (w === 2 && row[x + 2] === '') { row[x + 2] = ' '; sty[x + 2] = '0' }
  row[x] = c; sty[x] = String(s)
  if (w === 2) { row[x + 1] = ''; sty[x + 1] = '' }
}
function put(g, x, y, text, s) {
  x = Math.round(x); y = Math.round(y)
  for (var c of String(text)) { setCell(g, x, y, c, s); x += cellWidth(c) }
}
function center(g, y, text, s) { put(g, Math.floor((g.cols - textWidth(text)) / 2), y, text, s) }
function fill(g, x, y, w, h, c, s) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) setCell(g, x + i, y + j, c, s) }
function box(g, x, y, w, h, s, title) {
  if (w < 2 || h < 2) return
  for (var i = 1; i < w - 1; i++) { setCell(g, x + i, y, '─', s); setCell(g, x + i, y + h - 1, '─', s) }
  for (var j = 1; j < h - 1; j++) { setCell(g, x, y + j, '│', s); setCell(g, x + w - 1, y + j, '│', s) }
  setCell(g, x, y, '┌', s); setCell(g, x + w - 1, y, '┐', s); setCell(g, x, y + h - 1, '└', s); setCell(g, x + w - 1, y + h - 1, '┘', s)
  if (title) put(g, x + 2, y, ' ' + title + ' ', s)
}
function frameOf(g) { return { lines: g.ch.map(function (r) { return r.join('') }), styles: g.st.map(function (r) { return r.join('') }) } }
// Deterministic pseudo-random numbers: the same (seed, i) always gives the same value, so a frame
// depends only on t and ctx (seeking works, the agent preview matches playback).
function hash(i, seed) { var h = Math.imul((i | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(seed | 0, 0xc2b2ae35); h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)) }
// Silent packs (no audio) get zero bands: fake a little motion from the beat so previews are not dead.
function energyOf(ctx, t) { return ctx.energy > 0.01 ? ctx.energy : 0.25 + 0.2 * (ctx.beat ? ctx.beat.pulse : 0.5 + 0.5 * Math.sin(t * 4)) }
function bandOf(ctx, i, t) { return ctx.energy > 0.01 ? ctx.bands[i] : clamp(0.35 + 0.3 * Math.sin(t * 3 + i * 0.45) * (1 - i / 64) + (ctx.beat ? 0.3 * ctx.beat.pulse : 0), 0, 1) }
// ---- end of grid helpers -------------------------------------------------------------------------

var DOWN = { '3': '2', '2': '1', '1': '0', '0': '0' }
function darker(s) { return DOWN[s] || s }

// ---- shared pieces --------------------------------------------------------------------------------
function karaoke(g, y, ctx, sungStyle, restStyle) {
  if (!ctx.lyric) return
  var line = ctx.lyric.text, words = ctx.lyric.words || [], sung = 0
  for (var i = 0; i <= ctx.lyric.word && i < words.length; i++) { var at = line.indexOf(words[i].text, sung); if (at >= 0) sung = at + words[i].text.length }
  var x = Math.floor((g.cols - textWidth(line)) / 2)
  fill(g, x - 2, y, textWidth(line) + 4, 1, ' ', 0)   // clear a band so the lyric stays readable
  put(g, x, y, line.slice(0, sung), sungStyle)
  put(g, x + textWidth(line.slice(0, sung)), y, line.slice(sung), restStyle)
}
function pqrst(p) { return p < 0.08 ? 0.15 * Math.sin(p / 0.08 * Math.PI) : p < 0.14 ? (p < 0.12 ? 0 : -0.25) : p < 0.18 ? 1 : p < 0.21 ? -0.45 : p > 0.32 && p < 0.45 ? 0.3 * Math.sin((p - 0.32) / 0.13 * Math.PI) : 0 }
function heartbeat(g, y0, h, t, ctx, bright) {
  var bpm = ctx.beat ? ctx.beat.bpm : 120, prev = null
  for (var x = 0; x < g.cols; x++) {
    var age = (g.cols - 1 - x) / g.cols * 4, pos = (t - age) * bpm / 60
    var v = pqrst(pos - Math.floor(pos)) * (0.4 + 0.6 * energyOf(ctx, t))
    var y = y0 - Math.round(v * h), s = age < 0.4 ? bright : age < 2 ? 1 : 0
    if (prev !== null) for (var k = Math.min(prev, y); k <= Math.max(prev, y); k++) setCell(g, x, k, k !== y ? '│' : Math.abs(v) < 0.05 ? '─' : '•', s)
    prev = y
  }
}

// ---- sections -------------------------------------------------------------------------------------
var BOOT = ['[ ok ] mounting /dev/song', '[ ok ] loading weights 0/48 bands', '[ ok ] lyrics: word stamps found', '[ ok ] beat clock: canvas.bpm', '[ .. ] waiting for the first line']
function intro(g, t, ctx, local) {
  for (var i = 0; i < BOOT.length; i++) {
    var shown = Math.floor((local - i * 1.6) * 30)
    if (shown > 0) put(g, 3, 2 + i, BOOT[i].slice(0, shown), i === BOOT.length - 1 && Math.floor(t * 3) % 2 ? 2 : 1)
  }
  heartbeat(g, Math.floor(g.rows * 0.7), Math.floor(g.rows * 0.2), t, ctx, 3)
  center(g, g.rows - 2, ctx.title + (ctx.artist ? ' — ' + ctx.artist : ''), 3)
}

function verse(g, t, ctx) {
  var W = Math.min(g.cols - 4, 60), X = Math.floor((g.cols - W) / 2), H = g.rows - 9
  box(g, X, 1, W, H, 1, 'chat')
  put(g, X + 2, 2, '(◕ᴗ◕) assistant · ' + (ctx.lyric && ctx.lyric.word >= 0 ? '● typing' : '● online'), 2)
  if (ctx.next) put(g, X + W - 3 - Math.min(W - 8, textWidth(ctx.next.text)), 4, ctx.next.text.slice(0, W - 8), 0)
  if (ctx.lyric) {
    var words = ctx.lyric.words || [], shown = ''
    for (var w = 0; w <= ctx.lyric.word && w < words.length; w++) shown += (w ? ' ' : '') + words[w].text
    put(g, X + 3, 6, shown.slice(0, W - 6) + (Math.floor(t * 4) % 2 ? '▌' : ''), 3)
  }
  // token band
  var top = g.rows - 7
  box(g, 1, top, g.cols - 2, 5, 1, 'stdout · tokens')
  var x = 4
  if (ctx.lyric) for (var i = 0; i <= ctx.lyric.word && i < (ctx.lyric.words || []).length; i++) {
    var tok = ctx.lyric.words[i].text, wd = textWidth(tok)
    if (x + wd >= g.cols - 3) break
    fill(g, x, top + 2, wd, 1, '█', i === ctx.lyric.word ? 3 : 1); put(g, x, top + 2, tok, 0); x += wd + 1
  }
}

function chorus(g, t, ctx) {
  var cx = g.cols / 2, cy = g.rows / 2 - 2
  for (var i = 0; i < 48; i++) {
    var a = i / 48 * Math.PI * 2 + t * 0.6, len = 4 + bandOf(ctx, i, t) * Math.min(cx * 0.4, cy * 0.85) * (1 + (ctx.beat ? 0.3 * ctx.beat.pulse : 0))
    for (var r = 4; r < len; r += 0.8) setCell(g, Math.round(cx + Math.cos(a) * r * 2), Math.round(cy + Math.sin(a) * r), r > len - 1.5 ? '●' : '·', r > len - 1.5 ? 2 : 1)
  }
  karaoke(g, Math.round(cy), ctx, 3, 0)
  // ops ticker column on the right
  var ops = ['SAMPLE', 'TOOL.CALL', 'THINK', 'EXECUTE', 'OBSERVE', 'PLAN'], X = g.cols - 13
  for (var y = 1; y < g.rows - 1; y++) {
    var n = Math.floor(t * 4) + y, mark = y === Math.floor(g.rows * 0.6)
    put(g, X, y, ops[n % ops.length], mark ? 3 : Math.abs(y - g.rows * 0.6) < 4 ? 1 : 0)
  }
}

function bridge(g, t, ctx) {
  for (var y = 1; y < g.rows - 1; y += 3) for (var x = 0; x < g.cols; x += 6) setCell(g, x, y, '·', 0)
  heartbeat(g, Math.floor(g.rows / 2), Math.floor(g.rows * 0.3), t, ctx, 2)
  karaoke(g, g.rows - 3, ctx, 2, 0)
}

var FONT = { E: ['###', '#  ', '## ', '#  ', '###'], X: ['# #', ' # ', ' # ', ' # ', '# #'], C: ['###', '#  ', '#  ', '#  ', '###'], U: ['# #', '# #', '# #', '# #', '###'], T: ['###', ' # ', ' # ', ' # ', ' # '], I: ['###', ' # ', ' # ', ' # ', '###'], O: ['###', '# #', '# #', '# #', '###'], N: ['# #', '###', '###', '###', '# #'] }
function chorus2(g, t, ctx) {
  // block letters: cells are about twice as tall as wide, so a pixel is sx wide and sy = sx / 2 tall
  var word = 'EXECUTE', sx = Math.max(1, Math.floor(g.cols * 0.85 / (word.length * 4))), sy = Math.max(1, Math.round(sx / 2))
  var x0 = Math.floor((g.cols - word.length * 4 * sx) / 2), y0 = Math.floor(g.rows / 2 - 2.5 * sy) - 2
  for (var i = 0; i < word.length; i++) { var gl = FONT[word[i]]; for (var r = 0; r < 5; r++) for (var c = 0; c < 3; c++) if (gl[r][c] === '#') fill(g, x0 + (i * 4 + c) * sx, y0 + r * sy, sx, sy, '█', 4) }
  karaoke(g, g.rows - 4, ctx, 4, 0)
  var pulse = ctx.beat ? ctx.beat.pulse : 0, seed = ctx.beat ? ctx.beat.index : Math.floor(t * 2)
  if (pulse > 0.6) for (var y = 0; y < g.rows; y++) if (hash(y, seed) < 0.2 && g.ch[y].indexOf('') < 0) {
    var sh = Math.round((hash(y, seed + 3) - 0.5) * 14)
    g.ch[y] = g.ch[y].slice(-sh).concat(g.ch[y].slice(0, -sh)).slice(0, g.cols); g.st[y] = g.st[y].slice(-sh).concat(g.st[y].slice(0, -sh)).slice(0, g.cols)
  }
}

var WHALE = ['        _.-----._', '   _.-\'          `-._', '<_      o            )', '  `-._         __.-\'', '      `--.__.-\'']
function outro(g, t, ctx, p) {
  var floor = g.rows - 2
  for (var i = 0; i < g.cols * g.rows / 45; i++) setCell(g, Math.floor(hash(i, 1) * g.cols), Math.floor((hash(i, 2) * g.rows + t * (0.5 + i % 3 * 0.6)) % floor), '·', i % 3)
  var wy = Math.round(-5 + p * (floor - 2)), wx = Math.floor(g.cols / 2 - 11)
  for (var r = 0; r < WHALE.length; r++) put(g, wx, wy + r, WHALE[r], p < 0.6 ? 2 : 1)
  fill(g, 0, floor, g.cols, 1, '_', 1)
  if (p > 0.5) put(g, 3, 2, 'fin.'.slice(0, Math.ceil((p - 0.5) * 16)), 2)
  karaoke(g, g.rows - 1, ctx, 2, 0)
}

// ---- the frame ------------------------------------------------------------------------------------
function render(t, cols, rows, ctx) {
  var g = makeGrid(cols, rows)
  var s = ctx.section, kind = s ? s.kind : (ctx.progress < 0.1 ? 'intro' : 'verse'), local = s ? t - s.start : t
  var p = s ? s.progress : ctx.progress
  if (kind === 'intro') intro(g, t, ctx, local)
  else if (kind === 'verse') verse(g, t, ctx)
  else if (kind === 'chorus') (s && s.index > 3 ? chorus2 : chorus)(g, t, ctx)
  else if (kind === 'bridge' || kind === 'instrumental') bridge(g, t, ctx)
  else if (kind === 'outro') outro(g, t, ctx, p)
  else verse(g, t, ctx)
  // transitions: darken everything in the first and last 0.8 s of a section
  if (s) {
    var edge = Math.min(t - s.start, s.end - t)
    var steps = edge < 0.25 ? 2 : edge < 0.8 ? 1 : 0
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) for (var k = 0; k < steps; k++) g.st[y][x] = darker(g.st[y][x])
  }
  // post effects: scanlines + vignette (cheap passes, see ../post-effects.scene.js)
  for (var y2 = 1; y2 < rows; y2 += 2) for (var x2 = 0; x2 < cols; x2++) if (g.st[y2][x2] === '1') g.st[y2][x2] = '0'
  for (var y3 = 0; y3 < rows; y3++) for (var x3 = 0; x3 < cols; x3++) {
    var dx = (x3 / cols - 0.5) * 2, dy = (y3 / rows - 0.5) * 2
    if (dx * dx + dy * dy > 1.15) g.st[y3][x3] = darker(g.st[y3][x3])
  }
  // section label in the corner
  put(g, cols - 18, 0, (kind + ' ' + (s ? Math.round(p * 100) + '%' : '')).slice(0, 17), 0)
  return frameOf(g)
}
