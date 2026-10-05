/**
 * Scene scripts: the `canvas.renderer: "script"` mode of MV packs. A scene
 * script is a plain JavaScript file (no imports, no DOM, no network) that
 * defines
 *
 *   function render(t, cols, rows, ctx) { return [ '…', '…' ] }
 *
 * returning the ASCII frame for time t (seconds) on a cols × rows grid, as an
 * array of lines or one string with "\n". It may instead return
 * { lines: [...], styles: [...] }, where each style line holds one digit per
 * cell: 0 dim, 1 normal, 2 bright, 3 white, 4 red, 5 brown, 6 olive.
 *
 * ctx = { duration, progress, title, artist, lyric, next, bands, energy, bass,
 *         mid, treble, ready, paused, section, sections, beat }
 *   lyric / next: { text, en, zh, start, end, progress, words, word } or null
 *     words: [{ text, start, end }] from enhanced LRC <mm:ss.xx> word stamps,
 *     otherwise estimated (spread over the first 70 % of the line); word: index
 *     of the word being sung at t (-1 before the first)
 *   bands: 48 numbers 0..1 (low → high frequencies); energy/bass/mid/treble 0..1
 *   section: { kind, label, start, end, index, progress } of the current song
 *     section (mv.json x-dsh-mv-ai.sections) or null; sections: all of them
 *   beat: { bpm, index, bar, phase, pulse } when mv.json sets canvas.bpm, else
 *     null (phase 0..1 inside the beat, pulse = 1 on the beat decaying to 0)
 *
 * The panel runs the script in a Web Worker with network and storage APIs
 * removed and a per-frame time budget; the Host runs the same code in a
 * node:vm context with a timeout for the agent tools. Any failure falls back to
 * the generic renderer. Shared, pure code: the runtime source below is
 * evaluated inside both sandboxes so validation matches playback.
 */
export const SCENE_LIMITS = Object.freeze({
  scriptBytes: 256 * 1024,
  /** 0.9.2: webgl scenes may be larger (inlined Three.js etc.). */
  webglScriptBytes: 2 * 1024 * 1024,
  /** A frame slower than this counts as slow; too many slow frames stop the script. */
  frameBudgetMs: 40,
  slowFramesAllowed: 45,
  /** No answer within this time: the worker is terminated. */
  hardTimeoutMs: 1500,
  /** Setup / first compile. */
  setupTimeoutMs: 2000,
  maxCols: 240,
  maxRows: 85,
})

/**
 * Names removed from the worker global scope (and its prototypes) before the scene runs.
 * Every output has the same restrictions. Worker-safe library bundles can test
 * absent browser globals, but never receive a DOM, network, storage or timers.
 */
export const SCENE_BLOCKED_GLOBALS = Object.freeze([
  // Network: still blocked in every mode.
  'fetch', 'XMLHttpRequest', 'WebSocket', 'WebTransport', 'EventSource', 'Request', 'Response', 'Headers',
  // Storage / caches: still blocked in every mode.
  'indexedDB', 'localStorage', 'sessionStorage', 'caches', 'BroadcastChannel', 'Worker', 'SharedWorker', 'storageFoundation',
  // P2P / media capture: still blocked.
  'RTCPeerConnection', 'RTCDataChannel', 'FileReader', 'FileReaderSync', 'Notification',
  // WASM: still blocked (vm context disables `codeGeneration.wasm` too).
  'WebAssembly',
  // Code generation: still blocked in every mode.
  'Function', 'eval',
  // Fonts: scripts use the fonts the system already has.
  'FontFace', 'fonts',
  // Supervisor uses these before lockdown; user code is compiled in a separate Function scope
  // and cannot reach supervisor-private __* bindings.
  'importScripts', 'onmessage', 'postMessage',
  // Browser glue that text / pixel scenes don't need and would only widen the attack surface.
  'window', 'document', 'self', 'globalThis', 'process',
  'navigator', 'location', 'open', 'close',
  // Async / timers — scenes must drive the frame loop via paint(t, …) only.
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
  'requestAnimationFrame', 'cancelAnimationFrame', 'queueMicrotask',
  // Event listeners / message channels.
  'MessageChannel', 'addEventListener', 'removeEventListener', 'dispatchEvent',
  'onmessageerror', 'onerror', 'onunhandledrejection',
])

