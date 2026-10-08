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
 *
 * Lifecycle: setup(info, gl) → prepare(info, gl) (optional generator) →
 * warmup(info, gl) (optional) → ready → paint()/render(). warmup runs once on
 * the final output surface, right before ready, so a scene can pay one-off GPU
 * first-use cost (shader compilation, render-target allocation) under its own
 * deadline instead of inside the first realtime frame. The panel additionally
 * grants the first frames after ready a wider stall window and does not charge
 * them to the steady-state slow-frame quota (SCENE_LIMITS.firstFrame*).
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
  /** Setup / first compile. 0.9.7: raised for heavy setup() and large bundles. */
  setupTimeoutMs: 5000,
  /**
   * 0.9.7: the first {@link firstFrameGraceMs} after `ready` may carry one-off
   * GPU first-use cost (shader compilation, render-target allocation). Inside
   * that window a pending frame may take {@link firstFrameTimeoutMs} instead of
   * {@link hardTimeoutMs}, and frames slower than the frame budget are not
   * charged to the steady-state slow-frame quota. Steady state is unchanged.
   */
  firstFrameTimeoutMs: 8000,
  firstFrameGraceMs: 10_000,
  /**
   * 0.9.7: optional synchronous `warmup(info, gl)`, run once after
   * setup()/prepare() and before `ready`, on the final output surface, followed
   * by gl.finish(). Its own deadline; preparation deadlines do not cover it.
   */
  warmupTimeoutMs: 20_000,
  /** Optional cooperative preparation, before any playback frames are accepted. */
  prepareStepTimeoutMs: 10_000,
  /** 0.9.7: raised for long edit tables (hundreds of shots) on slow GPUs. */
  prepareTotalTimeoutMs: 300_000,
  prepareMaxSteps: 512,
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
  // Offline fonts are loaded privately before user code runs; no font API is exposed.
  'FontFace', 'FontFaceSet', 'FontFaceSetLoadEvent', 'fonts',
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

/** Offline bitmap-scene font transport, independently bounded from scene data. */
export const SCENE_FONT_LIMITS = Object.freeze({
  maxFaces: 64, fileBytes: 2 * 1024 * 1024, totalBytes: 12 * 1024 * 1024,
  maxRangeChars: 4096, maxRanges: 256, loadMs: 30_000, maxFamilyChars: 100,
})

/** Fixed local family names only; never CSS source syntax or generic aliases. */
export function sceneFontFamilyValid(value) {
  return typeof value === 'string' && value.length <= SCENE_FONT_LIMITS.maxFamilyChars && value === value.trim()
    && /^[A-Za-z][A-Za-z0-9 _-]*$/.test(value)
    && !/^(?:serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|emoji|math|fangsong|inherit|initial|unset|revert|revert-layer|default)$/i.test(value)
}

/** Bounded CSS Unicode ranges (intervals, singletons and trailing wildcards). */
export function sceneFontUnicodeRangeValid(value) {
  if (typeof value !== 'string' || !value || value.length > SCENE_FONT_LIMITS.maxRangeChars || value.split(',').length > SCENE_FONT_LIMITS.maxRanges) return false
  return value.split(',').every(part => {
    const m = /^\s*U\+([0-9A-F]{1,6})(?:-([0-9A-F]{1,6}))?\s*$/i.exec(part)
    const w = /^\s*U\+([0-9A-F]{0,5}\?{1,6})\s*$/i.exec(part)
    const low = m ? parseInt(m[1], 16) : w ? parseInt(w[1].replaceAll('?', '0'), 16) : -1
    const high = m ? parseInt(m[2] || m[1], 16) : w ? parseInt(w[1].replaceAll('?', 'F'), 16) : -1
    return low >= 0 && high >= low && high <= 0x10ffff
  })
}

