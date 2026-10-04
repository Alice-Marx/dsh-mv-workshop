/**
 * Host-side check of scene scripts for the agent tools: compile and run the
 * script in a fresh node:vm context (no require, no process, no timers, string
 * code generation disabled) with a timeout per call, and render sample frames
 * as plain text (pixel scenes run against a recording canvas stand-in). Data goes in and out as JSON text only, so no Host object is
 * reachable from the script.
 *
 * node:vm is not a security boundary against hostile code; it is used here to
 * catch mistakes (syntax errors, endless loops, wrong return shapes) in a
 * script the user asked their own agent to write. Playback in the panel uses a
 * Web Worker sandbox (see mv-scene.mjs).
 */
import vm from 'node:vm'
import { SCENE_LIMITS, SCENE_RUNTIME_SOURCE, sceneContext, sceneSourceProblems, stripModuleSyntax } from './mv-scene.mjs'

export const PREVIEW_LIMITS = Object.freeze({ compileTimeoutMs: 2000, frameTimeoutMs: 500, maxCols: 160, maxRows: 60 })

/**
 * A recording stand-in for the 2D canvas API, so pixel scenes (canvas.output
 * "pixels") can be checked without a real canvas: every method is accepted,
 * drawing calls are counted, nothing is drawn. Evaluated inside the vm.
 */
export const PIXEL_STUB_SOURCE = String.raw`
var __drawCalls = 0;
var __DRAW = { fill: 1, stroke: 1, fillRect: 1, strokeRect: 1, fillText: 1, strokeText: 1, drawImage: 1, putImageData: 1 };
function __stubContext(canvas) {
  var noop = function () {};
  var gradient = { addColorStop: noop };
  var helpers = {
    canvas: canvas,
    measureText: function (text) { var n = String(text).length; return { width: n * 8, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2, actualBoundingBoxLeft: 0, actualBoundingBoxRight: n * 8 } },
    createLinearGradient: function () { return gradient }, createRadialGradient: function () { return gradient }, createConicGradient: function () { return gradient },
    createPattern: function () { return { setTransform: noop } },
    getImageData: function (x, y, w, h) { w = Math.max(1, Math.min(4096, w | 0)); h = Math.max(1, Math.min(4096, h | 0)); return { width: w, height: h, data: new Uint8ClampedArray(Math.min(16777216, w * h * 4)) } },
    createImageData: function (w, h) { if (w && typeof w === 'object') { h = w.height; w = w.width } w = Math.max(1, Math.min(4096, w | 0)); h = Math.max(1, Math.min(4096, h | 0)); return { width: w, height: h, data: new Uint8ClampedArray(Math.min(16777216, w * h * 4)) } },
    getTransform: function () { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
    isPointInPath: function () { return false }, isPointInStroke: function () { return false }, getLineDash: function () { return [] },
  };
  var state = { globalAlpha: 1, globalCompositeOperation: 'source-over', lineWidth: 1, font: '10px sans-serif', fillStyle: '#000000', strokeStyle: '#000000', filter: 'none', textAlign: 'start', textBaseline: 'alphabetic', lineCap: 'butt', lineJoin: 'miter', shadowBlur: 0, shadowColor: 'rgba(0, 0, 0, 0)', imageSmoothingEnabled: true };
  return new Proxy(state, {
    get: function (o, k) { if (k in helpers) return helpers[k]; if (k in o) return o[k]; if (__DRAW[k]) return function () { __drawCalls++ }; return noop },
    set: function (o, k, v) { if (!(k in helpers)) o[k] = v; return true },
  });
}
function OffscreenCanvas(w, h) { this.width = w | 0; this.height = h | 0; this.__ctx = null }
OffscreenCanvas.prototype.getContext = function (type) { if (type !== '2d') return null; if (!this.__ctx) this.__ctx = __stubContext(this); return this.__ctx };
OffscreenCanvas.prototype.transferToImageBitmap = function () { return { width: this.width, height: this.height, close: function () {} } };
`

