/**
 * Host-side check of scene scripts for the agent tools: compile and run the
 * script in a fresh node:vm context (no require, no process, no timers, string
 * code generation disabled) with a timeout per call, and render sample frames
 * as plain text (pixel scenes run against a recording canvas stand-in). Data goes in and out as JSON text only, so no Host object is
 * reachable from the script.
 *
 * The whole lifecycle is mirrored here, not just the frame call: setup(),
 * prepare() and the 0.9.7 warmup() stage all run, so a scene that only
 * initialises correctly is not reported as broken by the checker.
 *
 * node:vm is not a security boundary against hostile code; it is used here to
 * catch mistakes (syntax errors, endless loops, wrong return shapes) in a
 * script the user asked their own agent to write. Playback in the panel uses a
 * Web Worker sandbox (see mv-scene.mjs).
 */
import vm from 'node:vm'
import { SCENE_LIMITS, SCENE_BLOCKED_GLOBALS, SCENE_RUNTIME_SOURCE, SCENE_PREPARE_RUNTIME_SOURCE, WEBGL_CANVAS_FACADE_SOURCE, sceneContext, sceneSourceProblems, stripModuleSyntax } from './mv-scene.mjs'

export const PREVIEW_LIMITS = Object.freeze({ compileTimeoutMs: 5000, frameTimeoutMs: 500, warmupTimeoutMs: SCENE_LIMITS.warmupTimeoutMs, maxCols: 160, maxRows: 60 })

/**
 * A recording stand-in for the 2D canvas API, so pixel scenes (canvas.output
 * "pixels") can be checked without a real canvas: every method is accepted,
 * drawing calls are counted, nothing is drawn. Evaluated inside the vm.
 */