/** Shared by ScriptFilm and the private worker loader. No CSS URLs or live font API. */
export function sceneFontProblems(fonts, { output = 'text' } = {}) {
  const errors = []
  if (!Array.isArray(fonts)) return ['离线字体描述必须是数组。']
  if (!fonts.length) return errors
  if (output !== 'pixels' && output !== 'webgl') return ['离线字体仅用于 script 位图场景。']
  if (fonts.length > SCENE_FONT_LIMITS.maxFaces) return [`离线字体超过 ${SCENE_FONT_LIMITS.maxFaces} 个描述。`]
  let bytes = 0
  for (const [i, font] of fonts.entries()) {
    const bad = detail => errors.push(`离线字体 ${i + 1}：${detail}`)
    if (!font || typeof font !== 'object' || Array.isArray(font)) { bad('描述不是对象。'); continue }
    if (Object.keys(font).some(key => !['family', 'weight', 'style', 'unicodeRange', 'bytes'].includes(key))) bad('描述有未知字段。')
    if (!sceneFontFamilyValid(font.family)) bad('family 必须是安全的本地字体名称，不能是 generic 别名。')
    if (typeof font.weight !== 'string' || !/^[1-9]00$/.test(font.weight)) bad('weight 必须是 100–900 的固定字重。')
    if (!['normal', 'italic', 'oblique'].includes(font.style)) bad('style 必须为 normal、italic 或 oblique。')
    if (font.unicodeRange !== undefined && !sceneFontUnicodeRangeValid(font.unicodeRange)) bad('unicodeRange 大小或范围无效。')
    if (!(font.bytes instanceof ArrayBuffer) || font.bytes.byteLength < 4 || font.bytes.byteLength > SCENE_FONT_LIMITS.fileBytes) bad('bytes 必须是大小受限的字体 ArrayBuffer。')
    else {
      bytes += font.bytes.byteLength
      const b = new Uint8Array(font.bytes, 0, 4)
      if (!((b[0] === 119 && b[1] === 79 && b[2] === 70 && b[3] === 50) || (b[0] === 79 && b[1] === 84 && b[2] === 84 && b[3] === 79) || (b[0] === 0 && b[1] === 1 && b[2] === 0 && b[3] === 0))) bad('只允许 WOFF2、TTF 或 OTF 字体字节。')
    }
  }
  if (bytes > SCENE_FONT_LIMITS.totalBytes) errors.push(`离线字体总计超过 ${SCENE_FONT_LIMITS.totalBytes / 1024 / 1024} MiB。`)
  return errors
}

/** Only bounded WebGL creation attributes; no canvas handles or arbitrary context types. */
export function sceneWebglContextProblems(value, output = 'webgl') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['canvas.context 必须是受限 WebGL 参数对象']
  const errors = []
  if (Object.keys(value).length && output !== 'webgl') errors.push('canvas.context 只用于 script WebGL 输出')
  for (const [key, setting] of Object.entries(value)) {
    if (['antialias', 'depth', 'premultipliedAlpha', 'preserveDrawingBuffer'].includes(key)) { if (typeof setting !== 'boolean') errors.push(`canvas.context.${key} 必须是布尔值`) }
    else if (key === 'powerPreference') { if (!['default', 'low-power', 'high-performance'].includes(setting)) errors.push('canvas.context.powerPreference 无效') }
    else errors.push(`canvas.context 未支持 ${key}`)
  }
  return errors
}

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

