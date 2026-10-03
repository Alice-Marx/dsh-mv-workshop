/**
 * Host-side check of scene scripts for the agent tools: compile and run the
 * script in a fresh node:vm context (no require, no process, no timers, string
 * code generation disabled) with a timeout per call, and render sample frames
 * as plain text. Data goes in and out as JSON text only, so no Host object is
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

/** Compile a scene; returns { ok, problems, renderFrame(t, cols, rows, ctxData) }. */
export function compileScene(source) {
  const problems = sceneSourceProblems(source)
  if (problems.length) return { ok: false, problems }
  const context = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false }, microtaskMode: 'afterEvaluate' })
  try {
    vm.runInContext(`${SCENE_RUNTIME_SOURCE}
var __scene = (function () {
${stripModuleSyntax(source)}
;return { render: typeof render === 'function' ? render : null, setup: typeof setup === 'function' ? setup : null };
})();`, context, { timeout: PREVIEW_LIMITS.compileTimeoutMs, filename: 'scenes.js' })
  } catch (error) {
    return { ok: false, problems: [`场景脚本无法加载：${errorText(error)}`] }
  }
  const hasRender = vm.runInContext('typeof __scene.render', context, { timeout: 100 }) === 'function'
  if (!hasRender) return { ok: false, problems: ['场景脚本没有定义 render(t, cols, rows, ctx) 函数。'] }
  const call = (code, timeout) => vm.runInContext(code, context, { timeout })
  return {
    ok: true,
    problems: [],
    setup(info) {
      if (call('typeof __scene.setup', 100) !== 'function') return
      call(`__scene.setup(JSON.parse(${JSON.stringify(JSON.stringify(info ?? {}))}))`, PREVIEW_LIMITS.compileTimeoutMs)
    },
    renderFrame(t, cols, rows, ctxData) {
      const started = process.hrtime.bigint()
      const json = call(`JSON.stringify(__mvNormalize(__scene.render(${Number(t)}, ${cols | 0}, ${rows | 0}, JSON.parse(${JSON.stringify(JSON.stringify(ctxData))})), ${cols | 0}, ${rows | 0}))`, PREVIEW_LIMITS.frameTimeoutMs)
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
export function checkScene(source, { times = [0], cols = 100, rows = 32, info = {}, cues = [], bandsAt = SAMPLE_BANDS } = {}) {
  cols = Math.max(20, Math.min(PREVIEW_LIMITS.maxCols, cols | 0))
  rows = Math.max(8, Math.min(PREVIEW_LIMITS.maxRows, rows | 0))
  const scene = compileScene(source)
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
      if (frame.ms > SCENE_LIMITS.frameBudgetMs) problems.push(`t=${t}s 这一帧用了 ${frame.ms.toFixed(1)} ms，超过 ${SCENE_LIMITS.frameBudgetMs} ms 的预算（面板里会被判为太慢）。`)
      if (frame.lines.every(line => !line.trim())) problems.push(`t=${t}s 这一帧是空白的。`)
      frames.push({ t, ms: Math.round(frame.ms * 10) / 10, text: frame.lines.map(line => line.replace(/\s+$/, '')).join('\n'), styled: frame.styles.some(Boolean) })
    } catch (error) {
      problems.push(`render(${t}) 出错：${errorText(error)}`)
    }
  }
  return { ok: !problems.some(p => /出错|超时/.test(p)), problems, frames, cols, rows }
}