export const PIXEL_STUB_SOURCE = String.raw`
var __drawCalls = 0, __requiresRealReadback = false;
// VM-local recording handle: paths can be constructed, but no pixels are
// rasterized here. Keep Host functions and objects outside the scene context.
function Path2D() {}
for (const name of ['addPath', 'closePath', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'arcTo', 'rect', 'arc', 'ellipse', 'roundRect']) Path2D.prototype[name] = function () {};
var __DRAW = { fill: 1, stroke: 1, fillRect: 1, strokeRect: 1, fillText: 1, strokeText: 1, drawImage: 1, putImageData: 1 };
function __stubContext(canvas) {
  var noop = function () {};
  var gradient = { addColorStop: noop };
  var helpers = {
    canvas: canvas,
    measureText: function (text) { var n = String(text).length; return { width: n * 8, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2, actualBoundingBoxLeft: 0, actualBoundingBoxRight: n * 8 } },
    createLinearGradient: function () { return gradient }, createRadialGradient: function () { return gradient }, createConicGradient: function () { return gradient },
    createPattern: function () { return { setTransform: noop } },
    // A WebGL scene may derive geometry from actual text/image pixels. Empty
    // fabricated data can make valid sampling loops diverge; stop explicitly
    // and require browser validation instead of pretending to rasterize ink.
    getImageData: function (x, y, w, h) { if (__requiresRealReadback) throw new Error('MV_HOST_REQUIRES_PIXEL_READBACK'); w = Math.max(1, Math.min(4096, w | 0)); h = Math.max(1, Math.min(4096, h | 0)); return { width: w, height: h, data: new Uint8ClampedArray(Math.min(16777216, w * h * 4)) } },
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

/**
 * Recording WebGL2 stand-in for structural checks. It deliberately does not
 * compile shaders or render pixels: it supplies stable object handles and
 * common query results, counts API calls, and separately counts clear/draw
 * submissions. Real GPU capability is checked only by the panel/browser.
 */
export const WEBGL_STUB_SOURCE = String.raw`
var __glCalls = 0, __glDrawCalls = 0;
__requiresRealReadback = true;
var __GL_DRAW = { clear: 1, drawArrays: 1, drawElements: 1, drawArraysInstanced: 1, drawElementsInstanced: 1, blitFramebuffer: 1 };
var __GL_OBJECT = { createBuffer: 1, createFramebuffer: 1, createProgram: 1, createQuery: 1, createRenderbuffer: 1, createSampler: 1, createShader: 1, createTexture: 1, createTransformFeedback: 1, createVertexArray: 1, fenceSync: 1 };
var __GL_TRUE = { isBuffer: 1, isEnabled: 1, isFramebuffer: 1, isProgram: 1, isQuery: 1, isRenderbuffer: 1, isSampler: 1, isShader: 1, isSync: 1, isTexture: 1, isTransformFeedback: 1, isVertexArray: 1 };
var __GL_CONSTANTS = {
  COLOR_BUFFER_BIT: 16384, DEPTH_BUFFER_BIT: 256, STENCIL_BUFFER_BIT: 1024,
  VERTEX_SHADER: 35633, FRAGMENT_SHADER: 35632, COMPILE_STATUS: 35713, LINK_STATUS: 35714, ACTIVE_UNIFORMS: 35718, ACTIVE_ATTRIBUTES: 35721,
  VERSION: 7938, SHADING_LANGUAGE_VERSION: 35724, SCISSOR_BOX: 3088,
  ARRAY_BUFFER: 34962, ELEMENT_ARRAY_BUFFER: 34963, STATIC_DRAW: 35044, DYNAMIC_DRAW: 35048,
  FLOAT: 5126, UNSIGNED_BYTE: 5121, UNSIGNED_SHORT: 5123, UNSIGNED_INT: 5125,
  TRIANGLES: 4, LINES: 1, POINTS: 0, FRAMEBUFFER_COMPLETE: 36053,
  TEXTURE_2D: 3553, TEXTURE0: 33984, RGBA: 6408, RGB: 6407,
};
function __stubWebGL2(canvas) {
  var state = { canvas: canvas, drawingBufferColorSpace: 'srgb', unpackColorSpace: 'srgb' };
  return new Proxy(state, {
    get: function (o, k) {
      if (k === 'drawingBufferWidth') return canvas.width;
      if (k === 'drawingBufferHeight') return canvas.height;
      if (k in o) return o[k];
      if (k in __GL_CONSTANTS) return __GL_CONSTANTS[k];
      if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) return 0;
      return function () {
        __glCalls++;
        if (__GL_DRAW[k]) __glDrawCalls++;
        if (__GL_OBJECT[k]) return { __webglStub: k };
        if (__GL_TRUE[k]) return true;
        if (k === 'getShaderParameter') return arguments[1] === 35713;
        if (k === 'getProgramParameter') return arguments[1] === 35714 ? true : 0;
        if (k === 'checkFramebufferStatus') return __GL_CONSTANTS.FRAMEBUFFER_COMPLETE;
        if (k === 'getAttribLocation') return 0;
        if (k === 'getUniformLocation') return { __webglStub: k };
        if (k === 'getShaderInfoLog' || k === 'getProgramInfoLog') return '';
        if (k === 'getSupportedExtensions') return [];
        if (k === 'getExtension') return arguments[0] === 'EXT_color_buffer_float' ? {} : null;
        if (k === 'isContextLost') return false;
        if (k === 'getContextAttributes') return { alpha: false, antialias: true, depth: true, stencil: false, premultipliedAlpha: false };
        if (k === 'getParameter') {
          if (arguments[0] === 7938) return 'WebGL 2.0 structural stub';
          if (arguments[0] === 35724) return 'WebGL GLSL ES 3.00 structural stub';
          if (arguments[0] === 3088) return [0, 0, canvas.width, canvas.height];
          if (arguments[0] === 33902 || arguments[0] === 33901) return [1, 1];
          return 16;
        }
        if (k === 'getShaderPrecisionFormat') return { rangeMin: 127, rangeMax: 127, precision: 23 };
        if (k === 'getActiveUniform' || k === 'getActiveAttrib') return null;
        return undefined;
      };
    },
    set: function (o, k, v) { o[k] = v; return true },
  });
}
function OffscreenCanvas(w, h) { this.width = w | 0; this.height = h | 0; this.__gl = null }
OffscreenCanvas.prototype.getContext = function (type) { if (type === '2d') return this.__g || (this.__g = __stubContext(this)); if (type !== 'webgl2') return null; if (!this.__gl) this.__gl = __stubWebGL2(this); return this.__gl };
var __hostCanvas = new OffscreenCanvas(1, 1), __hostGl = __hostCanvas.getContext('webgl2');
`

/** Compile a scene; returns { ok, problems, renderFrame(t, cols, rows, ctxData) } (pixels: cols × rows are width × height). */
export function compileScene(source, { output = 'text' } = {}) {
  const pixels = output === 'pixels'
  const webgl = output === 'webgl'
  const bitmap = pixels || webgl
  const problems = sceneSourceProblems(source, { output })
  if (problems.length) return { ok: false, problems }
  const context = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false }, microtaskMode: 'afterEvaluate' })
  try {
    vm.runInContext(`"use strict";