/** Small, copied progress data only; never post a script-owned iterator/result across the boundary. */
export const SCENE_PREPARE_RUNTIME_SOURCE = String.raw`
const __mvPromiseThen = Promise.prototype.then;
function __mvWarmupResult(result) {
  if (result && (typeof result === 'object' || typeof result === 'function') && (typeof result.then === 'function' || typeof result.next === 'function')) {
    // Observe native rejected Promises without invoking a script-owned thenable.
    try { __mvPromiseThen.call(result, undefined, () => {}); } catch (error) {}
    throw new TypeError('warmup() 必须同步完成，不能返回 Promise、thenable 或迭代器');
  }
}
function __mvPrepareIterator(iterator) {
  if (!iterator || typeof iterator !== 'object' || typeof iterator.then === 'function') throw new TypeError('prepare() 必须返回同步迭代器，不能返回 Promise');
  const next = iterator.next;
  if (typeof next !== 'function') throw new TypeError('prepare() 必须返回带 next() 的同步迭代器');
  return { iterator, next };
}
function __mvPrepareProgress(result, previous) {
  if (!result || typeof result !== 'object' || typeof result.then === 'function' || typeof result.done !== 'boolean') throw new TypeError('prepare.next() 必须返回同步的 { done, value }，不能返回 Promise');
  if (result.done) return { done: true, progress: 1, label: '' };
  const value = result.value;
  if (value === undefined) return { done: false, progress: previous, label: '' };
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('prepare() 的进度应为 { progress, label } 或 undefined');
  const progress = value.progress, label = value.label === undefined ? '' : value.label;
  if (!Number.isFinite(progress) || progress < 0 || progress > 1 || progress < previous) throw new RangeError('prepare() progress 必须是 0–1 的单调有限数');
  if (typeof label !== 'string' || label.length > 160) throw new TypeError('prepare() label 必须是不超过 160 字符的字符串');
  return { done: false, progress, label };
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
export function sceneWorkerSource(userSource, { output = 'text', context = {} } = {}) {
  const contextProblems = sceneWebglContextProblems(context, output)
  if (contextProblems.length) throw new Error(contextProblems.join('；'))
  const pixels = output === 'pixels'
  const webgl = output === 'webgl'
  const blocked = JSON.stringify(sceneBlockedGlobals(output))
  // Compile the scene through a captured Function constructor after supervisor state has been enclosed in the
  // IIFE below. Functions created this way resolve globals from the worker, not lexical __* supervisor bindings.
  const userBody = JSON.stringify(`"use strict";\n${stripModuleSyntax(userSource)}\n;return { render: typeof render === 'function' ? render : null, paint: typeof paint === 'function' ? paint : null, setup: typeof setup === 'function' ? setup : null, prepare: typeof prepare === 'function' ? prepare : null, warmup: typeof warmup === 'function' ? warmup : null };`)
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
// Capture the native font capabilities and timers before lockdown. The separately
// compiled user scope can never reach these references, faces or byte buffers.
const __FontFace = typeof __global.FontFace === 'function' ? __global.FontFace : null;
const __fontSet = __global.fonts;
const __fontAdd = __fontSet && typeof __fontSet.add === 'function' ? __fontSet.add.bind(__fontSet) : null;
const __fontDelete = __fontSet && typeof __fontSet.delete === 'function' ? __fontSet.delete.bind(__fontSet) : null;
const __fontTimer = typeof __global.setTimeout === 'function' ? __global.setTimeout.bind(__global) : null;
const __fontClearTimer = typeof __global.clearTimeout === 'function' ? __global.clearTimeout.bind(__global) : null;
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
${SCENE_PREPARE_RUNTIME_SOURCE}
${WEBGL_CANVAS_FACADE_SOURCE}
const SCENE_FONT_LIMITS = ${JSON.stringify(SCENE_FONT_LIMITS)};
const sceneFontFamilyValid = ${sceneFontFamilyValid.toString()};
const sceneFontUnicodeRangeValid = ${sceneFontUnicodeRangeValid.toString()};
const __fontProblems = ${sceneFontProblems.toString()};
async function __loadFonts(descriptors) {
  if (!__FontFace || !__fontAdd || !__fontDelete) throw new Error('这个环境不支持离线字体加载（FontFace / FontFaceSet）。');
  if (!__fontTimer || !__fontClearTimer) throw new Error('这个环境没有离线字体加载监督计时器。');
  const started = __now(), total = descriptors.length, registered = [];
  let timer, active = true, loaded = 0;
  __post({ type: 'font-loading', loaded: 0, total, progress: 0, label: 'Offline fonts', done: false });
  try {
    const deadline = new Promise((resolve, reject) => {
      timer = __fontTimer(() => reject(new Error('离线字体加载总计超过 ${SCENE_FONT_LIMITS.loadMs} ms。')), ${SCENE_FONT_LIMITS.loadMs});
    });
    const jobs = descriptors.map(async (descriptor, index) => {
      const face = new __FontFace(descriptor.family, descriptor.bytes, { weight: descriptor.weight, style: descriptor.style,
        ...(descriptor.unicodeRange === undefined ? {} : { unicodeRange: descriptor.unicodeRange }) });
      const result = await face.load();
      if (result.status !== 'loaded') throw new Error('离线字体 ' + (index + 1) + ' 未加载完成。');
      loaded++;
      if (active && loaded < total) __post({ type: 'font-loading', loaded, total, progress: loaded / total, label: descriptor.family + ' ' + descriptor.weight, done: false });
      return result;
    });
    const faces = await Promise.race([Promise.all(jobs), deadline]);
    if (__now() - started >= ${SCENE_FONT_LIMITS.loadMs}) throw new Error('离线字体加载总计超时。');
    // Register only after all loads succeed. A failed registration rolls back the
    // entire batch rather than leaving a mix of real and fallback fonts.
    for (const face of faces) { __fontAdd(face); registered.push(face); }
    __post({ type: 'font-loading', loaded: total, total, progress: 1, label: '', done: true });
  } catch (error) {
    for (const face of registered) { try { __fontDelete(face) } catch {} }
    throw error;
  } finally { active = false; __fontClearTimer(timer); }
}
let __scene = null, __setupError = '', __cv = null, __g = null, __facade = null, __initialized = false, __contextLost = false, __ready = false;
let __prepare = null, __prepareId = 0, __prepareProgress = 0, __prepareStarted = 0, __prepareWidth = 0, __prepareHeight = 0, __info = null;
function __compileScene() { try {
  __scene = __compile(${userBody})();
  if (__bitmap && !__scene.paint) __setupError = __webgl
    ? '场景脚本没有定义 paint(gl, t, width, height, ctx) 函数（canvas.output 为 "webgl"）。'
    : '场景脚本没有定义 paint(g, t, width, height, ctx) 函数（canvas.output 为 "pixels"）。';
  else if (__bitmap && !__Canvas) __setupError = '这个环境不支持 OffscreenCanvas，无法运行像素场景。';
  else if (!__bitmap && !__scene.render) __setupError = '场景脚本没有定义 render(t, cols, rows, ctx) 函数。';
} catch (error) { __setupError = String(error && error.stack || error); } }
function __surface(w, h) {
  w = Math.max(1, Math.min(${PIXEL_SCENE_LIMITS.maxWidth}, w | 0)); h = Math.max(1, Math.min(${PIXEL_SCENE_LIMITS.maxHeight}, h | 0));
  if (!__cv) {
    __cv = new __Canvas(w, h);
    __g = __webgl
      ? __nativeGetContext.call(__cv, 'webgl2', { alpha: false, antialias: true, depth: true, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, ...${JSON.stringify(context)} })
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
// 0.9.7: optional warmup(info, gl) runs once, after setup()/prepare(), on the final output
// surface and before the ready handshake. Scenes use it to pay one-off GPU first-use cost
// (shader compilation, render-target allocation) here, under its own deadline, instead of
// inside the first realtime playback frame. It must leave the output canvas size alone.
function __warmup(id) {
  if (__setupError || !__scene.warmup) return false;
  const started = __now();
  __post({ type: 'warming', id: id === undefined ? 0 : id });
  __mvWarmupResult(__scene.warmup(__info, __webgl ? __g : undefined));
  if (__bitmap && (__cv.width !== __prepareWidth || __cv.height !== __prepareHeight)) throw new Error('warmup() 不能更改输出 canvas.size');
  if (__webgl && (__contextLost || __g.isContextLost?.())) throw new Error('WebGL 上下文已丢失，场景已停止。');
  // Force pending driver work to complete so the next playback frame is not the one that pays it.
  if (__webgl && typeof __g.finish === 'function') __g.finish();
  if (__webgl && (__contextLost || __g.isContextLost?.())) throw new Error('WebGL 上下文已丢失，场景已停止。');
  if (__now() - started > ${SCENE_LIMITS.warmupTimeoutMs}) throw new Error('warmup() 预热超时');
  return true;
}
// Single exit to the ready handshake, so warmup runs exactly once whether or not
// prepare() existed. The id argument echoes the final prepare step so the
// supervisor can check the response sequence.
function __finishSetup(id) {
  let warmed = false;
  try { warmed = __warmup(id) }
  catch (error) { __prepare = null; __setupError = String(error && error.stack || error).slice(0, 2000); __post({ type: 'fatal', error: __setupError }); return }
  __ready = !__setupError;
  __post({ type: 'ready', error: __setupError, ...(id === undefined && !warmed ? {} : { id: id === undefined ? 0 : id }) });
}
function __startScene(info) {
    // User top-level code also runs only after fonts are loaded: it cannot
    // monkey-patch array/Promise/native methods to inspect a private descriptor.
    __compileScene();
    if (!__setupError && __bitmap) { try { __surface(info && info.width || 1280, info && info.height || 720) } catch (error) { __setupError = String(error && error.stack || error) } }
    if (!__setupError) { try {
      __info = __webgl ? { ...(info || {}), canvas: __facade } : (info || {});
      if (__scene.setup) __scene.setup(__info, __webgl ? __g : undefined);
      __prepareWidth = __cv && __cv.width; __prepareHeight = __cv && __cv.height;
      if (__scene.prepare) __prepare = __mvPrepareIterator(__scene.prepare(__info, __webgl ? __g : undefined));
      if (__prepare && __bitmap && (__cv.width !== __prepareWidth || __cv.height !== __prepareHeight)) throw new Error('prepare() 不能更改输出 canvas.size');
    } catch (error) { __setupError = String(error && error.stack || error) } }
    if (!__setupError && __prepare) {
      __prepareStarted = __now();
      __post({ type: 'preparing', id: 0, progress: 0, label: '' });
      return;
    }
    __finishSetup();
}
__listen('message', event => {
  const msg = event.data || {};
  if (msg.type === 'init') {
    if (__initialized) return;
    __initialized = true;
    const descriptors = msg.fonts === undefined ? [] : msg.fonts;
    const problems = __fontProblems(descriptors, { output: __webgl ? 'webgl' : __pixels ? 'pixels' : 'text' });
    if (problems.length) { __setupError = problems.join(' '); __post({ type: 'fatal', error: __setupError }); return; }
    if (!descriptors.length) { __startScene(msg.info); return; }
    __loadFonts(descriptors).then(() => __startScene(msg.info)).catch(error => {
      __setupError = String(error && error.stack || error).slice(0, 2000);
      __post({ type: 'fatal', error: __setupError });
    });
    return;
  }
  if (msg.type === 'prepare-next' && __initialized && __prepare && !__setupError && !__contextLost) {
    const started = __now();
    try {
      if (!Number.isSafeInteger(msg.id) || msg.id !== __prepareId + 1) throw new Error('准备步骤编号不匹配');
      if (msg.id > ${SCENE_LIMITS.prepareMaxSteps}) throw new Error('prepare() 超过 ${SCENE_LIMITS.prepareMaxSteps} 个步骤');
      if (started - __prepareStarted > ${SCENE_LIMITS.prepareTotalTimeoutMs}) throw new Error('prepare() 总计超时');
      __prepareId = msg.id;
      const status = __mvPrepareProgress(__prepare.next.call(__prepare.iterator), __prepareProgress);
      if (__bitmap && (__cv.width !== __prepareWidth || __cv.height !== __prepareHeight)) throw new Error('prepare() 不能更改输出 canvas.size');
      if (__webgl && (__contextLost || __g.isContextLost?.())) throw new Error('WebGL 上下文已丢失，场景已停止。');
      // Complete first-use GPU work here, not in the first timed playback frame.
      if (__webgl && typeof __g.finish === 'function') __g.finish();
      const ended = __now();
      if (ended - started > ${SCENE_LIMITS.prepareStepTimeoutMs}) throw new Error('prepare() 单步骤超时');
      if (ended - __prepareStarted > ${SCENE_LIMITS.prepareTotalTimeoutMs}) throw new Error('prepare() 总计超时');
      __prepareProgress = status.progress;
      if (status.done) {
        __prepare = null;
        __finishSetup(msg.id);
      } else __post({ type: 'preparing', id: msg.id, progress: status.progress, label: status.label });
    } catch (error) {
      __prepare = null; __setupError = String(error && error.stack || error).slice(0, 2000);
      __post({ type: 'fatal', error: __setupError });
    }
    return;
  }
  if (msg.type !== 'frame' || !__initialized || !__ready || __setupError || __contextLost) return;
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