/** Compile a scene; returns { ok, problems, renderFrame(t, cols, rows, ctxData) } (pixels: cols × rows are width × height). */
export function compileScene(source, { output = 'text' } = {}) {
  const pixels = output === 'pixels'
  const problems = sceneSourceProblems(source)
  if (problems.length) return { ok: false, problems }
  const context = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false }, microtaskMode: 'afterEvaluate' })
  try {
    vm.runInContext(`${SCENE_RUNTIME_SOURCE}${pixels ? PIXEL_STUB_SOURCE : ''}
var __scene = (function () {
${stripModuleSyntax(source)}
;return { render: typeof render === 'function' ? render : null, paint: typeof paint === 'function' ? paint : null, setup: typeof setup === 'function' ? setup : null };
})();`, context, { timeout: PREVIEW_LIMITS.compileTimeoutMs, filename: 'scenes.js' })
  } catch (error) {
    return { ok: false, problems: [`场景脚本无法加载：${errorText(error)}`] }
  }
  const entry = pixels ? 'paint' : 'render'
  const hasEntry = vm.runInContext(`typeof __scene.${entry}`, context, { timeout: 100 }) === 'function'
  if (!hasEntry) return { ok: false, problems: [pixels ? '场景脚本没有定义 paint(g, t, width, height, ctx) 函数（canvas.output 为 "pixels"）。' : '场景脚本没有定义 render(t, cols, rows, ctx) 函数。'] }
  const call = (code, timeout) => vm.runInContext(code, context, { timeout })
  return {
    ok: true,
    problems: [],
    pixels,
    setup(info) {
      if (call('typeof __scene.setup', 100) !== 'function') return
      call(`__scene.setup(JSON.parse(${JSON.stringify(JSON.stringify(info ?? {}))}))`, PREVIEW_LIMITS.compileTimeoutMs)
    },
    renderFrame(t, cols, rows, ctxData) {
      const started = process.hrtime.bigint()
      const code = pixels
        ? `(function () { __drawCalls = 0; var c = new OffscreenCanvas(${cols | 0}, ${rows | 0}); __scene.paint(c.getContext('2d'), ${Number(t)}, ${cols | 0}, ${rows | 0}, JSON.parse(${JSON.stringify(JSON.stringify(ctxData))})); return JSON.stringify({ lines: [], styles: [], calls: __drawCalls }) })()`
        : `JSON.stringify(__mvNormalize(__scene.render(${Number(t)}, ${cols | 0}, ${rows | 0}, JSON.parse(${JSON.stringify(JSON.stringify(ctxData))})), ${cols | 0}, ${rows | 0}))`
      const json = call(code, PREVIEW_LIMITS.frameTimeoutMs)
      const ms = Number(process.hrtime.bigint() - started) / 1e6
      return { ...JSON.parse(json), ms }
    },
  }
}

function errorText(error) {
  const text = String(error?.message ?? error)
  if (/Script execution timed out/.test(text)) return '运行超时（可能是死循环或太慢）'
  return text.split('\n')[0].slice(0, 600)
}

const SAMPLE_BANDS = t => Array.from({ length: 48 }, (_, i) => Math.max(0, Math.min(1, 0.55 + 0.45 * Math.sin(t * 3 + i * 0.4) * (1 - i / 64))))

/**
 * Run the scene at a few times (or one) and report problems, timing and the
 * text of the frames. `cues` are parsed lyric cues ({ time, end, en, zh }).
 */
export function checkScene(source, { times = [0], cols = 100, rows = 32, info = {}, cues = [], bandsAt = SAMPLE_BANDS, output = 'text', size = [1280, 720] } = {}) {
  const pixels = output === 'pixels'
  if (pixels) [cols, rows] = size
  else {
    cols = Math.max(20, Math.min(PREVIEW_LIMITS.maxCols, cols | 0))
    rows = Math.max(8, Math.min(PREVIEW_LIMITS.maxRows, rows | 0))
  }
  const scene = compileScene(source, { output })
  if (!scene.ok) return { ok: false, problems: scene.problems, frames: [] }
  const problems = []
  try { scene.setup(info) } catch (error) { return { ok: false, problems: [`setup() 出错：${errorText(error)}`], frames: [] } }
  const frames = []
  const cueAt = t => { let found = null; for (const cue of cues) if (cue.time <= t && !(cue.end <= t)) found = cue; return found }
  const nextAt = t => cues.find(cue => cue.time > t) ?? null
  for (const t of times) {
    const ctx = sceneContext({ t, duration: info.duration ?? 0, title: info.title ?? '', artist: info.artist ?? '', cue: cueAt(t), next: nextAt(t), bands: bandsAt(t), sections: info.sections ?? [], bpm: info.bpm ?? 0, beatOffset: info.beatOffset ?? 0 })
    try {
      const frame = scene.renderFrame(t, cols, rows, ctx)
      // pixel scenes run against a stand-in canvas here, so their timing says nothing about the panel
      if (!pixels && frame.ms > SCENE_LIMITS.frameBudgetMs) problems.push(`t=${t}s 这一帧用了 ${frame.ms.toFixed(1)} ms，超过 ${SCENE_LIMITS.frameBudgetMs} ms 的预算（面板里会被判为太慢）。`)
      if (pixels) {
        if (!frame.calls) problems.push(`t=${t}s 这一帧没有画任何东西。`)
        frames.push({ t, ms: Math.round(frame.ms * 10) / 10, text: '', calls: frame.calls })
        continue
      }
      if (frame.lines.every(line => !line.trim())) problems.push(`t=${t}s 这一帧是空白的。`)
      frames.push({ t, ms: Math.round(frame.ms * 10) / 10, text: frame.lines.map(line => line.replace(/\s+$/, '')).join('\n'), styled: frame.styles.some(Boolean) })
    } catch (error) {
      problems.push(`render(${t}) 出错：${errorText(error)}`)
    }
  }
  return { ok: !problems.some(p => /出错|超时/.test(p)), problems, frames, cols, rows }
}