(function (scope) {
  for (const name of ${JSON.stringify(SCENE_BLOCKED_GLOBALS)}) Object.defineProperty(scope, name, { value: undefined, writable: false, configurable: false });
})(globalThis);
${SCENE_RUNTIME_SOURCE}${SCENE_PREPARE_RUNTIME_SOURCE}${WEBGL_CANVAS_FACADE_SOURCE}${bitmap ? PIXEL_STUB_SOURCE : ''}${webgl ? WEBGL_STUB_SOURCE : ''}
${pixels ? 'var __hostCanvas = new OffscreenCanvas(1, 1);' : ''}
var __scene = (function () {
${stripModuleSyntax(source)}
;return { render: typeof render === 'function' ? render : null, paint: typeof paint === 'function' ? paint : null, setup: typeof setup === 'function' ? setup : null, prepare: typeof prepare === 'function' ? prepare : null, warmup: typeof warmup === 'function' ? warmup : null };
})();
var __hostPreparation = null, __hostPrepareProgress = 0, __hostPrepareWidth = 0, __hostPrepareHeight = 0, __hostInfo = null;
var __hostReady = false;
function __hostSetup(info) {
  __hostReady = false;
  ${bitmap ? '__hostCanvas.width = info.width || 1280; __hostCanvas.height = info.height || 720;' : ''}
  ${webgl ? 'info.canvas = __mvCanvasFacade(__hostCanvas, __hostGl);' : ''}
  __hostInfo = info;
  if (__scene.setup) __scene.setup(info, ${webgl ? '__hostGl' : 'undefined'});
  ${bitmap ? '__hostPrepareWidth = __hostCanvas.width; __hostPrepareHeight = __hostCanvas.height;' : ''}
  __hostPreparation = __scene.prepare ? __mvPrepareIterator(__scene.prepare(info, ${webgl ? '__hostGl' : 'undefined'})) : null;
  ${bitmap ? `if (__hostPreparation && (__hostCanvas.width !== __hostPrepareWidth || __hostCanvas.height !== __hostPrepareHeight)) throw Error('prepare() 不能更改输出 canvas.size');` : ''}
  __hostPrepareProgress = 0; __hostReady = false;
}
// 0.9.7: mirrors the worker's warmup stage, so a scene that only warms up correctly
// is not reported as broken here. Recording-only: gl.finish() is a no-op stub.
function __hostWarmup() {
  if (__hostPreparation) throw Error('prepare() 尚未完成');
  // Scenes without a warmup() stage are ready once setup()/prepare() are done.
  if (!__scene.warmup) { __hostReady = true; return false; }
  __mvWarmupResult(__scene.warmup(__hostInfo, ${webgl ? '__hostGl' : 'undefined'}));
  ${bitmap ? `if (__hostCanvas.width !== __hostPrepareWidth || __hostCanvas.height !== __hostPrepareHeight) throw Error('warmup() 不能更改输出 canvas.size');` : ''}
  ${webgl ? `if (__hostGl.isContextLost()) throw Error('WebGL 上下文已丢失');
  __hostGl.finish();
  if (__hostGl.isContextLost()) throw Error('WebGL 上下文已丢失');` : ''}
  __hostReady = true;
  return true;
}
function __hostPrepareStep() {
  const status = __mvPrepareProgress(__hostPreparation.next.call(__hostPreparation.iterator), __hostPrepareProgress);
  ${bitmap ? `if (__hostCanvas.width !== __hostPrepareWidth || __hostCanvas.height !== __hostPrepareHeight) throw Error('prepare() 不能更改输出 canvas.size');` : ''}
  ${webgl ? `if (__hostGl.isContextLost()) throw Error('WebGL 上下文已丢失');
  __hostGl.finish();` : ''}
  __hostPrepareProgress = status.progress;
  if (status.done) __hostPreparation = null;
  return JSON.stringify(status);
}`, context, { timeout: PREVIEW_LIMITS.compileTimeoutMs, filename: 'scenes.js' })
  } catch (error) {
    return { ok: false, problems: [`场景脚本无法加载：${errorText(error)}`] }
  }
  const entry = bitmap ? 'paint' : 'render'
  const hasEntry = vm.runInContext(`typeof __scene.${entry}`, context, { timeout: 100 }) === 'function'
  if (!hasEntry) return { ok: false, problems: [webgl ? '场景脚本没有定义 paint(gl, t, width, height, ctx) 函数（canvas.output 为 "webgl"）。' : pixels ? '场景脚本没有定义 paint(g, t, width, height, ctx) 函数（canvas.output 为 "pixels"）。' : '场景脚本没有定义 render(t, cols, rows, ctx) 函数。'] }
  const call = (code, timeout) => vm.runInContext(code, context, { timeout })
  // Mirrors the worker: warmup() runs once, after setup()/prepare(), on the final surface.
  const runWarmup = () => {
    const started = Date.now()
    const warmup = Boolean(call('__hostWarmup()', PREVIEW_LIMITS.warmupTimeoutMs))
    return { warmup, warmupMs: Date.now() - started }
  }
  return {
    ok: true,
    problems: [],
    pixels,
    webgl,
    gpuValidated: webgl ? false : undefined,
    setup(info) {
      call(`__hostSetup(JSON.parse(${JSON.stringify(JSON.stringify(info ?? {}))}))`, PREVIEW_LIMITS.compileTimeoutMs)
      if (!call('Boolean(__hostPreparation)', 100)) {
        const warmed = runWarmup()
        return warmed.warmup ? { steps: 0, ms: 0, progress: [], ...warmed } : null
      }
      const started = Date.now(), progress = []
      for (let step = 1; step <= SCENE_LIMITS.prepareMaxSteps; step++) {
        const remaining = SCENE_LIMITS.prepareTotalTimeoutMs - (Date.now() - started)
        if (remaining <= 0) throw new Error('prepare() 总计超时')
        let status
        try { status = JSON.parse(call('__hostPrepareStep()', Math.min(SCENE_LIMITS.prepareStepTimeoutMs, remaining))) }
        catch (error) { throw new Error(`prepare() 第 ${step} 步（上一步 ${progress.at(-1)?.label || '开始'}）：${errorText(error)}`) }
        progress.push({ step, progress: status.progress, label: status.label })
        if (Date.now() - started > SCENE_LIMITS.prepareTotalTimeoutMs) throw new Error('prepare() 总计超时')
        if (status.done) {
          const ms = Date.now() - started
          return { steps: step, ms, progress, ...runWarmup() }
        }
      }
      throw new Error(`prepare() 超过 ${SCENE_LIMITS.prepareMaxSteps} 个步骤`)
    },
    renderFrame(t, cols, rows, ctxData) {
      if (!call('__hostReady', 100)) throw new Error('场景尚未准备完成')
      const started = process.hrtime.bigint()
      const code = pixels
        ? `(function () { __drawCalls = 0; var c = new OffscreenCanvas(${cols | 0}, ${rows | 0}); __scene.paint(c.getContext('2d'), ${Number(t)}, ${cols | 0}, ${rows | 0}, JSON.parse(${JSON.stringify(JSON.stringify(ctxData))})); return JSON.stringify({ lines: [], styles: [], calls: __drawCalls }) })()`
        : webgl
          ? `(function () { __glCalls = 0; __glDrawCalls = 0; __hostCanvas.width = ${cols | 0}; __hostCanvas.height = ${rows | 0}; __scene.paint(__hostGl, ${Number(t)}, ${cols | 0}, ${rows | 0}, JSON.parse(${JSON.stringify(JSON.stringify(ctxData))})); return JSON.stringify({ lines: [], styles: [], calls: __glCalls, drawCalls: __glDrawCalls }) })()`
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
  const webgl = output === 'webgl'
  const bitmap = pixels || webgl
  if (bitmap) [cols, rows] = size
  else {
    cols = Math.max(20, Math.min(PREVIEW_LIMITS.maxCols, cols | 0))
    rows = Math.max(8, Math.min(PREVIEW_LIMITS.maxRows, rows | 0))
  }
  const scene = compileScene(source, { output })
  if (!scene.ok) return { ok: false, problems: scene.problems, frames: [] }
  const problems = []
  let preparation = null
  try { preparation = scene.setup(bitmap ? { ...info, width: cols, height: rows } : info) } catch (error) {
    const needsPixels = webgl && errorText(error).includes('MV_HOST_REQUIRES_PIXEL_READBACK')
    return { ok: false, problems: [needsPixels ? '此 WebGL 场景通过真实画布像素生成几何；Host 仅能记录 API 调用，需在真实浏览器中验证。' : `setup() / prepare() / warmup() 出错：${errorText(error)}`], frames: [], ...(webgl ? { gpuValidated: false, validation: 'webgl-call-recording' } : {}), ...(needsPixels ? { requiresBrowserValidation: true } : {}) }
  }
  const frames = []
  const cueAt = t => { let found = null; for (const cue of cues) if (cue.time <= t && !(cue.end <= t)) found = cue; return found }
  const nextAt = t => cues.find(cue => cue.time > t) ?? null
  for (const t of times) {
    const ctx = sceneContext({ t, duration: info.duration ?? 0, title: info.title ?? '', artist: info.artist ?? '', cue: cueAt(t), next: nextAt(t), bands: bandsAt(t), sections: info.sections ?? [], bpm: info.bpm ?? 0, beatOffset: info.beatOffset ?? 0 })
    try {
      const frame = scene.renderFrame(t, cols, rows, ctx)
      // pixel scenes run against a stand-in canvas here, so their timing says nothing about the panel
      if (!bitmap && frame.ms > SCENE_LIMITS.frameBudgetMs) problems.push(`t=${t}s 这一帧用了 ${frame.ms.toFixed(1)} ms，超过 ${SCENE_LIMITS.frameBudgetMs} ms 的预算（面板里会被判为太慢）。`)
      if (bitmap) {
        if (webgl ? !frame.drawCalls : !frame.calls) problems.push(webgl ? `t=${t}s 这一帧没有提交任何 WebGL 绘制或清屏调用。` : `t=${t}s 这一帧没有画任何东西。`)
        frames.push({ t, ms: Math.round(frame.ms * 10) / 10, text: '', calls: frame.calls, ...(webgl ? { drawCalls: frame.drawCalls } : {}) })
        continue
      }
      if (frame.lines.every(line => !line.trim())) problems.push(`t=${t}s 这一帧是空白的。`)
      frames.push({ t, ms: Math.round(frame.ms * 10) / 10, text: frame.lines.map(line => line.replace(/\s+$/, '')).join('\n'), styled: frame.styles.some(Boolean) })
    } catch (error) {
      problems.push(`render(${t}) 出错：${errorText(error)}`)
    }
  }
  if (webgl) problems.push('WebGL 场景在 Host 中只做结构与 API 调用记录检查；未在真实 GPU 上编译 shader 或验证像素。')
  return { ok: !problems.some(p => /出错|超时/.test(p)), problems, frames, cols, rows, ...(preparation ? { preparation } : {}), ...(webgl ? { gpuValidated: false, validation: 'webgl-call-recording' } : {}) }
}