/** Kept as a per-output API for consumers; WebGL does not widen privileges. */
export function sceneBlockedGlobals() { return SCENE_BLOCKED_GLOBALS }

/** Pixel scenes (canvas.output "pixels", 0.9.1). */
export const PIXEL_SCENE_LIMITS = Object.freeze({
  maxWidth: 1920, maxHeight: 1080,
  // Painting runs off the main thread and only one frame is in flight, so a slow pixel scene lowers the
  // frame rate instead of blocking the panel: it is stopped only below ~10 fps for too long.
  frameBudgetMs: 100,
})

/** Accept `export function render…` / `export default function…` written by habit. */
export function stripModuleSyntax(source) {
  return String(source)
    .replace(/^\uFEFF/, '')
    .replace(/^(\s*)export\s+default\s+(?=(?:async\s+)?function\b)/gm, '$1')
    .replace(/^(\s*)export\s+(?=(?:async\s+)?function\b|const\b|let\b|var\b|class\b)/gm, '$1')
}

/** Problems that make a script unusable before running it (size, imports). */
export function sceneSourceProblems(source, { output = 'text' } = {}) {
  const problems = []
  const text = String(source ?? '')
  if (!text.trim()) problems.push('场景脚本是空的。')
  // 0.9.2: webgl output mode raises the byte limit to allow inlined 3D libraries (Three.js etc.).
  const limit = output === 'webgl' ? SCENE_LIMITS.webglScriptBytes : SCENE_LIMITS.scriptBytes
  if (new TextEncoder().encode(text).length > limit) problems.push(`场景脚本超过 ${limit / 1024} KB。`)
  // Dynamic import can fetch modules even when fetch is removed. Match comment-
  // separated calls too, including inside template substitutions; intentionally
  // scan the original text so string/comment tricks cannot hide executable imports.
  const gap = String.raw`(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*(?:\r\n?|\n|$))*`
  if (/^\s*import\s[^(]/m.test(text) || new RegExp(`\\b(?:import|require)${gap}\\(`).test(text)) problems.push('场景脚本不能 import / require 其他模块（运行在没有文件和网络的沙箱里）。')
  return problems
}

/**
 * Source of the frame normaliser, evaluated inside the sandboxes. Defines
 * __mvNormalize(out, cols, rows) → { lines, styles } (strings, cropped and
 * padded; styles digits 0..6).
 */
export const SCENE_RUNTIME_SOURCE = String.raw`
function __mvNormalize(out, cols, rows) {
  var lines = out, styles = null
  if (out && typeof out === 'object' && !Array.isArray(out)) { lines = out.lines; styles = out.styles }
  if (typeof lines === 'string') lines = lines.split('\n')
  if (!Array.isArray(lines)) throw new TypeError('render() 必须返回字符串数组、带 \\n 的字符串，或 { lines, styles }')
  if (styles != null && typeof styles === 'string') styles = styles.split('\n')
  if (styles != null && !Array.isArray(styles)) throw new TypeError('styles 必须是字符串数组')
  var outLines = [], outStyles = []
  for (var y = 0; y < rows; y++) {
    var line = lines[y] == null ? '' : String(lines[y])
    if (line.length > cols * 4) line = line.slice(0, cols * 4)
    outLines.push(line.replace(/[\u0000-\u001f\u007f]/g, ' '))
    var style = styles && styles[y] != null ? String(styles[y]).slice(0, cols * 2).replace(/[^0-6]/g, '1') : ''
    outStyles.push(style)
  }
  return { lines: outLines, styles: outStyles }
}
`

/** Minimal canvas interface for bundled Three.js, shared by playback and structural checks. */
export const WEBGL_CANVAS_FACADE_SOURCE = String.raw`
function __mvCanvasFacade(canvas, gl) {
  const facade = Object.create(null);
  const size = (n, max) => { if (!Number.isInteger(n) || n < 1 || n > max) throw new RangeError('canvas size exceeds scene limits'); return n; };
  Object.defineProperties(facade, {
    width: { enumerable: true, get: () => canvas.width, set: n => { canvas.width = size(n, 1920); } },
    height: { enumerable: true, get: () => canvas.height, set: n => { canvas.height = size(n, 1080); } },
    clientWidth: { enumerable: true, get: () => canvas.width },
    clientHeight: { enumerable: true, get: () => canvas.height },
    style: { value: Object.create(null), enumerable: true },
    getContext: { value: type => type === 'webgl2' ? gl : null },
    setAttribute: { value: () => {} },
    addEventListener: { value: () => {} },
    removeEventListener: { value: () => {} },
  });
  return Object.freeze(facade);
}
`

/**
 * Worker source: sandbox prelude, the user's scene, then the frame loop.
 * output "pixels": the scene defines paint(g, t, width, height, ctx) and draws
 * on an OffscreenCanvas 2D context (only "2d" contexts can be created); each
 * frame goes back as an ImageBitmap (the canvas starts blank every frame).
 * output "webgl": paint(gl, t, width, height, ctx) receives the supervisor's
 * WebGL2 context; setup(info, gl) receives the same context and info.canvas is a
 * minimal canvas facade. Bundled Three.js must use { canvas: info.canvas, context: gl }.
 * setup(info) receives info.assets (the pack's canvas.assets, JSON parsed).
 */
export function sceneWorkerSource(userSource, { output = 'text' } = {}) {
  const pixels = output === 'pixels'
  const webgl = output === 'webgl'
  const blocked = JSON.stringify(sceneBlockedGlobals(output))
  // Compile the scene through a captured Function constructor after supervisor state has been enclosed in the
  // IIFE below. Functions created this way resolve globals from the worker, not lexical __* supervisor bindings.
  const userBody = JSON.stringify(`"use strict";\n${stripModuleSyntax(userSource)}\n;return { render: typeof render === 'function' ? render : null, paint: typeof paint === 'function' ? paint : null, setup: typeof setup === 'function' ? setup : null };`)
  return `"use strict";
(() => {
const __global = self;
const __post = __global.postMessage.bind(__global);
const __listen = __global.addEventListener.bind(__global);
const __now = typeof performance !== 'undefined' ? performance.now.bind(performance) : Date.now.bind(Date);
const __compile = Function;
const __pixels = ${pixels ? 'true' : 'false'};
const __webgl = ${webgl ? 'true' : 'false'};
const __bitmap = __pixels || __webgl;
const __Canvas = typeof OffscreenCanvas === 'function' ? OffscreenCanvas : null;
const __nativeGetContext = __Canvas && OffscreenCanvas.prototype.getContext;
const __snapshot = __Canvas && OffscreenCanvas.prototype.transferToImageBitmap;
const __canvasListen = typeof EventTarget !== 'undefined' ? EventTarget.prototype.addEventListener : null;
(() => {
  const names = ${blocked};
  const seen = new Set();
  for (let o = __global; o && !seen.has(o); o = Object.getPrototypeOf(o)) {
    seen.add(o);
    for (const name of names) { try { delete o[name] } catch (e) {} }
  }
  for (const name of names) { try { Object.defineProperty(__global, name, { value: undefined, writable: false, configurable: false }) } catch (e) {} }
  // Removing global Function alone leaves (() => {}).constructor and async/generator
  // constructors able to create code. Lock those paths too; only the private compiler remains.
  for (const fn of [__compile, Object.getPrototypeOf(async function() {}).constructor, Object.getPrototypeOf(function*() {}).constructor, Object.getPrototypeOf(async function*() {}).constructor]) {
    try { Object.defineProperty(fn.prototype, 'constructor', { value: undefined, writable: false, configurable: false }) } catch (e) {}
  }
  if (__Canvas) {
    // pixels / text: user-created canvases stay 2D-only; the supervisor canvas holds the only WebGL2 context.
    // webgl (0.9.2): user code may also create its own canvases and ask for 'webgl2' (Three.js's WebGLRenderer does).
    try { Object.defineProperty(__Canvas.prototype, 'getContext', { value: function (type, options) {
      if (type === '2d') return __nativeGetContext.call(this, type, options)
      if (type === 'webgl2' && __webgl) return __nativeGetContext.call(this, type, options)
      return null
    }, writable: false, configurable: false }) } catch (e) {}
  }
})();
${SCENE_RUNTIME_SOURCE}
${WEBGL_CANVAS_FACADE_SOURCE}
let __scene = null, __setupError = '', __cv = null, __g = null, __facade = null, __initialized = false, __contextLost = false;
try {
  __scene = __compile(${userBody})();
  if (__bitmap && !__scene.paint) __setupError = __webgl
    ? '场景脚本没有定义 paint(gl, t, width, height, ctx) 函数（canvas.output 为 "webgl"）。'
    : '场景脚本没有定义 paint(g, t, width, height, ctx) 函数（canvas.output 为 "pixels"）。';
  else if (__bitmap && !__Canvas) __setupError = '这个环境不支持 OffscreenCanvas，无法运行像素场景。';
  else if (!__bitmap && !__scene.render) __setupError = '场景脚本没有定义 render(t, cols, rows, ctx) 函数。';
} catch (error) { __setupError = String(error && error.stack || error); }
function __surface(w, h) {
  w = Math.max(1, Math.min(${PIXEL_SCENE_LIMITS.maxWidth}, w | 0)); h = Math.max(1, Math.min(${PIXEL_SCENE_LIMITS.maxHeight}, h | 0));
  if (!__cv) {
    __cv = new __Canvas(w, h);
    __g = __webgl
      ? __nativeGetContext.call(__cv, 'webgl2', { alpha: false, antialias: true, depth: true, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false })
      : __nativeGetContext.call(__cv, '2d');
    if (__webgl && __g) {
      __facade = __mvCanvasFacade(__cv, __g);
      const lost = event => {
        if (__contextLost) return;
        __contextLost = true;
        event.preventDefault?.();
        __post({ type: 'fatal', error: 'WebGL 上下文已丢失，场景已停止。' });
      };
      // Lockdown removes EventTarget listener methods from the shared prototype.
      // Keep the supervisor's original method, so context-loss handling still works.
      if (__canvasListen) {
        __canvasListen.call(__cv, 'webglcontextlost', lost);
        __canvasListen.call(__cv, 'contextlost', lost);
      } else {
        __cv.addEventListener?.('webglcontextlost', lost);
        __cv.addEventListener?.('contextlost', lost);
      }
    }
  } else if (__cv.width !== w || __cv.height !== h) { __cv.width = w; __cv.height = h; }
  if (!__g) throw new Error(__webgl ? '这个环境不支持 OffscreenCanvas WebGL2。' : '这个环境不支持 OffscreenCanvas 2D。');
  if (__webgl && (__contextLost || __g.isContextLost?.())) throw new Error('WebGL 上下文已丢失，场景已停止。');
  return [w, h];
}
// 0.9.2: in webgl mode the user may also create their own canvases; the supervisor canvas
// (__cv / __g) is what we transfer to the main thread each frame. WebGL frames are
// produced by paint() drawing on __g; transferToImageBitmap() snapshots the canvas.
function __paint(msg) {
  const [w, h] = __surface(msg.cols, msg.rows);
  if (__pixels && typeof __g.reset === 'function') __g.reset();
  else if (__pixels) { __g.setTransform(1, 0, 0, 1, 0, 0); __g.globalAlpha = 1; __g.globalCompositeOperation = 'source-over'; __g.filter = 'none'; __g.clearRect(0, 0, w, h); }
  __scene.paint(__g, msg.t, w, h, msg.ctx);
  if (__cv.width !== w || __cv.height !== h) throw new Error('paint() 不能更改输出 canvas.size。');
  if (__webgl && (__contextLost || __g.isContextLost?.())) throw new Error('WebGL 上下文已丢失，场景已停止。');
  if (__webgl && typeof __g.flush === 'function') __g.flush();
  return __snapshot.call(__cv);
}
__listen('message', event => {
  const msg = event.data || {};
  if (msg.type === 'init') {
    if (__initialized) return;
    __initialized = true;
    if (!__setupError && __webgl) { try { __surface(msg.info && msg.info.width || 1280, msg.info && msg.info.height || 720) } catch (error) { __setupError = String(error && error.stack || error) } }
    if (!__setupError && __scene.setup) { try { __scene.setup(__webgl ? { ...(msg.info || {}), canvas: __facade } : (msg.info || {}), __webgl ? __g : undefined) } catch (error) { __setupError = String(error && error.stack || error) } }
    __post({ type: 'ready', error: __setupError });
    return;
  }
  if (msg.type !== 'frame' || !__initialized || __setupError || __contextLost) return;
  const started = __now();
  try {
    if (__bitmap) {
      const bitmap = __paint(msg);
      try { __post({ type: 'frame', id: msg.id, bitmap, ms: __now() - started }, [bitmap]); }
      catch (error) { bitmap.close?.(); throw error; }
    }
    else {
      const frame = __mvNormalize(__scene.render(msg.t, msg.cols, msg.rows, msg.ctx), msg.cols, msg.rows);
      __post({ type: 'frame', id: msg.id, frame, ms: __now() - started });
    }
  } catch (error) {
    __post({ type: 'error', id: msg.id, error: String(error && error.stack || error).slice(0, 2000) });
  }
});
})();
`
}

const SILENT = new Array(48).fill(0)
const avg = (bands, from, to) => { let s = 0; for (let i = from; i < to; i++) s += bands[i] ?? 0; return s / Math.max(1, to - from) }
const clamp01 = v => Math.max(0, Math.min(1, v))
const r3 = v => Math.round(v * 1000) / 1000
const CJK_CHAR = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/

/** Words of a cue with times: enhanced-LRC stamps when present, otherwise spread over 70 % of the line. */
export function cueWords(cue) {
  if (!cue) return []
  const end = Number.isFinite(cue.end) ? cue.end : cue.time + 4
  if (Array.isArray(cue.words) && cue.words.length) {
    return cue.words.map((w, i, all) => ({ text: String(w.text ?? ''), start: r3(w.time), end: r3(all[i + 1]?.time ?? end) }))
  }
  const text = String(cue.en || cue.zh || '')
  const parts = []
  for (const token of text.split(/\s+/).filter(Boolean)) {
    if (CJK_CHAR.test(token)) for (const ch of token) parts.push(ch)
    else parts.push(token)
  }
  const span = Math.max(0.3, (end - cue.time) * 0.7)
  return parts.map((part, i) => ({ text: part, start: r3(cue.time + span * i / parts.length), end: r3(cue.time + span * (i + 1) / parts.length) }))
}

function cueInfo(cue, t, withWords) {
  if (!cue) return null
  const end = Number.isFinite(cue.end) ? cue.end : cue.time + 4
  const info = { text: cue.en || cue.zh || '', en: cue.en || '', zh: cue.zh || '', start: cue.time, end, progress: r3(clamp01((t - cue.time) / Math.max(0.001, end - cue.time))) }
  if (!withWords) return info
  const words = cueWords(cue)
  let word = -1
  for (let i = 0; i < words.length; i++) if (words[i].start <= t) word = i
  return { ...info, words, word }
}

/** Sanitised sections ([{ kind, label?, start, end }], sorted). */
export function normalizeSections(list) {
  if (!Array.isArray(list)) return []
  return list.filter(s => s && Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start)
    .slice(0, 200)
    .map(s => ({ kind: String(s.kind ?? 'section').slice(0, 40), ...(s.label ? { label: String(s.label).slice(0, 80) } : {}), start: r3(s.start), end: r3(s.end) }))
    .sort((a, b) => a.start - b.start)
}

/** The ctx argument of render() (plain JSON data only). */
export function sceneContext({ t = 0, duration = 0, title = '', artist = '', cue = null, next = null, bands = SILENT, ready = false, paused = false, sections = [], bpm = 0, beatOffset = 0 } = {}) {
  const b = Array.from({ length: 48 }, (_, i) => clamp01(Number(bands?.[i]) || 0))
  const list = normalizeSections(sections)
  const index = list.findIndex(s => s.start <= t && t < s.end)
  const section = index < 0 ? null : { ...list[index], index, progress: r3(clamp01((t - list[index].start) / (list[index].end - list[index].start))) }
  let beat = null
  if (Number.isFinite(bpm) && bpm > 0) {
    const pos = Math.max(0, (t - beatOffset) * bpm / 60)
    const phase = pos - Math.floor(pos)
    beat = { bpm, index: Math.floor(pos), bar: Math.floor(pos / 4), phase: r3(phase), pulse: r3(Math.exp(-phase * 6)) }
  }
  return {
    duration, progress: duration > 0 ? clamp01(t / duration) : 0, title, artist,
    lyric: cueInfo(cue, t, true), next: cueInfo(next, t, false), bands: b,
    energy: avg(b, 0, 48), bass: avg(b, 0, 8), mid: avg(b, 8, 28), treble: avg(b, 28, 48), ready, paused,
    section, sections: list, beat,
  }
}

/** A small, valid example scene (also the starting point for AI-made packs). */
export const EXAMPLE_SCENE = String.raw`// scenes.js — scene script of a dsh-mv MV pack (canvas.renderer: "script").
// Runs in a sandbox: no DOM, no network, no imports. Keep each frame fast (< 40 ms).
//
// render(t, cols, rows, ctx) returns the frame: an array of rows lines (strings),
// or { lines, styles } where styles[y] has one digit per cell:
// 0 dim, 1 normal, 2 bright, 3 white, 4 red, 5 brown, 6 olive.
// ctx: { duration, progress, title, artist, lyric, next, bands[48], energy, bass, mid, treble, ready, paused,
//        section, sections, beat }
//   lyric: { text, en, zh, start, end, progress, words: [{ text, start, end }], word } or null
//   section: { kind, label, start, end, index, progress } or null; beat: { bpm, index, bar, phase, pulse } or null
// More techniques: examples/README.md and examples/*.scene.js in the pack template.

function setup(info) {
  // Optional, called once: info = { title, artist, duration }.
}

function centered(text, cols) {
  const s = String(text).slice(0, cols)
  const left = Math.max(0, Math.floor((cols - s.length) / 2))
  return ' '.repeat(left) + s
}

function render(t, cols, rows, ctx) {
  const lines = [], styles = []
  for (let y = 0; y < rows; y++) {
    let line = '', style = ''
    for (let x = 0; x < cols; x++) {
      // A moving wave whose height follows the music.
      const band = ctx.bands[Math.min(47, Math.floor(x / cols * 48))]
      const wave = Math.sin(x * 0.15 + t * 2) * 0.5 + 0.5
      const level = rows - 1 - Math.floor((wave * 0.3 + band * 0.7) * (rows - 6))
      const on = y >= level && y < rows - 4
      line += on ? '#*+=-:.'[Math.min(6, y - level)] || '.' : ' '
      style += on ? (y - level < 2 ? '3' : y - level < 4 ? '2' : '1') : '0'
    }
    lines.push(line); styles.push(style)
  }
  lines[1] = centered(ctx.title + (ctx.artist ? ' - ' + ctx.artist : ''), cols); styles[1] = '2'.repeat(cols)
  if (ctx.lyric) { lines[rows - 3] = centered(ctx.lyric.text, cols); styles[rows - 3] = '3'.repeat(cols) }
  if (ctx.lyric && ctx.lyric.zh && ctx.lyric.en) { lines[rows - 2] = centered(ctx.lyric.zh, cols); styles[rows - 2] = '2'.repeat(cols) }
  return { lines, styles }
}
`
