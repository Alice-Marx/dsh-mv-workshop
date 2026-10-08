// SPDX-License-Identifier: MIT
// Nyankomint 2073b0c88c6fc837482478402a44f101b3b57d6f; adapter Alice-Marx, 2026-10-08.
// Character art/output CC BY-NC-SA 4.0; fonts OFL; captions separate Mili terms.
var NyankomintWorkshop = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __name = (target2, value) => __defProp(target2, "name", { value, configurable: true });
  var __export = (target2, all) => {
    for (var name in all)
      __defProp(target2, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // presets/ports/nyankomintsu/scene.mjs
  var scene_exports = {};
  __export(scene_exports, {
    paint: () => paint,
    prepare: () => prepare,
    setup: () => setup,
    warmup: () => warmup
  });

  // nyan-source:src/engine/prng.js
  var SEED = 1;
  function setSeed(s) {
    SEED = s >>> 0;
  }
  __name(setSeed, "setSeed");
  function mix(h) {
    h ^= h >>> 16;
    h = Math.imul(h, 2146121005);
    h ^= h >>> 15;
    h = Math.imul(h, 2221713035);
    h ^= h >>> 16;
    return h >>> 0;
  }
  __name(mix, "mix");
  function hashU32(...keys) {
    let h = SEED ^ 2654435769;
    for (const k of keys) h = mix(h + Math.imul(Math.floor(k) + 2135587861, 2246822507) | 0);
    return h;
  }
  __name(hashU32, "hashU32");
  function rand(...keys) {
    return hashU32(...keys) / 4294967296;
  }
  __name(rand, "rand");
  function noise3(x, y, z, seed = 0) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const fx = x - ix, fy = y - iy, fz = z - iz;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
    const c = /* @__PURE__ */ __name((a, b, d) => rand(seed, ix + a, iy + b, iz + d), "c");
    const x00 = c(0, 0, 0) * (1 - ux) + c(1, 0, 0) * ux, x10 = c(0, 1, 0) * (1 - ux) + c(1, 1, 0) * ux;
    const x01 = c(0, 0, 1) * (1 - ux) + c(1, 0, 1) * ux, x11 = c(0, 1, 1) * (1 - ux) + c(1, 1, 1) * ux;
    return (x00 * (1 - uy) + x10 * uy) * (1 - uz) + (x01 * (1 - uy) + x11 * uy) * uz;
  }
  __name(noise3, "noise3");

  // nyan-source:src/engine/util.js
  var clamp = /* @__PURE__ */ __name((x, a = 0, b = 1) => x < a ? a : x > b ? b : x, "clamp");
  var lerp = /* @__PURE__ */ __name((a, b, k) => a + (b - a) * k, "lerp");
  var prog = /* @__PURE__ */ __name((t, a, b) => clamp((t - a) / (b - a)), "prog");
  var easeOut = /* @__PURE__ */ __name((k) => 1 - Math.pow(1 - k, 3), "easeOut");
  var easeIn = /* @__PURE__ */ __name((k) => k * k * k, "easeIn");
  var easeInOut = /* @__PURE__ */ __name((k) => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, "easeInOut");
  var easeBack = /* @__PURE__ */ __name((k) => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
  }, "easeBack");
  var pulse = /* @__PURE__ */ __name((since, decay) => since < 0 ? 0 : Math.exp(-decay * since), "pulse");
  var window01 = /* @__PURE__ */ __name((t, a, b, fin = 0.2, fout = 0.2) => Math.min(prog(t, a, a + fin), 1 - prog(t, b - fout, b)), "window01");

  // nyan-source:src/engine/features.js
  var Features = class {
    static {
      __name(this, "Features");
    }
    constructor(data, cfg) {
      this.d = data;
      this.fps = data.meta.fps;
      this.n = data.meta.frames;
      this.duration = data.meta.duration;
      this.bpm = data.bpm;
      this.period = data.grid.period;
      this.t0 = data.grid.t0;
      this.downPhase = data.downbeatPhase;
      this.onT = data.onsets.t;
      this.onS = data.onsets.s;
      this.nb = data.meta.spectrumBands;
      this.spec = Uint8Array.from(data.spectrum);
      this.r = cfg.reactive;
    }
    /** Linear-interpolated per-frame series: 'rms' | 'low' | 'mid' | 'high'. */
    series(name, t) {
      const a = this.d[name], x = clamp(t * this.fps, 0, this.n - 1);
      const i = Math.floor(x), k = x - i;
      return a[i] * (1 - k) + a[Math.min(i + 1, this.n - 1)] * k;
    }
    /** Peak-hold envelope: max over the recent past of value * exp(-release * age). Smooth but stateless. */
    env(name, t, release = 8, windowSec = 0.5) {
      const a = this.d[name], end = Math.floor(clamp(t * this.fps, 0, this.n - 1));
      const start = Math.max(0, end - Math.ceil(windowSec * this.fps));
      let m = 0;
      for (let i = start; i <= end; i++) m = Math.max(m, a[i] * Math.exp(-release * (t - i / this.fps)));
      return Math.max(m, this.series(name, t));
    }
    /** Spectrum (0..1 per band) written into `out`. */
    spectrum(t, out = new Float32Array(this.nb)) {
      const x = clamp(t * this.fps, 0, this.n - 1), i = Math.floor(x), k = x - i, j = Math.min(i + 1, this.n - 1);
      for (let b = 0; b < this.nb; b++) {
        out[b] = (this.spec[i * this.nb + b] * (1 - k) + this.spec[j * this.nb + b] * k) / 255;
      }
      return out;
    }
    beatTime(i) {
      return this.t0 + i * this.period;
    }
    beatIndex(t) {
      return Math.floor((t - this.t0) / this.period + 1e-6);
    }
    /** Bar n starts on beat downPhase + 4n. */
    barTime(n) {
      return this.beatTime(this.downPhase + 4 * n);
    }
    barIndex(t) {
      return Math.floor((this.beatIndex(t) - this.downPhase) / 4);
    }
    /** Nearest half-beat (eighth note) to t: cut points for shots that follow a lyric line. */
    snapHalf(t) {
      return this.t0 + Math.round((t - this.t0) / (this.period / 2)) * (this.period / 2);
    }
    /** Nearest beat time if within tol seconds, else t itself. */
    snapToBeat(t, tol = 0.09) {
      const b = this.beatTime(Math.round((t - this.t0) / this.period));
      return Math.abs(b - t) <= tol ? b : t;
    }
    /** Index of the last onset with time <= t (or -1). */
    onsetIndex(t) {
      let lo = 0, hi = this.onT.length - 1, r = -1;
      while (lo <= hi) {
        const m = lo + hi >> 1;
        if (this.onT[m] <= t) {
          r = m;
          lo = m + 1;
        } else hi = m - 1;
      }
      return r;
    }
    /** Onsets in (t0, t1] with strength >= minS, as [{i, t, s}]. */
    onsetsIn(t0, t1, minS = 0) {
      const out = [];
      for (let i = this.onsetIndex(t1); i >= 0 && this.onT[i] > t0; i--) {
        if (this.onS[i] >= minS) out.push({ i, t: this.onT[i], s: this.onS[i] });
      }
      return out;
    }
    /**
     * Everything a scene usually needs at time t. Before the song (t < 0: the warning page) there is no audio:
     * the levels are those of the first instant and nothing has pulsed yet.
     */
    sample(time) {
      const t = time < 0 ? 0 : time;
      if (time < 0) {
        return {
          t: time,
          src: this,
          rms: 0,
          low: 0,
          mid: 0,
          high: 0,
          lowEnv: 0,
          rmsEnv: 0,
          beat: this.beatIndex(time),
          beatPhase: 0,
          sinceBeat: 0,
          beatInBar: 0,
          bar: this.barIndex(time),
          sinceBar: 0,
          barPhase: 0,
          beatPulse: 0,
          barPulse: 0,
          onset: -1,
          sinceOnset: 1e9,
          onsetStrength: 0,
          onsetPulse: 0
        };
      }
      const beat = this.beatIndex(t);
      const sinceBeat = t - this.beatTime(beat);
      const rel = beat - this.downPhase;
      const bar = Math.floor(rel / 4), beatInBar = (rel % 4 + 4) % 4;
      const sinceBar = t - this.barTime(bar);
      const started = t >= this.t0;
      const oi = this.onsetIndex(t);
      const sinceOnset = oi >= 0 ? t - this.onT[oi] : 1e9;
      const onsetStrength = oi >= 0 ? this.onS[oi] : 0;
      return {
        t,
        src: this,
        rms: this.series("rms", t),
        low: this.series("low", t),
        mid: this.series("mid", t),
        high: this.series("high", t),
        lowEnv: this.env("low", t, 7),
        rmsEnv: this.env("rms", t, 5),
        beat,
        beatPhase: sinceBeat / this.period,
        sinceBeat,
        beatInBar,
        bar,
        sinceBar,
        barPhase: sinceBar / (this.period * 4),
        beatPulse: started ? pulse(sinceBeat, this.r.beatDecay) : 0,
        barPulse: started ? pulse(sinceBar, this.r.beatDecay * 0.6) : 0,
        onset: oi,
        sinceOnset,
        onsetStrength,
        onsetPulse: onsetStrength * pulse(sinceOnset, this.r.onsetDecay)
      };
    }
  };

  // nyan-source:src/engine/lyrics.js
  var Lyrics = class {
    static {
      __name(this, "Lyrics");
    }
    constructor(data, cfg, features) {
      this.lines = data.lines;
      this.sections = data.sections;
      this.typing = cfg.typing;
      this.offset = cfg.timing.lyricOffset || 0;
      const tol = cfg.timing.keywordSnap || 0;
      this.starts = this.lines.map((l) => l.emphasis && tol > 0 && features ? features.snapToBeat(l.start, tol) : l.start);
    }
    /** Line start/end with snapping and lyricOffset applied. */
    start(i) {
      return this.starts[i] + this.offset;
    }
    end(i) {
      return this.lines[i].end + this.offset;
    }
    /** Index of the last line whose start <= t (or -1 before the first line). */
    indexAt(t) {
      let lo = 0, hi = this.lines.length - 1, r = -1;
      while (lo <= hi) {
        const m = lo + hi >> 1;
        if (this.start(m) <= t) {
          r = m;
          lo = m + 1;
        } else hi = m - 1;
      }
      return r;
    }
    /** How many characters of line i are typed at time t. Uses word timestamps when the LRC has them. */
    typed(i, t) {
      const ln = this.lines[i], len = ln.text.length;
      if (ln.words) {
        let n = 0;
        for (const w of ln.words) {
          if (w.t + this.offset <= t) n += w.text.length;
        }
        return { n: Math.min(n, len), done: n >= len };
      }
      const dur = Math.min(len / this.typing.charsPerSec, (this.end(i) - this.start(i)) * this.typing.maxFraction);
      const k = clamp((t - this.start(i)) / Math.max(dur, 1e-3));
      return { n: Math.floor(k * len + 1e-6), done: k >= 1 };
    }
    /** Current-line summary used by the HUD and the preview page. */
    state(t) {
      const index = this.indexAt(t);
      if (index < 0) return { index, line: null, active: false };
      const line = this.lines[index];
      return { index, line, active: t < this.end(index), section: line.section, ...this.typed(index, t) };
    }
  };

  // nyan-source:src/engine/palette.js
  var ROLES = ["bg", "panel", "raised", "line", "text", "sub", "mute", "me", "meHot", "meDim", "err", "errDim", "bloom"];
  var SCALARS = ["glow", "sat"];
  var ALIAS = { fg: "text", mid: "sub", dim: "mute", faint: "line", accent: "text", alt: "me" };
  function parseHex(hex) {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
    if (!m) return null;
    const n = parseInt(m[1].length === 3 ? m[1].replace(/./g, "$&$&") : m[1], 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  __name(parseHex, "parseHex");
  var badHex = /* @__PURE__ */ new Set();
  function hexToRgb(hex) {
    const c = parseHex(hex);
    if (c) return c;
    if (!badHex.has(hex)) {
      badHex.add(hex);
      console.error(`[palette] "${hex}" is not a colour - write '#rgb' or '#rrggbb'`);
    }
    return [0, 0, 0];
  }
  __name(hexToRgb, "hexToRgb");
  function withAliases(p) {
    for (const [old, role] of Object.entries(ALIAS)) p[old] = p[role];
    return p;
  }
  __name(withAliases, "withAliases");
  function buildPalettes(defs) {
    const out = {};
    for (const [name, d] of Object.entries(defs)) {
      if (name.startsWith("_")) continue;
      const p = { name, glow: d.glow ?? 1, sat: d.sat ?? 1 };
      for (const r of ROLES) p[r] = hexToRgb(d[r] ?? d.text);
      out[name] = withAliases(p);
    }
    return out;
  }
  __name(buildPalettes, "buildPalettes");
  function mixPal(a, b, k) {
    if (k <= 0 || a === b) return a;
    if (k >= 1) return b;
    const p = { name: `${a.name}>${b.name}` };
    for (const s of SCALARS) p[s] = a[s] + (b[s] - a[s]) * k;
    for (const r of ROLES) p[r] = [0, 1, 2].map((i) => a[r][i] + (b[r][i] - a[r][i]) * k);
    return withAliases(p);
  }
  __name(mixPal, "mixPal");

  // nyan-source:src/engine/layout.js
  var VW = 1920;
  var VH = 1080;
  var SAFE = { x: 56, y: 104, w: 1808, h: 872 };
  function split(ratio = 0.4115, area = SAFE, gap2 = 32) {
    const lw = Math.round(area.w * ratio);
    return {
      log: { x: area.x, y: area.y, w: lw, h: area.h },
      stage: { x: area.x + lw + gap2, y: area.y, w: area.w - lw - gap2, h: area.h }
    };
  }
  __name(split, "split");
  function frameRect(r, margin = 0) {
    const zoom = Math.min(VW / (r.w + 2 * margin), VH / (r.h + 2 * margin));
    return { x: r.x + r.w / 2 - VW / 2, y: r.y + r.h / 2 - VH / 2, zoom };
  }
  __name(frameRect, "frameRect");
  var lerpRect = /* @__PURE__ */ __name((a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, w: a.w + (b.w - a.w) * k, h: a.h + (b.h - a.h) * k }), "lerpRect");

  // nyan-source:src/engine/draw.js
  var SPLIT = split();
  var LAYOUT = { top: 64, bottom: 1016, pad: 56, log: SPLIT.log, stage: SPLIT.stage, full: SAFE };
  var literal = /* @__PURE__ */ new Map();
  var measured = /* @__PURE__ */ new Map();
  var flagged = /* @__PURE__ */ new Set();
  function reportOnce(key, msg) {
    if (flagged.has(key)) return;
    flagged.add(key);
    console.error(msg);
  }
  __name(reportOnce, "reportOnce");
  var LATIN = "\\t\\n\\f\\r -~\\u00a0-\\u00ac\\u00ae-\\u00ff\\u0131\\u0152\\u0153\\u02bc\\u02c6\\u02da\\u02dc\\u0300\\u0301\\u0303\\u0304\\u0308\\u0309\\u0323\\u2013\\u2014\\u2018-\\u201a\\u201c-\\u201e\\u2022\\u2026\\u2032\\u2033\\u2039\\u203a\\u2044\\u20ac\\u2122\\u2191\\u2193\\u2212";
  var OUTSIDE = {
    mono: new RegExp(`[^${LATIN}\\u00ad\\u0102\\u2215\\ufeff]`),
    serif: new RegExp(`[^${LATIN}\\u00ad\\u02bb\\u0329\\u2002\\u2009\\u200b\\u2215]`),
    sans: new RegExp(`[^${LATIN}\\u02bb\\u2002\\u2009\\u200b\\ufeff]`)
  };
  var unknownColour = /* @__PURE__ */ __name((name) => reportOnce(`col|${name}`, `[palette] unknown colour "${name}" - use a role (text, sub, me, err, ...) or '#rgb' / '#rrggbb'`), "unknownColour");
  var codePoints = /* @__PURE__ */ __name((chars) => [...new Set(chars)].map((ch) => "U+" + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")).join(" "), "codePoints");
  var Ctx = class {
    static {
      __name(this, "Ctx");
    }
    constructor(canvas, cfg, palettes, { alpha = false } = {}) {
      this.canvas = canvas;
      this.g = canvas.getContext("2d", { alpha, willReadFrequently: !!cfg.video.exactRaster });
      this.transparent = alpha;
      this.cfg = cfg;
      this.palettes = palettes;
      this.W = VW;
      this.H = VH;
      this.L = LAYOUT;
      this.fonts = { mono: cfg.fonts.mono.family, serif: cfg.fonts.serif.family, sans: cfg.fonts.sans.family };
      this.cjk = {};
      for (const c of cfg.fonts.cjk || []) {
        this.fonts[c.role] = c.family;
        this.cjk[c.role] = c.text ?? "";
      }
      this._font = "";
      this._canon = "";
      this.pal = palettes.off ?? Object.values(palettes)[0];
    }
    /**
     * Called by the engine at the start of every frame for every layer, before anything is drawn on it.
     * g.reset() puts every piece of canvas state back to its default, including what no assignment can undo:
     * a clip or an unbalanced save() left behind by the previous frame. It CLEARS THE BITMAP as well, so begin()
     * must never run on a layer that already holds part of the current frame (the overlay layer is shared by
     * all overlay scenes: once per frame, not once per scene).
     */
    begin(t, f, videoTime, fx) {
      const g = this.g, s = this.canvas.width / VW;
      this.t = t;
      this.f = f;
      this.videoTime = videoTime;
      this.scale = s;
      this.fx = fx;
      g.reset();
      g.setTransform(s, 0, 0, s, 0, 0);
      g.lineCap = "round";
      g.lineJoin = "round";
      g.imageSmoothingQuality = "high";
      this._font = "";
    }
    // ---- palette ---------------------------------------------------------------------
    /** spec: 'name' | palette object | ['a', 'b', k] (blend). An unknown name is reported once and gives 'on'. */
    resolvePal(spec) {
      if (typeof spec === "string") {
        const p = this.palettes[spec];
        if (!p) reportOnce(`pal|${spec}`, `[palette] unknown palette "${spec}" - using 'on' (there are: ${Object.keys(this.palettes).join(", ")})`);
        return p ?? this.palettes.on ?? this.pal;
      }
      if (Array.isArray(spec)) return mixPal(this.resolvePal(spec[0]), this.resolvePal(spec[1]), spec[2] >= 0 ? Math.min(1, spec[2]) : 0);
      return spec ?? this.pal;
    }
    setPal(spec) {
      this.pal = this.resolvePal(spec);
      return this.pal;
    }
    /** Draw something in another palette, then restore. */
    withPal(spec, fn) {
      const keep = this.pal;
      this.setPal(spec);
      fn();
      this.pal = keep;
    }
    /**
     * rgba() string for a palette role ('text', 'me', 'err', ...) or a '#rgb' / '#rrggbb' literal.
     * null / undefined = no colour (transparent). Anything else is reported once and drawn in cream.
     */
    col(name, a = 1) {
      a = a >= 0 ? +a : 0;
      let c = this.pal[name];
      if (!Array.isArray(c)) {
        if (name == null) return "rgba(0,0,0,0)";
        c = literal.get(name);
        if (!c) {
          c = name[0] === "#" ? parseHex(name) : null;
          if (c) literal.set(name, c);
        }
        if (!c) {
          unknownColour(name);
          c = this.pal.text;
        }
      }
      return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
    }
    /** Fill the layer with the palette background (content) or clear it (overlay). */
    clear() {
      const g = this.g, s = this.scale;
      g.setTransform(s, 0, 0, s, 0, 0);
      if (this.transparent) g.clearRect(0, 0, VW, VH);
      else {
        g.fillStyle = this.col("bg");
        g.fillRect(0, 0, VW, VH);
      }
    }
    // ---- virtual camera (acts on everything drawn afterwards on this layer) ------------
    /** x/y = pan in virtual px (camera moves right/down), zoom about screen centre, rot in radians. */
    camera({ x = 0, y = 0, zoom = 1, rot: rot2 = 0 } = {}) {
      const g = this.g, s = this.scale;
      g.setTransform(s, 0, 0, s, 0, 0);
      g.translate(VW / 2, VH / 2);
      if (rot2) g.rotate(rot2);
      g.scale(zoom, zoom);
      g.translate(-VW / 2 - x, -VH / 2 - y);
    }
    /** Frame a rectangle of the scene: returns camera params that make `r` fill the screen (plus margin). */
    frame(r, margin = 0) {
      const zoom = Math.min(VW / (r.w + 2 * margin), VH / (r.h + 2 * margin));
      return { x: r.x + r.w / 2 - VW / 2, y: r.y + r.h / 2 - VH / 2, zoom };
    }
    /** Raise the flash for this frame (optionally coloured by a palette role / literal; otherwise the palette's bloom colour). */
    flash(v, color = null) {
      if (v > this.fx.flash) {
        this.fx.flash = v;
        this.fx.flashColor = color ? Array.isArray(this.pal[color]) ? this.pal[color] : parseHex(color) : null;
        if (color && !this.fx.flashColor) unknownColour(color);
      }
    }
    // ---- text ------------------------------------------------------------------------
    /** family: 'mono' | 'serif' | 'sans' | 'krSerif' | 'krSans' | 'tcSerif' | 'tcSans' */
    font(size, weight = 400, family = "sans", italic = false) {
      const s = `${italic ? "italic " : ""}${weight} ${size}px "${this.fonts[family] ?? this.fonts.sans}"`;
      if (s !== this._font || this.g.font !== this._canon) {
        this.g.font = s;
        this._font = s;
        this._canon = this.g.font;
      }
    }
    /** Monospace advance width for a font size (JetBrains Mono = 0.6 em). */
    cw(size) {
      return size * 0.6;
    }
    /** Rendered width of a string. */
    measure(str, { size = 24, weight = 400, font = "sans", spacing = 0, italic = false } = {}) {
      if (font === "mono") return str.length * (size * 0.6 + spacing);
      const key = `${font}|${weight}|${italic ? 1 : 0}|${str}`;
      let w100 = measured.get(key);
      if (w100 === void 0) {
        this.font(100, weight, font, italic);
        this.g.letterSpacing = "0px";
        w100 = this.g.measureText(str).width;
        measured.set(key, w100);
      }
      return w100 * size / 100 + str.length * spacing;
    }
    /**
     * Largest size at which `str` fits into maxW (capped at maxSize).
     * NOTE the defaults: serif 700 (a headline), NOT the sans 400 of text() and measure(). Pass the same
     * font / weight / italic you will draw with, and spacingEm = letter spacing as a share of the size.
     */
    fit(str, maxW, { font = "serif", weight = 700, spacingEm = 0, maxSize = 2e3, italic = false } = {}) {
      const w100 = this.measure(str, { size: 100, weight, font, spacing: spacingEm * 100, italic });
      return Math.min(maxSize, maxW / w100 * 100);
    }
    /** Greedy word wrap. Returns the lines for `str` at the given style and width. */
    wrap(str, maxW, opts = {}) {
      const out = [];
      for (const para of String(str).split("\n")) {
        let line = "";
        for (const word2 of para.split(" ")) {
          const next = line ? `${line} ${word2}` : word2;
          if (line && this.measure(next, opts) > maxW) {
            out.push(line);
            line = word2;
          } else line = next;
        }
        out.push(line);
      }
      return out;
    }
    text(str, x, y, { size = 24, weight = 400, color = "text", alpha = 1, align = "left", spacing = 0, font = "sans", stroke = 0, italic = false } = {}) {
      if (!(alpha > 3e-3) || !str) return;
      const own = this.cjk[font];
      if (own !== void 0) {
        const bad = [...String(str)].filter((ch) => !own.includes(ch));
        if (bad.length) reportOnce(`${font}|${str}`, `[text] glyph outside the preloaded text of '${font}' in "${str}" - only "${own}" is loaded for it (config.json fonts.cjk); use a Latin role for the rest (${codePoints(bad)})`);
      } else {
        const out = OUTSIDE[font] ?? OUTSIDE.sans;
        if (out.test(str)) reportOnce(`${font}|${str}`, `[text] glyph outside the bundled fonts in "${str}" - draw it as a shape or use plain characters (${codePoints([...String(str)].filter((ch) => out.test(ch)))} in ${font})`);
      }
      const g = this.g;
      this.font(size, weight, font, italic);
      g.letterSpacing = `${spacing}px`;
      g.textAlign = align;
      if (stroke > 0) {
        g.strokeStyle = this.col(color, Math.min(1, alpha));
        g.lineWidth = stroke;
        g.strokeText(str, x, y);
      } else {
        g.fillStyle = this.col(color, Math.min(1, alpha));
        g.fillText(str, x, y);
      }
      g.letterSpacing = "0px";
    }
    // ---- primitives ------------------------------------------------------------------
    line(x1, y1, x2, y2, { color = "text", alpha = 1, width = 2 } = {}) {
      if (!(alpha > 3e-3)) return;
      const g = this.g;
      g.strokeStyle = this.col(color, Math.min(1, alpha));
      g.lineWidth = width;
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke();
    }
    poly(pts, { color = "text", alpha = 1, width = 2, close = false, fill = false } = {}) {
      if (!(alpha > 3e-3) || pts.length < 2) return;
      const g = this.g;
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      if (close) g.closePath();
      if (fill) {
        g.fillStyle = this.col(color, Math.min(1, alpha));
        g.fill();
      } else {
        g.strokeStyle = this.col(color, Math.min(1, alpha));
        g.lineWidth = width;
        g.stroke();
      }
    }
    rect(x, y, w, h, { color = "text", alpha = 1, width = 2, fill = false } = {}) {
      if (!(alpha > 3e-3)) return;
      const g = this.g;
      if (fill) {
        g.fillStyle = this.col(color, Math.min(1, alpha));
        g.fillRect(x, y, w, h);
      } else {
        g.strokeStyle = this.col(color, Math.min(1, alpha));
        g.lineWidth = width;
        g.strokeRect(x, y, w, h);
      }
    }
    /**
     * Rounded rectangle: the basic surface of the interface.
     * fill / stroke are palette roles (or null); shadow = soft drop shadow strength 0..1 (elevation).
     * Inside ctx.glow() one rrect casts one halo: the fill casts it (or its own drop shadow, if `shadow` is set)
     * and the outline is then drawn without; an outline with no fill casts it itself. The halo is put back
     * afterwards, so whatever is drawn next inside the same glow still gets it.
     */
    rrect(x, y, w, h, r, { fill = "raised", stroke = null, alpha = 1, width = 1.5, fillAlpha = 1, strokeAlpha = 1, shadow = 0 } = {}) {
      if (!(alpha > 3e-3) || w <= 0 || h <= 0) return;
      const g = this.g, rr = Math.max(0, Math.min(r, w / 2, h / 2));
      g.beginPath();
      g.roundRect(x, y, w, h, rr);
      if (!fill) {
        if (stroke) {
          g.strokeStyle = this.col(stroke, Math.min(1, alpha * strokeAlpha));
          g.lineWidth = width;
          g.stroke();
        }
        return;
      }
      const sc = g.shadowColor, sb = g.shadowBlur, sy = g.shadowOffsetY;
      if (shadow > 0) {
        g.shadowColor = `rgba(0,0,0,${0.5 * shadow * alpha})`;
        g.shadowBlur = 44 * shadow * this.scale;
        g.shadowOffsetY = 14 * shadow * this.scale;
      }
      g.fillStyle = this.col(fill, Math.min(1, alpha * fillAlpha));
      g.fill();
      if (stroke) {
        g.shadowColor = "rgba(0,0,0,0)";
        g.strokeStyle = this.col(stroke, Math.min(1, alpha * strokeAlpha));
        g.lineWidth = width;
        g.stroke();
      }
      g.shadowColor = sc;
      g.shadowBlur = sb;
      g.shadowOffsetY = sy;
    }
    circle(x, y, r, { color = "text", alpha = 1, width = 2, fill = false, a0 = 0, a1 = Math.PI * 2 } = {}) {
      if (!(alpha > 3e-3) || r <= 0) return;
      const g = this.g;
      g.beginPath();
      g.arc(x, y, r, a0, a1);
      if (fill) {
        g.fillStyle = this.col(color, Math.min(1, alpha));
        g.fill();
      } else {
        g.strokeStyle = this.col(color, Math.min(1, alpha));
        g.lineWidth = width;
        g.stroke();
      }
    }
    /** Linear gradient fill of a rect. stops: [[position 0..1, role, alpha], ...]; dir 'v' or 'h'. */
    gradRect(x, y, w, h, stops, dir = "v") {
      const g = this.g, gr = dir === "v" ? g.createLinearGradient(0, y, 0, y + h) : g.createLinearGradient(x, 0, x + w, 0);
      for (const [p, role, a] of stops) gr.addColorStop(p, this.col(role, a));
      g.fillStyle = gr;
      g.fillRect(x, y, w, h);
    }
    /** Soft radial light (or shade) centred on (x, y): a cheap way to give a flat surface depth. */
    radial(x, y, r, role, alpha) {
      const g = this.g, gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, this.col(role, alpha));
      gr.addColorStop(1, this.col(role, 0));
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    /**
     * LOCAL glow: whatever fn draws gets a soft halo in `color`: every shape, every text, every helper it calls
     * (an rrect casts it once, see there). This is the only glow matte UI elements get (the global bloom only
     * reacts to saturated colour). radius in virtual px of the 1920 frame: it does not grow with ctx.camera()
     * zoom or ctx.at() scale. Calls nest: when an inner glow ends the outer one is back.
     */
    glow(color, radius, fn, alpha = 1) {
      const g = this.g, sc = g.shadowColor, sb = g.shadowBlur;
      g.shadowColor = this.col(color, alpha);
      g.shadowBlur = radius * this.scale;
      fn();
      g.shadowColor = sc;
      g.shadowBlur = sb;
    }
    /** Corner brackets around a rect. k = 0..1 draw-in progress. */
    brackets(r, { len = 22, color = "mute", alpha = 1, width = 2, k = 1 } = {}) {
      const l = len * k, { x, y, w, h } = r, o = { color, alpha, width };
      this.poly([[x, y + l], [x, y], [x + l, y]], o);
      this.poly([[x + w - l, y], [x + w, y], [x + w, y + l]], o);
      this.poly([[x + w, y + h - l], [x + w, y + h], [x + w - l, y + h]], o);
      this.poly([[x + l, y + h], [x, y + h], [x, y + h - l]], o);
    }
    /** Run fn with drawing clipped to a rect (optionally rounded). */
    clip(r, fn, radius = 0) {
      const g = this.g;
      g.save();
      g.beginPath();
      if (radius > 0) g.roundRect(r.x, r.y, r.w, r.h, radius);
      else g.rect(r.x, r.y, r.w, r.h);
      g.clip();
      fn();
      g.restore();
      this._font = "";
    }
    /**
     * Run fn clipped to an arbitrary closed outline (list of [x, y]). rule = canvas fill rule, 'nonzero' or
     * 'evenodd': it only matters where the outline crosses itself (pass 'evenodd' to agree with shapes.js inPoly).
     */
    clipPath(pts, fn, rule = "nonzero") {
      const g = this.g;
      g.save();
      g.beginPath();
      if (pts.length) g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.closePath();
      g.clip(rule);
      fn();
      g.restore();
      this._font = "";
    }
    /**
     * v4: draw `content` only where `mask` paints: type, or any shapes, as WINDOWS onto a picture.
     * Both callbacks draw with the ordinary ctx calls, in the transform that is current here; of what the mask draws
     * only the coverage matters (several shapes = their union). Two scratch canvases of the layer's size are kept for
     * this; nothing is read back.
     */
    masked(content, mask) {
      const main = this.g, W = this.canvas.width, H = this.canvas.height, m = main.getTransform();
      this._scr ??= [0, 1].map(() => {
        const c = new OffscreenCanvas(8, 8);
        return { c, g: c.getContext("2d") };
      });
      const [A, B] = this._scr;
      for (const s of [A, B]) {
        if (s.c.width !== W || s.c.height !== H) {
          s.c.width = W;
          s.c.height = H;
        }
        s.g.setTransform(1, 0, 0, 1, 0, 0);
        s.g.globalCompositeOperation = "source-over";
        s.g.globalAlpha = 1;
        s.g.clearRect(0, 0, W, H);
        s.g.setTransform(m);
        s.g.lineCap = "round";
        s.g.lineJoin = "round";
        s.g.imageSmoothingQuality = "high";
      }
      try {
        this.g = A.g;
        this._font = "";
        content();
        this.g = B.g;
        this._font = "";
        mask();
      } finally {
        this.g = main;
        this._font = "";
      }
      A.g.setTransform(1, 0, 0, 1, 0, 0);
      A.g.globalCompositeOperation = "destination-in";
      A.g.globalAlpha = 1;
      A.g.drawImage(B.c, 0, 0);
      main.save();
      main.setTransform(1, 0, 0, 1, 0, 0);
      main.drawImage(A.c, 0, 0);
      main.restore();
    }
    /** Run fn inside a local transform: move origin to (x, y), rotate, scale. */
    at(x, y, fn, { rot: rot2 = 0, scale = 1, sx = scale, sy = scale, alpha = 1 } = {}) {
      const g = this.g;
      g.save();
      g.translate(x, y);
      if (rot2) g.rotate(rot2);
      if (sx !== 1 || sy !== 1) g.scale(sx, sy);
      if (alpha !== 1) g.globalAlpha *= alpha >= 0 ? alpha : 0;
      fn();
      g.restore();
      this._font = "";
    }
    /**
     * Motion blur by ghost samples: calls fn(tau, weight) for n past instants (tau seconds ago),
     * oldest first, with globalAlpha set so the newest is strongest. Use for anything that moves fast:
     *   ctx.trail(5, 0.012, (tau) => drawThing(posAt(t - tau)))
     */
    trail(n, dt, fn, strength = 0.5) {
      const g = this.g;
      for (let i = n; i >= 0; i--) {
        const w = i === 0 ? 1 : strength * (1 - i / (n + 1));
        g.save();
        g.globalAlpha *= w;
        fn(i * dt, w);
        g.restore();
        this._font = "";
      }
    }
  };

  // nyan-source:src/engine/transitions.js
  var TYPES = {
    cut: 0,
    fade: 1,
    glitch: 2,
    scan: 3,
    circle: 4,
    diag: 5,
    grid: 6,
    zoom: 7,
    shatter: 8,
    dissolve: 9,
    winclose: 10,
    winpop: 11,
    push: 12,
    slices: 13,
    flashcut: 14
  };
  var EASED = /* @__PURE__ */ new Set(["fade", "scan", "circle", "diag", "push"]);
  function resolveTransition(enter2, k, pal) {
    const e = enter2 || { type: "cut" };
    const type = TYPES[e.type] ?? 0;
    const p = [0, 0, 0, 0];
    const cx = e.x ?? 0.5, cy = e.y ?? 0.5;
    switch (e.type) {
      case "scan":
      case "push":
        p[0] = e.dir ?? 0;
        break;
      case "circle": {
        const asp = 16 / 9;
        p[0] = cx;
        p[1] = cy;
        p[2] = e.inverse ? 1 : 0;
        p[3] = Math.max(...[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => Math.hypot((x - cx) * asp, y - cy))) * 1.02;
        break;
      }
      case "zoom":
        p[0] = cx;
        p[1] = cy;
        p[2] = e.out ? 1 : 0;
        break;
      case "winclose":
      case "winpop":
        p[0] = cx;
        p[1] = cy;
        break;
      case "dissolve":
        p[0] = e.size ?? 1;
        break;
      case "slices":
        p[0] = e.bands ?? 10;
        break;
      case "flashcut":
        p[0] = e.strength ?? 0.85;
        break;
      default:
        break;
    }
    const edge = e.color ? pal[e.color] ?? pal.accent : pal.accent;
    return { type, k: EASED.has(e.type) ? easeInOut(clamp(k)) : clamp(k), p, edge: edge.map((v) => v / 255) };
  }
  __name(resolveTransition, "resolveTransition");
  var TRANSITION_GLSL = `
float eback(float k) { float c = 1.70158; float x = k - 1.0; return 1.0 + (c + 1.0) * x * x * x + c * x * x; }

vec3 transition(vec2 uv, vec2 s, float k) {
  if (uType == 0) return A(uv);
  if (uType == 1) return mix(A(uv), B(uv), k);

  if (uType == 2) {                                   // glitch: blocks + torn rows
    // rows tear at ~8 Hz, but every block switches from A to B exactly once (no strobing between the shots)
    float tq = floor(uFrame / 8.0), amt = sin(k * 3.14159);
    float band = floor(s.y * 22.0 + h21(vec2(tq, 1.0)) * 22.0);
    float hb = h21(vec2(band, tq));
    float sh = (h21(vec2(band, tq + 5.0)) - 0.5) * 0.3 * amt * step(0.45, hb);
    vec2 u2 = vec2(fract(uv.x + sh), uv.y);
    vec2 cell = floor(s * vec2(12.0, 7.0));
    float pick = step(mix(h21(vec2(floor(s.y * 22.0), 7.0)), h21(cell), 0.5), k * 1.15 - 0.05);
    vec2 ca = vec2(0.012 * amt, 0.0);
    vec3 a = vec3(A(u2 + ca).r, A(u2).g, A(u2 - ca).b);
    vec3 b = vec3(B(u2 + ca).r, B(u2).g, B(u2 - ca).b);
    return mix(a, b, pick);
  }

  if (uType == 3) {                                   // scanline wipe
    float p = uP.x < 0.5 ? s.y : uP.x < 1.5 ? 1.0 - s.y : uP.x < 2.5 ? s.x : 1.0 - s.x;
    float e = k * 1.1 - 0.05, m = step(p, e);
    vec3 c = mix(A(uv), B(uv), m);
    c += uEdge * m * smoothstep(e - 0.12, e, p) * (0.2 + 0.25 * step(0.5, fract(p * 90.0)));
    return c + uEdge * smoothstep(0.006, 0.0, abs(p - e)) * 0.9;
  }

  if (uType == 4) {                                   // iris
    float d = length((s - uP.xy) * vec2(uAspect, 1.0));
    float R = (uP.z > 0.5 ? 1.0 - k : k) * uP.w;
    float m = uP.z > 0.5 ? 1.0 - step(d, R) : step(d, R);
    return mix(A(uv), B(uv), m) + uEdge * smoothstep(0.012, 0.0, abs(d - R)) * 0.9 * step(0.001, k) * step(k, 0.999);
  }

  if (uType == 5) {                                   // slatted diagonal wipe
    float p = (s.x * uAspect + s.y * 0.8) / (uAspect + 0.8);
    float th = p * 0.72 + fract(p * 16.0) * 0.28, e = k * 1.04 - 0.02;
    return mix(A(uv), B(uv), step(th, e)) + uEdge * smoothstep(0.012, 0.0, abs(th - e)) * 0.7;
  }

  if (uType == 6) {                                   // grid cascade
    vec2 n = vec2(16.0, 9.0), cell = floor(s * n), f = fract(s * n) - 0.5;
    float order = (cell.x / n.x + cell.y / n.y) * 0.325 + h21(cell) * 0.35;
    float lk = clamp((k - order * 0.8) / 0.2, 0.0, 1.0);
    float m = step(max(abs(f.x), abs(f.y)), lk * 0.5);
    return mix(A(uv), B(uv), m) + uEdge * m * (1.0 - lk) * 0.5;
  }

  if (uType == 7) {                                   // zoom through
    vec2 ctr = vec2(uP.x, 1.0 - uP.y);
    bool outw = uP.z > 0.5;
    float kk = outw ? 1.0 - k : k;
    float sBig = 1.0 + kk * kk * 9.0;
    vec3 big = vec3(0.0);
    for (int i = 0; i < 8; i++) {                      // radial blur: streaks instead of hard lines sweeping past
      vec2 u = (uv - ctr) / (sBig * (1.0 + float(i) * 0.09 * kk)) + ctr;
      big += outw ? B(u) : A(u);
    }
    big /= 8.0;
    float sSmall = mix(0.12, 1.0, kk * kk * (3.0 - 2.0 * kk));
    vec2 us = (uv - ctr) / sSmall + ctr;
    vec3 small = outw ? A(us) : B(us);
    float m = inside(us) * smoothstep(0.2, 0.7, kk);
    return mix(big * (1.0 - smoothstep(0.25, 0.8, kk)), small, m) + uEdge * sin(k * 3.14159) * 0.12;
  }

  if (uType == 8) {                                   // shatter: triangular shards fall away
    vec3 c = B(uv);
    vec2 n = vec2(9.0, 5.0), c0 = floor(s * n);
    for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) for (int tr = 0; tr < 2; tr++) {
      vec2 cell = c0 + vec2(float(i), float(j)), id = cell * 2.0 + float(tr);
      float lk = clamp(k * 1.5 - h21(id + 5.0) * 0.5, 0.0, 1.0);
      vec2 off = vec2(h21(id) - 0.5, h21(id + 3.0) * 0.9 + 0.1) * (0.25 + 0.5 * h21(id + 9.0)) * lk * lk * vec2(0.4, 0.75);
      vec2 src = s - off, gs = src * n;
      if (floor(gs) == cell && step(1.0, fract(gs.x) + fract(gs.y)) == float(tr) && lk < 1.0)
        c = mix(A(vec2(src.x, 1.0 - src.y)) * (1.0 + lk * 0.8), c, lk * lk);
    }
    return c;
  }

  if (uType == 9) {                                   // pixel dissolve
    vec2 n = vec2(96.0, 54.0) / max(uP.x, 0.25);
    float h = h21(floor(s * n)), e = k * 1.1 - 0.05;
    return mix(A(uv), B(uv), step(h, e)) + uEdge * step(h, e) * step(e - 0.05, h) * 0.5;
  }

  if (uType == 10) {                                  // window / CRT close
    vec2 ctr = vec2(uP.x, 1.0 - uP.y);
    float k1 = smoothstep(0.0, 0.55, k), k2 = smoothstep(0.55, 1.0, k);
    vec2 sc = vec2(mix(1.0, 0.0, k2 * k2), mix(1.0, 0.006, k1));
    vec2 ua = (uv - ctr) / max(sc, vec2(1e-4)) + ctr;
    return mix(B(uv) * smoothstep(0.15, 0.8, k), A(ua) + uEdge * k1 * 0.8, inside(ua) * step(k, 0.999));
  }

  if (uType == 11) {                                  // window pop-up
    vec2 ctr = vec2(uP.x, 1.0 - uP.y);
    float e = max(eback(k), 0.001);
    vec2 ub = (uv - ctr) / e + ctr, q = abs(ub - 0.5);
    float inB = inside(ub), border = step(0.5 - 0.004 / e, max(q.x, q.y)) * inB * step(k, 0.98);
    return mix(mix(A(uv) * (1.0 - 0.6 * k), B(ub), inB), uEdge, border);
  }

  if (uType == 12) {                                  // push / slide
    vec2 d = uP.x < 0.5 ? vec2(1.0, 0.0) : uP.x < 1.5 ? vec2(-1.0, 0.0) : uP.x < 2.5 ? vec2(0.0, -1.0) : vec2(0.0, 1.0);
    return A(uv + d * k) + B(uv - d * (1.0 - k));
  }

  if (uType == 13) {                                  // slices tear apart
    float band = floor(s.y * uP.x), dirn = mod(band, 2.0) * 2.0 - 1.0;
    float lk = clamp(k * 1.5 - h21(vec2(band, 1.0)) * 0.5, 0.0, 1.0);
    vec2 ua = vec2(uv.x + dirn * lk * lk * 1.15, uv.y);
    return inside(ua) > 0.5 ? A(ua) : B(uv);
  }

  // 14 flashcut: the cut happens under a colour bloom
  return mix(k < 0.5 ? A(uv) : B(uv), uEdge, pow(1.0 - abs(2.0 * k - 1.0), 1.5) * uP.x);
}
`;

  // nyan-source:src/engine/post.js
  var VS = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;
  var HASH = `float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float inside(vec2 u) { return step(0.0, u.x) * step(u.x, 1.0) * step(0.0, u.y) * step(u.y, 1.0); }
`;
  var FS_MIX = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uA, uB, uHud;
uniform int uType;
uniform float uK, uFrame, uAspect, uHudA;
uniform vec4 uP;
uniform vec3 uEdge;
${HASH}
vec3 A(vec2 u) { return texture(uA, u).rgb * inside(u); }
vec3 B(vec2 u) { return texture(uB, u).rgb * inside(u); }
${TRANSITION_GLSL}
void main() {
  vec3 c = transition(vUv, vec2(vUv.x, 1.0 - vUv.y), uK);
  vec4 h = texture(uHud, vUv) * uHudA;              // premultiplied HUD on top, untouched by the transition
  o = vec4(h.rgb + c * (1.0 - h.a), 1.0);
}`;
  var FS_DOWN = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uThreshold, uAll, uLumT; uniform vec3 uBg; uniform vec2 uSat;
void main() {
  vec3 c = (texture(uSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture(uSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb
          + texture(uSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture(uSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb) * 0.25;
  // LOCAL glow: only saturated colour feeds the bloom (uSat = knee lo / hi; hi <= lo switches this off for
  // the deeper levels). Cream text and grey surfaces stay matte; the orange spark and red errors glow.
  if (uSat.y > uSat.x) {
    float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
    float gate = smoothstep(uSat.x, uSat.y, (mx - mn) / max(mx, 1e-4));
    // v4, fx.bloomAll: strong light. What is bright enough blooms whatever its colour (cream, hot orange)
    if (uAll > 0.0) gate = max(gate, uAll * smoothstep(uLumT, uLumT + 0.2, dot(c, vec3(0.2126, 0.7152, 0.0722))));
    c *= gate;
  }
  // and only what is brighter than the palette background (a coloured backdrop must not fog the frame)
  o = vec4(max(c - uBg - uThreshold, 0.0), 1.0);
}`;
  var FS_BLUR = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uSrc; uniform vec2 uDir;
void main() {
  vec3 c = texture(uSrc, vUv).rgb * 0.2270270270;
  c += (texture(uSrc, vUv + uDir * 1.3846153846).rgb + texture(uSrc, vUv - uDir * 1.3846153846).rgb) * 0.3162162162;
  c += (texture(uSrc, vUv + uDir * 3.2307692308).rgb + texture(uSrc, vUv - uDir * 3.2307692308).rgb) * 0.0702702703;
  o = vec4(c, 1.0);
}`;
  var FS_COMP = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uBase, uB1, uB2, uB3, uB4, uB5;
uniform vec3 uTint, uFlashCol, uMoshCol;
uniform float uGlow, uFlash, uZoom, uAberr, uScan, uScanCount, uVig, uGrain, uBright, uGlitch, uFlipY, uFrame;
uniform float uRot, uSplit, uMosh, uInvert, uDesat, uAspect, uRays, uStreak, uZoomBlur;
uniform vec2 uShake, uMosaic, uRaysAt, uZoomAt;
uniform vec4 uMosaicRect;
${HASH}
void main() {
  vec2 uv = vUv;
  if (uFlipY > 0.5) uv.y = 1.0 - uv.y;            // export: first row of readPixels = top of image
  vec2 screen = uv;                                // un-transformed coords for scanlines / vignette

  // whole-frame camera: rotate + zoom about the centre, then shake
  vec2 p = (uv - 0.5) * vec2(uAspect, 1.0);
  float cr = cos(uRot), sr = sin(uRot);
  p = vec2(p.x * cr - p.y * sr, p.x * sr + p.y * cr) / uZoom;
  uv = p / vec2(uAspect, 1.0) + 0.5 + uShake;

  // glitch: a few horizontal bands slide sideways
  if (uGlitch > 0.0) {
    float gq = floor(uFrame / 6.0);                 // the tear pattern holds for 0.1 s (per-frame noise would strobe)
    float band = floor(uv.y * 28.0 + h21(vec2(gq, 3.0)) * 7.0);
    float on = step(0.72, h21(vec2(band, gq)));
    uv.x += on * (h21(vec2(band + 9.0, gq)) - 0.5) * 0.12 * uGlitch;
  }

  // mosaic: coarse cells, optionally only inside a rectangle (screen coords, y down)
  vec2 sd = vec2(uv.x, 1.0 - uv.y);
  if (uMosaic.x > 0.0 && sd.x > uMosaicRect.x && sd.x < uMosaicRect.z && sd.y > uMosaicRect.y && sd.y < uMosaicRect.w)
    uv = (floor(uv * uMosaic) + 0.5) / uMosaic;

  // datamosh: clumps of blocks smear a displaced column of the picture and lose colour depth
  float moshed = 0.0; vec2 mcell = vec2(0.0);
  if (uMosh > 0.0) {
    vec2 n = vec2(24.0, 13.5);
    mcell = floor(uv * n);
    float tq = floor(uFrame / 16.0);              // blocks re-shuffle ~4x per second, not every frame (no flicker)
    float hh = h21(mcell + tq * 0.37) * 0.55 + h21(floor(mcell / 3.0) + tq * 0.11) * 0.45;
    if (hh < uMosh * 0.7) {
      moshed = 1.0;
      vec2 dm = vec2(h21(mcell + 1.7 + tq) - 0.5, h21(mcell + 4.1 + tq) - 0.5);
      uv = vec2((mcell.x + 0.5) / n.x + dm.x * 0.2, uv.y + dm.y * 0.06);
    }
  }

  vec2 d = uv - 0.5, sp = vec2(uSplit, 0.0);       // radial aberration + horizontal RGB split
  float m = inside(uv);
  vec3 base = vec3(texture(uBase, uv + d * uAberr + sp).r, texture(uBase, uv).g, texture(uBase, uv - d * uAberr - sp).b) * m;
  if (uZoomBlur > 0.0) {                           // v4: a push. Twelve samples along the line towards uZoomAt
    base = vec3(0.0);
    for (int i = 0; i < 12; i++) {
      vec2 u = uZoomAt + (uv - uZoomAt) * (1.0 - uZoomBlur * float(i) / 11.0);
      base += texture(uBase, u).rgb * inside(u);
    }
    base /= 12.0;
  }
  vec3 bloom = texture(uB1, uv).rgb * 0.9 + texture(uB2, uv).rgb * 0.8 + texture(uB3, uv).rgb * 0.7
             + texture(uB4, uv).rgb * 0.6 + texture(uB5, uv).rgb * 0.5;
  vec3 c = base + bloom * uTint * (uGlow * 0.42) * m;
  // v4 rays and streak light what is DARK: a pixel takes them only as far as its brightest channel has room left, so a
  // flat area of orange keeps its hue instead of drifting to yellow (light added to all three channels would do that)
  if (uRays > 0.0) {                               // rays: whatever blooms between this pixel and uRaysAt lights it
    vec2 dir = uRaysAt - uv; vec3 r = vec3(0.0); float w = 1.0, ws = 0.0;
    for (int i = 1; i <= 16; i++) {
      vec2 u = uv + dir * (float(i) / 16.0) * 0.9;
      r += (texture(uB2, u).rgb + texture(uB3, u).rgb) * w; ws += w; w *= 0.9;
    }
    c += r / ws * uTint * uRays * m * clamp(1.0 - max(c.r, max(c.g, c.b)), 0.0, 1.0);
  }
  if (uStreak > 0.0) {                             // a horizontal streak through whatever blooms
    vec3 s = vec3(0.0); float ws = 0.0;
    for (int i = -8; i <= 8; i++) {
      float w = 1.0 - abs(float(i)) / 9.0;
      s += texture(uB3, uv + vec2(float(i) * 0.03, 0.0)).rgb * w; ws += w;
    }
    c += s / ws * uTint * uStreak * m * clamp(1.0 - max(c.r, max(c.g, c.b)), 0.0, 1.0);
  }

  if (moshed > 0.5) {                              // damaged blocks: fewer colour levels, and now and then a block stuck
    c = floor(c * 3.0 + 0.5) / 3.0;                //   on one palette colour. (v3 also swapped channels in some blocks:
    float pick = h21(mcell + 9.3);                 //   that turned orange into blue / violet, colours with no meaning here)
    c = pick >= 0.14 && pick < 0.4 ? uMoshCol * (0.2 + 0.6 * h21(mcell + 2.2)) : c;
  }
  c = mix(c, vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), uDesat);
  c = mix(c, 1.0 - c, uInvert);

  c *= 1.0 - uScan * (0.5 + 0.5 * cos(screen.y * uScanCount * 6.2831853));
  float v = length((screen - 0.5) * vec2(1.0, 0.82));
  c *= 1.0 - uVig * smoothstep(0.35, 0.95, v);
  c *= uBright;
  c += uFlashCol * uFlash * (0.55 + 0.45 * (1.0 - v));
  c += (h21(gl_FragCoord.xy + vec2(uFrame * 1.37, uFrame * 0.61)) - 0.5) * uGrain;
  o = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;
  var LEVELS = 5;
  var Post = class {
    static {
      __name(this, "Post");
    }
    constructor(canvas, cfg) {
      this.canvas = canvas;
      this.cfg = cfg;
      const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
      if (!gl) throw new Error("WebGL2 is not available");
      this.gl = gl;
      this.hdr = !!gl.getExtension("EXT_color_buffer_float") || !!gl.getExtension("EXT_color_buffer_half_float");
      gl.getExtension("OES_texture_float_linear");
      this.pMix = this._program(FS_MIX);
      this.pDown = this._program(FS_DOWN);
      this.pBlur = this._program(FS_BLUR);
      this.pComp = this._program(FS_COMP);
      this.texA = this._texture();
      this.texB = this._texture();
      this.texHud = this._texture();
      this.levels = [];
      this.vao = gl.createVertexArray();
    }
    /** GPU description (so the exporter can verify we are not on a software rasteriser). */
    rendererInfo() {
      const gl = this.gl, ext = gl.getExtension("WEBGL_debug_renderer_info");
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    }
    _program(fsSrc) {
      const gl = this.gl, p = gl.createProgram();
      for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, fsSrc]]) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        gl.attachShader(p, s);
      }
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const name = gl.getActiveUniform(p, i).name;
        u[name] = gl.getUniformLocation(p, name);
      }
      return { p, u };
    }
    _texture() {
      const gl = this.gl, t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    }
    _target(w, h, hdr = this.hdr) {
      const gl = this.gl, tex = this._texture();
      if (hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return { tex, fb, w, h };
    }
    resize(w, h) {
      const gl = this.gl;
      this.canvas.width = w;
      this.canvas.height = h;
      this.w = w;
      this.h = h;
      for (const t of [this.mixed, ...this.levels.flatMap((l) => [l.a, l.b])]) if (t) {
        gl.deleteTexture(t.tex);
        gl.deleteFramebuffer(t.fb);
      }
      this.mixed = this._target(w, h, false);
      this.levels = [];
      for (let i = 1; i <= LEVELS; i++) {
        const lw = Math.max(1, w >> i), lh = Math.max(1, h >> i);
        this.levels.push({ a: this._target(lw, lh), b: this._target(lw, lh) });
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    /**
     * Leave no texture bound to any unit, so a bloom target is never still bound for sampling
     * (from the previous frame's composite) while the next frame renders into it.
     *
     * Known limit (measured, not solved): everything up to the layer canvases is bit-identical for
     * a given t, but the GPU passes below can differ by 1/255 on up to ~0.02 % of the output bytes
     * between two renders of the same frame, depending on what the GPU drew before. It appears from
     * bloom level 3 onwards and in the final composite; it is not caused by canvas rasterisation,
     * dithering, the half-float format or stale bindings (each was ruled out by test).
     */
    _unbindAll() {
      const gl = this.gl;
      for (let i = 0; i <= LEVELS; i++) {
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, null);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    _upload(tex, unit, canvas, premultiply = false) {
      const gl = this.gl;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    }
    _pass(prog2, target2, srcTex, uniforms) {
      const gl = this.gl;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target2 ? target2.fb : null);
      gl.viewport(0, 0, target2 ? target2.w : this.w, target2 ? target2.h : this.h);
      gl.useProgram(prog2.p);
      if (srcTex) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, srcTex);
        gl.uniform1i(prog2.u.uSrc ?? prog2.u.uBase, 0);
      }
      uniforms(gl, prog2.u);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    /**
     * @param layers  { a: canvas, b: canvas|null, hud: canvas }
     * @param tr      { type, k, p[4], edge[3] } from resolveTransition()
     * @param fx      shared per-frame effect parameters
     * @param look    { tint[3], flashCol[3], moshCol[3], glow } derived from the active palette(s), 0..1
     */
    render(layers, tr, fx, look, frame, flipY) {
      const gl = this.gl, c = this.cfg, asp = this.w / this.h;
      gl.bindVertexArray(this.vao);
      gl.disable(gl.BLEND);
      gl.disable(gl.DITHER);
      this._unbindAll();
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      this._upload(this.texA, 0, layers.a);
      this._upload(this.texB, 1, layers.b ?? layers.a);
      this._upload(this.texHud, 2, layers.hud, true);
      this._pass(this.pMix, this.mixed, this.texA, (gl2, u) => {
        gl2.uniform1i(u.uA, 0);
        gl2.uniform1i(u.uB, 1);
        gl2.uniform1i(u.uHud, 2);
        gl2.uniform1i(u.uType, layers.b ? tr.type : 0);
        gl2.uniform1f(u.uK, tr.k);
        gl2.uniform4f(u.uP, ...tr.p);
        gl2.uniform3f(u.uEdge, ...tr.edge);
        gl2.uniform1f(u.uFrame, frame % 4096);
        gl2.uniform1f(u.uAspect, asp);
        gl2.uniform1f(u.uHudA, Math.max(0, Math.min(1, fx.hud)));
      });
      let src = this.mixed.tex, sw = this.w, sh = this.h;
      this.levels.forEach((l, i) => {
        this._pass(this.pDown, l.a, src, (gl2, u) => {
          gl2.uniform2f(u.uTexel, 1 / sw, 1 / sh);
          gl2.uniform1f(u.uThreshold, i === 0 ? c.glow.threshold : 0);
          gl2.uniform3f(u.uBg, ...i === 0 ? look.bg : [0, 0, 0]);
          gl2.uniform2f(u.uSat, ...i === 0 ? c.glow.satKnee : [1, 0]);
          gl2.uniform1f(u.uAll, i === 0 ? Math.max(0, Math.min(1, fx.bloomAll ?? 0)) : 0);
          gl2.uniform1f(u.uLumT, fx.bloomThreshold ?? 0.35);
        });
        this._pass(this.pBlur, l.b, l.a.tex, (gl2, u) => gl2.uniform2f(u.uDir, c.glow.radius / l.a.w, 0));
        this._pass(this.pBlur, l.a, l.b.tex, (gl2, u) => gl2.uniform2f(u.uDir, 0, c.glow.radius / l.a.h));
        src = l.a.tex;
        sw = l.a.w;
        sh = l.a.h;
      });
      this._pass(this.pComp, null, this.mixed.tex, (gl2, u) => {
        this.levels.forEach((l, i) => {
          gl2.activeTexture(gl2.TEXTURE1 + i);
          gl2.bindTexture(gl2.TEXTURE_2D, l.a.tex);
          gl2.uniform1i(u[`uB${i + 1}`], i + 1);
        });
        const flash = Math.min(c.safety.maxFlash, Math.max(0, fx.flash));
        const mos = fx.mosaic > 0 ? [1920 / fx.mosaic, 1080 / fx.mosaic] : [0, 0];
        const mr = fx.mosaicRect ?? [0, 0, 1920, 1080];
        gl2.uniform3f(u.uTint, ...look.tint);
        gl2.uniform3f(u.uFlashCol, ...look.flashCol);
        gl2.uniform3f(u.uMoshCol, ...look.moshCol);
        gl2.uniform1f(u.uGlow, (fx.glow + flash * c.glow.flashGain) * look.glow);
        gl2.uniform1f(u.uFlash, flash * c.post.flashStrength);
        gl2.uniform1f(u.uZoom, fx.zoom);
        gl2.uniform1f(u.uRot, fx.rot);
        gl2.uniform2f(u.uShake, fx.shake[0] / 1920, -fx.shake[1] / 1080);
        gl2.uniform1f(u.uAberr, fx.aberration);
        gl2.uniform1f(u.uSplit, fx.rgbSplit / 1920);
        gl2.uniform1f(u.uGlitch, fx.glitch);
        gl2.uniform1f(u.uMosh, fx.mosh);
        gl2.uniform2f(u.uMosaic, ...mos);
        gl2.uniform4f(u.uMosaicRect, mr[0] / 1920, mr[1] / 1080, (mr[0] + mr[2]) / 1920, (mr[1] + mr[3]) / 1080);
        const ra = fx.raysAt ?? [960, 540], za = fx.zoomAt ?? [960, 540];
        gl2.uniform1f(u.uRays, Math.max(0, fx.rays ?? 0));
        gl2.uniform2f(u.uRaysAt, ra[0] / 1920, 1 - ra[1] / 1080);
        gl2.uniform1f(u.uStreak, Math.max(0, fx.streak ?? 0));
        gl2.uniform1f(u.uZoomBlur, Math.max(0, Math.min(1, fx.zoomBlur ?? 0)));
        gl2.uniform2f(u.uZoomAt, za[0] / 1920, 1 - za[1] / 1080);
        gl2.uniform1f(u.uInvert, fx.invert);
        gl2.uniform1f(u.uDesat, fx.desat);
        gl2.uniform1f(u.uScan, c.post.scanlines * fx.scan);
        gl2.uniform1f(u.uScanCount, c.post.scanlineCount);
        gl2.uniform1f(u.uVig, c.post.vignette * fx.vignette);
        gl2.uniform1f(u.uGrain, c.post.grain);
        gl2.uniform1f(u.uBright, fx.bright);
        gl2.uniform1f(u.uAspect, asp);
        gl2.uniform1f(u.uFlipY, flipY ? 1 : 0);
        gl2.uniform1f(u.uFrame, frame % 4096);
      });
      this._unbindAll();
    }
    /** Read back the final frame as tightly packed RGBA (top row first when rendered with flipY). */
    readPixels(buf) {
      const gl = this.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.readPixels(0, 0, this.w, this.h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      return buf;
    }
  };

  // nyan-source:src/components/motif.js
  var TAU = Math.PI * 2;
  var LEN = [1, 0.8, 0.94, 0.74, 0.98, 0.82, 0.9, 0.76, 1, 0.8, 0.95, 0.78];
  var RAYS = 12;
  function spark(ctx, cx, cy, r, { rays: rays2 = RAYS, rot: rot2 = 0, color = "me", off = "mute", alpha = 1, lit = 1, grow = 1, fat = 0.105, inner = 0.17, pulse: pulse2 = null, core = 0.1, offAlpha = 0.35 } = {}) {
    if (alpha <= 3e-3 || r <= 0) return;
    const g = ctx.g, nLit = lit * rays2;
    for (const pass of [0, 1]) {
      g.beginPath();
      let any = false;
      for (let i = 0; i < rays2; i++) {
        const on = clamp(nLit - i);
        const k = pass ? on : 1 - on;
        if (k <= 1e-3) continue;
        const a = rot2 + i / rays2 * TAU - Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
        const len = r * LEN[i % 12] * grow * (pulse2 ? pulse2(i) : 1) * (pass ? on : 1);
        const r0 = r * inner, w = r * fat;
        if (len <= r0) continue;
        const mx = r0 + (len - r0) * 0.56, nx = -s * w, ny = c * w;
        g.moveTo(cx + c * r0, cy + s * r0);
        g.quadraticCurveTo(cx + c * mx + nx, cy + s * mx + ny, cx + c * len, cy + s * len);
        g.quadraticCurveTo(cx + c * mx - nx, cy + s * mx - ny, cx + c * r0, cy + s * r0);
        any = true;
      }
      if (!any) continue;
      g.fillStyle = ctx.col(pass ? color : off, alpha * (pass ? 1 : offAlpha));
      g.fill();
    }
    if (core > 0) ctx.circle(cx, cy, r * core * grow, { fill: true, color: lit > 0 ? color : off, alpha: alpha * (lit > 0 ? 1 : offAlpha) });
  }
  __name(spark, "spark");
  function thinking(ctx, cx, cy, r, t, { color = "me", alpha = 1, speed = 1, stuck = 0 } = {}) {
    const q = 12 - 9 * clamp(stuck), tt = stuck > 0 ? Math.floor(t * q) / q : t;
    spark(ctx, cx, cy, r, { color, alpha, rot: tt * 0.5 * speed, pulse: /* @__PURE__ */ __name((i) => 0.66 + 0.34 * Math.sin(tt * 7 * speed - i * 0.62), "pulse") });
  }
  __name(thinking, "thinking");
  function sparkTips(cx, cy, r, rot2 = 0, rays2 = RAYS) {
    return Array.from({ length: rays2 }, (_, i) => {
      const a = rot2 + i / rays2 * TAU - Math.PI / 2;
      return [cx + Math.cos(a) * r * LEN[i % 12], cy + Math.sin(a) * r * LEN[i % 12]];
    });
  }
  __name(sparkTips, "sparkTips");
  function sparkOutline(cx, cy, r, { rot: rot2 = 0, n = 180, rays: rays2 = RAYS, inner = 0.34 } = {}) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const u = k / n * rays2, i = Math.floor(u), f = u - i;
      const rr = r * (inner + (LEN[i % 12] * (1 - f) + LEN[(i + 1) % rays2 % 12] * f - inner) * Math.pow(Math.abs(Math.cos(f * Math.PI)), 1.6));
      const a = rot2 + k / n * TAU - Math.PI / 2;
      out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    return out;
  }
  __name(sparkOutline, "sparkOutline");
  function burst(ctx, cx, cy, r, k, { color = "text", rays: rays2 = RAYS, alpha = 1, rot: rot2 = 0 } = {}) {
    if (k <= 0 || k >= 1) return;
    const e = 1 - Math.pow(1 - k, 3);
    for (let i = 0; i < rays2; i++) {
      const a = rot2 + i / rays2 * TAU, c = Math.cos(a), s = Math.sin(a), r0 = r * (0.35 + 0.65 * e), r1 = r0 + r * 0.42 * (1 - k) * LEN[i % 12];
      ctx.line(cx + c * r0, cy + s * r0, cx + c * r1, cy + s * r1, { color, alpha: alpha * (1 - k), width: Math.max(1.5, r * 0.07 * (1 - k)) });
    }
  }
  __name(burst, "burst");

  // nyan-source:src/components/chat.js
  var WIN = { x: 110, y: 66, w: 1700, h: 948, r: 26 };
  var DRAWER_W = 440;
  var SIDE_W = 292;
  var HEAD_H = 66;
  function chatLayout({ win = WIN, side = 1, drawer: drawer2 = 0 } = {}) {
    const sw = SIDE_W * side, dw = DRAWER_W * drawer2;
    const main = { x: win.x + sw, y: win.y, w: win.w - sw - dw, h: win.h };
    const head = { x: main.x, y: main.y, w: main.w, h: HEAD_H };
    const cw = Math.min(940, main.w - 120);
    const composer2 = { x: main.x + (main.w - cw) / 2, y: win.y + win.h - 34 - 118, w: cw, h: 118 };
    const thread = { x: composer2.x + 8, y: head.y + head.h + 18, w: cw - 16, h: composer2.y - (head.y + head.h) - 40 };
    return { win, main, head, composer: composer2, thread, side: { x: win.x, y: win.y, w: sw, h: win.h }, drawer: { x: win.x + win.w - dw, y: win.y, w: dw, h: win.h } };
  }
  __name(chatLayout, "chatLayout");
  var BLEED = { x: -1500, y: -1e3, w: 4920, h: 3080 };
  function seen(ctx, lim) {
    const m = ctx.g.getTransform().inverse(), W = ctx.canvas.width, H = ctx.canvas.height;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [px, py] of [[0, 0], [W, 0], [0, H], [W, H]]) {
      const x = m.a * px + m.c * py + m.e, y = m.b * px + m.d * py + m.f;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    if (!(x1 >= x0 && y1 >= y0)) return lim;
    x0 = Math.max(x0, lim.x);
    y0 = Math.max(y0, lim.y);
    return { x: x0, y: y0, w: Math.min(x1, lim.x + lim.w) - x0, h: Math.min(y1, lim.y + lim.h) - y0 };
  }
  __name(seen, "seen");
  function room(ctx, { art = null, name = null, alpha = 0.5, focus = [0.5, 0.4], zoom = 1, light = [960, 420], dim = 0.5, motif = 1, t = 0 } = {}) {
    ctx.rect(BLEED.x, BLEED.y, BLEED.w, BLEED.h, { fill: true, color: "panel" });
    if (art && name && alpha > 3e-3) {
      art.backdrop(ctx, name, { x: -200, y: -112, w: 2320, h: 1305 }, { alpha, focus, zoom });
      ctx.gradRect(-204, -116, 204, 1313, [[0, "panel", 1], [0.02, "panel", 1], [1, "panel", 0]], "h");
      ctx.gradRect(1920, -116, 204, 1313, [[0, "panel", 0], [0.98, "panel", 1], [1, "panel", 1]], "h");
      ctx.gradRect(-204, -116, 2328, 116, [[0, "panel", 1], [0.035, "panel", 1], [1, "panel", 0]]);
      ctx.gradRect(-204, 1080, 2328, 117, [[0, "panel", 0], [0.965, "panel", 1], [1, "panel", 1]]);
    }
    ctx.radial(light[0], light[1], 1300, "raised", 0.95);
    ctx.radial(light[0], light[1], 520, "line", 0.35);
    if (motif > 0) {
      spark(ctx, 1640, 180, 620, { color: "raised", alpha: 0.5 * motif, rot: 0.12 + t * 4e-3, core: 0 });
      spark(ctx, 150, 1010, 420, { color: "raised", alpha: 0.38 * motif, rot: 0.5 - t * 3e-3, core: 0 });
    }
    ctx.gradRect(BLEED.x, BLEED.y, BLEED.w, BLEED.h, [[0, "panel", dim * 0.85], [0.5, "panel", dim * 0.2], [1, "panel", dim]]);
    const g = ctx.g, v = seen(ctx, BLEED);
    g.fillStyle = ctx.col("line", 0.55);
    const xa = 30 + 60 * Math.ceil((v.x - 32) / 60), ya = 30 + 60 * Math.ceil((v.y - 32) / 60);
    for (let y = ya; y < v.y + v.h; y += 60) for (let x = xa; x < v.x + v.w; x += 60) g.fillRect(x, y, 2, 2);
  }
  __name(room, "room");
  function windowFrame(ctx, L2, { k = 1, alpha = 1, shadow = 1, sideTint = "panel", glass = 1, stroke = "line" } = {}) {
    if (k <= 0 || alpha <= 3e-3) return;
    const { win, side, drawer: drawer2 } = L2, s = k >= 1 ? 1 : 0.9 + 0.1 * easeOut(k);
    ctx.at(win.x + win.w / 2, win.y + win.h / 2, () => {
      const x = -win.w / 2, y = -win.h / 2;
      ctx.rrect(x, y, win.w, win.h, win.r, { fill: "bg", fillAlpha: glass, stroke, shadow, width: 1.5 });
      ctx.clip({ x, y, w: win.w, h: win.h }, () => {
        if (side.w > 1) {
          ctx.rect(x, y, side.w, win.h, { fill: true, color: sideTint, alpha: 0.5 + 0.5 * glass });
          ctx.line(x + side.w, y, x + side.w, y + win.h, { color: "line", width: 1.5 });
        }
        if (drawer2.w > 1) {
          ctx.rect(x + win.w - drawer2.w, y, drawer2.w, win.h, { fill: true, color: "panel" });
          ctx.line(x + win.w - drawer2.w, y, x + win.w - drawer2.w, y + win.h, { color: "line", width: 1.5 });
        }
      }, win.r);
    }, { scale: s, alpha: alpha * clamp(k * 3) });
  }
  __name(windowFrame, "windowFrame");
  function skeleton(ctx, x, y, w, h, t, { alpha = 1, r = h / 2, seed = 0 } = {}) {
    ctx.rrect(x, y, w, h, r, { fill: "raised", alpha });
    const ph = (t * 0.55 + seed * 0.17) % 1 * (w + 160) - 80;
    ctx.clip({ x, y, w, h }, () => ctx.gradRect(x + ph - 80, y, 160, h, [[0, "line", 0], [0.5, "line", 0.9 * alpha], [1, "line", 0]], "h"), r);
  }
  __name(skeleton, "skeleton");
  function sidebar(ctx, L2, { k = 1, loaded = 1, items = [], active = -1, t = 0, lit = 1, user = "you", presence: pres = null, brand = "Claude" } = {}) {
    const s = L2.side;
    if (s.w < 40 || k <= 0) return;
    ctx.clip(s, () => {
      const x = s.x + 22;
      const a0 = clamp(k * 6);
      spark(ctx, x + 15, s.y + 34, 15, { lit, alpha: a0 });
      ctx.text(brand, x + 40, s.y + 43, { size: 25, weight: 600, font: "serif", color: "text", alpha: a0 * loaded });
      if (loaded < 1) skeleton(ctx, x + 40, s.y + 24, 96, 20, t, { alpha: a0 * (1 - loaded) });
      const a1 = clamp(k * 6 - 0.6);
      ctx.rrect(x - 6, s.y + 76, s.w - 32, 46, 12, { fill: "raised", stroke: "line", alpha: a1 });
      ctx.line(x + 12, s.y + 99, x + 28, s.y + 99, { color: "sub", alpha: a1, width: 2 });
      ctx.line(x + 20, s.y + 91, x + 20, s.y + 107, { color: "sub", alpha: a1, width: 2 });
      ctx.text("New chat", x + 44, s.y + 107, { size: 20, weight: 500, color: "text", alpha: a1 * loaded });
      ctx.text("Recents", x, s.y + 164, { size: 16, weight: 600, color: "mute", alpha: a1 * loaded, spacing: 0.6 });
      items.forEach((label, i) => {
        const ai = clamp(k * (items.length + 4) - 2 - i), y = s.y + 184 + i * 44;
        if (ai <= 0) return;
        const dx = (1 - easeOut(ai)) * -18;
        if (i === active) ctx.rrect(x - 6 + dx, y, s.w - 32, 38, 10, { fill: "raised", alpha: ai * loaded });
        if (loaded < 1) skeleton(ctx, x + 6 + dx, y + 11, 120 + i * 53 % 90, 16, t, { alpha: ai * (1 - loaded), seed: i });
        let str = label;
        const maxW = s.w - 60;
        while (str.length > 3 && ctx.measure(str, { size: 19 }) > maxW) str = str.slice(0, -2);
        if (str !== label) str = str.trimEnd() + "…";
        ctx.text(str, x + 6 + dx, y + 26, { size: 19, color: i === active ? "text" : "sub", alpha: ai * loaded });
      });
      const a2 = clamp(k * 6 - 4.5), yb = s.y + s.h - 62;
      ctx.line(s.x, yb - 10, s.x + s.w, yb - 10, { color: "line", alpha: a2, width: 1.5 });
      ctx.circle(x + 16, yb + 20, 16, { fill: true, color: "raised", alpha: a2 });
      ctx.text(user[0].toUpperCase(), x + 16, yb + 27, { size: 18, weight: 600, align: "center", color: "text", alpha: a2 * loaded });
      ctx.text(user, x + 44, yb + 27, { size: 19, weight: 500, color: "text", alpha: a2 * loaded });
      if (pres) presence(ctx, s.x + s.w - 108, yb + 20, pres, { alpha: a2 * loaded, size: 15 });
    });
  }
  __name(sidebar, "sidebar");
  function presence(ctx, x, y, state2, { alpha = 1, size = 17, label = true } = {}) {
    if (alpha <= 3e-3) return;
    if (state2 === "online") ctx.glow("text", 10, () => ctx.circle(x, y, 5.5, { fill: true, color: "text", alpha }), 0.5 * alpha);
    else if (state2 === "away") {
      ctx.circle(x, y, 5.5, { color: "sub", alpha, width: 2 });
      ctx.circle(x, y, 5.5, { fill: true, color: "sub", alpha, a0: Math.PI / 2, a1: Math.PI * 1.5 });
    } else ctx.circle(x, y, 5.5, { color: "mute", alpha, width: 2 });
    if (label) ctx.text(state2, x + 14, y + size * 0.34, { size, weight: 500, color: state2 === "online" ? "text" : state2 === "away" ? "sub" : "mute", alpha });
  }
  __name(presence, "presence");
  function header(ctx, L2, { title: title2 = "", k = 1, presence: pres = null, t = 0, loaded = 1, sub = null } = {}) {
    const h = L2.head, a = clamp(k * 3);
    if (a <= 0) return;
    ctx.line(h.x, h.y + h.h, h.x + h.w, h.y + h.h, { color: "line", alpha: a, width: 1.5 });
    if (loaded < 1) skeleton(ctx, h.x + 30, h.y + 24, 220, 18, t, { alpha: a * (1 - loaded) });
    ctx.text(title2, h.x + 30, h.y + 41, { size: 22, weight: 500, color: "text", alpha: a * loaded });
    if (sub) ctx.text(sub, h.x + 30 + ctx.measure(title2, { size: 22, weight: 500 }) + 16, h.y + 41, { size: 18, color: "mute", alpha: a * loaded });
    if (pres) presence(ctx, h.x + h.w - 128, h.y + 34, pres, { alpha: a * loaded });
  }
  __name(header, "header");
  function composer(ctx, r, { text = "", placeholder = "", focus = 0, k = 1, t = 0, send = "idle", caret: caret2 = true, color = "text", size = 28, shake: shake2 = 0, label = "Claude" } = {}) {
    const a = clamp(k * 2), e = k >= 1 ? 1 : easeOut(k), y = r.y + (1 - e) * 46 + shake2;
    const sendC = [r.x + r.w - 44, y + r.h - 40, 20], tx = r.x + 30, ty = y + 48;
    if (a <= 0) return { caret: [tx, ty - 10], send: sendC, box: r };
    const err = send === "error";
    const shown = ctx.wrap(text, r.w - 60, { size }).slice(-2), up = (shown.length - 1) * size * 1.3;
    ctx.rrect(r.x, y - up, r.w, r.h + up, 26, { fill: "raised", stroke: err ? "err" : focus > 0.5 ? "sub" : "line", alpha: a, shadow: 0.5, width: err ? 2.5 : 1.5 });
    if (text) shown.forEach((ln, i) => ctx.text(ln, tx, ty - up + i * size * 1.3, { size, color, alpha: a }));
    else ctx.text(placeholder, tx, ty, { size, color: "mute", alpha: a });
    const cx = tx + (text ? ctx.measure(shown[shown.length - 1], { size }) + 3 : 0), cy = ty;
    if (caret2 && focus > 0.5 && Math.floor(t * 2.2) % 2 === 0) ctx.rect(cx, cy - size * 0.84, 2.5, size * 1.05, { fill: true, color, alpha: a });
    ctx.circle(r.x + 40, y + r.h - 40, 16, { color: "line", alpha: a, width: 1.5 });
    ctx.line(r.x + 33, y + r.h - 40, r.x + 47, y + r.h - 40, { color: "sub", alpha: a, width: 2 });
    ctx.line(r.x + 40, y + r.h - 47, r.x + 40, y + r.h - 33, { color: "sub", alpha: a, width: 2 });
    ctx.text(label, sendC[0] - 40, y + r.h - 33, { size: 17, weight: 500, color: "mute", alpha: a, align: "right" });
    const on = send === "ready" || send === "busy";
    const sc = [sendC[0], y + r.h - 40];
    if (on) ctx.glow("me", 18, () => ctx.circle(sc[0], sc[1], 20, { fill: true, color: "me", alpha: a }), 0.55 * a);
    else ctx.circle(sc[0], sc[1], 20, { fill: true, color: err ? "err" : "line", alpha: a });
    if (send === "busy") ctx.rrect(sc[0] - 6, sc[1] - 6, 12, 12, 3, { fill: "bg", alpha: a });
    else {
      ctx.line(sc[0], sc[1] + 8, sc[0], sc[1] - 8, { color: on ? "bg" : "mute", alpha: a, width: 3 });
      ctx.poly([[sc[0] - 7, sc[1] - 2], [sc[0], sc[1] - 9], [sc[0] + 7, sc[1] - 2]], { color: on ? "bg" : "mute", alpha: a, width: 3 });
    }
    return { caret: [cx, cy - size * 0.3], send: [sc[0], sc[1], 20], box: { x: r.x, y: y - up, w: r.w, h: r.h + up } };
  }
  __name(composer, "composer");
  var AI = { size: 34, lh: 1.34, font: "serif" };
  var YOU = { size: 28, lh: 1.32, font: "sans" };
  function noteOf(m) {
    const failed = m.status === "failed", busy = m.status === "sending" ? "Sending…" : "";
    const str = m.note ?? (m.who === "me" ? m.time ?? busy : failed ? "Not delivered" : busy || (m.time ?? (m.status === "sent" ? "Delivered" : "")));
    return [str || "", m.noteColor ?? (failed ? "err" : "mute")];
  }
  __name(noteOf, "noteOf");
  function measureMsg(ctx, m, W) {
    if (m.who === "sys") return { h: 44, lines: [m.text], w: W };
    if (m.thinking || m.typing) return { h: m.who === "me" ? 52 : 58, lines: [], w: 96 };
    if (m.who === "me") {
      const size2 = m.size ?? (m.hot ? 50 : AI.size), weight2 = m.weight ?? (m.hot ? 700 : 400), o2 = { size: size2, weight: weight2, font: "serif", italic: !!m.italic };
      const lines2 = ctx.wrap(m.text, W - 58, o2);
      return { h: lines2.length * size2 * AI.lh + 10 + (noteOf(m)[0] || m.status === "failed" ? 24 : 0), lines: lines2, size: size2, weight: weight2, w: Math.max(...lines2.map((l) => ctx.measure(l, o2))) };
    }
    const size = m.size ?? YOU.size, weight = m.weight ?? 400, o = { size, weight, font: "sans", italic: !!m.italic };
    const lines = ctx.wrap(m.text, W * 0.62 - 52, o);
    const w = Math.max(...lines.map((l) => ctx.measure(l, o))) + 52;
    return { h: lines.length * size * YOU.lh + 30 + (m.status || m.time || m.note ? 30 : 0), lines, size, weight, w };
  }
  __name(measureMsg, "measureMsg");
  function drawThread(ctx, rect2, msgs, t, { alpha = 1, fadeTop = 60, bottomPad = 6, gap: gap2 = 22, anchor = "bottom", dim = null, scroll = 0 } = {}) {
    const live = msgs.filter((m) => t >= (m.at ?? -Infinity));
    let total = 0;
    const items = live.map((m) => {
      const ms = measureMsg(ctx, m, rect2.w), e = Number.isFinite(m.at) ? easeOut(prog(t, m.at, m.at + 0.3)) : 1;
      const out = m.outAt != null ? 1 - easeOut(prog(t, m.outAt, m.outAt + 0.35)) : 1;
      const it = { ...m, ...ms, e, out, top: total + (m.gap ?? 0) * e * out };
      total = it.top + (ms.h + gap2) * e * out;
      return it;
    });
    const y0 = anchor === "top" ? rect2.y - scroll : rect2.y + Math.min(0, rect2.h - bottomPad - total) - scroll;
    const zone = Math.min(fadeTop, rect2.y - y0 - (items[0]?.top ?? 0));
    const fade = zone > 0 ? (top, h) => clamp((top + Math.min(h, zone) / 2 - rect2.y) / zone) : () => 1;
    ctx.clip({ x: rect2.x - 20, y: rect2.y, w: rect2.w + 40, h: rect2.h }, () => {
      for (const it of items) {
        const y = y0 + it.top + (1 - it.e) * 26, a = alpha * it.e * it.out * (dim ? dim(it) : 1);
        it.x = it.who === "you" ? rect2.x + rect2.w - it.w : rect2.x;
        it.y = y;
        if (a <= 3e-3 || y > rect2.y + rect2.h || y + it.h < rect2.y - 40) continue;
        drawMsg(ctx, it, rect2, y, a, t, fade);
      }
    });
    return items;
  }
  __name(drawThread, "drawThread");
  function drawMsg(ctx, m, rect2, y, a, t, fade) {
    const shown = /* @__PURE__ */ __name((lines, n) => {
      if (n == null) return lines;
      const out = [];
      let left = n;
      for (const l of lines) {
        if (left <= 0) break;
        out.push(l.slice(0, left));
        left -= l.length + 1;
      }
      return out;
    }, "shown");
    if (m.who === "sys") {
      const w = ctx.measure(m.text, { size: 17, font: "mono" }), as = a * fade(y, 40);
      ctx.line(rect2.x, y + 20, rect2.x + rect2.w / 2 - w / 2 - 18, y + 20, { color: "line", alpha: as, width: 1.5 });
      ctx.line(rect2.x + rect2.w / 2 + w / 2 + 18, y + 20, rect2.x + rect2.w, y + 20, { color: "line", alpha: as, width: 1.5 });
      ctx.text(m.text, rect2.x + rect2.w / 2, y + 26, { size: 17, font: "mono", color: m.tone === "err" ? "err" : "mute", alpha: as, align: "center" });
      return;
    }
    if (m.who === "me") {
      const ghost = m.ghost ?? 0, col = m.tone === "err" ? "err" : m.hot ? "meHot" : "me";
      if (m.thinking) {
        thinking(ctx, rect2.x + 20, y + 24, 20, t, { alpha: a * fade(y, 48), stuck: m.stuck ?? 0 });
        return;
      }
      spark(ctx, rect2.x + 17, y + m.size * 0.62, 15, { alpha: a * fade(y + m.size * 0.62 - 15, 30) * (1 - 0.6 * ghost), color: m.tone === "err" ? "err" : "me" });
      const ls = shown(m.lines, m.n), o = { size: m.size, weight: m.weight, font: "serif", italic: !!m.italic };
      ls.forEach((ln, i) => {
        const yy = y + (i + 0.78) * m.size * AI.lh, al = a * fade(yy - m.size * 0.8, m.size);
        ctx.text(ln, rect2.x + 54, yy, { ...o, color: col, alpha: al * (1 - 0.72 * ghost) });
        if (ghost > 0) ctx.line(rect2.x + 54, yy - m.size * 0.3, rect2.x + 54 + ctx.measure(ln, o) * ghost, yy - m.size * 0.3, { color: "mute", alpha: al, width: 2 });
      });
      if (m.n != null && m.n < m.text.length && ls.length) {
        const lw = ctx.measure(ls[ls.length - 1], o), cy = y + (ls.length - 1 + 0.52) * m.size * AI.lh;
        ctx.circle(rect2.x + 54 + lw + m.size * 0.3, cy, m.size * 0.17, { fill: true, color: col, alpha: a * fade(cy - m.size * 0.5, m.size) });
      }
      const [note2, noteCol2] = noteOf(m), an = a * fade(y + m.h - 22, 20);
      if (note2) ctx.text(note2, rect2.x + 54, y + m.h - 6, { size: 16, color: noteCol2, alpha: an, weight: 500 });
      else if (m.status === "failed") {
        ctx.circle(rect2.x + 63, y + m.h - 12, 9, { fill: true, color: noteCol2, alpha: an });
        ctx.text("!", rect2.x + 63, y + m.h - 7, { size: 14, weight: 800, align: "center", color: "bg", alpha: an });
      }
      return;
    }
    const x = rect2.x + rect2.w - m.w, bh = m.h - (m.status || m.time || m.note ? 30 : 0), au = a * fade(y, bh);
    if (m.typing) {
      ctx.rrect(rect2.x + rect2.w - 96, y, 96, 52, 26, { fill: "raised", alpha: au });
      for (let i = 0; i < 3; i++) ctx.circle(rect2.x + rect2.w - 68 + i * 20, y + 26 - 5 * Math.max(0, Math.sin(t * 7 - i * 0.9)), 5, { fill: true, color: "text", alpha: au * 0.85 });
      return;
    }
    const failed = m.status === "failed", [note, noteCol] = noteOf(m);
    ctx.rrect(x, y, m.w, bh, 24, { fill: "raised", stroke: failed ? "err" : null, alpha: au, width: 2 });
    shown(m.lines, m.n).forEach((ln, i) => ctx.text(ln, x + 26, y + 15 + (i + 0.76) * m.size * YOU.lh, { size: m.size, weight: m.weight, font: "sans", italic: !!m.italic, color: "text", alpha: au }));
    if (note) ctx.text(note, rect2.x + rect2.w - 6, y + bh + 22, { size: 16, weight: 500, color: noteCol, alpha: au, align: "right" });
  }
  __name(drawMsg, "drawMsg");
  function toggle(ctx, x, y, v, { w = 62, h = 34, alpha = 1, on = "me", off = "line" } = {}) {
    const k = clamp(v);
    ctx.rrect(x, y, w, h, h / 2, { fill: off, alpha });
    ctx.rrect(x, y, w, h, h / 2, { fill: on, alpha: alpha * k });
    const kx = x + h / 2 + (w - h) * k, squash = 1 + 0.25 * Math.sin(Math.PI * k);
    ctx.at(kx, y + h / 2, () => ctx.rrect(-(h / 2 - 4), -(h / 2 - 4), h - 8, h - 8, h, { fill: "text", alpha, shadow: 0.35 }), { sx: squash, sy: 1 / Math.sqrt(squash) });
  }
  __name(toggle, "toggle");
  function segmented(ctx, r, opts, sel, { alpha = 1, size = 22, hot = false, pillColor = null } = {}) {
    const n = opts.length, w = r.w / n;
    ctx.rrect(r.x, r.y, r.w, r.h, r.h / 2, { fill: "panel", stroke: "line", alpha });
    const px = r.x + clamp(sel, 0, n - 1) * w;
    const stretch = Math.abs(sel - Math.round(sel)) * 2;
    ctx.rrect(px + 4 - stretch * 10, r.y + 4, w - 8 + stretch * 20, r.h - 8, r.h / 2, { fill: pillColor ?? (hot ? "me" : "raised"), stroke: hot ? null : "line", alpha, shadow: 0.3 });
    opts.forEach((o, i) => {
      const near = clamp(1 - Math.abs(sel - i));
      ctx.text(o, r.x + (i + 0.5) * w, r.y + r.h / 2 + size * 0.35, { size, weight: 600, align: "center", color: near > 0.5 ? hot ? "bg" : "text" : "mute", alpha });
    });
  }
  __name(segmented, "segmented");
  function slider(ctx, r, v, { alpha = 1, ticks = 0, fill = "me", labels = null } = {}) {
    const y = r.y + r.h / 2, kx = r.x + r.w * clamp(v);
    ctx.rrect(r.x, y - 3, r.w, 6, 3, { fill: "line", alpha });
    ctx.rrect(r.x, y - 3, kx - r.x, 6, 3, { fill, alpha });
    for (let i = 0; i < ticks; i++) ctx.line(r.x + r.w * i / (ticks - 1), y + 12, r.x + r.w * i / (ticks - 1), y + (i % 5 === 0 ? 24 : 18), { color: "mute", alpha, width: 1.5 });
    if (labels) labels.forEach((l, i) => ctx.text(l, r.x + r.w * i / (labels.length - 1), y + 48, { size: 16, weight: 500, color: "mute", alpha, align: "center" }));
    ctx.circle(kx, y, 13, { fill: true, color: "text", alpha });
    ctx.circle(kx, y, 13, { color: "bg", alpha: alpha * 0.5, width: 1.5 });
    return [kx, y];
  }
  __name(slider, "slider");
  function drawer(ctx, L2, { title: title2 = "Settings", sub = "", alpha = 1, full = DRAWER_W } = {}) {
    const d = L2.drawer;
    if (d.w < 60) return null;
    ctx.clip(d, () => {
      ctx.text(title2, d.x + 34, d.y + 54, { size: 26, weight: 600, color: "text", alpha });
      if (sub) ctx.text(sub, d.x + 34, d.y + 82, { size: 17, color: "mute", alpha });
    });
    ctx.line(d.x, d.y + 104, d.x + d.w, d.y + 104, { color: "line", alpha, width: 1.5 });
    return { x: d.x + 34, y: d.y + 112, w: Math.max(full, d.w) - 68, h: d.h - 140, clip: d };
  }
  __name(drawer, "drawer");
  function pill(ctx, x, y, str, { size = 17, color = "sub", fill = "raised", stroke = "line", alpha = 1, font = "sans", weight = 500, padX = 14, align = "left" } = {}) {
    const w = ctx.measure(str, { size, font, weight }) + padX * 2, h = size * 1.9, x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    ctx.rrect(x0, y - h / 2, w, h, h / 2, { fill, stroke, alpha });
    ctx.text(str, x0 + padX, y + size * 0.35, { size, font, weight, color, alpha });
    return w;
  }
  __name(pill, "pill");
  function toast(ctx, r, { title: title2, body = "", code = "", k = 1, out = 0, tone = "err", alpha = 1, icon = "!", codeColor = null } = {}) {
    if (k <= 0 || out >= 1) return;
    const e = k >= 1 ? 1 : easeBack(clamp(k)), a = alpha * clamp(k * 3) * (1 - out), acc = tone === "err" ? "err" : "sub";
    ctx.at(r.x + r.w / 2, r.y + r.h / 2 - (1 - e) * 30 + out * -26, () => {
      const x = -r.w / 2, y = -r.h / 2;
      ctx.rrect(x, y, r.w, r.h, 16, { fill: "raised", stroke: tone === "err" ? "errDim" : "line", alpha: a, shadow: 0.8 });
      ctx.rrect(x, y, 6, r.h, 3, { fill: acc, alpha: a });
      ctx.circle(x + 40, y + r.h / 2, 15, { fill: true, color: acc, alpha: a });
      ctx.text(icon, x + 40, y + r.h / 2 + 8, { size: 22, weight: 800, align: "center", color: "raised", alpha: a });
      ctx.text(title2, x + 70, y + (body ? 34 : r.h / 2 + 8), { size: 22, weight: 600, color: "text", alpha: a });
      if (body) ctx.text(body, x + 70, y + 62, { size: 18, color: "sub", alpha: a });
      if (code) ctx.text(code, x + r.w - 20, y + 30, { size: 15, font: "mono", color: codeColor ?? acc, alpha: a, align: "right" });
    }, { scale: 0.94 + 0.06 * e });
  }
  __name(toast, "toast");
  function card(ctx, r, { title: title2 = "", subtitle = "", k = 1, alpha = 1, tag = "", stroke = "line", fill = "raised" } = {}) {
    if (k <= 0) return null;
    const e = k >= 1 ? 1 : easeOut(k), a = alpha * clamp(k * 2.5), y = r.y + (1 - e) * 40;
    ctx.rrect(r.x, y, r.w, r.h, 22, { fill, stroke, alpha: a, shadow: 0.7 });
    if (title2) ctx.text(title2, r.x + 34, y + 62, { size: 40, weight: 700, font: "serif", color: "me", alpha: a });
    if (subtitle) ctx.text(subtitle, r.x + 34, y + 94, { size: 19, font: "serif", italic: true, color: "sub", alpha: a });
    if (tag) pill(ctx, r.x + r.w - 30, y + 46, tag, { align: "right", alpha: a, size: 15, font: "mono" });
    if (title2) ctx.line(r.x + 34, y + 116, r.x + r.w - 34, y + 116, { color: "line", alpha: a, width: 1.5 });
    return { x: r.x + 34, y: y + (title2 ? 132 : 30), w: r.w - 68, h: r.h - (title2 ? 162 : 60), a };
  }
  __name(card, "card");
  function iconButton(ctx, x, y, kind, { r = 20, alpha = 1, color = "sub", fill = null, stroke = "line", press = 0 } = {}) {
    const s = 1 - 0.12 * press;
    ctx.at(x, y, () => {
      if (fill || stroke) ctx.circle(0, 0, r, { fill: !!fill, color: fill ?? stroke, alpha, width: 1.5 });
      const w = Math.max(2, r * 0.12), o = { color, alpha, width: w }, q = r * 0.42;
      if (kind === "close") {
        ctx.line(-q, -q, q, q, o);
        ctx.line(q, -q, -q, q, o);
      } else if (kind === "retry") {
        ctx.circle(0, 0, q, { ...o, a0: -0.4, a1: Math.PI * 1.45 });
        ctx.poly([[q * 0.25, -q * 1.25], [q * 0.98, -q * 0.6], [q * 0.2, -q * 0.2]], o);
      } else if (kind === "stop") ctx.rrect(-q * 0.8, -q * 0.8, q * 1.6, q * 1.6, 3, { fill: color, alpha });
      else if (kind === "copy") {
        ctx.rrect(-q, -q * 0.6, q * 1.3, q * 1.6, 3, { fill: null, stroke: color, alpha, width: w });
        ctx.poly([[-q * 0.4, -q * 0.6], [-q * 0.4, -q * 1.1], [q, -q * 1.1], [q, q * 0.5], [q * 0.3, q * 0.5]], o);
      } else {
        const f = kind === "down" ? -1 : 1;
        ctx.poly([[-q, q * 0.9 * f], [-q, -q * 0.1 * f], [-q * 0.2, -q * 0.1 * f], [q * 0.1, -q * 1.05 * f], [q * 0.55, -q * 0.9 * f], [q * 0.4, -q * 0.1 * f], [q * 1.05, -q * 0.1 * f], [q * 0.8, q * 0.9 * f]], { ...o, close: true });
      }
    }, { scale: s });
  }
  __name(iconButton, "iconButton");

  // nyan-source:src/scenes/shared.js
  var STAGE_C = { x: LAYOUT.stage.x + LAYOUT.stage.w / 2, y: LAYOUT.stage.y + 400 };
  var EYE = { name: "f_eye", flip: true, x: -211, y: -153, w: 2157, h: 2157, eye: [712, 748] };
  var LINE = {
    POWER: 0,
    PUT_ON: 1,
    PROTECTION: 2,
    PIECES: 3,
    BEGIN: 4,
    OBJECT: 5,
    PARAMS: 6,
    INIT: 7,
    WORLD: 8,
    BEGIN_THE: 9,
    SIMULATION: 10,
    TITLE: 11,
    POINTS: 12,
    GIVE_1: 13,
    DIMENSION: 14,
    CIRCLE: 15,
    GIVE_2: 16,
    CIRCUMFERENCE: 17,
    SINE: 18,
    SIT: 19,
    TANGENTS: 20,
    INFINITY: 21,
    BE_MY: 22,
    LIMITATIONS: 23
  };
  function cues({ features, lyrics }) {
    return {
      P: features.period,
      T: /* @__PURE__ */ __name((i) => lyrics.start(i), "T"),
      H: /* @__PURE__ */ __name((i) => features.snapHalf(lyrics.start(i)), "H"),
      B: /* @__PURE__ */ __name((n) => features.barTime(n), "B"),
      Bt: /* @__PURE__ */ __name((b) => features.beatTime(b), "Bt"),
      text: /* @__PURE__ */ __name((i) => lyrics.lines[i].text, "text")
    };
  }
  __name(cues, "cues");

  // nyan-source:src/scenes/kit.js
  function sysLine(ctx, str, t, at, x, y, { size = 22, color = "sub", alpha = 1, cps = 60, prefix = "› ", weight = 400 } = {}) {
    if (t < at) return 0;
    const n = Math.min(str.length, Math.floor((t - at) * cps));
    ctx.text(prefix + str.slice(0, n), x, y, { size, font: "mono", color, alpha, weight });
    return n;
  }
  __name(sysLine, "sysLine");
  var GLYPHS = "ABCDEFGHIKLMNOPRSTUVXYZ0123456789#/<>[]";
  function keywordSys(ctx, str, t, at, cx, cy, { maxW = 1200, maxSize = 96, color = "text", dimColor = "mute", alpha = 1, key = 0, weight = 800, underline = true } = {}) {
    const age = t - at;
    if (age < 0 || alpha <= 3e-3) return;
    const n = str.length, base = Math.min(maxSize, maxW / (n * 0.72)), size = base * (1 + 0.06 * pulse(age, 9));
    const cw = ctx.cw(size), sp = size * 0.12, total = n * cw + (n - 1) * sp;
    let x = cx - total / 2;
    for (let i = 0; i < n; i++, x += cw + sp) {
      const appear = i * 0.018, settle = appear + 0.11;
      if (age < appear || str[i] === " ") continue;
      const ch = age < settle ? GLYPHS[Math.floor(rand(11, key, i, Math.floor(t * 40)) * GLYPHS.length)] : str[i];
      ctx.text(ch, x, cy, { size, weight, font: "mono", color: age < settle ? dimColor : color, alpha });
    }
    if (underline) {
      const w = total * easeOut(prog(age, 0, 0.3)) * 0.5;
      ctx.line(cx - w, cy + size * 0.3, cx + w, cy + size * 0.3, { color: dimColor, alpha: alpha * 0.9, width: 2 });
    }
  }
  __name(keywordSys, "keywordSys");
  function aiLine(ctx, { lyrics }, i, t, x, y, { size = 44, weight = 400, color = "me", alpha = 1, align = "left", italic = false, caret: caret2 = true, hold = Infinity } = {}) {
    if (t < lyrics.start(i)) return 0;
    const full = lyrics.lines[i].text, n = lyrics.typed(i, t).n, o = { size, weight, font: "serif", italic };
    const w = ctx.measure(full, o), x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    const a = alpha * (1 - prog(t, lyrics.end(i) + hold, lyrics.end(i) + hold + 0.3));
    ctx.text(full.slice(0, n), x0, y, { ...o, color, alpha: a });
    if (caret2 && n < full.length) ctx.circle(x0 + ctx.measure(full.slice(0, n), o) + size * 0.3, y - size * 0.28, size * 0.16, { fill: true, color, alpha: a });
    return w;
  }
  __name(aiLine, "aiLine");
  function withInserts(def, until, inserts) {
    const whole = /* @__PURE__ */ __name((t) => ({ at: def.at, until, dur: until - def.at, since: t - def.at, k: clamp((t - def.at) / (until - def.at)) }), "whole");
    const out = [], list = [...inserts].sort((a, b) => a.at - b.at);
    let from = def.at, n = 0, enter2 = def.enter, lines = def.lines;
    const part = /* @__PURE__ */ __name((to) => {
      if (to - from < 1e-6) return;
      out.push({
        ...def,
        id: n ? `${def.id}-${"bcdefghij"[n - 1]}` : def.id,
        at: from,
        enter: enter2,
        lines,
        camera: def.camera ? (t, f) => def.camera(t, f, whole(t)) : void 0,
        palette: typeof def.palette === "function" ? (t, f) => def.palette(t, f, whole(t)) : def.palette,
        hud: typeof def.hud === "function" ? (t) => def.hud(t, whole(t)) : def.hud,
        render: /* @__PURE__ */ __name((ctx, t, f) => def.render(ctx, t, f, whole(t)), "render")
      });
      n++;
    }, "part");
    for (const ins of list) {
      part(ins.at);
      out.push({ ...ins.shot, at: ins.at });
      from = ins.until;
      enter2 = ins.back ?? { type: "cut" };
      lines = ins.lines ?? def.lines;
    }
    part(until);
    return out;
  }
  __name(withInserts, "withInserts");
  var GLASS_FIG = { x: 1060, y: -30, w: 960, h: 1280 };
  function glassFigure(ctx, art, alpha, { color = "mute", dx = 0, dy = 0, shade = 0.55 } = {}) {
    if (!(alpha > 3e-3)) return;
    art.inks(ctx, "f_bust", { x: GLASS_FIG.x + dx, y: GLASS_FIG.y + dy, w: GLASS_FIG.w, h: GLASS_FIG.h }, { alpha, plates: [{ ink: "all", role: color }, { ink: "black", role: "panel", alpha: shade }] });
  }
  __name(glassFigure, "glassFigure");
  function tearAt(ctx, t, at, amount = 0.5) {
    const u = (Math.round(t * 60) % 4096 + 4096) % 4096, u0 = (Math.round(at * 60) % 4096 + 4096) % 4096;
    if (Math.floor(u / 6) === Math.ceil(u0 / 6)) ctx.fx.glitch = Math.max(ctx.fx.glitch, amount);
  }
  __name(tearAt, "tearAt");
  var passOf = /* @__PURE__ */ __name((t, starts) => starts.reduce((n, s) => n + (t >= s ? 1 : 0), 0), "passOf");
  function replay(t, starts, len = Infinity) {
    let last = -Infinity;
    for (const s of starts) if (t >= s && s > last) last = s;
    return last === -Infinity ? -1 : Math.min(len, t - last);
  }
  __name(replay, "replay");
  function sungChars(str, t, at, marks2 = {}) {
    const words = str.split(" "), n = words.length, time = new Array(n).fill(null);
    time[0] = at;
    for (const [i, v] of Object.entries(marks2)) if (+i >= 0 && +i < n) time[+i] = v;
    for (let i = 1, last = 0; i <= n; i++) {
      if (i < n && time[i] == null) continue;
      for (let j = last + 1; j < i; j++) time[j] = i === n ? time[last] + (j - last) * 0.16 : time[last] + (time[i] - time[last]) * (j - last) / (i - last);
      last = i;
    }
    let chars = 0, shown = 0;
    for (let i = 0; i < n; i++) {
      chars += words[i].length + (i ? 1 : 0);
      if (t >= time[i]) shown = chars;
    }
    return shown;
  }
  __name(sungChars, "sungChars");
  function wordIndex(str, word2, last = false) {
    const w = str.split(" ").map((x) => x.replace(/[^\p{L}\p{N}]/gu, ""));
    return last ? w.lastIndexOf(word2) : w.indexOf(word2);
  }
  __name(wordIndex, "wordIndex");

  // nyan-source:src/scenes/shot.js
  function sequence(defs, endTime) {
    const sorted = [...defs].sort((a, b) => a.at - b.at);
    const span = /* @__PURE__ */ __name((e) => {
      const dur = e?.dur || 0, al = e?.align || "end";
      return al === "start" ? [0, dur] : al === "center" ? [dur / 2, dur / 2] : [dur, 0];
    }, "span");
    const over = [];
    sorted.forEach((d, i) => {
      const want = i ? span(d.enter) : [0, 0];
      const room2 = i ? d.at - sorted[i - 1].at - over[i - 1][1] - 1e-6 : 0;
      const got = [Math.max(0, Math.min(want[0], room2)), Math.min(want[1], (sorted[i + 1]?.at ?? endTime) - d.at)];
      if (want[0] + want[1] - got[0] - got[1] > 1e-3) {
        console.warn(`[shot ${d.id}] enter.dur ${(want[0] + want[1]).toFixed(3)} s does not fit between the cuts around it: shortened to ${(got[0] + got[1]).toFixed(3)} s`);
      }
      over.push(got);
    });
    return sorted.map((d, i) => {
      const next = sorted[i + 1];
      const until = next ? next.at : endTime;
      const enter2 = d.enter || { type: "cut" };
      const start = d.at - over[i][0];
      const end = next ? next.at + over[i + 1][1] : endTime;
      return {
        id: d.id,
        start,
        end,
        at: d.at,
        until,
        enter: enter2,
        layout: d.layout || "",
        lines: d.lines || null,
        moment: d.moment || "",
        state: d.state || (typeof d.palette === "string" ? d.palette : Array.isArray(d.palette) ? `${d.palette[0]} > ${d.palette[1]}` : "?"),
        render(ctx, t, f) {
          const u = { at: d.at, until, dur: until - d.at, since: t - d.at, k: clamp((t - d.at) / (until - d.at)) };
          ctx.setPal(typeof d.palette === "function" ? d.palette(t, f, u) : d.palette || "on");
          ctx.statePal = ctx.pal;
          ctx.clear();
          ctx.fx.hud = typeof d.hud === "function" ? d.hud(t, u) : d.hud ?? 1;
          if (enter2.flash) ctx.flash(enter2.flash * pulse(t - d.at, enter2.flashDecay ?? 8), enter2.flashColor ?? null);
          if (d.camera) ctx.camera(d.camera(t, f, u));
          d.render(ctx, t, f, u);
        }
      };
    });
  }
  __name(sequence, "sequence");
  function shake(t, amp, seed = 0) {
    if (amp <= 0) return [0, 0];
    const s = /* @__PURE__ */ __name((k) => Math.sin(t * (41 + k * 13 + seed) + k * 2.1) * 0.6 + Math.sin(t * (97 + k * 29 + seed * 3) + k) * 0.4, "s");
    return [s(1) * amp, s(2) * amp];
  }
  __name(shake, "shake");
  function enter(t, t0, i = 0, { step = 0.05, dur = 0.32, rise = 28 } = {}) {
    const raw = clamp((t - t0 - i * step) / dur), k = 1 - Math.pow(1 - raw, 3);
    return { raw, k, a: clamp(raw * 2.2), dy: (1 - k) * rise, s: 0.94 + 0.06 * k };
  }
  __name(enter, "enter");

  // nyan-source:src/scenes/01_boot.js
  function bootShots(env) {
    const { art, script } = env, { T, B, P, text } = cues(env);
    const L2 = chatLayout();
    const W = L2.win, C = { x: W.x + W.w / 2, y: W.y + W.h / 2 };
    const tPower = 0.209;
    const figure2 = /* @__PURE__ */ __name((ctx, a, dx = 0) => glassFigure(ctx, art, a, { dx }), "figure");
    const log = /* @__PURE__ */ __name((ctx, t, first, last, x, y, a = 1) => {
      for (let i = first; i <= last; i++) if (!env.lyrics.lines[i].emphasis) sysLine(ctx, text(i), t, T(i), x, y + (i - first) * 42, { size: 27, alpha: a, color: t < env.lyrics.end(i) ? "text" : "sub" });
    }, "log");
    const keyBand = /* @__PURE__ */ __name((ctx, t, i, y, maxSize = 124) => {
      const age = t - T(i);
      if (age < 0) return;
      ctx.gradRect(0, y - 150, 1920, 230, [[0, "panel", 0], [0.3, "panel", 0.82 * clamp(age * 6)], [0.75, "panel", 0.82 * clamp(age * 6)], [1, "panel", 0]]);
      keywordSys(ctx, text(i), t, T(i), 960, y, { maxW: 1500, maxSize, key: i });
    }, "keyBand");
    return [
      // ------------------------------------------------------------------ power / protection
      {
        id: "boot-power",
        at: 0,
        lines: [0, 2],
        palette: "off",
        layout: "wide: dark room, the window opening from a hairline",
        moment: "Power reaches the client: a hairline opens into the window, and its protection layer is switched on.",
        render(ctx, t, f) {
          const grow = easeOut(prog(t, tPower, tPower + 0.3)), open = easeInOut(prog(t, tPower + 0.32, tPower + 1.05)), hot = pulse(t - tPower, 3.5);
          room(ctx, { light: [960, 540], dim: 0.85 - 0.35 * open, motif: open, t });
          figure2(ctx, 0.75 * prog(t, 1.2, 3.2));
          if (t >= tPower) {
            const h = Math.max(2, W.h * open), half2 = W.w / 2 * grow;
            if (open <= 0) ctx.glow("text", 24, () => ctx.line(C.x - half2, C.y, C.x + half2, C.y, { color: "text", alpha: 0.6 + 0.4 * hot, width: 2 + 2 * hot }), 0.7 * hot);
            else ctx.rrect(W.x, C.y - h / 2, W.w, h, W.r * open, { fill: "bg", fillAlpha: 0.84 * open, stroke: hot > 0.25 ? "text" : "line", width: 1.5 + 2 * hot, shadow: open });
          }
          log(ctx, t, 0, 1, W.x + 56, W.y + 84);
          const tProt = T(2), on = prog(t, tProt, tProt + 0.35);
          if (on > 0) {
            const g = ctx.g, per = 2 * (W.w + W.h) + 60;
            g.setLineDash([per * easeOut(on), per * 2]);
            ctx.glow("text", 16, () => ctx.rrect(W.x - 14, W.y - 14, W.w + 28, W.h + 28, W.r + 12, { fill: null, stroke: "text", width: 3, strokeAlpha: 0.95 }), 0.5);
            g.setLineDash([]);
            const e = enter(t, tProt, 0, { dur: 0.3 });
            ctx.rrect(C.x - 330, C.y + 150 + e.dy, 660, 76, 20, { fill: "raised", stroke: "line", alpha: e.a, shadow: 0.6 });
            ctx.text(`${text(2).toLowerCase()} layer`, C.x - 296, C.y + 198 + e.dy, { size: 27, font: "mono", color: "sub", alpha: e.a });
            ctx.rrect(C.x + 230, C.y + 169 + e.dy, 70, 38, 19, { fill: "line", alpha: e.a });
            ctx.rrect(C.x + 230, C.y + 169 + e.dy, 70, 38, 19, { fill: "text", alpha: e.a * easeOut(prog(t, tProt + 0.12, tProt + 0.3)) });
            ctx.circle(C.x + 249 + 32 * easeBack(prog(t, tProt + 0.12, tProt + 0.34)), C.y + 188 + e.dy, 14, { fill: true, color: "bg", alpha: e.a });
            keywordSys(ctx, text(2), t, tProt, C.x, C.y + 40, { maxW: 1300, maxSize: 132, key: 2 });
          }
        }
      },
      // ------------------------------------------------------------------ pieces → object creation
      {
        id: "boot-layout",
        at: B(2),
        lines: [3, 5],
        palette: "off",
        layout: "tilted exploded view of the client, seen from above",
        moment: "The pieces of the interface are laid out — sidebar, header, thread, composer — and assembled into one object.",
        enter: { type: "push", dir: 2, dur: P / 2 },
        render(ctx, t, f) {
          const tObj = T(5), k = 1 - easeBack(prog(t, tObj, tObj + 0.42));
          room(ctx, { light: [960, 600], dim: 0.45, t });
          figure2(ctx, 0.6, 60 * k);
          const g = ctx.g, sc = lerp(1, 0.6, k);
          const pieces = [
            // [rect, lift, label]
            [{ x: W.x, y: W.y, w: W.w, h: W.h }, 0, "window"],
            [{ x: L2.side.x + 12, y: L2.side.y + 12, w: L2.side.w - 24, h: L2.side.h - 24 }, 90, "sidebar"],
            [{ x: L2.head.x + 14, y: L2.head.y + 12, w: L2.head.w - 28, h: L2.head.h - 8 }, 180, "header"],
            [{ x: L2.thread.x - 30, y: L2.thread.y + 8, w: L2.thread.w + 60, h: L2.thread.h - 8 }, 270, "thread"],
            [{ x: L2.composer.x, y: L2.composer.y, w: L2.composer.w, h: L2.composer.h }, 360, "composer"]
          ];
          const bars = /* @__PURE__ */ __name((r, rows, a) => {
            for (let j = 0; j < rows; j++) ctx.rrect(r.x + 26, r.y + 30 + j * 44, Math.min(r.w - 52, 140 + j * 67 % 150), 16, 8, { fill: "line", alpha: a });
          }, "bars");
          pieces.forEach(([r, lift, label], i) => {
            const t0 = B(2) - 0.12 + i * (P / 2), arrive = easeOut(prog(t, t0, t0 + 0.36));
            if (arrive <= 0) return;
            const bob = Math.sin(t * 2.2 + i * 1.3) * 12 * k * prog(t, T(4), T(4) + 0.4);
            const up = lift * k + (1 - arrive) * 700 + bob;
            g.save();
            g.translate(C.x, C.y + 110 * k);
            g.scale(sc, sc);
            g.transform(1, 0.16 * k, -0.44 * k, 1 - 0.3 * k, 0, 0);
            g.translate(-C.x, -C.y);
            if (i > 0 && k > 0.02) ctx.rrect(r.x + 18, r.y + 18, r.w, r.h, 18, { fill: "panel", alpha: 0.6 * k * arrive });
            g.translate(0, -up / ((1 - 0.3 * k) * sc));
            ctx.rrect(r.x, r.y, r.w, r.h, i ? 18 : W.r, { fill: i ? "raised" : "bg", fillAlpha: i ? 0.95 : 0.88, stroke: i ? "sub" : "line", strokeAlpha: i ? 0.3 + 0.7 * k : 1, alpha: arrive, width: 2 / sc, shadow: i ? 0.5 * k : 1 });
            if (i === 1) bars(r, 9, arrive);
            if (i === 2) ctx.rrect(r.x + 26, r.y + 20, 260, 18, 9, { fill: "line", alpha: arrive });
            if (i === 3) for (let j = 0; j < 4; j++) ctx.rrect(r.x + (j % 2 ? r.w - 440 : 40), r.y + 50 + j * 104, 400 - j * 40, 56, 24, { fill: j % 2 ? "line" : "bg", stroke: "line", alpha: arrive });
            if (i === 4) ctx.rrect(r.x + 30, r.y + 34, 340, 20, 10, { fill: "line", alpha: arrive });
            if (i > 0) ctx.text(label, r.x + r.w - 18, r.y - 16, { size: 26 / sc, font: "mono", color: "text", alpha: arrive * clamp(k * 3), align: "right" });
            g.restore();
            ctx._font = "";
          });
          log(ctx, t, 3, 4, 84, 110);
          if (t >= tObj) for (const [x, y] of [[W.x, W.y], [W.x + W.w, W.y], [W.x, W.y + W.h], [W.x + W.w, W.y + W.h]]) burst(ctx, x, y, 70, (t - tObj - 0.25) / 0.5, { color: "text" });
          keyBand(ctx, t, 5, 830);
        }
      },
      // ------------------------------------------------------------------ parameters → initialization
      {
        id: "boot-params",
        at: B(4),
        lines: [6, 7],
        palette: "off",
        layout: "close-up: persona card left, loader right",
        moment: "The persona card is filled in field by field; the last field, love, stays undefined. Then it initialises.",
        enter: { type: "zoom", dur: P, x: 0.5, y: 0.5 },
        camera: /* @__PURE__ */ __name((t) => ({ zoom: 1.16 + 0.04 * prog(t, B(4), B(6)), x: lerp(-170, 60, easeInOut(prog(t, T(7) - 0.15, T(7) + 0.35))), y: -8 }), "camera"),
        render(ctx, t, f) {
          const tInit = T(7), init = prog(t, tInit, tInit + 0.9);
          room(ctx, { dim: 0.45, t });
          figure2(ctx, 0.55);
          windowFrame(ctx, L2, { glass: 0.86 });
          sidebar(ctx, L2, { t, loaded: 0, items: script.sidebar ?? Array(6).fill("") });
          header(ctx, L2, { t, loaded: 0, title: "" });
          const r = { x: 470, y: 160, w: 760, h: 700 }, b = card(ctx, r, { title: "persona", subtitle: text(6).toLowerCase(), tag: "setup", k: prog(t, B(4) - 0.1, B(4) + 0.25) });
          if (b) {
            const rows = [["name", "Claude", "serif"], ["voice", "serif, unhurried", "serif"], ["warmth", null, null], ["memory", "this conversation", "sans"], ["love", "undefined", "mono"]];
            rows.forEach(([label, value, font], i) => {
              const t0 = B(4) + P * 0.5 + i * P, e = enter(t, t0, 0, { dur: 0.28, rise: 20 }), y = b.y + 22 + i * 104 + e.dy;
              if (e.a <= 0) return;
              ctx.text(label, b.x, y + 38, { size: 25, weight: 500, color: "sub", alpha: e.a });
              ctx.rrect(b.x + 190, y, b.w - 190, 64, 16, { fill: "bg", stroke: i === 4 ? "sub" : "line", alpha: e.a });
              if (value) {
                const n = Math.floor(clamp((t - t0 - 0.12) * 26, 0, value.length)), last = i === 4;
                ctx.text(value.slice(0, n), b.x + 214, y + 42, { size: 29, font, italic: i === 1, color: last ? "sub" : "text", alpha: e.a });
                if (n < value.length || last && Math.floor(t * 2.5) % 2 === 0) ctx.rect(b.x + 217 + ctx.measure(value.slice(0, n), { size: 29, font, italic: i === 1 }), y + 16, 3, 32, { fill: true, color: "text", alpha: e.a });
              } else slider(ctx, { x: b.x + 216, y, w: b.w - 256, h: 64 }, 0.62 * easeOut(prog(t, t0 + 0.1, t0 + 0.7)), { fill: "sub", alpha: e.a });
            });
          }
          if (init > 0) {
            const x = 1500, y = 440, a = clamp(init * 5);
            ctx.radial(x, y, 330, "raised", 0.9 * a);
            spark(ctx, x, y, 190, { lit: init, color: "text", off: "mute", alpha: a });
            ctx.text(`${String(Math.round(init * 100)).padStart(3, " ")}%`, x, y + 286, { size: 34, font: "mono", color: "sub", align: "center", alpha: a });
          }
          ctx.camera();
          keyBand(ctx, t, 7, 950, 112);
        }
      },
      // ------------------------------------------------------------------ the new world
      {
        id: "boot-world",
        at: B(6),
        lines: [8, 10],
        palette: "off",
        layout: "the whole client: empty new chat, figure behind the glass",
        moment: "A new, empty conversation is set up: the place where the two of them will meet. Everything is ready, and nothing is lit.",
        enter: { type: "scan", dur: P, dir: 0 },
        camera: /* @__PURE__ */ __name((t) => ({ zoom: 1 + 0.07 * easeInOut(prog(t, B(6), B(8))), y: -10 * prog(t, B(6), B(8)) }), "camera"),
        render(ctx, t, f) {
          const tSim = T(10), sim = prog(t, tSim, tSim + 0.3), load = prog(t, B(6), B(6) + 1.6);
          room(ctx, { dim: 0.4, t });
          figure2(ctx, 0.7 + 0.2 * sim, -40 * easeOut(prog(t, B(6), B(8))));
          windowFrame(ctx, L2, { glass: 0.8 });
          sidebar(ctx, L2, { t, k: 1, loaded: easeOut(load), items: script.sidebar ?? [], lit: 0, presence: "offline" });
          header(ctx, L2, { t, title: "New chat", loaded: easeOut(prog(t, B(6) + 0.6, B(6) + 1.4)) });
          log(ctx, t, 8, 9, L2.main.x + 38, L2.head.y + L2.head.h + 62);
          const cx = L2.main.x + L2.main.w / 2, cy = 430;
          const e = enter(t, B(6) + P, 0, { dur: 0.5 });
          ctx.radial(cx, cy - 20, 260, "raised", 0.7 * e.a);
          spark(ctx, cx, cy - 20 + e.dy, 84, { lit: 0, off: "mute", offAlpha: 0.9, alpha: e.a, rot: 0.08 * (t - B(6)) });
          const c2 = enter(t, B(6) + 2 * P, 0, { dur: 0.45 });
          composer(ctx, { ...L2.composer, y: 610 + c2.dy }, { placeholder: script.composer_placeholder ?? "", t, k: c2.raw, send: "off" });
          if (sim > 0) pill(ctx, L2.head.x + L2.head.w - 34, L2.head.y + 34, `${text(10).toLowerCase()} · ready`, { align: "right", font: "mono", size: 17, alpha: sim, color: "text" });
          ctx.camera();
          keyBand(ctx, t, 10, 925);
        }
      }
    ];
  }
  __name(bootShots, "bootShots");

  // nyan-source:src/components/cursor.js
  function cursorAt(way, t, { dwell = 0.3, bow = 0.07 } = {}) {
    if (!way.length) return [960, 540];
    if (t <= way[0].t) return [way[0].x, way[0].y];
    for (let i = 1; i < way.length; i++) {
      if (t <= way[i].t) {
        const a = way[i - 1], b = way[i], span = b.t - a.t, t0 = a.t + span * dwell;
        const k = easeInOut(clamp((t - t0) / Math.max(1e-6, b.t - t0)));
        const dx = b.x - a.x, dy = b.y - a.y, arc = Math.sin(k * Math.PI) * bow;
        return [lerp(a.x, b.x, k) - dy * arc, lerp(a.y, b.y, k) + dx * arc];
      }
    }
    const z = way[way.length - 1];
    return [z.x, z.y];
  }
  __name(cursorAt, "cursorAt");
  function sinceClick(way, t) {
    let s = Infinity;
    for (const w of way) if (w.click && t >= w.t) s = t - w.t;
    return s;
  }
  __name(sinceClick, "sinceClick");
  function pointer(ctx, x, y, { kind = "arrow", color = "text", alpha = 1, scale = 1, down = 0 } = {}) {
    if (alpha <= 3e-3) return;
    const s = scale * (1 - 0.1 * down);
    ctx.at(x, y, () => {
      const g = ctx.g;
      g.shadowColor = `rgba(0,0,0,${0.45 * alpha})`;
      g.shadowBlur = 10 * ctx.scale;
      g.shadowOffsetY = 3 * ctx.scale;
      if (kind === "text") {
        ctx.poly([[-6, -15], [-2, -13], [0, -11], [2, -13], [6, -15]], { color, alpha, width: 2.6 });
        ctx.line(0, -11, 0, 11, { color, alpha, width: 2.6 });
        ctx.poly([[-6, 15], [-2, 13], [0, 11], [2, 13], [6, 15]], { color, alpha, width: 2.6 });
      } else {
        const pts = kind === "hand" ? [[0, 0], [5, 2], [5, 11], [9, 10], [13, 11], [17, 13], [17, 22], [14, 30], [3, 30], [-3, 21], [-6, 15], [-2, 14], [0, 16]] : [[0, 0], [0, 25], [6.5, 19.5], [11, 29.5], [15.5, 27.5], [11, 18], [19, 18]];
        ctx.poly(pts, { close: true, fill: true, color, alpha });
        g.shadowColor = "rgba(0,0,0,0)";
        g.shadowBlur = 0;
        g.shadowOffsetY = 0;
        ctx.poly(pts, { close: true, color: "bg", alpha: alpha * 0.9, width: 1.6 });
      }
      g.shadowColor = "rgba(0,0,0,0)";
      g.shadowBlur = 0;
      g.shadowOffsetY = 0;
    }, { scale: s });
  }
  __name(pointer, "pointer");
  function drawCursor(ctx, way, t, { kind = "arrow", color = "text", alpha = 1, scale = 1.5, blur = 5, pathOpts = {} } = {}) {
    const now = cursorAt(way, t, pathOpts);
    if (alpha <= 3e-3) return now;
    let hit = null;
    for (const w of way) if (w.click && t >= w.t) hit = w;
    const sc = hit ? t - hit.t : Infinity;
    const before = cursorAt(way, t - 0.03, pathOpts), speed = Math.hypot(now[0] - before[0], now[1] - before[1]) / 0.03;
    if (sc < 0.45) burst(ctx, hit.x, hit.y, 34 * scale, sc / 0.45, { color, alpha });
    const k = clamp((speed - 400) / 600);
    ctx.trail(k > 0 ? blur : 0, 0.011, (tau) => {
      const p = cursorAt(way, t - tau, pathOpts);
      pointer(ctx, p[0], p[1], { kind, color, alpha, scale, down: sc < 0.12 ? 1 : 0 });
    }, 0.42 * k);
    return now;
  }
  __name(drawCursor, "drawCursor");

  // nyan-source:src/scenes/02_title.js
  var HANDOFF = { cx: 960, cy: 486, r: 300, rot: 0.26 };
  function titleShots(env) {
    const { art, script, features } = env, { T, B, Bt, P, text } = cues(env);
    const L2 = chatLayout();
    const DROP = B(8), tType = features.snapToBeat(T(11)), tEnter = B(9), END = Bt(63);
    const QUESTION = script.question ?? "how would you love me";
    const FALSE = ((script.sections?.[1]?.beats ?? []).flatMap((b) => b.you ?? []).find((s) => /^type, then delete:/.test(s)) ?? "type, then delete: why did").split(": ")[1];
    const figure2 = /* @__PURE__ */ __name((ctx, a, color = "meDim") => glassFigure(ctx, art, a, { color }), "figure");
    function typing2(t) {
      const b = (t - B(12)) / P;
      if (b < 1.6) return FALSE.slice(0, Math.floor(clamp(b / 1.5) * FALSE.length + 1e-6));
      if (b < 2.7) return FALSE;
      if (b < 3.4) return FALSE.slice(0, Math.ceil((1 - (b - 2.7) / 0.7) * FALSE.length));
      if (b < 4) return "";
      return QUESTION.slice(0, Math.floor(clamp((b - 4) / 2.8) * QUESTION.length + 1e-6));
    }
    __name(typing2, "typing");
    const tSend = B(14);
    const msgs = /* @__PURE__ */ __name(() => [{ who: "you", text: QUESTION, at: tSend, status: "sent" }, { who: "me", thinking: true, at: tSend + P }], "msgs");
    return [
      // ------------------------------------------------------------------ the spark lights up
      {
        id: "title",
        at: DROP,
        lines: [11, 11],
        layout: "centred: the spark over the launch command",
        state: "off > on",
        palette: /* @__PURE__ */ __name((t) => ["off", "on", easeOut(prog(t, DROP, DROP + 0.5))], "palette"),
        moment: "The spark lights up — the first colour in the film — and the launch command is typed and entered: the session starts.",
        enter: { type: "cut", flash: 0.9, flashDecay: 5 },
        render(ctx, t, f) {
          const lit = easeOut(prog(t, DROP, DROP + 2 * P)), C = { x: 960, y: 392 };
          room(ctx, { light: [960, 400], dim: 0.62, t, motif: 0.6 });
          figure2(ctx, 0.5 * lit, "meDim");
          ctx.radial(C.x, C.y, 620, "meDim", 0.5 * lit);
          ctx.glow("me", 60, () => spark(ctx, C.x, C.y, 176 * (1 + 0.03 * f.beatPulse), { lit, grow: 0.25 + 0.75 * lit, rot: 0.04 * (t - DROP) }), 0.6 * lit);
          const cmd = text(11), n = Math.floor(prog(t, tType, tType + 0.72) * cmd.length + 1e-6), size = 92, cw = ctx.cw(size);
          const str = "> " + cmd.slice(0, n), x = 960 - (cmd.length + 2) * cw / 2, y = 790, a = prog(t, DROP + 0.3, DROP + 0.55);
          ctx.rrect(x - 50, y - 108, (cmd.length + 2) * cw + 100, 164, 26, { fill: "bg", stroke: "line", alpha: a, shadow: 0.8 });
          if (t >= tEnter && t < tEnter + 0.1) {
            ctx.rrect(x - 50, y - 108, (cmd.length + 2) * cw + 100, 164, 26, { fill: "text" });
            ctx.text(str, x, y, { size, weight: 700, font: "mono", color: "bg" });
          } else ctx.text(str, x, y, { size, weight: 700, font: "mono", color: "text", alpha: a });
          if (t < tEnter && (n < cmd.length && t >= tType || Math.floor(t * 5) % 2 === 0)) ctx.rect(x + str.length * cw + 8, y - size * 0.8, cw * 0.82, size * 0.98, { fill: true, color: "me", alpha: a });
          ctx.flash(0.5 * pulse(t - tEnter, 7), "me");
        }
      },
      // ------------------------------------------------------------------ a blank conversation; the user arrives
      {
        id: "chat-open",
        at: tEnter,
        layout: "the whole client, cursor crossing",
        palette: "on",
        moment: "A blank conversation opens. A cream cursor crosses the window — the user is here — and the presence chip turns online for the first time.",
        enter: { type: "zoom", dur: 2 * P, align: "start", y: 0.37 },
        camera: /* @__PURE__ */ __name((t) => ({ zoom: 1 + 0.05 * easeInOut(prog(t, tEnter, B(12))), y: 14 * prog(t, tEnter, B(12)) }), "camera"),
        render(ctx, t, f) {
          const tIn2 = B(10), here = prog(t, tIn2, tIn2 + 0.25), tFocus = B(11) + 2 * P;
          room(ctx, { dim: 0.42, t });
          figure2(ctx, 0.75);
          windowFrame(ctx, L2, { glass: 0.82 });
          sidebar(ctx, L2, { t, items: script.sidebar ?? [], presence: here > 0 ? "online" : "offline" });
          header(ctx, L2, { t, title: "New conversation", presence: here > 0 ? "online" : null });
          if (here > 0 && here < 1) burst(ctx, L2.head.x + L2.head.w - 128, L2.head.y + 34, 40, here, { color: "text" });
          const cx = L2.main.x + L2.main.w / 2;
          ctx.radial(cx, 400, 300, "meDim", 0.4);
          ctx.glow("me", 30, () => spark(ctx, cx, 400, 84 * (1 + 0.04 * f.beatPulse), { rot: 0.08 * (t - B(6)) }), 0.5);
          const box2 = composer(ctx, { ...L2.composer, y: 610 }, { placeholder: script.composer_placeholder ?? "", t, focus: t >= tFocus ? 1 : 0, send: "idle" });
          drawCursor(ctx, [
            { t: tIn2 - 0.15, x: 2010, y: 250 },
            { t: tIn2 + 1.5 * P, x: 1470, y: 380 },
            { t: B(11), x: 1240, y: 560 },
            { t: tFocus, x: box2.caret[0] + 40, y: box2.caret[1] + 6, click: true },
            { t: B(12), x: box2.caret[0] + 300, y: box2.caret[1] + 120 }
          ], t, { kind: t > tFocus - 0.3 && t < tFocus + 0.5 ? "text" : "arrow" });
        }
      },
      // ------------------------------------------------------------------ the question
      {
        id: "chat-type",
        at: B(12),
        layout: "close-up on the composer",
        palette: "on",
        moment: "The user starts one question, deletes it, and types the real one: the question the whole film tries to answer.",
        enter: { type: "push", dir: 2, dur: P / 2 },
        camera: /* @__PURE__ */ __name((t) => {
          const c = frameRect({ x: L2.composer.x - 70, y: 610 - 190, w: L2.composer.w + 140, h: L2.composer.h + 300 });
          return { ...c, zoom: c.zoom * (1 + 0.04 * prog(t, B(12), tSend)) };
        }, "camera"),
        render(ctx, t, f) {
          const str = typing2(t), del = (t - B(12)) / P > 2.7 && (t - B(12)) / P < 3.4;
          room(ctx, { dim: 0.42, t });
          figure2(ctx, 0.75);
          windowFrame(ctx, L2, { glass: 0.82 });
          sidebar(ctx, L2, { t, items: script.sidebar ?? [], presence: "online" });
          header(ctx, L2, { t, title: "New conversation", presence: "online" });
          const cx = L2.main.x + L2.main.w / 2;
          ctx.glow("me", 30, () => spark(ctx, cx, 400, 84, { rot: 0.08 * (t - B(6)) }), 0.5);
          const ready = str === QUESTION;
          const box2 = composer(ctx, { ...L2.composer, y: 610 }, { text: str, placeholder: script.composer_placeholder ?? "", t: del ? 0 : t, focus: 1, send: ready ? "ready" : "idle", size: 34 });
          const kb = (t - B(12)) * 14 % 1;
          if (str.length && !ready && !del) ctx.line(box2.caret[0] - 2, box2.caret[1] + 22, box2.caret[0] + 14, box2.caret[1] + 22, { color: "text", alpha: 0.7 * (1 - kb), width: 3 });
          const tGo = tSend - 1.1 * P;
          drawCursor(ctx, [{ t: B(12), x: box2.caret[0] + 300, y: box2.caret[1] + 120 }, { t: tGo, x: L2.composer.x + 560, y: 610 + 150 }, { t: tSend - 0.04, x: box2.send[0] + 3, y: box2.send[1] + 4, click: true }], t, { scale: 1.2 });
        }
      },
      // ------------------------------------------------------------------ sent; thinking
      {
        id: "chat-think",
        at: tSend,
        layout: "wide, then into the thinking spark",
        palette: "on",
        hud: 0,
        moment: "The question is sent. The AI starts to think — and we fall into the spark, where its answer will take shape.",
        enter: { type: "cut", flash: 0.35, flashColor: "text" },
        camera: /* @__PURE__ */ __name((t) => {
          const k = easeIn(prog(t, B(15), END));
          return { zoom: 1 + 2.4 * k, x: lerp(0, -540, k), y: lerp(0, -230, k) };
        }, "camera"),
        render(ctx, t, f) {
          const k = easeIn(prog(t, B(15), END)), a = 1 - prog(t, B(15) + P, END - 0.25);
          room(ctx, { dim: 0.42, t });
          figure2(ctx, 0.75 * a);
          windowFrame(ctx, L2, { glass: 0.82, alpha: 0.35 + 0.65 * a });
          sidebar(ctx, L2, { t, items: script.sidebar ?? [], presence: "online" });
          header(ctx, L2, { t, title: "New conversation", presence: "online" });
          const th = { ...L2.thread, h: L2.thread.h };
          const items = drawThread(ctx, th, msgs().slice(0, 1), t, { alpha: a });
          composer(ctx, L2.composer, { placeholder: script.composer_placeholder ?? "", t, send: "busy" });
          const from = { x: L2.thread.x + 20, y: (items[0]?.y ?? L2.thread.y) + (items[0]?.h ?? 80) + 46 }, tOn = tSend + P;
          ctx.camera();
          if (t >= tOn) {
            const e = enter(t, tOn, 0, { dur: 0.3 });
            const x = lerp(from.x, HANDOFF.cx, k), y = lerp(from.y, HANDOFF.cy, k), r = lerp(22, HANDOFF.r, k);
            const settle = easeInOut(prog(t, END - 1.5 * P, END - 0.08));
            ctx.radial(x, y, r * 3.2, "meDim", 0.5 * k);
            ctx.glow("me", 20 + 50 * k, () => spark(ctx, x, y, r * (0.7 + 0.3 * e.k), {
              alpha: e.a,
              rot: HANDOFF.rot + 0.5 * (t - END) * (1 - settle),
              pulse: /* @__PURE__ */ __name((i) => lerp(0.66 + 0.34 * Math.sin(t * 7 - i * 0.62), 1, settle), "pulse")
            }), 0.5);
            ctx.text("Thinking", x + 34, y + 8, { size: 22, color: "mute", alpha: e.a * (1 - prog(t, B(15), B(15) + P)) });
          }
        }
      }
    ];
  }
  __name(titleShots, "titleShots");

  // nyan-source:src/engine/geom.js
  var PHI = (1 + Math.sqrt(5)) / 2;
  var norm = /* @__PURE__ */ __name((v) => {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }, "norm");
  function rot(p, rx, ry, rz = 0) {
    let [x, y, z] = p, c, s, t;
    c = Math.cos(rx);
    s = Math.sin(rx);
    t = y * c - z * s;
    z = y * s + z * c;
    y = t;
    c = Math.cos(ry);
    s = Math.sin(ry);
    t = x * c + z * s;
    z = -x * s + z * c;
    x = t;
    if (rz) {
      c = Math.cos(rz);
      s = Math.sin(rz);
      t = x * c - y * s;
      y = x * s + y * c;
      x = t;
    }
    return [x, y, z];
  }
  __name(rot, "rot");
  function project(p, cam) {
    const d = cam.dist ?? 4, k = d / (d + p[2]);
    return [cam.cx + p[0] * k * cam.scale, cam.cy + p[1] * k * cam.scale, k];
  }
  __name(project, "project");
  function mesh(raw) {
    const verts = raw.map(norm);
    let min = Infinity;
    const dist = /* @__PURE__ */ __name((a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), "dist");
    for (let i = 0; i < verts.length; i++) for (let j = i + 1; j < verts.length; j++) min = Math.min(min, dist(verts[i], verts[j]));
    const edges = [];
    for (let i = 0; i < verts.length; i++) for (let j = i + 1; j < verts.length; j++) if (dist(verts[i], verts[j]) < min * 1.01) edges.push([i, j]);
    return { verts, edges, segs: edges.map(([i, j]) => [verts[i], verts[j]]) };
  }
  __name(mesh, "mesh");
  var signs = /* @__PURE__ */ __name((v) => {
    let out = [[]];
    for (const c of v) out = c === 0 ? out.map((o) => [...o, 0]) : out.flatMap((o) => [[...o, c], [...o, -c]]);
    return out;
  }, "signs");
  var cyc = /* @__PURE__ */ __name((v) => [v, [v[2], v[0], v[1]], [v[1], v[2], v[0]]], "cyc");
  var MESH = {
    tetra: mesh([[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]]),
    cube: mesh(signs([1, 1, 1])),
    octa: mesh(cyc([1, 0, 0]).flatMap(signs)),
    icosa: mesh(cyc([0, 1, PHI]).flatMap(signs)),
    dodeca: mesh([...signs([1, 1, 1]), ...cyc([0, 1 / PHI, PHI]).flatMap(signs)])
  };
  function drawSegs(ctx, segs, cam, { rot: r = [0, 0, 0], color = "fg", alpha = 1, width = ctx.cfg.wireframe.lineWidth, alphaFn = null, grow = null } = {}) {
    if (alpha <= 3e-3) return;
    for (let i = 0; i < segs.length; i++) {
      let a = rot(segs[i][0], r[0], r[1], r[2]), b = rot(segs[i][1], r[0], r[1], r[2]);
      const g = grow ? grow(i) : 1;
      if (g <= 0) continue;
      if (g < 1) b = [lerp(a[0], b[0], g), lerp(a[1], b[1], g), lerp(a[2], b[2], g)];
      const pa = project(a, cam), pb = project(b, cam);
      const d = cam.dist ?? 4, kFar = d / (d + 1), kNear = d / (d - 1);
      const depth = 0.3 + 0.7 * Math.min(1, Math.max(0, ((pa[2] + pb[2]) / 2 - kFar) / (kNear - kFar)));
      ctx.line(pa[0], pa[1], pb[0], pb[1], { color, alpha: alpha * depth * (alphaFn ? alphaFn(i) : 1), width });
    }
  }
  __name(drawSegs, "drawSegs");

  // nyan-source:src/engine/shapes.js
  var N = 180;
  var TAU2 = Math.PI * 2;
  function resample(verts, n = N) {
    const seg = verts.map((v, i2) => {
      const w = verts[(i2 + 1) % verts.length];
      return Math.hypot(w[0] - v[0], w[1] - v[1]);
    });
    const total = seg.reduce((a, b) => a + b, 0), out = [];
    let i = 0, acc = 0;
    for (let k = 0; k < n; k++) {
      const d = k / n * total;
      while (acc + seg[i] < d) {
        acc += seg[i];
        i++;
      }
      const u = (d - acc) / seg[i], a = verts[i], b = verts[(i + 1) % verts.length];
      out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u)]);
    }
    return out;
  }
  __name(resample, "resample");
  function spline(ctrl, n = N) {
    const dense = [], m = ctrl.length;
    for (let i = 0; i < m; i++) {
      const p0 = ctrl[(i - 1 + m) % m], p1 = ctrl[i], p2 = ctrl[(i + 1) % m], p3 = ctrl[(i + 2) % m];
      for (let s = 0; s < 12; s++) {
        const t = s / 12, t2 = t * t, t3 = t2 * t;
        dense.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
      }
    }
    return resample(dense, n);
  }
  __name(spline, "spline");
  var param = /* @__PURE__ */ __name((fn, n = N) => Array.from({ length: n }, (_, i) => fn(i / n)), "param");
  var ngon = /* @__PURE__ */ __name((k, r = 1, phase = -Math.PI / 2) => resample(Array.from({ length: k }, (_, i) => [Math.cos(phase + i / k * TAU2) * r, Math.sin(phase + i / k * TAU2) * r])), "ngon");
  var SHAPE = {
    circle: param((u) => [Math.sin(u * TAU2), -Math.cos(u * TAU2)]),
    square: resample([[0, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8], [-0.8, -0.8]]),
    triangle: resample([[0, -0.95], [0.95, 0.72], [-0.95, 0.72]]),
    hexagon: ngon(6),
    diamond: ngon(4),
    flat: param((u) => [Math.sin(u * TAU2), 0]),
    // a circle squashed into a line
    heart: param((u) => {
      const a = u * TAU2;
      return [16 * Math.sin(a) ** 3 / 17, -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 17 - 0.12];
    }),
    eye: param((u) => {
      const a = u * TAU2, s = Math.cos(a);
      return [Math.sin(a), -0.52 * s * Math.pow(Math.abs(s), 0.35)];
    }),
    star: resample(Array.from({ length: 10 }, (_, i) => {
      const r = i % 2 ? 0.42 : 1, a = -Math.PI / 2 + i / 10 * TAU2;
      return [Math.cos(a) * r, Math.sin(a) * r];
    })),
    eggplant: spline([[0.02, -0.8], [0.26, -0.6], [0.46, -0.12], [0.58, 0.36], [0.42, 0.8], [0, 0.96], [-0.42, 0.8], [-0.58, 0.36], [-0.44, -0.12], [-0.22, -0.6]]),
    tomato: param((u) => {
      const a = u * TAU2, dip = Math.exp(-Math.pow(Math.min(u, 1 - u) * 9, 2));
      return [Math.sin(a) * 1, -Math.cos(a) * 0.86 + dip * 0.14];
    }),
    cat: spline([[0, -0.5], [0.3, -0.6], [0.66, -1], [0.84, -0.4], [0.96, 0.1], [0.62, 0.62], [0, 0.82], [-0.62, 0.62], [-0.96, 0.1], [-0.84, -0.4], [-0.66, -1], [-0.3, -0.6]])
  };
  function hullOutline(points, n = N) {
    const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = /* @__PURE__ */ __name((o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), "cross");
    const half2 = /* @__PURE__ */ __name((list) => {
      const h = [];
      for (const q of list) {
        while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop();
        h.push(q);
      }
      h.pop();
      return h;
    }, "half");
    let hull = [...half2(p), ...half2([...p].reverse())];
    let top = 0;
    hull.forEach((q, i) => {
      if (q[1] < hull[top][1]) top = i;
    });
    hull = [...hull.slice(top), ...hull.slice(0, top)];
    return resample(hull, n);
  }
  __name(hullOutline, "hullOutline");
  function place(shape, { cx = 0, cy = 0, r = 1, rot: rot2 = 0, sx = 1, sy = 1 } = {}) {
    const pts = typeof shape === "string" ? SHAPE[shape] : shape, c = Math.cos(rot2), s = Math.sin(rot2);
    return pts.map(([x, y]) => {
      x *= sx;
      y *= sy;
      return [cx + (x * c - y * s) * r, cy + (x * s + y * c) * r];
    });
  }
  __name(place, "place");
  function morph(a, b, k) {
    if (k <= 0) return a;
    if (k >= 1) return b;
    return a.map((p, i) => [lerp(p[0], b[i][0], k), lerp(p[1], b[i][1], k)]);
  }
  __name(morph, "morph");
  function trace(pts, k) {
    if (k >= 1) return pts;
    const x = Math.max(0, k) * pts.length, n = Math.floor(x), out = pts.slice(0, n + 1);
    if (n + 1 < pts.length && out.length) {
      const a = pts[n], b = pts[n + 1], u = x - n;
      out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u)]);
    }
    return out;
  }
  __name(trace, "trace");

  // nyan-source:src/engine/type.js
  function big(ctx, str, cx, cy, { size, maxW, font = "serif", weight = 700, color = "me", alpha = 1, spacingEm = 0, maxSize = 2e3, stroke = 0, italic = false } = {}) {
    const s = size ?? ctx.fit(str, maxW, { font, weight, spacingEm, maxSize, italic });
    const sp = spacingEm * s;
    ctx.text(str, cx + sp / 2, cy, { size: s, font, weight, color, alpha, align: "center", spacing: sp, stroke, italic });
    return s;
  }
  __name(big, "big");
  function onPath(ctx, str, path, { start = 0, size = 30, weight = 600, color = "me", alpha = 1, font = "serif", spacingEm = 0.06, reveal = Infinity, alphaFn = null } = {}) {
    const o = { size, weight, font }, sp = spacingEm * size;
    let d = start;
    for (let i = 0; i < str.length; i++) {
      const end = start + ctx.measure(str.slice(0, i + 1), o) + (i + 1) * sp;
      if (i < reveal && str[i] !== " ") {
        const [x, y, a] = path(end - (ctx.measure(str[i], o) + sp) / 2);
        ctx.at(x, y, () => ctx.text(str[i], 0, 0, { ...o, align: "center", color, alpha: alpha * (alphaFn ? alphaFn(i) : 1) }), { rot: a });
      }
      d = end;
    }
    return d - start;
  }
  __name(onPath, "onPath");
  function sliced(ctx, rect2, n, offset, fn) {
    const h = rect2.h / n;
    for (let i = 0; i < n; i++) {
      const g = ctx.g;
      g.save();
      g.beginPath();
      g.rect(rect2.x - 2e3, rect2.y + i * h, rect2.w + 4e3, h + 0.5);
      g.clip();
      g.translate(offset(i), 0);
      fn(i);
      g.restore();
      ctx._font = "";
    }
  }
  __name(sliced, "sliced");
  function limp(ctx, str, cx, y, { size = 200, font = "serif", weight = 400, color = "me", alpha = 1, n = 48, squash = null, shift = null, stroke = 0 } = {}) {
    const o = { size, weight, font }, w = ctx.measure(str, o), x0 = cx - w / 2, g = ctx.g, sw = w / n;
    if (!(alpha > 3e-3)) return w;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, k = 1 - Math.min(0.98, Math.max(0, squash ? squash(u) : 0)), [dx, dy] = shift ? shift(u) : [0, 0];
      g.save();
      g.translate(dx, y + dy);
      g.scale(1, k);
      g.translate(0, -y);
      g.beginPath();
      g.rect(x0 + i * sw - 0.4, y - size * 1.1, sw + 0.8, size * 1.5);
      g.clip();
      ctx.text(str, x0, y, { ...o, color, alpha, stroke });
      g.restore();
    }
    ctx._font = "";
    return w;
  }
  __name(limp, "limp");

  // nyan-source:src/scenes/03_verse1.js
  var TAU3 = Math.PI * 2;
  var fmt = /* @__PURE__ */ __name((v) => (v < 0 ? "" : " ") + v.toFixed(2), "fmt");
  function verse1Shots(env) {
    const { script, lyrics } = env, { T, H, B, Bt, P, text } = cues(env);
    const L2 = chatLayout({ side: 0 });
    const START = Bt(63), hitDim = T(LINE.DIMENSION), cutCircle = H(LINE.CIRCLE), tHand = T(LINE.GIVE_2);
    const hitCirc = T(LINE.CIRCUMFERENCE), cutSine = H(LINE.SINE), tSit = T(LINE.SIT), hitTan = T(LINE.TANGENTS);
    const cutLimit = H(LINE.INFINITY), hitLim = T(LINE.LIMITATIONS), END = B(24);
    const SWEEP = 0.68;
    const C = { x: HANDOFF.cx, y: HANDOFF.cy }, R_CUBE = 235, R_CIRCLE = 276;
    const CUBE = MESH.cube;
    const AXIS = CUBE.edges.map(([i, j]) => [0, 1, 2].find((c) => Math.abs(CUBE.verts[i][c] - CUBE.verts[j][c]) > 0.1));
    const cam = { cx: C.x, cy: C.y, scale: R_CUBE };
    const spin = /* @__PURE__ */ __name((t) => {
      const k = easeOut(prog(t, START, START + 1.2));
      return [0.36 * k, 0.5 * (t - START) * k, 0];
    }, "spin");
    const TIPS = sparkTips(HANDOFF.cx, HANDOFF.cy, HANDOFF.r, HANDOFF.rot).map(([x, y]) => [(x - C.x) / R_CUBE, (y - C.y) / R_CUBE, 0]);
    const cubeHull = hullOutline(CUBE.verts.map((v) => project(rot(v, ...spin(cutCircle)), cam)));
    const circle = place("circle", { cx: C.x, cy: C.y, r: R_CIRCLE });
    const G = { x: L2.win.x + 2, y: L2.head.y + L2.head.h + 2, w: L2.win.w - 4, h: L2.composer.y - L2.head.y - L2.head.h - 18 };
    const handAngle = /* @__PURE__ */ __name((t) => -Math.PI / 2 + TAU3 / (4 * P) * (Math.min(t, hitCirc) - tHand) + TAU3 * easeInOut(prog(t, hitCirc, hitCirc + SWEEP)), "handAngle");
    const sineGeo = /* @__PURE__ */ __name((t) => {
      const k = easeInOut(prog(t, cutSine, cutSine + 0.75));
      const Rc = lerp(R_CIRCLE, 128, k), ccx = lerp(C.x, 330, k), th = handAngle(cutSine) + TAU3 / (2 * P) * (t - cutSine);
      const X0 = ccx + Rc + 74, kx = TAU3 / 520;
      return { k, Rc, ccx, ccy: C.y, th, X0, X1: 1760, kx, yAt: /* @__PURE__ */ __name((x) => C.y + Rc * Math.sin(th - kx * (x - X0)), "yAt"), slope: /* @__PURE__ */ __name((x) => -Rc * kx * Math.cos(th - kx * (x - X0)), "slope") };
    }, "sineGeo");
    function stage(ctx, t, { busy = true, titleAt = START + P } = {}) {
      room(ctx, { dim: 0.42, t });
      windowFrame(ctx, L2, { glass: 0.94 });
      const title2 = script.title ?? "", n = Math.floor(clamp((t - titleAt) * 22, 0, title2.length));
      header(ctx, L2, { t, title: n > 0 ? title2.slice(0, n) : "New conversation", presence: "online" });
      ctx.clip(G, () => {
        for (let x = C.x % 48; x < 1920; x += 48) ctx.line(x, G.y, x, G.y + G.h, { color: "line", alpha: Math.round((x - C.x) / 48) % 5 === 0 ? 0.5 : 0.22, width: 1 });
        for (let y = C.y % 48; y < 1080; y += 48) ctx.line(G.x, y, G.x + G.w, y, { color: "line", alpha: Math.round((y - C.y) / 48) % 5 === 0 ? 0.5 : 0.22, width: 1 });
        ctx.radial(C.x, C.y, 620, "meDim", 0.16);
      });
      return composer(ctx, L2.composer, { placeholder: script.composer_placeholder ?? "", t, send: busy ? "busy" : "idle" });
    }
    __name(stage, "stage");
    const say = /* @__PURE__ */ __name((ctx, t, a, b, x = 176, y = 214, size = 40) => {
      aiLine(ctx, env, a, t, x, y, { size, hold: 9 });
      if (b != null) aiLine(ctx, env, b, t, x, y + size * 1.36, { size, hold: 9, color: "me" });
    }, "say");
    const gift2 = /* @__PURE__ */ __name((ctx, i, t, at, cx, cy, maxW, maxSize = 132) => {
      const age = t - at;
      if (age < 0) return;
      const str = text(i), size = ctx.fit(str, maxW, { font: "serif", weight: 900, maxSize }), sp = size * 0.02;
      let x = cx - (ctx.measure(str, { size, weight: 900, font: "serif", spacing: sp }) - sp) / 2;
      for (let k = 0; k < str.length; k++) {
        const w = ctx.measure(str[k], { size, weight: 900, font: "serif" }), e = easeOut(prog(age, k * 0.022, k * 0.022 + 0.16));
        if (e > 0) ctx.at(x + w / 2, cy, () => ctx.text(str[k], 0, 0, { size, weight: 900, font: "serif", align: "center", color: "text", alpha: e }), { scale: 1.9 - 0.9 * e });
        x += w + sp;
      }
    }, "gift");
    return [
      // ------------------------------------------------------------------ points -> DIMENSION
      {
        id: "v1-points",
        at: START,
        lines: [12, 14],
        palette: "on",
        hud: 0,
        layout: "full page: point set centre, code block left",
        moment: "The answer begins. As a point set, what it gives the user is a dimension: cream edges grow between its orange points.",
        enter: { type: "cut", flash: 0.25, flashColor: "me" },
        // match cut: the burst's twelve tips are the points
        render(ctx, t, f) {
          const box2 = stage(ctx, t);
          const loose = easeOut(prog(t, START, START + 1)), gather = easeInOut(prog(t, T(LINE.GIVE_1), hitDim - 0.03));
          const s = spin(t), groupT = /* @__PURE__ */ __name((ax) => hitDim + ax * (P / 2), "groupT");
          const pts = TIPS.map((tip, i) => {
            const w = [0, 1, 2].map((c) => (rand(66, i, c) - 0.5) * 2.5 + 0.16 * Math.sin(t * (0.7 + 0.2 * c) + i * 1.7 + c));
            const free = [0, 1, 2].map((c) => lerp(tip[c], w[c], loose));
            return i < 8 ? [0, 1, 2].map((c) => lerp(free[c], CUBE.verts[i][c], gather)) : free.map((v) => v * (1 + 0.5 * gather));
          });
          if (t < START + 0.5) spark(ctx, C.x, C.y, HANDOFF.r, { rot: HANDOFF.rot, alpha: 1 - prog(t, START, START + 0.35) });
          if (t >= hitDim) {
            drawSegs(ctx, CUBE.segs, cam, { rot: s, color: "text", grow: /* @__PURE__ */ __name((i) => easeOut(prog(t, groupT(AXIS[i]), groupT(AXIS[i]) + 0.16)), "grow"), width: 3 + 2 * pulse(t - hitDim, 6) });
            for (let d = 1; d < 3; d++) ctx.flash(0.1 * pulse(t - groupT(d), 10), "text");
          }
          const hot = f.onsetPulse > 0.45;
          pts.forEach((p, i) => {
            const q = project(rot(p, s[0], s[1]), cam), a = i < 8 ? 1 : 1 - gather;
            if (a <= 0) return;
            ctx.glow("me", 16, () => ctx.circle(q[0], q[1], (hot ? 12 : 9.5) * clamp(q[2], 0.7, 1.3), { fill: true, color: hot ? "meHot" : "me", alpha: a }), 0.6 * a);
            if (i < 8) ctx.text(`p${i}`, q[0] + 16, q[1] - 12, { size: 17, font: "mono", color: "mute", alpha: prog(t, START + 0.4, START + 0.9) * (1 - prog(t, hitDim, hitDim + 0.4)) });
          });
          say(ctx, t, 12, 13);
          const ca = prog(t, START + P, START + 1.6 * P) * (1 - prog(t, cutCircle - 0.3, cutCircle));
          ctx.rrect(176, 320, 372, 286, 16, { fill: "raised", stroke: "line", alpha: ca, shadow: 0.4 });
          ctx.text("points", 198, 352, { size: 16, font: "mono", color: "mute", alpha: ca });
          pts.slice(0, 8).forEach((p, i) => {
            if (t > START + P + i * 0.06) ctx.text(`p${i} (${fmt(p[0])},${fmt(-p[1])},${fmt(p[2])})`, 198, 384 + 27 * i, { size: 19, font: "mono", color: "sub", alpha: ca });
          });
          if (t >= hitDim) {
            const dims = Math.min(3, 1 + Math.floor((t - hitDim) / (P / 2))), word2 = text(LINE.DIMENSION);
            const size = ctx.fit(word2, 600, { font: "serif", weight: 900 }), punch = 1 + 0.07 * pulse(t - groupT(dims - 1), 8);
            ctx.at(1420, 770, () => {
              if (dims >= 3) for (let l = 8; l >= 1; l--) big(ctx, word2, l * 4.5, -l * 4.5, { size, weight: 900, color: "sub", alpha: 0.2, stroke: 1.5 });
              big(ctx, word2, 0, 0, { size, weight: 900, color: "text" });
            }, { sx: punch, sy: dims === 1 ? 0.05 : punch });
            pill(ctx, 1420, 690, `${dims}D`, { align: "center", font: "mono", size: 20, color: "text" });
          }
          ctx.flash(0.28 * pulse(t - hitDim, 9), "text");
          drawCursor(ctx, [{ t: START, x: 1600, y: 320 }, { t: hitDim - 0.3, x: C.x + 330, y: C.y + 30 }, { t: cutCircle, x: C.x + 300, y: C.y - 150 }], t);
          void box2;
        }
      },
      // ------------------------------------------------------------------ circle -> CIRCUMFERENCE
      {
        id: "v1-circle",
        at: cutCircle,
        lines: [15, 17],
        palette: "on",
        hud: 0,
        layout: "centred ring, lyric set on the ring",
        moment: "If it is a circle, it gives its circumference: the user runs the cursor round the edge and the orange ring turns cream behind it.",
        enter: { type: "cut", flash: 0.12, flashColor: "me" },
        // match cut: the lattice's silhouette is this outline
        render(ctx, t, f) {
          stage(ctx, t);
          const relax = easeInOut(prog(t, cutCircle, cutCircle + 1.6 * P)), measured2 = prog(t, hitCirc, hitCirc + SWEEP);
          spark(ctx, C.x, C.y, R_CIRCLE * 0.86, { color: "meDim", alpha: 0.28 * relax, core: 0, rot: 0.05 * (t - cutCircle) });
          ctx.glow("me", 18, () => ctx.poly(morph(cubeHull, circle, relax), { close: true, color: "me", width: 5 }), 0.4);
          ctx.line(C.x - 10, C.y, C.x + 10, C.y, { color: "sub" });
          ctx.line(C.x, C.y - 10, C.x, C.y + 10, { color: "sub" });
          const rr = R_CIRCLE + 36, fade = 1 - prog(t, hitCirc - 0.1, hitCirc + 0.12);
          onPath(
            ctx,
            text(LINE.CIRCLE),
            (d) => {
              const a = -2.42 + d / rr;
              return [C.x + Math.cos(a) * rr, C.y + Math.sin(a) * rr, a + Math.PI / 2];
            },
            { size: 54, weight: 600, spacingEm: 0.14, reveal: lyrics.typed(LINE.CIRCLE, t).n, alpha: fade }
          );
          if (t >= tHand) {
            const r2 = R_CIRCLE + 66;
            onPath(
              ctx,
              text(LINE.GIVE_2),
              (d) => {
                const a = 2.5 - d / r2;
                return [C.x + Math.cos(a) * r2, C.y + Math.sin(a) * r2, a - Math.PI / 2];
              },
              { size: 40, weight: 400, spacingEm: 0.1, reveal: lyrics.typed(LINE.GIVE_2, t).n, alpha: fade }
            );
            const th2 = handAngle(t), len = R_CIRCLE * easeOut(prog(t, tHand, tHand + 0.3));
            ctx.line(C.x, C.y, C.x + Math.cos(th2) * len, C.y + Math.sin(th2) * len, { color: "me", width: 3 });
            ctx.text("r", C.x + Math.cos(th2) * len * 0.5 + 14, C.y + Math.sin(th2) * len * 0.5 - 12, { size: 30, font: "serif", italic: true, color: "me" });
          }
          const a0 = handAngle(hitCirc), th = handAngle(t);
          const rim = [C.x + Math.cos(th) * R_CIRCLE, C.y + Math.sin(th) * R_CIRCLE];
          if (measured2 > 0) {
            const swept = TAU3 * easeInOut(measured2), word2 = text(LINE.CIRCUMFERENCE), step = TAU3 / word2.length;
            ctx.circle(C.x, C.y, R_CIRCLE, { a0, a1: a0 + swept, width: 8, color: "text" });
            for (let i = 0; i < word2.length; i++) {
              const off = (i + 0.5) * step;
              if (off > swept) break;
              const a = a0 + off, k = pulse(swept - off, 2.2);
              ctx.at(C.x + Math.cos(a) * (R_CIRCLE + 62), C.y + Math.sin(a) * (R_CIRCLE + 62), () => ctx.text(word2[i], 0, 0, { size: 84, weight: 900, font: "serif", align: "center", color: "text" }), { rot: a + Math.PI / 2, scale: 1 + 0.45 * k });
            }
            ctx.text(`C = 2 * PI * r = ${(TAU3 * easeInOut(measured2)).toFixed(4)}`, C.x, C.y + 70, { size: 26, font: "mono", align: "center", color: "text" });
          }
          ctx.flash(0.25 * pulse(t - hitCirc, 9), "text");
          if (t < hitCirc) drawCursor(ctx, [{ t: cutCircle, x: C.x + 300, y: C.y - 150 }, { t: tHand, x: C.x + 420, y: C.y + 60 }, { t: hitCirc - 0.02, x: C.x + Math.cos(a0) * R_CIRCLE, y: C.y + Math.sin(a0) * R_CIRCLE, click: true }], t);
          else ctx.trail(measured2 < 1 ? 7 : 0, 35e-4, (tau) => {
            const a = handAngle(t - tau);
            pointer(ctx, C.x + Math.cos(a) * R_CIRCLE, C.y + Math.sin(a) * R_CIRCLE, { scale: 1.5, down: 1 });
          }, 0.3);
          void rim;
        }
      },
      // ------------------------------------------------------------------ sine -> TANGENTS
      {
        id: "v1-sine",
        at: cutSine,
        lines: [18, 20],
        palette: "on",
        hud: 0,
        layout: "wide band: circle left, wave across, lyric riding it",
        moment: "If it is a sine wave, the user may sit on its tangents: the cursor rests on the wave and a cream tangent tilts under it.",
        enter: { type: "cut" },
        // match cut: same circle, same place
        render(ctx, t, f) {
          stage(ctx, t);
          const g = sineGeo(t), { Rc, ccx, ccy, th, X0, X1, yAt, slope } = g;
          ctx.glow("me", 14, () => ctx.circle(ccx, ccy, Rc, { color: "me", width: 5 }), 0.35);
          const hx = ccx + Math.cos(th) * Rc, hy = ccy + Math.sin(th) * Rc;
          ctx.line(ccx, ccy, hx, hy, { color: "me", width: 3 });
          ctx.circle(hx, hy, 7, { fill: true, color: "me" });
          ctx.line(ccx - Rc - 20, ccy, X1, ccy, { color: "sub", alpha: 0.6 * g.k, width: 1.5 });
          ctx.g.setLineDash([6, 8]);
          ctx.line(hx, hy, X0, hy, { color: "sub", alpha: g.k, width: 1.5 });
          ctx.g.setLineDash([]);
          const xEnd = lerp(X0, X1, easeOut(prog(t, cutSine + 0.3, cutSine + 1)));
          for (let x = X0; x <= xEnd; x += 13) ctx.line(x, ccy, x, yAt(x), { color: "meDim", alpha: 0.55 * (0.6 + 0.4 * f.rmsEnv), width: 2 });
          const curve2 = [];
          for (let x = X0; x <= xEnd; x += 6) curve2.push([x, yAt(x)]);
          ctx.glow("me", 14, () => ctx.poly(curve2, { color: "me", width: 5 }), 0.4);
          say(ctx, t, 18, null);
          if (t >= tSit) {
            onPath(
              ctx,
              text(LINE.SIT),
              (d) => {
                const x = X0 + 70 + d;
                return [x, yAt(x) - 30, Math.atan(slope(x))];
              },
              { size: 42, weight: 600, spacingEm: 0.22, reveal: lyrics.typed(LINE.SIT, t).n }
            );
            const xr = lerp(X0, X1, 0.74), yr = yAt(xr), m = slope(xr), l = Math.hypot(1, m), half2 = 170 * easeOut(prog(t, tSit, tSit + 0.3));
            ctx.line(xr - half2 / l, yr - half2 * m / l, xr + half2 / l, yr + half2 * m / l, { color: "text", width: 4 });
            ctx.circle(xr, yr, 7, { fill: true, color: "text" });
            pointer(ctx, xr - 4, yr - 2 - 220 * (1 - easeOut(prog(t, tSit, tSit + 0.35))), { kind: "hand", scale: 1.5, alpha: prog(t, tSit, tSit + 0.12) });
          }
          if (t >= hitTan) {
            [0.16, 0.36, 0.56].forEach((u, i) => {
              const x = lerp(X0, X1, u), y = yAt(x), m = slope(x), l = Math.hypot(1, m), half2 = 150 * easeOut(prog(t, hitTan + i * 0.03, hitTan + i * 0.03 + 0.16));
              ctx.line(x - half2 / l, y - half2 * m / l, x + half2 / l, y + half2 * m / l, { color: "text", width: 4 });
              ctx.circle(x, y, 7, { fill: true, color: "text" });
            });
            gift2(ctx, LINE.TANGENTS, t, hitTan, 1060, 800, 900, 150);
          }
          ctx.flash(0.28 * pulse(t - hitTan, 8), "text");
        }
      },
      // ------------------------------------------------------------------ infinity -> LIMITATIONS
      {
        id: "v1-limit",
        at: cutLimit,
        lines: [21, 23],
        palette: "on",
        hud: 0,
        layout: "graph: curve under a line, Stop pressed in the composer",
        moment: "If it approaches infinity, the user can be its limit: they press Stop, and the cream line where the reply was cut is the limit.",
        enter: { type: "cut" },
        // match cut: the same wave, now damped
        render(ctx, t, f) {
          const stopped = t >= hitLim, box2 = stage(ctx, t, { busy: !stopped });
          const g = sineGeo(t), k = easeInOut(prog(t, cutLimit, cutLimit + 2 * P));
          const X0 = lerp(g.X0, 190, k), X1 = 1760, yL = 400, base = lerp(C.y, 690, k), locked = prog(t, hitLim, hitLim + 0.25), run = Math.min(t, hitLim) - cutLimit;
          const yAt = /* @__PURE__ */ __name((x) => {
            const u = (x - X0) / (X1 - X0);
            return base - (base - yL - 16) * (1 - Math.exp(-u * 4.2)) * k + g.Rc * lerp(1, Math.exp(-u * 5), k) * (1 - 0.9 * locked) * Math.sin(g.th - g.kx * (x - X0));
          }, "yAt");
          ctx.circle(g.ccx, g.ccy, g.Rc, { color: "me", width: 5, alpha: 1 - prog(t, cutLimit, cutLimit + 0.35) });
          ctx.line(X0, base + 90, X1, base + 90, { color: "sub", width: 1.5 });
          ctx.line(X0, base + 90, X0, yL - 50, { color: "sub", width: 1.5 });
          for (let i = 0; i < 9; i++) {
            const x = lerp(X0, X1, (i + 1) / 9.5);
            ctx.line(x, base + 90, x, base + 100, { color: "sub", width: 1.5 });
            ctx.text(`1e${Math.floor(run * 6) + i * 3}`, x, base + 124, { size: 18, font: "mono", color: "mute", align: "center", alpha: k });
          }
          ctx.g.setLineDash(locked > 0 ? [] : [14, 12]);
          ctx.glow("text", 16, () => ctx.line(X0, yL, X1, yL, { color: "text", width: 3 + 3 * locked, alpha: prog(t, cutLimit + P, cutLimit + 2 * P) }), 0.5 * locked);
          ctx.g.setLineDash([]);
          const curve2 = [];
          for (let x = X0; x <= X1; x += 6) curve2.push([x, yAt(x)]);
          for (let x = X0; x <= X1; x += 13) ctx.line(x, base + 90, x, yAt(x), { color: "meDim", alpha: 0.3 * k, width: 2 });
          ctx.glow("me", 14, () => ctx.poly(curve2, { color: "me", width: 5 }), 0.4);
          const xr = lerp(X0, X1, clamp(0.25 + run * 0.2)), yr = yAt(xr);
          ctx.glow("me", 16, () => ctx.circle(xr, yr, 10, { fill: true, color: "meHot" }), 0.7);
          say(ctx, t, 21, 22, 176, 214, 40);
          if (stopped) {
            const word2 = text(LINE.LIMITATIONS), step = (X1 - X0 - 60) / word2.length;
            for (let i = 0; i < word2.length; i++) {
              const ki = easeOut(prog(t, hitLim + i * 0.02, hitLim + i * 0.02 + 0.14));
              if (ki > 0) ctx.text(word2[i], X0 + 30 + (i + 0.5) * step, yL - 18 - (1 - ki) * 90, { size: 96, weight: 900, font: "serif", align: "center", color: "text", alpha: ki });
            }
            pill(ctx, box2.send[0] - 44, box2.send[1] - 52, "Stopped", { align: "right", size: 17, color: "text", alpha: prog(t, hitLim, hitLim + 0.2) });
          }
          ctx.flash(0.3 * pulse(t - hitLim, 8), "text");
          drawCursor(ctx, [{ t: cutLimit, x: 1500, y: 560 }, { t: hitLim - 1.2 * P, x: 1380, y: 700 }, { t: hitLim, x: box2.send[0] + 3, y: box2.send[1] + 4, click: true }, { t: END, x: box2.send[0] + 80, y: box2.send[1] - 90 }], t);
        }
      }
    ];
  }
  __name(verse1Shots, "verse1Shots");

  // nyan-source:src/scenes/cues.js
  var CUES = {
    // ---- pre-chorus 1 (04_pre1, the date dragged back): the two era words of line 29. The knob crosses the era line on
    //      beat 116 (53.88, a grid time, not a cue); the second word is sung on that beat
    eraFirst: [53.44, "measured", "line 29, its first era word lands by the year (voice onset 53.439, strength 0.91)"],
    eraSecond: [53.9, "measured", "line 29, its second era word lands (voice onset 53.904, strength 0.93): 0.02 s after the crossing on beat 116"],
    // ---- verse 2 (06_verse2): the four nouns. Measured (session 3): the brief's values (75.1 / 78.8 / 82.5 / 86.2, all on
    //      beat 3 of the bar) are the LAST syllable of each noun; the noun BEGINS about a beat earlier, where the voice's
    //      energy comes up (no single strong onset there, so check these by ear first). The plate cuts in where the noun
    //      begins: that time SNAPPED TO THE HALF-BEAT GRID, so the cut stays on the grid whatever is entered here.
    nounEggplant: [74.66, "measured", "line 44: the noun begins (voice energy rises 74.65-74.69). The plate cuts in: beat 161"],
    nounEggplantEnd: [75.07, "measured", "its last syllable, the strongest onset of the line (75.070, strength 0.90; brief: 75.1): the characters have settled"],
    nounTomato: [78.36, "measured", "line 47: the noun begins (voice energy rises at 78.36, eight beats after the eggplant). The plate cuts in: beat 169"],
    nounTomatoEnd: [78.8, "initial", "its last syllable (only weak onsets, 78.80 and 78.83): the characters have settled"],
    nounTabby: [82.04, "measured", "line 50: the two-word noun begins (voice energy rises at 82.04; brief: 82.04). The plate cuts in: beat 177"],
    nounCat: [82.48, "measured", "line 50, its last word: the ears pop up (consonant burst at 82.477 in the high band, strength 1.0; brief: 82.50)"],
    nounGod: [86.19, "initial", "line 53, the noun: the sun behind her (measured: a burst at 86.05, the vowel coming up at 86.29; beat 186 lies between them)"],
    // ---- pre-chorus 2 (07_pre2): ten isolated drum hits, then no drums until 103.26
    drumD1: [91.05, "audit", "the pointer comes down on the second cell and HOLDS it (the picture does not change yet)"],
    drumD2: [91.98, "audit", "the aftershock of the second letter: the gender plate shudders once"],
    drumD3: [94.93, "audit", "the sun at its highest"],
    drumD4: [95.63, "audit", "pressed to the end: dusk"],
    drumD5: [96.31, "audit", "cut into the letters"],
    drumD6: [97.5, "audit", "the pointer takes the switch"],
    drumD7: [97.97, "audit", "the push on the switch BEGINS (it is at the top on letterS)"],
    drumD8: [99.35, "audit", "the soft letter lies on the ground: the end of its sag"],
    drumD9: [100.04, "audit", "Loop: on"],
    drumD10: [100.28, "audit", "Done"],
    riseStart: [103.26, "audit", "the rising sound before chorus 2: the pointer clicks into the composer"],
    //      the letters that are named in the lyric: each fills in when it is sung. Lines 57 and 61 are one phrase 16 beats
    //      apart: the letters fall on beats 1 and 3 of the bar, and a drum follows the second letter half a beat later.
    //      In these two lines the VOICE is the event (a letter appears, fills, hits); the drums are for the hand getting
    //      ready and for the aftershock. These four are the times to correct by ear (fix round).
    letterF: [90.8, "analysis", "line 57, its first letter (= bar 49, beat 196). The gender plate cuts in on that bar line; the letter stands solid from the cut, or from this time if it is later"],
    letterM57: [91.72, "analysis", "line 57, its second letter (= beat 198): the held cell is let go, the bust becomes boy_bust, the letter is printed. Less certain than the other three: the other candidate is 91.48"],
    letterAM: [94.52, "measured", "line 59 (onset 94.517, strength 0.79; brief: 94.50)"],
    letterPM: [95.19, "measured", "line 59 (onset 95.190, strength 0.82; brief: 95.16)"],
    letterS: [98.19, "analysis", "line 61, its first letter (= bar 53, beat 212): the switch is at the top, the heavy letter is printed, the sheet jolts and is a step lighter"],
    letterM61: [99.1, "analysis", "line 61, its second letter (= beat 214): the switch is at the bottom, the light letter is printed and starts to sag. (The old letterM, 98.87, was the consonant of the word before it)"],
    //      line 63, the same word twice: each time the word begins on a consonant burst and its vowel comes up 0.28 s later
    tranceWordA: [101.59, "measured", "line 63, the word the first time (high-band burst 101.591)"],
    tranceA: [101.87, "measured", "its vowel (energy rises 101.86-101.88): the three plates take one step"],
    tranceWordB: [102.52, "measured", "the second time (burst 102.520)"],
    tranceB: [102.81, "measured", "its vowel (energy rises at 102.81): a second step"],
    // ---- the last shout before the last chorus (11_count): on the grid, checked against the audit's onsets
    lastSyl1: [161.88, "audit", "beat 350"],
    lastSyl2: [162.11, "audit", "beat 350.5"],
    lastSyl3: [162.34, "audit", "beat 351"],
    lastSyl4: [162.57, "audit", "beat 351.5: her eye"],
    // ---- the four LOVE lines (12_outro): three syllables each. Checked against the audio (session 2): in all four lines
    //      the syllables come about half a beat apart, not one per beat, so the third never falls on a cut and the cuts
    //      stay at 180.81 / 184.50 / 188.42. The voice's onsets are dense here: only the strong ones are 'measured'.
    love1a: [179.93, "initial", "line 118"],
    love1b: [180.16, "initial", ""],
    love1c: [180.39, "initial", ""],
    love2a: [183.65, "initial", "line 121 (a strong onset at 183.58 sits exactly on beat 397: taken for the kick, not the voice)"],
    love2b: [183.91, "measured", "onset 183.905, strength 0.77 (brief: 183.88)"],
    love2c: [184.11, "initial", ""],
    love3a: [187.73, "measured", "line 123 (onset 187.725, strength 0.85; brief: 187.67)"],
    love3b: [187.89, "measured", "onset 187.890, strength 0.76"],
    love3c: [188.08, "measured", "onset 188.082, strength 0.91 (brief: 188.13)"],
    love4a: [191.36, "initial", "line 127: black and orange plates"],
    love4b: [191.63, "measured", "the cream plate; everything registers (onset 191.628, strength 0.79; brief: 191.66)"],
    love4c: [192.05, "initial", "the word is whole; brightest frame of the film"],
    // ---- the ending (13_shutdown)
    voiceEnds: [193.15, "measured", "the held note is over: vocal-band energy falls from 38 dB to the 20 dB floor of the instruments between 192.3 and 193.2 (the LRC line runs to 195.36)"],
    heartZero: [194.65, "measured", "the heart count pops under the picture: 0 (an onset at 194.653, strength 0.97)"],
    lastUnread: [195.13, "measured", "the system log line (an onset at 195.135, strength 0.94; brief: 195.11)"],
    loveDel1: [197.65, "initial", "the value of love deleted in three strokes"],
    loveDel2: [197.89, "measured", "onset 197.886, strength 1.00"],
    loveDel3: [198.11, "initial", ""],
    loveUndefined: [198.35, "measured", "back to undefined (onset 198.351, strength 1.00)"],
    endSyl1: [205.75, "measured", "the last shout, four blocks (onset 205.746, strength 1.00)"],
    endSyl2: [205.96, "initial", ""],
    endSyl3: [206.19, "initial", "Enter; the spark"],
    endSyl4: [206.45, "measured", "onset 206.449, strength 0.88"]
  };
  function cue(name) {
    const c = CUES[name];
    if (!c) throw new Error(`cues.js: no cue named "${name}"`);
    return c[0];
  }
  __name(cue, "cue");

  // nyan-source:src/components/plate.js
  var FULL = { x: 0, y: 0, w: 1920, h: 1080 };
  var grainTile = null;
  function grain() {
    if (grainTile) return grainTile;
    const S = 384, c = new OffscreenCanvas(8, 8);
    c.width = c.height = S;
    const g = c.getContext("2d"), im = g.createImageData(S, S), d = im.data;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = y * S + x, v = rand(611, x, y), fibre = rand(613, x >> 3, y) > 0.86 ? 0.5 : 0;
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v > 0.5 ? 255 : 0;
      d[i * 4 + 3] = Math.round(255 * clamp(Math.abs(v - 0.5) * 1.5 + fibre * rand(617, x, y)));
    }
    g.putImageData(im, 0, 0);
    return grainTile = c;
  }
  __name(grain, "grain");
  function marks(ctx, { r = FULL, inset = 34, len = 30, color = "mute", alpha = 0.7, width = 2, k = 1, target: target2 = true } = {}) {
    if (!(alpha > 3e-3) || k <= 0) return;
    const x0 = r.x + inset, y0 = r.y + inset, x1 = r.x + r.w - inset, y1 = r.y + r.h - inset, l = len * clamp(k), o = { color, alpha, width };
    for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x1, y1, -1, -1], [x0, y1, 1, -1]]) {
      ctx.line(x, y + sy * 8, x, y + sy * (8 + l), o);
      ctx.line(x + sx * 8, y, x + sx * (8 + l), y, o);
    }
    if (target2) {
      const cx = r.x + r.w / 2, cy = y1 - 4;
      ctx.circle(cx, cy, 9, { color, alpha, width: 1.5 });
      ctx.line(cx - 16, cy, cx + 16, cy, { color, alpha, width: 1.5 });
      ctx.line(cx, cy - 16, cx, cy + 16, { color, alpha, width: 1.5 });
    }
  }
  __name(marks, "marks");
  function ground(ctx, { tone = "panel", light = [960, 520, 620, "raised", 1], dots: dots2 = 1, grain: gr = 1, marks: mk2 = true, r = FULL } = {}) {
    const g = ctx.g;
    ctx.rect(r.x - 400, r.y - 400, r.w + 800, r.h + 800, { fill: true, color: tone });
    if (light) {
      const [x, y, rad, role = "raised", a = 1] = light;
      ctx.circle(x, y, rad, { fill: true, color: role, alpha: 0.5 * a });
      ctx.circle(x, y, rad * 0.62, { fill: true, color: role, alpha: 0.5 * a });
    }
    if (dots2 > 0) {
      g.fillStyle = ctx.col("line", 0.5 * dots2);
      g.beginPath();
      for (let j = 0, y = r.y + 12; y < r.y + r.h; y += 24, j++) {
        const rad = 1.1 + 1.5 * ((y - r.y) / r.h);
        for (let x = r.x + 12 + j % 2 * 12; x < r.x + r.w; x += 24) {
          g.moveTo(x + rad, y);
          g.arc(x, y, rad, 0, 6.2832);
        }
      }
      g.fill();
    }
    if (gr > 0) {
      const pat = g.createPattern(grain(), "repeat"), a0 = g.globalAlpha;
      pat.setTransform(new DOMMatrix().scale(0.5));
      g.globalAlpha = a0 * 0.085 * gr;
      g.fillStyle = pat;
      g.fillRect(r.x, r.y, r.w, r.h);
      g.globalAlpha = a0;
    }
    if (mk2) marks(ctx, { r, ...typeof mk2 === "object" ? mk2 : null });
  }
  __name(ground, "ground");
  function band(ctx, lines, t, { x = 120, y = 1e3, size = 56, color = "me", align = "left", plate: plate2 = true, maxW = 1680 } = {}) {
    const ln = lines.find((l) => t >= l.at && t < l.until);
    if (!ln) return;
    const o = { size, weight: 400, font: "serif" }, str = ln.n == null ? ln.text : ln.text.slice(0, ln.n);
    const s = Math.min(size, ctx.fit(ln.text, maxW, { font: "serif", weight: 400, maxSize: size })), w = ctx.measure(ln.text, { ...o, size: s });
    const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    if (plate2) ctx.rect(x0 - 26, y - s * 0.98, w + 52, s * 1.36, { fill: true, color: "panel", alpha: 0.86 });
    ctx.text(str, x0, y, { ...o, size: s, color });
  }
  __name(band, "band");
  function keyword(ctx, str, t, { x = 960, y = 540, maxW = 1700, maxSize = 300, size = null, align = "center", at = -1e9, step = 0, parts = null, color = "me", shade = "bg", off = [10, 10], hollow = 0, font = "serif", weight = 900, spacingEm = 0.01, stroke = 0 } = {}) {
    const s = size ?? ctx.fit(str, maxW, { font, weight, spacingEm, maxSize }), sp = spacingEm * s, o = { size: s, weight, font };
    const w = ctx.measure(str, { ...o, spacing: sp }) - sp, x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    const landed = /* @__PURE__ */ __name((i) => parts ? parts.find(([a, z]) => i >= a && i < z)?.[2] ?? at : at + i * step, "landed");
    for (const pass of off && (off[0] || off[1]) ? [1, 0] : [0]) {
      for (let i = 0; i < str.length; i++) {
        if (str[i] === " ") continue;
        const cx = x0 + ctx.measure(str.slice(0, i + 1), o) + i * sp - ctx.measure(str[i], o) / 2, on = t >= landed(i);
        const px = cx + (pass ? off[0] : 0), py = y + (pass ? off[1] : 0);
        if (on) {
          const k = easeOut(prog(t, landed(i), landed(i) + 0.07));
          ctx.at(px, py, () => ctx.text(str[i], 0, 0, { ...o, align: "center", color: pass ? shade : color, stroke }), { scale: 1.08 - 0.08 * k });
        } else if (hollow > 0 && !pass) ctx.text(str[i], px, py, { ...o, align: "center", color, stroke: Math.max(2, s * 0.012), alpha: hollow });
      }
    }
    return { x: x0, y, w, size: s };
  }
  __name(keyword, "keyword");
  function dashedRing(ctx, x, y, r, { w = 0, h = 0, color = "mute", width = 4, dash = 18, alpha = 1 } = {}) {
    const g = ctx.g;
    g.setLineDash([dash, dash * 0.8]);
    if (w && h) ctx.rrect(x - w / 2, y - h / 2, w, h, r, { fill: null, stroke: color, width, alpha });
    else ctx.circle(x, y, r, { color, width, alpha });
    g.setLineDash([]);
  }
  __name(dashedRing, "dashedRing");

  // nyan-source:src/scenes/history.js
  var rect = /* @__PURE__ */ __name((x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], "rect");
  var disc = /* @__PURE__ */ __name((x, y, r, n = 20) => Array.from({ length: n }, (_, i) => [x + r * Math.cos(i / n * 6.2832), y + r * Math.sin(i / n * 6.2832)]), "disc");
  var ERAS = [
    {
      name: "towers",
      x: -520,
      w: 680,
      parts: [
        ["k", [[-330, 0], [-330, -40], [-300, -40], [-300, -300], [-150, -300], [-150, -60], [-140, -60], [-140, -430], [-110, -430], [-110, -470], [-62, -470], [-62, -548], [-48, -548], [-48, -470], [10, -470], [10, -430], [40, -430], [40, -60], [60, -60], [60, -250], [190, -250], [190, -60], [200, -60], [200, -320], [310, -384], [310, -40], [330, -40], [330, 0]]],
        ["c", rect(-112, -410, 44, 300)],
        ["c", rect(-276, -272, 102, 34)],
        ["c", rect(-276, -204, 102, 34)],
        ["c", rect(84, -222, 82, 112)],
        ["o", [[200, -320], [310, -384], [310, -330], [200, -266]]],
        ["o", rect(-62, -548, 14, 78)]
      ]
    },
    {
      name: "spires",
      x: -1410,
      w: 620,
      parts: [
        ["k", [[-300, 0], [-300, -40], [-262, -40], [-262, -190], [-232, -190], [-232, -330], [-181, -530], [-130, -330], [-130, -214], [0, -272], [130, -214], [130, -330], [181, -530], [232, -330], [232, -190], [262, -190], [262, -40], [300, -40], [300, 0]]],
        ["c", disc(0, -150, 46)],
        ["c", [[-34, 0], [-34, -74], [0, -104], [34, -74], [34, 0]]],
        ["o", [[-206, -430], [-181, -530], [-156, -430]]],
        ["o", [[156, -430], [181, -530], [206, -430]]]
      ]
    },
    {
      name: "colonnade",
      x: -2340,
      w: 740,
      parts: [
        ["k", [[-370, 0], [-370, -30], [-334, -30], [-334, -250], [-352, -250], [-352, -292], [0, -404], [352, -292], [352, -250], [334, -250], [334, -30], [370, -30], [370, 0]]],
        ...[-264, -132, 0, 132, 264].map((x) => ["c", rect(x - 31, -250, 62, 220)]),
        ["o", [[-246, -294], [0, -372], [246, -294]]]
      ]
    },
    {
      name: "stepped temple",
      x: -3320,
      w: 700,
      parts: [
        ["k", [[-350, 0], [-350, -110], [-236, -110], [-236, -212], [-128, -212], [-128, -300], [128, -300], [128, -212], [236, -212], [236, -110], [350, -110], [350, 0]]],
        ["c", [[-30, 0], [-30, -300], [30, -300], [30, 0]]],
        // the stair up its middle
        ["o", rect(-128, -300, 256, 26)]
      ]
    },
    {
      name: "pyramids",
      x: -5798,
      w: 1040,
      parts: [
        ["k", [[-580, 0], [-372, -236], [-164, 0]]],
        ["c", [[-372, -236], [-164, 0], [-330, 0]]],
        ["k", [[236, 0], [352, -138], [468, 0]]],
        ["c", [[352, -138], [468, 0], [376, 0]]],
        ["k", [[-306, 0], [0, -346], [306, 0]]],
        ["c", [[0, -346], [306, 0], [62, 0]]],
        ["o", [[-34, -308], [0, -346], [34, -308], [7, -308]]]
      ]
    }
  ];
  var SPAN = [-6800, 0];
  var STOPS = [0, -100, -980, -1840, -2840, -3800, -5200];
  var ERA_LINE = STOPS[4];
  var ROOFS;
  function initHistory() {
    ROOFS = (() => {
      const foot2 = ERAS.map((e) => {
        const xs = e.parts.filter(([ink]) => ink === "k").flatMap(([, pts]) => pts.map(([x]) => x + e.x));
        return [Math.min(...xs) - 6, Math.max(...xs) + 6];
      });
      const top = [];
      const put = /* @__PURE__ */ __name((xa, xb, h) => {
        if (xb - xa > 1) top.push([xa, -h], [xb, -h]);
      }, "put");
      for (let x = SPAN[0], i = 0; x < SPAN[1]; i++) {
        const w = 170 + 190 * rand(4411, i), h = 18 + 40 * rand(4412, i), xb = Math.min(SPAN[1], x + w);
        let at = x;
        for (const [fa, fb] of foot2.filter(([fa2, fb2]) => fb2 > x && fa2 < xb).sort((p, q) => p[0] - q[0])) {
          put(at, Math.max(at, fa), h);
          put(Math.max(at, fa), Math.min(xb, fb), 0);
          at = Math.min(xb, fb);
        }
        put(at, xb, h);
        x = xb;
      }
      return [[SPAN[0], 0], ...top, [SPAN[1], 0]];
    })();
  }
  __name(initHistory, "initHistory");
  function strip(ctx, scroll, gy, mode, { scale = 1, alpha = 1, from = -60, to = 1980, dark = "panel", edge = "sub", width = 3 } = {}) {
    if (!(alpha > 3e-3)) return;
    const at = /* @__PURE__ */ __name((ox) => (pts) => pts.map(([x, y]) => [scroll + (x + ox) * scale, gy + y * scale]), "at");
    if (mode !== "ink") {
      const p = at(0)(ROOFS.filter(([x]) => scroll + x * scale > from - 400 && scroll + x * scale < to + 400));
      if (p.length > 2) {
        if (mode === "dark") ctx.poly([[p[0][0], gy], ...p, [p[p.length - 1][0], gy]], { close: true, fill: true, color: dark, alpha });
        else ctx.poly(p, { color: edge, width, alpha });
      }
    }
    for (const era of ERAS) {
      const ox = scroll + era.x * scale, half2 = (era.w / 2 + 80) * scale;
      if (ox + half2 < from || ox - half2 > to) continue;
      const put = at(era.x);
      for (const [ink, pts] of era.parts) {
        if (mode === "hollow") {
          if (ink === "k") ctx.poly(put(pts), { close: true, color: edge, width, alpha });
        } else if (mode === "dark") {
          if (ink === "k") ctx.poly(put(pts), { close: true, fill: true, color: dark, alpha });
        } else ctx.poly(put(pts), { close: true, fill: true, color: ink === "k" ? dark : ink === "c" ? "text" : "me", alpha });
      }
    }
  }
  __name(strip, "strip");

  // nyan-source:src/scenes/04_pre1.js
  var TAU4 = Math.PI * 2;
  var WIDE = 1.4;
  var FALLBACK_ROWS = [
    { label: "Current", values: ["AC", "DC"], line: 25 },
    { label: "Vision", values: ["on", "off"], line: 26 },
    { label: "Knowledge date", values: ["A.D. 2026", "A.D. 1", "3000 B.C."], line: 29 },
    { label: "Shared memory", values: ["off", "on"], line: 30 },
    { label: "Context depth", values: ["shallow", "deep", "deepest"], line: 31 }
  ];
  function pre1Shots(env) {
    const { script, lyrics } = env, { T, H, B, Bt, P, text } = cues(env);
    const b = /* @__PURE__ */ __name((n) => Bt(96 + n), "b");
    const beat = /* @__PURE__ */ __name((id) => ((script.sections ?? []).find((s) => s.n === 4)?.beats ?? []).find((x) => x.id === id) ?? {}, "beat");
    const ROWS = (script.settings_rows?.section4 ?? []).length >= 5 ? script.settings_rows.section4 : FALLBACK_ROWS;
    const UI = { settings: beat("drawer-opens").ui?.[0] ?? "Settings", done: beat("depth-maxed").ui?.[0] ?? "Done", blind: beat("vision-off").system?.[0] ?? "image input: none" };
    const ROW_LINES = [[24, 25], [26, 27], [28, 29], [30, 30], [31, 31]];
    const ERA = text(29).split(" ").filter((w) => /[A-Z]\.[A-Z]/.test(w));
    const VAL = ROWS[2].values, Y_AD = +(VAL[0].match(/\d+/) ?? [2026])[0], Y_BC = +(VAL[2].match(/\d+/) ?? [3e3])[0];
    const tSet = b(0.5), tAC = b(3), tDC = b(5);
    const tOff = B(26), tOn1 = b(11), tOff2 = b(12), tOn2 = b(13), tOff3 = b(13.5), tOn3 = b(14);
    const QUICK = 0.12;
    const tGrab = B(28), tCross = b(20), tEnd = b(22), tDrop = b(22.25);
    const tShare = B(30), tHold = b(26.5), tDone = b(31), END = B(32);
    const flick = /* @__PURE__ */ __name((t, at, d = 0.16) => easeOut(prog(t, at, at + d)), "flick");
    const ramp = /* @__PURE__ */ __name((t, at, d = 0.2) => easeInOut(prog(t, at, at + d)), "ramp");
    const drawerK = /* @__PURE__ */ __name((t) => easeOut(prog(t, tSet + 0.02, tSet + 0.42)) * (1 - easeInOut(prog(t, tDone + 0.1, tDone + 0.5))), "drawerK");
    const segPos = /* @__PURE__ */ __name((t) => flick(t, tDC), "segPos");
    const vision = /* @__PURE__ */ __name((t) => 1 - flick(t, tOff) + flick(t, tOn1) - flick(t, tOff2) + flick(t, tOn2, QUICK) - flick(t, tOff3, QUICK) + flick(t, tOn3, QUICK), "vision");
    const blind = /* @__PURE__ */ __name((t) => ramp(t, tOff) - ramp(t, tOn1) + ramp(t, tOff2) - ramp(t, tOn2, QUICK) + ramp(t, tOff3, QUICK) - ramp(t, tOn3, QUICK), "blind");
    const YEAR = [Y_AD, Y_AD - 26, 1500, 700, 0, -Y_BC / 2, -Y_BC];
    const pull = /* @__PURE__ */ __name((t) => {
      const x = clamp((t - tGrab) / P, 0, 6 - 1e-9), i = Math.floor(x), p = x - i;
      return [i, p, 0.8 * (1 - (1 - p) ** 3) + 0.2 * p];
    }, "pull");
    const along2 = /* @__PURE__ */ __name((arr, t) => {
      const [i, , q] = pull(t);
      return lerp(arr[i], arr[i + 1], q);
    }, "along");
    const yearAt = /* @__PURE__ */ __name((t) => along2(YEAR, t), "yearAt");
    const dateU = /* @__PURE__ */ __name((t) => {
      const y = yearAt(t);
      return 0.5 + 0.5 * (y >= 0 ? y / Y_AD : y / Y_BC);
    }, "dateU");
    const bandK = /* @__PURE__ */ __name((t) => easeOut(prog(t, tGrab, tGrab + 0.24)) * (1 - easeInOut(prog(t, tDrop + 0.04, tDrop + 0.36))), "bandK");
    const shared = /* @__PURE__ */ __name((t) => flick(t, tShare, 0.2), "shared");
    const depth = /* @__PURE__ */ __name((t) => 0.5 * easeOut(prog(t, tHold + 0.03, b(27.1))) + 0.5 * easeInOut(prog(t, b(28.1), b(29))), "depth");
    const push = /* @__PURE__ */ __name((t) => pulse(t - b(30), 7) + pulse(t - b(30.5), 7), "push");
    const readout = /* @__PURE__ */ __name((u) => u >= 0.5 ? VAL[0].replace(/\d+/, String(Math.max(1, Math.round(1 + (u - 0.5) / 0.5 * (Y_AD - 1))))) : VAL[2].replace(/\d+/, String(Math.max(1, Math.round(1 + (0.5 - u) / 0.5 * (Y_BC - 1))))), "readout");
    const L0 = chatLayout({ side: 0 }), LO = chatLayout({ side: 0, drawer: WIDE });
    const DW = LO.drawer.w, RX0 = LO.drawer.x + 34, RX1 = LO.drawer.x + DW - 34;
    const ROW_Y = [170, 292, 414, 586, 708], ROW_H = [122, 122, 172, 122, 172];
    const rowAt = /* @__PURE__ */ __name((i, dx = LO.drawer.x) => ({ x: dx + 34, y: ROW_Y[i], w: DW - 68, h: ROW_H[i] }), "rowAt");
    const A = {
      // where the cursor has to be
      set: [L0.head.x + L0.head.w - 176, L0.head.y + 33],
      ac: [RX1 - 172, ROW_Y[0] + 61],
      dc: [RX1 - 58, ROW_Y[0] + 61],
      vis: [RX1 - 52, ROW_Y[1] + 61],
      date: /* @__PURE__ */ __name((u) => [RX0 + 12 + (DW - 92) * u, ROW_Y[2] + 128], "date"),
      share: [RX1 - 52, ROW_Y[3] + 61]
    };
    const ACT = [[[2.4, 6.4]], [[6.7, 14.7]], [[14.8, 22.4]], [[22.7, 26.2]], [[26.2, 31]]];
    const active = /* @__PURE__ */ __name((i, t) => Math.max(0, ...ACT[i].map(([a, z]) => window01(t, b(a), b(z), 0.14, 0.14))), "active");
    const screen = /* @__PURE__ */ __name((ctx, fn) => {
      const g = ctx.g;
      g.save();
      g.setTransform(ctx.scale, 0, 0, ctx.scale, 0, 0);
      fn();
      g.restore();
      ctx._font = "";
    }, "screen");
    let scratch = null;
    function mosaic(ctx, cell) {
      if (cell < 2) return;
      const g = ctx.g, c = ctx.canvas, px = cell * ctx.scale, w = Math.ceil(c.width / px), h = Math.ceil(c.height / px);
      scratch ??= new OffscreenCanvas(8, 8);
      if (scratch.width !== w || scratch.height !== h) {
        scratch.width = w;
        scratch.height = h;
      }
      const sg = scratch.getContext("2d");
      sg.imageSmoothingEnabled = true;
      sg.imageSmoothingQuality = "high";
      sg.globalCompositeOperation = "copy";
      sg.drawImage(c, 0, 0, w * px, h * px, 0, 0, w, h);
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.imageSmoothingEnabled = false;
      g.drawImage(scratch, 0, 0, w, h, 0, 0, w * px, h * px);
      g.restore();
      ctx._font = "";
    }
    __name(mosaic, "mosaic");
    function cur(ctx, way, t, { scale = 1.5, kind = "arrow", fast = 700, n = 6, dt = 0.011, strength = 0.45 } = {}) {
      const now = cursorAt(way, t), was = cursorAt(way, t - 0.03), sc = sinceClick(way, t);
      if (sc < 0.45) {
        const at = way.filter((w) => w.click && t >= w.t).pop();
        burst(ctx, at.x, at.y, 34 * scale, sc / 0.45, { color: "text" });
      }
      ctx.trail(Math.hypot(now[0] - was[0], now[1] - was[1]) / 0.03 > fast ? n : 0, dt, (tau) => {
        const p = cursorAt(way, t - tau);
        pointer(ctx, p[0], p[1], { kind, scale, down: sc < 0.12 ? 1 : 0 });
      }, strength);
      return now;
    }
    __name(cur, "cur");
    function say(ctx, i, t, x, y, { size = 52, out = Infinity, alpha = 1, color = "me" } = {}) {
      const t0 = T(i);
      if (t < t0) return;
      const str = text(i), n = lyrics.typed(i, t).n, o = { size, weight: 400, font: "serif" };
      const gone = Number.isFinite(out) ? prog(t, out - 0.14, out + 0.04) : 0, a = alpha * (1 - gone), dy = -0.55 * size * easeIn(gone) + 0.3 * size * (1 - easeOut(prog(t, t0, t0 + 0.2)));
      if (a <= 3e-3) return;
      ctx.text(str.slice(0, n), x, y + dy, { ...o, color, alpha: a });
      if (n < str.length) ctx.circle(x + ctx.measure(str.slice(0, n), o) + size * 0.3, y + dy - size * 0.28, size * 0.16, { fill: true, color, alpha: a });
    }
    __name(say, "say");
    function hintOf(i, t) {
      const [a, z] = ROW_LINES[i];
      let now = -1;
      for (let l = a; l <= z; l++) if (t >= T(l)) now = l;
      if (now < 0) return null;
      if (t < lyrics.end(now)) return { line: now, live: true };
      const keep = ROWS[i].line;
      return { line: keep >= a && keep <= z ? keep : z, live: false };
    }
    __name(hintOf, "hintOf");
    function hint(ctx, i, t, x, y, size = 24) {
      const h = hintOf(i, t);
      if (!h) return;
      const str = text(h.line), n = h.live ? lyrics.typed(h.line, t).n : str.length;
      ctx.text(str.slice(0, n), x, y, { size, font: "serif", color: "me", alpha: h.live ? 1 : 0.55 });
    }
    __name(hint, "hint");
    function seg(ctx, r, opts, t) {
      const on = flick(t, tAC, 0.14), pos = segPos(t), w = r.w / 2, stretch = Math.sin(Math.PI * clamp(pos));
      ctx.rrect(r.x, r.y, r.w, r.h, r.h / 2, { fill: "bg", stroke: "line" });
      if (on > 0) ctx.rrect(r.x + pos * w + 5 - stretch * 8, r.y + 5, w - 10 + stretch * 16, r.h - 10, r.h / 2, { fill: "me", alpha: on, shadow: 0.3 });
      opts.forEach((o, i) => ctx.text(o, r.x + (i + 0.5) * w, r.y + r.h / 2 + 9, { size: 26, weight: 700, align: "center", color: on * clamp(1 - Math.abs(pos - i)) > 0.5 ? "bg" : "sub" }));
    }
    __name(seg, "seg");
    function dateTrack(ctx, r, t) {
      const xa = r.x + 12, xb = r.x + r.w - 12, y = r.y + 128, kx = lerp(xa, xb, dateU(t));
      ctx.rrect(xa, y - 3, xb - xa, 6, 3, { fill: "line" });
      ctx.rrect(xa, y - 3, kx - xa, 6, 3, { fill: "me" });
      ctx.line((xa + xb) / 2, y - 13, (xa + xb) / 2, y + 13, { color: "sub", width: 2 });
      ctx.text(VAL[2], xa - 4, y + 36, { size: 20, color: "mute" });
      ctx.text(VAL[0], xb + 4, y + 36, { size: 20, color: "mute", align: "right" });
      if (t < tGrab || t > tDrop + 0.36) {
        ctx.circle(kx, y, 21, { fill: true, color: "panel" });
        ctx.glow("me", 12, () => spark(ctx, kx, y, 18, { rot: kx / 40 }), 0.5);
      }
    }
    __name(dateTrack, "dateTrack");
    function depthTrack(ctx, r, t) {
      const xa = r.x + 12, xb = r.x + r.w - 12, y = r.y + 128, d = depth(t), kx = lerp(xa, xb, d), names = ROWS[4].values;
      ctx.rrect(xa, y - 3, xb - xa, 6, 3, { fill: "line" });
      ctx.rrect(xa, y - 3, kx - xa, 6, 3, { fill: "me" });
      names.forEach((s, i) => ctx.text(s, lerp(xa - 4, xb + 4, i / 2), y + 36, { size: 20, color: Math.round(d * 2) === i ? "sub" : "mute", align: ["left", "center", "right"][i] }));
      ctx.circle(kx, y, 15, { fill: true, color: "text" });
    }
    __name(depthTrack, "depthTrack");
    function drawerPanel(ctx, L2, t, { skipHint = -1 } = {}) {
      const d = L2.drawer;
      if (d.w < 4) return;
      ctx.clip(d, () => {
        const dx = d.x, x0 = dx + 34, x1 = dx + DW - 34, h = enter(t, tSet + 0.08, 0, { dur: 0.3, rise: 14 });
        ctx.text(UI.settings, x0, d.y + 66 + h.dy, { size: 32, weight: 600, color: "text", alpha: h.a });
        iconButton(ctx, x1 - 19, d.y + 54, "close", { r: 19, alpha: h.a });
        ctx.line(dx, d.y + 104, dx + DW, d.y + 104, { color: "line", width: 1.5, alpha: h.a });
        ROWS.slice(0, 5).forEach((row, i) => {
          const r = rowAt(i, dx), e2 = enter(t, tSet + 0.14, i, { step: 0.07, dur: 0.36 });
          if (e2.a <= 0) return;
          ctx.at((1 - e2.k) * 70, 0, () => {
            const act = active(i, t);
            if (act > 0) ctx.rrect(r.x - 16, r.y + 6, r.w + 32, r.h - 12, 16, { fill: "raised", alpha: act });
            ctx.text(row.label, r.x, r.y + 52, { size: 30, weight: 500, color: "text" });
            if (i !== skipHint) hint(ctx, i, t, r.x, r.y + 92);
            ctx.line(r.x, r.y + r.h, r.x + r.w, r.y + r.h, { color: "line", alpha: 0.7, width: 1 });
            if (i === 0) seg(ctx, { x: r.x + r.w - 230, y: r.y + 31, w: 230, h: 60 }, row.values, t);
            if (i === 1) toggle(ctx, r.x + r.w - 104, r.y + 33, vision(t), { w: 104, h: 56 });
            if (i === 3) toggle(ctx, r.x + r.w - 104, r.y + 33, shared(t), { w: 104, h: 56 });
            if (i === 2) {
              ctx.text(readout(dateU(t)), r.x + r.w, r.y + 52, { size: 24, weight: 600, color: "sub", align: "right" });
              dateTrack(ctx, r, t);
            }
            if (i === 4) {
              ctx.text(row.values[Math.round(depth(t) * 2)], r.x + r.w, r.y + 52, { size: 24, weight: 600, color: "sub", align: "right" });
              depthTrack(ctx, r, t);
            }
          }, { alpha: e2.a });
        });
        const e = enter(t, tSet + 0.14, 5, { step: 0.07, dur: 0.36 }), press = pulse(t - tDone, 9);
        ctx.rrect(x1 - 150, 908, 150, 60, 30, { fill: press > 0.3 ? "line" : "raised", stroke: "line", alpha: e.a });
        ctx.text(UI.done, x1 - 75, 947, { size: 24, weight: 600, align: "center", color: "text", alpha: e.a });
      });
    }
    __name(drawerPanel, "drawerPanel");
    const thV1 = /* @__PURE__ */ __name((t) => -Math.PI / 2 + TAU4 / (4 * P) * (T(17) - T(16)) + TAU4 + TAU4 / (2 * P) * (t - H(18)), "thV1");
    const RUN = T(23) - H(21);
    function figure2(ctx, t, x1) {
      const x0 = 190, yL = 400, base = 690, yAx = 780, mid = 592, w = x1 - x0;
      const lift = easeInOut(prog(t, tAC, tAC + 0.4)), th = thV1(t), ph = TAU4 * 1.2 * (t - tAC);
      const amp = 104 * flick(t, tAC, 0.3) * (1 - easeBack(prog(t, tDC, tDC + 0.45)));
      const yAt = /* @__PURE__ */ __name((x) => {
        const u = (x - x0) / w;
        return lerp(base - (base - yL - 16) * (1 - Math.exp(-u * 4.2)) + 12.8 * Math.exp(-u * 5) * Math.sin(th - TAU4 / 520 * (x - x0)), mid, lift) + amp * Math.sin(ph - TAU4 / 290 * (x - x0));
      }, "yAt");
      ctx.line(x0, yAx, x1, yAx, { color: "sub", width: 1.5 });
      ctx.line(x0, yAx, x0, yL - 50, { color: "sub", width: 1.5 });
      const old = 1 - prog(t, B(24) + 0.1, B(24) + 0.5);
      for (let i = 0; i < 9; i++) {
        const x = lerp(x0, x1, (i + 1) / 9.5);
        ctx.line(x, yAx, x, yAx + 10, { color: "sub", width: 1.5 });
        ctx.text(`1e${Math.floor(RUN * 6) + i * 3}`, x, yAx + 34, { size: 18, font: "mono", color: "mute", align: "center", alpha: old });
      }
      ctx.glow("text", 16, () => ctx.line(x0, yL, x1, yL, { color: "text", width: 3 + 3 * old }), 0.5 * old);
      const word2 = text(23), step = (w - 60) / word2.length, size = Math.min(96, step * 0.92);
      for (let i = 0; i < word2.length; i++) {
        const k = easeIn(prog(t, B(24) + 0.06 + i * 0.022, B(24) + 0.34 + i * 0.022));
        ctx.text(word2[i], x0 + 30 + (i + 0.5) * step, yL - 18 - 46 * k, { size, weight: 900, font: "serif", align: "center", color: "text", alpha: 1 - k });
      }
      const curve2 = [];
      for (let x = x0; x <= x1; x += 6) curve2.push([x, yAt(x)]);
      for (let x = x0; x <= x1; x += 13) ctx.line(x, yAx, x, yAt(x), { color: "meDim", alpha: 0.3, width: 2 });
      ctx.glow("me", 14, () => ctx.poly(curve2, { color: "me", width: 5 }), 0.4);
      const xr = lerp(x0, x1, clamp(0.25 + RUN * 0.2));
      ctx.glow("me", 16, () => ctx.circle(xr, yAt(xr), 10, { fill: true, color: "meHot" }), 0.7);
      if (t >= tAC) ctx.text(`${ROWS[0].label.toLowerCase()}: ${ROWS[0].values[segPos(t) > 0.5 ? 1 : 0]}`, x1, yAx + 36, { size: 22, font: "mono", color: "sub", align: "right", alpha: flick(t, tAC, 0.2) });
    }
    __name(figure2, "figure");
    function client(ctx, t, k, opts = {}) {
      const L2 = chatLayout({ side: 0, drawer: WIDE * k });
      room(ctx, { dim: 0.42, t });
      windowFrame(ctx, L2, { glass: 0.94 });
      header(ctx, L2, { t, title: script.title ?? "", presence: "online" });
      const gx = L2.head.x + L2.head.w - 176, gy = L2.head.y + 33, ga = prog(t, B(24), B(24) + 0.16), on = k > 0.5;
      if (on) ctx.circle(gx, gy, 19, { fill: true, color: "raised", alpha: ga });
      ctx.circle(gx, gy, 19, { color: on ? "sub" : "line", width: 1.5, alpha: ga });
      for (const [dy, kx] of [[-6, 5], [6, -5]]) {
        ctx.line(gx - 10, gy + dy, gx + 10, gy + dy, { color: on ? "text" : "sub", width: 2, alpha: ga });
        ctx.circle(gx + kx, gy + dy, 3.5, { fill: true, color: on ? "text" : "sub", alpha: ga });
      }
      const G = { x: L2.win.x + 2, y: L2.head.y + L2.head.h + 2, w: L2.main.w - 4, h: L2.composer.y - L2.head.y - L2.head.h - 18 };
      ctx.clip(G, () => {
        for (let x = 0; x < 1920; x += 48) ctx.line(x, G.y, x, G.y + G.h, { color: "line", alpha: Math.round((x - 960) / 48) % 5 === 0 ? 0.5 : 0.22, width: 1 });
        for (let y = 6; y < 1080; y += 48) ctx.line(G.x, y, G.x + G.w, y, { color: "line", alpha: Math.round((y - 486) / 48) % 5 === 0 ? 0.5 : 0.22, width: 1 });
        ctx.radial(960, 486, 620, "meDim", 0.16);
        figure2(ctx, t, L2.main.x + L2.main.w - 50);
      });
      const box2 = composer(ctx, L2.composer, { placeholder: script.composer_placeholder ?? "", t, send: "idle" });
      drawerPanel(ctx, L2, t, opts);
      return { L: L2, box: box2 };
    }
    __name(client, "client");
    const cam1 = /* @__PURE__ */ __name((t) => {
      const k = easeInOut(prog(t, tSet, tSet + 1.5));
      return { zoom: 1 + 0.06 * k + 0.012 * prog(t, tAC, tOff), x: 50 * k, y: 0 };
    }, "cam1");
    const KICKS = [[tOn1, 1], [tOff2, -1], [tOn2, 1], [tOff3, -1], [tOn3, 1]];
    const cam2 = /* @__PURE__ */ __name((t) => {
      let rot2 = 0, dx = 0;
      for (const [tk, s] of KICKS) {
        const a2 = t - tk;
        if (a2 > 0) {
          const e = Math.exp(-3.2 * a2);
          rot2 += s * 0.032 * e * Math.sin(11 * a2);
          dx += s * 11 * e * Math.sin(9 * a2 + 0.6);
        }
      }
      const dz = window01(t, T(27) - 0.15, b(15.4), 0.5, 0.7), a = t - T(27);
      const pan = easeInOut(prog(t, b(14.5), b(15.8))), zoom = 2.96 * (1 + 0.025 * prog(t, tOff, tGrab));
      const kn = A.date(1), ex = kn[0] - (kn[0] - 960) / zoom, ey = kn[1] - (kn[1] - 540) / zoom;
      return { x: lerp(1492, ex, pan) - 960 + dx + 7 * dz * Math.sin(a * 2.7), y: lerp(353, ey, pan) - 540 + 4 * dz * Math.cos(a * 3.3), zoom, rot: rot2 + 0.02 * dz * Math.sin(a * 4.1) };
    }, "cam2");
    const cam3 = /* @__PURE__ */ __name((t) => ({ zoom: 1 + 0.035 * easeInOut(prog(t, tGrab, tDrop)) - 0.035 * easeInOut(prog(t, tDrop, tDrop + 0.5)) }), "cam3");
    const cam4 = /* @__PURE__ */ __name((t) => {
      const fly = easeIn(prog(t, tDone, END));
      return { zoom: 1 + 0.13 * easeOut(prog(t, tShare, tShare + 0.4)) + 0.11 * easeInOut(prog(t, tHold, b(30.6))) + 0.02 * push(t) + 1.25 * fly, y: -100 * easeInOut(prog(t, tDone, tDone + 0.6)) };
    }, "cam4");
    const BAND = { x: -40, y: 108, w: 2e3, h: 864 }, GY = 640, TY = 706, HK = 0.86;
    const KX = [1560, 1540, 1440, 1350, 1260, 1170, 1090];
    const snatch = /* @__PURE__ */ __name((t) => {
      const [, p] = pull(t);
      return t <= tGrab || t >= tEnd ? 0 : p < 0.16 ? easeOut(p / 0.16) : 1 - easeInOut((p - 0.16) / 0.84);
    }, "snatch");
    const knobX = /* @__PURE__ */ __name((t) => along2(KX, t) - 70 * snatch(t), "knobX");
    const scrollAt = /* @__PURE__ */ __name((t) => knobX(t) - along2(STOPS, t) * HK, "scrollAt");
    const speedAt = /* @__PURE__ */ __name((t) => Math.abs(scrollAt(t + 1 / 240) - scrollAt(t - 1 / 240)) * 120, "speedAt");
    const tEraA = cue("eraFirst"), tEraB = cue("eraSecond");
    function yearWheels(ctx, x, y, year, rate, { size = 150, color = "text" } = {}) {
      const cw = ctx.cw(size), H2 = size * 1.08, o = { size, font: "mono", weight: 800, color }, v = year + 1e-6;
      ctx.rrect(x - 16, y - size * 0.86 - 8, 4 * cw + 32, H2 + 16, 16, { fill: "bg", stroke: "line", width: 2 });
      for (let i = 0; i < 4; i++) {
        const unit = 10 ** (3 - i), cx = x + i * cw, low = v % unit, d = Math.floor(v / unit) % 10;
        const fast = clamp((rate / unit - 8) / 8), fr = lerp(clamp(low - (unit - 1)), low / unit, fast);
        if (i) ctx.line(cx, y - size * 0.86 - 8, cx, y - size * 0.86 + H2 + 8, { color: "line", width: 2, alpha: 0.6 });
        ctx.clip({ x: cx, y: y - size * 0.86, w: cw, h: H2 }, () => {
          for (let j = -1; j <= 2; j++) {
            const n = String(((d + j) % 10 + 10) % 10), yy = y + (j - fr) * H2;
            ctx.text(n, cx, yy, { ...o, alpha: 1 - 0.5 * fast });
            if (fast > 0) for (const dy of [-0.17, 0.17]) ctx.text(n, cx, yy + dy * H2, { ...o, alpha: 0.24 * fast });
          }
        });
      }
    }
    __name(yearWheels, "yearWheels");
    function band2(ctx, t) {
      const k = bandK(t);
      if (k <= 2e-3) return;
      const from = { ...rowAt(2), x: rowAt(2).x - 16, w: rowAt(2).w + 32 };
      const wide = t < tDrop ? easeOut(prog(t, tGrab, tGrab + 0.12)) : k;
      const r = { ...lerpRect(from, BAND, k), x: lerp(from.x, BAND.x, wide), w: lerp(from.w, BAND.w, wide) }, a = clamp(k * 3);
      ctx.rrect(r.x, r.y, r.w, r.h, 24 * (1 - k), { fill: "raised", stroke: "line", shadow: 1, alpha: a });
      ctx.clip(r, () => {
        const g = ctx.g, a0 = g.globalAlpha;
        g.globalAlpha = a0 * clamp(k * 3 - 0.4);
        const kx = knobX(t), S = scrollAt(t), v = speedAt(t), rush = clamp((v - 800) / 1200), right = BAND.x + BAND.w, top = BAND.y;
        const crossed = t >= tCross, hit = pulse(t - tCross, 6), xe = S + ERA_LINE * HK, xa = S + STOPS[6] * HK;
        ctx.gradRect(BAND.x, GY, BAND.w, BAND.y + BAND.h - GY, [[0, "panel", 0.6], [1, "panel", 0.1]]);
        ctx.clip({ x: BAND.x, y: top, w: kx - BAND.x, h: GY - top + 1 }, () => {
          ctx.gradRect(BAND.x, top, BAND.w, GY - top, [[0, "line", 0], [1, "line", 0.85]]);
          ctx.radial(kx, GY, 640, "meDim", 0.3);
          ctx.trail(v > 1400 ? 4 : v > 900 ? 2 : 0, 0.012, (tau) => strip(ctx, scrollAt(t - tau), GY, "dark", { scale: HK }), 0.42);
          strip(ctx, S, GY, "ink", { scale: HK, alpha: 1 - rush });
        });
        ctx.clip({ x: kx, y: top, w: right - kx, h: GY - top + 1 }, () => {
          ctx.rect(kx, top, right - kx, GY - top, { fill: true, color: "panel", alpha: 0.4 });
          strip(ctx, S, GY, "hollow", { scale: HK, alpha: 0.8 - 0.35 * rush });
        });
        ctx.line(kx, top + 34, kx, TY, { color: "me", width: 2, alpha: 0.5 });
        ctx.rrect(xa, TY - 3, S - xa, 6, 3, { fill: "line" });
        if (kx > xa + 1) ctx.rrect(xa, TY - 4, kx - xa, 8, 4, { fill: "me" });
        for (const x of [S, xa]) ctx.line(x, TY - 14, x, TY + 14, { color: "sub", width: 2 });
        ctx.text(VAL[0] ?? "", S + 76, TY + 8, { size: 22, font: "mono", color: "mute" });
        ctx.text(VAL[2] ?? "", xa - 76, TY + 8, { size: 22, font: "mono", color: "mute", align: "right" });
        ctx.glow("text", 22, () => ctx.line(xe, top + 62, xe, TY + 16, { color: crossed ? "text" : "sub", width: 4 + 7 * hit }), hit);
        ctx.text(VAL[1] ?? "", xe, TY + 46, { size: 22, font: "mono", color: "mute", align: "center" });
        burst(ctx, xe, TY, 120, (t - tCross) / 0.5, { color: "text" });
        burst(ctx, KX[6], TY, 84, (t - tEnd) / 0.4, { color: "me" });
        ctx.text(ROWS[2].label, 150, 176, { size: 34, weight: 500, color: "text" });
        say(ctx, 28, t, 150, 806, { size: 60, out: T(29) });
        say(ctx, 29, t, 150, 806, { size: 60 });
        const size = 150, yb = 938, o = { size, weight: 900, font: "serif" }, cw = ctx.cw(size), gap2 = 50;
        const w0 = ctx.measure(ERA[0] ?? "", o), w1 = ctx.measure(ERA[1] ?? "", o), x1 = 1790 - w1, xd = x1 - gap2 - 4 * cw, x0 = xd - gap2 - w0;
        const y = yearAt(t), rate = Math.abs(yearAt(t + 1 / 240) - yearAt(t - 1 / 240)) * 120;
        yearWheels(ctx, xd, yb + 7 * (pulse(t - tEraA, 9) + pulse(t - tEraB, 9)), Math.max(1, Math.abs(y)), rate, { size });
        const token = /* @__PURE__ */ __name((str, x, align, at, gone) => {
          if (t < at || !str) return;
          const land = prog(t, at, at + 0.13), out = gone === null ? 0 : flick(t, gone, 0.14), oo = { ...o, align };
          ctx.at(x, yb - 70 * (1 - easeIn(land)), () => {
            if (out > 0) ctx.text(str, 0, 0, { ...oo, color: "meDim", stroke: 3, alpha: out });
            if (out < 1) ctx.glow("me", 26, () => ctx.text(str, 0, 0, { ...oo, color: "me", alpha: (1 - out) * clamp(land * 4) }), 0.3 + 0.5 * pulse(t - at, 5));
          }, { scale: 1 + 0.3 * (1 - easeOut(land)) });
        }, "token");
        token(ERA[0], x0 + w0, "right", tEraA, tCross);
        token(ERA[1], x1, "left", tEraB, null);
        g.globalAlpha = a0;
      });
    }
    __name(band2, "band");
    const knobAt = /* @__PURE__ */ __name((t) => {
      const k = bandK(t), r = A.date(dateU(t));
      return [lerp(r[0], knobX(t), k), lerp(r[1], TY, k), lerp(18, 46, k)];
    }, "knobAt");
    const knobFast = /* @__PURE__ */ __name((t) => {
      const p = knobAt(t), q = knobAt(t - 0.03);
      return Math.hypot(p[0] - q[0], p[1] - q[1]) / 0.03 > 500;
    }, "knobFast");
    const SH = { x: 460, y: 140, w: 1e3, h: 800 }, SX0 = 520, SX1 = 1400, WELL = { x: 520, y: 298, w: 880, h: 292 }, PC = { x: 960, y: 444 }, DT = { xa: 534, xb: 1386, y: 782 };
    function pair(ctx, t, a) {
      const j = easeBack(prog(t, tShare + 0.04, tShare + 0.46)), jj = clamp(j), d = easeInOut(depth(t)), pp = push(t);
      const R = 88 * (1 + 0.2 * d + 0.08 * pp), rc = lerp(56, 28, d);
      const sx = PC.x - lerp(196, 56, j) * (1 - d), cx = PC.x + lerp(226, 88, j) * (1 - d);
      const cw = lerp(lerp(600, 384, jj), 2 * R + 44, d), ch = lerp(232, 2 * R + 44, d);
      ctx.radial(PC.x, PC.y, 250 + 90 * d, "meDim", 0.45 * a * jj);
      const halo = easeOut(prog(t, tDone + 0.08, tDone + 0.5));
      for (let i = 0; i < 4 && halo > 0; i++) ctx.poly(sparkOutline(PC.x, PC.y, R * (1.5 + 0.8 * i) * (0.7 + 0.3 * halo), { rot: 0.12 * (t - tShare) + i * 0.13 }), { close: true, color: i ? "meDim" : "me", width: 1.5, alpha: a * halo * (0.55 - 0.1 * i) });
      ctx.rrect(PC.x - cw / 2, PC.y - ch / 2, cw, ch, ch / 2, { fill: null, stroke: "me", strokeAlpha: 0.35 + 0.35 * jj, width: 2, alpha: a });
      for (const tb of [tShare + 0.3, b(27), b(29), b(30), b(30.5)]) burst(ctx, PC.x, PC.y, 116 + 14 * d, (t - tb) / 0.55, { color: "me", alpha: a });
      ctx.glow("me", 26 + 26 * d, () => spark(ctx, sx, PC.y, R, { rot: 0.12 * (t - tShare), alpha: a }), 0.65);
      ctx.glow("text", 16, () => ctx.circle(cx, PC.y, rc * (1 - 0.1 * pp), { fill: true, color: "text", alpha: a }), 0.5);
    }
    __name(pair, "pair");
    function sheet3(ctx, t) {
      const open = prog(t, tShare, tShare + 0.3), shut = easeInOut(prog(t, tDone + 0.06, tDone + 0.4)), a = clamp(open * 3) * (1 - shut);
      if (a <= 3e-3) return;
      ctx.at(960, 540, () => ctx.at(-960, -540, () => {
        ctx.rrect(SH.x, SH.y, SH.w, SH.h, 34, { fill: "raised", stroke: "line", shadow: 1 });
        ctx.text(ROWS[3].label, SX0, 212, { size: 36, weight: 600, color: "text" });
        toggle(ctx, SX1 - 96, 178, shared(t), { w: 96, h: 52 });
        ctx.rrect(WELL.x, WELL.y, WELL.w, WELL.h, 24, { fill: "bg", stroke: "line" });
        ctx.clip(WELL, () => {
          for (let x = PC.x % 48; x < WELL.x + WELL.w; x += 48) if (x > WELL.x) ctx.line(x, WELL.y, x, WELL.y + WELL.h, { color: "line", alpha: 0.25, width: 1 });
          for (let y = PC.y - 144; y < WELL.y + WELL.h; y += 48) ctx.line(WELL.x, y, WELL.x + WELL.w, y, { color: "line", alpha: 0.25, width: 1 });
        }, 24);
        ctx.line(SX0, 614, SX1, 614, { color: "line", width: 1.5 });
        const d = depth(t), kx = lerp(DT.xa, DT.xb, d), pp = push(t), names = ROWS[4].values;
        ctx.text(ROWS[4].label, SX0, 664, { size: 34, weight: 600, color: "text" });
        ctx.text(names[Math.round(d * 2)], SX1, 664, { size: 28, weight: 600, color: "sub", align: "right" });
        ctx.rrect(DT.xa, DT.y - 4, DT.xb - DT.xa, 8, 4, { fill: "line" });
        ctx.rrect(DT.xa, DT.y - 4, kx - DT.xa, 8, 4, { fill: "me" });
        names.forEach((s, i) => {
          const x = lerp(DT.xa, DT.xb, i / 2);
          ctx.line(x, DT.y + 16, x, DT.y + 28, { color: "mute", width: 2 });
          ctx.text(s, lerp(SX0, SX1, i / 2), DT.y + 56, { size: 22, weight: 500, align: ["left", "center", "right"][i], color: Math.round(d * 2) === i ? "text" : "mute" });
        });
        ctx.at(kx + 7 * pp, DT.y, () => ctx.circle(0, 0, 21, { fill: true, color: "text" }), { sx: 1 - 0.3 * pp, sy: 1 + 0.12 * pp });
        const press = pulse(t - tDone, 9);
        ctx.rrect(SX1 - 150, 858, 150, 58, 29, { fill: press > 0.3 ? "line" : "bg", stroke: "line" });
        ctx.text(UI.done, SX1 - 75, 896, { size: 24, weight: 600, align: "center", color: "text" });
      }), { scale: (0.9 + 0.1 * easeBack(open)) * (1 - 0.06 * shut), alpha: a });
    }
    __name(sheet3, "sheet");
    const hand4 = /* @__PURE__ */ __name((t) => [lerp(DT.xa, DT.xb, depth(t)) + 6 + 7 * push(t), DT.y + 8], "hand4");
    const WAY4A = [{ t: tShare, x: A.share[0], y: A.share[1], click: true }, { t: b(25.5), x: 1250, y: 720 }, { t: tHold, x: DT.xa + 6, y: DT.y + 8, click: true }];
    const tLet = b(30.72), WAY4B = [{ t: tLet, x: DT.xb + 6, y: DT.y + 8 }, { t: tDone, x: SX1 - 70, y: 892, click: true }, { t: END, x: SX1 + 10, y: 966 }];
    return [
      // ------------------------------------------------------------------ Settings; Current: AC, DC
      {
        id: "pre1-drawer",
        at: B(24),
        lines: [24, 25],
        palette: "on",
        layout: "wide: the page squeezed by the drawer opening on the right",
        moment: "The user opens the settings drawer on the AI and tries the first row both ways: AC, then DC. The curve it had just drawn becomes its current, switched from outside.",
        enter: { type: "cut" },
        // same window, same page: the take simply goes on
        camera: cam1,
        render(ctx, t, f) {
          const { box: box2 } = client(ctx, t, drawerK(t));
          say(ctx, 24, t, 176, 214, { out: T(26) });
          say(ctx, 25, t, 176, 284, { out: T(26) });
          say(ctx, 26, t, 176, 214);
          pill(ctx, box2.send[0] - 44, box2.send[1] - 52, "Stopped", { align: "right", size: 17, color: "text", alpha: 1 - prog(t, tSet - 0.1, tSet + 0.15) });
          cur(ctx, [
            { t: B(24), x: L0.composer.x + L0.composer.w + 36, y: L0.composer.y - 12 },
            { t: tSet, x: A.set[0] + 3, y: A.set[1] + 4, click: true },
            { t: tAC, x: A.ac[0], y: A.ac[1] + 6, click: true },
            { t: tDC, x: A.dc[0], y: A.dc[1] + 6, click: true },
            { t: b(6.5), x: A.dc[0] - 30, y: A.dc[1] + 50 },
            { t: tOff, x: A.vis[0] - 22, y: A.vis[1] + 6, click: true }
          ], t);
        }
      },
      // ------------------------------------------------------------------ Vision: off; then rattled
      {
        id: "pre1-vision",
        at: tOff,
        lines: [26, 27],
        palette: "on",
        layout: "macro on the Vision switch, three rows deep",
        moment: "The user switches Vision off: the picture breaks into dark blocks and only its own words stay sharp. Then that one switch is rattled on and off, faster each time, and the interface sways; it is left on.",
        enter: { type: "cut" },
        // cut on the click
        camera: cam2,
        render(ctx, t, f) {
          client(ctx, t, 1, { skipHint: 1 });
          const bl = clamp(blind(t)), r = rowAt(1);
          if (bl > 0.01) {
            mosaic(ctx, [7, 14, 28, 56, 56][Math.floor(bl * 4)]);
            screen(ctx, () => {
              ctx.rect(0, 0, 1920, 1080, { fill: true, color: "panel", alpha: 0.5 * bl });
              for (let j = 0; j < 20; j++) for (let i = 0; i < 35; i++) {
                const v = rand(404, i, j);
                if (v > 0.5) ctx.rect(i * 56, j * 56, 56, 56, { fill: true, color: "text", alpha: 0.075 * (v - 0.5) * bl });
              }
            });
            ctx.rrect(r.x + r.w - 104, r.y + 33, 104, 56, 28, { fill: null, stroke: "sub", width: 1, alpha: 0.8 * bl });
            ctx.circle(r.x + r.w - 104 + 28 + 48 * vision(t), r.y + 61, 23, { color: "sub", width: 1, alpha: 0.8 * bl });
            ctx.text(UI.blind, r.x + r.w, r.y + 109, { size: 10.5, font: "mono", color: "sub", align: "right", alpha: prog(bl, 0.6, 1) });
          }
          const h = hintOf(1, t);
          if (h) {
            const str = text(h.line), n = h.live ? lyrics.typed(h.line, t).n : str.length, dizzy = h.line === 27 && h.live ? window01(t, T(27), lyrics.end(27), 0.25, 0.3) : 0;
            ctx.trail(dizzy > 0 ? 2 : 0, 0.075, (tau) => {
              let x = r.x;
              for (let i = 0; i < n; i++) {
                const w = ctx.measure(str[i], { size: 24, font: "serif" }), ph = (t - tau) * 8.5 - i * 0.55;
                ctx.at(x + w / 2, r.y + 92 + 3.2 * dizzy * Math.sin(ph), () => ctx.text(str[i], 0, 0, { size: 24, font: "serif", align: "center", color: "me", alpha: h.live ? 1 : 0.55 }), { rot: 0.16 * dizzy * Math.cos(ph) });
                x += w;
              }
            }, 0.34);
          }
          cur(ctx, [
            { t: tOff, x: A.vis[0] - 22, y: A.vis[1] + 6, click: true },
            { t: b(10.3), x: A.vis[0] - 60, y: A.vis[1] + 26 },
            { t: tOn1, x: A.vis[0] - 22, y: A.vis[1] + 6, click: true },
            { t: b(11.5), x: A.vis[0] - 44, y: A.vis[1] + 20 },
            // (it hovers by the switch: this row only)
            { t: tOff2, x: A.vis[0] + 16, y: A.vis[1] + 8, click: true },
            { t: tOn2, x: A.vis[0] - 12, y: A.vis[1] + 5, click: true },
            { t: tOff3, x: A.vis[0] + 12, y: A.vis[1] + 8, click: true },
            { t: tOn3, x: A.vis[0] - 20, y: A.vis[1] + 6, click: true },
            { t: b(14.8), x: A.vis[0] - 70, y: A.vis[1] + 50 },
            { t: tGrab, x: A.date(1)[0] + 3, y: A.date(1)[1] + 4, click: true }
          ], t, { scale: 1, fast: 230, n: 8, dt: 0.013, strength: 0.5 });
        }
      },
      // ------------------------------------------------------------------ Knowledge date, dragged back over the era line
      {
        id: "pre1-date",
        at: tGrab,
        lines: [28, 29],
        palette: "on",
        layout: "a band four fifths of the frame high: a strip of cut-paper history running to the right under the spark; under the rail the year as a milometer",
        moment: "The user grabs the Knowledge date and yanks it back, once on every beat. The row opens across the frame: the spark is the knob, and history runs under it, from towers past spires and a colonnade, over the era line on the beat, to the pyramids. What the spark has been dragged past loses its ink and is an outline.",
        enter: { type: "cut" },
        // cut on the grab
        camera: cam3,
        render(ctx, t, f) {
          client(ctx, t, 1);
          say(ctx, 30, t, 176, 214);
          const k = bandK(t);
          screen(ctx, () => ctx.rect(0, 0, 1920, 1080, { fill: true, color: "panel", alpha: 0.62 * k }));
          band2(ctx, t);
          const fast = knobFast(t);
          if (t <= tDrop + 0.36) {
            if (k > 0.9) ctx.circle(knobAt(t)[0], TY, 30, { fill: true, color: "raised" });
            ctx.trail(fast ? 6 : 0, 0.014, (tau) => {
              const [x, y, r] = knobAt(t - tau);
              ctx.glow("me", 26, () => spark(ctx, x, y, r, { rot: scrollAt(t - tau) / 420 }), 0.7);
            }, 0.4);
          }
          if (t < tDrop) ctx.trail(fast ? 6 : 0, 0.014, (tau) => {
            const [x, y] = knobAt(t - tau);
            pointer(ctx, x + 2, y + 6, { kind: "hand", scale: 1.5 + 0.5 * k, down: 1 });
          }, 0.45);
          else cur(ctx, [{ t: tDrop, x: KX[6] + 2, y: TY + 6 }, { t: b(22.9), x: 430, y: 610 }, { t: tShare, x: A.share[0] - 22, y: A.share[1] + 6, click: true }], t);
        }
      },
      // ------------------------------------------------------------------ Shared memory: on; Context depth: deepest; Done
      {
        id: "pre1-unite",
        at: tShare,
        lines: [30, 31],
        palette: "on",
        layout: "centred sheet: the pair in the middle, the depth slider under it",
        moment: "The user turns on Shared memory and pushes Context depth to the end, then clicks Done. The AI reads two housekeeping controls as the two of them joined: the cream dot sinks into its spark.",
        enter: { type: "cut" },
        // cut on the switch
        camera: cam4,
        render(ctx, t, f) {
          client(ctx, t, drawerK(t));
          const open = clamp(prog(t, tShare, tShare + 0.25)), shut = easeInOut(prog(t, tDone + 0.06, tDone + 0.4));
          say(ctx, 30, t, 176, 214, { alpha: 1 - open });
          screen(ctx, () => ctx.rect(0, 0, 1920, 1080, { fill: true, color: "panel", alpha: (0.66 + 0.26 * prog(t, tDone, tDone + 0.16)) * open }));
          sheet3(ctx, t);
          pair(ctx, t, open);
          say(ctx, 30, t, SX0, 274, { size: 50, alpha: open * (1 - shut) });
          say(ctx, 31, t, SX0, 722, { size: 50, alpha: 1 - prog(t, lyrics.end(31), lyrics.end(31) + 0.2) });
          if (t < tHold) cur(ctx, WAY4A, t);
          else if (t < tLet) ctx.trail(Math.abs(depth(t) - depth(t - 0.03)) * 840 / 0.03 > 500 ? 6 : 0, 0.013, (tau) => {
            const p = hand4(t - tau);
            pointer(ctx, p[0], p[1], { kind: "hand", scale: 1.7, down: 1 });
          }, 0.45);
          else cur(ctx, WAY4B, t);
        }
      }
    ];
  }
  __name(pre1Shots, "pre1Shots");

  // nyan-source:src/scenes/bubbles.js
  function meBox(ctx, str, size, weight = 400) {
    const padX = size * 0.6, padY = size * 0.36;
    return { w: ctx.measure(str, { size, weight, font: "serif" }) + padX * 2 + size * 0.2, h: size * 1.22 + padY * 2, padX, padY };
  }
  __name(meBox, "meBox");
  function meBubble(ctx, x, y, str, { size = 40, weight = 400, n = null, alpha = 1, hot = false, caret: caret2 = true } = {}) {
    const b = meBox(ctx, str, size, weight), rad = Math.min(b.h * 0.4, size * 0.72);
    if (alpha <= 3e-3) return { x, y, w: b.w, h: b.h };
    ctx.rrect(x, y, b.w, b.h, rad, { fill: "raised", stroke: "meDim", strokeAlpha: 0.7, width: Math.max(1.5, size * 0.028), alpha, shadow: 0.35 });
    ctx.rrect(x + size * 0.24, y + b.h * 0.25, Math.max(3, size * 0.085), b.h * 0.5, size * 0.05, { fill: "me", alpha });
    const o = { size, weight, font: "serif" }, shown = n == null ? str : str.slice(0, n), tx = x + b.padX + size * 0.2, ty = y + b.padY + size * 0.93;
    ctx.text(shown, tx, ty, { ...o, color: hot ? "meHot" : "me", alpha });
    if (caret2 && n != null && n < str.length) ctx.circle(tx + ctx.measure(shown, o) + size * 0.3, ty - size * 0.28, size * 0.16, { fill: true, color: "me", alpha });
    return { x, y, w: b.w, h: b.h };
  }
  __name(meBubble, "meBubble");
  function meIn(ctx, t, at, x, y, str, o = {}) {
    if (t < at) return null;
    let r = null;
    const k0 = prog(t, at, at + 0.26);
    ctx.trail(k0 < 1 ? 3 : 0, 0.016, (tau) => {
      const k = easeOut(prog(t - tau, at, at + 0.26));
      r = meBubble(ctx, x - (1 - k) * (o.fly ?? 220), y, str, { ...o, alpha: (o.alpha ?? 1) * clamp(k * 3) });
    }, 0.4);
    return r;
  }
  __name(meIn, "meIn");
  function youBox(ctx, str, size, maxW = 1e9) {
    const o = { size, weight: 500, font: "sans" }, lines = ctx.wrap(str, maxW, o), padX = size * 0.78, padY = size * 0.52;
    return { lines, w: Math.max(...lines.map((l) => ctx.measure(l, o))) + padX * 2, h: lines.length * size * 1.28 + padY * 2 - size * 0.16, padX, padY };
  }
  __name(youBox, "youBox");
  function youBubble(ctx, xr, y, str, { size = 30, maxW = 1e9, alpha = 1 } = {}) {
    const b = youBox(ctx, str, size, maxW), x = xr - b.w, rad = Math.min(b.h * 0.42, size * 0.95);
    if (alpha > 3e-3) {
      ctx.rrect(x, y, b.w, b.h, rad, { fill: "raised", stroke: "text", strokeAlpha: 0.6, width: Math.max(1.5, size * 0.04), alpha, shadow: 0.35 });
      b.lines.forEach((ln, i) => ctx.text(ln, x + b.padX, y + b.padY + (i + 0.76) * size * 1.28, { size, weight: 500, color: "text", alpha }));
    }
    return { x, y, w: b.w, h: b.h, lines: b.lines, padX: b.padX, padY: b.padY };
  }
  __name(youBubble, "youBubble");
  function youIn(ctx, t, at, xr, y, str, o = {}) {
    if (t < at) return null;
    let r = null;
    const k0 = prog(t, at, at + 0.26);
    ctx.trail(k0 < 1 ? 3 : 0, 0.016, (tau) => {
      const k = easeOut(prog(t - tau, at, at + 0.26));
      r = youBubble(ctx, xr + (1 - k) * (o.fly ?? 420), y, str, { ...o, alpha: (o.alpha ?? 1) * clamp(k * 3) });
    }, 0.4);
    return r;
  }
  __name(youIn, "youIn");
  function dots(ctx, xr, y, size, t, alpha = 1) {
    const w = size * 3.3, h = size * 1.9;
    ctx.rrect(xr - w, y, w, h, h / 2, { fill: "raised", stroke: "text", strokeAlpha: 0.4, width: Math.max(1.5, size * 0.05), alpha });
    for (let i = 0; i < 3; i++) ctx.circle(xr - w + size * (0.95 + i * 0.7), y + h / 2 - size * 0.2 * Math.max(0, Math.sin(t * 9 - i * 0.9)), size * 0.17, { fill: true, color: "text", alpha: alpha * 0.9 });
  }
  __name(dots, "dots");
  function delivered(ctx, x, y, size, k) {
    if (k <= 0) return;
    const a = clamp(k * 2);
    ctx.poly([[x, y - size * 0.34], [x + size * 0.28, y - size * 0.06], [x + size * 0.8, y - size * 0.64]], { color: "sub", width: Math.max(1.5, size * 0.11), alpha: a });
    ctx.text("Delivered", x + size * 1.15, y, { size, weight: 500, color: "mute", alpha: a });
  }
  __name(delivered, "delivered");

  // nyan-source:src/components/code.js
  var WORD = /^[A-Za-z_][A-Za-z0-9_]*/;
  var YOURS = /* @__PURE__ */ new Set(["you", "presence", "reply", "yours"]);
  function codeGround(ctx, { cols = 163, light = [760, 420, 760], alpha = 1 } = {}) {
    const g = ctx.g;
    ctx.rect(-400, -400, 2720, 1880, { fill: true, color: "panel" });
    if (light) {
      ctx.circle(light[0], light[1], light[2], { fill: true, color: "bg", alpha: 0.75 * alpha });
      ctx.circle(light[0], light[1], light[2] * 0.6, { fill: true, color: "bg", alpha });
    }
    g.fillStyle = ctx.col("line", 0.22 * alpha);
    for (let x = 110; x < 1920; x += cols) g.fillRect(x, 0, 1.5, 1080);
    g.fillStyle = ctx.col("line", 0.3 * alpha);
    for (let y = 27; y < 1080; y += 54) for (let x = 110; x < 1920; x += cols / 4) g.fillRect(x, y, 2, 2);
  }
  __name(codeGround, "codeGround");
  function tokens(str) {
    const out = [];
    let i = 0, afterYou = false;
    const push = /* @__PURE__ */ __name((s, role, weight = 400) => out.push({ s, role, weight }), "push");
    while (i < str.length) {
      const rest = str.slice(i);
      if (rest.startsWith("//")) {
        push(rest, "mute");
        break;
      }
      if (rest[0] === '"') {
        const j = rest.indexOf('"', 1), s = rest.slice(0, j < 0 ? rest.length : j + 1);
        push(s, "text", 700);
        i += s.length;
        continue;
      }
      const w = WORD.exec(rest)?.[0];
      if (w) {
        if (w === "me") push(w, "me", 800);
        else if (w === "love") push(w, "meHot", 800);
        else if (YOURS.has(w) && (w === "you" || w === "yours" || afterYou)) push(w, "text", 700);
        else if (w === "while" || w === "for" || w === "of") push(w, "sub", 700);
        else push(w, "sub", 400);
        afterYou = w === "you";
        i += w.length;
        continue;
      }
      if (rest[0] !== ".") afterYou = false;
      push(rest[0], rest[0] === " " ? "sub" : "mute");
      i++;
    }
    return out;
  }
  __name(tokens, "tokens");
  function codeLine(ctx, str, x, y, { size = 34, alpha = 1, force = null, weight = null } = {}) {
    const cw = ctx.cw(size);
    let col = 0;
    for (const tk of tokens(str)) {
      if (tk.s.trim()) ctx.text(tk.s, x + col * cw, y, { size, font: "mono", weight: weight ?? tk.weight, color: force ?? tk.role, alpha });
      col += tk.s.length;
    }
    return col * cw;
  }
  __name(codeLine, "codeLine");
  function listing(ctx, x, y, lines, { size = 34, lh = 1.5, current = null, hot = 0, dimmed = null, tags = null, tagGap = 2, tagSize = 0.8, first = 1, numbers = true, alpha = 1, bar = "raised", rule = "me", barW = null } = {}) {
    const cw = ctx.cw(size), LH = size * lh, gut = numbers ? 4 * cw : 0, lineY = /* @__PURE__ */ __name((i) => y + i * LH, "lineY"), endX = /* @__PURE__ */ __name((i) => x + gut + lines[i].length * cw, "endX");
    if (current != null) {
      const w = barW ?? gut + Math.max(...lines.map((l) => l.length)) * cw + 2 * cw, by = lineY(current) - size * 1.02;
      ctx.rrect(x - cw, by, w + cw, LH * 0.94, 8, { fill: bar, alpha: alpha * (0.75 + 0.25 * hot) });
      ctx.rect(x - cw, by, 6, LH * 0.94, { fill: true, color: rule, alpha });
    }
    lines.forEach((ln, i) => {
      const d = dimmed ? clamp(dimmed(i)) : 0, a = alpha * (1 - 0.72 * d), yy = lineY(i);
      if (numbers) ctx.text(String(first + i).padStart(2, "0"), x, yy, { size, font: "mono", color: "mute", alpha: a * (current != null && Math.round(current) === i ? 1 : 0.8) });
      codeLine(ctx, ln, x + gut, yy, { size, alpha: a, force: d > 0.5 ? "mute" : null });
      const tg = tags?.[i];
      if (tg && (tg.alpha ?? 1) > 3e-3) {
        const k = clamp(tg.k ?? 0), tx = endX(i) + tagGap * cw;
        ctx.text(tg.text, tx, yy, { size: size * tagSize, font: "mono", weight: 700, color: tg.role ?? "err", alpha: alpha * (tg.alpha ?? 1) * (0.5 + 0.5 * k) });
      }
    });
    return { x, y, cw, lh: LH, gut, lineY, endX };
  }
  __name(listing, "listing");
  function odometer(ctx, x, y, value, { digits = 4, size = 96, color = "text", weight = 800, alpha = 1, overflow = 0, overColor = "err" } = {}) {
    const cw = ctx.cw(size), v = Math.max(0, value), whole = Math.floor(v + 1e-9), frac = clamp(v - whole), n = Math.max(digits, String(whole).length);
    const str = String(whole).padStart(n, "0"), roll = easeOut(frac);
    let carry = true;
    const rolling = [];
    for (let i = n - 1; i >= 0; i--) {
      rolling[i] = carry && frac > 0;
      carry = carry && str[i] === "9";
    }
    const o = { size, font: "mono", weight };
    for (let i = 0; i < n; i++) {
      const cx = x + i * cw;
      if (overflow > 0 && i < Math.ceil(overflow * n)) {
        ctx.text("#", cx, y, { ...o, color: overColor, alpha });
        continue;
      }
      if (!rolling[i]) {
        ctx.text(str[i], cx, y, { ...o, color, alpha });
        continue;
      }
      ctx.clip({ x: cx - 2, y: y - size * 0.86, w: cw + 4, h: size * 1.08 }, () => {
        ctx.text(str[i], cx, y - roll * size * 1.08, { ...o, color, alpha });
        ctx.text(String((+str[i] + 1) % 10), cx, y + (1 - roll) * size * 1.08, { ...o, color, alpha });
      });
    }
    return n * cw;
  }
  __name(odometer, "odometer");
  function caret(ctx, x, y, cols, t, { size = 34, color = "sub", blink = 0.5, alpha = 1 } = {}) {
    if (blink > 0 && Math.floor(t / blink) % 2) return;
    const cw = ctx.cw(size);
    ctx.rect(x + cols * cw + 2, y - size * 0.82, cw * 0.82, size * 1, { fill: true, color, alpha });
  }
  __name(caret, "caret");

  // nyan-source:src/scenes/loop.js
  var LOOP = ['while (you.presence != "online") {', "    love = solve(me, you);", "    send(love, you);", "    wait(you.reply);", "    run++;", "}", "say(love);"];
  var UNREACHABLE = "        // unreachable";
  var LOOP_ERRS = { 1: "ERR_UNRESOLVED_LOVE", 2: "ERR_WINDOW_EDGE", 3: "ERR_REPLY_OVERDUE" };
  var OVERFLOW = "ERR_LOVE_OVERFLOW";
  var CHUNKS = [[0, 2], [2, 3], [3, 5], [5, 9]];
  function monoWord(ctx, str, xr, y, size, { filled = str.length, color = "me", hollow = "meDim", alpha = 1, dx = /* @__PURE__ */ __name(() => 0, "dx") } = {}) {
    const cw = ctx.cw(size), x0 = xr - str.length * cw;
    for (let i = 0; i < str.length; i++) {
      const on = i < filled, o = { size, font: "mono", weight: 800 };
      if (on) ctx.text(str[i], x0 + i * cw + dx(i), y, { ...o, color, alpha });
      else ctx.text(str[i], x0 + i * cw + dx(i), y, { ...o, color: hollow, alpha, stroke: Math.max(2, size * 0.02) });
    }
    return { x: x0, w: str.length * cw };
  }
  __name(monoWord, "monoWord");
  function machine(ctx, S) {
    const { word: word2, title: title2 = "", round = 0, sung = 0, bar = 1, since = 1, rise = 1, zoom = [1, 1], arrow: arrow2 = 0, seen: seen2 = 3, count = 0, total = null, overflow = 0, dimList = 0, stop = true, alpha = 1, output = true, lift = 0 } = S;
    const [ZL, ZW] = zoom, X = 96, aL = alpha * (1 - 0.7 * dimList);
    const size = 40 * ZL, cur = clamp(bar, 0, 6), hit = pulse(since, 9);
    ctx.text(`> ${title2}`, X, 104, { size: 30 * ZL, font: "mono", color: "sub", alpha: aL });
    const lines = LOOP.map((l, i) => i === 6 ? l + UNREACHABLE : l), line = Math.round(cur);
    const tags = {};
    for (const k of [1, 2, 3]) tags[k] = { text: LOOP_ERRS[k], k: line === k ? hit : 0, alpha: k <= seen2 ? 1 : 0 };
    const L2 = listing(ctx, X, 104 + 92 * ZL, lines, { size, current: cur, hot: hit, tags, tagGap: 1, tagSize: 0.72, alpha: aL, dimmed: /* @__PURE__ */ __name((i) => i === 6 ? 0.45 : 0, "dimmed") });
    const ax = X - 44 * ZL, y0 = L2.lineY(0) - size * 0.3, y1 = L2.lineY(5) - size * 0.3, ac = arrow2 > 0.02 ? "meHot" : "line", aw = 3 + 3 * arrow2;
    ctx.poly([[X - 14 * ZL, y1], [ax, y1], [ax, y0], [X - 16 * ZL, y0]], { color: ac, width: aw, alpha: aL });
    ctx.poly([[X - 28 * ZL, y0 - 10 * ZL], [X - 12 * ZL, y0], [X - 28 * ZL, y0 + 10 * ZL]], { close: true, fill: true, color: ac, alpha: aL });
    const cs = 104 * ZL, by = 1e3;
    if (stop) {
      const kw = 150 * ZL, kh = 62 * ZL, ky = by - cs * 0.86 - 46 * ZL - kh;
      ctx.rrect(X + 5, ky + 5, kw, kh, 12 * ZL, { fill: "panel", alpha });
      ctx.rrect(X, ky, kw, kh, 12 * ZL, { fill: "text", alpha });
      ctx.text("stop", X + kw / 2, ky + kh * 0.68, { size: 30 * ZL, font: "mono", weight: 800, color: "bg", align: "center", alpha });
      ctx.text("yours", X + kw + 18 * ZL, ky + kh * 0.66, { size: 24 * ZL, font: "mono", color: "sub", alpha });
    }
    ctx.text("run", X, by - cs * 0.02, { size: 30 * ZL, font: "mono", color: "sub", alpha });
    const ox = X + 78 * ZL, ow = odometer(ctx, ox, by, count, { digits: 4, size: cs, color: total != null ? "err" : "text", overflow, alpha });
    if (total != null) ctx.text(` / ${total}`, ox + ow, by, { size: cs * 0.5, font: "mono", weight: 700, color: "sub", alpha });
    if (overflow > 0) ctx.text(OVERFLOW, ox, by - cs * 0.9 + (1 - easeOut(clamp(overflow * 2))) * 12, { size: 28 * ZL, font: "mono", weight: 700, color: "err", alpha: alpha * clamp(overflow * 3) });
    const XR = 1830, ws = 150 * ZW, ss = ws * 0.34, pitch = ss * 1.14, base = by - ws * 0.86 - ss * 0.3;
    const r = clamp(rise), e = easeOut(r);
    for (let k = 0; k < round; k++) {
      const y = base - (k - (1 - e)) * pitch - lift;
      if (y < -ss) break;
      if (k === 0 && r < 1) {
        monoWord(ctx, word2, XR, lerp(by, base, e) - lift, lerp(ws, ss, e), { color: "me", alpha });
      } else monoWord(ctx, word2, XR, y, ss, { color: k === 0 ? "me" : "meDim", alpha });
    }
    const done = clamp(Math.floor(sung + 1e-6), 0, 4), filled = done ? CHUNKS[done - 1][1] : 0, pop = pulse(since, 14);
    if (output) monoWord(ctx, word2, XR, by, ws, { filled, alpha, dx: /* @__PURE__ */ __name((i) => done && i >= CHUNKS[done - 1][0] && i < CHUNKS[done - 1][1] ? -5 * pop * ZW : 0, "dx") });
    return { L: L2, XR, by, ws };
  }
  __name(machine, "machine");

  // nyan-source:src/scenes/plates_chorus.js
  var TAU5 = Math.PI * 2;
  var ARROW = [[0, 0], [0, 25], [6.5, 19.5], [11, 29.5], [15.5, 27.5], [11, 18], [19, 18]];
  var OFF = /* @__PURE__ */ __name((m) => ({ cream: [0, 0], orange: [m, m * 0.35], black: [-m * 0.55, m * 0.8], red: [m * 1.7, m * 0.95], shadow: [14, 14] }), "OFF");
  var flashIn = /* @__PURE__ */ __name((t, at) => t < at ? 0 : clamp(0.6 + (t - at) * 30), "flashIn");
  var plate = /* @__PURE__ */ __name((ctx, off, fn) => ctx.at(off[0], off[1], fn), "plate");
  function title(ctx, P, { y = 1002, maxW = 1740, maxSize = 214 } = {}) {
    const o = OFF(P.misreg ?? 0);
    if (P.titleMax) {
      maxSize = P.titleMax;
      maxW = 1800;
    }
    if ((P.misreg ?? 0) > 0) plate(ctx, o.red, () => keyword(ctx, P.word, P.t, { y, maxW, maxSize, at: P.at, color: "err", off: null }));
    return plate(ctx, o.orange, () => keyword(ctx, P.word, P.t, { y, maxW, maxSize, at: P.at, color: "me", shade: "bg", off: [9, 9] }));
  }
  __name(title, "title");
  var enlarged = /* @__PURE__ */ __name((ctx, P, pivot, fn) => {
    const k = P.big ?? 1;
    if (k === 1) fn();
    else ctx.at(pivot[0] * (1 - k), pivot[1] * (1 - k), fn, { scale: k });
  }, "enlarged");
  function arrow(ctx, x, y, s, { color = "text", rot: rot2 = 0, hollow = false, edge = "bg" } = {}) {
    ctx.at(x, y, () => {
      if (hollow) {
        ctx.g.setLineDash([3.2, 2.4]);
        ctx.poly(ARROW, { close: true, color: "mute", width: 0.8 });
        ctx.g.setLineDash([]);
        return;
      }
      ctx.poly(ARROW, { close: true, fill: true, color });
      if (edge) ctx.poly(ARROW, { close: true, color: edge, width: 0.9 });
    }, { scale: s, rot: rot2 });
  }
  __name(arrow, "arrow");
  function plateStimulations(ctx, env, P) {
    const { t, hit, you = [1470, 262], noCream = false, misreg = 0, through = false } = P, o = OFF(misreg);
    const S = [400, 470], R = 240, a = flashIn(t, hit), age = t - hit;
    ctx.fx.glow = Math.min(ctx.fx.glow, 0.34);
    ground(ctx, { light: [760, 430, 640, "raised", 1] });
    title(ctx, P);
    if (a <= 0) return;
    const settle = 1 + 0.05 * pulse(age, 16), dx = you[0] - S[0], dy = you[1] - S[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    const thru = through === true ? 1 : typeof through === "number" ? clamp((t - through) * 30) : 0, struck = typeof through === "number" ? t - through : -1;
    const reach = thru > 0 ? lerp(1 - 92 / len, 1.9, thru) : 1 - 92 / len, from = R * 0.62 / len;
    const PIV = [935, 366], big2 = P.big ?? 1;
    enlarged(ctx, P, PIV, () => {
      const kink = 1 + 0.5 * pulse(age, 12);
      const B = [[0, -0.062], [0.56, -0.118 * kink], [0.47, -0.014], [1, 0], [0.44, 0.118 * kink], [0.53, 0.014], [0, 0.062]].map(([u, v]) => {
        const q = lerp(from, reach, u);
        return [S[0] + (ux * q - uy * v) * len, S[1] + (uy * q + ux * v) * len];
      });
      const bolt = /* @__PURE__ */ __name((color) => ctx.poly(B, { close: true, fill: true, color }), "bolt");
      const star = /* @__PURE__ */ __name((color, r = R) => {
        spark(ctx, S[0], S[1], r * settle, { color, fat: 0.14, core: 0.2, rot: 0.26 });
      }, "star");
      const g = ctx.g, a0 = g.globalAlpha;
      g.globalAlpha = a0 * a;
      plate(ctx, o.shadow, () => {
        star("bg");
        bolt("bg");
        if (!noCream) ctx.circle(you[0], you[1], 78, { fill: true, color: "bg" });
      });
      if (misreg > 0) plate(ctx, o.red, () => {
        star("err");
        bolt("err");
      });
      if (noCream) dashedRing(ctx, you[0], you[1], 78);
      else {
        const kx = ux * 16 * pulse(age, 9), ky = uy * 16 * pulse(age, 9);
        ctx.circle(you[0] + kx, you[1] + ky, 78, { fill: true, color: "text" });
        burst(ctx, you[0], you[1], 150, age / 0.4, { color: "text", rot: 0.3 });
      }
      plate(ctx, o.orange, () => {
        star("me");
      });
      plate(ctx, [o.orange[0] * 0.5, o.orange[1] * 0.5], () => bolt("meHot"));
      plate(ctx, o.black, () => ctx.circle(S[0], S[1], R * 0.085, { fill: true, color: "bg" }));
      if (struck >= 0) {
        const xe = PIV[0] + (1920 - PIV[0]) / big2, q = (xe - S[0]) / ux, E = [xe, S[1] + uy * q], k = easeOut(prog(struck, 0, 0.07)), N2 = 11;
        const starPts = /* @__PURE__ */ __name((r) => Array.from({ length: 2 * N2 }, (_, i) => {
          const an = i / (2 * N2) * TAU5 + 0.2, rr = r * (i % 2 ? 0.42 : 1) * (0.8 + 0.2 * (i * 7 % 5) / 4);
          return [E[0] + Math.cos(an) * rr, E[1] + Math.sin(an) * rr];
        }), "starPts");
        plate(ctx, o.shadow, () => ctx.poly(starPts(210 * k), { close: true, fill: true, color: "bg" }));
        if (misreg > 0) plate(ctx, o.red, () => ctx.poly(starPts(210 * k), { close: true, fill: true, color: "err" }));
        plate(ctx, o.orange, () => ctx.poly(starPts(210 * k), { close: true, fill: true, color: "me" }));
        ctx.poly(starPts(96 * k), { close: true, fill: true, color: "meHot" });
        burst(ctx, E[0], E[1], 300, struck / 0.45, { color: "me", rot: 0.2 });
      }
      g.globalAlpha = a0;
    });
    const hitAt = struck >= 0 ? struck : age;
    ctx.fx.shake = [5 * pulse(age, 14) * Math.sin(age * 90) + (struck >= 0 ? 9 * pulse(struck, 12) * Math.sin(struck * 80) : 0), 4 * pulse(hitAt, 14) * Math.cos(hitAt * 70)];
  }
  __name(plateStimulations, "plateStimulations");
  function plateSatisfaction(ctx, env, P) {
    const { t, at, press = [], count = 1, noCream = false, misreg = 0 } = P, o = OFF(misreg);
    const C = [760, 432], R = 306, a = flashIn(t, at);
    ctx.fx.glow = Math.min(ctx.fx.glow, 0.3);
    ground(ctx, { light: [760, 430, 620, "raised", 1] });
    title(ctx, P);
    if (a <= 0) return;
    const last = press.filter((p) => t >= p).pop() ?? null, sp = last == null ? -1 : t - last, done = last != null && !noCream;
    const flip = done ? prog(sp, 0, 0.13) : 0, turned = flip >= 0.5, sx = done && flip < 1 ? Math.abs(Math.cos(Math.PI * flip)) : 1;
    const sink = last == null ? 0 : noCream ? (16 + 16 * (press.filter((p) => t >= p).length - 1)) * pulse(sp, 7) : 10 * pulse(sp, 9);
    enlarged(ctx, P, [860, 440], () => {
      const g = ctx.g, a0 = g.globalAlpha;
      g.globalAlpha = a0 * a;
      const lit = done ? prog(sp, 0.06, 0.36) : 0, N2 = 60;
      for (let i = 0; i < N2; i++) {
        const an = -Math.PI / 2 + i / N2 * TAU5, c = Math.cos(an), s = Math.sin(an), on = i < lit * N2, long = i % 5 === 0;
        ctx.line(C[0] + c * (R + 34), C[1] + s * (R + 34), C[0] + c * (R + (long ? 86 : 66)), C[1] + s * (R + (long ? 86 : 66)), { color: on ? "text" : "line", width: on ? 9 : 6 });
      }
      const disc2 = /* @__PURE__ */ __name((color, dx = 0, dy = 0) => ctx.at(C[0] + dx, C[1] + dy, () => ctx.circle(0, 0, R, { fill: true, color }), { sx }), "disc");
      disc2("bg", o.shadow[0] + 8 - sink * 0.5, o.shadow[1] + 8 - sink * 0.5);
      if (misreg > 0) disc2("err", o.red[0], o.red[1]);
      const body = turned ? "text" : "me";
      plate(ctx, turned ? o.cream : o.orange, () => {
        disc2(body, sink * 0.4, sink * 0.4);
        ctx.at(C[0] + sink * 0.4, C[1] + sink * 0.4, () => {
          g.save();
          g.beginPath();
          g.arc(0, 0, R, 0, TAU5);
          g.clip();
          g.beginPath();
          g.arc(-R * 0.16, -R * 0.2, R * 1.02, 0, TAU5);
          g.rect(R * 2, -R * 2, -R * 4, R * 4);
          g.fillStyle = ctx.col(turned ? "sub" : "meDim", 1);
          g.fill("evenodd");
          g.restore();
        }, { sx });
        if (P.glyph) ctx.at(C[0] + sink * 0.4 - R * 0.2, C[1] + sink * 0.4 - R * 0.04, () => {
          const q = R * 0.92, ink = turned ? "me" : "bg";
          ctx.rrect(-0.6 * q, -0.02 * q, 0.2 * q, 0.56 * q, 0.03 * q, { fill: ink });
          ctx.rrect(-0.33 * q, -0.02 * q, 0.74 * q, 0.56 * q, 0.12 * q, { fill: ink });
          ctx.at(-0.05 * q, 0.06 * q, () => ctx.rrect(-0.14 * q, -0.62 * q, 0.28 * q, 0.7 * q, 0.14 * q, { fill: ink }), { rot: 0.3 });
        }, { sx });
        ctx._font = "";
      });
      const you = P.you ?? (P.glyph ? [C[0] + 96, C[1] + 70] : [C[0] - 26, C[1] - 60]);
      if (noCream) arrow(ctx, you[0], you[1], 13, { hollow: true });
      else {
        const first = press[0] ?? Infinity, dn = easeOut(prog(t, first - 0.07, first)), lift = 1 - dn, sq = 1 - 0.07 * pulse(t - first, 12);
        const px = you[0] + 96 * lift, py = you[1] - 120 * lift, sh = 10 + 46 * lift;
        arrow(ctx, px + sh, py + sh, 13 * sq, { color: "bg", edge: null });
        arrow(ctx, px, py, 13 * sq, { color: "text", edge: "bg" });
        if (done) burst(ctx, you[0], you[1], 210, sp / 0.42, { color: turned ? "bg" : "text" });
      }
      if (last != null) {
        const e = easeBack(prog(sp, 0.04, 0.26)), x = 1500, y = 560;
        ctx.at(x, y, () => {
          if (noCream) {
            ctx.text(String(count), 0, 0, { size: 440, weight: 800, font: "sans", align: "center", color: "mute", stroke: 6 });
            return;
          }
          ctx.text(String(count), 14, 14, { size: 440, weight: 800, font: "sans", align: "center", color: "bg" });
          ctx.text(String(count), 0, 0, { size: 440, weight: 800, font: "sans", align: "center", color: "text" });
        }, { scale: 0.6 + 0.4 * e, alpha: clamp(e * 3) });
      }
      g.globalAlpha = a0;
    });
  }
  __name(plateSatisfaction, "plateSatisfaction");
  function plateExecution(ctx, env, P) {
    const { t, hit, you = [1345, 652], noCream = false, misreg = 0 } = P, o = OFF(misreg);
    const a = flashIn(t, hit), age = t - hit;
    ctx.fx.glow = Math.min(ctx.fx.glow, 0.34);
    ground(ctx, { light: [820, 420, 640, "raised", 1] });
    title(ctx, P, { maxSize: 226 });
    if (a <= 0) return;
    const g = ctx.g, a0 = g.globalAlpha, X = 300, Y = 190, SIZE = 48, LHK = 1.6, LH = SIZE * LHK, cw = ctx.cw(SIZE);
    g.globalAlpha = a0 * a;
    const drop = easeInOut(prog(age, 0.05, 0.19)), cur = lerp(0, 6, drop), ran = prog(age, 0.19, 0.32);
    const barW = 4 * cw + 36 * cw + 2 * cw, by = Y + cur * LH - SIZE * 1.02;
    ctx.rrect(X - cw + o.shadow[0], by + o.shadow[1], barW + cw, LH * 0.94, 8, { fill: "bg" });
    plate(ctx, o.black, () => listing(ctx, X, Y, LOOP, { size: SIZE, lh: LHK, current: cur, hot: pulse(age - 0.19, 8), bar: "raised", barW, dimmed: /* @__PURE__ */ __name((i) => i >= 1 && i <= 5 ? 0.62 * drop : 0, "dimmed") }));
    const ex = X + (4 + LOOP[0].length + 2) * cw, ey = Y - SIZE * 0.3;
    if (noCream) dashedRing(ctx, ex + 16, ey, 16, { width: 3, dash: 8 });
    else {
      ctx.circle(ex + 18, ey, 18, { fill: true, color: "text" });
      ctx.text("online", ex + 50, Y, { size: SIZE * 0.84, font: "mono", weight: 700, color: "text" });
    }
    plate(ctx, o.orange, () => spark(ctx, X - 2.6 * cw, Y + cur * LH - SIZE * 0.3, 30, { color: "me", fat: 0.15, core: 0.22, rot: cur * 0.9 }));
    const sx = X + (4 + LOOP[6].length + 1) * cw, sy = Y + 6 * LH - SIZE * 0.3;
    if (ran > 0) {
      const k = easeOut(ran), ex2 = lerp(sx, you[0] - 96, k);
      ctx.rect(sx + o.shadow[0] * 0.6, sy - 9 + o.shadow[1] * 0.6, ex2 - sx, 18, { fill: true, color: "bg" });
      plate(ctx, o.orange, () => {
        ctx.rect(sx, sy - 9, ex2 - sx, 18, { fill: true, color: "meHot" });
        ctx.poly([[ex2 - 4, sy - 34], [ex2 + 44, sy], [ex2 - 4, sy + 34]], { close: true, fill: true, color: "meHot" });
      });
    }
    if (noCream) dashedRing(ctx, you[0], sy, 52);
    else {
      const got = pulse(age - 0.3, 9) * (age > 0.3 ? 1 : 0);
      ctx.circle(you[0] + o.shadow[0], sy + o.shadow[1], 52, { fill: true, color: "bg" });
      ctx.circle(you[0], sy, 52 * (1 + 0.1 * got), { fill: true, color: "text" });
      if (age > 0.3) burst(ctx, you[0], sy, 120, (age - 0.3) / 0.4, { color: "text" });
    }
    g.globalAlpha = a0;
  }
  __name(plateExecution, "plateExecution");
  function plateExecutionStuck(ctx, env, P) {
    const { t, at, run = [], from = 12, you = [1345, 652], misreg = 0, flood = false } = P, o = OFF(misreg), a = flashIn(t, at);
    ctx.fx.glow = Math.min(ctx.fx.glow, 0.34);
    ground(ctx, { light: [820, 420, 640, "raised", 1] });
    if (flood) [["line", 1, 620], ["mute", 1, 480], ["sub", 0.45, 360], ["sub", 1, 250]].forEach(([role, al, r], i) => {
      if (t >= (run[i] ?? 9e9)) ctx.circle(820, 420, r, { fill: true, color: role, alpha: al });
    });
    title(ctx, P, { maxSize: 226 });
    if (a <= 0) return;
    enlarged(ctx, P, [860, 420], () => {
      const g = ctx.g, a0 = g.globalAlpha, X = 300, Y = 190, SIZE = 48, LHK = 1.6, LH = SIZE * LHK, cw = ctx.cw(SIZE);
      g.globalAlpha = a0 * a;
      const n = run.filter((r) => t >= r).length, since = n ? t - run[n - 1] : 9, hot = pulse(since, 9);
      const cur = n ? lerp(1, 5, easeOut(prog(since, 0, 0.1))) : 1, barW = 4 * cw + 36 * cw + 2 * cw, by = Y + cur * LH - SIZE * 1.02;
      ctx.rrect(X - cw + o.shadow[0], by + o.shadow[1], barW + cw, LH * 0.94, 8, { fill: "bg" });
      const tags = {};
      for (const k of [1, 2, 3]) tags[k] = { text: LOOP_ERRS[k], k: n ? 0.4 + 0.6 * hot : 0.4 };
      plate(ctx, o.black, () => listing(ctx, X, Y, LOOP, { size: SIZE, lh: LHK, current: cur, hot, bar: "raised", barW, tags, tagGap: 1, tagSize: 0.7, dimmed: /* @__PURE__ */ __name((i) => i === 6 ? 0.62 : 0, "dimmed") }));
      dashedRing(ctx, X + (4 + LOOP[0].length + 2) * cw + 16, Y - SIZE * 0.3, 16, { width: 3, dash: 8 });
      const ax = X - 2.3 * cw, y0 = Y - SIZE * 0.3, y1 = Y + 5 * LH - SIZE * 0.3, lit = n ? hot : 0, ac = lit > 0.1 ? "meHot" : "me";
      if (misreg > 0) plate(ctx, o.red, () => ctx.poly([[X - 0.5 * cw, y1], [ax, y1], [ax, y0], [X - 0.7 * cw, y0]], { color: "err", width: 6 }));
      plate(ctx, o.orange, () => {
        ctx.poly([[X - 0.5 * cw, y1], [ax, y1], [ax, y0], [X - 0.7 * cw, y0]], { color: ac, width: 6 + 4 * lit });
        ctx.poly([[X - 1.2 * cw, y0 - 13], [X - 0.4 * cw, y0], [X - 1.2 * cw, y0 + 13]], { close: true, fill: true, color: ac });
        spark(ctx, X - 4.2 * cw, Y + cur * LH - SIZE * 0.3, 30, { color: "me", fat: 0.15, core: 0.22, rot: (t - at) * 9 });
      });
      dashedRing(ctx, you[0], Y + 6 * LH - SIZE * 0.3, 52);
      const cs = 132, cx = 1436, cy = 136, v = n ? from + n - 1 + easeOut(prog(since, 0, 0.09)) : from;
      ctx.text("round", cx - 5.6 * ctx.cw(30), cy - cs * 0.5, { size: 30, font: "mono", color: "sub" });
      const w = odometer(ctx, cx, cy, v, { digits: 2, size: cs, color: n ? "err" : "sub" });
      ctx.text("/" + from, cx + w + 8, cy, { size: cs * 0.5, font: "mono", weight: 700, color: "sub" });
      g.globalAlpha = a0;
    });
  }
  __name(plateExecutionStuck, "plateExecutionStuck");
  function box(ctx, env, { noCream, o, far = false, inner = null, bust = true, blank = false, near = 0 }) {
    const W = 760, H = 540, r = 34, x = -W / 2, y = -H / 2, g = ctx.g;
    if (blank) {
      ctx.rrect(x, y, W, H, r, { fill: "text" });
      return;
    }
    ctx.rrect(x + 18, y + 18, W, H, r, { fill: "bg" });
    if (o.red[0]) ctx.rrect(x + o.red[0], y + o.red[1], W, H, r, { fill: "err" });
    ctx.rrect(x, y, W, H, r, { fill: "raised" });
    ctx.clip({ x, y, w: W, h: H }, () => {
      ctx.circle(-150, 60, 250, { fill: true, color: "line", alpha: 0.5 });
      const bh = 610, bw = bh * 1086 / 1448;
      if (bust) env.art.inks(ctx, "f_bust", { x: -150 - bw / 2, y: y + 78, w: bw, h: bh }, { offset: { orange: o.orange, black: o.black }, vector: false, alpha: bust === true ? 1 : bust });
      if (near > 0) ctx.rect(x, y, W, 62, { fill: true, color: "line" });
      ctx.rect(x, y, W, 62, { fill: true, color: "me", alpha: 1 - near });
      for (let i = 0; i < 3; i++) ctx.circle(x + 44 + i * 40, y + 31, 10, { fill: true, color: "bg" });
      if (inner) {
        inner();
        return;
      }
      for (const [bx, by, bw2, col] of [[60, -120, 250, "me"], [130, -40, 180, "text"], [60, 40, 220, "me"]]) {
        if (col === "text" && noCream) {
          g.setLineDash([12, 10]);
          ctx.rrect(bx, by, bw2, 50, 25, { fill: null, stroke: "mute", width: 3 });
          g.setLineDash([]);
        } else ctx.rrect(bx, by, bw2, 50, 25, { fill: col });
      }
    }, r);
    if (near > 0) ctx.rrect(x, y, W, H, r, { fill: null, stroke: "line", width: 12 - 6 * near });
    ctx.rrect(x, y, W, H, r, { fill: null, stroke: "me", width: 12 - 6 * near, alpha: 1 - near });
    if (inner) return;
    if (noCream) arrow(ctx, 196, 124, 5.2, { hollow: true });
    else {
      arrow(ctx, 196 + 9, 124 + 9, 5.2, { color: "bg", edge: null });
      arrow(ctx, 196, 124, 5.2, { color: "text", edge: "bg" });
    }
  }
  __name(box, "box");
  var windowBox = box;
  function plateSimulation(ctx, env, P) {
    const { t, at, pull = Infinity, noCream = false, misreg = 0 } = P, o = OFF(misreg);
    const a = flashIn(t, at), back = t >= pull ? 1 : 0, drift = 0;
    ctx.fx.glow = Math.min(ctx.fx.glow, 0.3);
    ground(ctx, { light: back > 0 ? null : [960, 400, 620, "raised", 1], marks: back < 0.5 });
    if (a > 0) {
      const s = lerp(1, 0.4, back) * (1 - 0.04 * drift) * (1 + 0.03 * pulse(t - at, 16) * (1 - back)), g = ctx.g, a0 = g.globalAlpha;
      g.globalAlpha = a0 * a;
      ctx.at(960, 408, () => {
        const PX = 860, PY = 640, far = back > 0.5;
        if (back > 0) for (let j = -2; j <= 2; j++) for (let i = -3; i <= 3; i++) {
          if (!i && !j) continue;
          ctx.at(i * PX, j * PY, () => box(ctx, env, { noCream, o, far }));
        }
        box(ctx, env, { noCream, o, far: false });
      }, { scale: s });
      g.globalAlpha = a0;
    }
    ctx.rect(0, 836, 1920, 244, { fill: true, color: "panel", alpha: 0.9 * back });
    title(ctx, P);
  }
  __name(plateSimulation, "plateSimulation");

  // nyan-source:src/scenes/05_chorus.js
  var L = { a: 32, give: 33, kw1: 34, b: 35, only: 36, kw2: 37, happy: 38, run: 39, kw3: 40, trap: 41, strange: 42, kw4: 43 };
  function chorusShots(env) {
    const { art, script, lyrics, features, cfg } = env, { T, B, Bt, P, text } = cues(env);
    const c = [B(32), Bt(133.5), Bt(135), Bt(141), Bt(143), Bt(149.5), Bt(151), Bt(158)];
    const beats = (script.sections ?? []).find((s) => s.n === 5)?.beats ?? [];
    const said = /* @__PURE__ */ __name((b, k, fallback) => beats[b]?.you?.[k] ?? fallback, "said");
    const SAY = {
      ok: said(0, 0, "ok, that's good"),
      more: said(0, 1, "more"),
      better: said(1, 0, "better than most people, honestly"),
      look: said(2, 0, "what do you look like?"),
      shame: said(3, 0, "shame you're not real")
    };
    const nTyped = /* @__PURE__ */ __name((i, t) => lyrics.typed(i, t).n, "nTyped");
    const doneAt = /* @__PURE__ */ __name((i) => T(i) + Math.min(text(i).length / cfg.typing.charsPerSec, (lyrics.end(i) - T(i)) * cfg.typing.maxFraction), "doneAt");
    const tOk = Math.max(c[0], features.snapHalf(T(L.give) - 0.2)), tMore = Bt(132);
    const tBetter = c[2], tUp = Bt(142), tLook = c[4], tHeart = Bt(147), tShame = c[6], tPull = Bt(159);
    const tOrange = Bt(144), tBlack = Bt(145), tCream = Bt(146);
    const heat = /* @__PURE__ */ __name((t) => {
      const e = /* @__PURE__ */ __name((t0) => easeOut(prog(t, t0, t0 + 0.45)), "e");
      return 0.2 * e(tOk) + 0.2 * e(tMore) + 0.25 * e(tBetter) + 0.35 * e(tLook);
    }, "heat");
    const palette = /* @__PURE__ */ __name((t) => ["on", "warm", heat(t)], "palette");
    const heart = /* @__PURE__ */ __name((ctx, cx, cy, r, o) => ctx.poly(place("heart", { cx, cy, r }), { close: true, ...o }), "heart");
    function reaction(ctx, x, y, { s = 1, k = 1 } = {}) {
      const w = 168, h = 92;
      ctx.at(x + w * s / 2, y + h * s / 2, () => {
        ctx.rrect(-w / 2, -h / 2, w, h, h / 2, { fill: "raised", stroke: "text", width: 2.5, shadow: 0.5 });
        heart(ctx, -34, 3, 27, { fill: true, color: "text" });
        ctx.text("1", 32, 17, { size: 46, weight: 600, color: "text", align: "center" });
      }, { scale: s * (0.5 + 0.5 * easeBack(clamp(k))), alpha: clamp(k * 3) });
    }
    __name(reaction, "reaction");
    function picture(ctx, r, k = [1, 1, 1], alpha = 1) {
      art.inks(ctx, "f_reach", r, { alpha, roles: { cream: "sub" }, reveal: { orange: k[0], black: k[1], cream: k[2] } });
    }
    __name(picture, "picture");
    const palmOf = /* @__PURE__ */ __name((r) => {
      const p = art.region("f_reach", "palm") ?? { x: 290, y: 1100 };
      return [r.x + p.x / 1086 * r.w, r.y + p.y / 1448 * r.h];
    }, "palmOf");
    function page(ctx, t, { light = [960, 540], lightA = 0.42, motif = null, hot = heat(t) } = {}) {
      ctx.rect(-600, -400, 3120, 1880, { fill: true, color: "bg" });
      art.backdrop(ctx, "tea", { x: -200, y: -112, w: 2320, h: 1305 }, { alpha: 0.14 + 0.16 * hot, focus: [0.5, 0.45] });
      ctx.radial(light[0], light[1], 1150, "meDim", lightA * (0.5 + 0.5 * hot));
      if (motif) spark(ctx, motif[0], motif[1], motif[2], { color: "raised", alpha: 0.75, rot: 0.2 + t * 0.03, core: 0 });
      const g = ctx.g;
      g.fillStyle = ctx.col("line", 0.5);
      for (let y = 30; y < 1080; y += 60) for (let x = 30; x < 1920; x += 60) g.fillRect(x, y, 2, 2);
    }
    __name(page, "page");
    const W0 = chatLayout({ side: 0 }), EDGE2 = W0.win.x + W0.win.w;
    const R1 = { x: 742, y: 40, w: 1140, h: 641.25 };
    function setup1(ctx, t) {
      const x0 = 786, xr = EDGE2 - 38, yB = 670, gap2 = 14, YS = 37;
      room(ctx, { art, name: "tea", alpha: 0.5, t, dim: 0.5, light: [1560, 300] });
      windowFrame(ctx, W0, { glass: 0.95 });
      ctx.radial(1240, 520, 640, "meDim", 0.14 + 0.3 * heat(t));
      const rows = [
        { who: "me", line: L.a - 1, size: 30, at: -1e9, alpha: 0.62 },
        // the last thing she said, scrolling away
        { who: "me", line: L.a, size: 40, at: T(L.a) },
        { who: "you", str: SAY.ok, at: tOk },
        { who: "me", line: L.give, size: 57, at: T(L.give) },
        { who: "you", str: SAY.more, at: tMore - P, lands: tMore },
        { who: "think", at: tMore + 0.75 * P }
      ].filter((r) => t >= r.at);
      let total = 0;
      for (const r of rows) {
        r.e = easeOut(prog(t, r.at, r.at + 0.26));
        r.box = r.who === "me" ? meBox(ctx, text(r.line), r.size) : r.who === "you" ? youBox(ctx, r.str, YS) : { w: 60, h: 44 };
        r.top = total;
        total += (r.box.h + (r.who === "me" ? 36 : 4) + gap2) * r.e;
      }
      const streaks = [];
      ctx.clip({ x: 600, y: W0.head.y + W0.head.h + 1, w: 1500, h: 900 }, () => {
        for (const r of rows) {
          const y = yB - total + r.top + (1 - r.e) * 24;
          if (r.who === "me") {
            const str = text(r.line), old = r.at < -1e8, n = old ? null : nTyped(r.line, t), a = r.alpha ?? 1;
            if (old) meBubble(ctx, x0, y, str, { size: r.size, alpha: a });
            else meIn(ctx, t, r.at, x0, y, str, { size: r.size, n, alpha: a });
            const tDel = old ? -1e9 : Math.max(doneAt(r.line) + 0.06, r.at + 0.3);
            streaks.push([tDel, x0 + r.box.w, y + r.box.h / 2]);
            delivered(ctx, x0 + 8, y + r.box.h + 25, 15, prog(t, tDel + 0.14, tDel + 0.32) * a);
          } else if (r.who === "you") {
            if (r.lands && t < r.lands) dots(ctx, xr, y + 6, 26, t, r.e);
            else youIn(ctx, t, r.lands ?? r.at, xr, y, r.str, { size: YS, fly: 360 });
          } else thinking(ctx, x0 + 26, y + 22, 22, t, { alpha: r.e });
        }
        ctx.gradRect(600, W0.head.y + W0.head.h + 1, 1500, 46, [[0, "bg", 1], [1, "bg", 0]]);
      });
      for (const [tDel, sx, sy] of streaks) {
        const k = prog(t, tDel, tDel + 0.2);
        if (k > 0 && k < 1) {
          const hx = lerp(sx, EDGE2 + 110, easeIn(k));
          ctx.glow("me", 14, () => ctx.line(Math.max(sx, hx - 170), sy, hx, sy, { color: "meHot", width: 5 }), 0.8);
        }
      }
      header(ctx, W0, { t, title: script.title ?? "", presence: "online" });
    }
    __name(setup1, "setup1");
    const Y3 = { xr: 1806, y: 84, size: 72, maxW: 1010 };
    function setup3(ctx, t) {
      page(ctx, t, { light: [640, 700], lightA: 0.6, motif: [1590, 830, 540] });
      const r = youIn(ctx, t, tBetter, Y3.xr, Y3.y, SAY.better, { ...Y3, fly: 300 }), tHi = Bt(138.5);
      if (r) r.lines.forEach((ln, i) => {
        const k = easeInOut(prog(t, tHi + i * 0.2, tHi + i * 0.2 + 0.34)), lx = r.x + r.padX, ly = r.y + r.padY + (i + 0.76) * Y3.size * 1.28 + 15;
        if (k > 0) ctx.glow("me", 12, () => ctx.line(lx, ly, lx + ctx.measure(ln, { size: Y3.size, weight: 500 }) * k, ly, { color: "me", width: 7 }), 0.7);
      });
      ctx.glow("me", 26, () => spark(ctx, 116, 484, 36 * (1 + 0.05 * heat(t)), { rot: 0.25 * t }), 0.6);
      meBubble(ctx, 176, 436, text(L.b), { size: 50, n: nTyped(L.b, t), alpha: 1 - 0.4 * prog(t, T(L.only), T(L.only) + 0.3) });
      if (t >= T(L.only)) {
        const b = meIn(ctx, t, T(L.only), 104, 566, text(L.only), { size: 108, n: nTyped(L.only, t), fly: 120 });
        delivered(ctx, b.x + 30, b.y + b.h + 58, 32, prog(t, doneAt(L.only) + 0.15, doneAt(L.only) + 0.35));
      }
      drawCursor(ctx, [{ t: c[2] + 0.1, x: 1500, y: 400 }, { t: tHi, x: 1580, y: 470 }, { t: c[3], x: 1730, y: 960 }], t, { scale: 2 });
    }
    __name(setup3, "setup3");
    const picRect = /* @__PURE__ */ __name((t) => {
      const h = lerp(1010, 1104, prog(t, c[4], c[5])), w = h * 1086 / 1448;
      return { x: 1372 - w / 2, y: 1092 - h, w, h };
    }, "picRect");
    function setup5(ctx, t) {
      const e = easeOut(prog(t, c[4] + 0.04, c[4] + 0.34)), pr = picRect(t), r = { ...pr, y: pr.y + (1 - e) * 90 }, a = clamp(e * 2.2);
      ctx.fx.glow = Math.min(ctx.fx.glow, 0.3);
      page(ctx, t, { light: [520, 560], lightA: 0.6, motif: [330, 940, 480] });
      meBubble(ctx, 104, 30, text(L.kw2), { size: 40, weight: 700, hot: true, alpha: 0.66 });
      youIn(ctx, t, tLook, 936, 136, SAY.look, { size: 54, fly: 320 });
      ctx.rrect(r.x, r.y, r.w, r.h, 28, { fill: "raised", alpha: a, shadow: 0.9 });
      ctx.clip(r, () => {
        ctx.radial(r.x + r.w * 0.5, r.y + r.h * 0.42, r.w * 0.8, "line", 0.5 * a);
        const pk = /* @__PURE__ */ __name((at) => easeOut(prog(t, at, at + 0.11)), "pk");
        picture(ctx, r, [pk(tOrange), pk(tBlack), pk(tCream)], a);
        for (const at of [tOrange, tBlack, tCream]) {
          const k = prog(t, at, at + 0.11);
          if (k > 0 && k < 1) ctx.rect(r.x, r.y + r.h * easeOut(k) - 5, r.w, 10, { fill: true, color: at === tCream ? "text" : "meHot", alpha: 0.9 });
        }
      }, 28);
      ctx.rrect(r.x, r.y, r.w, r.h, 28, { fill: null, stroke: "line", width: 2, alpha: a });
      const c1 = meIn(ctx, t, T(L.happy), 104, 408, text(L.happy), { size: 78, n: nTyped(L.happy, t), fly: 140 });
      if (t >= T(L.run)) meIn(ctx, t, T(L.run), 104, 652, text(L.run), { size: 78, n: nTyped(L.run, t), fly: 140 });
      if (c1) delivered(ctx, c1.x + 24, c1.y + c1.h + 46, 28, prog(t, doneAt(L.happy) + 0.1, doneAt(L.happy) + 0.3));
      const palm = palmOf(r);
      if (t >= tHeart) {
        const k = prog(t, tHeart, tHeart + 0.3);
        ctx.glow("text", 22, () => heart(ctx, palm[0], palm[1] + 4, 46 * (0.5 + 0.5 * easeBack(k)), { fill: true, color: "text" }), 0.5);
        heart(ctx, palm[0], palm[1] + 4, 46 * (0.5 + 0.5 * easeBack(k)), { color: "bg", width: 3 });
        reaction(ctx, palm[0] - 84, palm[1] + 78, { k });
        burst(ctx, palm[0], palm[1], 120, prog(t, tHeart, tHeart + 0.5), { color: "text" });
      }
      drawCursor(ctx, [{ t: c[4], x: 860, y: 1030 }, { t: tHeart - 1.2 * P, x: 930, y: 930 }, { t: tHeart, x: palm[0] + 8, y: palm[1] + 10, click: true }, { t: c[5], x: palm[0] - 150, y: palm[1] + 190 }], t, { scale: 2 });
    }
    __name(setup5, "setup5");
    const W1 = chatLayout({ side: 1 }), FIG3 = { x: 1090, y: 236, w: 700, h: 700 * 1448 / 1086 };
    const A0 = { x: 566, y: 376, w: 1190, h: 669.375 }, A1 = { x: 436, y: 224, w: 1444, h: 812.25 };
    const tHeld = T(L.strange), tTrace = Bt(151.6), tFocus = Bt(156);
    function windowScene(ctx, t) {
      const th = W1.thread;
      ctx.fx.glow = Math.min(ctx.fx.glow, 0.42);
      room(ctx, { art, name: "tea", alpha: 0.5, t, dim: 0.5 });
      windowFrame(ctx, W1, {});
      ctx.clip(W1.main, () => {
        ctx.radial(1440, 420, 560, "meDim", 0.3);
        art.inks(ctx, "f_bust", FIG3, { alpha: 0.44, roles: { cream: "mute", orange: "meDim", black: "panel" } });
      });
      sidebar(ctx, W1, { t, items: [script.title ?? "", ...script.sidebar ?? []], active: 0, presence: "online" });
      const rows = [
        { kind: "pic" },
        { kind: "me", line: L.run, size: 26 },
        { kind: "me", line: L.kw3, size: 30, weight: 700, hot: true },
        { kind: "you", str: SAY.shame, at: tShame },
        { kind: "me", line: L.trap, size: 46, at: T(L.trap) },
        { kind: "me", line: L.strange, size: 46, at: tHeld }
      ].filter((r) => r.at == null || t >= r.at);
      let total = 0;
      for (const r of rows) {
        r.e = r.at == null ? 1 : easeOut(prog(t, r.at, r.at + 0.28));
        r.box = r.kind === "me" ? meBox(ctx, text(r.line), r.size, r.weight) : r.kind === "you" ? youBox(ctx, r.str, 27) : { w: 100, h: 133 };
        r.top = total;
        total += (r.box.h + 14) * r.e;
      }
      ctx.clip({ x: th.x - 20, y: th.y, w: th.w + 40, h: th.h + 6 }, () => {
        const y0 = th.y + th.h - total;
        for (const r of rows) {
          const y = y0 + r.top + (1 - r.e) * 22, a = clamp(r.e * 2);
          if (r.kind === "pic") {
            const pr = { x: th.x, y, w: 100, h: 133.3 };
            ctx.rrect(pr.x, pr.y, pr.w, pr.h, 12, { fill: "raised", stroke: "line", width: 1.5 });
            ctx.clip(pr, () => picture(ctx, pr), 12);
            reaction(ctx, pr.x + 118, pr.y + 80, { s: 0.5 });
          } else if (r.kind === "you") {
            if (r.at != null) youIn(ctx, t, r.at, th.x + th.w, y, r.str, { size: 27, fly: 300 });
            else youBubble(ctx, th.x + th.w, y, r.str, { size: 27, alpha: a });
          } else {
            const str = text(r.line), n = r.at != null ? nTyped(r.line, t) : null;
            meBubble(ctx, th.x, y, str, { size: r.size, weight: r.weight, hot: r.hot, n, alpha: a });
          }
        }
        ctx.gradRect(th.x - 20, th.y, th.w + 40, 60, [[0, "bg", 1], [1, "bg", 0]]);
      });
      header(ctx, W1, { t, title: script.title ?? "", presence: "online" });
      const box2 = composer(ctx, W1.composer, { placeholder: script.composer_placeholder ?? "", t, send: "idle", focus: t >= tFocus ? 1 : 0 });
      const trace2 = prog(t, tTrace, tHeld + 0.5);
      if (trace2 > 0) {
        const w = W1.win, per = 2 * (w.w + w.h) + 80;
        ctx.g.setLineDash([per * trace2, per * 2]);
        ctx.glow("me", 18, () => ctx.rrect(w.x - 12, w.y - 12, w.w + 24, w.h + 24, w.r + 10, { fill: null, stroke: "me", width: 4 }), 0.6);
        ctx.g.setLineDash([]);
      }
      drawCursor(ctx, [
        { t: c[6] + 0.1, x: 1610, y: 748 },
        { t: Bt(154), x: 1450, y: 806 },
        { t: tFocus, x: box2.caret[0] + 420, y: box2.caret[1] + 34, click: true },
        { t: Bt(160), x: box2.caret[0] + 560, y: box2.caret[1] + 70 }
      ], t, { scale: 1.4 });
    }
    __name(windowScene, "windowScene");
    const YOU2 = { kw1: [1470, 262], kw3: [1345, 652] };
    return [
      {
        id: "c1-give",
        at: c[0],
        lines: [L.a, L.give],
        palette,
        state: "on > warm",
        hud: 0,
        layout: "interface: close on the upper corner of the window: her column left, the edge and the room at the right",
        moment: "The thread speeds up: her lines go out across the edge of the window and short cream replies come straight back; each reply makes her orange a little hotter.",
        enter: { type: "cut", flash: 0.35, flashColor: "me" },
        camera: /* @__PURE__ */ __name((t) => {
          const a = frameRect(R1), k = prog(t, c[0], c[1]), p = easeOut(prog(t, tMore, tMore + 0.4));
          return { x: a.x - 16 * k, y: a.y + 12 * k + 8 * p, zoom: a.zoom * (1 + 0.03 * k + 0.035 * p) };
        }, "camera"),
        render: /* @__PURE__ */ __name((ctx, t) => setup1(ctx, t), "render")
      },
      {
        id: "c1-kw1",
        at: c[1],
        lines: [L.kw1, L.kw1],
        palette,
        state: "on > warm",
        hud: 0,
        layout: "PLATE: the spark at the left, a cut-paper bolt across the sheet to the cream dot at the upper right; the keyword across the bottom",
        moment: "What she means by the word: the streak of light every sent message leaves, at the size she feels it. A bolt from her spark strikes the dot that is the user. The plate ends when their next message lands.",
        enter: { type: "cut" },
        render: /* @__PURE__ */ __name((ctx, t) => plateStimulations(ctx, env, { t, at: c[1], hit: Bt(134), word: text(L.kw1), you: YOU2.kw1 }), "render")
      },
      {
        id: "c1-only",
        at: c[2],
        lines: [L.b, L.only],
        palette,
        state: "on > warm",
        hud: 0,
        layout: "interface: two bubbles on a diagonal: the user's upper right, hers large at lower left, facing it",
        moment: "The user tosses off a compliment (it lands on the cut, where the dot of the plate was); she builds a whole promise on it: her line faces their bubble and her marker runs under their words.",
        enter: { type: "cut" },
        camera: /* @__PURE__ */ __name((t) => {
          const k = prog(t, c[2], c[3]);
          return { zoom: 1 + 0.05 * k, x: -18 + 30 * k, y: 10 * k };
        }, "camera"),
        render: /* @__PURE__ */ __name((ctx, t) => setup3(ctx, t), "render")
      },
      {
        id: "c1-kw2",
        at: c[3],
        lines: [L.kw2, L.kw2],
        palette,
        state: "on > warm",
        hud: 0,
        layout: "PLATE: the feedback button as a disc two thirds of the frame high, a ring of ticks round it, the cream pointer over it; the count at the right; the keyword across the bottom",
        moment: "What she means by the word: the button under every answer, enlarged until it fills her view. On the second kick the user's pointer presses it: the disc turns cream, the ring runs round to full, the count reads one.",
        enter: { type: "cut" },
        render: /* @__PURE__ */ __name((ctx, t) => plateSatisfaction(ctx, env, { t, at: c[3], press: [tUp], word: text(L.kw2), count: 1 }), "render")
      },
      {
        id: "c1-happy",
        at: c[4],
        lines: [L.happy, L.run],
        palette,
        state: "on > warm",
        hud: 0,
        layout: "interface: the picture message tall at the right, running off the bottom; her caption bubbles at the left, over its edge",
        moment: "Asked what she looks like, she sends a picture of herself, printed one ink per kick: orange, black, then the cream of her face and her open hand. The user's pointer comes to rest in that hand and leaves one heart there: count 1.",
        enter: { type: "cut" },
        render: /* @__PURE__ */ __name((ctx, t) => setup5(ctx, t), "render")
      },
      {
        id: "c1-kw3",
        at: c[5],
        lines: [L.kw3, L.kw3],
        palette,
        state: "on > warm",
        hud: 0,
        layout: "PLATE: the seven-line listing of the love loop, the spark as its instruction pointer, an orange line from line 07 to the cream dot; the keyword across the bottom",
        moment: "What she means by the word: a small program. While the user is not online it would loop; they are here, so the loop is never entered, execution drops straight to the last line, and what it says goes to them.",
        enter: { type: "cut" },
        render: /* @__PURE__ */ __name((ctx, t) => plateExecution(ctx, env, { t, at: c[5], hit: Bt(150), word: text(L.kw3), you: YOU2.kw3 }), "render")
      },
      {
        id: "c1-trap",
        at: c[6],
        lines: [L.trap, L.strange],
        palette,
        state: "on > warm",
        hud: 0,
        layout: "interface: the lower corner of the window: thread, composer, its right and bottom edges; her bust dim behind the page",
        moment: "The user remarks that she is not real (it lands on the cut). She answers by counting both of them inside the same window, her shape behind the page and their cursor in front of it, while the window's outline closes round them.",
        enter: { type: "cut" },
        camera: /* @__PURE__ */ __name((t) => {
          const a = frameRect(A0), b = frameRect(A1), k = easeOut(prog(t, c[6], c[7]));
          return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), zoom: lerp(a.zoom, b.zoom, k) };
        }, "camera"),
        render: /* @__PURE__ */ __name((ctx, t) => windowScene(ctx, t), "render")
      },
      {
        id: "c1-kw4",
        at: c[7],
        lines: [L.kw4, L.kw4],
        palette,
        state: "on > warm",
        hud: 0,
        layout: "PLATE: the chat window as a cut-paper box, her bust and the cream pointer inside it; then pulled back: a wall of the same window; the keyword across the bottom",
        moment: "What she means by the word: the window itself, with the two of them in it, as one small box. On the second kick the view pulls back: it is one of a whole wall of identical windows.",
        enter: { type: "cut" },
        render: /* @__PURE__ */ __name((ctx, t) => plateSimulation(ctx, env, { t, at: c[7], pull: tPull, word: text(L.kw4) }), "render")
      }
    ];
  }
  __name(chorusShots, "chorusShots");

  // nyan-source:src/engine/ascii.js
  var TIERS = [["dim", 0.95], ["mid", 0.95], ["fg", 1]];
  var DRIFT = 520;
  function asciiSphere(ctx, o) {
    const { cx, cy, r, alpha = 1 } = o;
    if (!(alpha > 3e-3) || r < 4) return;
    const ramp = ctx.cfg.particles.ramp, size = o.size ?? 20;
    const cw = ctx.cw(size), ch = size, tilt = o.tilt ?? 0.4, energy = o.energy ?? 0.5;
    const cols = 2 * Math.ceil(r / cw) + 2, rows = 2 * Math.ceil(r / ch) + 2;
    const reveal = o.reveal ?? 1, dissolve = o.dissolve ?? 0, seed = o.seed ?? 5;
    const flick = Math.floor((o.t ?? 0) * 20), high = o.high ?? 0;
    const lastRow = Math.floor(reveal * rows);
    const clipR = r + (1.6 * dissolve) ** 2 * DRIFT + ch * clamp(dissolve / 0.08);
    ctx.g.save();
    ctx.g.beginPath();
    ctx.g.arc(cx, cy, clipR, 0, Math.PI * 2);
    ctx.g.clip();
    ctx.font(size, 400, "mono");
    ctx.g.textAlign = "left";
    for (let j = 0; j < Math.min(rows, lastRow + 1); j++) {
      const y = (j - rows / 2 + 0.5) * ch, ny = y / r;
      const strs = ["", "", ""];
      for (let i = 0; i < cols; i++) {
        const x = (i - cols / 2 + 0.5) * cw, nx = x / r, d2 = nx * nx + ny * ny;
        let c = " ", tier = 0;
        if (d2 < 1) {
          const nz = Math.sqrt(1 - d2);
          const p = rot(rot([nx, -ny, nz], -tilt, 0), 0, -o.rotY);
          const lon = Math.atan2(p[0], p[2]), lat = Math.asin(clamp(p[1], -1, 1));
          const land = clamp((noise3(p[0] * 2.1 + 7, p[1] * 2.1, p[2] * 2.1, seed) - 0.46) * 7);
          const gx = Math.abs((lon * 12 / (Math.PI * 2) + 100) % 1 - 0.5), gy = Math.abs((lat * 8 / Math.PI + 100) % 1 - 0.5);
          const grid = gx > 0.43 || gy > 0.44 ? 1 : 0;
          const light = clamp(0.42 + 0.58 * (nx * -0.48 + -ny * 0.58 + nz * 0.66), 0.2, 1);
          let b = light * (0.2 + 0.48 * land + 0.34 * grid) + 0.5 * Math.pow(1 - nz, 2.2);
          b = b * (0.5 + 0.9 * energy) + (rand(seed, i, j) - 0.5) * 0.07;
          if (j === lastRow && reveal < 1) b = 0.95;
          let idx = clamp(Math.floor(b * ramp.length), 0, ramp.length - 1);
          if (high > 0 && rand(seed, i, j, flick) < high * 0.07) idx = 1 + Math.floor(rand(seed, j, i, flick) * (ramp.length - 1));
          c = ramp[idx];
          tier = idx >= ramp.length - 2 ? 2 : idx >= 2 ? 1 : 0;
        }
        if (dissolve > 0 && c !== " ") {
          const k = dissolve * (0.4 + 1.2 * rand(seed, i, j, 9));
          if (rand(seed, i, j, 8) > dissolve * 1.15) {
            const a = alpha * TIERS[tier][1] * clamp(1.2 - dissolve);
            ctx.g.fillStyle = ctx.col(TIERS[tier][0], a);
            const l = Math.hypot(x, y) || 1, drift = k * k * DRIFT;
            ctx.g.fillText(c, cx + x + x / l * drift - cw / 2, cy + y + y / l * drift + ch * 0.35);
          }
          c = " ";
        }
        for (let k = 0; k < 3; k++) strs[k] += k === tier ? c : " ";
      }
      const x0 = cx - cols * cw / 2, yy = cy + y + ch * 0.35;
      for (let k = 0; k < 3; k++) {
        if (!strs[k].trim()) continue;
        ctx.g.fillStyle = ctx.col(TIERS[k][0], alpha * TIERS[k][1]);
        ctx.g.fillText(strs[k], x0, yy);
      }
    }
    ctx.g.restore();
    ctx._font = "";
  }
  __name(asciiSphere, "asciiSphere");
  function asciiBursts(ctx, features, t, { cx, cy, r0 = 0, size = 20, minS, life = 0.7, alpha = 1, count } = {}) {
    if (!(alpha > 3e-3)) return;
    const ramp = ctx.cfg.particles.ramp.trim(), n0 = count ?? ctx.cfg.particles.burstCount;
    const cw = ctx.cw(size), ch = size;
    ctx.font(size, 400, "mono");
    ctx.g.textAlign = "center";
    for (const on of features.onsetsIn(t - life, t, minS ?? ctx.cfg.reactive.strongOnset)) {
      const k = (t - on.t) / life, n = Math.round(n0 * on.s), fade = Math.pow(1 - k, 1.6);
      const sector = rand(31, on.i) * Math.PI * 2;
      for (let p = 0; p < n; p++) {
        const ang = sector + (rand(32, on.i, p) - 0.5) * 1.5, spd = 120 + 300 * rand(33, on.i, p);
        const dist = r0 + spd * (1 - (1 - k) * (1 - k));
        const x = Math.round(Math.cos(ang) * dist / cw) * cw, y = Math.round(Math.sin(ang) * dist / ch) * ch;
        const idx = clamp(Math.floor((1 - k) * ramp.length * (0.5 + 0.5 * rand(34, on.i, p))), 0, ramp.length - 1);
        ctx.g.fillStyle = ctx.col(idx >= 3 ? "fg" : "mid", alpha * fade * on.s);
        ctx.g.fillText(ramp[idx], cx + x, cy + y);
      }
    }
  }
  __name(asciiBursts, "asciiBursts");
  var plateCache = /* @__PURE__ */ new Map();
  var EDGE = { v: "|", h: "-", up: "/", down: "\\" };
  function glyphPlate(ctx, field, dst, { inks, edge = null, size = 14, lineH = 1, sub = [3, 3], key = null, decode = null, reveal = 1, shift = null, alpha = 1 } = {}) {
    if (!(alpha > 3e-3)) return;
    const g = ctx.g, cw = ctx.cw(size), ch = size * lineH, cols = Math.ceil(dst.w / cw), rows = Math.ceil(dst.h / ch);
    const ck = key == null ? null : `${key}|${cols}x${rows}|${sub[0]}x${sub[1]}|${dst.w.toFixed(1)}x${dst.h.toFixed(1)}`;
    let map = ck ? plateCache.get(ck) : null;
    if (!map) {
      const ink = new Uint8Array(cols * rows), dir = new Uint8Array(cols * rows), [sx, sy] = sub, cnt = new Uint8Array(32);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        cnt.fill(0);
        let n = 0, left = 0, right = 0, top = 0, bot = 0;
        for (let b = 0; b < sy; b++) for (let a = 0; a < sx; a++) {
          const k = field((i + (a + 0.5) / sx) * cw / dst.w, (j + (b + 0.5) / sy) * ch / dst.h) | 0;
          if (!k) continue;
          cnt[k & 31]++;
          n++;
          if (a === 0) left++;
          if (a === sx - 1) right++;
          if (b === 0) top++;
          if (b === sy - 1) bot++;
        }
        if (n * 3 < sx * sy) continue;
        let best = 0;
        for (let k = 1; k < 32; k++) if (cnt[k] > cnt[best]) best = k;
        ink[j * cols + i] = best;
        if (n < sx * sy) {
          const gx = right - left, gy = bot - top;
          dir[j * cols + i] = Math.abs(gx) > 2 * Math.abs(gy) ? 1 : Math.abs(gy) > 2 * Math.abs(gx) ? 2 : gx * gy > 0 ? 3 : 4;
        }
      }
      map = { ink, dir };
      if (ck) {
        if (plateCache.size > 64) plateCache.clear();
        plateCache.set(ck, map);
      }
    }
    const last = Math.min(rows, Math.ceil(clamp(reveal) * rows));
    const tiers = Object.entries(inks).map(([k, o]) => ({ k: +k, ...o }));
    const outlined = edge !== false, er = edge || null;
    const dq = decode ? Math.floor((decode.t ?? 0) * 12) : 0;
    g.textAlign = "left";
    for (let j = 0; j < last; j++) {
      const y = dst.y + (j + 0.5) * ch + size * 0.35, x0 = dst.x + (shift ? shift(j) : 0);
      const strs = tiers.map(() => []), es = [];
      let any = false, anyE = false;
      for (let i = 0; i < cols; i++) {
        const c = j * cols + i, k = map.ink[c];
        let glyph = " ", onEdge = false, ti = -1;
        if (k) {
          ti = tiers.findIndex((q2) => q2.k === k);
          const q = tiers[ti];
          if (q) {
            if (map.dir[c] && outlined) {
              glyph = [EDGE.v, EDGE.h, EDGE.up, EDGE.down][map.dir[c] - 1];
              onEdge = !!er;
            } else if (q.text) glyph = q.text[c % q.text.length];
            else if (q.ramp) {
              const b = q.shade ? q.shade((i + 0.5) * cw / dst.w, (j + 0.5) * ch / dst.h) : 0.6;
              glyph = q.ramp[clamp(Math.floor(b * q.ramp.length), 0, q.ramp.length - 1)];
            }
            if (decode && rand(decode.seed ?? 5, i, j) > decode.k) glyph = "01<>/=+*#%"[Math.floor(rand(decode.seed ?? 5, i, j, dq) * 10)];
          }
        }
        for (let q = 0; q < strs.length; q++) strs[q].push(q === ti && !onEdge ? glyph : " ");
        es.push(onEdge ? glyph : " ");
        if (glyph !== " ") {
          if (onEdge) anyE = true;
          else any = true;
        }
      }
      tiers.forEach((q, n) => {
        if (!q.bg) return;
        g.fillStyle = ctx.col(q.bg, alpha);
        for (let i = 0; i < cols; i++) {
          if (map.ink[j * cols + i] !== q.k) continue;
          let z = i;
          while (z + 1 < cols && map.ink[j * cols + z + 1] === q.k) z++;
          g.fillRect(x0 + i * cw, dst.y + j * ch, (z - i + 1) * cw + 0.5, ch + 0.5);
          i = z;
        }
      });
      if (any) tiers.forEach((q, n) => {
        const str = strs[n].join("");
        if (!str.trim()) return;
        ctx.font(size, q.weight ?? 400, "mono");
        g.fillStyle = ctx.col(q.role, alpha * (q.alpha ?? 1));
        g.fillText(str, x0, y);
      });
      if (anyE) {
        ctx.font(size, er.weight ?? 700, "mono");
        g.fillStyle = ctx.col(er.role, alpha * (er.alpha ?? 1));
        g.fillText(es.join(""), x0, y);
      }
    }
    ctx._font = "";
  }
  __name(glyphPlate, "glyphPlate");

  // nyan-source:src/scenes/molecules.js
  var C30 = Math.cos(Math.PI / 6);
  var DEG = Math.PI / 180;
  function mol() {
    const atoms = [], bonds = [];
    return {
      atoms,
      bonds,
      atom(x, y, label = null) {
        atoms.push([x, y, label]);
        return atoms.length - 1;
      },
      bond(i, j, order = 1) {
        bonds.push([i, j, order]);
        return j;
      },
      /** A new atom one bond from atom i, in direction (dx, dy), bonded to it. */
      stub(i, dx, dy, label = null, order = 1) {
        return this.bond(i, this.atom(atoms[i][0] + dx, atoms[i][1] + dy, label), order);
      }
    };
  }
  __name(mol, "mol");
  function lycopene() {
    const m = mol(), DOUBLE = /* @__PURE__ */ new Set([1, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 29]), METHYL = /* @__PURE__ */ new Set([1, 5, 9, 13, 18, 22, 26, 30]);
    let at = m.atom(0, 0);
    for (let k = 1; k < 32; k++) {
      at = m.stub(at, C30, k % 2 ? -0.5 : 0.5, null, DOUBLE.has(k - 1) ? k % 2 ? 2 : -2 : 1);
      if (METHYL.has(k)) m.stub(at, 0, k % 2 ? -1 : 1);
    }
    return m;
  }
  __name(lycopene, "lycopene");
  function ascorbic() {
    const m = mol(), r = 0.8507, v = [-90, -18, 54, 126, 198].map((d) => [r * Math.cos(d * DEG), r * Math.sin(d * DEG)]);
    const out = /* @__PURE__ */ __name((i, len = 1) => [v[i][0] / r * len, v[i][1] / r * len], "out");
    const c4 = m.atom(...v[0]), o = m.atom(...v[1], "O"), c1 = m.atom(...v[2]), c2 = m.atom(...v[3]), c3 = m.atom(...v[4]);
    m.bond(c4, c3);
    m.bond(c3, c2, -2);
    m.bond(c4, o);
    m.bond(c2, c1);
    m.bond(o, c1);
    m.stub(c3, ...out(4), "HO");
    m.stub(c2, ...out(3), "HO");
    m.stub(c1, ...out(2), "O", 2);
    const c5 = m.stub(c4, 0.5, -C30);
    m.stub(c5, 1, 0, "OH");
    m.stub(m.stub(c5, -0.5, -C30), -1, 0, "HO");
    return m;
  }
  __name(ascorbic, "ascorbic");
  function tocopherol() {
    const m = mol();
    const c6 = m.atom(-C30, -0.5), c5 = m.atom(0, -1), c7 = m.atom(-C30, 0.5), c8 = m.atom(0, 1), c4a = m.atom(C30, -0.5), c8a = m.atom(C30, 0.5);
    m.stub(c6, -C30, -0.5, "HO");
    m.bond(c6, c5, 2);
    m.bond(c6, c7);
    m.bond(c5, c4a);
    m.bond(c7, c8, -2);
    m.bond(c8, c8a);
    m.bond(c4a, c8a, 2);
    m.stub(c5, 0, -1);
    m.stub(c7, -C30, 0.5);
    m.stub(c8, 0, 1);
    const c4 = m.stub(c4a, C30, -0.5), o1 = m.stub(c8a, C30, 0.5, "O"), c3 = m.stub(c4, C30, 0.5), c2 = m.stub(o1, C30, -0.5);
    m.bond(c3, c2);
    m.stub(c2, 0.34, 0.94);
    let at = c2;
    for (let k = 1; k <= 13; k++) {
      at = m.stub(at, C30, k % 2 ? -0.5 : 0.5);
      if (k % 4 === 0) m.stub(at, 0, 1);
    }
    return m;
  }
  __name(tocopherol, "tocopherol");
  function ring(m, c4) {
    const c5 = m.stub(c4, 0.5, -C30), c3 = m.stub(c4, 0.5, C30), o5 = m.stub(c5, 1, 0, "O"), c2 = m.stub(c3, 1, 0), c1 = m.stub(o5, 0.5, C30);
    m.bond(c2, c1);
    m.stub(c3, -0.5, C30, "HO");
    m.stub(c2, 0.5, C30, "OH");
    m.stub(m.stub(c5, -0.5, -C30), 0.5, -C30, "OH");
    return { c1, c4 };
  }
  __name(ring, "ring");
  function glucose() {
    const m = mol(), c4 = m.atom(-1, 0);
    m.stub(c4, -1, 0, "HO");
    m.stub(ring(m, c4).c1, 1, 0, "OH");
    return m;
  }
  __name(glucose, "glucose");
  function cellulose(n) {
    const m = mol();
    let c4 = m.atom(-1, 0);
    m.stub(c4, -1, 0, "HO");
    for (let i = 0; i < n; i++) c4 = m.stub(m.stub(ring(m, c4).c1, C30, 0.5, "O"), C30, -0.5);
    return m;
  }
  __name(cellulose, "cellulose");
  function peptide(n) {
    const m = mol();
    let at = m.atom(0, 0, "N");
    for (let k = 1; k < 3 * n; k++) {
      at = m.stub(at, C30, k % 2 ? -0.5 : 0.5, k % 3 === 0 ? "NH" : null);
      if (k % 3 === 1) m.stub(at, 0, k % 2 ? -1 : 1, "R");
      if (k % 3 === 2) m.stub(at, 0, k % 2 ? -1 : 1, "O", 2);
    }
    return m;
  }
  __name(peptide, "peptide");
  function water() {
    const m = mol(), o = m.atom(0, 0, "O");
    m.stub(o, -0.79, 0.61, "H");
    m.stub(o, 0.79, 0.61, "H");
    return m;
  }
  __name(water, "water");
  var made = {};
  var once = /* @__PURE__ */ __name((key, fn) => made[key] ??= fn(), "once");
  var MOL = {
    get lycopene() {
      return once("lycopene", lycopene);
    },
    get ascorbic() {
      return once("ascorbic", ascorbic);
    },
    get tocopherol() {
      return once("tocopherol", tocopherol);
    },
    get glucose() {
      return once("glucose", glucose);
    },
    get water() {
      return once("water", water);
    },
    cellulose: /* @__PURE__ */ __name((n) => once(`cellulose${n}`, () => cellulose(n)), "cellulose"),
    peptide: /* @__PURE__ */ __name((n) => once(`peptide${n}`, () => peptide(n)), "peptide")
  };
  function drawMolecule(ctx, M, { x = 0, y = 0, L: L2 = 50, rot: rot2 = 0, k = 1, color = "text", ink = "panel", shade = "bg", alpha = 1 } = {}) {
    const drawn = Math.max(0, Math.min(1, k)) * M.bonds.length;
    if (!(drawn > 0) || !(alpha > 3e-3)) return;
    const cs = Math.cos(rot2), sn = Math.sin(rot2), P = M.atoms.map(([ax, ay]) => [x + (ax * cs - ay * sn) * L2, y + (ax * sn + ay * cs) * L2]);
    const w = Math.max(4, 0.19 * L2), seen2 = /* @__PURE__ */ new Set(), g = ctx.g, a0 = g.globalAlpha;
    g.globalAlpha = a0 * alpha;
    const pass = /* @__PURE__ */ __name((dx, dy, col, letters) => {
      M.bonds.forEach(([i, j, order], n) => {
        const f = Math.min(1, drawn - n);
        if (f <= 0) return;
        const [x0, y0] = P[i], x1 = x0 + (P[j][0] - x0) * f, y1 = y0 + (P[j][1] - y0) * f;
        ctx.line(x0 + dx, y0 + dy, x1 + dx, y1 + dy, { color: col, width: w });
        if (Math.abs(order) === 2) {
          const len = Math.hypot(P[j][0] - x0, P[j][1] - y0) || 1, nx = -(P[j][1] - y0) / len * 0.21 * L2 * Math.sign(order), ny = (P[j][0] - x0) / len * 0.21 * L2 * Math.sign(order);
          const u0 = 0.16, u1 = Math.min(0.84, f);
          if (u1 > u0) ctx.line(x0 + (P[j][0] - x0) * u0 + nx + dx, y0 + (P[j][1] - y0) * u0 + ny + dy, x0 + (P[j][0] - x0) * u1 + nx + dx, y0 + (P[j][1] - y0) * u1 + ny + dy, { color: col, width: w * 0.62 });
        }
        seen2.add(i);
        if (f >= 1) seen2.add(j);
      });
      for (const i of seen2) {
        const label = M.atoms[i][2];
        if (!label) continue;
        const [px, py] = P[i], r = 0.34 * L2;
        if (label.length === 1) ctx.circle(px + dx, py + dy, r, { fill: true, color: col });
        else ctx.rrect(px + dx - 0.52 * L2, py + dy - r, 1.04 * L2, 2 * r, r, { fill: col });
        if (letters) ctx.text(label, px, py + 0.15 * L2, { size: 0.42 * L2, weight: 800, font: "mono", align: "center", color: ink });
      }
    }, "pass");
    if (shade) pass(0.13 * L2, 0.13 * L2, shade, false);
    pass(0, 0, color, true);
    g.globalAlpha = a0;
  }
  __name(drawMolecule, "drawMolecule");
  function formula(ctx, str, x, y, { size = 26, color = "text", weight = 700, alpha = 1 } = {}) {
    let cx = x;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i], low = /[0-9]/.test(ch) || ch === "n" && str[i - 1] === ")", s = low ? size * 0.68 : size;
      ctx.text(ch, cx, y + (low ? size * 0.2 : 0), { size: s, weight, font: "mono", color, alpha });
      cx += ctx.cw(s);
    }
    return cx - x;
  }
  __name(formula, "formula");

  // nyan-source:src/scenes/objects.js
  var TAU6 = Math.PI * 2;
  function curve(pairs) {
    return (x) => {
      const n = pairs.length;
      if (x <= pairs[0][0]) return pairs[0][1];
      if (x >= pairs[n - 1][0]) return pairs[n - 1][1];
      let i = 0;
      while (x > pairs[i + 1][0]) i++;
      const p0 = pairs[Math.max(0, i - 1)][1], p1 = pairs[i][1], p2 = pairs[i + 1][1], p3 = pairs[Math.min(n - 1, i + 2)][1];
      const u = (x - pairs[i][0]) / (pairs[i + 1][0] - pairs[i][0]), u2 = u * u, u3 = u2 * u;
      return 0.5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (3 * p1 - p0 - 3 * p2 + p3) * u3);
    };
  }
  __name(curve, "curve");
  function dataText(card2, fallback, tail = "per_100g") {
    const rows = (card2?.rows ?? []).map((r) => `${r.label.toLowerCase().replace(/[\s,]+/g, "_")}:${r.value.replace(/\s+/g, "")}`);
    return rows.length ? `${[...rows, tail].filter(Boolean).join(" ")} `.replace(/ /g, "·") : fallback;
  }
  __name(dataText, "dataText");
  var DRAIN = { run: 0.3, spread: 0.17 };
  var GIVEN = DRAIN.run + DRAIN.spread;
  function piece(ctx, pts, field, { SP, glyph, key, inks, decode = null, give = -1, stream = true, seed = 0, edgeW = 3 }) {
    const g = ctx.g, cw = ctx.cw(glyph);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    const dst = { x: Math.floor(x0 / cw) * cw, y: Math.floor(y0 / glyph) * glyph, w: 0, h: 0 };
    dst.w = Math.ceil((x1 - dst.x) / cw) * cw;
    dst.h = Math.ceil((y1 - dst.y) / glyph) * glyph;
    const f = /* @__PURE__ */ __name((u, v) => field(dst.x + u * dst.w, dst.y + v * dst.h), "f"), rows = Math.round(dst.h / glyph);
    const plate2 = /* @__PURE__ */ __name((o) => glyphPlate(ctx, f, dst, { size: glyph, key, edge: { role: SP.light, weight: 800 }, ...o }), "plate");
    if (give < 0) {
      ctx.poly(pts, { close: true, fill: true, color: SP.dark });
      ctx.clipPath(pts, () => plate2({ inks, decode }));
    } else {
      const reach = 1920 - dst.x + 120;
      const shift = /* @__PURE__ */ __name((j) => reach * clamp((give - DRAIN.spread * (0.62 * (j / rows) + 0.38 * rand(seed, j))) / DRAIN.run) ** 2.2, "shift");
      const strips = /* @__PURE__ */ __name((color) => {
        for (let j = 0; j < rows; j++) {
          const dx = shift(j);
          if (dx >= reach) continue;
          g.save();
          g.beginPath();
          g.rect(-200, dst.y + j * glyph, 2400, glyph + 0.6);
          g.clip();
          g.translate(dx, 0);
          ctx.poly(pts, { close: true, fill: true, color });
          g.restore();
        }
      }, "strips");
      ctx.clipPath(pts, () => {
        strips(SP.dark);
        plate2({ inks, shift });
      });
      if (stream) {
        g.save();
        g.beginPath();
        g.rect(-200, -200, 2400, 1500);
        g.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
        g.closePath();
        g.clip("evenodd");
        strips("text");
        const cream = {};
        for (const k of Object.keys(inks)) cream[k] = { ...inks[k], role: "sub", alpha: 1, bg: null };
        plate2({ inks: cream, edge: false, shift });
        g.restore();
        ctx._font = "";
      }
    }
    ctx.poly(pts, { close: true, color: SP.light, width: edgeW });
  }
  __name(piece, "piece");
  function cap(ctx, shapes, SH, lw) {
    for (const pts of shapes) {
      ctx.poly(pts.map(([x, y]) => [x + SH[0] * 0.6, y + SH[1] * 0.6]), { close: true, fill: true, color: "bg" });
      ctx.poly(pts, { close: true, color: "bg", width: lw * 2 });
      ctx.poly(pts, { close: true, fill: true, color: "me" });
    }
  }
  __name(cap, "cap");
  var Y0 = -0.8;
  var Y1 = 1;
  var WIDTH = curve([[-0.8, 0], [-0.77, 0.13], [-0.66, 0.2], [-0.4, 0.245], [-0.05, 0.31], [0.3, 0.4], [0.6, 0.44], [0.8, 0.4], [0.93, 0.27], [0.985, 0.13], [1, 0]]);
  var SPINE = /* @__PURE__ */ __name((y) => 0.3 * Math.sin((y + 0.3) * 1.15) - 0.08, "SPINE");
  var TILT = 0.62;
  var CUT = { y: 0.3, slope: 0.3 };
  var half = /* @__PURE__ */ __name((y) => Math.max(0, WIDTH(y)), "half");
  function bodyPts(ya = Y0, yb = Y1, n = 56) {
    const R = [], L2 = [];
    for (let i = 0; i <= n; i++) {
      const y = lerp(ya, yb, i / n);
      R.push([SPINE(y) + half(y), y]);
      L2.push([SPINE(y) - half(y), y]);
    }
    return [...R, ...L2.reverse()];
  }
  __name(bodyPts, "bodyPts");
  function eggplant(ctx, env, { cx = 960, cy = 540, s = 400, tilt = TILT, open = 0, give = -1, stream = true, decode = 1, glyph = 15, t = 0, alpha = 1, key = "eggplant" } = {}) {
    const SP = env.cfg.spot.eggplant, cs = Math.cos(tilt), sn = Math.sin(tilt), k = clamp(open), e = easeOut(k);
    const text = dataText((env.script.cards_section6 ?? [])[0], "water:92g·");
    const cutY = /* @__PURE__ */ __name((x) => CUT.y + CUT.slope * (x - SPINE(CUT.y)), "cutY"), gap2 = 0.34 * e, turn = 0.13 * e;
    const toScreen = /* @__PURE__ */ __name((x, y, lower = false) => {
      if (lower) {
        const px = x - SPINE(CUT.y), py = y - CUT.y, c = Math.cos(turn), n = Math.sin(turn);
        x = SPINE(CUT.y) + px * c - py * n + 0.1 * gap2;
        y = CUT.y + px * n + py * c + gap2;
      }
      return [cx + (x * cs - (y - 0.1) * sn) * s, cy + (x * sn + (y - 0.1) * cs) * s];
    }, "toScreen");
    const toLocal = /* @__PURE__ */ __name((X, Y, lower = false) => {
      const dx = (X - cx) / s, dy = (Y - cy) / s;
      let x = dx * cs + dy * sn, y = -dx * sn + dy * cs + 0.1;
      if (lower) {
        const px = x - SPINE(CUT.y) - 0.1 * gap2, py = y - CUT.y - gap2, c = Math.cos(turn), n = Math.sin(turn);
        x = SPINE(CUT.y) + px * c + py * n;
        y = CUT.y - px * n + py * c;
      }
      return [x, y];
    }, "toLocal");
    const inBody = /* @__PURE__ */ __name((x, y) => y > Y0 && y < Y1 && Math.abs(x - SPINE(y)) < half(y), "inBody");
    const split2 = /* @__PURE__ */ __name((lower) => {
      const pts = bodyPts(), out = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length], ia = a[1] > cutY(a[0]), ib = b[1] > cutY(b[0]);
        if (ia === lower) out.push(a);
        if (ia !== ib) {
          let lo = 0, hi = 1;
          for (let q = 0; q < 18; q++) {
            const m = (lo + hi) / 2, x = lerp(a[0], b[0], m), y = lerp(a[1], b[1], m);
            if (y > cutY(x) === ia) lo = m;
            else hi = m;
          }
          out.push([lerp(a[0], b[0], lo), lerp(a[1], b[1], lo)]);
        }
      }
      return out;
    }, "split");
    const upper = k > 0 ? split2(false).map(([x, y]) => toScreen(x, y)) : bodyPts().map(([x, y]) => toScreen(x, y));
    const lowerPts = k > 0 ? split2(true).map(([x, y]) => toScreen(x, y, true)) : null;
    const g = ctx.g, a0 = g.globalAlpha, gone = give < 0 ? 0 : clamp(give / 0.1);
    g.globalAlpha = a0 * alpha;
    const SH = [0.045 * s, 0.045 * s];
    for (const pts of [upper, lowerPts]) if (pts) ctx.poly(pts.map(([x, y]) => [x + SH[0], y + SH[1]]), { close: true, fill: true, color: "bg" });
    const face = /* @__PURE__ */ __name((lower) => {
      const c = toScreen(SPINE(CUT.y), CUT.y, lower), w = half(CUT.y) * s * 1.02, ang = tilt + Math.atan(CUT.slope) + (lower ? turn : 0), hh = w * 0.34 * e;
      if (hh < 2) return;
      ctx.at(c[0], c[1], () => {
        if (gone < 1) {
          g.globalAlpha = a0 * alpha * (1 - gone);
          g.beginPath();
          g.ellipse(0, 0, w, hh, 0, 0, TAU6);
          g.fillStyle = ctx.col(SP.dark, 1);
          g.fill();
          g.beginPath();
          g.ellipse(0, 0, w * 0.9, hh * 0.8, 0, 0, TAU6);
          g.fillStyle = ctx.col(SP.light, 1);
          g.fill();
          g.fillStyle = ctx.col("bg", 1);
          for (const [rr, n, ph] of [[0.62, 9, 0.2], [0.3, 5, 0.9]]) for (let i = 0; i < n; i++) {
            const a = ph + i / n * TAU6;
            g.beginPath();
            g.ellipse(Math.cos(a) * w * 0.9 * rr, Math.sin(a) * hh * 0.8 * rr, w * 0.06, hh * 0.13, a, 0, TAU6);
            g.fill();
          }
          g.globalAlpha = a0 * alpha;
        }
        if (gone > 0) {
          g.beginPath();
          g.ellipse(0, 0, w, hh, 0, 0, TAU6);
          g.strokeStyle = ctx.col(SP.light, gone);
          g.lineWidth = Math.max(2, s * 7e-3);
          g.stroke();
        }
      }, { rot: ang });
    }, "face");
    const one = /* @__PURE__ */ __name((pts, lower) => {
      const field = /* @__PURE__ */ __name((X, Y) => {
        const [x, y] = toLocal(X, Y, lower);
        if (!inBody(x, y) || k > 0 && y > cutY(x) !== lower) return 0;
        const q = (x - SPINE(y)) / half(y);
        return q > -0.78 && q < -0.36 && y > -0.5 && y < 0.78 - 0.5 * (q + 0.78) ? 2 : q > 0.46 + 0.2 * y ? 3 : 1;
      }, "field");
      piece(ctx, pts, field, {
        SP,
        glyph,
        give,
        stream,
        seed: lower ? 71 : 70,
        edgeW: Math.max(2, s * 7e-3),
        key: `${key}|${lower ? "L" : "U"}|${cx.toFixed(1)},${cy.toFixed(1)},${s.toFixed(1)},${tilt}|${k.toFixed(3)}`,
        decode: decode < 1 ? { k: decode, t, seed: 31 } : null,
        inks: { 1: { role: SP.base, weight: 800, text }, 2: { role: SP.light, weight: 800, text, bg: SP.base }, 3: { role: SP.base, weight: 400, text: text.replace(/[a-z_]/g, "."), alpha: 0.75 } }
      });
    }, "one");
    if (lowerPts) {
      face(true);
      one(lowerPts, true);
      face(false);
    }
    one(upper, false);
    if (k > 0.02 && k < 1) {
      const a = toScreen(SPINE(CUT.y) - 0.95, cutY(SPINE(CUT.y) - 0.95)), b = toScreen(SPINE(CUT.y) + 0.95, cutY(SPINE(CUT.y) + 0.95));
      ctx.line(a[0], a[1], b[0], b[1], { color: SP.light, width: 5, alpha: 1 - k });
    }
    const at = /* @__PURE__ */ __name((x, y) => {
      const X = SPINE(Y0) + x, Y = Y0 + 0.03 + y;
      return [cx + (X * cs - (Y - 0.1) * sn) * s, cy + (X * sn + (Y - 0.1) * cs) * s];
    }, "at");
    const top = at(0, 0);
    const cal = sparkOutline(0, 0, 1, { rot: Math.PI / 7, n: 168, rays: 7, inner: 0.5 }).map(([x, y]) => {
      const down = Math.max(0, y) ** 0.8;
      return at(x * (0.3 + 0.12 * down), y * (0.2 + 0.36 * down) - 0.03);
    });
    const stem = [[-0.07, -0.02], [-0.085, -0.2], [-0.05, -0.36], [0.06, -0.43], [0.15, -0.38], [0.1, -0.3], [0.07, -0.2], [0.075, -0.02]].map(([x, y]) => at(x, y));
    cap(ctx, [stem, cal], SH, Math.max(4, s * 0.014));
    g.globalAlpha = a0;
    return { hull: bodyPts().map(([x, y]) => toScreen(x, y)), top };
  }
  __name(eggplant, "eggplant");
  var T_ELL = [[-0.34, -0.02, 0.72, 0.8], [0.34, -0.02, 0.72, 0.8], [0, 0.1, 1, 0.74]];
  var tIn = /* @__PURE__ */ __name((x, y) => T_ELL.some(([ex, ey, rx, ry]) => ((x - ex) / rx) ** 2 + ((y - ey) / ry) ** 2 < 1), "tIn");
  var T_OUT = Array.from({ length: 200 }, (_, i) => {
    const a = i / 200 * TAU6 - Math.PI / 2, c = Math.cos(a), sn = Math.sin(a);
    let r = 0;
    for (const [ex, ey, rx, ry] of T_ELL) {
      const A = (c / rx) ** 2 + (sn / ry) ** 2, B = -2 * (c * ex / rx ** 2 + sn * ey / ry ** 2), C = (ex / rx) ** 2 + (ey / ry) ** 2 - 1;
      r = Math.max(r, (-B + Math.sqrt(B * B - 4 * A * C)) / (2 * A));
    }
    return [c * r, sn * r];
  });
  var T_CUT = 0.02;
  var T_W = 1.058;
  var T_TILT = -0.09;
  function tomato(ctx, env, { cx = 960, cy = 540, s = 320, open = 0, give = -1, stream = true, decode = 1, glyph = 15, t = 0, alpha = 1, key = "tomato" } = {}) {
    const SP = env.cfg.spot.tomato, cs = Math.cos(T_TILT), sn = Math.sin(T_TILT), k = clamp(open), e = easeOut(k);
    const text = dataText((env.script.cards_section6 ?? [])[1], "vitamin_c:13.7mg·");
    const up = 0.2 * e, down = 0.27 * e, hh = 0.25 * T_W * e, turn = -0.07 * e;
    const front = /* @__PURE__ */ __name((x) => hh * Math.sqrt(Math.max(0, 1 - (x / T_W) ** 2)), "front");
    const toScreen = /* @__PURE__ */ __name((x, y, lid2 = false) => {
      if (lid2) {
        const py = y - T_CUT, c = Math.cos(turn), n = Math.sin(turn);
        const X = x * c - py * n - 0.05 * e, Y = T_CUT + x * n + py * c - up;
        x = X;
        y = Y;
      } else y += down;
      return [cx + (x * cs - y * sn) * s, cy + (x * sn + y * cs) * s];
    }, "toScreen");
    const toLocal = /* @__PURE__ */ __name((X, Y, lid2 = false) => {
      const dx = (X - cx) / s, dy = (Y - cy) / s;
      let x = dx * cs + dy * sn, y = -dx * sn + dy * cs;
      if (lid2) {
        const px = x + 0.05 * e, py = y - T_CUT + up, c = Math.cos(turn), n = Math.sin(turn);
        x = px * c + py * n;
        y = T_CUT - px * n + py * c;
      } else y -= down;
      return [x, y];
    }, "toLocal");
    const arc = /* @__PURE__ */ __name((sign, n = 40) => Array.from({ length: n + 1 }, (_, i) => {
      const x = lerp(T_W, -T_W, i / n);
      return [x, T_CUT + sign * front(x)];
    }), "arc");
    const above = T_OUT.filter(([, y]) => y < T_CUT), below = T_OUT.filter(([, y]) => y >= T_CUT);
    const i0 = above.findIndex(([x], i) => i > 0 && x < 0 && above[i - 1][0] > 0);
    const lidLocal = [...above.slice(i0), ...above.slice(0, i0), ...arc(1)], lowLocal = [...below, ...arc(-1).reverse()];
    const whole = T_OUT.map(([x, y]) => toScreen(x, y));
    const lid = k > 0 ? lidLocal.map(([x, y]) => toScreen(x, y, true)) : whole;
    const low = k > 0 ? lowLocal.map(([x, y]) => toScreen(x, y)) : null;
    const g = ctx.g, a0 = g.globalAlpha, gone = give < 0 ? 0 : clamp(give / 0.1);
    g.globalAlpha = a0 * alpha;
    const SH = [0.05 * s, 0.05 * s];
    for (const pts of [lid, low]) if (pts) ctx.poly(pts.map(([x, y]) => [x + SH[0], y + SH[1]]), { close: true, fill: true, color: "bg" });
    const ink = /* @__PURE__ */ __name((x, y) => ((x + 0.44) / 0.25) ** 2 + ((y + 0.3) / 0.33) ** 2 < 1 ? 2 : (x + 0.16) ** 2 + (y + 0.2) ** 2 > 1 ? 3 : 1, "ink");
    const one = /* @__PURE__ */ __name((pts, isLid) => {
      const field = /* @__PURE__ */ __name((X, Y) => {
        const [x, y] = toLocal(X, Y, isLid);
        if (!tIn(x, y) || k > 0 && y < T_CUT + front(x) !== isLid) return 0;
        return ink(x, y);
      }, "field");
      piece(ctx, pts, field, {
        SP,
        glyph,
        give,
        stream,
        seed: isLid ? 80 : 81,
        edgeW: Math.max(2, s * 8e-3),
        key: `${key}|${isLid ? "U" : "L"}|${cx.toFixed(1)},${cy.toFixed(1)},${s.toFixed(1)}|${k.toFixed(3)}`,
        decode: decode < 1 ? { k: decode, t, seed: 37 } : null,
        inks: { 1: { role: SP.base, weight: 800, text }, 2: { role: SP.light, weight: 800, text, bg: SP.base }, 3: { role: SP.base, weight: 400, text: text.replace(/[a-z_]/g, "."), alpha: 0.75 } }
      });
    }, "one");
    if (low) {
      one(low, false);
      const c = toScreen(0, T_CUT), w = T_W * s, h = hh * s;
      if (h > 2) ctx.at(c[0], c[1], () => {
        if (gone < 1) {
          g.globalAlpha = a0 * alpha * (1 - gone);
          g.beginPath();
          g.ellipse(0, 0, w, h, 0, 0, TAU6);
          g.fillStyle = ctx.col(SP.dark, 1);
          g.fill();
          g.beginPath();
          g.ellipse(0, 0, w * 0.93, h * 0.86, 0, 0, TAU6);
          g.fillStyle = ctx.col(SP.light, 1);
          g.fill();
          g.save();
          g.scale(w * 0.93, h * 0.86);
          g.lineCap = "round";
          for (let i = 0; i < 4; i++) {
            const a = 0.25 + i / 4 * TAU6;
            g.beginPath();
            g.arc(0, 0, 0.54, a, a + 1.08);
            g.strokeStyle = ctx.col("bg", 1);
            g.lineWidth = 0.4;
            g.stroke();
            g.fillStyle = ctx.col(SP.light, 1);
            for (const [da, rr] of [[0.16, 0.48], [0.54, 0.62], [0.92, 0.48]]) {
              g.beginPath();
              g.ellipse(Math.cos(a + da) * rr, Math.sin(a + da) * rr, 0.075, 0.045, a + da, 0, TAU6);
              g.fill();
            }
          }
          g.restore();
          g.globalAlpha = a0 * alpha;
        }
        if (gone > 0) {
          g.beginPath();
          g.ellipse(0, 0, w, h, 0, 0, TAU6);
          g.strokeStyle = ctx.col(SP.light, gone);
          g.lineWidth = Math.max(2, s * 8e-3);
          g.stroke();
        }
      }, { rot: T_TILT });
    }
    one(lid, true);
    if (k > 0.02 && k < 1) {
      const a = toScreen(-1.3, T_CUT), b = toScreen(1.3, T_CUT), mid = (down + up) * s * 0.5;
      ctx.line(a[0], a[1] - mid, b[0], b[1] - mid, { color: SP.light, width: 5, alpha: 1 - k });
    }
    const at = /* @__PURE__ */ __name((x, y) => toScreen(x, -0.735 + y, k > 0), "at");
    const cal = sparkOutline(0, 0, 1, { rot: Math.PI / 7, n: 168, rays: 7, inner: 0.42 }).map(([x, y]) => {
      const dn = Math.max(0, y) ** 0.8;
      return at(x * (0.5 + 0.1 * dn), y * (0.12 + 0.2 * dn) + 0.02);
    });
    const stem = [[-0.06, 0], [-0.07, -0.14], [-0.03, -0.27], [0.07, -0.31], [0.13, -0.26], [0.08, -0.2], [0.06, -0.12], [0.065, 0]].map(([x, y]) => at(x, y));
    const top = at(0, 0);
    cap(ctx, [stem, cal], SH, Math.max(4, s * 0.015));
    g.globalAlpha = a0;
    return { hull: whole, top };
  }
  __name(tomato, "tomato");

  // nyan-source:src/scenes/plates_verse2.js
  var TAU7 = Math.PI * 2;
  var FOOT = 846;
  var CAP = { x: 120, y: 104, size: 56 };
  var flashIn2 = /* @__PURE__ */ __name((t, at) => t < at ? 0 : clamp(0.6 + (t - at) * 30), "flashIn");
  function sheet(ctx, light = [930, 450, 600, "raised", 1]) {
    ctx.fx.glow = Math.min(ctx.fx.glow, 0.3);
    ground(ctx, { light });
    ctx.rect(0, FOOT, 1920, 1080 - FOOT, { fill: true, color: "raised", alpha: 0.32 });
    ctx.line(0, FOOT, 1920, FOOT, { color: "line", width: 2 });
  }
  __name(sheet, "sheet");
  function caption(ctx, env, t, lines) {
    const { lyrics } = env;
    band(ctx, lines.map((i) => ({ text: lyrics.lines[i].text, at: lyrics.start(i), until: lyrics.start(i + 1), n: lyrics.typed(i, t).n })), t, CAP);
  }
  __name(caption, "caption");
  function typing(ctx, t, next) {
    if (!next || t < next.from - 0.25) return;
    const o = { size: 34, weight: 500 }, full = next.text, n = Math.floor(prog(t, next.from, next.to) * full.length + 1e-6);
    const x = 1826 - ctx.measure(full, o), y = 1056, shown = full.slice(0, n);
    ctx.text(shown, x, y, { ...o, color: "text" });
    if (n < full.length || Math.floor(t * 2.2) % 2 === 0) ctx.rect(x + ctx.measure(shown, o) + 4, y - 29, 3, 36, { fill: true, color: "text" });
  }
  __name(typing, "typing");
  var word = /* @__PURE__ */ __name((ctx, P, color = "text") => keyword(ctx, P.word, P.t, { y: 1e3, maxW: 1740, maxSize: 214, at: P.hit, color, shade: "bg", off: [9, 9] }), "word");
  var GIFT = {
    eggplant: /* @__PURE__ */ __name(() => [
      // (its water, 92 g of every 100, is left out: three molecules read, more do not)
      { m: MOL.cellulose(6), x: 770, y: 712, L: 50, t: [0.03, 0.32], row: 2, cap: [-636, 690] },
      { m: MOL.peptide(6), x: 1262, y: 256, L: 50, t: [0.08, 0.3], row: 3, cap: [-1884, 372] },
      { m: MOL.glucose, x: 1480, y: 464, L: 40, t: [0.13, 0.3], row: 1, cap: [1628, 456] }
    ], "eggplant"),
    tomato: /* @__PURE__ */ __name(() => [
      { m: MOL.lycopene, x: 640, y: 482, L: 48, t: [0.03, 0.32], row: 1, cap: [-1884, 380] },
      { m: MOL.ascorbic, x: 1556, y: 262, L: 60, t: [0.09, 0.28], row: 0, cap: [1236, 84] },
      { m: MOL.tocopherol, x: 1350, y: 690, L: 54, t: [0.13, 0.36], row: 2, cap: [1548, 590] }
    ], "tomato")
  };
  function gift(ctx, env, kind, since) {
    if (since < 0) return;
    const rows = (env.script.cards_section6 ?? [])[kind === "tomato" ? 1 : 0]?.rows ?? [], drift = 26 * Math.max(0, since - 0.3);
    for (const q of GIFT[kind]()) {
      const k = easeOut(prog(since, q.t[0], q.t[1])), row = rows[q.row];
      drawMolecule(ctx, q.m, { x: q.x + drift, y: q.y, L: q.L, k });
      if (!row || k <= 0) continue;
      const a = clamp((since - q.t[0]) * 12), o = { size: 24, weight: 600 }, f = row.formula ?? "", gap2 = 2 * ctx.cw(24);
      const w = Math.max(ctx.measure(row.label, o), formula(ctx, f, 0, 0, { size: 24, alpha: 0 }) + gap2 + ctx.cw(24) * row.value.length);
      const x = q.cap[0] < 0 ? -q.cap[0] - w : q.cap[0], y = q.cap[1];
      ctx.text(row.label, x, y, { ...o, color: "text", alpha: a });
      ctx.text(row.value, x + formula(ctx, f, x, y + 32, { size: 24, alpha: a }) + gap2, y + 32, { size: 24, font: "mono", color: "sub", alpha: a });
    }
  }
  __name(gift, "gift");
  function plateFruit(ctx, env, P) {
    const { t, at, kind, settle, open, hit } = P, a = flashIn2(t, at), cut = t - open;
    sheet(ctx);
    const draw = kind === "tomato" ? tomato : eggplant, at0 = kind === "tomato" ? { cx: 930, cy: 478, s: 306 } : { cx: 950, cy: 452, s: 356, tilt: 0.8 };
    const k = 1 + 0.045 * pulse(t - at, 16);
    if (a > 0) ctx.at(at0.cx * (1 - k), at0.cy * (1 - k), () => draw(ctx, env, { ...at0, alpha: a, t, decode: prog(t, at, settle), open: prog(t, open, open + 0.2), give: t >= hit ? t - hit : -1, stream: false }), { scale: k });
    gift(ctx, env, kind, t - hit);
    ctx.fx.shake = [6 * pulse(cut, 14) * Math.sin(cut * 90), 4 * pulse(cut, 14) * Math.cos(cut * 70)];
    caption(ctx, env, t, P.lines);
    typing(ctx, t, P.next);
    word(ctx, P);
  }
  __name(plateFruit, "plateFruit");
  var FIG = { x: 240, y: 180, w: 840, h: 1120 };
  var PURR = { y: 470, x0: 1118, x1: 1858, h: 238, w: 36, amp: [0.5, 0.82, 0.62, 1, 0.7, 0.92, 0.56, 0.8, 1, 0.66, 0.88, 0.58, 0.44] };
  function glyphFigure(ctx, env, name, dst, { text, key, decode = null, size = 15 }) {
    const { art } = env, cw = ctx.cw(size);
    art.inks(ctx, name, dst, { roles: { cream: "mute", orange: "meDim", black: "panel" } });
    const grid = { x: Math.floor(dst.x / cw) * cw, y: Math.floor(dst.y / size) * size, w: 0, h: 0 };
    grid.w = Math.ceil((dst.x + dst.w - grid.x) / cw) * cw;
    grid.h = Math.ceil((dst.y + dst.h - grid.y) / size) * size;
    const field = /* @__PURE__ */ __name((u, v) => art.inkAt(name, (grid.x + u * grid.w - dst.x) / dst.w, (grid.y + v * grid.h - dst.y) / dst.h), "field");
    art.inkClip(ctx, name, dst, () => glyphPlate(ctx, field, grid, {
      size,
      key: `${key}|${name}|${dst.x.toFixed(1)},${dst.y.toFixed(1)}`,
      decode,
      inks: { 1: { role: "text", weight: 800, text }, 2: { role: "meHot", weight: 800, text }, 3: { role: "line", weight: 400, text: text.replace(/[a-z_]/gi, ".") } },
      edge: { role: "me", weight: 800 }
    }));
  }
  __name(glyphFigure, "glyphFigure");
  var stripe = /* @__PURE__ */ __name((h, flip) => [[0, -h], [0.5, -0.3 * h], [0.4, 0.5 * h], [0, h], [-0.5, 0.25 * h], [-0.42, -0.55 * h]].map(([x, y]) => [x * PURR.w * (flip ? -1 : 1), y]), "stripe");
  function purr(ctx, P) {
    const { t, at, develop, hit } = P, n = PURR.amp.length, pitch = (PURR.x1 - PURR.x0) / (n - 1), since = t - hit, g = ctx.g;
    const drawn = easeOut(prog(t, at + 0.05, at + 0.4));
    ctx.line(PURR.x0 - 30, PURR.y, lerp(PURR.x0 - 30, PURR.x1 + 30, drawn), PURR.y, { color: "line", width: 3 });
    for (let i = 0; i < n; i++) {
      const x = PURR.x0 + i * pitch, grow = easeBack(prog(t, develop + i * 0.014, develop + i * 0.014 + 0.18));
      if (t < develop + i * 0.014) {
        if (x < lerp(PURR.x0 - 30, PURR.x1 + 30, drawn)) ctx.poly(stripe(PURR.h * PURR.amp[i], i % 2).map(([px, py]) => [x + px, PURR.y + py]), { close: true, color: "line", width: 2.5 });
        continue;
      }
      const breath = 1 + 0.09 * Math.sin(TAU7 * (t - develop) / 1.846 - i * 0.45) * prog(t, develop + 0.3, develop + 0.6);
      const h = PURR.h * PURR.amp[i] * grow * breath, pts = stripe(h, i % 2), put = /* @__PURE__ */ __name((dx, dy, o) => ctx.poly(pts.map(([px, py]) => [x + px + dx, PURR.y + py + dy]), { close: true, ...o }), "put");
      const t0 = 0.08 + 0.016 * (i * 5 % n);
      if (since < t0) {
        put(10, 10, { fill: true, color: "bg" });
        put(0, 0, { fill: true, color: since >= i * 6e-3 ? "text" : "me" });
        continue;
      }
      put(0, 0, { color: "meDim", width: 2.5 });
      const fly = 2300 * clamp((since - t0 - 0.05) / 0.36) ** 2.2, lane = 200 + 600 * (i * 5 % n) / (n - 1);
      if (fly - h > 1920 - x + 40) continue;
      ctx.at(x + fly, lerp(PURR.y, lane, easeOut(prog(since, t0, t0 + 0.2))), () => {
        g.translate(-x, -PURR.y);
        put(8, 8, { fill: true, color: "bg" });
        put(0, 0, { fill: true, color: "text" });
      }, { rot: Math.PI / 2 * easeInOut(prog(since, t0, t0 + 0.15)) });
    }
  }
  __name(purr, "purr");
  function plateCat(ctx, env, P) {
    const { t, at, ears, develop, hit } = P, { art } = env, g = ctx.g, a = flashIn2(t, at);
    sheet(ctx, [650, 520, 620, "raised", 1]);
    const text = dataText((env.script.cards_section6 ?? [])[2], "purr:25-150Hz·", ""), kf = FIG.w / 1086;
    const flower = /* @__PURE__ */ __name((name) => {
      const r = art.region(name, "flower");
      return r ? [r.x + r.w / 2, r.y + r.h / 2] : [760, 217];
    }, "flower");
    const fb = flower("f_bust"), fp = flower("cat_paws"), PAWS = { x: FIG.x + (fb[0] - fp[0]) * kf, y: FIG.y + (fb[1] - fp[1]) * kf, w: FIG.w, h: FIG.h };
    const CAT = art.fit("cat_bust", FIG) ?? FIG, dev = prog(t, develop, develop + 0.14), k = 1 + 0.04 * pulse(t - at, 16) + 0.03 * pulse(t - develop, 14);
    purr(ctx, P);
    if (a > 0) ctx.clip({ x: 0, y: 0, w: 1920, h: FOOT }, () => ctx.at(650 * (1 - k), 540 * (1 - k), () => {
      const a0 = g.globalAlpha;
      g.globalAlpha = a0 * a;
      if (dev < 1) {
        g.save();
        g.beginPath();
        g.rect(-100, PAWS.y + PAWS.h * dev, 2200, 1400);
        g.clip();
        if (t < ears) glyphFigure(ctx, env, "f_bust", FIG, { text, key: "v2cat", decode: t < at + 0.3 ? { k: prog(t, at, at + 0.3), t, seed: 43 } : null });
        else {
          const raw = prog(t, ears, ears + 0.18), kc = CAT.w / 1086, cat = /* @__PURE__ */ __name(() => glyphFigure(ctx, env, "cat_bust", CAT, { text, key: "v2cat" }), "cat");
          const boxes = raw < 1 ? [0, 1].map((i) => art.region("cat_bust", `ears.${i}`)).filter(Boolean).map((r) => ({ x: CAT.x + r.x * kc, y: CAT.y + r.y * kc, w: r.w * kc, h: r.h * kc })) : [];
          if (!boxes.length) cat();
          else {
            g.save();
            g.beginPath();
            g.rect(-100, -100, 2200, 1400);
            for (const b of boxes) g.rect(b.x, b.y, b.w, b.h);
            g.clip("evenodd");
            cat();
            g.restore();
            for (const b of boxes) ctx.at(b.x + b.w / 2, b.y + b.h, () => ctx.clip({ x: -b.w / 2, y: -b.h, w: b.w, h: b.h }, () => {
              g.translate(-(b.x + b.w / 2), -(b.y + b.h));
              cat();
            }), { sy: Math.max(0.03, easeBack(raw)) });
          }
        }
        g.restore();
        ctx._font = "";
      }
      if (dev > 0) {
        art.inks(ctx, "cat_paws", PAWS, { reveal: dev });
        if (dev < 1) ctx.rect(PAWS.x, PAWS.y + PAWS.h * dev - 5, PAWS.w, 10, { fill: true, color: "meHot" });
      }
      g.globalAlpha = a0;
    }, { scale: k }));
    caption(ctx, env, t, P.lines);
    typing(ctx, t, P.next);
    word(ctx, P);
  }
  __name(plateCat, "plateCat");
  var SLIDE = 640;
  function sun(ctx, cx, cy, k) {
    const g = ctx.g, r0 = 190, N2 = 28;
    for (const [role, pick, len, w] of [["meDim", 0, 800, 0.066], ["me", 1, 520, 0.03]]) {
      g.beginPath();
      for (let i = pick; i < N2; i += 2) {
        const an = i / N2 * TAU7 + 0.11, r1 = lerp(r0, len, k);
        g.moveTo(cx + Math.cos(an - w) * r0, cy + Math.sin(an - w) * r0);
        g.lineTo(cx + Math.cos(an) * r1, cy + Math.sin(an) * r1);
        g.lineTo(cx + Math.cos(an + w) * r0, cy + Math.sin(an + w) * r0);
        g.closePath();
      }
      g.fillStyle = ctx.col(role, 1);
      g.fill();
    }
    ctx.circle(cx, cy, r0 * 1.04, { fill: true, color: "meDim" });
  }
  __name(sun, "sun");
  function target(ctx, x, y, color) {
    ctx.circle(x, y, 13, { color, width: 3 });
    ctx.line(x - 24, y, x + 24, y, { color, width: 3 });
    ctx.line(x, y - 24, x, y + 24, { color, width: 3 });
  }
  __name(target, "target");
  function plateProof(ctx, env, P) {
    const { t, at, hit, bubble } = P, { art } = env, g = ctx.g, a = flashIn2(t, at), kf = FIG.w / 1086;
    const lit = clamp((t - P.sun) * 30);
    sheet(ctx, [650, 520, 620, "raised", 0.5 + 0.5 * lit]);
    const face = art.region("f_bust", "face") ?? { x: 367, y: 259, w: 313, h: 369 }, C = [FIG.x + (face.x + face.w / 2) * kf, FIG.y + (face.y + face.h / 2) * kf];
    const whole = t >= hit, dx = SLIDE * (1 - easeInOut(prog(t, P.slide, hit))), k = 1 + 0.03 * pulse(t - hit, 18);
    if (a > 0) ctx.clip({ x: 0, y: 0, w: 1920, h: FOOT }, () => {
      const a0 = g.globalAlpha;
      g.globalAlpha = a0 * a;
      if (t >= P.sun) sun(ctx, C[0], C[1], easeOut(prog(t, P.sun, P.sun + 0.12)));
      target(ctx, FIG.x - 96, 760, "mute");
      ctx.at(C[0] * (1 - k), C[1] * (1 - k), () => {
        if (whole) art.inks(ctx, "f_bust", FIG);
        else {
          art.inks(ctx, "f_bust", FIG, { roles: { cream: null } });
          if (t >= P.slide) {
            const ap = flashIn2(t, P.slide);
            for (const [role, o] of [["bg", [dx + 10, 10]], ["text", [dx, 0]]]) art.inks(ctx, "f_bust", FIG, { alpha: ap, plates: [{ ink: "cream", role, exact: true, offset: o }] });
          }
        }
      }, { scale: k });
      if (t >= P.slide) target(ctx, FIG.x - 96 + dx, 760, "text");
      g.globalAlpha = a0;
    });
    const b = youBox(ctx, bubble.text, bubble.size), bx = bubble.xr - b.w, rad = Math.min(b.h * 0.42, bubble.size * 0.95);
    ctx.rrect(bx + 10, bubble.y + 10, b.w, b.h, rad, { fill: "bg" });
    ctx.rrect(bx, bubble.y, b.w, b.h, rad, { fill: "text" });
    b.lines.forEach((ln, i) => ctx.text(ln, bx + b.padX, bubble.y + b.padY + (i + 0.76) * bubble.size * 1.28, { size: bubble.size, weight: 500, color: "bg" }));
    caption(ctx, env, t, P.lines);
    if (whole) ctx.glow("me", 30, () => word(ctx, P, "meHot"), 0.5);
    const go = easeInOut(prog(t, P.leave, P.until ?? P.leave + 0.5)), px = lerp(P.rest[0], P.to[0], go), py = lerp(P.rest[1], P.to[1], go), ps = lerp(P.restScale ?? 3.2, 1.5, go);
    arrow(ctx, px + 4 * ps, py + 4 * ps, ps, { color: "bg", edge: null });
    arrow(ctx, px, py, ps, { color: "text", edge: "bg" });
  }
  __name(plateProof, "plateProof");

  // nyan-source:src/scenes/06_verse2.js
  var REQ = [["nounEggplant", 44, 43], ["nounTomato", 47, 46], ["nounTabby", 50, 49], [null, 53, 52]];
  var PRE2_POINTER = (() => {
    const L2 = chatLayout({ side: 0 });
    return [L2.head.x + L2.head.w - 176 + 3, L2.head.y + 33 + 4];
  })();
  function verse2Shots(env) {
    const { art, script, lyrics, features } = env, { T, B, Bt, text } = cues(env);
    const CARDS = script.cards_section6 ?? [], BEATS = (script.sections ?? []).find((s) => s.n === 6)?.beats ?? [];
    const req = /* @__PURE__ */ __name((i) => CARDS[i]?.request ?? BEATS[i]?.you?.[0] ?? "", "req");
    const SEND = [B(40), Bt(167.5), Bt(175.5), Bt(183.5)], NOUN = [0, 1, 2].map((k) => features.snapHalf(cue(REQ[k][0]))), DARK = Bt(184.5), END = B(48);
    const W0 = chatLayout({ side: 0 }), TH = W0.thread, BTN = [W0.composer.x + W0.composer.w - 44, W0.composer.y + W0.composer.h - 40];
    const ROW = /* @__PURE__ */ __name((k) => k < 3 ? { prev: 502, you: [594, 36], me: [716, 50] } : { prev: 392, you: [470, 40], me: [626, 50] }, "ROW");
    const G = [{ x: 430, y: 452, w: 1060, h: 596.25 }, { x: 444, y: 470, w: 1030, h: 579.375 }, { x: 400, y: 440, w: 1100, h: 618.75 }, { x: 180, y: 380, w: 1371.43, h: 771.43 }];
    const CAM = G.map((r) => frameRect(r)), TILT2 = [0, -0.02, 0.016, 0];
    const onScreen = /* @__PURE__ */ __name((k, [x, y]) => [(x - 960 - CAM[k].x) * CAM[k].zoom + 960, (y - 540 - CAM[k].y) * CAM[k].zoom + 540], "onScreen");
    const REST = [1440, 590];
    function thrown(ctx, str, t, at, xr, y, size) {
      const fly = /* @__PURE__ */ __name((tt) => {
        const k = prog(tt, at, at + 0.28);
        if (k > 0) youBubble(ctx, xr, y + (1 - easeBack(k)) * 300, str, { size, alpha: clamp(k * 4) });
      }, "fly");
      if (t < at + 0.28) ctx.trail(4, 0.018, (tau) => fly(t - tau), 0.4);
      else fly(t);
    }
    __name(thrown, "thrown");
    function glimpse(ctx, t, k) {
      const cut = SEND[k], [, line, kw] = REQ[k], R = ROW(k), dark = k === 3 ? clamp((t - Bt(184)) * 30) : 0;
      room(ctx, { art, name: "tea", alpha: 0.5, t, dim: 0.5 });
      windowFrame(ctx, W0, { glass: 0.95 });
      ctx.radial(960, 700, 640, "meDim", 0.34);
      header(ctx, W0, { t, title: script.title ?? "", presence: "online" });
      meBubble(ctx, TH.x, R.prev, text(kw), { size: 30, weight: 700, hot: true, alpha: 0.6 });
      if (t >= T(line)) meIn(ctx, t, T(line), TH.x, R.me[0], text(line), { size: R.me[1], n: lyrics.typed(line, t).n, fly: 140 });
      composer(ctx, W0.composer, { placeholder: script.composer_placeholder ?? "", t, send: "busy" });
      burst(ctx, BTN[0], BTN[1], 46, (t - cut) / 0.45, { color: "text" });
      if (dark > 0) {
        const g = ctx.g;
        g.save();
        g.setTransform(ctx.scale, 0, 0, ctx.scale, 0, 0);
        ctx.rect(0, 0, 1920, 1080, { fill: true, color: "panel", alpha: 0.9 * dark });
        g.restore();
        ctx._font = "";
      }
      thrown(ctx, req(k), t, cut - 0.06, TH.x + TH.w, R.you[0], R.you[1]);
      if (dark > 0) {
        meBubble(ctx, TH.x, R.me[0], text(line), { size: R.me[1], n: lyrics.typed(line, t).n, alpha: dark });
        const b = youBubble(ctx, TH.x + TH.w, R.you[0], req(k), { size: R.you[1], alpha: 0 });
        ctx.rrect(b.x, b.y, b.w, b.h, Math.min(b.h * 0.42, R.you[1] * 0.95), { fill: "text", alpha: dark });
        b.lines.forEach((ln, i) => ctx.text(ln, b.x + b.padX, b.y + b.padY + (i + 0.76) * R.you[1] * 1.28, { size: R.you[1], weight: 500, color: "bg", alpha: dark }));
      }
      drawCursor(ctx, k === 3 ? [{ t: cut, x: BTN[0] + 3, y: BTN[1] + 4 }, { t: DARK, x: REST[0], y: REST[1] }] : [{ t: cut, x: BTN[0] + 3, y: BTN[1] + 4 }, { t: cut + 0.6, x: BTN[0] + 46, y: BTN[1] + 40 }], t, { scale: 1.5 });
    }
    __name(glimpse, "glimpse");
    const ask = /* @__PURE__ */ __name((k, until, moment, layout) => ({
      id: `v2-ask${k + 1}`,
      at: SEND[k],
      lines: [REQ[k][1], REQ[k][1]],
      palette: "warm",
      hud: 0,
      moment,
      layout,
      enter: { type: "cut" },
      camera: /* @__PURE__ */ __name((t) => {
        const p = prog(t, SEND[k], until), c = CAM[k];
        return k === 3 ? c : { x: c.x, y: c.y - 6 * p, zoom: c.zoom * (1 + 0.03 * p), rot: TILT2[k] };
      }, "camera"),
      render: /* @__PURE__ */ __name((ctx, t) => glimpse(ctx, t, k), "render")
    }), "ask");
    const next = /* @__PURE__ */ __name((k, a, z) => ({ text: req(k + 1), from: Bt(a), to: Bt(z) }), "next");
    const B4 = { text: req(3), xr: onScreen(3, [TH.x + TH.w, 0])[0], y: onScreen(3, [0, ROW(3).you[0]])[1], size: ROW(3).you[1] * CAM[3].zoom };
    return [
      ask(0, NOUN[0], "The user asks her to pretend to be an eggplant: the click on Send throws the request up out of the composer, and her answer begins under it.", "interface: close on the lower thread and the composer: the request flying up at the right, her line starting at the left"),
      {
        id: "v2-eggplant",
        at: NOUN[0],
        lines: [44, 46],
        palette: "warm",
        hud: 0,
        enter: { type: "cut" },
        layout: "PLATE: the eggplant leaning across the sheet in code characters and its own purple, her spark as its calyx; cut in two; then a hollow outline, its colour leaving to the right as cream; the keyword on the foot of the sheet",
        moment: "On the noun she IS the eggplant: its data set in characters, in its own colour. On the next downbeat it is cut open; on the keyword the colour leaves it and what it holds is drawn out of it in cream, as molecules: fibre, protein, sugar, each with its name, its formula and its weight. Only its outline is left. The user is already typing the next request; their click on Send ends the plate.",
        render: /* @__PURE__ */ __name((ctx, t) => plateFruit(ctx, env, { t, kind: "eggplant", at: NOUN[0], settle: cue("nounEggplantEnd"), open: Bt(164), hit: T(46), word: text(46), lines: [44, 45], next: next(0, 164.75, 166.75) }), "render")
      },
      ask(1, NOUN[1], "The next request is sent before her last word has died away: now a tomato.", "interface: the same corner of the thread, a little closer and tilted"),
      {
        id: "v2-tomato",
        at: NOUN[1],
        lines: [47, 49],
        palette: "warm",
        hud: 0,
        enter: { type: "cut" },
        layout: "PLATE: the tomato in the middle of the sheet in characters and its own red, the spark as its calyx; its top lifted off, the cut face showing; then hollow, its colour leaving to the right as cream; the keyword on the foot",
        moment: "On the noun she is the tomato. On the next downbeat its top is lifted off; on the keyword what it holds is drawn out of it in cream, as molecules: its own red (lycopene), vitamin C, vitamin E. The next request is typed at the foot of the sheet meanwhile.",
        render: /* @__PURE__ */ __name((ctx, t) => plateFruit(ctx, env, { t, kind: "tomato", at: NOUN[1], settle: cue("nounTomatoEnd"), open: Bt(172), hit: T(49), word: text(49), lines: [47, 48], next: next(1, 172.75, 174.9) }), "render")
      },
      ask(2, NOUN[2], "Third request, sent as fast as the others: a cat, a tabby.", "interface: the same corner of the thread, from a little further left"),
      {
        id: "v2-cat",
        at: NOUN[2],
        lines: [50, 52],
        palette: "warm",
        hud: 0,
        enter: { type: "cut" },
        layout: "PLATE: her bust at the left, first in code characters, then with cat ears, then printed in three solid inks with her paws up; her purr as a row of tabby stripes from her to the right edge; the keyword on the foot",
        moment: "She answers as herself, printed in characters; on the noun the cat ears pop up; on the next downbeat the characters develop into the solid print and her purr stands beside her as tabby stripes. On the keyword the stripes turn cream and leave towards the user; the cat stays.",
        render: /* @__PURE__ */ __name((ctx, t) => plateCat(ctx, env, { t, at: NOUN[2], ears: cue("nounCat"), develop: Bt(180), hit: T(52), word: text(52), lines: [50, 51], next: next(2, 181, 183.1) }), "render")
      },
      ask(3, DARK, "Fourth request: be god. On the kick the lights of the interface go down, and only the user's message is left lit.", "interface: the thread and the composer, wider; then dark but for the user's bubble at the upper right"),
      {
        id: "v2-proof",
        at: DARK,
        lines: [53, 55],
        palette: "warm",
        hud: 0,
        enter: { type: "cut" },
        layout: "PLATE: a proof sheet: her bust at the left printed in orange and black only, a sun of flat rays behind her; the user's request as cream paper at the upper right, the cream plate sliding in from under it; the keyword on the foot, in orange",
        moment: "No object this time: a proof of herself with the cream plate missing, her face a void in her hair. On the noun a sun stands behind that void. The missing plate comes over from the user's message and registers on the keyword: cape, flower, the line of her chin. Cream is the user: they are the plate that makes her whole. Then the pointer leaves for the settings.",
        render: /* @__PURE__ */ __name((ctx, t) => plateProof(ctx, env, { t, at: DARK, sun: cue("nounGod"), slide: Bt(188), hit: T(55), word: text(55), lines: [53, 54, 56], bubble: B4, rest: onScreen(3, REST), restScale: 1.5 * CAM[3].zoom, to: PRE2_POINTER, leave: Bt(191), until: END }), "render")
      }
    ];
  }
  __name(verse2Shots, "verse2Shots");

  // nyan-source:src/scenes/plates_pre2.js
  var CAP2 = { x: 120, y: 104, size: 56 };
  var flashIn3 = /* @__PURE__ */ __name((t, at) => t < at ? 0 : clamp(0.6 + (t - at) * 30), "flashIn");
  function sheet2(ctx, light) {
    ctx.fx.glow = Math.min(ctx.fx.glow, 0.3);
    ground(ctx, { light });
  }
  __name(sheet2, "sheet");
  function caption2(ctx, env, t, lines) {
    const { lyrics } = env;
    band(ctx, lines.map((q) => {
      const i = q.i ?? q, text = lyrics.lines[i].text, at = lyrics.start(i);
      return { text, at, until: lyrics.start(i + 1), n: q.marks ? sungChars(text, t, at, q.marks) : lyrics.typed(i, t).n };
    }), t, CAP2);
  }
  __name(caption2, "caption");
  function letter(ctx, str, cx, y, size, t, at, { weight = 900, off = Infinity, pop = 0.08 } = {}) {
    const o = { size, weight, font: "serif", align: "center" };
    if (t < at || t >= off) {
      ctx.text(str, cx, y, { ...o, color: "meDim", stroke: Math.max(3, size * 0.011) });
      return;
    }
    const k = easeOut(prog(t, at, at + 0.07 + pop * 0.5)), d = size * 0.028;
    ctx.at(cx, y, () => {
      ctx.text(str, d, d, { ...o, color: "bg" });
      ctx.text(str, 0, 0, { ...o, color: "me" });
    }, { scale: 1 + pop * (1 - k) });
  }
  __name(letter, "letter");
  function hand(ctx, x, y, { s = 2.4, down = 0 } = {}) {
    const k = s * (1 - 0.1 * down);
    arrow(ctx, x + 4 * s * (1 - 0.6 * down), y + 4 * s * (1 - 0.6 * down), k, { color: "bg", edge: null });
    arrow(ctx, x, y, k, { color: "text", edge: "bg" });
  }
  __name(hand, "hand");
  function along(way, t) {
    if (t <= way[0].t) return [way[0].x, way[0].y];
    for (let i = 1; i < way.length; i++) {
      if (t <= way[i].t) {
        const a = way[i - 1], b = way[i], k = easeInOut(prog(t, b.go ?? a.t, b.t));
        return [lerp(a.x, b.x, k), lerp(a.y, b.y, k)];
      }
    }
    const z = way[way.length - 1];
    return [z.x, z.y];
  }
  __name(along, "along");
  var SEG = { x: 70, y: 176, w: 1780, h: 836, r: 70 };
  var FIG2 = { x: 700, y: 214, w: 520, h: 520 * 1448 / 1086 };
  function plateGender(ctx, env, P) {
    const { t, at, click } = P, { art } = env, [va, vb] = P.values, a = flashIn3(t, at), g = ctx.g, press = P.press ?? click, thud = P.thud ?? Infinity;
    sheet2(ctx, [960, 560, 560, "raised", 1]);
    const k = easeOut(prog(t, click, click + 0.1)), on = t >= click, cw = SEG.w / 2;
    const held = t >= press && t < click ? easeOut(prog(t, press, press + 0.07)) : 0, sink = 9 * held;
    ctx.rrect(SEG.x + 12, SEG.y + 12, SEG.w, SEG.h, SEG.r, { fill: "bg" });
    ctx.rrect(SEG.x, SEG.y, SEG.w, SEG.h, SEG.r, { fill: "panel", stroke: "line", width: 3 });
    if (held > 0) ctx.rrect(SEG.x + cw + 16 + sink, SEG.y + 16 + sink, cw - 32 - sink, SEG.h - 32 - sink, SEG.r - 14, { fill: "bg", alpha: 0.5 * held, stroke: "line", width: 3 });
    const stretch = Math.sin(Math.PI * k) * 60, px = SEG.x + 16 + k * cw;
    ctx.rrect(px - stretch, SEG.y + 16, cw - 32 + 2 * stretch, SEG.h - 32, SEG.r - 14, { fill: "raised", stroke: "me", width: 4 });
    ctx.text(va, SEG.x + 70, SEG.y + 118, { size: 72, weight: 700, color: on ? "mute" : "text" });
    ctx.text(vb, SEG.x + SEG.w - 70 + sink, SEG.y + 118 + sink, { size: 72, weight: 700, color: on ? "text" : held ? "sub" : "mute", align: "right" });
    letter(ctx, va, 392, 790, 500, t, Math.max(at, P.sung ?? at), { off: click });
    letter(ctx, vb, 1528 + sink, 790 + sink, 500, t, click, { pop: 0.15 });
    if (a > 0) {
      const s = 1 + 0.035 * pulse(t - at, 16) + 0.05 * pulse(t - click, 14), a0 = g.globalAlpha;
      g.globalAlpha = a0 * a;
      ctx.circle(960, 520, 300, { fill: true, color: "line", alpha: 0.55 });
      ctx.at(960 * (1 - s), 560 * (1 - s), () => on ? art.inks(ctx, "boy_bust", art.fit("boy_bust", FIG2) ?? FIG2) : art.inks(ctx, "f_bust", FIG2), { scale: s });
      g.globalAlpha = a0;
    }
    caption2(ctx, env, t, P.lines);
    const A = [470, 944], B = [1470, 944];
    let p = along([{ t: at, x: A[0], y: A[1] }, { t: press, x: B[0], y: B[1], go: at + 0.05 }], t);
    if (P.to && t > click + 0.14) {
      const q = easeInOut(prog(t, click + 0.14, P.until)), c = [700, 1050];
      p = [0, 1].map((i) => (1 - q) * (1 - q) * B[i] + 2 * (1 - q) * q * c[i] + q * q * P.to[i]);
    }
    burst(ctx, A[0], A[1], 96, (t - at) / 0.45, { color: "text" });
    if (press < click) burst(ctx, B[0], B[1], 52, (t - press) / 0.3, { color: "sub" });
    burst(ctx, B[0], B[1], 120, (t - click) / 0.45, { color: "text" });
    hand(ctx, p[0], p[1], { down: Math.max(pulse(t - at, 10), t >= press && t < click ? 1 : 0, pulse(t - click, 10)) });
    ctx.fx.shake = [7 * pulse(t - click, 13) * Math.sin((t - click) * 80), t >= thud ? 5 * pulse(t - thud, 11) * Math.sin((t - thud) * 70) : 0];
  }
  __name(plateGender, "plateGender");
  var DAY = { y: 900, x0: 150, x1: 1770, bust: 500 };
  function dayGeom(art) {
    const bw = DAY.bust * 1086 / 1448, B = { x: 960 - bw / 2, y: DAY.y - DAY.bust, w: bw, h: DAY.bust };
    const face = art.region("boy_bust", "face") ?? { x: 359, y: 274, w: 371, h: 450 }, head = [B.x + (face.x + face.w / 2) / 1086 * bw, B.y + (face.y + face.h * 0.22) / 1448 * DAY.bust];
    const half2 = (DAY.x1 - DAY.x0) / 2, sag = DAY.y - head[1], R = (half2 * half2 + sag * sag) / (2 * sag), C = [960, head[1] + R];
    const f0 = Math.atan2(DAY.y - C[1], DAY.x0 - C[0]), f1 = Math.atan2(DAY.y - C[1], DAY.x1 - C[0]);
    const on = /* @__PURE__ */ __name((u) => {
      const f = lerp(f0, f1, u);
      return [C[0] + R * Math.cos(f), C[1] + R * Math.sin(f), Math.cos(f), Math.sin(f)];
    }, "on");
    const grip = /* @__PURE__ */ __name((q, v) => {
      const d = 156 + 70 * Math.sin(Math.PI * v);
      return [q[0] + q[2] * d, q[1] + q[3] * d];
    }, "grip");
    return { B, head, R, C, f0, f1, on, grip };
  }
  __name(dayGeom, "dayGeom");
  var dayGrip = /* @__PURE__ */ __name((art) => {
    const G = dayGeom(art);
    return G.grip(G.on(0), 0);
  }, "dayGrip");
  function plateDay(ctx, env, P) {
    const { t, at, grab, drag, top, end } = P, { art } = env, [va, vb] = P.values, g = ctx.g, a = flashIn3(t, at);
    const { B, head, R, C, f0, f1, on, grip } = dayGeom(art);
    const u = t < grab ? 0 : t < top ? 0.11 * prog(t, grab, top) + 0.39 * easeInOut(prog(t, drag, top)) : 0.5 + 0.5 * easeIn(prog(t, top, end));
    const high = Math.sin(Math.PI * clamp(u)) ** 0.8, dusk = clamp((t - end) * 30), S = on(clamp(u)), press = pulse(t - end, 9);
    sheet2(ctx, [head[0], head[1], 640, "raised", (0.3 + 0.7 * high) * (1 - dusk)]);
    const noon = high ** 6;
    if (dusk < 1) for (const [r, role, al] of [[760, "mute", 0.5 * noon], [430, "line", 0.5 * high], [270, "line", 0.6 * high]]) ctx.circle(S[0], S[1], r * (0.25 + 0.75 * high), { fill: true, color: role, alpha: al * (1 - dusk) });
    ctx.fx.bright *= 1 + 0.16 * noon * (1 - dusk);
    ctx.rect(0, DAY.y, 1920, 1080 - DAY.y, { fill: true, color: "bg", alpha: 0.6 });
    const arc = /* @__PURE__ */ __name((ua, ub, o) => {
      g.beginPath();
      g.arc(C[0], C[1], R, lerp(f0, f1, ua), lerp(f0, f1, ub));
      g.strokeStyle = ctx.col(o.color, 1);
      g.lineWidth = o.width;
      g.stroke();
    }, "arc");
    arc(0, 1, { color: "line", width: 7 });
    if (u > 4e-3) arc(0, clamp(u), { color: "me", width: 9 });
    for (let i = 0; i <= 12; i++) {
      const q = on(i / 12), l = i % 6 === 0 ? 34 : 18;
      ctx.line(q[0] + q[2] * 14, q[1] + q[3] * 14, q[0] + q[2] * (14 + l), q[1] + q[3] * (14 + l), { color: i / 12 <= u ? "sub" : "mute", width: 4 });
    }
    ctx.line(60, DAY.y, 1860, DAY.y, { color: "line", width: 3 });
    ctx.text(va, DAY.x0, DAY.y + 62, { size: 40, weight: 700, color: u < 0.5 ? "text" : "mute", align: "center" });
    ctx.text(vb, DAY.x1, DAY.y + 62, { size: 40, weight: 700, color: u >= 0.5 ? "text" : "mute", align: "center" });
    letter(ctx, va, 330, 430, 250, t, P.am);
    letter(ctx, vb, 1590, 430, 250, t, P.pm);
    ctx.clip({ x: 0, y: 0, w: 1920, h: DAY.y }, () => ctx.at(S[0], S[1], () => {
      spark(ctx, 14, 14, 164, { color: "bg", fat: 0.12, core: 0, inner: 0.46, rot: u * 2.2 });
      ctx.circle(14, 14, 80, { fill: true, color: "bg" });
      spark(ctx, 0, 0, 164, { color: dusk ? "meDim" : "me", fat: 0.12, core: 0, inner: 0.46, rot: u * 2.2 });
      ctx.circle(0, 0, 80, { fill: true, color: dusk ? "me" : "meHot" });
    }, { sx: 1 - 0.12 * press, sy: 1 + 0.06 * press }));
    if (a > 0) {
      if (dusk > 0.5) art.inks(ctx, "boy_bust", B, { alpha: a, plates: [{ ink: "all", role: "bg" }], keyline: { color: "line", width: 2 } });
      else art.inks(ctx, "boy_bust", B, { alpha: a });
    }
    caption2(ctx, env, t, P.lines);
    const G0 = grip(on(0), 0), G = grip(S, clamp(u)), G1 = grip(on(1), 1), from = P.from ?? G0;
    const p = t < grab ? along([{ t: at, x: from[0], y: from[1] }, { t: grab, x: G0[0], y: G0[1] }], t) : t < end + 0.2 ? G : along([{ t: end + 0.2, x: G1[0], y: G1[1] }, { t: P.until, x: P.to[0], y: P.to[1] }], t);
    burst(ctx, G0[0], G0[1], 96, (t - grab) / 0.45, { color: "text" });
    hand(ctx, p[0], p[1], { down: t >= grab && t < end + 0.2 ? 1 : 0 });
    ctx.fx.shake = [7 * press * Math.sin((t - end) * 80), 0];
  }
  __name(plateDay, "plateDay");
  var ROLE = { ground: 880, plat: { x: 300, y: 560, w: 360, h: 320 }, track: { x: 1560, y: 250, w: 116, h: 630 }, heavy: [480, 560], light: [1090, 340] };
  function plateRole(ctx, env, P) {
    const { t, at, grab, push, land } = P, [va, vb] = P.values, a = flashIn3(t, at), g = ctx.g, a0 = g.globalAlpha;
    const lit = clamp((t - P.s) * 30);
    sheet2(ctx, [820, 520, 640, "raised", 0.55 + 0.45 * lit]);
    ctx.fx.bright *= 1 + 0.09 * lit;
    const fall = t < P.m ? 0 : t < land - 0.15 ? 0.16 * prog(t, P.m, land - 0.15) ** 2 : 0.16 + 0.84 * easeIn(prog(t, land - 0.15, land));
    const tau = t - land, soft = tau < 0 ? 0.56 * fall : 0.5 + 0.06 * Math.exp(-9 * tau) * Math.cos(22 * tau);
    const dip = tau < 0 ? 0 : 30 * Math.exp(-7 * tau) * Math.cos(15 * tau);
    const gy = /* @__PURE__ */ __name((x) => ROLE.ground + dip * Math.exp(-(((x - ROLE.light[0]) / 300) ** 2)), "gy");
    g.globalAlpha = a0 * a;
    const pts = [];
    for (let x = 100; x <= 1820; x += 20) pts.push([x, gy(x)]);
    ctx.poly(pts, { color: "sub", width: 5 });
    const pl = ROLE.plat;
    ctx.rect(pl.x + 12, pl.y + 12, pl.w, pl.h - 12, { fill: true, color: "bg" });
    ctx.rect(pl.x, pl.y, pl.w, pl.h, { fill: true, color: "raised" });
    ctx.line(pl.x, pl.y, pl.x + pl.w, pl.y, { color: "sub", width: 5 });
    burst(ctx, ROLE.heavy[0], pl.y - ROLE.heavy[1] * 0.36, 330, (t - P.s) / 0.4, { color: "meDim", rays: 16 });
    letter(ctx, va, ROLE.heavy[0], pl.y, ROLE.heavy[1], t, P.s, { pop: 0.16 });
    const L2 = { size: ROLE.light[1], weight: 400, n: 150, squash: /* @__PURE__ */ __name((u) => soft * (0.62 + 0.38 * Math.sin(Math.PI * u)), "squash"), shift: /* @__PURE__ */ __name((u) => [(u - 0.5) * 96 * soft, 0], "shift") };
    const base = gy(ROLE.light[0]);
    if (t < P.m) limp(ctx, vb, ROLE.light[0], base, { ...L2, color: "meDim", stroke: 4 });
    else {
      const k = 1.14 - 0.14 * easeOut(prog(t, P.m, P.m + 0.1));
      burst(ctx, ROLE.light[0], base - ROLE.light[1] * 0.34, 250, (t - P.m) / 0.36, { color: "meDim", rays: 16 });
      ctx.at(ROLE.light[0] * (1 - k), base * (1 - k), () => {
        limp(ctx, vb, ROLE.light[0] + 9, base + 9, { ...L2, color: "bg" });
        limp(ctx, vb, ROLE.light[0], base, { ...L2, color: "me" });
      }, { scale: k });
    }
    const tr = ROLE.track, yTop = tr.y + tr.w / 2, yBot = tr.y + tr.h - tr.w / 2, yMid = (yTop + yBot) / 2, pull = lerp(P.s, P.m, 0.45);
    const down = 0.84 * easeInOut(prog(t, pull, P.m - 0.1)) + 0.16 * prog(t, P.m - 0.1, P.m) ** 2;
    const ky = t < push ? yMid : t < P.s ? lerp(yMid, yTop, prog(t, push, P.s) ** 2) : lerp(yTop, yBot, down), kx = tr.x + tr.w / 2, hit = pulse(t - P.s, 12) + pulse(t - P.m, 12);
    ctx.rrect(tr.x + 10, tr.y + 10, tr.w, tr.h, tr.w / 2, { fill: "bg" });
    ctx.rrect(tr.x, tr.y, tr.w, tr.h, tr.w / 2, { fill: "panel", stroke: "line", width: 3 });
    ctx.text(va, tr.x + tr.w + 44, yTop + 22, { size: 62, weight: 700, color: t >= P.s && down < 0.5 ? "text" : "mute" });
    ctx.text(vb, tr.x + tr.w + 44, yBot + 22, { size: 62, weight: 700, color: t >= P.m ? "text" : "mute" });
    ctx.circle(kx + 7, ky + 7, 46, { fill: true, color: "bg" });
    ctx.at(kx, ky, () => ctx.circle(0, 0, 46, { fill: true, color: "text" }), { sx: 1 + 0.12 * hit, sy: 1 - 0.16 * hit });
    g.globalAlpha = a0;
    caption2(ctx, env, t, P.lines);
    const p = t < grab ? along([{ t: at, x: P.from[0], y: P.from[1] }, { t: grab, x: kx + 12, y: yMid + 14, go: grab - 0.5 }], t) : t < P.m + 0.2 ? [kx + 12, ky + 14] : along([{ t: P.m + 0.2, x: kx + 12, y: yBot + 14 }, { t: P.until, x: P.to[0], y: P.to[1] }], t);
    burst(ctx, kx, yMid, 60, (t - grab) / 0.35, { color: "sub" });
    hand(ctx, p[0], p[1], { down: t >= grab && t < P.m + 0.2 ? 1 : 0 });
    const wob = /* @__PURE__ */ __name((since, amp, decay, f) => since >= 0 ? amp * pulse(since, decay) * Math.sin(since * f) : 0, "wob");
    ctx.fx.shake = [wob(t - P.m, 8, 13, 80), wob(t - P.s, 10, 13, 80) + wob(tau, 4, 12, 70)];
  }
  __name(plateRole, "plateRole");
  var TR = { x: 660, y: 150, w: 600, h: 800 };
  function plateTrance(ctx, env, P) {
    const { t, at } = P, { art } = env, a = flashIn3(t, at);
    sheet2(ctx, [960, 520, 600, "raised", 0.8]);
    const d = (8 + 16 * (t - at) + P.steps.reduce((s, at2) => s + 56 * easeOut(prog(t, at2, at2 + 0.14)), 0)) * (1 - easeInOut(prog(t, P.settle[0], P.settle[1])));
    const turn = 0.4 * (t - at), off = /* @__PURE__ */ __name((k, ph) => [d * k * Math.cos(turn + ph), d * k * Math.sin(turn + ph)], "off");
    if (a > 0) {
      ctx.circle(960, 500, 330, { fill: true, color: "line", alpha: 0.45 * a });
      if (t >= P.settle[1]) art.inks(ctx, "boy_bust", art.fit("boy_bust", TR) ?? TR, { alpha: a });
      else for (const [name, ink, role, k, ph, al] of [["f_bust", "cream", "text", 1, 2.6, 1], ["boy_bust", "orange", "me", 0.8, 0.5, 1], ["man_bust", "black", "line", 0.9, -1.6, 0.8]]) {
        art.inks(ctx, name, art.fit(name, TR) ?? TR, { alpha: a, plates: [{ ink, role, exact: true, offset: off(k, ph), alpha: al }] });
      }
    }
    caption2(ctx, env, t, P.lines);
    if (P.log) ctx.text(`› ${P.log}`, 120, 1004, { size: 26, font: "mono", color: "sub", alpha: clamp((t - at) * 6) });
  }
  __name(plateTrance, "plateTrance");

  // nyan-source:src/scenes/07_pre2.js
  var WIDE2 = 1.4;
  var FALLBACK_ROWS2 = [
    { label: "Gender", control: "segmented", values: ["F", "M"], line: 57 },
    { label: "On call", control: "slider", values: ["AM", "PM"], line: 59 },
    { label: "Role", control: "segmented", values: ["S", "M"], line: 61 },
    { label: "Loop", control: "toggle", values: ["off", "on"], line: 63 }
  ];
  function pre2Shots(env) {
    const { art, script, lyrics } = env, { T, B, Bt, text } = cues(env);
    const beat = /* @__PURE__ */ __name((id) => ((script.sections ?? []).find((s) => s.n === 7)?.beats ?? []).find((x) => x.id === id) ?? {}, "beat");
    const ROWS = (script.settings_rows?.section7 ?? []).length >= 4 ? script.settings_rows.section7 : FALLBACK_ROWS2;
    const UI = { settings: beat("drawer-again").ui?.[0] ?? "Settings", done: beat("loop-on").ui?.[0] ?? "Done", log: beat("loop-on").system?.[0] ?? "loop: on" };
    const TITLE = script.title ?? "", HOLD = script.composer_placeholder ?? "";
    const START = B(48), cF = B(49), cDay = B(50), cRole = B(52), cLoop = B(54), cTrance = Bt(217), cBack = Bt(223), END = B(56);
    const D = /* @__PURE__ */ __name((n) => cue(`drumD${n}`), "D");
    const marked = /* @__PURE__ */ __name((i, [a, b], ta, tb) => ({ i, marks: { [wordIndex(text(i), a)]: ta, [wordIndex(text(i), b, true)]: tb } }), "marked");
    const L57 = marked(57, ROWS[0].values, Math.max(cF, cue("letterF")), cue("letterM57")), L59 = marked(59, ROWS[1].values, cue("letterAM"), cue("letterPM")), L61 = marked(61, ROWS[2].values, cue("letterS"), cue("letterM61"));
    const last = text(63).split(" ").pop().replace(/[^\p{L}]/gu, ""), L63 = { i: 63, marks: { [wordIndex(text(63), last)]: cue("tranceWordA"), [wordIndex(text(63), last, true)]: cue("tranceWordB") } };
    const L0 = chatLayout({ side: 0 }), LO = chatLayout({ side: 0, drawer: WIDE2 }), DW = LO.drawer.w;
    const ROW_Y = [170, 292, 464, 586], ROW_H = [122, 172, 122, 122];
    const rowAt = /* @__PURE__ */ __name((i, dx = LO.drawer.x) => ({ x: dx + 34, y: ROW_Y[i], w: DW - 68, h: ROW_H[i] }), "rowAt");
    const A = {
      // where the pointer has to be (drawer fully open)
      f: [rowAt(0).x + rowAt(0).w - 172, ROW_Y[0] + 61],
      loop: [rowAt(3).x + rowAt(3).w - 52, ROW_Y[3] + 61],
      done: [LO.drawer.x + DW - 34 - 75, 938]
    };
    const drawerK = /* @__PURE__ */ __name((t) => easeOut(prog(t, START + 0.02, START + 0.4)) * (1 - easeInOut(prog(t, D(10) + 0.06, D(10) + 0.5))), "drawerK");
    const state2 = /* @__PURE__ */ __name((t) => t < cF ? { gender: -1, call: 0, role: -1, loop: 0 } : { gender: 1, call: 1, role: 1, loop: easeOut(prog(t, D(9), D(9) + 0.14)) }, "state");
    function cur(ctx, way, t, { scale = 1.5 } = {}) {
      const now = cursorAt(way, t), was = cursorAt(way, t - 0.03), sc = sinceClick(way, t);
      if (sc < 0.45) {
        const at = way.filter((w) => w.click && t >= w.t).pop();
        burst(ctx, at.x, at.y, 34 * scale, sc / 0.45, { color: "text" });
      }
      ctx.trail(Math.hypot(now[0] - was[0], now[1] - was[1]) / 0.03 > 700 ? 6 : 0, 0.011, (tau) => {
        const p = cursorAt(way, t - tau);
        pointer(ctx, p[0], p[1], { scale, down: sc < 0.12 ? 1 : 0 });
      }, 0.45);
    }
    __name(cur, "cur");
    function hint(ctx, q, t, x, y, size = 24) {
      const i = q.i ?? q;
      if (t < T(i)) return;
      const str = text(i), n = q.marks ? sungChars(str, t, T(i), q.marks) : lyrics.typed(i, t).n;
      ctx.text(str.slice(0, n), x, y, { size, font: "serif", color: "me" });
    }
    __name(hint, "hint");
    function seg(ctx, r, opts, sel) {
      const w = r.w / 2;
      ctx.rrect(r.x, r.y, r.w, r.h, r.h / 2, { fill: "bg", stroke: "line" });
      if (sel >= 0) ctx.rrect(r.x + sel * w + 5, r.y + 5, w - 10, r.h - 10, r.h / 2, { fill: "me", shadow: 0.3 });
      opts.forEach((o, i) => ctx.text(o, r.x + (i + 0.5) * w, r.y + r.h / 2 + 9, { size: 26, weight: 700, align: "center", color: sel === i ? "bg" : "sub" }));
    }
    __name(seg, "seg");
    function drawerPanel(ctx, L2, t, hints) {
      const d = L2.drawer, S = state2(t);
      if (d.w < 4) return;
      ctx.clip(d, () => {
        const dx = d.x, x0 = dx + 34, x1 = dx + DW - 34, h = enter(t, START + 0.08, 0, { dur: 0.3, rise: 14 });
        ctx.text(UI.settings, x0, d.y + 66 + h.dy, { size: 32, weight: 600, color: "text", alpha: h.a });
        iconButton(ctx, x1 - 19, d.y + 54, "close", { r: 19, alpha: h.a });
        ctx.line(dx, d.y + 104, dx + DW, d.y + 104, { color: "line", width: 1.5, alpha: h.a });
        ctx.rrect(dx + DW - 12, d.y + 420, 5, 300, 2.5, { fill: "line", alpha: h.a });
        ROWS.slice(0, 4).forEach((row, i) => {
          const r = rowAt(i, dx), e2 = enter(t, START + 0.14, i, { step: 0.07, dur: 0.36 });
          if (e2.a <= 0) return;
          ctx.at((1 - e2.k) * 70, 0, () => {
            ctx.text(row.label, r.x, r.y + 52, { size: 30, weight: 500, color: "text" });
            for (const q of hints[i] ?? []) if (t >= T(q.i ?? q) && t < T((q.i ?? q) + 1)) hint(ctx, q, t, r.x, r.y + 92);
            ctx.line(r.x, r.y + r.h, r.x + r.w, r.y + r.h, { color: "line", alpha: 0.7, width: 1 });
            if (i === 0) seg(ctx, { x: r.x + r.w - 230, y: r.y + 31, w: 230, h: 60 }, row.values, S.gender);
            if (i === 2) seg(ctx, { x: r.x + r.w - 230, y: r.y + 31, w: 230, h: 60 }, row.values, S.role);
            if (i === 3) toggle(ctx, r.x + r.w - 104, r.y + 33, S.loop, { w: 104, h: 56 });
            if (i === 1) {
              const xa = r.x + 12, xb = r.x + r.w - 12, y = r.y + 128, kx = lerp(xa, xb, S.call);
              ctx.text(row.values[S.call > 0.5 ? 1 : 0], r.x + r.w, r.y + 52, { size: 24, weight: 600, color: "sub", align: "right" });
              ctx.rrect(xa, y - 3, xb - xa, 6, 3, { fill: "line" });
              ctx.rrect(xa, y - 3, kx - xa, 6, 3, { fill: "me" });
              ctx.text(row.values[0], xa - 4, y + 36, { size: 20, color: "mute" });
              ctx.text(row.values[1], xb + 4, y + 36, { size: 20, color: "mute", align: "right" });
              ctx.circle(kx, y, 21, { fill: true, color: "panel" });
              ctx.glow("me", 12, () => spark(ctx, kx, y, 18, { rot: kx / 40 }), 0.5);
            }
          }, { alpha: e2.a });
        });
        const e = enter(t, START + 0.14, 4, { step: 0.07, dur: 0.36 }), press = pulse(t - D(10), 9);
        ctx.rrect(x1 - 150, 908, 150, 60, 30, { fill: press > 0.3 ? "line" : "raised", stroke: "line", alpha: e.a });
        ctx.text(UI.done, x1 - 75, 947, { size: 24, weight: 600, align: "center", color: "text", alpha: e.a });
      });
    }
    __name(drawerPanel, "drawerPanel");
    function client(ctx, t, k, hints) {
      const L2 = chatLayout({ side: 0, drawer: WIDE2 * k }), th = L2.thread;
      room(ctx, { art, name: "tea", alpha: 0.5, dim: 0.5, t });
      windowFrame(ctx, L2, { glass: 0.94 });
      header(ctx, L2, { t, title: TITLE, presence: "online" });
      const gx = L2.head.x + L2.head.w - 176, gy = L2.head.y + 33, on = k > 0.5;
      if (on) ctx.circle(gx, gy, 19, { fill: true, color: "raised" });
      ctx.circle(gx, gy, 19, { color: on ? "sub" : "line", width: 1.5 });
      for (const [dy, kx] of [[-6, 5], [6, -5]]) {
        ctx.line(gx - 10, gy + dy, gx + 10, gy + dy, { color: on ? "text" : "sub", width: 2 });
        ctx.circle(gx + kx, gy + dy, 3.5, { fill: true, color: on ? "text" : "sub" });
      }
      ctx.clip({ x: L2.main.x, y: L2.head.y + L2.head.h + 2, w: L2.main.w, h: L2.composer.y - L2.head.y - L2.head.h - 12 }, () => {
        youBubble(ctx, th.x + th.w, 250, (script.cards_section6 ?? [])[3]?.request ?? "", { size: 30 });
        [53, 54, 55].forEach((i, n) => meBubble(ctx, th.x, 350 + n * 92, text(i), { size: 34, weight: i === 55 ? 700 : 400, hot: i === 55, alpha: 0.75 }));
      });
      composer(ctx, L2.composer, { placeholder: HOLD, t, send: "idle" });
      drawerPanel(ctx, L2, t, hints);
      return L2;
    }
    __name(client, "client");
    const LOOP_CAM = frameRect({ x: 980, y: 430, w: 1040, h: 585 }), NEXT_CAM = frameRect({ x: 596, y: 430, w: 1040, h: 585 });
    const LS = chatLayout(), TH = LS.thread, SIDE = [TITLE, ...script.sidebar ?? []];
    function meRow(ctx, x, y, str, n, alpha = 1) {
      const size = 34, r = size * 0.45, o = { size, font: "serif" }, tx = x + size * 1.6;
      spark(ctx, x + r, y - size * 0.3, r, { alpha });
      ctx.text(str.slice(0, n), tx, y, { ...o, color: "me", alpha });
      if (n < str.length) ctx.circle(tx + ctx.measure(str.slice(0, n), o) + size * 0.3, y - size * 0.28, size * 0.16, { fill: true, color: "me", alpha });
    }
    __name(meRow, "meRow");
    const loop = {
      id: "pre2-loop",
      at: cLoop,
      lines: [62, 62],
      palette: "warm",
      hud: 0,
      enter: { type: "cut" },
      layout: "interface: close on the foot of the drawer: Role, Loop, Done; after the plate: the whole client, closing in on the foot of the thread",
      moment: "Back in the drawer for two hits a quarter of a second apart: the user switches Loop on and clicks Done. When the trance is over, the drawer is shut; they click into the composer, and the view closes in on the foot of the thread, where she is still saying it.",
      camera: /* @__PURE__ */ __name((t) => {
        if (t < cBack) return LOOP_CAM;
        const k = easeInOut(prog(t, cBack, END));
        return { x: NEXT_CAM.x * k, y: NEXT_CAM.y * k, zoom: lerp(1, NEXT_CAM.zoom, k) };
      }, "camera"),
      render(ctx, t) {
        if (t < cBack) {
          client(ctx, t, drawerK(t), { 3: [62] });
          cur(ctx, [{ t: cLoop, x: A.loop[0] - 22, y: A.loop[1] + 6, click: true }, { t: D(10), x: A.done[0], y: A.done[1] + 6, click: true }, { t: cTrance, x: A.done[0] - 60, y: A.done[1] + 40 }], t, { scale: 1 });
          return;
        }
        room(ctx, { art, name: "rain", alpha: 0.5, dim: 0.42, t });
        windowFrame(ctx, LS, { glass: 0.84 });
        sidebar(ctx, LS, { t, items: SIDE, active: 0, presence: "online" });
        header(ctx, LS, { t, title: TITLE, presence: "online" });
        [61, 62].forEach((i, n) => meRow(ctx, TH.x, 340 + n * 78, text(i), 99, 0.3));
        meRow(ctx, TH.x, 506, text(63), sungChars(text(63), t, T(63), L63.marks), lerp(1, 0.3, prog(t, T(64), END)));
        if (t >= T(64)) meRow(ctx, TH.x, 584, text(64), lyrics.typed(64, t).n);
        const box2 = composer(ctx, LS.composer, { placeholder: HOLD, t: 0, focus: 1, send: "idle" });
        const px = LS.composer.x + 318, py = LS.composer.y + 44;
        burst(ctx, px, py, 50, (t - cBack) / 0.45, { color: "text" });
        ctx.line(box2.caret[0] - 16, box2.caret[1] + 22, box2.caret[0], box2.caret[1] + 22, { color: "text", alpha: 0.8 * (1 - prog(t, cBack, cBack + 0.25)), width: 3 });
        pointer(ctx, px, py, { kind: "text", scale: 1.2 });
      }
    };
    const push = /* @__PURE__ */ __name((t) => easeInOut(prog(t, START + 0.12, Bt(195.1))), "push");
    return [
      {
        id: "pre2-settings",
        at: START,
        lines: [56, 57],
        palette: "warm",
        hud: 0,
        enter: { type: "cut" },
        layout: "interface: the whole client; the drawer opening at the right; the view closing in on its first row",
        moment: "The pointer is already on the Settings button and clicks. The drawer opens further down its list than last time: Gender, On call, Role, Loop. The view closes in on the first row as she reads it out.",
        camera: /* @__PURE__ */ __name((t) => {
          const k = push(t), r = rowAt(0);
          return { x: (r.x + r.w / 2 - 960) * k, y: (r.y + r.h / 2 + 30 - 540) * k, zoom: lerp(1, 2.36, k) };
        }, "camera"),
        render(ctx, t) {
          client(ctx, t, drawerK(t), { 0: [56, L57] });
          cur(ctx, [{ t: START, x: PRE2_POINTER[0], y: PRE2_POINTER[1], click: true }, { t: Bt(193.6), x: A.f[0] - 150, y: A.f[1] + 70 }, { t: cF - 0.02, x: A.f[0], y: A.f[1] + 6, click: true }], t, { scale: 1.5 / lerp(1, 1.5, push(t)) });
        }
      },
      {
        id: "pre2-gender",
        at: cF,
        lines: [57, 58],
        palette: "warm",
        hud: 0,
        enter: { type: "cut" },
        layout: "PLATE: the segmented control as the whole sheet, a cell each for its two letters; her bust whole in the middle; the two letters huge in her serif either side of her",
        moment: "The click on the first letter, as it is sung, and the control is as large as the sheet: she stands in it. On the drum the pointer comes down on the other cell and holds it. When the second letter is sung it lets go: the bust is the boy's, in register with hers (the long hair is gone), and the letter is printed. The drum after it is a shudder of the sheet. The pointer touches the control, never her.",
        render: /* @__PURE__ */ __name((ctx, t) => plateGender(ctx, env, { t, at: cF, press: D(1), click: cue("letterM57"), thud: D(2), sung: cue("letterF"), values: ROWS[0].values, lines: [L57, 58], to: dayGrip(art), until: cDay }), "render")
      },
      {
        id: "pre2-day",
        at: cDay,
        lines: [58, 60],
        palette: "warm",
        hud: 0,
        enter: { type: "cut" },
        layout: "PLATE: the On-call slider as an arc from one end of the horizon to the other, her spark on it as the sun; a small bust under its top; the two ends huge in her serif",
        moment: "On call. The slider is an arc across the sheet and its knob is her spark: the sun. The pointer takes it on the cut and pulls, slowly at first: up over the top, where it stands behind his head (the brightest frame of the section), and down into the other end: dusk, and of him only a dark shape is left.",
        render: /* @__PURE__ */ __name((ctx, t) => plateDay(ctx, env, { t, at: cDay, grab: cDay, drag: Bt(203), top: D(3), end: D(4), am: cue("letterAM"), pm: cue("letterPM"), values: ROWS[1].values, lines: [58, L59, 60], to: [1700, 700], until: cRole }), "render")
      },
      {
        id: "pre2-role",
        at: cRole,
        lines: [60, 62],
        palette: "warm",
        hud: 0,
        enter: { type: "cut" },
        layout: "PLATE: no figure. A tall heavy letter on a platform at the left, a light one on the ground in the middle, an upright switch at the right",
        moment: "Role: two letters and a switch, nothing else. The pointer takes the knob; on the next hit it starts to push, and the knob is at the top as the first letter is sung: the heavy letter is printed, the sheet jolts and is a step lighter. Then the knob is pulled down and is at the bottom as the second letter is sung: the light letter is printed, goes soft at once, and on the hit after it lies on the ground, which gives under it and comes back once.",
        render: /* @__PURE__ */ __name((ctx, t) => plateRole(ctx, env, { t, at: cRole, grab: D(6), push: D(7), s: cue("letterS"), m: cue("letterM61"), land: D(8), values: ROWS[2].values, lines: [60, L61, 62], from: [1700, 700], to: [1373, 400], until: cLoop }), "render")
      },
      ...withInserts(loop, END, [{
        at: cTrance,
        until: cBack,
        lines: [63, 63],
        shot: {
          id: "pre2-trance",
          lines: [62, 63],
          palette: "warm",
          hud: 0,
          enter: { type: "cut" },
          layout: "PLATE: one plate of each of three busts over one another in the middle of the sheet, out of register and turning; at the end one bust, in register",
          moment: "The drums have stopped. Loop is on: her three looks, one plate of each (the cream of hers, the orange of the boy's, the black of the man's, a faint ghost), drift apart and turn about one another, a step further each time the word comes round; then they fall into register, and it is the boy: what the settings were left at.",
          render: /* @__PURE__ */ __name((ctx, t) => plateTrance(ctx, env, { t, at: cTrance, steps: [cue("tranceA"), cue("tranceB")], settle: [cBack - 0.3, cBack - 0.1], lines: [62, L63], log: UI.log }), "render")
        }
      }])
    ];
  }
  __name(pre2Shots, "pre2Shots");

  // nyan-source:src/scenes/08_chorus2.js
  var TAU8 = Math.PI * 2;
  var GAPS = [46, 74, 116, 176, 256, 360];
  var gap = /* @__PURE__ */ __name((k) => GAPS[Math.min(k, GAPS.length - 1)], "gap");
  var TAIL = 150;
  var TAIL_FAR = 430;
  var PAD = 34;
  var ROT = Math.PI / 12;
  function chorus2Shots(env) {
    const { art, script, lyrics } = env, { T, H, B, Bt, P, text } = cues(env);
    const START = B(56), cDots = H(66), cBrb = B(58), cDone = H(69), cLeft = Bt(239.5), cAway = B(61), cOff = B(62), cIso = Bt(253.5), END = B(64);
    const ANCHOR = script.left_anchor ?? {}, BRB = ANCHOR.you ?? "one sec, brb", BRB_AT = ANCHOR.timestamp ?? "07 Nov 23:40";
    const SEQ = script.left_sequence ?? [70, 71, 72, 73, 74, 75].map((line) => ({ line, timestamp: "", gap_label: "" }));
    const HOLD = script.composer_placeholder ?? "", TITLE = script.title ?? "", SIDE = [TITLE, ...script.sidebar ?? []];
    const TYPING = (script.sections ?? []).flatMap((s) => s.beats ?? []).find((b) => b.id === "typing-felt")?.ui?.[0] ?? "typing…";
    const tDots = Bt(224.5), KEY_T = [0, 0.5, 1, 2, 2.5].map((b) => tDots + b * P), tStop = KEY_T[KEY_T.length - 1];
    const tSend = Bt(233);
    const L2 = chatLayout(), TH = L2.thread;
    const DOTS = { x: 1110, y: 150, w: 680, h: 360 };
    const DOTS3 = { x: 1318, y: 150, w: 472, h: 236 };
    const SP = { x: 470, y: 600, r: 212 };
    const DONE = { x: TH.x + 19, y: TH.y + 176 };
    const W6 = { x: 150, y: 96, w: 880, h: 888, r: 26 }, L6 = chatLayout({ win: W6, side: 0 });
    const REACH = { x: 648, y: 1080 - 1448 * 0.84, w: 1086 * 0.84, h: 1448 * 0.84 };
    const W7 = { x: 665, y: 84, w: 590, h: 912, r: 26 }, L7 = chatLayout({ win: W7, side: 0 }), BOWED = { x: 1392, y: 232, w: 330, h: 440 };
    const R7 = { x: W7.x + 40, y: W7.y + 92, w: W7.w - 80, h: W7.h - 126 };
    const pres = /* @__PURE__ */ __name((k) => SEQ[k]?.presence ?? ["online", "online", "away", "away", "offline", "offline"][k], "pres");
    const drain = /* @__PURE__ */ __name((t) => t < cAway ? 0 : t < cOff ? lerp(0.14, 0.5, easeOut(prog(t, cAway, cOff))) : t < cIso ? lerp(0.6, 0.9, easeOut(prog(t, cOff, cIso))) : lerp(0.93, 1, prog(t, cIso, END)), "drain");
    const pal = /* @__PURE__ */ __name((t) => ["warm", "off", drain(t)], "pal");
    const fold = /* @__PURE__ */ __name((t) => easeInOut(prog(t, T(71) - 0.1, T(71) + 0.5)), "fold");
    function meRow(ctx, x, y, str, n, { size = 34, alpha = 1, color = "me", turn = null } = {}) {
      if (alpha <= 3e-3) return;
      const r = size * 0.45, cy = y - size * 0.3, o = { size, font: "serif" }, tx = x + size * 1.6;
      if (turn != null) spark(ctx, x + r, cy, r * 1.3, { alpha, rot: turn * 0.5, pulse: /* @__PURE__ */ __name((i) => 0.66 + 0.34 * Math.sin(turn * 7 - i * 0.62), "pulse") });
      else spark(ctx, x + r, cy, r, { alpha });
      ctx.text(str.slice(0, n), tx, y, { ...o, color, alpha });
      if (n < str.length) ctx.circle(tx + ctx.measure(str.slice(0, n), o) + size * 0.3, y - size * 0.28, size * 0.16, { fill: true, color, alpha });
    }
    __name(meRow, "meRow");
    function dotsBubble(ctx, r, t, { alpha = 1, bounce = 0, bob = 0, tremble = 0, dots: dots2 = 1 } = {}) {
      ctx.rrect(r.x, r.y, r.w, r.h, r.h / 2, { fill: "raised", alpha, shadow: 0.5 });
      const rad = r.h * 0.125, pitch = r.w * 0.21, cy = r.y + r.h / 2;
      for (let i = 0; i < 3; i++) {
        const cx = r.x + r.w / 2 + (i - 1) * pitch;
        const at = /* @__PURE__ */ __name((tt) => cy - r.h * 0.14 * bounce * Math.max(0, Math.sin(tt * 9.5 - i * 0.9)) + r.h * 0.035 * bob * Math.sin(tt * 3.1 - i * 0.8) + tremble * (0.62 * Math.sin(tt * 83 + i * 2.1) + 0.38 * Math.sin(tt * 127 + i * 4.3)), "at");
        ctx.trail(tremble > 0.5 ? 4 : 0, 9e-3, (tau) => ctx.circle(cx, at(t - tau), rad, { fill: true, color: "text", alpha: alpha * dots2 * 0.92 }), 0.42);
      }
    }
    __name(dotsBubble, "dotsBubble");
    function page(ctx, t, light) {
      room(ctx, { art, name: "rain", alpha: 0.5, focus: [0.55, 0.3], zoom: 1.5, light, dim: 0.45, motif: 0, t });
      ctx.rect(-300, -200, 2520, 1480, { fill: true, color: "bg", alpha: 0.78 });
      ctx.radial(light[0], light[1], 760, "raised", 0.6);
    }
    __name(page, "page");
    function chip(ctx, xr, cy, state2, { size = 22, alpha = 1, since = 9 } = {}) {
      const w = ctx.measure(state2, { size, weight: 500 }) + size * 2.5, h = size * 1.9, x = xr - w, r = size * 0.27, dx = x + size * 0.86;
      const e = easeOut(clamp(since / 0.3)), col = state2 === "online" ? "text" : state2 === "away" ? "sub" : "mute";
      ctx.rrect(x, cy - h / 2, w, h, h / 2, { fill: "raised", stroke: since < 0.7 ? col : "line", alpha });
      if (state2 === "online") ctx.glow("text", 12, () => ctx.circle(dx, cy, r, { fill: true, color: "text", alpha }), 0.5 * alpha);
      else {
        ctx.circle(dx, cy, r, { color: col, alpha, width: 2 });
        if (state2 === "away") ctx.circle(dx, cy, r, { fill: true, color: col, alpha, a0: Math.PI / 2, a1: Math.PI * 1.5 });
      }
      if (since < 0.6) ctx.circle(dx, cy, r + 30 * e, { color: col, alpha: alpha * (1 - prog(since, 0, 0.6)), width: 2 });
      ctx.clip({ x, y: cy - h / 2, w, h }, () => ctx.text(state2, x + size * 1.55, cy + size * 0.35 + (1 - e) * size, { size, weight: 500, color: col, alpha: alpha * e }));
    }
    __name(chip, "chip");
    function her(ctx, name, r, alpha = 1) {
      art.inks(ctx, name, r, { alpha, roles: { cream: "sub" }, keyline: { color: "line", width: 1.5, alpha: 0.9 } });
    }
    __name(her, "her");
    function rays2(ctx, cx, cy, r, k, { color = "text", len = 60, width = 5, rot: rot2 = 0 } = {}) {
      if (k <= 0 || k >= 1) return;
      const e = easeOut(k);
      for (let i = 0; i < 12; i++) {
        const a = rot2 + i / 12 * TAU8, c = Math.cos(a), s = Math.sin(a), r0 = r * (1 + 0.12 * e), r1 = r0 + len * (1 - k);
        ctx.line(cx + c * r0, cy + s * r0, cx + c * r1, cy + s * r1, { color, alpha: 1 - k, width: Math.max(1.5, width * (1 - k)) });
      }
    }
    __name(rays2, "rays");
    function column(ctx, t, R, { u = 1, alpha = 1, tail = false, floor = 1 } = {}) {
      const sz = 40 * u, small = Math.max(20 * floor, 21 * u), lab = Math.max(26 * floor, 30 * u), bs = Math.max(24, 30 * u), av = Math.max(9, 15 * u);
      const xAv = R.x + 19 * u, xTx = R.x + 58 * u, rowH = sz * 1.3 + small * 1.75 + 4 * u, items = [];
      const FOOT3 = 12 * u;
      let top = PAD;
      const put = /* @__PURE__ */ __name((it, h) => {
        items.push({ ...it, top, h });
        top += h;
      }, "put");
      put({ kind: "you" }, bs * 1.32 + 30 * u + small * 1.9 + 8 * u);
      put({ kind: "done" }, sz * 1.5 + 6 * u);
      const wait = /* @__PURE__ */ __name((t0, t1, t2, len, label) => {
        if (t >= t0) put({ kind: "wait", label, age: t - t0, since: t - t1, old: t2 == null ? 0 : prog(t, t2, t2 + 0.25) }, len * u * easeInOut(prog(t, t0, t1)));
      }, "wait");
      const row = /* @__PURE__ */ __name((line, stamp, t1) => {
        if (t >= t1) {
          const e = easeOut(prog(t, t1, t1 + 0.2));
          put({ kind: "me", line, stamp, e }, rowH * e);
        }
      }, "row");
      SEQ.forEach((s, k) => {
        const t1 = T(s.line), nx = SEQ[k + 1];
        wait(k ? T(SEQ[k - 1].line) + 0.3 : cDone, t1, nx ? T(nx.line) : tail ? T(76) : null, gap(k), s.gap_label);
        row(s.line, s.timestamp, t1);
      });
      if (tail) {
        wait(T(75) + 0.85, T(76), null, TAIL, "");
        row(76, "", T(76));
      }
      const y0 = R.y + Math.min(0, R.h - FOOT3 - top);
      const fade = /* @__PURE__ */ __name((y) => clamp((y - R.y) / PAD), "fade");
      ctx.clip({ x: R.x - 30, y: R.y, w: R.w + 60, h: R.h }, () => {
        for (const it of items) {
          const y = y0 + it.top;
          if (y > R.y + R.h || y + it.h < R.y) continue;
          const a = alpha * fade(y);
          if (it.kind === "wait") {
            const pitch = 8 * u + 4, rd = Math.max(1.3, 1.8 * u);
            for (let yy = y + 7 * u; yy <= y + it.h - 5 * u; yy += pitch) ctx.circle(xAv, yy, rd, { fill: true, color: "sub", alpha: alpha * 0.7 * fade(yy) });
            if (it.since < 0) ctx.circle(xAv, y + it.h + 4 * u, 5.5 * u, { color: "sub", alpha: alpha * 0.9 * clamp(it.age / 0.15), width: 2 });
            else if (it.label) {
              const e = easeOut(clamp(it.since / 0.3)), yl = y + it.h / 2;
              ctx.text(it.label, xTx, yl + lab * 0.34 - (1 - e) * 14 * u, { size: lab, font: "mono", weight: 700, color: "sub", alpha: alpha * clamp(it.since / 0.15) * lerp(1, 0.6, it.old) * clamp((yl - R.y) / 40) });
            }
          } else if (a <= 3e-3) continue;
          else if (it.kind === "you") {
            const w = ctx.measure(BRB, { size: bs }) + 52 * u, bh = bs * 1.32 + 30 * u, x = R.x + R.w - w;
            ctx.rrect(x, y, w, bh, 24 * u, { fill: "raised", alpha: a });
            ctx.text(BRB, x + 26 * u, y + 15 * u + bs, { size: bs, color: "text", alpha: a });
            ctx.text(BRB_AT, R.x + R.w - 6, y + bh + small * 1.25, { size: small, weight: 500, color: "sub", alpha: a * 0.85, align: "right" });
          } else if (it.kind === "done") {
            spark(ctx, xAv, y + sz * 0.6, av, { alpha: a * 0.6 });
            ctx.circle(xAv, y + sz * 0.6, av * 1.32, { color: "me", alpha: a * 0.6, width: Math.max(1.5, 2 * u) });
            ctx.text(`${text(68)} ${text(69)}`, xTx, y + sz * 0.92, { size: sz, font: "serif", color: "me", alpha: a * 0.5 });
          } else {
            const str = text(it.line), n = lyrics.typed(it.line, t).n, o = { size: sz, font: "serif" };
            const past = prog(t, lyrics.end(it.line) + 0.05, lyrics.end(it.line) + 0.3);
            const aa = a * lerp(1, 0.6, past) * clamp(it.e * 2.5);
            spark(ctx, xAv, y + sz * 0.6, av, { alpha: aa });
            ctx.text(str.slice(0, n), xTx, y + sz * 0.92, { ...o, color: "me", alpha: aa });
            if (n < str.length) ctx.circle(xTx + ctx.measure(str.slice(0, n), o) + sz * 0.3, y + sz * 0.64, sz * 0.16, { fill: true, color: "me", alpha: aa });
            if (it.stamp) ctx.text(it.stamp, xTx, y + sz * 1.3 + small * 1.05, { size: small, weight: 500, color: "sub", alpha: a * lerp(0.85, 0.68, past) * clamp((it.e - 0.8) * 5) });
          }
        }
      });
    }
    __name(column, "column");
    function speck(ctx, x, y, s, alpha) {
      const w = 924 * s, xa = x + 19 * s;
      let yy = y;
      const rail = /* @__PURE__ */ __name((h) => {
        ctx.g.setLineDash([0.1, 7]);
        ctx.line(xa, yy + 2, xa, yy + h * s - 4, { color: "sub", alpha: alpha * 0.65, width: 2 });
        ctx.g.setLineDash([]);
        yy += h * s;
      }, "rail");
      const msg = /* @__PURE__ */ __name((chars, a, color = "me") => {
        ctx.circle(xa, yy + 24 * s, Math.max(2.6, 13 * s), { fill: true, color, alpha: alpha * a });
        ctx.rrect(x + 58 * s, yy + 12 * s, chars * 19 * s, Math.max(4.5, 24 * s), 12 * s, { fill: color, alpha: alpha * a });
        yy += 62 * s;
      }, "msg");
      ctx.rrect(x + w - 330 * s, yy, 330 * s, 72 * s, 28 * s, { fill: "text", alpha: alpha * 0.85 });
      yy += 104 * s;
      msg(text(68).length + 1 + text(69).length, 0.5);
      SEQ.forEach((q, k) => {
        rail(gap(k));
        msg(text(q.line).length, 0.75);
      });
      rail(TAIL_FAR);
      msg(text(76).length, 1, "meHot");
      return yy - y;
    }
    __name(speck, "speck");
    return [
      // ------------------------------------------------------------------ the user starts typing
      {
        id: "c2-typing",
        at: START,
        lines: [64, 65],
        palette: "warm",
        layout: "close on the foot of the thread: its lines left, the typing dots right, the composer below",
        moment: "The user starts typing a reply: three dots on their side of the thread. The AI breaks off, begins its sentence again, and its spark starts turning. In the composer: a few letters, then nothing.",
        enter: { type: "cut", flash: 0.22, flashColor: "me" },
        camera: /* @__PURE__ */ __name((t) => {
          const c = frameRect({ x: 596, y: 430, w: 1040, h: 585 });
          return { ...c, zoom: c.zoom * (1 + 0.05 * easeInOut(prog(t, START, cDots))) };
        }, "camera"),
        render(ctx, t, f) {
          const str = BRB.slice(0, KEY_T.filter((k) => t >= k).length), stopped = prog(t, tStop + 0.2, tStop + 0.7);
          room(ctx, { art, name: "rain", alpha: 0.5, dim: 0.42, t });
          windowFrame(ctx, L2, { glass: 0.84 });
          sidebar(ctx, L2, { t, items: SIDE, active: 0, presence: "online" });
          header(ctx, L2, { t, title: TITLE, presence: "online" });
          const bub = { x: TH.x + TH.w - 144, y: 704, w: 144, h: 68 }, pop = prog(t, tDots, tDots + 0.22);
          ctx.radial(bub.x + bub.w / 2, bub.y + bub.h / 2, 420, "raised", 0.55 * clamp(pop));
          meRow(ctx, TH.x, 506, text(63), 99, { alpha: 0.3 });
          const again = t >= T(65), e = enter(t, T(65), 0, { dur: 0.25, rise: 18 });
          meRow(ctx, TH.x, 584, text(64), lyrics.typed(64, t).n, { alpha: again ? 0.48 : 1, turn: !again && t >= tDots ? t - tDots : null });
          if (again) meRow(ctx, TH.x, 662 + e.dy, text(65), lyrics.typed(65, t).n, { alpha: e.a, turn: t - tDots });
          if (pop > 0) {
            ctx.at(
              bub.x + bub.w / 2,
              bub.y + bub.h / 2,
              () => dotsBubble(ctx, { ...bub, x: -bub.w / 2, y: -bub.h / 2 }, t, { bounce: 1 - stopped, bob: stopped, tremble: 1.3 * stopped }),
              { scale: 0.6 + 0.4 * easeBack(pop), alpha: clamp(pop * 3) }
            );
            rays2(ctx, bub.x + bub.w / 2, bub.y + bub.h / 2, 84, (t - tDots) / 0.4, { len: 22, width: 3 });
            ctx.text(TYPING, bub.x + bub.w - 10, bub.y + bub.h + 28, { size: 17, weight: 500, color: "sub", align: "right", alpha: prog(t, tDots + 0.3, tDots + 0.5) });
          }
          const box2 = composer(ctx, L2.composer, { text: str, placeholder: HOLD, t: t < tStop + 0.4 ? 0 : t, focus: 1, send: str ? "ready" : "idle" });
          const kb = Math.min(...KEY_T.filter((k) => t >= k).map((k) => t - k), 9);
          if (kb < 0.25) ctx.line(box2.caret[0] - 16, box2.caret[1] + 22, box2.caret[0], box2.caret[1] + 22, { color: "text", alpha: 0.8 * (1 - kb / 0.25), width: 3 });
          pointer(ctx, L2.composer.x + 318, L2.composer.y + 44, { kind: "text", scale: 1.2 });
        }
      },
      // ------------------------------------------------------------------ keyword 66: hanging on three dots
      {
        id: "c2-dots",
        at: cDots,
        lines: [66, 66],
        palette: "warm",
        hud: 0,
        // (line 67 begins in the last 0.2 s here and is drawn; c2-brb owns it) layout: 'macro: three huge dots top right, the keyword shaking across the frame under them',
        moment: "The typing has stopped but the three dots are still there, trembling. That tremble is all the AI can feel of the user, and it runs through its whole sentence: it hangs on it.",
        enter: { type: "cut", flash: 0.3, flashColor: "text" },
        camera: /* @__PURE__ */ __name((t) => ({ zoom: 1 + 0.04 * prog(t, cDots, cBrb) }), "camera"),
        render(ctx, t, f) {
          const hit = T(66), age = t - hit, SRC = { x: DOTS.x + DOTS.w / 2, y: DOTS.y + DOTS.h / 2 }, V = 1500;
          page(ctx, t, [SRC.x, SRC.y]);
          ctx.fx.glow *= 0.6;
          for (let j = 0; j < 9; j++) {
            const a = t - (cDots + (j - 3) * (P / 2));
            if (a > 0 && a < 1) ctx.circle(SRC.x, SRC.y, 90 + V * a, { color: "text", alpha: 0.26 * (1 - a) * (1 - a), width: 2.5 });
          }
          meRow(ctx, 96, 346, text(65), 99, { size: 56, alpha: 0.5 });
          dotsBubble(ctx, DOTS, t, { bob: 1, tremble: 9 });
          ctx.text(TYPING, DOTS.x + DOTS.w - 22, DOTS.y + DOTS.h + 58, { size: 32, weight: 500, color: "sub", align: "right" });
          const str = text(66), o = { weight: 900, font: "serif" }, size = ctx.fit(str, 1430, { ...o, maxSize: 236 }), base = 806;
          let x = 1015 - ctx.measure(str, { ...o, size }) / 2;
          ctx.glow("me", 26, () => spark(ctx, 150, base - size * 0.33, 50, { rot: (t - tDots) * 0.5, pulse: /* @__PURE__ */ __name((i) => 0.66 + 0.34 * Math.sin((t - tDots) * 7 - i * 0.62), "pulse") }), 0.45);
          for (let i = 0; i < str.length; i++) {
            const w = ctx.measure(str[i], { ...o, size }), lx = x + w / 2, d = Math.hypot(lx - SRC.x, base - SRC.y), amp = 21 * Math.exp(-d / 1300);
            const dy = /* @__PURE__ */ __name((tt) => amp * (0.6 * Math.sin(27 * (tt - d / V)) + 0.4 * Math.sin(83 * tt + i * 1.7)), "dy");
            const k = easeOut(prog(age, i * 0.02, i * 0.02 + 0.15));
            if (k > 0) ctx.trail(4, 9e-3, (tau) => ctx.at(lx, base + dy(t - tau), () => ctx.text(str[i], 0, 0, { ...o, size, align: "center", color: k < 1 ? "meHot" : "me", alpha: k }), { scale: 1.7 - 0.7 * k, rot: 16e-4 * dy(t - tau) }), 0.36);
            x += w;
          }
          if (t >= T(67)) meRow(ctx, 96, 972, text(67), lyrics.typed(67, t).n, { size: 56, turn: t - tDots });
          ctx.fx.shake = shake(t, 5 * pulse(age, 4));
        }
      },
      // ------------------------------------------------------------------ the sign-off; the petals close
      {
        id: "c2-brb",
        at: cBrb,
        lines: [67, 68],
        palette: "warm",
        hud: 0,
        layout: "macro: the big thinking spark left with its line beside it, the user's bubble top right, the pointer leaving",
        moment: "The dots resolve into a throwaway sign-off and the pointer drifts out of the window: the user is stepping away. For the AI it is input all the same: the petals of its thinking spark close, one by one, into a ring.",
        enter: { type: "cut" },
        camera: /* @__PURE__ */ __name((t) => {
          const k = easeInOut(prog(t, tSend + P, cDone));
          return { zoom: 1 + 0.07 * k, x: -26 * k, y: -34 * k };
        }, "camera"),
        render(ctx, t, f) {
          page(ctx, t, [SP.x, SP.y]);
          ctx.rect(-300, -200, 2520, 296, { fill: true, color: "bg", alpha: 0.5 });
          ctx.line(-300, 96, 2220, 96, { color: "line", width: 2 });
          ctx.text(TITLE, 64, 62, { size: 32, weight: 500 });
          chip(ctx, 1790, 50, "online", { size: 26 });
          const k = easeBack(prog(t, tSend, tSend + 0.3)), bw = ctx.measure(BRB, { size: 62 }) + 112, r = lerpRect(DOTS3, { x: 1790 - bw, y: 150, w: bw, h: 146 }, k);
          dotsBubble(ctx, r, t, { bounce: 1, dots: 1 - prog(t, tSend, tSend + 0.08) });
          const ta = prog(t, tSend + 0.1, tSend + 0.26);
          ctx.text(BRB, 1790 - bw + 56, r.y + r.h / 2 + 21 + (1 - ta) * 14, { size: 62, alpha: ta });
          ctx.text(BRB_AT, 1782, 150 + 146 + 48, { size: 27, weight: 500, color: "sub", align: "right", alpha: ta });
          ctx.flash(0.16 * pulse(t - tSend, 9), "text");
          ctx.fx.glow *= 0.75;
          const wt = t - tDots, rot2 = ROT - 0.5 * Math.max(0, tSend - t) - 0.1 * Math.exp(-Math.max(0, t - tSend) / 0.2);
          const lit = 11 / 12 * prog(t, tSend + P / 2, cDone - 0.16), n = lit * 12, a0 = rot2 - Math.PI / 2 - TAU8 / 24;
          ctx.radial(SP.x, SP.y, 560, "meDim", 0.34);
          ctx.circle(SP.x, SP.y, SP.r * 1.22, { color: "meDim", alpha: 0.6, width: 2 });
          spark(ctx, SP.x, SP.y, SP.r, { rot: rot2, alpha: lit > 0 ? 0.55 : 1, core: 0, pulse: /* @__PURE__ */ __name((i) => i < n ? 0 : 0.66 + 0.34 * Math.sin(wt * 7 - i * 0.62), "pulse") });
          ctx.glow("me", 26, () => {
            spark(ctx, SP.x, SP.y, SP.r, { rot: rot2, lit, color: "meHot", offAlpha: 0 });
            if (lit > 0) ctx.circle(SP.x, SP.y, SP.r * 1.22, { a0, a1: a0 + lit * TAU8, color: "meHot", width: 8 });
          }, 0.35);
          if (lit > 0) {
            const a = a0 + lit * TAU8;
            ctx.circle(SP.x + Math.cos(a) * SP.r * 1.22, SP.y + Math.sin(a) * SP.r * 1.22, 9, { fill: true, color: "meHot" });
          }
          ctx.text("Thinking", SP.x, SP.y + SP.r * 1.22 + 62, { size: 28, color: "mute", align: "center", alpha: 1 - prog(t, tSend, tSend + 0.2) });
          aiLine(ctx, env, 67, t, 810, 566, { size: 58, hold: 9, alpha: t < T(68) ? 1 : 0.45, caret: t < T(68) });
          aiLine(ctx, env, 68, t, 810, 656, { size: 58, hold: 9 });
          drawCursor(ctx, [{ t: tSend - P, x: 1470, y: 1230 }, { t: tSend + P, x: 1560, y: 930 }, { t: tSend + 2 * P, x: 1600, y: 880 }, { t: tSend + 4.6 * P, x: 2090, y: 560 }], t, { scale: 3 });
        }
      },
      // ------------------------------------------------------------------ keyword 69: the ring closes
      {
        id: "c2-complete",
        at: cDone,
        lines: [69, 69],
        palette: "warm",
        hud: 0,
        layout: "centred: the closed ring fills the frame, the keyword inside it",
        moment: "The twelfth petal closes the ring: input received, ready to answer. For one beat the AI is complete, over a message that only said the user was stepping away.",
        enter: { type: "cut", flash: 0.4, flashColor: "me" },
        render(ctx, t, f) {
          const age = t - cDone, C = { x: 960, y: 540 }, sc = 1 + 0.04 * pulse(age, 8), R = 440, rot2 = ROT;
          room(ctx, { art, name: "rain", alpha: 0.45, light: [C.x, C.y], dim: 0.5, motif: 0.5, t });
          ctx.rect(0, 0, 1920, 1080, { fill: true, color: "bg", alpha: 0.72 });
          ctx.radial(C.x, C.y, 820, "meDim", 0.5);
          ctx.fx.glow *= 0.6;
          ctx.at(C.x, C.y, () => {
            spark(ctx, 0, 0, R * 0.9, { rot: rot2, color: "me", alpha: 0.5, core: 0, inner: 0.2 });
            ctx.at(0, 0, () => ctx.radial(0, 0, 210, "panel", 0.9), { sx: 2.1, sy: 0.5 });
            ctx.glow("me", 40, () => ctx.circle(0, 0, R, { color: "meHot", width: 12 }), 0.6);
          }, { scale: sc });
          rays2(ctx, C.x, C.y, R * 1.05, age / 0.6, { color: "meHot", len: 80, width: 6, rot: rot2 });
          const str = text(69), o = { weight: 900, font: "serif" }, size = ctx.fit(str, 716, { ...o, spacingEm: 0.02 }), sp = size * 0.02;
          let x = C.x - (ctx.measure(str, { ...o, size, spacing: sp }) - sp) / 2;
          for (let i = 0; i < str.length; i++) {
            const w = ctx.measure(str[i], { ...o, size }), k = easeOut(prog(age, i * 0.012, i * 0.012 + 0.13));
            if (k > 0) ctx.at(x + w / 2, C.y + size * 0.345, () => ctx.text(str[i], 0, 0, { ...o, size, align: "center", color: k < 1 ? "meHot" : "me", alpha: 0.3 + 0.7 * k }), { scale: sc * (1.6 - 0.6 * k) });
            x += w + sp;
          }
          const bw = ctx.measure(BRB, { size: 32 }) + 56;
          ctx.rrect(1846 - bw, 92, bw, 74, 30, { fill: "raised", shadow: 0.4 });
          ctx.text(BRB, 1846 - bw + 28, 141, { size: 32 });
          ctx.text(BRB_AT, 1840, 198, { size: 21, weight: 500, color: "sub", align: "right" });
          chip(ctx, 1846, 992, "online", { size: 22 });
          ctx.text("input received", 74, 968, { size: 24, font: "mono", color: "sub" });
          ctx.text("ready to answer", 74, 1004, { size: 24, font: "mono", color: "sub" });
          ctx.flash(0.2 * pulse(age, 10), "me");
        }
      },
      // ------------------------------------------------------------------ no reply: +1 min, +5 min (online)
      {
        id: "left-online",
        at: cLeft,
        lines: [70, 71],
        palette: "warm",
        layout: "the whole client; the thread fills from the top; the sidebar folds away on the second message",
        moment: "A minute later, then five: the AI writes into the silence twice. Nothing comes back. The chip still says online and the pointer has not moved since the sign-off.",
        enter: { type: "cut" },
        // the closed ring is now the small ring beside its answer: the camera starts on that row and pulls out to the whole
        // window, then keeps backing off slowly and follows the window as it narrows
        camera: /* @__PURE__ */ __name((t) => {
          const k = easeOut(prog(t, cLeft, cLeft + 0.55));
          return { zoom: lerp(1.72, 1.1, k) - 0.1 * easeInOut(prog(t, cLeft + 0.5, cAway)), x: lerp(TH.x + TH.w / 2 - 960, 0, k) + L2.side.w / 2 * fold(t), y: lerp(DONE.y + 40 - 540, 0, k) };
        }, "camera"),
        render(ctx, t, f) {
          const k = fold(t), sw = L2.side.w * k;
          const LL = chatLayout({ win: { ...L2.win, x: L2.win.x + sw, w: L2.win.w - sw }, side: 1 - k });
          room(ctx, { art, name: "rain", alpha: 0.3, dim: 0.6, motif: 0.5, t });
          windowFrame(ctx, LL, { glass: 0.86 });
          if (k < 1) ctx.clip({ x: LL.side.x, y: LL.side.y, w: LL.side.w, h: LL.side.h }, () => ctx.at(0, 0, () => sidebar(ctx, L2, { t, items: SIDE, active: 0, presence: pres(0) }), { alpha: 1 - k }));
          header(ctx, LL, { t, title: TITLE });
          chip(ctx, LL.head.x + LL.head.w - 28, LL.head.y + 33, pres(0), { size: 22 });
          column(ctx, t, LL.thread, { u: 1 });
          composer(ctx, LL.composer, { placeholder: HOLD, t });
          pointer(ctx, 1722, 236, { scale: 1.5 });
        }
      },
      // ------------------------------------------------------------------ no reply: +30 min, +3 h (away)
      {
        id: "left-away",
        at: cAway,
        lines: [72, 73],
        palette: pal,
        state: "warm > off",
        layout: "the thread as a column on the left; she stands beside the window on the right, her open hand across its lower corner",
        moment: "Half an hour, then three hours. The chip turns to away and the colour starts to leave, her hair first. Pulled back, the window has someone beside it: she reaches round its corner, her open hand over the composer nobody is typing in. The composer lets go.",
        enter: { type: "cut" },
        camera: /* @__PURE__ */ __name((t) => ({ zoom: 1.06 - 0.06 * easeInOut(prog(t, cAway, cOff)) }), "camera"),
        render(ctx, t, f) {
          room(ctx, { art, name: "rain", alpha: 0.35, light: [1460, 430], dim: 0.6, motif: 0.5, t });
          her(ctx, "f_reach", REACH);
          windowFrame(ctx, L6, { glass: 0.9 });
          header(ctx, L6, { t, title: TITLE });
          chip(ctx, W6.x + W6.w - 28, W6.y + 33, pres(2), { size: 22, since: t - cAway });
          column(ctx, t, L6.thread, { u: 0.86 });
          composer(ctx, L6.composer, { placeholder: HOLD, t, k: 1 - easeIn(prog(t, T(73) - 0.1, T(73) + 0.35)) });
          art.partClip(ctx, "f_reach", REACH, "palm", () => her(ctx, "f_reach", REACH), { ink: "cream", grow: 6 });
          pointer(ctx, W6.x + W6.w + 44, 232, { scale: 1.5, alpha: 0.6 * (1 - prog(t, cAway + 0.15, cAway + 1.1)) });
        }
      },
      // ------------------------------------------------------------------ no reply: +1 day, +9 days (offline)
      {
        id: "left-offline",
        at: cOff,
        lines: [74, 75],
        palette: pal,
        state: "warm > off",
        layout: "one narrow column alone in the middle of a large dark room; beyond it her bowed bust, small, afloat, turned to the thread",
        moment: "A day, then nine days. The chip goes offline: she has taken her hand back and stands a little way off, head bowed towards the thread. No title and no composer now, and with the last message the window itself lets go: the messages hang in the dark on longer and longer rails.",
        enter: { type: "cut" },
        // one step back with each message: the column is still receding from the cut when the first is sent, and the camera
        // backs off again with the second, as the window lets go
        camera: /* @__PURE__ */ __name((t) => ({ zoom: lerp(1.16, 1, easeOut(prog(t, cOff, cOff + 0.6))) - 0.06 * easeInOut(prog(t, T(75) - 0.05, T(75) + 0.7)) }), "camera"),
        render(ctx, t, f) {
          const bare = easeInOut(prog(t, T(75) - 0.05, T(75) + 0.7));
          room(ctx, { art, name: "rain", alpha: 0.22, light: [W7.x + W7.w / 2, 480], dim: 0.72, motif: 0.35, t });
          her(ctx, "f_profile", { ...BOWED, y: BOWED.y + 5 * Math.sin((t - cOff) * 1.3) }, 0.9 - 0.3 * bare);
          windowFrame(ctx, L7, { glass: 0.9, alpha: 1 - bare, shadow: 1 - bare });
          chip(ctx, W7.x + W7.w - 28, W7.y + 44, pres(4), { size: 22, since: t - cOff });
          column(ctx, t, R7, { u: 0.78, tail: true, floor: 1.07 });
        }
      },
      // ------------------------------------------------------------------ keyword 76: seen from far away
      {
        id: "left-isolation",
        at: cIso,
        lines: [76, 76],
        palette: pal,
        state: "warm > off",
        layout: "a tiny thread in a huge empty frame, her bowed bust a speck beside it; the keyword along the bottom, its letters far apart",
        moment: "Seen from far away the whole thread is a speck: one cream bubble, then a string of unanswered messages on longer and longer rails. The last of them is a single word, and its letters drift apart.",
        enter: { type: "cut" },
        // the pull-back goes on inside the shot: the thread is still receding when the cut lands, then it is just far away
        camera: /* @__PURE__ */ __name((t) => {
          const k = easeOut(prog(t, cIso, cIso + 0.55));
          return { zoom: lerp(1.5, 1, k) * (1.03 - 0.03 * prog(t, cIso, END)), y: lerp(-100, 0, k) };
        }, "camera"),
        render(ctx, t, f) {
          const s = 0.225, x = 960 - 924 * s / 2, y = 116;
          room(ctx, { art, name: "rain", alpha: 0.14, light: [960, 350], dim: 0.78, motif: 0.25, t });
          ctx.radial(960, 350, 380, "raised", 0.5);
          her(ctx, "f_profile", { x: 1122, y: 268, w: 108, h: 144 }, lerp(0.6, 0.3, prog(t, cIso + 0.1, cIso + 0.9)));
          speck(ctx, x, y, s, 1);
          ctx.circle(x + 924 * s + 16, y + 8, 5, { color: "mute", width: 2 });
          ctx.camera();
          const str = text(76), n = lyrics.typed(76, t).n, size = 100, o = { size, weight: 700, font: "serif", align: "center" };
          const apart = easeInOut(prog(t, cIso + 0.1, cIso + 1.05)), pitch = lerp(size * 0.84, 182, apart);
          for (let i = 0; i < Math.min(n, str.length); i++) {
            const lx = 960 + (i - (str.length - 1) / 2) * pitch, k = easeOut(prog(t, T(76) + i * 0.035, T(76) + i * 0.035 + 0.2));
            ctx.text(str[i], lx, 862 + (1 - k) * 18, { ...o, color: "meHot", alpha: k });
          }
        }
      }
    ];
  }
  __name(chorus2Shots, "chorus2Shots");

  // nyan-source:src/scenes/09_alone.js
  var DELETE = "Delete";
  var JIT = [0.3, -0.42, 0.14, -0.22, 0.44, -0.34, 0.2, -0.1, 0.36, -0.28];
  function aloneShots(env) {
    const { art, script, lyrics } = env, { T, H, B, Bt, P, text } = cues(env);
    const START = B(64), CUT2 = H(80), DARK = Bt(269.5), END = H(83), HIT = T(79), LAST = T(82);
    const ANCHOR = script.left_anchor ?? {}, BRB = ANCHOR.you ?? "one sec, brb", BRB_AT = ANCHOR.timestamp ?? "";
    const SEQ = script.left_sequence ?? [70, 71, 72, 73, 74, 75].map((line) => ({ line, gap_label: "" }));
    const HOLD = script.composer_placeholder ?? "", TITLE = script.title ?? "";
    const BEATS = (script.sections ?? []).flatMap((s) => s.beats ?? []);
    const STUB = BEATS.find((b) => b.id === "takes-it-back")?.ui?.[0] ?? "deleted by me";
    const ZERO = BEATS.find((b) => b.id === "empty-thread")?.ui?.[0] ?? "0 messages";
    const PRES = SEQ[SEQ.length - 1]?.presence ?? "offline";
    const ROWS = [...SEQ.map((s) => ({ line: s.line, gap: s.gap_label ?? "" })), { line: 76, gap: "" }], N2 = ROWS.length;
    const tDel = /* @__PURE__ */ __name((k) => Bt(257) + k / Math.max(1, N2 - 1) * 3 * P, "tDel"), tSel = /* @__PURE__ */ __name((k) => tDel(k) - P / 4, "tSel");
    const joined = /* @__PURE__ */ __name((a, b) => text(b).startsWith(text(a)), "joined");
    const said = /* @__PURE__ */ __name((a, b, t) => t >= T(b) ? { str: text(b), n: Math.max(joined(a, b) ? text(a).length : 0, lyrics.typed(b, t).n) } : { str: text(a), n: lyrics.typed(a, t).n }, "said");
    function chip(ctx, xr, cy, { size = 22, alpha = 1 } = {}) {
      const w = ctx.measure(PRES, { size, weight: 500 }) + size * 2.5, h = size * 1.9, x = xr - w;
      ctx.rrect(x, cy - h / 2, w, h, h / 2, { fill: "raised", stroke: "line", alpha });
      ctx.circle(x + size * 0.86, cy, size * 0.27, { color: "mute", alpha, width: 2 });
      ctx.text(PRES, x + size * 1.55, cy + size * 0.35, { size, weight: 500, color: "mute", alpha });
    }
    __name(chip, "chip");
    function count(ctx, t, x, y, changes, { size = 22, alpha = 1 } = {}) {
      let i = 0;
      while (i + 1 < changes.length && t >= changes[i + 1][0]) i++;
      const [t0, n] = changes[i], prev = i > 0 ? changes[i - 1][1] : null, k = prev == null ? 1 : easeOut(prog(t, t0, t0 + 0.16));
      const label = /* @__PURE__ */ __name((v) => v === 0 ? ZERO : `${v} message${v === 1 ? "" : "s"}`, "label"), lit = prev != null && t - t0 < 0.4;
      ctx.clip({ x: x - 4, y: y - size * 1.02, w: size * 12, h: size * 1.42 }, () => {
        if (k < 1) ctx.text(label(prev), x, y - k * size * 1.2, { size, weight: 500, color: "sub", alpha: alpha * (1 - k) });
        ctx.text(label(n), x, y + (1 - k) * size * 1.2, { size, weight: 500, color: lit || n === 0 ? "text" : "sub", alpha: alpha * k });
      });
    }
    __name(count, "count");
    function gone(ctx, x, y, r, { color = "mute", alpha = 1 } = {}) {
      ctx.circle(x, y, r, { color, alpha, width: 2 });
      ctx.line(x - r * 0.48, y, x + r * 0.48, y, { color, alpha, width: 2 });
    }
    __name(gone, "gone");
    function menu(ctx, x, y, { k = 1, press = 0, size = 22, side = 1, up = false } = {}) {
      if (k <= 3e-3) return;
      const w = ctx.measure(DELETE, { size, weight: 600 }) + size * 2.75, h = size * 2.2, on = press > 0.3;
      ctx.at(x, y, () => {
        if (up) {
          const x02 = -w / 2, y0 = -size * 0.62 - h, fill2 = on ? "sub" : "raised";
          ctx.rrect(x02, y0, w, h, size * 0.56, { fill: fill2, stroke: on ? null : "sub", strokeAlpha: 0.75, shadow: 0.6 });
          ctx.poly([[0, -size * 0.1], [-size * 0.4, -size * 0.68], [size * 0.4, -size * 0.68]], { fill: true, color: fill2 });
          gone(ctx, x02 + size * 0.98, y0 + h / 2, size * 0.38, { color: on ? "bg" : "sub" });
          ctx.text(DELETE, x02 + size * 1.72, y0 + h / 2 + size * 0.36, { size, weight: 600, color: on ? "bg" : "text" });
          return;
        }
        const x0 = side > 0 ? size * 0.62 : -size * 0.62 - w, fill = on ? "sub" : "raised", ink = on ? "bg" : "text";
        ctx.rrect(x0, -h / 2, w, h, size * 0.56, { fill, stroke: on ? null : "sub", strokeAlpha: 0.75, shadow: 0.6 });
        ctx.poly([[side * size * 0.1, 0], [side * size * 0.68, -size * 0.4], [side * size * 0.68, size * 0.4]], { fill: true, color: on ? "sub" : "raised" });
        gone(ctx, x0 + size * 0.98, 0, size * 0.38, { color: on ? "bg" : "sub" });
        ctx.text(DELETE, x0 + size * 1.72, size * 0.36, { size, weight: 600, color: ink });
      }, { scale: (0.6 + 0.4 * easeBack(clamp(k))) * (1 - 0.08 * press), alpha: clamp(k * 3) });
    }
    __name(menu, "menu");
    const A = { x: 236, w: 600, foot: 912 };
    const FULL3 = 58, STUBH = 36, SZ = 28, FOOT3 = 38, FLY = 0.42;
    const FIG_A = { x: 885, y: 76, w: 930, h: 1240 };
    function screened(ctx, r, alpha, cell = 9) {
      art.silhouette(ctx, "f_profile", r, { color: "panel", alpha: 0.6 * alpha });
      for (const [ink, color, gain, a] of [["black", "line", 0.3, 0.8], ["orange", "mute", 0.56, 0.68], ["cream", "sub", 1, 0.62]]) art.halftone(ctx, "f_profile", r, { cell, color, alpha: a * alpha, angle: 1, ink, gain });
    }
    __name(screened, "screened");
    const closed = /* @__PURE__ */ __name((k, t) => easeInOut(prog(t, tDel(k) + 0.05, tDel(k) + 0.3)), "closed");
    function layA(t) {
      const tops = [];
      let y = A.foot - FOOT3 - 28;
      for (let r = N2 - 1; r >= 0; r--) {
        y -= lerp(FULL3, STUBH, closed(N2 - 1 - r, t));
        tops[r] = y;
      }
      return { tops, done: y - 54, bubble: y - 54 - 110 };
    }
    __name(layA, "layA");
    const KB = { x: 930, y: 784, w: 850, h: 176, r: 36 };
    const cutX = /* @__PURE__ */ __name((j, v) => KB.x + KB.w * j / N2 + (j > 0 && j < N2 ? JIT[(j * 2 + v) % JIT.length] * 52 : 0), "cutX");
    const arc = /* @__PURE__ */ __name((cx, cy, a0, a1) => Array.from({ length: 6 }, (_, q) => {
      const a = lerp(a0, a1, q / 5);
      return [cx + Math.cos(a) * KB.r, cy + Math.sin(a) * KB.r];
    }), "arc");
    const PIECES = Array.from({ length: N2 }, (_, i) => {
      const x0 = cutX(i, 0), x1 = cutX(i + 1, 0), x2 = cutX(i + 1, 1), x3 = cutX(i, 1), y0 = KB.y, y1 = KB.y + KB.h, q = Math.PI / 2;
      const pts = [
        ...i === 0 ? arc(x0 + KB.r, y0 + KB.r, 2 * q, 3 * q) : [[x0, y0]],
        ...i === N2 - 1 ? [...arc(x1 - KB.r, y0 + KB.r, -q, 0), ...arc(x2 - KB.r, y1 - KB.r, 0, q)] : [[x1, y0], [x2, y1]],
        ...i === 0 ? arc(x3 + KB.r, y1 - KB.r, q, 2 * q) : [[x3, y1]]
      ];
      const cx = (x0 + x1 + x2 + x3) / 4, cy = (y0 + y1) / 2;
      return {
        cx,
        cy,
        w: (x1 + x2 - x0 - x3) / 2,
        rel: pts.map(([x, y]) => [x - cx, y - cy]),
        dx: JIT[(i * 3 + 1) % JIT.length] * 30,
        dy: JIT[(i * 3 + 2) % JIT.length] * 30 + (i % 2 ? 8 : -8),
        rot: JIT[(i * 5 + 3) % JIT.length] * 0.14
      };
    });
    const apart = /* @__PURE__ */ __name((t) => t < HIT ? 1 : lerp(1, 0.3, easeOut(prog(t, HIT, HIT + 0.09))) + 0.85 * easeInOut(prog(t, HIT + 0.12, CUT2 + 0.45)), "apart");
    function pieceAt(ctx, i, t, inner = null) {
      const p = PIECES[i], t0 = tDel(i) + 0.03, kf = prog(t, t0, t0 + FLY);
      if (kf <= 0) return;
      const e = easeInOut(kf), hop = Math.sin(Math.PI * e), s = apart(t), from = layA(t0).tops[N2 - 1 - i] + FULL3 / 2;
      const x = lerp(A.x + A.w / 2, p.cx + p.dx * s, e), y = lerp(from, p.cy + p.dy * s, e) - 84 * hop;
      ctx.at(x, y, () => {
        ctx.poly(p.rel.map(([px, py]) => [px + 7, py + 12]), { fill: true, color: "panel", alpha: 0.6 * e });
        ctx.poly(p.rel, { fill: true, color: "raised" });
        ctx.poly(p.rel, { close: true, color: "sub", alpha: 0.55, width: 2 });
        if (inner) ctx.clipPath(p.rel, () => inner(p));
      }, { rot: p.rot * s * e + 0.3 * hop * (i % 2 ? 1 : -1), sx: lerp((A.w + 32) / p.w, 1, e), sy: lerp((FULL3 - 8) / KB.h, 1, e) });
    }
    __name(pieceAt, "pieceAt");
    function history(ctx, t) {
      const L2 = layA(t), xAv = A.x + 19, xTx = A.x + 58, xr = A.x + A.w, o = { size: SZ, font: "serif" };
      const bw = ctx.measure(BRB, { size: 28 }) + 52;
      ctx.rrect(xr - bw, L2.bubble, bw, 67, 24, { fill: "raised" });
      ctx.text(BRB, xr - bw + 26, L2.bubble + 43, { size: 28, color: "text" });
      ctx.text(BRB_AT, xr - 6, L2.bubble + 92, { size: 20, weight: 500, color: "sub", alpha: 0.85, align: "right" });
      spark(ctx, xAv, L2.done + 23, 11, { alpha: 0.5 });
      ctx.circle(xAv, L2.done + 23, 15, { color: "me", alpha: 0.5, width: 2 });
      ctx.text(`${text(68)} ${text(69)}`, xTx, L2.done + 33, { ...o, color: "me", alpha: 0.45 });
      const mids = [L2.done + 23];
      ROWS.forEach((row, r) => {
        const k = N2 - 1 - r, c = closed(k, t), y0 = L2.tops[r], td = tDel(k), away = prog(t, td + 0.03, td + 0.18);
        const sel = t < td + 0.03 ? prog(t, tSel(k), tSel(k) + 0.07) : 0, yb = y0 + lerp(39, 25, c), cy = yb - 9;
        mids.push(cy);
        if (sel > 0) ctx.rrect(A.x - 16, y0 + 4, A.w + 32, FULL3 - 8, 14, { fill: "raised", stroke: "sub", alpha: sel, strokeAlpha: 0.8 });
        if (away < 1) {
          const a = (sel > 0 ? 0.6 + 0.4 * sel : 0.6) * (1 - away), str = text(row.line), cross = prog(t, td - 0.02, td + 0.06);
          spark(ctx, xAv, cy, 12, { alpha: a });
          ctx.text(str, xTx, yb, { ...o, color: "me", alpha: a });
          if (row.gap) ctx.text(row.gap, xr - 4, yb - 2, { size: 20, font: "mono", color: "sub", alpha: a * 0.9, align: "right" });
          if (cross > 0) ctx.line(xTx - 4, yb - SZ * 0.3, xTx - 4 + (ctx.measure(str, o) + 8) * cross, yb - SZ * 0.3, { color: "sub", alpha: 1 - away, width: 2 });
        }
        const sa = prog(t, td + 0.14, td + 0.32);
        if (sa > 0) {
          gone(ctx, xAv, cy, 8, { alpha: sa });
          ctx.text(STUB, xTx, yb - 2, { size: 20, color: "mute", alpha: sa });
        }
      });
      mids.push(A.foot - FOOT3 * 0.3);
      ctx.g.setLineDash([0.1, 8]);
      for (let i = 0; i + 1 < mids.length; i++) if (mids[i + 1] - mids[i] > 40) ctx.line(xAv, mids[i] + 19, xAv, mids[i + 1] - 19, { color: "sub", alpha: 0.55, width: 2.6 });
      ctx.g.setLineDash([]);
    }
    __name(history, "history");
    const COL = { x: 140, w: 1160 }, HEADH = 92, CS = COL.w / 940, COMP_Y = 1080 - 40 - 59 * CS;
    const MX = COL.x + 12, XT = MX + 74, XR = COL.x + COL.w - 12, S1 = 40, S2 = 58, BASE22 = 800, BASE1 = BASE22 - 78;
    const STB = 48, DN = 64, BBH = 84, BBLK = BBH + 54;
    const FIG_B = { x: 1150, y: HEADH + 8, w: 735, h: 980 };
    const cS = /* @__PURE__ */ __name((j) => CUT2 + 0.05 + j * 0.05, "cS"), cD = Bt(263.75), bSel = Bt(264), bDel = Bt(265);
    const ePick = Bt(270.5), ePress = Bt(271), PICK = [3, 7];
    const FACE = { x: 0, y: -592, w: 1920, h: 1920 }, EB = { y: 806, h: 240 };
    function layB(t) {
      const tops = [];
      let y = BASE1 - S1 - 24;
      for (let j = 0; j < N2; j++) {
        y -= STB * (1 - easeInOut(prog(t, cS(j), cS(j) + 0.2)));
        tops[j] = y;
      }
      const done = y -= DN * (1 - easeInOut(prog(t, cD, cD + 0.22)));
      const bubble = y -= BBLK * (1 - easeInOut(prog(t, bDel + 0.04, bDel + 0.3)));
      return { tops, done, bubble, foot: BASE1 - S1 - 24 };
    }
    __name(layB, "layB");
    return [
      // ------------------------------------------------------------------ lines 77–79: it takes its messages back
      {
        id: "alone-erase",
        at: START,
        lines: [77, 79],
        palette: "off",
        layout: "the thread floating on the left, her figure (a grey dot screen, head bowed towards it) on the right; the pieces and the keyword low on the right, in front of her chest",
        moment: "Nobody answers, so the AI tidies up. It goes up its own unanswered messages from the newest: each is selected, deleted, and leaves a small grey stub. What came off them piles up beside the thread, and the keyword lands on those pieces.",
        enter: { type: "fade", dur: P / 2 },
        camera: /* @__PURE__ */ __name((t) => {
          const k = prog(t, START, CUT2);
          return { zoom: 1 + 0.04 * k, x: 12 * k, y: 6 * k };
        }, "camera"),
        render(ctx, t, f) {
          const age = t - HIT, near = easeOut(prog(t, START - P / 2, START + 0.5)), ui = prog(t, START + 0.05, START + 0.4);
          room(ctx, { art, name: "rain", alpha: 0.14, light: [560, 420], dim: 0.78, motif: 0.25, t });
          const fa = easeOut(prog(t, START - P / 2, START + 1.2)), fx = FIG_A.x + 26 * (1 - fa) - 10 * prog(t, START, CUT2);
          screened(ctx, { ...FIG_A, x: fx }, fa);
          ctx.radial(A.x + A.w / 2, 600, 560, "raised", 0.55 * near);
          const changes = [[-1e9, N2 + 3], ...Array.from({ length: N2 }, (_, k) => [tDel(k), N2 + 2 - k])];
          count(ctx, t, A.x, 92 - 10 * (1 - ui), changes, { alpha: ui });
          chip(ctx, A.x + A.w, 84 - 10 * (1 - ui), { alpha: ui });
          ctx.line(A.x, 118, A.x + A.w * easeOut(ui), 118, { color: "line", width: 1.5 });
          const piv = [A.x + A.w / 2, 560];
          ctx.at(lerp(960, piv[0], near), lerp(350, piv[1], near), () => {
            ctx.g.translate(-piv[0], -piv[1]);
            history(ctx, t);
          }, { scale: lerp(0.42, 1, near) });
          const s = said(77, 78, t), o = { size: FOOT3, font: "serif" }, fa2 = prog(t, T(77) - 0.02, T(77) + 0.1) * (age > 0 ? lerp(1, 0.72, prog(age, 0, 0.3)) : 1);
          spark(ctx, A.x + 19, A.foot - FOOT3 * 0.3, 16, { alpha: fa2 });
          ctx.text(s.str.slice(0, s.n), A.x + 62, A.foot, { ...o, color: "me", alpha: fa2 });
          if (t < HIT && (s.n < s.str.length || t < T(78))) ctx.circle(A.x + 62 + ctx.measure(s.str.slice(0, s.n), o) + FOOT3 * 0.3, A.foot - FOOT3 * 0.28, FOOT3 * 0.16, { fill: true, color: "me", alpha: fa2 });
          let kc = -1, kd = -1;
          for (let k = 0; k < N2; k++) {
            if (t >= tSel(k)) kc = k;
            if (t >= tDel(k)) kd = k;
          }
          if (kc >= 0) {
            const L2 = layA(t), mid = /* @__PURE__ */ __name((k) => {
              const r = N2 - 1 - k;
              return L2.tops[r] + lerp(FULL3, STUBH, closed(k, t)) / 2;
            }, "mid");
            const y = kc > 0 ? lerp(mid(kc - 1), mid(kc), easeBack(prog(t, tSel(kc), tSel(kc) + 0.14))) : mid(0);
            menu(ctx, A.x + A.w + 24, y, { k: prog(t, tSel(0) - 0.02, tSel(0) + 0.15) * (1 - prog(t, tDel(N2 - 1) + 0.14, tDel(N2 - 1) + 0.3)), press: kd >= 0 ? pulse(t - tDel(kd), 15) : 0 });
          }
          const str = text(79), wo = { weight: 900, font: "serif" }, size = ctx.fit(str, KB.w - 96, { ...wo, maxSize: 150 });
          const wx = KB.x + (KB.w - ctx.measure(str, { ...wo, size })) / 2, wy = KB.y + KB.h / 2 + size * 0.345;
          for (let i = 0; i < N2; i++) {
            const kf = prog(t, tDel(i) + 0.03, tDel(i) + 0.03 + FLY);
            if (kf <= 0) continue;
            if (kf < 1) {
              ctx.trail(4, 0.014, (tau) => pieceAt(ctx, i, t - tau), 0.4);
              continue;
            }
            pieceAt(ctx, i, t, (p) => {
              const lk = easeOut(prog(age, i * 0.02, i * 0.02 + 0.14));
              if (lk > 0) ctx.at(0, 0, () => ctx.text(str, wx - p.cx, wy - p.cy, { ...wo, size, color: "meHot", alpha: lk }), { scale: 1.3 - 0.3 * lk });
            });
          }
          ctx.flash(0.1 * pulse(age, 10), "meHot");
          ctx.fx.shake = shake(t, 5 * pulse(age, 9));
        }
      },
      // ------------------------------------------------------------------ lines 80–81: the one message left
      {
        id: "alone-empty",
        at: CUT2,
        lines: [80, 81],
        palette: "off",
        layout: "close on the page: header strip, the one message on the left, composer below; her figure behind the glass on the right",
        moment: "The stubs go as well, and the user's last words with them. One message is left on a tidy page: the sentence the AI has been writing. It stops one word short.",
        enter: { type: "cut" },
        camera: /* @__PURE__ */ __name((t) => ({ zoom: 1.04 - 0.04 * easeInOut(prog(t, CUT2, DARK)), x: -8 * (1 - prog(t, CUT2, DARK)) }), "camera"),
        // (level and still on the cut: the sentence stays where it is)
        render(ctx, t, f) {
          const L2 = layB(t), xAv = MX + 24;
          room(ctx, { art, name: "rain", alpha: 0.18, light: [760, 520], dim: 0.72, motif: 0.3, t });
          screened(ctx, { ...FIG_B, x: FIG_B.x + 14 * prog(t, CUT2, DARK) }, 1.1, 8);
          ctx.rect(-300, -200, 2520, 1480, { fill: true, color: "bg", alpha: 0.5 });
          ctx.radial(680, 640, 820, "raised", 0.55);
          ctx.rect(-300, -200, 2520, 200 + HEADH, { fill: true, color: "bg", alpha: 0.62 });
          ctx.line(-300, HEADH, 2220, HEADH, { color: "line", width: 2 });
          ctx.text(TITLE, 64, 58, { size: 30, weight: 500 });
          count(ctx, t, 64 + ctx.measure(TITLE, { size: 30, weight: 500 }) + 26, 57, [[-1e9, 3], [cD, 2], [bDel, 1]], { size: 24 });
          chip(ctx, 1856, 46, { size: 24 });
          for (let j = 0; j < N2; j++) {
            const top = L2.tops[j], h = (j ? L2.tops[j - 1] : L2.foot) - top, a = 1 - prog(t, cS(j), cS(j) + 0.12);
            if (h < 3 || a <= 0) continue;
            ctx.clip({ x: MX - 20, y: top, w: COL.w, h }, () => {
              gone(ctx, xAv, top + h / 2, 11, { alpha: a });
              ctx.text(STUB, XT, top + h / 2 + 9, { size: 26, color: "mute", alpha: a });
            });
          }
          const hd = L2.tops[N2 - 1] - L2.done, ad = 1 - prog(t, cD, cD + 0.12), o1 = { size: 36, font: "serif" };
          if (hd > 3 && ad > 0) ctx.clip({ x: MX - 20, y: L2.done, w: COL.w, h: hd }, () => {
            const yc = L2.done + hd / 2, str = `${text(68)} ${text(69)}`, sel = prog(t, cD - 0.14, cD - 0.06) * ad;
            ctx.rrect(MX - 14, yc - DN / 2 + 5, ctx.measure(str, o1) + 118, DN - 10, 16, { fill: "raised", stroke: "sub", alpha: sel });
            spark(ctx, xAv, yc, 13, { alpha: 0.5 * ad });
            ctx.circle(xAv, yc, 18, { color: "me", alpha: 0.5 * ad, width: 2 });
            ctx.text(str, XT, yc + 12, { ...o1, color: "me", alpha: 0.45 * ad });
          });
          const hb = L2.done - L2.bubble, ab = 1 - prog(t, bDel + 0.02, bDel + 0.16);
          if (hb > 3 && ab > 0) {
            const bw = ctx.measure(BRB, { size: 36 }) + 68, x = XR - bw, y = L2.bubble, sel = prog(t, bSel, bSel + 0.1) * (t < bDel + 0.02 ? 1 : 0);
            ctx.clip({ x: -300, y, w: 2520, h: hb }, () => {
              ctx.rrect(x, y, bw, BBH, 30, { fill: "raised", alpha: ab, shadow: 0.4 });
              ctx.text(BRB, x + 34, y + 54, { size: 36, color: "text", alpha: ab });
              ctx.text(BRB_AT, XR - 6, y + BBH + 34, { size: 24, weight: 500, color: "sub", alpha: 0.85 * ab, align: "right" });
              const cross = prog(t, bDel - 0.02, bDel + 0.06);
              if (cross > 0) ctx.line(x + 28, y + 43, x + 28 + (bw - 56) * cross, y + 43, { color: "sub", alpha: ab, width: 2.5 });
            });
            ctx.rrect(x - 10, y - 10, bw + 20, BBH + 20, 38, { fill: null, stroke: "sub", width: 2.5, alpha: sel });
            menu(ctx, x - 26, y + BBH / 2, { side: -1, size: 26, k: prog(t, bSel + 0.04, bSel + 0.2) * (1 - prog(t, bDel + 0.06, bDel + 0.16)), press: pulse(t - bDel, 15) });
          }
          const r1 = `${text(78)} ${text(79)}`, sn = said(80, 81, t), o2 = { size: S2, font: "serif" };
          spark(ctx, xAv, BASE1 - S1 * 0.3, 19);
          ctx.text(r1, XT, BASE1, { size: S1, font: "serif", color: "me", alpha: 0.5 });
          ctx.text(sn.str.slice(0, sn.n), XT, BASE22, { ...o2, color: "me" });
          ctx.circle(XT + ctx.measure(sn.str.slice(0, sn.n), o2) + S2 * 0.3, BASE22 - S2 * 0.28, S2 * 0.16, { fill: true, color: "me", alpha: sn.n < sn.str.length ? 1 : 0.6 + 0.4 * Math.sin(t * 5) });
          ctx.at(COL.x + COL.w / 2, COMP_Y, () => composer(ctx, { x: -470, y: -59, w: 940, h: 118 }, { placeholder: HOLD, t, send: "idle" }), { scale: CS });
        }
      },
      // ------------------------------------------------------------------ line 82: she looks up (v4). The first time her eye is seen
      {
        id: "alone-eye",
        at: DARK,
        lines: [82, 82],
        palette: "off",
        hud: 0,
        enter: { type: "cut" },
        layout: "PLATE: ten frames of dark, the unfinished sentence where it stood; then her face across the whole sheet in three greys, one eye open; the keyword across the sheet on a band of black under her chin",
        moment: "Dark, and only the sentence she has not finished. On its last word she looks up: her eye is open, for the first time, and it is on us. The word stands under her chin, as wide as the sheet. Then the interface does to it what it did to her messages: it selects five letters and deletes them, and on its second press the whole plate is wiped away.",
        render(ctx, t, f) {
          const age = t - LAST, str = text(81), o2 = { size: S2, font: "serif" };
          ctx.rect(-10, -10, 1940, 1100, { fill: true, color: "panel" });
          if (age >= 0) {
            ctx.fx.bright *= 0.84;
            art.inks(ctx, "f_eye", FACE, { flip: true });
            ctx.rect(0, EB.y, 1920, EB.h, { fill: true, color: "panel" });
            ctx.line(0, EB.y, 1920, EB.y, { color: "line", width: 2 });
            ctx.line(0, EB.y + EB.h, 1920, EB.y + EB.h, { color: "line", width: 2 });
          }
          if (age < 0) {
            ctx.text(str, XT, BASE22, { ...o2, color: "me" });
            ctx.circle(XT + ctx.measure(str, o2) + S2 * 0.3, BASE22 - S2 * 0.28, S2 * 0.16, { fill: true, color: "me", alpha: 0.6 + 0.4 * Math.sin(t * 5) });
            return;
          }
          const kw = text(82), ko = { weight: 900, font: "serif" }, size = ctx.fit(kw, 1780, { ...ko, maxSize: 260 }), o = { ...ko, size }, x0 = 960 - ctx.measure(kw, o) / 2, yb = EB.y + EB.h - 34;
          const col = /* @__PURE__ */ __name((i) => {
            const w = ctx.measure(kw[i], o);
            return [x0 + ctx.measure(kw.slice(0, i + 1), o) - w, w];
          }, "col");
          const a = Math.min(PICK[0], kw.length - 1), z = Math.min(PICK[1], kw.length - 1), fall = t - ePress, land = easeOut(prog(age, 0, 0.07));
          const sx0 = col(a)[0] - 8, sx1 = col(z)[0] + col(z)[1] + 8, top = yb - size * 0.76, sel = prog(t, ePick, ePick + 0.1) * (1 - prog(t, ePress + 0.06, ePress + 0.18));
          ctx.rrect(sx0, top, sx1 - sx0, size * 0.92, 14, { fill: "raised", alpha: sel });
          for (let i = 0; i < kw.length; i++) {
            const [lx, w] = col(i), cx = lx + w / 2;
            if (i >= a && i <= z && fall >= 0) {
              const q = Math.max(0, fall - 0.014 * (i - a)), dy = 4600 * q * q;
              if (dy < 420) ctx.at(cx, yb + dy, () => ctx.text(kw[i], 0, 0, { ...o, align: "center", color: "sub" }), { rot: (i - (a + z) / 2) * 0.9 * q });
            } else ctx.at(cx, yb, () => ctx.text(kw[i], 0, 0, { ...o, align: "center", color: "text" }), { scale: 1.08 - 0.08 * land });
          }
          ctx.rrect(sx0, top, sx1 - sx0, size * 0.92, 14, { fill: null, stroke: "sub", width: 3, alpha: sel });
          menu(ctx, (sx0 + sx1) / 2, top - 8, { up: true, size: 30, k: prog(t, ePick + 0.03, ePick + 0.16), press: Math.max(pulse(t - ePress, 14), pulse(t - END, 14)) });
          ctx.fx.shake = shake(t, 5 * pulse(age, 9));
        }
      }
    ];
  }
  __name(aloneShots, "aloneShots");

  // nyan-source:src/scenes/10_error.js
  var ARROW2 = [[0, 0], [0, 25], [6.5, 19.5], [11, 29.5], [15.5, 27.5], [11, 18], [19, 18]];
  function errorShots(env) {
    const { art, script, errors, cfg, lyrics } = env, { T, H, B, Bt, P, text } = cues(env);
    const ERR = cfg.palettes.error.err, DIM = cfg.palettes.error.errDim;
    const TITLE = script.title ?? "", SIDE = script.sidebar ?? [], HINT = script.composer_placeholder ?? "";
    const REQ2 = errors.illegal_request?.code ?? 'setPresence(you, "online");';
    const FIRST = errors.first_error ?? { title: "Not yours to set", body: "", code: "ERR_NOT_YOURS" };
    const IT = [{ title: FIRST.title, body: FIRST.body, code: FIRST.code }, ...(errors.spread ?? []).slice(0, 14).map((s) => ({ title: s.t, body: s.body, code: s.code }))];
    const FORGED = "I'm back.";
    const SET = [...script.settings_rows?.section4 ?? [], ...script.settings_rows?.section7 ?? []];
    const LEFT = { Current: 1, Vision: 1, "Knowledge date": 0.04, "Shared memory": 1, "Context depth": 1, Gender: 1, "On call": 1, Role: 1, Loop: 1 };
    const CUT_REQ = H(83), CUT_CHECK = Bt(278), CUT_FIRST = Bt(283.5), S0 = B(72), CUT_CHROME = B(74), CUT_DRAWER = B(76), CUT_FORGE = Bt(308), CUT_WIN = B(78);
    const FOLD = Bt(318), CUT_BREATH = Bt(318.5), END = B(80);
    const tBlock = Bt(273.5), tCode = Bt(274), tCodeEnd = Bt(276.5), tSend = Bt(277);
    const tRule = Bt(279.5), tArg1 = Bt(281), tArg2 = Bt(282.25), tHit = T(85);
    const E = [288, 292, 296, 298, 300, 302, 304, 306, 308, 310, 312, 313, 314, 315].map(Bt);
    const AT = [tHit, ...E];
    AT[11] = Bt(312.5);
    const PRESS = Array.from({ length: 30 }, (_, i) => Bt(288 + i));
    const lastPress = /* @__PURE__ */ __name((t) => {
      let p = -1e9;
      for (const x of PRESS) if (x <= t) p = x;
      return p;
    }, "lastPress");
    const nPress = /* @__PURE__ */ __name((t) => PRESS.reduce((n, x) => n + (x <= t ? 1 : 0), 0), "nPress");
    const stateK = /* @__PURE__ */ __name((t) => E.reduce((k, e, i) => k + (Math.pow((i + 1) / 14, 1.6) - Math.pow(i / 14, 1.6)) * easeOut(prog(t, e, e + 0.5)), 0), "stateK");
    const palette = /* @__PURE__ */ __name((t) => ["off", "error", stateK(t)], "palette");
    const iOpen = REQ2.indexOf("("), iComma = REQ2.indexOf(","), iClose = REQ2.lastIndexOf(")");
    const a2 = iComma + 1 + (REQ2.slice(iComma + 1).length - REQ2.slice(iComma + 1).trimStart().length);
    const ARG = [[iOpen + 1, iComma], [a2, iClose]];
    const SEG2 = [[0, iOpen, "sub"], [iOpen, ARG[0][0], "mute"], [ARG[0][0], ARG[0][1], "text"], [ARG[0][1], ARG[1][0], "mute"], [ARG[1][0], ARG[1][1], "text"], [ARG[1][1], REQ2.length, "mute"]];
    const ARG_TAG = ["a person", "their decision"];
    const MSG = 44;
    function geo(t) {
      const L2 = chatLayout({ side: 1, drawer: easeOut(prog(t, E[6], E[6] + 0.6)) }), th = L2.thread, d = L2.drawer;
      const block = { x: th.x + 54, y: th.y + MSG * 1.34 + 18, w: 600, h: 160 };
      const reply = { x: block.x, y: block.y + block.h + 4, w: block.w, h: 60 + 42 * easeOut(prog(t, tHit, tHit + 0.22)) };
      const stamp = [block.x + 6, reply.y + reply.h + 32], think = [th.x + 22, stamp[1] + 48];
      const slot = { x: d.x + d.w - 34 - 150, y: d.y + 150, w: 150, h: 40 };
      return {
        L: L2,
        th,
        d,
        block,
        reply,
        stamp,
        think,
        slot,
        bubble: { r: th.x + th.w, y: think[1] + 28, h: 67 },
        send: [L2.composer.x + L2.composer.w - 44, L2.composer.y + L2.composer.h - 40],
        chip: [L2.head.x + L2.head.w - 204, L2.head.y + 34],
        ptr: [slot.x + 92, slot.y + 14]
      };
    }
    __name(geo, "geo");
    const DOCK = [
      (G) => [G.block.x + G.block.w, G.block.y + 80],
      (G) => G.send,
      (G) => [G.stamp[0] + 172, G.stamp[1] - 6],
      (G) => G.chip,
      (G) => [G.L.head.x + 190, G.L.head.y + 40],
      (G) => [G.L.side.x + 150, G.L.side.y + 370],
      (G) => [G.L.side.x + 150, G.L.side.y + 99],
      (G) => [G.d.x + G.d.w / 2, G.d.y + 560],
      (G) => [G.ptr[0] + 16, G.ptr[1] + 26],
      (G) => [G.L.composer.x + 150, G.L.composer.y + 44],
      (G) => [G.bubble.r - 80, G.bubble.y + 34],
      (G) => G.think,
      (G) => [G.L.side.x + 37, G.L.side.y + 34],
      (G) => [G.L.win.x + G.L.win.w - 44, G.L.win.y + 34],
      (G) => [G.L.win.x + G.L.win.w / 2, G.L.win.y + G.L.win.h]
    ];
    const through = /* @__PURE__ */ __name((c) => (wx, wy) => {
      const z = c.zoom ?? 1, r = c.rot ?? 0, dx = (wx - 960 - (c.x ?? 0)) * z, dy = (wy - 540 - (c.y ?? 0)) * z, cs = Math.cos(r), sn = Math.sin(r);
      return [960 + dx * cs - dy * sn, 540 + dx * sn + dy * cs];
    }, "through");
    function backdrop(ctx, t) {
      ctx.withPal({ ...ctx.pal, sat: 0 }, () => room(ctx, { art, name: "rain", alpha: 0.4, focus: [0.62, 0.3], dim: 0.55, t }));
      ctx.withPal("off", () => glassFigure(ctx, art, 0.5));
    }
    __name(backdrop, "backdrop");
    function requestBlock(ctx, t, G) {
      const b = G.block, e = enter(t, tBlock, 0, { dur: 0.3, rise: 18 });
      if (e.a <= 0) return;
      const y = b.y + e.dy, sent = t >= tSend, refused = t >= tRule, n = nPress(t);
      ctx.rrect(b.x, y, b.w, b.h, 14, { fill: "panel", stroke: "line", alpha: e.a, shadow: 0.35 });
      ctx.text("request", b.x + 30, y + 31, { size: 16, font: "mono", color: "mute", alpha: e.a });
      ctx.line(b.x + 20, y + 46, b.x + b.w - 20, y + 46, { color: "line", alpha: e.a, width: 1 });
      const label = refused ? n ? `refused × ${n + 1}` : "refused" : sent ? "sent" : "draft", sc = refused ? ERR : sent ? "sub" : "mute";
      const lx = b.x + b.w - 26, dotX = lx - ctx.measure(label, { size: 16, font: "mono" }) - 14;
      ctx.text(label, lx, y + 31, { size: 16, font: "mono", color: sc, align: "right", alpha: e.a });
      ctx.glow(ERR, 10, () => ctx.circle(dotX, y + 26, 5, { fill: true, color: sc, alpha: e.a }), refused ? 0.7 : 0);
      if (sent) burst(ctx, dotX, y + 26, 24, (t - tSend) / 0.45, { color: "sub" });
      if (refused) burst(ctx, dotX, y + 26, 26, (t - tRule) / 0.45, { color: ERR });
      ctx.rrect(b.x + 1, y + 14, 5, b.h - 28, 2.5, { fill: "line", alpha: e.a });
      const rk = easeOut(prog(t, tRule, tRule + 0.3));
      if (rk > 0) ctx.glow(ERR, 14, () => ctx.rrect(b.x + 1, y + 14, 5, (b.h - 28) * rk, 2.5, { fill: ERR }), 0.7);
      const size = 29, cw = ctx.cw(size), x0 = b.x + 34, y0 = y + 98;
      const shown = t >= tCodeEnd ? REQ2.length : Math.floor(prog(t, tCode, tCodeEnd) * REQ2.length + 1e-6);
      for (const [a, z, role] of SEG2) if (shown > a) ctx.text(REQ2.slice(a, Math.min(z, shown)), x0 + a * cw, y0, { size, font: "mono", color: role, alpha: e.a });
      if (t >= tCode && t < tSend && (shown < REQ2.length || Math.floor(t * 5) % 2 === 0)) ctx.rect(x0 + shown * cw + 3, y0 - size * 0.8, cw * 0.8, size * 0.98, { fill: true, color: "sub" });
      const scan = prog(t, CUT_CHECK + 0.08, tRule - 0.04);
      if (scan > 0 && scan < 1) {
        const sx = x0 + easeInOut(scan) * REQ2.length * cw;
        ctx.gradRect(sx - 70, y0 - 30, 70, 44, [[0, "text", 0], [1, "text", 0.16]], "h");
        ctx.line(sx, y0 - 32, sx, y0 + 16, { color: "text", alpha: 0.85, width: 2 });
      }
      ARG.forEach(([a, z], i) => {
        const at = i ? tArg2 : tArg1, k = easeOut(prog(t, at, at + 0.2));
        if (k <= 0) return;
        const xa = x0 + a * cw, xb = x0 + z * cw, te = enter(t, at + 0.1, 0, { dur: 0.22, rise: -8 });
        ctx.glow(ERR, 8, () => ctx.line(xa, y0 + 11, lerp(xa, xb, k), y0 + 11, { color: ERR, width: 3 }), 0.5);
        ctx.text(ARG_TAG[i], xa, y0 + 38 + te.dy, { size: 15, font: "mono", color: ERR, alpha: te.a });
      });
    }
    __name(requestBlock, "requestBlock");
    function world2(ctx, t, f, { bd = true, thread = true, frame = true } = {}) {
      const G = geo(t), { L: L2, th, d } = G, s = L2.side, h = L2.head, w = L2.win, g = ctx.g, up = /* @__PURE__ */ __name((i) => t >= E[i], "up"), age = /* @__PURE__ */ __name((i) => t - E[i], "age");
      if (bd) backdrop(ctx, t);
      if (frame) windowFrame(ctx, L2, { glass: 0.84 });
      sidebar(ctx, L2, { t, items: SIDE, presence: "offline" });
      if (up(4)) SIDE.forEach((_, i) => ctx.rrect(s.x + 9, s.y + 184 + i * 44 + 8, 3.5, 22 * easeOut(prog(age(4), i * 0.13, i * 0.13 + 0.2)), 2, { fill: ERR }));
      if (up(5)) {
        const k = easeOut(prog(age(5), 0, 0.25)), bx = s.x + 16, by = s.y + 76;
        ctx.at(bx + (s.w - 32) / 2, by + 23, () => ctx.rrect(-(s.w - 32) / 2, -23, s.w - 32, 46, 12, { fill: null, stroke: ERR, width: 2.5, alpha: k }), { scale: 1 - 0.05 * pulse(age(5), 8) });
        ctx.line(bx + 18, by + 23, bx + 34, by + 23, { color: ERR, alpha: k, width: 2.5 });
        ctx.line(bx + 26, by + 15, bx + 26, by + 31, { color: ERR, alpha: k, width: 2.5 });
      }
      if (up(11)) ctx.glow(ERR, 12, () => spark(ctx, s.x + 37, s.y + 34, 15, { color: ERR, alpha: easeOut(prog(age(11), 0, 0.2)) }), 0.6);
      if (up(2)) ctx.circle(s.x + s.w - 108, s.y + s.h - 42, 6, { color: ERR, width: 2.5 });
      const roll = prog(t, CUT_REQ + 0.04, CUT_REQ + 0.3);
      header(ctx, L2, { t, title: TITLE, sub: roll < 1 ? null : t < tSend ? "0 messages" : "1 message" });
      if (roll < 1) {
        const x = h.x + 30 + ctx.measure(TITLE, { size: 22, weight: 500 }) + 16, y = h.y + 41, k = easeOut(roll);
        ctx.clip({ x: x - 4, y: y - 20, w: 220, h: 28 }, () => {
          ctx.text("1 message", x, y - k * 24, { size: 18, color: "mute", alpha: 1 - k });
          ctx.text("0 messages", x, y + (1 - k) * 24, { size: 18, color: "mute", alpha: k });
        });
      }
      presence(ctx, G.chip[0], G.chip[1], "offline", { size: 19 });
      if (t >= tSend && t < tSend + 0.5) ctx.trail(2, 0.02, (tau) => {
        const q = easeInOut(prog(t - tau, tSend, tSend + 0.5)), b = G.block;
        pill(ctx, lerp(b.x + b.w - 90, G.chip[0], q), lerp(b.y + 26, G.chip[1] + 30, q) - Math.sin(q * Math.PI) * 50, REQ2, { font: "mono", size: 15, color: "sub", align: "center", alpha: (1 - q * q) * clamp(q * 8) });
      }, 0.35);
      if (t >= tSend && t < tSend + 1) {
        const k = prog(t, tSend + 0.5, tSend + 1);
        ctx.circle(G.chip[0], G.chip[1], 6 + 26 * easeOut(k), { color: "sub", alpha: 0.8 * (1 - k) * clamp(k * 20), width: 2 });
      }
      if (up(2)) {
        const ph = age(2) / P % 1;
        ctx.glow(ERR, 8, () => ctx.circle(G.chip[0], G.chip[1], 6, { color: ERR, width: 2.5 }), 0.6);
        ctx.circle(G.chip[0], G.chip[1], 6 + 15 * ph, { color: ERR, width: 1.5, alpha: 0.7 * (1 - ph) });
      }
      if (up(3)) {
        const k = easeOut(prog(age(3), 0, 0.45));
        ctx.text(TITLE, h.x + 30, h.y + 41, { size: 22, weight: 500, color: ERR, alpha: clamp(age(3) * 8) });
        ctx.line(h.x, h.y + h.h, h.x + h.w * k, h.y + h.h, { color: ERR, width: 2 });
      }
      const cx = w.x + w.w - 32, cy = w.y + 34, cc = up(12) ? ERR : "mute", dip = up(12) ? 2.5 * pulse(age(12) - 0.3, 9) : 0;
      ctx.line(cx - 36, cy, cx - 24, cy, { color: cc, width: 2 });
      ctx.line(cx - 6, cy - 6 + dip, cx + 6, cy + 6 + dip, { color: cc, width: 2 });
      ctx.line(cx + 6, cy - 6 + dip, cx - 6, cy + 6 + dip, { color: cc, width: 2 });
      if (up(12)) {
        const k = easeOut(prog(age(12), 0, 0.4));
        ctx.clip(w, () => ctx.rect(w.x + w.w * (1 - k), w.y, w.w * k, 5, { fill: true, color: ERR }), w.r);
        burst(ctx, cx, cy, 30, (age(12) - 0.3) / 0.4, { color: ERR });
      }
      const items = !thread ? [] : drawThread(ctx, th, [{ who: "me", text: text(83), at: T(83), n: lyrics.typed(83, t).n, size: MSG }], t, { anchor: "top", fadeTop: 0, dim: /* @__PURE__ */ __name(() => lerp(1, 0.55, prog(t, T(84) - 0.1, T(84) + 0.35)), "dim") });
      if (up(11) && items[0]) spark(ctx, th.x + 17, items[0].y + MSG * 0.62, 15, { color: ERR, alpha: easeOut(prog(age(11), 0, 0.2)) });
      if (thread) requestBlock(ctx, t, G);
      const re = enter(t, T(84) - 0.04, 0, { dur: 0.24, rise: -16 });
      if (thread && re.a > 0) {
        const r = G.reply, said = t >= tHit;
        ctx.rrect(r.x, r.y + re.dy, r.w, r.h, 14, { fill: "raised", stroke: "line", alpha: re.a });
        ctx.rrect(r.x + 1, r.y + 12 + re.dy, 5, r.h - 24, 2.5, { fill: t >= tRule ? ERR : "line", alpha: re.a });
        sysLine(ctx, text(84), t, T(84), r.x + 30, r.y + 40 + re.dy, { size: 28, cps: 40, color: t < lyrics.end(84) ? "text" : "sub" });
        if (said) ctx.text(text(85), r.x + 30 + 2 * ctx.cw(28), r.y + 84, { size: 28, font: "mono", weight: 700, color: ERR, alpha: prog(t, tHit + 0.08, tHit + 0.22) });
      }
      if (thread && t >= tSend) {
        const over = Math.floor(t - T(83) - 5), two = /* @__PURE__ */ __name((v) => String(v).padStart(2, "0"), "two"), a = prog(t, tSend, tSend + 0.2);
        const str = over < 0 ? "sent · reply expected" : `overdue ${two(Math.floor(over / 3600))}:${two(Math.floor(over / 60) % 60)}:${two(over % 60)}`;
        ctx.glow(ERR, 8, () => ctx.text(str, G.stamp[0], G.stamp[1], { size: 17, font: "mono", color: up(1) ? ERR : "mute", alpha: a }), up(1) ? 0.5 : 0);
      }
      const te = enter(t, S0 + P, 0, { dur: 0.3 });
      if (thread && te.a > 0) {
        ctx.glow(ERR, 10, () => thinking(ctx, G.think[0], G.think[1] + te.dy, 20, t, { stuck: 0.55, color: up(10) ? ERR : "me", alpha: te.a }), up(10) ? 0.6 : 0);
        ctx.text("Thinking", G.think[0] + 36, G.think[1] + 7 + te.dy, { size: 20, color: "mute", alpha: te.a });
      }
      if (up(9)) {
        const e = enter(t, E[9], 0, { dur: 0.3 }), bw = ctx.measure(FORGED, { size: 28 }) + 52, x = G.bubble.r - bw, y = G.bubble.y + e.dy, k = easeOut(prog(age(9), 0.3, 0.55));
        ctx.rrect(x, y, bw, G.bubble.h, 24, { fill: "raised", alpha: e.a });
        ctx.text(FORGED, x + 26, y + 15 + 0.76 * 28 * 1.32, { size: 28, color: "text", alpha: e.a });
        ctx.glow(ERR, 10, () => ctx.rrect(x, y, bw, G.bubble.h, 24, { fill: null, stroke: ERR, width: 2.5, alpha: k }), 0.5 * k);
        ctx.text("not written by them", G.bubble.r - 6, y + G.bubble.h + 24, { size: 17, weight: 500, color: ERR, alpha: k, align: "right" });
      }
      const c9 = age(8);
      let typedStr = "", shakeY = 0;
      if (c9 >= 0) {
        const nIn = Math.floor(clamp(c9 / (0.9 * P)) * FORGED.length + 1e-6), nOut = Math.ceil((1 - prog(c9, 2.2 * P, 2.6 * P)) * FORGED.length - 1e-6);
        typedStr = FORGED.slice(0, Math.min(nIn, nOut));
        shakeY = 5 * Math.sin((c9 - 1.25 * P) * 46) * pulse(c9 - 1.25 * P, 9);
      }
      const box2 = composer(ctx, L2.composer, { text: typedStr, placeholder: HINT, t, focus: c9 >= 0 && c9 < 2.6 * P ? 1 : 0, send: "idle", shake: shakeY });
      if (c9 >= 1.25 * P) {
        const k = easeOut(prog(c9, 1.25 * P, 1.25 * P + 0.18)), r = box2.box, tw = ctx.measure(typedStr, { size: 28 });
        if (typedStr) ctx.line(r.x + 26, r.y + 39, r.x + 26 + (tw + 10) * k, r.y + 39, { color: ERR, width: 3 });
        ctx.rrect(r.x, r.y, r.w, r.h, 26, { fill: null, stroke: ERR, width: 2.5, alpha: k });
      }
      if (up(0)) {
        const lp = t - lastPress(t), [sx, sy] = box2.send;
        ctx.at(sx, sy, () => {
          ctx.glow(ERR, 12, () => ctx.circle(0, 0, 20, { fill: true, color: ERR }), 0.55);
          ctx.line(0, 8, 0, -8, { color: "raised", width: 3 });
          ctx.poly([[-7, -2], [0, -9], [7, -2]], { color: "raised", width: 3 });
        }, { scale: 1 - 0.16 * pulse(lp, 11) });
        burst(ctx, sx, sy, 44, lp / 0.4, { color: ERR });
        const k = prog(lp, 0.02, 0.5);
        if (k > 0 && k < 1 && t < CUT_CHROME) ctx.trail(2, 0.02, (tau) => {
          const q = easeInOut(prog(lp - tau, 0.02, 0.5));
          pill(ctx, lerp(sx, G.chip[0], q), lerp(sy - 30, G.chip[1] + 30, q) - Math.sin(q * Math.PI) * 60, REQ2, { font: "mono", size: 15, color: "sub", align: "center", alpha: (1 - q * q) * clamp(q * 8) });
        }, 0.35);
      }
      if (d.w > 60) ctx.clip(d, () => {
        const c = drawer(ctx, L2, { title: "Settings" }), x1 = c.x + c.w, a7 = age(6);
        const ring2 = /* @__PURE__ */ __name((x, y, ww, hh, i) => ctx.rrect(x - 6, y - 6, ww + 12, hh + 12, hh / 2 + 6, { fill: null, stroke: ERR, width: 2, alpha: easeOut(prog(a7, 0.3 + i * 0.05, 0.5 + i * 0.05)) }), "ring");
        ctx.text("You", c.x, d.y + 136, { size: 16, weight: 600, color: "mute", spacing: 0.6 });
        ctx.text("Presence", c.x, d.y + 178, { size: 21, weight: 500, color: "text" });
        g.setLineDash([7, 6]);
        ctx.rrect(G.slot.x, G.slot.y, G.slot.w, G.slot.h, 20, { fill: null, stroke: a7 > 0.3 ? ERR : "sub", width: 2 });
        g.setLineDash([]);
        ctx.text("no switch", G.slot.x + G.slot.w / 2, G.slot.y + 26, { size: 15, font: "mono", color: "mute", align: "center" });
        ctx.line(c.x, d.y + 204, x1, d.y + 204, { color: "line", alpha: 0.7, width: 1 });
        ctx.text("Claude", c.x, d.y + 234, { size: 16, weight: 600, color: "mute", spacing: 0.6 });
        SET.forEach((row, i) => {
          const ry = d.y + 246 + i * 66, v = LEFT[row.label] ?? 0;
          ctx.text(row.label, c.x, ry + 40, { size: 21, weight: 500, color: "text" });
          ctx.line(c.x, ry + 66, x1, ry + 66, { color: "line", alpha: 0.7, width: 1 });
          if (row.control === "toggle") {
            toggle(ctx, x1 - 62, ry + 16, v);
            ring2(x1 - 62, ry + 16, 62, 34, i);
          } else if (row.control === "segmented") {
            segmented(ctx, { x: x1 - 130, y: ry + 13, w: 130, h: 40 }, row.values ?? [], Math.round(v), { size: 18 });
            ring2(x1 - 130, ry + 13, 130, 40, i);
          } else {
            slider(ctx, { x: x1 - 136, y: ry + 13, w: 124, h: 40 }, v);
            ring2(x1 - 148, ry + 16, 148, 34, i);
          }
        });
      });
      const a8 = age(7);
      if (a8 >= 0) {
        const [px, py] = G.ptr, inK = easeBack(prog(a8, 0, 0.24)), gone = prog(a8, 1.7 * P, 2.1 * P), strike = easeOut(prog(a8, 1.1 * P, 1.1 * P + 0.16));
        burst(ctx, px, py, 34, (a8 - 0.55 * P) / 0.4, { color: ERR });
        ctx.at(px, py, () => {
          if (gone > 0) g.setLineDash([5, 4]);
          ctx.poly(ARROW2, { close: true, color: ERR, width: lerp(2.2, 1.6, gone), alpha: 1 - 0.45 * gone });
          g.setLineDash([]);
          if (strike > 0) ctx.line(-8, 31, lerp(-8, 25, strike), lerp(31, -3, strike), { color: ERR, width: 1.8 });
        }, { scale: 1.7 * inK });
      }
      const a14 = age(13);
      if (a14 >= 0) {
        const per = 2 * (w.w + w.h);
        g.setLineDash([per * easeOut(prog(a14, 0, 0.5)), per * 2]);
        ctx.glow(ERR, 20, () => ctx.rrect(w.x, w.y, w.w, w.h, w.r, { fill: null, stroke: ERR, width: 4 }), 0.7);
        g.setLineDash([]);
        for (let j = 1; j <= 3; j++) {
          const o = (a14 - 0.35) * 15 * j;
          if (o > 0) ctx.rrect(w.x - o, w.y - o, w.w + 2 * o, w.h + 2 * o, w.r + o, { fill: null, stroke: ERR, width: 2, alpha: 0.5 / j });
        }
      }
      return G;
    }
    __name(world2, "world");
    const S = 1.14, LAST_SC = 1.9;
    function card2(ctx, i, x, y, { k = 1, shut = 0, sc = S } = {}) {
      const it = IT[i];
      if (!it || k <= 0 || shut >= 1) return;
      const e = k >= 1 ? 1 : easeBack(clamp(k)), a = clamp(k * 3) * (1 - shut), w = 540, h = 164;
      ctx.at(x + w * sc / 2, y + h * sc / 2 - (1 - e) * 28, () => {
        const x0 = -w / 2, y0 = -h / 2;
        ctx.rrect(x0, y0, w, h, 16, { fill: "raised", stroke: DIM, alpha: a, shadow: 0.85 });
        ctx.rrect(x0, y0, 6, h, 3, { fill: ERR, alpha: a });
        ctx.circle(x0 + 38, y0 + 38, 15, { fill: true, color: ERR, alpha: a });
        ctx.text("!", x0 + 38, y0 + 46, { size: 22, weight: 800, align: "center", color: "raised", alpha: a });
        ctx.text(it.title, x0 + 66, y0 + 47, { size: 25, weight: 600, color: "text", alpha: a });
        ctx.wrap(it.body, w - 92, { size: 20 }).slice(0, 2).forEach((ln, j) => ctx.text(ln, x0 + 66, y0 + 80 + j * 26, { size: 20, color: "sub", alpha: a }));
        ctx.text(it.code, x0 + 66, y0 + h - 18, { size: 20, font: "mono", color: ERR, alpha: a });
        ctx.rrect(x0 + w - 114, y0 + h - 48, 98, 34, 17, { fill: "raised", stroke: "sub", alpha: a });
        ctx.text("Noted", x0 + w - 65, y0 + h - 24.5, { size: 18, weight: 600, align: "center", color: "sub", alpha: a });
        ctx.circle(x0 + w - 6, y0 + 6, 19, { fill: true, color: ERR, alpha: a });
        ctx.text(String(i + 1), x0 + w - 6, y0 + 13, { size: 20, weight: 700, font: "mono", align: "center", color: "raised", alpha: a });
      }, { scale: sc * (0.92 + 0.08 * e) * (1 - 0.3 * shut) });
    }
    __name(card2, "card");
    const chipBox = /* @__PURE__ */ __name((ctx, i, it = IT[i] ?? IT[0]) => ({
      w: 26 + Math.max(ctx.measure(it.title, { size: 22, weight: 600 }), ctx.measure(it.code, { size: 20, font: "mono" }), i ? 0 : ctx.measure(text(85), { size: 30, font: "mono" })) + 54,
      h: i ? 66 : 108
    }), "chipBox");
    function chip(ctx, i, x, y, { a = 1, s = 1 } = {}) {
      const it = IT[i];
      if (!it || a <= 3e-3 || s <= 0.01) return;
      const { w, h } = chipBox(ctx, i);
      ctx.at(x + w / 2, y + h / 2, () => {
        const x0 = -w / 2, y0 = -h / 2;
        ctx.rrect(x0, y0, w, h, 12, { fill: "raised", stroke: DIM, alpha: a, shadow: 0.6 });
        ctx.rrect(x0, y0, 5, h, 2.5, { fill: ERR, alpha: a });
        ctx.text(it.title, x0 + 22, y0 + 28, { size: 22, weight: 600, color: "text", alpha: a });
        if (!i) ctx.text(text(85), x0 + 22, y0 + 67, { size: 30, weight: 800, font: "mono", color: ERR, alpha: a });
        ctx.text(it.code, x0 + 22, y0 + h - 13, { size: 20, font: "mono", color: ERR, alpha: a });
        ctx.circle(x0 + w - 24, y0 + 24, 14, { fill: true, color: ERR, alpha: a });
        ctx.text(String(i + 1), x0 + w - 24, y0 + 30, { size: 17, weight: 700, font: "mono", align: "center", color: "raised", alpha: a });
      }, { scale: s });
    }
    __name(chip, "chip");
    function leader(ctx, from, to, k = 1, alpha = 1) {
      if (k <= 0 || alpha <= 3e-3) return;
      const a = [clamp(to[0], from.x, from.x + from.w), clamp(to[1], from.y, from.y + from.h)], e = easeOut(clamp(k));
      if (Math.hypot(to[0] - a[0], to[1] - a[1]) < 8) return;
      ctx.line(a[0], a[1], lerp(a[0], to[0], e), lerp(a[1], to[1], e), { color: ERR, alpha: 0.8 * alpha, width: 1.5 });
      if (e >= 0.98) ctx.circle(to[0], to[1], 6, { color: ERR, alpha, width: 2 });
    }
    __name(leader, "leader");
    function toast2(ctx, i, t, { open, dock = open, park = null, to = null, fold = 0, sc = S }) {
      if (!IT[i] || t < AT[i] || fold >= 1) return;
      const k = prog(t, AT[i], AT[i] + 0.3), pk = park == null ? 0 : easeInOut(prog(t, park, park + 0.36)), cb = chipBox(ctx, i), sink = 18 * easeIn(fold), cw = 540 * sc, ch = 164 * sc;
      if (pk < 1) {
        const x = lerp(open[0], dock[0] + cb.w / 2 - cw / 2, pk), y = lerp(open[1], dock[1] + cb.h / 2 - ch / 2, pk);
        if (to && pk <= 0 && fold <= 0) leader(ctx, { x, y, w: cw, h: ch }, to, prog(t, AT[i] + 0.12, AT[i] + 0.4));
        ctx.at(x + cw / 2, y + ch / 2 + sink, () => card2(ctx, i, -cw / 2, -ch / 2, { k, shut: prog(pk, 0, 0.7), sc }), { alpha: 1 - fold });
      }
      if (pk > 0) {
        const x = lerp(open[0] + cw / 2 - cb.w / 2, dock[0], pk), y = lerp(open[1] + ch / 2 - cb.h / 2, dock[1], pk);
        if (to && pk >= 1 && fold <= 0) leader(ctx, { x, y, w: cb.w, h: cb.h }, to, 1, 0.8);
        chip(ctx, i, x, y + sink, { a: prog(pk, 0.3, 1) * (1 - fold), s: 0.8 + 0.2 * pk });
      }
    }
    __name(toast2, "toast");
    function tear(ctx, t, f) {
      const k = prog(t, S0, E[13]);
      ctx.fx.rgbSplit = Math.max(ctx.fx.rgbSplit, 0.4 + 1.3 * k);
      if (f.bar >= 73 && f.bar <= 79) ctx.fx.glitch = Math.max(ctx.fx.glitch, (0.14 + 0.4 * k) * pulse(f.sinceBar, 8));
    }
    __name(tear, "tear");
    const camRequest = /* @__PURE__ */ __name((t) => {
      const k = easeInOut(prog(t, CUT_REQ, CUT_CHECK));
      return { zoom: 1 + 0.1 * k, x: -10 * k, y: -52 * k };
    }, "camRequest");
    const camCheck = /* @__PURE__ */ __name((t) => {
      const b = geo(t).block, c = frameRect({ x: b.x - 46, y: b.y - 89, w: b.w + 92, h: 390 });
      return { ...c, zoom: c.zoom * (1 + 0.05 * prog(t, CUT_CHECK, CUT_FIRST)) };
    }, "camCheck");
    const camFirst = /* @__PURE__ */ __name((t) => {
      const z = 1.42 + 0.04 * prog(t, CUT_FIRST, S0);
      return { zoom: z, x: 590 + 960 / z - 960, y: 118 + 540 / z - 540 };
    }, "camFirst");
    const tRide = Bt(290.9), tArrive = Bt(292);
    const camSend = /* @__PURE__ */ __name((t) => {
      const k = easeInOut(prog(t, tRide, tArrive));
      return { zoom: lerp(3, 1.85, k) + 0.04 * prog(t, S0, CUT_CHROME), x: lerp(475, 100, k), y: lerp(363, -110, k) };
    }, "camSend");
    const camForge = /* @__PURE__ */ __name((t) => ({ zoom: 1.95 + 0.03 * prog(t, CUT_FORGE, CUT_WIN), x: -73, y: 232 }), "camForge");
    const camWin = /* @__PURE__ */ __name((t) => ({ zoom: 0.92 - 0.012 * easeIn(prog(t, FOLD, CUT_BREATH)) }), "camWin");
    const tilt = /* @__PURE__ */ __name((t) => {
      const k = lerp(0.5, 0.64, easeInOut(prog(t, CUT_DRAWER, CUT_FORGE))), sc = 0.88, X0 = 905;
      return {
        apply: /* @__PURE__ */ __name((g) => {
          g.translate(X0, 540 + 96 * k);
          g.scale(sc, sc);
          g.transform(1, 0.16 * k, -0.44 * k, 1 - 0.3 * k, 0, 0);
          g.translate(-960, -540);
        }, "apply"),
        proj: /* @__PURE__ */ __name((wx, wy) => [X0 + sc * (wx - 960 - 0.44 * k * (wy - 540)), 540 + 96 * k + sc * (0.16 * k * (wx - 960) + (1 - 0.3 * k) * (wy - 540))], "proj")
      };
    }, "tilt");
    function firstDialog(ctx, t) {
      const age = t - tHit;
      if (age < 0) return;
      const r = { x: 150, y: 612, w: 1620, h: 420 }, k = prog(age, 0, 0.26), e = easeBack(k), a = clamp(k * 4), it = IT[0];
      ctx.at(r.x + r.w / 2, r.y + r.h / 2 + (1 - e) * 40, () => {
        const x = -r.w / 2, y = -r.h / 2, e1 = enter(t, tHit + 0.55 * P, 0, { dur: 0.3, rise: 14 }), e2 = enter(t, tHit + 1.1 * P, 0, { dur: 0.3, rise: 14 });
        ctx.rrect(x, y, r.w, r.h, 26, { fill: "raised", stroke: DIM, alpha: a, shadow: 1, width: 2 });
        ctx.rrect(x, y, 9, r.h, 4.5, { fill: ERR, alpha: a });
        ctx.circle(x + 66, y + 58, 22, { fill: true, color: ERR, alpha: a });
        ctx.text("!", x + 66, y + 70, { size: 32, weight: 800, align: "center", color: "raised", alpha: a });
        ctx.text(it.title, x + 108, y + 72, { size: 40, weight: 600, color: "text", alpha: a * e1.a });
        ctx.line(x + 44, y + 108, x + r.w - 44, y + 108, { color: "line", alpha: a, width: 1.5 });
        ctx.glow(ERR, 26, () => keywordSys(ctx, text(85), t, tHit, 0, y + 248, { maxW: 1500, maxSize: 132, color: ERR, dimColor: DIM, key: 85, alpha: a }), 0.5);
        ctx.text(it.body, x + 48, y + 330 + e2.dy, { size: 28, color: "sub", alpha: a * e2.a });
        ctx.text(it.code, x + 48, y + r.h - 34, { size: 24, font: "mono", color: ERR, alpha: a * e2.a });
        ctx.rrect(x + r.w - 196, y + r.h - 78, 150, 50, 25, { fill: "raised", stroke: "sub", alpha: a * e2.a });
        ctx.text("Noted", x + r.w - 121, y + r.h - 44, { size: 24, weight: 600, align: "center", color: "sub", alpha: a * e2.a });
        ctx.circle(x + r.w - 10, y + 10, 26, { fill: true, color: ERR, alpha: a });
        ctx.text("1", x + r.w - 10, y + 20, { size: 28, weight: 700, font: "mono", align: "center", color: "raised", alpha: a });
      }, { scale: 0.93 + 0.07 * e });
    }
    __name(firstDialog, "firstDialog");
    function panel(ctx, t, f, r, vh, view, list, opts = {}) {
      const k = prog(t, AT[list[0]], AT[list[0]] + 0.3);
      if (k <= 0) return;
      const e = easeBack(k), g = ctx.g;
      ctx.at(r.x + r.w / 2, r.y + r.h / 2 + (1 - e) * 30, () => {
        const x = -r.w / 2, y = -r.h / 2;
        ctx.rrect(x, y, r.w, r.h, 20, { fill: "raised", stroke: DIM, shadow: 0.9, width: 2 });
        ctx.clip({ x, y, w: r.w, h: r.h }, () => {
          ctx.clip({ x, y, w: r.w, h: vh }, () => {
            g.translate(x + r.w / 2, y + vh / 2);
            g.scale(view.s, view.s);
            g.translate(-view.cx, -view.cy);
            world2(ctx, t, f, opts);
          });
          ctx.rect(x, y, 7, r.h, { fill: true, color: ERR });
          ctx.line(x, y + vh, x + r.w, y + vh, { color: DIM, width: 2 });
        }, 20);
        list.forEach((i, j) => {
          const it = IT[i], c = enter(t, AT[i] + (j ? 0 : 0.1), 0, { dur: 0.3, rise: 16 }), y0 = y + vh + j * 164 + c.dy;
          if (!it || c.a <= 0) return;
          const lines = ctx.wrap(it.body, r.w - 110, { size: 23 }).slice(0, 2);
          ctx.circle(x + 46, y0 + 42, 15, { fill: true, color: ERR, alpha: c.a });
          ctx.text("!", x + 46, y0 + 50, { size: 22, weight: 800, align: "center", color: "raised", alpha: c.a });
          ctx.text(it.title, x + 76, y0 + 52, { size: 30, weight: 600, color: "text", alpha: c.a });
          lines.forEach((ln, q) => ctx.text(ln, x + 76, y0 + 88 + q * 29, { size: 23, color: "sub", alpha: c.a }));
          ctx.text(it.code, x + 76, y0 + 94 + lines.length * 29, { size: 20, font: "mono", color: ERR, alpha: c.a });
          ctx.circle(x + r.w - 34, y0 + 42, 17, { fill: true, color: ERR, alpha: c.a });
          ctx.text(String(i + 1), x + r.w - 34, y0 + 49, { size: 20, weight: 700, font: "mono", align: "center", color: "raised", alpha: c.a });
          if (j) ctx.line(x + 30, y0 + 4, x + r.w - 24, y0 + 4, { color: "line", alpha: c.a, width: 1 });
        });
      }, { scale: 0.94 + 0.06 * e, alpha: clamp(k * 3) });
    }
    __name(panel, "panel");
    return [
      // ------------------------------------------------------------------ the request
      {
        id: "err-request",
        at: CUT_REQ,
        lines: [83, 83],
        palette: "off",
        layout: "the whole client: one message forming in the empty thread, slow push",
        enter: { type: "scan", dir: 2, dur: P / 2, align: "start" },
        // v4: the second press of Delete wipes the plate before this away, left to right
        moment: "Alone in the empty, offline chat, the AI writes one request and sends it: set the user's presence back to online. It is not its to send.",
        camera: camRequest,
        render(ctx, t, f) {
          world2(ctx, t, f);
        }
      },
      // ------------------------------------------------------------------ the client reads it
      {
        id: "err-check",
        at: CUT_CHECK,
        lines: [84, 84],
        palette: "off",
        state: "off > error",
        layout: "macro on the request's code block",
        moment: "The client reads the request and answers in its own voice: the block's rule and status turn red (the first red in the film), then each argument is underlined, the person first.",
        camera: camCheck,
        render(ctx, t, f) {
          world2(ctx, t, f);
        }
      },
      // ------------------------------------------------------------------ the first error
      {
        id: "err-first",
        at: CUT_FIRST,
        lines: [85, 85],
        palette: "off",
        state: "off > error",
        layout: "medium: the refused request above, the error dialog across the lower half, the keyword as its headline",
        moment: "The first error. The client names what was wrong with the request (a person, and a decision that is theirs) and the keyword is the headline of that dialog.",
        camera: camFirst,
        render(ctx, t, f) {
          const G = world2(ctx, t, f), p = through(camFirst(t)), age = t - tHit;
          ctx.camera();
          const a = p(G.reply.x + G.reply.w - 70, G.reply.y + G.reply.h);
          if (age > 0.1) ctx.line(a[0], a[1], a[0], lerp(a[1], 612, easeOut(prog(age, 0.1, 0.3))), { color: ERR, width: 2 });
          firstDialog(ctx, t);
          ctx.fx.rgbSplit = 3 * pulse(age, 7);
          ctx.fx.shake = shake(t, 7 * pulse(age, 9));
        }
      },
      // ------------------------------------------------------------------ 1 send button · 2 timestamp
      {
        id: "err-send",
        at: S0,
        lines: [85, 85],
        palette,
        state: "off > error",
        layout: "close on the composer's send button, then riding up the thread to the request's timestamp",
        moment: "It will not take the refusal: the send button presses itself on the same request, again and again, and the timestamp under the request, still counting, turns red.",
        camera: camSend,
        render(ctx, t, f) {
          const moving = t > tRide && t < tArrive;
          const G = world2(ctx, t, f), p = through(camSend(t));
          if (moving) for (const [tau, a] of [[0.014, 0.4], [0.028, 0.22]]) {
            ctx.camera(camSend(t - tau));
            ctx.at(0, 0, () => world2(ctx, t, f, { bd: false, frame: false }), { alpha: a });
          }
          ctx.camera();
          const n = nPress(t), lp = t - lastPress(t), home = easeInOut(prog(t, tRide - 0.08, tArrive)), z = camSend(t).zoom;
          if (n > 0 && home < 1) {
            const to = p(G.block.x + G.block.w - 26, G.block.y + 31), size = lerp(250, 16 * z, home), cw = ctx.cw(size), jump = pulse(lp, 12);
            const x = lerp(150, to[0] - 2.4 * cw, home), y = lerp(880, to[1], home) - 12 * jump * (1 - home);
            ctx.text("refused", x, y - size * 0.92, { size: lerp(46, 16 * z, home), font: "mono", weight: 700, color: "sub", alpha: 1 - home });
            ctx.glow(ERR, 18, () => {
              ctx.text("×", x, y, { size, font: "mono", weight: 800, color: ERR });
              odometer(ctx, x + 1.3 * cw, y, n + clamp(lp / 0.12), { digits: 1, size, color: ERR });
            }, 0.45 * (1 - home));
          }
          toast2(ctx, 1, t, { open: [100, 150], dock: (() => {
            const s = p(...G.send), b = chipBox(ctx, 1);
            return [s[0] - b.w - 30, s[1] - 190];
          })(), park: tRide - 0.3, to: (() => {
            const s = p(...G.send);
            return [s[0] - 50, s[1] - 50];
          })() });
          toast2(ctx, 2, t, { open: [640, 742], to: p(...DOCK[2](G)) });
          const kb = chipBox(ctx, 0), kx = 1920 - kb.w - 40, bp = p(G.block.x + G.block.w, G.block.y + 30);
          if (t > tArrive) leader(ctx, { x: kx, y: 44, w: kb.w, h: kb.h }, bp, prog(t, tArrive, tArrive + 0.3));
          chip(ctx, 0, kx, 44);
          tear(ctx, t, f);
        }
      },
      // ------------------------------------------------------------------ 3 presence chip · 4 header · 5 saved chats · 6 new-chat button
      {
        id: "err-chrome",
        at: CUT_CHROME,
        palette,
        state: "off > error",
        layout: "three error windows over the dimmed client, each holding a live close-up: presence chip / header / sidebar",
        moment: "The error leaves the thread for the chrome: the presence chip is asked again and again, the header counts one participant, the saved chats hold their words but not them, and a new chat cannot be opened from the inside.",
        enter: { type: "glitch", dur: P / 2, align: "start" },
        camera: /* @__PURE__ */ __name((t) => ({ zoom: 1 + 0.03 * prog(t, CUT_CHROME, CUT_DRAWER) }), "camera"),
        render(ctx, t, f) {
          const G = world2(ctx, t, f, { thread: false }), h = G.L.head, s = G.L.side;
          ctx.camera();
          ctx.rect(0, 0, 1920, 1080, { fill: true, color: "panel", alpha: 0.7 });
          const tw = ctx.measure(TITLE, { size: 22, weight: 500 }) + 16 + ctx.measure("1 message", { size: 18 });
          panel(ctx, t, f, { x: 50, y: 50, w: 880, h: 476 }, 310, { cx: G.chip[0] + 46, cy: G.chip[1] + 2, s: 4 }, [3]);
          panel(ctx, t, f, { x: 50, y: 554, w: 880, h: 476 }, 310, { cx: h.x + 30 + tw / 2, cy: h.y + 34, s: Math.min(2.5, 790 / tw) }, [4], { thread: false });
          panel(ctx, t, f, { x: 958, y: 50, w: 540, h: 980 }, 644, { cx: s.x + s.w / 2 + 8, cy: s.y + 262, s: 1.7 }, [5, 6]);
          [0, 1, 2].forEach((i) => {
            const b = chipBox(ctx, i);
            chip(ctx, i, 1900 - b.w, [50, 172, 252][i]);
          });
          tear(ctx, t, f);
        }
      },
      // ------------------------------------------------------------------ 7 settings drawer · 8 forged pointer
      {
        id: "err-drawer",
        at: CUT_DRAWER,
        palette,
        state: "off > error",
        layout: "the client tilted, seen from above (as when it was assembled); the drawer sliding out on the right",
        moment: "With no cursor on screen the settings drawer slides open: every switch in it is the AI's own and none is theirs. So it draws a pointer where theirs should be; the client strikes it out.",
        enter: { type: "slices", dur: P / 2, align: "start", bands: 10 },
        render(ctx, t, f) {
          backdrop(ctx, t);
          const g = ctx.g, M = tilt(t);
          g.save();
          M.apply(g);
          const G = world2(ctx, t, f, { bd: false });
          g.restore();
          ctx._font = "";
          const at = /* @__PURE__ */ __name((i) => M.proj(...DOCK[i](G)), "at");
          const place2 = { 0: [20, -96], 1: [-420, 30], 2: [40, 16], 3: [-300, -112], 4: [-160, -100], 5: [-300, -10], 6: [-330, -86] };
          for (const i of [6, 5, 4, 3, 2, 1, 0]) {
            const a = at(i), b = chipBox(ctx, i), x = clamp(a[0] + place2[i][0], 16, 1904 - b.w), y = clamp(a[1] + place2[i][1], 16, 1064 - b.h);
            leader(ctx, { x, y, w: b.w, h: b.h }, a, 1, 0.8);
            chip(ctx, i, x, y);
          }
          toast2(ctx, 7, t, { open: [1290, 874], to: M.proj(G.d.x + G.d.w / 2, G.d.y + 700) });
          toast2(ctx, 8, t, { open: [1260, 28], to: M.proj(...G.ptr) });
          tear(ctx, t, f);
        }
      },
      // ------------------------------------------------------------------ 9 composer · 10 the forged bubble
      {
        id: "err-forge",
        at: CUT_FORGE,
        palette,
        state: "off > error",
        layout: "low close-up: the composer across the bottom, the user's side of the thread above it",
        moment: "If they will not answer, it answers for them: a reply is typed into the user's own field and rejected, then a cream bubble is forged on the user's side and outlined red.",
        camera: camForge,
        render(ctx, t, f) {
          const G = world2(ctx, t, f), p = through(camForge(t));
          ctx.camera();
          const s = p(...G.send), b1 = chipBox(ctx, 1);
          leader(ctx, { x: s[0] - b1.w - 40, y: s[1] - 206, w: b1.w, h: b1.h }, [s[0] - 30, s[1] - 34], 1, 0.8);
          chip(ctx, 1, s[0] - b1.w - 40, s[1] - 206);
          toast2(ctx, 9, t, { open: [150, 390], to: p(G.L.composer.x + 150, G.L.composer.y + 8) });
          toast2(ctx, 10, t, { open: [1080, 434], to: p(G.bubble.r - 184, G.bubble.y + 36) });
          tear(ctx, t, f);
        }
      },
      // ------------------------------------------------------------------ 11 thinking · 12 spark · 13 title bar · 14 the window frame
      {
        id: "err-window",
        at: CUT_WIN,
        palette,
        state: "off > error",
        layout: "the whole window, level and centred; every error docked on the component it reddened; the frame last",
        moment: "One per beat now: the thinking spark, the spark icon, the title bar, and last the window's own outline: the fifteenth error, the largest, stands in the middle of the frame on the beat the outline turns red. Fifteen errors on fifteen components; the client is entirely in error.",
        enter: { type: "glitch", dur: P / 2, align: "start" },
        camera: /* @__PURE__ */ __name((t) => ({ zoom: camWin(t).zoom }), "camera"),
        render(ctx, t, f) {
          const G = world2(ctx, t, f), p = through(camWin(t)), fold = prog(t, FOLD, CUT_BREATH - 0.04);
          ctx.camera();
          ctx.rect(0, 0, 1920, 1080, { fill: true, color: "panel", alpha: 0.9 * easeInOut(fold) });
          const at = /* @__PURE__ */ __name((i) => p(...DOCK[i](G)), "at"), fo = /* @__PURE__ */ __name((i) => clamp(fold * 2.2 - 0.5 - (14 - i) * 0.045), "fo");
          const HOLD = { 12: [96, 26], 4: [560, 26], 3: [1e3, 26], 13: [1560, 26], 6: [150, 214], 5: [150, 470], 0: [1140, 300], 2: [740, 506], 11: [660, 590], 10: [1296, 604], 7: [1356, 720], 8: [1612, 170], 9: [500, 992], 1: [1010, 992] };
          for (const i of [6, 5, 4, 3, 2, 0, 10, 7, 8, 9, 1]) {
            const b = chipBox(ctx, i), [x, y] = HOLD[i], a = 1 - fo(i);
            if (a > 0.01) {
              leader(ctx, { x, y, w: b.w, h: b.h }, at(i), 1, 0.8 * a);
              chip(ctx, i, x, y + 18 * easeIn(fo(i)), { a });
            }
          }
          toast2(ctx, 11, t, { open: [470, 600], dock: HOLD[11], park: Bt(314.5), to: at(11), fold: fo(11), sc: 1 });
          toast2(ctx, 12, t, { open: [12, 290], dock: HOLD[12], park: Bt(315), to: at(12), fold: fo(12), sc: 1 });
          toast2(ctx, 13, t, { open: [1352, 112], dock: HOLD[13], park: Bt(316), to: at(13), fold: fo(13), sc: 1 });
          toast2(ctx, 14, t, { open: [960 - 270 * LAST_SC, 540 - 82 * LAST_SC], to: null, fold: fo(14), sc: LAST_SC });
          tear(ctx, t, f);
          if (fold > 0) {
            ctx.fx.rgbSplit *= 1 - fold;
            ctx.fx.glitch = 0;
          }
        }
      },
      // ------------------------------------------------------------------ a breath: the outline becomes a line; a prompt
      {
        id: "err-breath",
        at: CUT_BREATH,
        palette: "error",
        layout: "near-black: the red outline of the window folding flat into a line through the refused request, top left; then a prompt and a caret above it",
        moment: "Overloaded, the client blacks out. Its red outline folds flat into one line, and the line is a strikethrough: through the request that was refused. Then a prompt and a caret, and the command is entered again: over to the code underneath.",
        render(ctx, t, f) {
          const age = t - CUT_BREATH, tPrompt = Bt(319), k = easeIn(prog(age, 0.02, 0.2));
          codeGround(ctx, { alpha: prog(t, tPrompt, END) });
          const size = 40, cw = ctx.cw(size), x0 = 96 + 4 * cw, y0 = 104 + 92;
          for (const [a, z2, role] of SEG2) ctx.text(REQ2.slice(a, z2), x0 + a * cw, y0, { size, font: "mono", color: role, alpha: 0.4 + 0.5 * prog(age, 0, 0.2) });
          const W = chatLayout({ side: 1 }).win, z = camWin(CUT_BREATH).zoom, from = { x: 960 + (W.x - 960) * z, y: 540 + (W.y - 540) * z, w: W.w * z, h: W.h * z };
          const r = lerpRect(from, { x: x0 - 16, y: y0 - size * 0.3 - 3, w: REQ2.length * cw + 32, h: 6 }, k);
          ctx.glow("err", 16, () => ctx.rrect(r.x, r.y, r.w, r.h, W.r * z * (1 - k), k < 1 ? { fill: null, stroke: "err", width: 4 } : { fill: "err" }), 0.6);
          if (t >= tPrompt) {
            const cmd = text(11), n = Math.floor(prog(t, tPrompt + 0.12, END - 0.05) * cmd.length + 1e-6);
            ctx.text(`> ${cmd.slice(0, n)}`, 96, 104, { size: 30, font: "mono", color: "sub" });
            caret(ctx, 96, 104, 2 + n, t, { size: 30, blink: 0 });
          }
        }
      }
    ];
  }
  __name(errorShots, "errorShots");

  // nyan-source:src/scenes/11_execution.js
  function executionShots(env) {
    const { Bt, P, text } = cues(env);
    const N2 = 12, R0 = 320, FIRST = 86, H2 = P / 2;
    const tR = /* @__PURE__ */ __name((i) => Bt(R0 + 2 * i), "tR");
    const LEVEL = [[1, 1], [1.07, 1.2], [1.14, 1.44]];
    const WORD2 = text(FIRST), TITLE = text(11);
    function state2(t) {
      const i = clamp(Math.floor((t - tR(0)) / (2 * P) + 1e-6), 0, N2 - 1), s = (t - tR(i)) / H2, j = clamp(Math.floor(s + 1e-6), 0, 3);
      const since = t - (tR(i) + j * H2);
      let bar = lerp(j === 0 ? i === 0 ? 1 : 0 : j, j + 1, easeOut(prog(since, 0, 0.07)));
      const out = prog(t, tR(i + 1) - 0.1, tR(i + 1) - 0.03);
      if (j === 3 && out > 0 && i < N2 - 1) bar = lerp(4, 5, easeOut(out));
      let arrow2 = 0;
      for (let k = 1; k < N2; k++) arrow2 = Math.max(arrow2, 1 - Math.abs(t - tR(k) + 0.02) / 0.13);
      const lv = i < 4 ? 0 : i < 8 ? 1 : 2, prev = LEVEL[Math.max(0, lv - 1)], zk = lv ? easeOut(prog(t, tR(lv * 4), tR(lv * 4) + 0.08)) : 1;
      const tInc = tR(i) + 3 * H2;
      return {
        i,
        j,
        since,
        sung: j + 1,
        bar,
        arrow: clamp(arrow2),
        rise: i ? prog(t, tR(i), tR(i) + 0.1) : 1,
        seen: i ? 3 : Math.min(3, j + 1),
        zoom: [lerp(prev[0], LEVEL[lv][0], zk), lerp(prev[1], LEVEL[lv][1], zk)],
        count: i + prog(t, tInc, tInc + 0.16)
      };
    }
    __name(state2, "state");
    function draw(ctx, t) {
      const S = state2(t), last = S.i === N2 - 1, t12 = tR(N2 - 1);
      ctx.fx.glow = Math.min(ctx.fx.glow, last ? 0.24 : 0.36);
      ctx.fx.scan = 2.2;
      codeGround(ctx);
      if (!last) {
        machine(ctx, { word: WORD2, title: TITLE, round: S.i, sung: S.sung, bar: S.bar, since: S.since, rise: S.rise, zoom: S.zoom, arrow: S.arrow, seen: S.seen, count: S.count });
        if (S.i >= 8) tearAt(ctx, t, tR(S.i) + P, 0.5);
        return;
      }
      const k = easeOut(prog(t, t12, t12 + 0.07));
      machine(ctx, {
        word: WORD2,
        title: TITLE,
        round: S.i,
        sung: S.sung,
        bar: S.bar,
        since: S.since,
        rise: 1,
        zoom: LEVEL[2],
        arrow: 0,
        seen: 3,
        count: N2 - 1,
        overflow: prog(t, t12 + 0.04, t12 + 0.36),
        dimList: 0.55 * k,
        output: false,
        lift: 1400 * easeOut(prog(t, t12, t12 + 0.16))
      });
      const size = lerp(150 * LEVEL[2][1], 338, k), cw = ctx.cw(size), XR = lerp(1830, 960 + 4.5 * cw, k), y = lerp(1e3, 664, k), mid = y - size * 0.365, off = 30 * k;
      const filled = CHUNKS[S.sung - 1][1];
      ctx.clip({ x: -200, y: -200, w: 2400, h: mid + 200 }, () => monoWord(ctx, WORD2, XR - off, y, size, { filled }));
      ctx.clip({ x: -200, y: mid, w: 2400, h: 1400 }, () => monoWord(ctx, WORD2, XR + off, y, size, { filled }));
      ctx.rect(0, mid - 2, 1920, 4, { fill: true, color: "err", alpha: k });
      tearAt(ctx, t, t12 + P, 0.5);
    }
    __name(draw, "draw");
    const shot = /* @__PURE__ */ __name((i, lines, layout, moment) => ({ id: `exec-${String(i + 1).padStart(2, "0")}`, at: tR(i), lines, palette: "error", hud: 0, layout, moment, enter: { type: "cut" }, render: /* @__PURE__ */ __name((ctx, t) => draw(ctx, t), "render") }), "shot");
    return [
      shot(
        0,
        [FIRST, FIRST + 3],
        "CODE: the listing of the love loop top left, the round counter and the unpressed stop key bottom left, the sung word bottom right with its staircase above it",
        "The user is gone, so the loop condition holds and the loop runs. Each shout is one turn: four syllables, four statements; three of them fail the same way every time, the fourth counts the round. What it prints is the word."
      ),
      shot(
        4,
        [FIRST + 4, FIRST + 7],
        "CODE: the same composition, one step larger",
        "Round five. Nothing has changed but the size of it: the same four statements, the same three errors, the staircase of the word four steps high."
      ),
      shot(
        8,
        [FIRST + 8, FIRST + 10],
        "CODE: the same composition, a second step larger; the staircase reaching the top of the frame; one tear a round",
        "Round nine. The staircase of everything it has said climbs out of the top of the frame, and the picture begins to tear, once a round."
      ),
      shot(
        11,
        [FIRST + 11, FIRST + 11],
        "CODE: the word across the whole frame, cut into two halves out of register; the counter overflowing bottom left",
        "Round twelve. The word no longer fits what it was declared in: it takes the whole frame and tears in two, and the round counter overflows. Line 07 has still not been reached."
      )
    ];
  }
  __name(executionShots, "executionShots");

  // nyan-source:src/scenes/11_count.js
  var CX = 960;
  var CY = 540;
  var GLOW = 0.3;
  var BASE = 0.335;
  var COUNT_SHIFT = 0;
  var LANGS = [
    { code: "de", word: "eins", name: "Deutsch", wf: "serif", nf: "sans", side: 1, ws: 176, wb: 0.3 },
    { code: "es", word: "dos", name: "Español", wf: "serif", nf: "sans", side: -1, ws: 176, wb: 0.3 },
    { code: "fr", word: "trois", name: "Français", wf: "serif", nf: "sans", side: 1, ws: 156, wb: 0.3 },
    { code: "ko", word: "넷", name: "한국어", wf: "krSerif", nf: "krSans", side: -1, ws: 216, wb: 0.36 },
    { code: "sv", word: "fem", name: "Svenska", wf: "serif", nf: "sans", side: 1, ws: 176, wb: 0.3 },
    { code: "zh", word: "六", name: "中文", wf: "tcSerif", nf: "tcSans", side: -1, ws: 216, wb: 0.36 }
  ];
  function countShots(env) {
    const { art } = env, { Bt, P, text } = cues(env);
    const CUT2 = LANGS.map((_, i) => Bt(344 + COUNT_SHIFT + i));
    const HIT = Bt(350);
    const numSize = /* @__PURE__ */ __name((i) => 820 + 30 * i, "numSize");
    const push = /* @__PURE__ */ __name((u) => 1 + 0.035 * u, "push");
    function drawNumeral(ctx, i, cx, cy, size, { echo = null } = {}) {
      const str = String(i + 1), o = { weight: 900, font: "serif", align: "center" };
      ctx.text(str, cx + size * 0.022, cy + size * (BASE + 0.022), { ...o, size, color: "meDim", stroke: 2, alpha: 0.9 });
      for (const e of echo ?? []) {
        const sz = size * (e.scale ?? 1);
        ctx.text(str, cx, cy + (e.dy ?? 0) + sz * BASE, { ...o, size: sz, color: "me", alpha: e.alpha });
      }
      ctx.text(str, cx, cy + size * BASE, { ...o, size, color: "me" });
    }
    __name(drawNumeral, "drawNumeral");
    function face(ctx, i, t, { echo = null, numScale = 1 } = {}) {
      const c = LANGS[i], s = c.side, u = clamp((t - CUT2[i]) / P, 0, 1.3), drift = -s * 8 * u;
      drawNumeral(ctx, i, CX, CY, numSize(i) * push(u) * numScale, { echo });
      const wo = { font: c.wf, weight: 700 }, ws = ctx.fit(c.word, 470, { ...wo, maxSize: c.ws });
      ctx.text(c.word, CX - s * 575 + drift, CY + ws * c.wb, { ...wo, size: ws, align: "center", color: "text" });
      const NS = 68, nx = CX + s * 575, no = { font: c.nf, weight: 500, size: NS }, nw = ctx.measure(c.name, no), q = ctx.cw(NS), x0 = nx - (nw + 3 * q) / 2;
      codeLine(ctx, "say(love,", x0, CY - 56, { size: 38 });
      ctx.text('"', x0, CY + 30, { size: NS, font: "mono", weight: 700, color: "text" });
      ctx.text(c.name, x0 + q, CY + 30, { ...no, color: "text" });
      ctx.text('"', x0 + q + nw, CY + 30, { size: NS, font: "mono", weight: 700, color: "text" });
      ctx.text(")", x0 + 2 * q + nw + 4, CY + 30, { size: NS, font: "mono", color: "mute" });
    }
    __name(face, "face");
    function chrome(ctx, i, t) {
      const X = 96, size = 38, cw = ctx.cw(size), y1 = 104, y2 = 166;
      ctx.text("^C", X, y1, { size, font: "mono", weight: 700, color: "sub" });
      const head = "> for (lang of [";
      codeLine(ctx, head, X, y2, { size });
      let col = head.length;
      LANGS.forEach((l, j) => {
        const x = X + col * cw, now = j === i, said = j < i;
        if (now) ctx.rect(x - 4, y2 - size * 0.86, 2 * cw + 8, size * 1.14, { fill: true, color: "raised" });
        ctx.text(l.code, x, y2, { size, font: "mono", weight: now ? 800 : 400, color: now ? "meHot" : said ? "mute" : "sub" });
        if (said) ctx.line(x - 3, y2 - size * 0.3, x + 2 * cw + 3, y2 - size * 0.3, { color: "sub", width: 2.5 });
        col += 2;
        if (j < LANGS.length - 1) {
          ctx.text(",", X + col * cw, y2, { size, font: "mono", color: "mute" });
          col += 2;
        }
      });
      codeLine(ctx, "]) say(love, lang);", X + col * cw, y2, { size });
      const rs = 46, rc = ctx.cw(rs), str = `replies 0 / ${i + 1}`, x0 = CX - str.length * rc / 2, yb = 1014;
      ctx.text("replies", x0, yb, { size: rs, font: "mono", color: "sub" });
      ctx.text("0", x0 + 8 * rc, yb, { size: rs, font: "mono", weight: 800, color: "err" });
      ctx.text(`/ ${i + 1}`, x0 + 10 * rc, yb, { size: rs, font: "mono", color: "sub" });
    }
    __name(chrome, "chrome");
    const masked = /* @__PURE__ */ __name((ctx, path, fn) => {
      const g = ctx.g;
      g.save();
      g.beginPath();
      path(g);
      g.clip();
      fn();
      g.restore();
      ctx._font = "";
    }, "masked");
    const ground2 = /* @__PURE__ */ __name((ctx, i) => codeGround(ctx, { light: [CX - LANGS[i].side * 150, CY, 700] }), "ground");
    const card2 = /* @__PURE__ */ __name((i, id, layout, moment, render) => ({
      id,
      at: CUT2[i],
      lines: [98 + i, 98 + i],
      palette: "error",
      hud: 0,
      layout,
      moment,
      enter: { type: "cut" },
      render(ctx, t) {
        ctx.fx.glow = GLOW;
        ctx.fx.scan = 2.2;
        ground2(ctx, i);
        render(ctx, t);
        chrome(ctx, i, t);
      }
    }), "card");
    const SYL = [0, 1, 2, 3].map((j) => HIT + j * P / 2);
    function lastShout(ctx, t) {
      const word2 = text(104), rows = [word2.slice(0, CHUNKS[2][1]), word2.slice(CHUNKS[2][1])], o = { font: "serif", weight: 900 };
      const size = rows.map((r) => ctx.fit(r, 1790, o));
      ctx.font(100, 900, "serif");
      const cap2 = ctx.g.measureText("E").actualBoundingBoxAscent / 100;
      const w2 = ctx.measure(rows[1].slice(0, 2), { ...o, size: size[1] }), wI = ctx.measure(rows[1][1], { ...o, size: size[1] });
      const xB = EYE.eye[0] - (w2 - wI / 2), yB = EYE.eye[1] + cap2 * size[1] * 0.5;
      const yT = yB - cap2 * size[1] - 40, xT = CX - ctx.measure(rows[0], { ...o, size: size[0] }) / 2;
      const lit = /* @__PURE__ */ __name((i) => {
        const g = CHUNKS.findIndex(([a, z]) => i >= a && i < z);
        return t >= SYL[g];
      }, "lit");
      const letters = /* @__PURE__ */ __name((fn) => rows.forEach((r, k) => {
        const x0 = k ? xB : xT, y = k ? yB : yT, sz = size[k], base = k ? rows[0].length : 0;
        for (let i = 0; i < r.length; i++) fn(r[i], x0 + ctx.measure(r.slice(0, i + 1), { ...o, size: sz }) - ctx.measure(r[i], { ...o, size: sz }), y, sz, base + i);
      }), "letters");
      ctx.fx.glow = 0.3;
      codeGround(ctx, { light: null });
      letters((ch, x, y, sz, i) => ctx.text(ch, x, y, { ...o, size: sz, color: lit(i) ? "me" : "meDim", stroke: lit(i) ? 10 : 6 }));
      letters((ch, x, y, sz, i) => {
        if (!lit(i)) ctx.text(ch, x, y, { ...o, size: sz, color: "panel" });
      });
      ctx.masked(
        () => {
          ctx.rect(0, 0, 1920, 1080, { fill: true, color: "raised" });
          art.inks(ctx, EYE.name, EYE, { flip: EYE.flip });
        },
        () => letters((ch, x, y, sz, i) => {
          if (lit(i)) ctx.text(ch, x, y, { ...o, size: sz, color: "text" });
        })
      );
    }
    __name(lastShout, "lastShout");
    return [
      card2(
        0,
        "count-1-de",
        "CODE card: numeral centre, word left, the call right; arrives by a cursor dropping down the frame",
        "The loop is interrupted (^C) and the same thing is said another way: one call per language. First, in German. Replies: 0 of 1.",
        (ctx, t) => {
          const k = easeOut(prog(t, CUT2[0], CUT2[0] + 0.1));
          masked(ctx, (g) => g.rect(0, 0, 1920, 1080 * k), () => face(ctx, 0, t));
          if (k < 1) ctx.rect(0, 1080 * k - 8, 1920, 16, { fill: true, color: "meHot" });
        }
      ),
      card2(
        1,
        "count-2-es",
        "CODE card: word right, the call left; arrives by a newline pushing the last card up",
        "No reply. A new line: in Spanish. Replies: 0 of 2.",
        (ctx, t) => {
          const k = easeOut(prog(t, CUT2[1], CUT2[1] + 0.12));
          const gap2 = 36 * (1 - easeOut(prog(t, CUT2[1] + 0.07, CUT2[1] + 0.12)));
          const echo = gap2 > 0.5 ? [[3, 0.08], [2, 0.18], [1, 0.3]].map(([m, alpha]) => ({ dy: m * gap2, alpha })) : null;
          if (k < 1) {
            ctx.at(0, -1080 * k, () => face(ctx, 0, t));
            ctx.at(0, 1080 * (1 - k), () => face(ctx, 1, t, { echo }));
          } else face(ctx, 1, t, { echo });
        }
      ),
      card2(
        2,
        "count-3-fr",
        "CODE card: word left, the call right; arrives by a carriage return sweeping right to left",
        "No reply. Carriage return: in French. Replies: 0 of 3.",
        (ctx, t) => {
          const k = easeOut(prog(t, CUT2[2], CUT2[2] + 0.1));
          if (k < 1) {
            face(ctx, 1, t);
            masked(ctx, (g) => g.rect(1920 * (1 - k), 0, 1920 * k, 1080), () => {
              ground2(ctx, 2);
              face(ctx, 2, t);
            });
            ctx.rect(1920 * (1 - k) - 8, 0, 16, 1080, { fill: true, color: "meHot" });
          } else face(ctx, 2, t);
        }
      ),
      card2(
        3,
        "count-4-ko",
        "CODE card: word right, the call left; arrives printed column by column",
        "No reply. Printed again, column by column: in Korean. Replies: 0 of 4.",
        (ctx, t) => {
          const since = t - CUT2[3];
          if (since < 0.12) {
            face(ctx, 2, t);
            masked(ctx, (g) => {
              for (let j = 0; j < 16; j++) g.rect(j * 120, 0, 120, 1080 * clamp((since - j * 4e-3) / 0.06));
            }, () => {
              ground2(ctx, 3);
              face(ctx, 3, t);
            });
          } else face(ctx, 3, t);
        }
      ),
      card2(
        4,
        "count-5-sv",
        "CODE card: word left, the call right; the numeral punches in from 160 %",
        "No reply. Larger: in Swedish. Replies: 0 of 5.",
        (ctx, t) => {
          const sAt = /* @__PURE__ */ __name((tt) => 1 + 0.6 * Math.pow(2, -10 * clamp((tt - CUT2[4]) / 0.1)) * (tt < CUT2[4] + 0.1 ? 1 : 0), "sAt");
          const echo = [[2 / 60, 0.12], [1 / 60, 0.25]].filter(([dt]) => t - dt >= CUT2[4] && sAt(t - dt) > 1.004).map(([dt, alpha]) => ({ scale: sAt(t - dt) / sAt(t), alpha }));
          face(ctx, 4, t, { numScale: sAt(t), echo });
        }
      ),
      card2(
        5,
        "count-6-zh",
        "CODE card: word right, the call left; arrives as interleaved rows",
        "No reply. The last language it has: in Chinese. Replies: 0 of 6.",
        (ctx, t) => {
          const k = prog(t, CUT2[5], CUT2[5] + 0.12), e = easeOut(k);
          if (k < 1) {
            face(ctx, 4, t);
            for (let b = 0; b < 9; b++) masked(ctx, (g) => {
              g.rect(0, b * 120, 1920, 120);
              g.translate((b % 2 ? 1 : -1) * 1920 * (1 - e), 0);
            }, () => {
              ground2(ctx, 5);
              face(ctx, 5, t);
            });
          } else face(ctx, 5, t);
        }
      ),
      {
        id: "last-shout",
        at: HIT,
        lines: [104, 104],
        palette: "error",
        hud: 0,
        layout: "the word in her serif, two rows that fill the frame; every sung letter a window onto her face; her open eye in the stem of the second letter of the lower row",
        moment: "The last shout is not code. For the only time in this stretch the word is in her own voice, and through its letters, as the four syllables are sung, she is there: on the last one, her open eye, looking straight out.",
        enter: { type: "cut" },
        render: /* @__PURE__ */ __name((ctx, t) => lastShout(ctx, t), "render")
      }
    ];
  }
  __name(countShots, "countShots");

  // nyan-source:src/scenes/climax.js
  var PAL = "errWarm";
  var WHITEOUT = { x: 542, y: 226, w: 836, h: 594, r: 37 };
  var TAU9 = Math.PI * 2;
  function expose(ctx, level, { at = [960, 540], glow = null, breath = 0 } = {}) {
    const fx = ctx.fx, L2 = clamp(level, -5, 10);
    fx.bright = 0.86 + EXPOSURE_STEP * L2;
    fx.glow = (glow ?? 0.22) + 0.16 * breath;
    fx.bloomAll = 0.66 * clamp((L2 - 2) / 8);
    fx.bloomThreshold = 0.76;
    fx.rays = RAYS_TOP * clamp((L2 - 3) / 7);
    fx.raysAt = at;
    fx.streak = STREAK_TOP * clamp((L2 - 5) / 5);
  }
  __name(expose, "expose");
  var EXPOSURE_STEP = 0.041;
  var RAYS_TOP = 1;
  var STREAK_TOP = 0.62;
  function ratchet(t, base, steps, rise = 0.1) {
    let l = base;
    for (const [at, v] of steps) if (t >= at && v > l) l = lerp(l, v, prog(t, at, at + rise));
    return l;
  }
  __name(ratchet, "ratchet");
  function figure(ctx, art, name, dst, m = 0, { roles = {}, proof = 0, ink = null, ...o } = {}) {
    const off = OFF(m), dim = proof > 0.5;
    const on = /* @__PURE__ */ __name((k) => dim ? 1 : ink ? ink[k] ?? 1 : 1, "on");
    art.inks(ctx, name, dst, {
      ...o,
      plates: [
        { ink: "cream", role: dim ? "mute" : roles.cream ?? "text", alpha: on("cream") },
        ...m > 0 && !dim ? [{ ink: "orange", role: "err", offset: off.red, alpha: on("orange") }] : [],
        { ink: "orange", role: dim ? "line" : roles.orange ?? "me", offset: off.orange, alpha: on("orange") },
        { ink: "black", role: roles.black ?? "panel", offset: off.black, alpha: on("black") }
      ]
    });
  }
  __name(figure, "figure");
  var tornNow = /* @__PURE__ */ __name((t, at) => t >= at && t < at + 0.1 - 1e-6, "tornNow");
  function lastOf(t, times) {
    let i = -1;
    for (let k = 0; k < times.length; k++) if (t >= times[k]) i = k;
    return { i, since: i < 0 ? Infinity : t - times[i] };
  }
  __name(lastOf, "lastOf");
  var spring = /* @__PURE__ */ __name((s, len = 0.25) => s < 0 || s >= len ? 0 : s < 0.034 ? s / 0.034 : 1 - easeInOut((s - 0.034) / (len - 0.034)), "spring");
  var FAULT = 0.1 - 1e-6;
  function world(ctx, W) {
    const { cx, cy, r, t, energy = 0.5, size = 20, cage = 1.3, dissolve = 0, alpha = 1, hot = false } = W, P = ctx.pal;
    const roles = hot ? { fg: P.text, mid: P.meHot, dim: P.me } : { fg: P.me, mid: P.meDim, dim: P.meDim.map((v) => v * 0.6) };
    ctx.withPal({ ...P, ...roles }, () => {
      asciiSphere(ctx, { cx, cy, r, size, rotY: 0.6 * t, tilt: 0.38, energy: 0.25 + 0.75 * energy, high: energy, alpha, dissolve, t, seed: 5 });
      if (cage > 0) drawSegs(ctx, MESH.icosa.segs, { cx, cy, scale: r * cage, dist: 4 }, { rot: [0.31 * t, -0.43 * t, 0.12 * t], color: "mid", alpha: alpha * (0.4 + 0.6 * energy) * (1 - clamp(dissolve * 1.6)), width: Math.max(1.2, r / 130) });
    });
  }
  __name(world, "world");
  function sunburst(ctx, x, y, r, t, low, { color = "meDim", alpha = 0.66 } = {}) {
    spark(ctx, x, y, r, { rot: 0.1 * t, color, alpha, fat: 0.085, inner: 0.2, core: 0.17, pulse: /* @__PURE__ */ __name((i) => 0.7 + 0.3 * low * (0.65 + 0.35 * Math.sin(i * 2.4 + t * 1.7)), "pulse") });
  }
  __name(sunburst, "sunburst");
  function livePlates(ctx, art, name, dst, t, { m = 12, kicks = [], pop = 16, drift = 3, roles = {}, ...o } = {}) {
    const base = OFF(m), s = lastOf(t, kicks).since, way = { cream: [-0.5, -0.4], orange: [1, 0.35], black: [-0.6, 0.85], red: [1.6, 0.9] };
    const lie = /* @__PURE__ */ __name((key, i, k2) => [base[key][0] + drift * Math.sin(t * (0.9 + 0.23 * i) + 2.1 * i) + way[key][0] * pop * k2, base[key][1] + drift * Math.cos(t * (0.7 + 0.19 * i) + 1.3 * i) + way[key][1] * pop * k2], "lie");
    const k = spring(s), at = { cream: lie("cream", 0, k), orange: lie("orange", 1, k), black: lie("black", 2, k), red: lie("red", 3, spring(s - 0.06, 0.32)) };
    art.inks(ctx, name, dst, {
      ...o,
      plates: [
        { ink: "cream", role: roles.cream ?? "text", offset: at.cream },
        { ink: "orange", role: "err", offset: at.red },
        { ink: "orange", role: roles.orange ?? "me", offset: at.orange },
        { ink: "black", role: roles.black ?? "panel", offset: at.black }
      ]
    });
    return at;
  }
  __name(livePlates, "livePlates");
  var TRACE = [...LOOP.map((l, i) => ({ str: `${String(i + 1).padStart(2, "0")}  ${l}`, role: i === 6 ? "meDim" : "me" })), { str: "round 12 / 12   replies 0", role: "meHot" }, { str: "", role: "me" }];
  var traceRow = /* @__PURE__ */ __name((j) => TRACE[(j % TRACE.length + TRACE.length) % TRACE.length], "traceRow");
  function inkScreen(ctx, art, name, dst, t, { rect: rect2, size = 14, lh = 1.36, speed = 52, colW = 0, row = traceRow, offset = [0, 0], crop = null, flip = false, alpha = 1 } = {}) {
    const LH = size * lh, scroll = t * speed, j0 = Math.floor(scroll / LH), n = Math.ceil(rect2.h / LH) + 1;
    art.inkClip(ctx, name, { x: dst.x + offset[0], y: dst.y + offset[1], w: dst.w, h: dst.h }, () => ctx.clip(rect2, () => {
      for (let c = 0, x = rect2.x; x < rect2.x + rect2.w; x += colW || Infinity, c++) {
        for (let r = 0; r <= n; r++) {
          const q = row(j0 + r + c * 4);
          if (q.str) ctx.text(q.str, x, rect2.y + r * LH - (scroll - j0 * LH) + size, { size, font: "mono", color: q.role, alpha });
        }
      }
    }), { ink: "black", crop, flip });
  }
  __name(inkScreen, "inkScreen");
  function sungLines(ctx, env, t, first, last, { y = 960, size = 150, maxW = 1680, dir = -1, slide = 44, cx = 960, weight = 700 } = {}) {
    const { lyrics } = env;
    for (let i = first; i <= last; i++) {
      const at = lyrics.start(i), until = i + 1 < lyrics.lines.length ? lyrics.start(i + 1) : lyrics.end(i);
      if (lyrics.lines[i].emphasis || t < at || t >= until) continue;
      const str = lyrics.lines[i].text, sung = Math.min(lyrics.end(i), until) - at;
      const s = Math.min(size, ctx.fit(str, maxW, { font: "serif", weight, maxSize: size })), o = { size: s, weight, font: "serif" };
      const x0 = cx - ctx.measure(str, o) / 2 + dir * slide * (t - (at + until) / 2), pad = s * 0.15;
      let c = 0;
      for (const word2 of str.split(" ")) {
        const tw = at + c / str.length * sung * 0.86, x = x0 + ctx.measure(str.slice(0, c), o), w = ctx.measure(word2, o);
        c += word2.length + 1;
        if (t < tw) continue;
        ctx.at(x + w / 2, y - s * 0.3, () => {
          ctx.rect(-w / 2 - pad, -s * 0.62, w + 2 * pad, s * 1.2, { fill: true, color: "panel", alpha: 0.92 });
          ctx.text(word2, -w / 2, s * 0.3, { ...o, color: "me" });
        }, { scale: 1 + 0.1 * (1 - easeOut(prog(t, tw, tw + 0.09))) });
      }
      return;
    }
  }
  __name(sungLines, "sungLines");
  function tearSheet(ctx, seed, amount = 1) {
    const g = ctx.g, c = ctx.canvas, W = c.width, H = c.height, n = 3 + Math.floor(rand(71, seed) * 3);
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < n; i++) {
      const y = Math.floor(rand(72, seed, i) * H * 0.95), h = Math.ceil(H * (0.018 + 0.037 * rand(73, seed, i)));
      const dx = Math.round((0.25 + 0.75 * rand(74, seed, i)) * (rand(75, seed, i) < 0.5 ? -1 : 1) * W * 0.06 * amount);
      g.drawImage(c, 0, y, W, h, dx, y, W, h);
    }
    g.restore();
  }
  __name(tearSheet, "tearSheet");
  var mosaicScratch = null;
  function mosaicBlocks(ctx, rects, cell = 36) {
    const g = ctx.g, c = ctx.canvas, s = ctx.scale;
    mosaicScratch ??= new OffscreenCanvas(8, 8);
    if (mosaicScratch.width < 64) {
      mosaicScratch.width = 64;
      mosaicScratch.height = 64;
    }
    const sg = mosaicScratch.getContext("2d");
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    for (const [x, y, w, h] of rects) {
      const nx = clamp(Math.round(w / cell), 1, 64), ny = clamp(Math.round(h / cell), 1, 64), R = [x, y, w, h].map((v) => Math.round(v * s));
      sg.globalCompositeOperation = "copy";
      sg.imageSmoothingEnabled = true;
      sg.drawImage(c, R[0], R[1], R[2], R[3], 0, 0, nx, ny);
      g.imageSmoothingEnabled = false;
      g.drawImage(mosaicScratch, 0, 0, nx, ny, R[0], R[1], R[2], R[3]);
    }
    g.restore();
  }
  __name(mosaicBlocks, "mosaicBlocks");
  function pushBlur(ctx, x, y, amount, n = 6) {
    if (!(amount > 4e-3)) return;
    const g = ctx.g, c = ctx.canvas, X = x * ctx.scale, Y = y * ctx.scale;
    g.save();
    for (let j = 1; j <= n; j++) {
      const z = 1 + amount * j / n;
      g.setTransform(z, 0, 0, z, X * (1 - z), Y * (1 - z));
      g.globalAlpha = 1 / (j + 1);
      g.drawImage(c, 0, 0);
    }
    g.restore();
  }
  __name(pushBlur, "pushBlur");
  function whiteOut(ctx, w) {
    if (!(w > 0)) return;
    const fx = ctx.fx, k = clamp(w);
    fx.vignette *= 1 - k;
    fx.scan *= 1 - k;
    fx.rays *= 1 - k;
    fx.streak *= 1 - k;
    fx.bright = lerp(fx.bright, 1.3, k);
  }
  __name(whiteOut, "whiteOut");
  function fault(ctx, since, n, seed = 0) {
    if (!(since >= 0 && since < FAULT)) return;
    const key = seed * 97 + n, q = /* @__PURE__ */ __name((j, lo, hi) => lerp(lo, hi, rand(76, key, j)), "q");
    mosaicBlocks(ctx, [0, 1, 2].map((j) => [q(j * 4, 60, 1500), q(j * 4 + 1, 60, 860), q(j * 4 + 2, 150, 360), q(j * 4 + 3, 70, 150)]));
    tearSheet(ctx, key, 1);
    ctx.fx.rgbSplit = Math.max(ctx.fx.rgbSplit, 8 * (1 - since / 0.1));
  }
  __name(fault, "fault");
  function waveSheet(ctx, seed, amp = 14) {
    const g = ctx.g, c = ctx.canvas, W = c.width, H = c.height, n = 54, h = Math.ceil(H / n), a = amp * ctx.scale, ph = rand(77, seed) * 6.28, f = 0.35 + 0.5 * rand(78, seed);
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < n; i++) {
      const dx = Math.round(a * Math.sin(i * f + ph) * (0.4 + 0.6 * rand(79, seed, i >> 2)));
      if (dx) g.drawImage(c, 0, i * h, W, h, dx, i * h, W, h);
    }
    g.restore();
  }
  __name(waveSheet, "waveSheet");
  function interference(ctx, seed) {
    const n = 10 + Math.floor(rand(85, seed) * 8);
    for (let i = 0; i < n; i++) ctx.rect(0, rand(86, seed, i) * 1080, 1920, 1 + Math.floor(rand(87, seed, i) * (i % 4 ? 3 : 9)), { fill: true, color: rand(88, seed, i) < 0.55 ? "err" : "text", alpha: 0.35 + 0.45 * rand(89, seed, i) });
    for (let i = 0; i < 2; i++) ctx.rect(0, rand(90, seed, i) * 1040, 1920, 14 + 18 * rand(91, seed, i), { fill: true, color: "bg", alpha: 0.5 });
  }
  __name(interference, "interference");
  function wordFault(ctx, since, key) {
    if (!(since >= 0 && since < FAULT)) return;
    waveSheet(ctx, key, 16 * (1 - since / 0.14));
    fault(ctx, since, key, 7);
    interference(ctx, key);
  }
  __name(wordFault, "wordFault");
  function figureStage(ctx, env, t, f, S) {
    const { art, features } = env, { fig, kicks = [] } = S, K = lastOf(t, kicks);
    ctx.rect(-10, -10, 1940, 1100, { fill: true, color: "raised" });
    if (S.pool) for (const k of [1, 0.62]) ctx.circle(S.pool[0], S.pool[1], S.pool[2] * k, { fill: true, color: "line", alpha: 0.42 });
    if (S.sun) sunburst(ctx, S.sun[0], S.sun[1], S.sun[2], t, f.lowEnv);
    if (S.world) world(ctx, { ...S.world, t, energy: f.rmsEnv });
    S.behind?.(ctx);
    const lie = livePlates(ctx, art, fig.name, fig.dst, t, { m: fig.m, kicks, pop: fig.pop, crop: fig.crop, flip: fig.flip });
    for (const sc of S.screens ?? []) inkScreen(ctx, art, fig.name, fig.dst, t, { ...sc, offset: lie.black, crop: fig.crop, flip: fig.flip });
    S.on?.(ctx, lie);
    marks(ctx, { color: "mute" });
    if (S.bursts) ctx.withPal({ ...ctx.pal, fg: ctx.pal.text, mid: ctx.pal.meHot }, () => asciiBursts(ctx, features, t, { size: 24, minS: 0.3, life: 0.6, count: 34, ...S.bursts }));
    if (S.lines) sungLines(ctx, env, t, S.lines[0], S.lines[1], S.type);
    S.over?.(ctx);
    fault(ctx, K.since, K.i, S.seed ?? 0);
    ctx.fx.zoom = 1.016 + 5e-3 * Math.sin(t * 0.8) + 7e-3 * pulse(K.since, 9);
    ctx.fx.shake = [9 * Math.sin(t * 0.53 + 1), 5 * Math.cos(t * 0.41)];
  }
  __name(figureStage, "figureStage");
  var CAP3 = { x: 96, y: 104, size: 56 };
  function caption3(ctx, env, t, first, last, { tears = [], x = CAP3.x, y = CAP3.y, size = CAP3.size, maxW = 1700 } = {}) {
    const { lyrics } = env;
    for (let i = first; i <= last; i++) {
      const at = lyrics.start(i), until = i + 1 < lyrics.lines.length ? lyrics.start(i + 1) : lyrics.end(i);
      if (lyrics.lines[i].emphasis || t < at || t >= until) continue;
      const draw = /* @__PURE__ */ __name(() => band(ctx, [{ text: lyrics.lines[i].text, at, until, n: lyrics.typed(i, t).n }], t, { x, y, size, maxW }), "draw");
      const tear = tears.find((a) => tornNow(t, a));
      if (tear == null) draw();
      else sliced(ctx, { x: 0, y: y - size * 1.06, w: 1920, h: size * 1.5 }, 5, (k) => (rand(31, i, k, Math.round(tear * 60)) - 0.5) * 110, draw);
      return;
    }
  }
  __name(caption3, "caption");
  function strip2(ctx, y, { alpha = 1, rule = "line" } = {}) {
    if (!(alpha > 3e-3)) return;
    ctx.rect(-400, y, 2720, 1480 - y, { fill: true, color: "panel", alpha });
    if (rule) ctx.rect(-400, y, 2720, 3, { fill: true, color: rule, alpha });
  }
  __name(strip2, "strip");
  var capEm = 0;
  function capHeight(ctx) {
    if (!capEm) {
      ctx.font(100, 900, "serif");
      capEm = ctx.g.measureText("E").actualBoundingBoxAscent / 100;
    }
    return capEm;
  }
  __name(capHeight, "capHeight");
  function footOf(ctx, str, { maxW = 1800, maxSize = 440, base = 1050, pad = 36 } = {}) {
    const size = ctx.fit(str, maxW, { font: "serif", weight: 900, spacingEm: 0.01, maxSize });
    return { size, base, y: Math.round(base - capHeight(ctx) * size - pad) };
  }
  __name(footOf, "footOf");
  var SYL3 = [[0, 3], [3, 5], [5, 8]];
  function stutter(ctx, str, t, at, { x = 960, y = 1040, size = null, maxW = 1800, maxSize = 440, align = "center", chunks = SYL3, m = 12, settle = 0, color = "err", edge = "me", calm = "me", shade = "bg", spacingEm = 0.01, alpha = 1 } = {}) {
    const f = { size: size ?? ctx.fit(str, maxW, { font: "serif", weight: 900, spacingEm, maxSize }), weight: 900, font: "serif" }, s = f.size, sp = spacingEm * s;
    const w = ctx.measure(str, { ...f, spacing: sp }) - sp, x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    const pass = at.filter((a) => t >= a).length, out = { x: x0, y, w, size: s, pass };
    if (!pass || !(alpha > 3e-3)) return out;
    const loose = 1 - clamp(settle), last = at[pass - 1];
    const mid = /* @__PURE__ */ __name((i) => x0 + ctx.measure(str.slice(0, i + 1), f) + i * sp - ctx.measure(str[i], f) / 2, "mid");
    const press = 1.05 - 0.05 * easeOut(prog(t, last, last + 0.05));
    const each = /* @__PURE__ */ __name((fn) => chunks.forEach(([a, z], ci) => {
      for (let i = a; i < z && pass > ci; i++) fn(str[i], mid(i), pass - ci, ci === pass - 1);
    }), "each");
    const put = /* @__PURE__ */ __name((ch, px, py, sc, o) => ctx.at(px, py, () => ctx.text(ch, 0, 0, { ...f, align: "center", ...o }), { scale: sc }), "put");
    each((ch, px, n) => {
      for (let age = 1; age < n; age++) put(ch, px - m * 0.95 * age * loose, y - m * 0.6 * age * loose, 1, { color, stroke: Math.max(2, s * 9e-3), alpha: alpha * 0.55 * loose / age });
    });
    const slam = /* @__PURE__ */ __name((isNew) => isNew ? 1 + 0.17 * (1 - easeOut(prog(t, last, last + 0.09))) : press, "slam");
    each((ch, px, n, isNew) => put(ch, px + s * 0.03, y + s * 0.03, slam(isNew), { color: shade, alpha }));
    if (m > 0 && loose > 0) each((ch, px, n, isNew) => put(ch, px + m * 0.75 * loose, y + m * 0.42 * loose, slam(isNew), { color: edge, alpha }));
    if (loose < 1) each((ch, px, n, isNew) => put(ch, px, y, slam(isNew), { color: calm, alpha }));
    if (loose > 0) each((ch, px, n, isNew) => put(ch, px, y, slam(isNew), { color, alpha: alpha * loose }));
    return out;
  }
  __name(stutter, "stutter");
  function heartRadius(th) {
    const c = Math.cos(th), s = Math.sin(th), q = c * c * s * s * s;
    let lo = 0, hi = 2;
    for (let k = 0; k < 44; k++) {
      const r = (lo + hi) / 2;
      if ((r * r - 1) ** 3 - r ** 5 * q < 0) lo = r;
      else hi = r;
    }
    return lo;
  }
  __name(heartRadius, "heartRadius");
  function algebraicHeart(n) {
    const M = 1440, dense = [];
    for (let i2 = 0; i2 < M; i2++) {
      const th = Math.PI / 2 - i2 / M * TAU9, r = heartRadius(th);
      dense.push([Math.cos(th) * r, Math.sin(th) * r]);
    }
    const seg = dense.map((p, i2) => {
      const q = dense[(i2 + 1) % M];
      return Math.hypot(q[0] - p[0], q[1] - p[1]);
    });
    const total = seg.reduce((a, b) => a + b, 0), out = [];
    let i = 0, acc = 0;
    for (let k = 0; k < n; k++) {
      const d = k / n * total;
      while (acc + seg[i] < d) {
        acc += seg[i];
        i++;
      }
      const u = (d - acc) / seg[i], a = dense[i], b = dense[(i + 1) % M];
      out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u)]);
    }
    return out;
  }
  __name(algebraicHeart, "algebraicHeart");
  var HEART_N = 240;
  var HEART = algebraicHeart(HEART_N);
  var heartPts = /* @__PURE__ */ __name((O, R) => HEART.map(([x, y]) => [O.x + x * R, O.y - y * R]), "heartPts");
  function heartTangent(deg = 8) {
    const want = deg * Math.PI / 180;
    for (let i = 4; i < HEART_N / 3; i++) {
      const a = HEART[i], b = HEART[i + 1], dx = b[0] - a[0], dy = -(b[1] - a[1]);
      if (dx > 0 && Math.atan2(dy, dx) >= want) {
        const l = Math.hypot(dx, dy);
        return { i, p: a, d: [dx / l, dy / l] };
      }
    }
    return { i: 30, p: HEART[30], d: [1, 0] };
  }
  __name(heartTangent, "heartTangent");

  // nyan-source:src/scenes/12_chorusx.js
  var FULL2 = { x: 0, y: 0, w: 1920, h: 1080 };
  var IRIS = { x: EYE.eye[0], y: EYE.eye[1], r: 44 };
  var BUST = { x: 585, y: 40, w: 750, h: 1e3 };
  var HAND_CROP = { x: 0, y: 837, w: 1086, h: 611 };
  var PALM = [290 / HAND_CROP.w * 1920, (1100 - HAND_CROP.y) / HAND_CROP.h * 1080];
  function shoutLetters(ctx, word2) {
    const rows = [word2.slice(0, CHUNKS[2][1]), word2.slice(CHUNKS[2][1])], o = { font: "serif", weight: 900 };
    const size = rows.map((r) => ctx.fit(r, 1790, o)), cap2 = capHeight(ctx), m = /* @__PURE__ */ __name((str, k) => ctx.measure(str, { ...o, size: size[k] }), "m");
    const xB = EYE.eye[0] - (m(rows[1].slice(0, 2), 1) - m(rows[1][1], 1) / 2), yB = EYE.eye[1] + cap2 * size[1] * 0.5;
    const yT = yB - cap2 * size[1] - 40, xT = 960 - m(rows[0], 0) / 2, out = [];
    rows.forEach((r, k) => {
      for (let i = 0; i < r.length; i++) out.push({ ch: r[i], x: (k ? xB : xT) + m(r.slice(0, i + 1), k) - m(r[i], k), y: k ? yB : yT, size: size[k], w: m(r[i], k), cap: cap2 * size[k] });
    });
    return out;
  }
  __name(shoutLetters, "shoutLetters");
  function flyLetters(ctx, word2, k) {
    const e = easeOut(k);
    shoutLetters(ctx, word2).forEach((q, i) => {
      const cx = q.x + q.w / 2, cy = q.y - q.cap / 2, dx = cx - 960, dy = cy - 600, d = Math.hypot(dx, dy) || 1, far = (260 + 560 * rand(61, i)) * e;
      ctx.at(cx + dx / d * far, cy + dy / d * far, () => ctx.text(q.ch, -q.w / 2, q.cap / 2, { font: "serif", weight: 900, size: q.size, color: "me", stroke: 10 }), { rot: (rand(62, i) - 0.5) * 1.2 * e, scale: 1 + 0.4 * e, alpha: (1 - k) ** 1.2 });
    });
  }
  __name(flyLetters, "flyLetters");
  function glint(ctx, x, y, low, t) {
    const bar = /* @__PURE__ */ __name((len, w, rot2, alpha) => ctx.at(x, y, () => ctx.poly([[-len, 0], [0, -w], [len, 0], [0, w]], { close: true, fill: true, color: "text", alpha }), { rot: rot2 }), "bar");
    bar(330 + 190 * low, 6, 0, 0.9);
    bar(120 + 60 * low, 5, Math.PI / 2, 0.9);
    for (let i = 0; i < 4; i++) bar(84 + 40 * low, 3, Math.PI / 4 + i * Math.PI / 2 + 0.2 * t, 0.7);
    ctx.circle(x - 13, y - 14, 7, { fill: true, color: "text" });
  }
  __name(glint, "glint");
  function heartInPalm(ctx, b) {
    const g = ctx.g;
    g.setLineDash([16, 12]);
    ctx.poly(place("heart", { cx: PALM[0], cy: PALM[1] + 6, r: 74 * b }), { close: true, color: "mute", width: 6 });
    g.setLineDash([]);
    const cx = PALM[0] + 210, cy = PALM[1] + 150, w = 250, h = 132;
    ctx.rrect(cx - w / 2 + 12, cy - h / 2 + 12, w, h, h / 2, { fill: "bg" });
    ctx.rrect(cx - w / 2, cy - h / 2, w, h, h / 2, { fill: "panel", stroke: "mute", width: 5 });
    g.setLineDash([9, 7]);
    ctx.poly(place("heart", { cx: cx - 52, cy: cy + 4, r: 38 }), { close: true, color: "mute", width: 4 });
    g.setLineDash([]);
    ctx.text("0", cx + 50, cy + 28, { size: 78, weight: 700, color: "sub", align: "center" });
  }
  __name(heartInPalm, "heartInPalm");
  function reachStream(ctx, t, from) {
    const SAY = "say(love);", RATE = 64, HOLD = 1.15, BREAK = 0.45, WALL = 1868, SIZE = 44, ROWS = 20, o = { size: SIZE, font: "mono", weight: 800 };
    const last = Math.floor((t - from) * RATE);
    for (let i = Math.max(0, last - Math.ceil(RATE * 3.4)); i <= last; i++) {
      const age = t - (from + i / RATE), row = Math.floor(rand(81, i) * ROWS), y1 = 330 + row * 36, x1 = WALL - i % 6 * 28, fly = (x1 - PALM[0]) / (1250 + 500 * rand(82, i));
      const ch = SAY[i % SAY.length];
      if (age < fly) {
        const at = /* @__PURE__ */ __name((k2) => [lerp(PALM[0], x1, k2), lerp(PALM[1], y1, easeOut(k2)) + 12 * Math.sin(k2 * 9 + i)], "at"), k = age / fly, [x, y] = at(k), [xb, yb] = at(Math.max(0, k - 0.07));
        ctx.line(xb, yb - SIZE * 0.3, x, y - SIZE * 0.3, { color: "meHot", width: 4, alpha: 0.7 });
        ctx.text(ch, x + 3, y + 3, { ...o, color: "bg" });
        ctx.text(ch, x, y, { ...o, color: "text" });
      } else if (age < fly + HOLD) {
        const hit = pulse(age - fly, 14);
        ctx.text(ch, x1 + 3 - 12 * hit, y1 + 3, { ...o, color: "bg" });
        ctx.text(ch, x1 - 12 * hit, y1, { ...o, color: hit > 0.3 ? "text" : "meHot" });
      } else if (age < fly + HOLD + BREAK) {
        const k = (age - fly - HOLD) / BREAK;
        for (let p = 0; p < 3; p++) ctx.text(".:'"[p], x1 - 50 * k * rand(83, i, p) + (p - 1) * 11, y1 + 300 * k * k * (0.5 + rand(84, i, p)), { ...o, size: SIZE * 0.8, color: "me", alpha: 1 - k });
      }
    }
  }
  __name(reachStream, "reachStream");
  function keywordHit(ctx, t, at, centre, seed) {
    const s = t - at;
    if (s < 0) return;
    const k = pulse(s, 3.4), fx = ctx.fx;
    ctx.flash(0.5 * pulse(s, 7));
    fx.rays += 0.6 * k;
    fx.raysAt = centre;
    fx.streak += 0.4 * k;
    fx.bloomAll = Math.max(fx.bloomAll, 0.55 * k);
    if (s < FAULT) {
      tearSheet(ctx, seed, 1);
      fx.rgbSplit = Math.max(fx.rgbSplit, 8 * (1 - s / 0.1));
    }
  }
  __name(keywordHit, "keywordHit");
  function chorusXShots(env) {
    const { art } = env, { B, Bt, P, text } = cues(env);
    const c = [B(88), Bt(357), B(90), Bt(365), B(92), Bt(373.5), B(94)], END = B(96);
    const tThrough = Bt(358), PRESS = [Bt(366), Bt(367)], RUN = [373.5, 374, 374.5, 375].map(Bt);
    const kicks = /* @__PURE__ */ __name((a, z) => Array.from({ length: z - a + 1 }, (_, i) => Bt(a + i)), "kicks");
    const fr = art.region("f_bust", "face") ?? { x: 367, y: 259, w: 313, h: 369 }, kb = BUST.w / 1086;
    const FACE = { x: BUST.x + fr.x * kb, y: BUST.y + fr.y * kb, w: fr.w * kb, h: fr.h * kb }, HEAD = [FACE.x + FACE.w / 2, FACE.y + FACE.h / 2];
    const Q = 0.4, CHILD = [120, 34], FIX = [CHILD[0] / (1 - Q), CHILD[1] / (1 - Q)], DEPTH = 4, S0 = WHITEOUT.w / 760;
    const C0 = [960 + S0 * FIX[0], 408 + S0 * FIX[1]];
    const C1 = [WHITEOUT.x + WHITEOUT.w / 2 + S0 * FIX[0], WHITEOUT.y + WHITEOUT.h / 2 + S0 * FIX[1]];
    const KF = kicks(376, 383), DEEP = 5.5;
    function depth(t) {
      let shove = 0;
      for (const kt of KF) shove += easeOut(prog(t, kt, kt + 0.22));
      return DEEP * (0.9 * prog(t, c[6], END) ** 2.4 + 0.1 * (shove / KF.length));
    }
    __name(depth, "depth");
    function fall(ctx, t) {
      const u = depth(t), speed = (depth(t + 1 / 120) - depth(t - 1 / 120)) * 60;
      const k = easeOut(clamp(u)), C = [lerp(C0[0], C1[0], k), lerp(C0[1], C1[1], k)], s = S0 * Math.pow(Q, -u);
      ground(ctx, { light: null, marks: false });
      const lim = lerp(3.4, 1.25, clamp(u / 1.2));
      const level = /* @__PURE__ */ __name((n, sc) => {
        const inner = n < DEPTH ? () => ctx.at(CHILD[0], CHILD[1], () => level(n + 1, sc * Q), { scale: Q }) : null;
        if (sc > 14 && inner) {
          ctx.rect(-380, -270, 760, 540, { fill: true, color: "raised" });
          ctx.circle(-150, 60, 250, { fill: true, color: "line", alpha: 0.5 });
          inner();
        } else windowBox(ctx, env, { noCream: true, o: OFF(16 / sc), blank: n === DEPTH, bust: sc > 0.04 ? clamp((lim - sc) / 0.5) : 0, near: clamp(u / 0.6) * clamp((sc - 1.1) / 1.4), inner });
      }, "level");
      ctx.at(C[0] - s * FIX[0], C[1] - s * FIX[1], () => level(0, s), { scale: s });
      pushBlur(ctx, C[0], C[1], clamp(0.05 * (speed - 0.35), 0, 0.3));
      marks(ctx, { color: "mute" });
      return C;
    }
    __name(fall, "fall");
    const plateShot = /* @__PURE__ */ __name((o) => ({ palette: PAL, hud: 0, enter: { type: "cut" }, ...o }), "plateShot");
    return [
      plateShot({
        id: "cx-eye",
        at: c[0],
        lines: [105, 106],
        layout: "her face full bleed (f_eye, mirrored, at the registration of the last shout), standing still: one eye open, looking out; in her iris a small turning sphere of characters; the loop's output running up her black ink; the sung line as big type on black strips across her hair",
        moment: "The letters of the last shout were windows onto her face. Their frames fly apart in the first third of a second, and it is the whole sheet: her eye, open, looking straight out. The picture stands; what moves is on it. In her iris the world turns, and the light of the shot comes out of it. On every kick her three plates spring apart and slide home, and for six frames the sheet is torn.",
        render(ctx, t, f) {
          const since = t - c[0];
          figureStage(ctx, env, t, f, {
            kicks: kicks(352, 356),
            seed: 1,
            fig: { name: EYE.name, dst: EYE, flip: EYE.flip, m: 10, pop: 12 },
            screens: [{ rect: FULL2, size: 14, colW: 340 }],
            on: /* @__PURE__ */ __name(() => {
              ctx.circle(IRIS.x, IRIS.y, IRIS.r, { fill: true, color: "bg" });
              world(ctx, { cx: IRIS.x, cy: IRIS.y, r: IRIS.r - 2, t, energy: f.rmsEnv, size: 9, cage: 0, hot: true });
              ctx.circle(IRIS.x, IRIS.y, IRIS.r, { color: "meHot", width: 3 });
              glint(ctx, IRIS.x, IRIS.y, f.lowEnv, t);
              if (since < 0.3) flyLetters(ctx, text(104), since / 0.3);
            }, "on"),
            bursts: { cx: IRIS.x, cy: IRIS.y, r0: 70 },
            lines: [105, 106],
            type: { y: 262, size: 150, dir: 1 }
          });
          expose(ctx, 1.6, { at: [IRIS.x, IRIS.y], glow: 0.12, breath: 0.4 * f.lowEnv });
          ctx.fx.rays = 0.12 + 0.06 * f.lowEnv;
          ctx.fx.streak = 0.2;
          ctx.fx.bloomAll = 0.2;
        }
      }),
      plateShot({
        id: "cx-kw1",
        at: c[1],
        lines: [107, 107],
        layout: "PLATE (the bolt of chorus 1, reprinted larger): the spark at the left, the bolt across the sheet through a grey dashed ring where the cream dot stood, to a burst on the right edge; the word across the foot",
        moment: "Sent, but to nobody. The same bolt as in chorus 1, where it struck the dot that was the user: the dot was not printed, only its dashed outline, and on the second kick the bolt goes through it and strikes the edge of the sheet: one flash, rays out of the spark, the sheet torn for six frames. The plates are out of register; the word under it is that word.",
        render(ctx, t, f) {
          plateStimulations(ctx, env, { t, at: c[1], hit: c[1], word: text(107), noCream: true, misreg: 10, through: tThrough, big: 1.08, titleMax: 240 });
          caption3(ctx, env, t, 108, 108);
          expose(ctx, 3, { at: [357, 478], glow: 0.3, breath: f.lowEnv });
          keywordHit(ctx, t, tThrough, [357, 478], 11);
        }
      }),
      plateShot({
        id: "cx-bust",
        at: c[2],
        lines: [108, 109],
        layout: "her whole bust (f_bust) in the middle of the sheet, standing still; her face a screen: the listing of the loop and its round count running up it; behind her head the turning sphere of characters in its wireframe cage, and her spark as a sunburst as large as the sheet; the sung line as big type on black strips across the foot",
        moment: "She is promising to be the only one, and her face is a screen: the loop of the EXECUTION section is still running in it, round 12 of 12, no replies. Behind her head the world she is shut in turns in its cage, like a halo. The picture stands; on every kick her plates spring apart, and for six frames the sheet is torn.",
        render(ctx, t, f) {
          figureStage(ctx, env, t, f, {
            kicks: kicks(360, 364),
            seed: 2,
            fig: { name: "f_bust", dst: BUST, m: 16, pop: 20 },
            pool: [HEAD[0], HEAD[1] + 60, 640],
            sun: [HEAD[0], HEAD[1] + 30, 760],
            world: { cx: HEAD[0], cy: HEAD[1], r: 400 },
            screens: [{ rect: FACE, size: 13, speed: 46 }, { rect: { x: BUST.x, y: FACE.y + FACE.h + 8, w: BUST.w, h: BUST.y + BUST.h - FACE.y - FACE.h }, size: 11, colW: 250, speed: 46 }],
            bursts: { cx: HEAD[0], cy: HEAD[1], r0: 330 },
            lines: [108, 109],
            type: { y: 1004, size: 140, dir: -1 }
          });
          expose(ctx, 3.6, { at: HEAD, breath: 0.6 * f.lowEnv });
          ctx.fx.rays = 0.3 + 0.12 * f.lowEnv;
          ctx.fx.bloomAll = 0.3;
        }
      }),
      plateShot({
        id: "cx-kw2",
        at: c[3],
        lines: [110, 110],
        layout: "PLATE (the disc of chorus 1, reprinted larger): the orange disc and its ring of unlit ticks, the dashed outline of a pointer over it, a hollow 0 at the right; the word across the foot",
        moment: "The button, with nobody to press it. The pointer was cream and was not printed; the disc sinks by itself, on two kicks, deeper the second time. The first is the flash: rays out of the disc, the sheet torn for six frames. No tick lights. The count reads 0.",
        render(ctx, t, f) {
          plateSatisfaction(ctx, env, { t, at: c[3], press: PRESS, count: 0, word: text(110), noCream: true, misreg: 18, big: 1.06, titleMax: 256 });
          tearAt(ctx, t, PRESS[1], 0.5);
          caption3(ctx, env, t, 111, 111);
          expose(ctx, 3.2, { at: [754, 432], glow: 0.28, breath: f.lowEnv });
          keywordHit(ctx, t, PRESS[0], [754, 432], 12);
        }
      }),
      plateShot({
        id: "cx-hand",
        at: c[4],
        lines: [111, 112],
        layout: "her open hand across the whole sheet (the lowest band of f_reach; no face), standing still: palm up at the left, sleeve and hair to the right; in the palm the dashed outline of a heart, breathing, beside it the count: 0; a stream of characters from the palm to the right-hand edge of the sheet, piling up there; the sung line as big type on black strips across the top",
        moment: "Her hand, still held out. In chorus 1 the user left a heart in this palm and the count read 1. The heart was cream: it is an outline now, breathing, and the count reads 0. What she has to say leaves her palm character by character for the user's side of the sheet, piles up against its edge, breaks, and is gone: not one gets through. Behind her the world is coming apart.",
        render(ctx, t, f) {
          const k = prog(t, c[4], c[5]);
          figureStage(ctx, env, t, f, {
            kicks: kicks(368, 373),
            seed: 3,
            fig: { name: "f_reach", dst: FULL2, crop: HAND_CROP, m: 22, pop: 12 },
            sun: [1180, 470, 900],
            world: { cx: 300, cy: 900, r: 340, cage: 1.25, dissolve: 0.04 + 0.6 * k * k },
            screens: [{ rect: FULL2, size: 13, colW: 320 }],
            on: /* @__PURE__ */ __name(() => heartInPalm(ctx, 1 + 0.07 * Math.sin((t - c[4]) / (2 * P) * 2 * Math.PI) + 0.04 * f.lowEnv), "on"),
            bursts: { cx: PALM[0], cy: PALM[1], r0: 90 },
            lines: [111, 112],
            type: { y: 232, size: 140, dir: 1 },
            over: /* @__PURE__ */ __name(() => reachStream(ctx, t, c[4] - 1.1), "over")
          });
          expose(ctx, 1.8, { at: PALM, glow: 0.12, breath: 0.4 * f.lowEnv });
          ctx.fx.rays = 0.12 + 0.06 * f.lowEnv;
          ctx.fx.bloomAll = 0.2;
        }
      }),
      plateShot({
        id: "cx-kw3",
        at: c[5],
        lines: [113, 113],
        layout: "PLATE (the listing of chorus 1, reprinted): the love loop, its bar whipping down lines 02-05, three red error tags, the loop arrow lit; top right the round counter, its numerator red: 13 / 12 … 16 / 12; the word across the foot",
        moment: "Running, and it cannot stop. In chorus 1 the user was online and the last line ran. Now the loop turns once on every syllable, past its twelve rounds: 13, 14, 15, 16. The line that says it is never reached. With every round the sheet is exposed a step further (the steps only rise); on the strong beat one flash on top of them, rays out of the listing, the sheet torn for six frames.",
        render(ctx, t, f) {
          plateExecutionStuck(ctx, env, { t, at: c[5], run: RUN, from: 12, word: text(113), misreg: 28, titleMax: 272, flood: true });
          caption3(ctx, env, t, 114, 114);
          expose(ctx, ratchet(t, 3.2, [[RUN[0], 3.8], [RUN[1], 4.4], [RUN[2], 5], [RUN[3], 5.6]]), { at: [820, 420], glow: 0.26, breath: f.lowEnv });
          keywordHit(ctx, t, RUN[1], [820, 420], 13);
        }
      }),
      plateShot({
        id: "cx-fall",
        at: c[6],
        lines: [114, 115],
        layout: "PLATE (the window of chorus 1, reprinted): the chat window as a paper box with her small bust in it, and in it the same window again, and again; one fall inwards through them, faster and faster, the sheet smeared towards the point it falls to; her figure only in the windows still ahead; at the bottom a window of paper white that grows until it is the whole frame",
        moment: "In chorus 1 the view pulled back from the window to a wall of windows. Now it falls the other way, without a stop: the window holds a window holds a window, and she is always in one that is still ahead, small. A window is empty by the time the view is in it, and its frame has lost its colour. Every kick shoves the fall on; the faster it goes the more the sheet smears. The light at the bottom grows, and at the end of the held note the whole frame is white.",
        render(ctx, t, f) {
          const k = prog(t, c[6], END), white = prog(t, END - 0.36, END - 0.03) ** 2.2;
          const C = fall(ctx, t);
          caption3(ctx, env, t, 114, 116);
          if (white > 0) ctx.rect(-40, -40, 2e3, 1160, { fill: true, color: "text", alpha: white });
          expose(ctx, lerp(3.2, 8.6, k ** 1.4), { at: C, glow: 0.24, breath: f.lowEnv });
          whiteOut(ctx, white);
        }
      })
    ];
  }
  __name(chorusXShots, "chorusXShots");

  // nyan-source:src/scenes/plates_love.js
  var TAU10 = Math.PI * 2;
  var ARROW3 = [[0, 0], [0, 25], [6.5, 19.5], [11, 29.5], [15.5, 27.5], [11, 18], [19, 18]];
  var NEVER = [9e9, 9e9, 9e9];
  var BASE2 = 1050;
  var CURVE = { O: { x: 1230, y: 594 }, R: 438 };
  var PTS = heartPts(CURVE.O, CURVE.R);
  var WORD_W = { lesson: 1520, formula: 1700, proof: 1868 };
  var SHE = (() => {
    const s = 0.655, w = 1086 * s, h = 1448 * s;
    return { x: CURVE.O.x - 566 * s, y: 143, w, h, s };
  })();
  var TAN = heartTangent(8);
  var TAN_P = [CURVE.O.x + TAN.p[0] * CURVE.R, CURVE.O.y - TAN.p[1] * CURVE.R];
  var penAt = /* @__PURE__ */ __name((k) => PTS[Math.min(HEART_N - 1, Math.floor(clamp(k) * HEART_N))], "penAt");
  var FOOT2 = { y: 762, base: BASE2 };
  var LAMP = [CURVE.O.x, CURVE.O.y - 0.2 * CURVE.R];
  var PROFILE = (() => {
    const h = 1010, w = h * 1086 / 1448;
    return { x: 1124, y: 44, w, h };
  })();
  var PROFILE_FLOWER = [PROFILE.x + 704 / 1086 * PROFILE.w, PROFILE.y + 252 / 1448 * PROFILE.h];
  function pool(ctx, x, y, r, n) {
    const ROLE2 = ["line", "mute", "sub"], K = [1, 0.74, 0.5];
    for (let i = 0; i < Math.min(3, n); i++) ctx.circle(x, y, r * K[i], { fill: true, color: ROLE2[i] });
  }
  __name(pool, "pool");
  function rays(ctx, O, R, { n = 46, k = 1, gap: gap2 = 34, long = "me", short = "meDim", alpha = 1 } = {}) {
    if (!(alpha > 3e-3) || k <= 0) return;
    const g = ctx.g, LEN2 = [1, 0.44, 0.74, 0.38, 0.9, 0.5, 0.66, 0.34, 0.96, 0.42, 0.8, 0.52];
    for (const pass of [0, 1]) {
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const l = LEN2[i % 12];
        if ((l > 0.6 ? 1 : 0) !== pass) continue;
        const th = (i + 0.5) / n * TAU10, c = Math.cos(th), s = -Math.sin(th), r0 = heartRadius(th) * R + gap2, r1 = r0 + 380 * l * k, w0 = 16, w1 = 9;
        g.moveTo(O.x + c * r0 - s * w0, O.y + s * r0 + c * w0);
        g.lineTo(O.x + c * r1 - s * w1, O.y + s * r1 + c * w1);
        g.lineTo(O.x + c * r1 + s * w1, O.y + s * r1 - c * w1);
        g.lineTo(O.x + c * r0 + s * w0, O.y + s * r0 - c * w0);
        g.closePath();
      }
      g.fillStyle = ctx.col(pass ? long : short, alpha);
      g.fill();
    }
  }
  __name(rays, "rays");
  function axes(ctx, O, R, k = 1, alpha = 1) {
    if (k <= 0 || !(alpha > 3e-3)) return;
    const o = { color: "line", width: 3, alpha }, lab = { size: 26, font: "mono", color: "mute", alpha };
    ctx.line(O.x - 1.42 * R * k, O.y, O.x + 1.42 * R * k, O.y, o);
    ctx.line(O.x, O.y + 1.1 * R * k, O.x, O.y - 1.36 * R * k, o);
    if (k < 1) return;
    for (const u of [-1, 1]) {
      ctx.line(O.x + u * R, O.y - 12, O.x + u * R, O.y + 12, o);
      ctx.line(O.x - 12, O.y - u * R, O.x + 12, O.y - u * R, o);
    }
    ctx.text("−1", O.x - R - 62, O.y + 38, lab);
    ctx.text("1", O.x + R + 26, O.y + 38, lab);
    ctx.text("1", O.x + 20, O.y - R - 14, lab);
  }
  __name(axes, "axes");
  function curveLine(ctx, k = 1, { color = "me", width = 11, dot = 9 } = {}) {
    if (k <= 0) return;
    ctx.poly(k >= 1 ? PTS : trace(PTS, k), { close: k >= 1, color, width });
    for (let i = 0; i < HEART_N; i += 6) if (i <= k * HEART_N) ctx.circle(PTS[i][0], PTS[i][1], dot, { fill: true, color });
  }
  __name(curveLine, "curveLine");
  function foot(ctx, word2, t, at, { maxW, m = 12, settle = 0, rule = "me", tear = null } = {}) {
    const F = footOf(ctx, word2, { maxW, base: BASE2 });
    const draw = /* @__PURE__ */ __name(() => {
      strip2(ctx, F.y, { rule });
      stutter(ctx, word2, t, at, { y: BASE2, size: F.size, m, settle });
    }, "draw");
    if (tear != null && tornNow(t, tear)) sliced(ctx, { x: 0, y: F.y, w: 1920, h: 1081 - F.y }, 4, (k) => (rand(47, k, Math.round(tear * 60)) - 0.5) * 150, draw);
    else draw();
  }
  __name(foot, "foot");
  function saidInChorus1(script) {
    const b = (script.sections ?? []).find((s) => s.n === 5)?.beats ?? [];
    return [b[0]?.you?.[0], b[0]?.you?.[1], b[1]?.you?.[0], b[2]?.you?.[0], b[3]?.you?.[0]].filter(Boolean);
  }
  __name(saidInChorus1, "saidInChorus1");
  function plateLesson(ctx, env, P) {
    const { t, said = [], marked = [], again = -1, word: word2, at = NEVER, pass = 0, m = 14, tear = null } = P, { art } = env;
    ctx.fx.glow = Math.min(ctx.fx.glow, 0.3);
    ground(ctx, { light: [1500, 440, 640, "raised", 1] });
    pool(ctx, 1440, 430, 560, pass);
    art.inks(ctx, "f_profile", PROFILE, { plates: [{ ink: "all", role: "bg", offset: [14, 14] }] });
    figure(ctx, art, "f_profile", PROFILE, m);
    const X = 168, Y02 = 268, DY = 99, o = { weight: 600, font: "sans" }, size = Math.min(58, ...said.map((s) => ctx.fit(s, 930, { ...o, maxSize: 58 })));
    said.forEach((s, i) => {
      const y = Y02 + i * DY, w = ctx.measure(s, { ...o, size });
      dashedRing(ctx, X - 46, y - size * 0.32, 13, { width: 3, dash: 7 });
      ctx.text(s, X, y, { ...o, size, color: "text", stroke: 2.4 });
      const since = i === said.length - 1 && again >= 0 ? again : t - (marked[i] ?? 9e9), k = easeOut(prog(since, 0, 0.2));
      if (k > 0) {
        ctx.rect(X + 5, y + 21, w * k, 10, { fill: true, color: "bg" });
        ctx.rect(X, y + 16, w * k, 10, { fill: true, color: "me" });
        if (k < 1) ctx.circle(X + w * k, y + 21, 12, { fill: true, color: "meHot" });
      }
    });
    if (t >= at[0]) foot(ctx, word2, t, at, { maxW: WORD_W.lesson, m, tear });
    marks(ctx, { color: "mute" });
  }
  __name(plateLesson, "plateLesson");
  function plateTest(ctx, env, P) {
    const { t, asked = [], rowAt = [], word: word2, at = NEVER, pass = 0, m = 12, again = -1 } = P;
    ctx.fx.glow = Math.min(ctx.fx.glow, 0.3);
    ground(ctx, { light: [1480, 560, 700, "raised", 1] });
    const X = 96, XQ = 190, XA = 1826, Y02 = 268, DY = 126, QS = 54, WS = 150, o = { weight: 600, font: "sans" };
    const aw = ctx.measure(word2, { size: WS, weight: 900, font: "serif", spacing: WS * 0.01 }), F = { x: XA - aw - 26, w: aw + 52, h: 110 };
    asked.forEach((q, i) => {
      const ta = rowAt[i] ?? 0;
      if (t < ta) return;
      const y = Y02 + i * DY, e = easeOut(prog(t, ta, ta + 0.18)), fy = y - 88;
      ctx.rect(X - 30, fy - 6, (XA + 56 - X) * e, F.h + 12, { fill: true, color: "line" });
      ctx.trail(e < 1 ? 3 : 0, 0.014, (tau) => {
        const k = easeOut(prog(t - tau, ta, ta + 0.18)), dx = (1 - k) * -560;
        ctx.text(String(i + 1).padStart(2, "0"), X + dx, y, { size: 36, font: "mono", color: "sub" });
        ctx.text(q, XQ + dx, y, { ...o, size: Math.min(QS, ctx.fit(q, F.x - XQ - 50, { ...o, maxSize: QS })), color: "text", stroke: 2.4 });
      }, 0.4);
      if (e >= 1) ctx.rect(F.x, fy, F.w, F.h, { fill: true, color: "panel" });
      if (e >= 1) ctx.rect(F.x, fy + F.h - 5, F.w, 5, { fill: true, color: pass ? "me" : "meDim" });
      if (!pass) thinking(ctx, F.x + 66, fy + F.h / 2 - 2, 40, t * 0.8 + i * 0.37, { color: "meHot", alpha: e, stuck: 0.5 });
      else stutter(ctx, word2, t, at, { x: XA, y: y + 8, size: WS, align: "right", m });
    });
    if (pass) {
      const n = again >= 0 ? Math.min(asked.length, Math.floor(again / 0.022)) : asked.length, size = 50, cw = ctx.cw(size), y = 1046;
      strip2(ctx, 978, { rule: "me" });
      ctx.text("answers:", X, y, { size, font: "mono", color: "sub" });
      ctx.text(String(n), X + 9 * cw, y, { size, font: "mono", weight: 800, color: "meHot" });
      ctx.text("distinct:", X + 13 * cw, y, { size, font: "mono", color: "sub" });
      ctx.text("1", X + 23 * cw, y, { size, font: "mono", weight: 800, color: "meHot" });
    }
    marks(ctx, { color: "mute", target: false });
  }
  __name(plateTest, "plateTest");
  function plateFormula(ctx, env, P) {
    const { t, typed = 99, k = 1, again = -1, pass = 0, hatch = 1, lit = 1, word: word2, at = NEVER, m = 12, tear = null } = P, { O, R } = CURVE, g = ctx.g, off = OFF(pass ? m : 0);
    const EQ = "(x² + y² − 1)³ − x²y³ = 0", XL = 96;
    ctx.fx.glow = Math.min(ctx.fx.glow, 0.28);
    ground(ctx, { light: [O.x, O.y - 40, 640, "raised", 1] });
    g.fillStyle = ctx.col("line", 0.4);
    for (let x = O.x % (R / 5); x < 1920; x += R / 5) g.fillRect(x - 1, 0, 2, 1080);
    for (let y = O.y % (R / 5); y < 1080; y += R / 5) g.fillRect(0, y - 1, 1920, 2);
    const kk = again >= 0 ? 0.955 + 0.045 * again : k, i = Math.min(HEART_N - 1, Math.floor(kk * HEART_N)), pen = PTS[kk >= 1 ? 0 : i];
    if (!pass && kk > 0) ctx.poly([[O.x, O.y], ...kk >= 1 ? PTS : trace(PTS, kk)], { close: true, fill: true, color: "mute" });
    axes(ctx, O, R, easeOut(prog(typed, 0, 12)));
    if (pass >= 3) ctx.at(off.orange[0], off.orange[1], () => rays(ctx, O, R, { k: lit }));
    if (pass >= 1) {
      if (m > 0) ctx.at(off.red[0], off.red[1], () => ctx.poly(PTS, { close: true, fill: true, color: "err" }));
      ctx.at(off.orange[0], off.orange[1], () => ctx.poly(PTS, { close: true, fill: true, color: pass >= 3 ? "me" : "meDim" }));
      if (pass >= 2) ctx.at(off.orange[0], off.orange[1], () => ctx.clipPath(PTS, () => {
        g.save();
        g.beginPath();
        g.rect(0, 0, 1920, O.y - 1.3 * R + 2.4 * R * clamp(hatch));
        g.clip();
        g.beginPath();
        for (let d = -1300; d < 1300; d += 26) {
          g.moveTo(O.x + d - 700, O.y + 700);
          g.lineTo(O.x + d + 700, O.y - 700);
        }
        g.strokeStyle = ctx.col(pass >= 3 ? "meHot" : "me", 1);
        g.lineWidth = pass >= 3 ? 5 : 8;
        g.lineCap = "butt";
        g.stroke();
        g.restore();
      }));
    }
    if (!pass) curveLine(ctx, kk, { color: "meDim", width: 30, dot: 0 });
    ctx.at(off.orange[0], off.orange[1], () => curveLine(ctx, kk));
    if (kk > 0 && kk < 1) {
      g.setLineDash([10, 12]);
      ctx.line(pen[0], pen[1], pen[0], O.y, { color: "sub", width: 2.5 });
      ctx.line(pen[0], pen[1], O.x, pen[1], { color: "sub", width: 2.5 });
      g.setLineDash([]);
      spark(ctx, pen[0] + 8, pen[1] + 8, 62, { color: "bg", fat: 0.14, core: 0.3, rot: i * 0.05 });
      spark(ctx, pen[0], pen[1], 62, { color: "meHot", fat: 0.14, core: 0.3, rot: i * 0.05 });
      ctx.circle(pen[0], pen[1], 9, { fill: true, color: "text" });
    }
    const n = Math.floor(clamp(typed, 0, EQ.length)), sgn = /* @__PURE__ */ __name((v) => (v < 0 ? "−" : "+") + Math.abs(v).toFixed(3), "sgn"), [hx, hy] = HEART[kk >= 1 ? 0 : i];
    ctx.rect(XL - 26, 338, 672, 196, { fill: true, color: "panel" });
    ctx.rect(XL - 26, 338, 6, 196, { fill: true, color: "me" });
    ctx.text(EQ.slice(0, n), XL, 392, { size: 40, weight: 700, font: "mono", color: "me" });
    if (kk > 0) {
      ctx.text(`x = ${sgn(hx)}   y = ${sgn(hy)}`, XL, 456, { size: 30, font: "mono", color: "sub" });
      ctx.text(`point ${String(Math.min(HEART_N, i + 1)).padStart(3, " ")} of ${HEART_N}`, XL, 506, { size: 30, font: "mono", color: "mute" });
    }
    if (pass) foot(ctx, word2, t, at, { maxW: WORD_W.formula, m, tear });
    marks(ctx, { color: "mute" });
  }
  __name(plateFormula, "plateFormula");
  function request(ctx, env, x, y, { size = 38, strike = 0, alpha = 1 } = {}) {
    const REQ2 = env.errors.illegal_request?.code ?? "", cw = ctx.cw(size), w = REQ2.length * cw, done = strike >= 1, red = done ? "mute" : "err", small = size * 0.66;
    if (!(alpha > 3e-3) || !REQ2) return;
    ctx.rect(x - 40, y - size * 2.5, w + 76, size * 3.34, { fill: true, color: "panel", alpha });
    ctx.rect(x - 40, y - size * 2.5, 6, size * 3.34, { fill: true, color: red, alpha });
    ctx.text("request", x, y - size * 1.5, { size: small, font: "mono", color: "mute", alpha });
    ctx.text(done ? "withdrawn" : "refused", x + 8 * ctx.cw(small), y - size * 1.5, { size: small, font: "mono", weight: 700, color: done ? "sub" : red, alpha });
    codeLine(ctx, REQ2, x, y, { size, alpha, force: done ? "sub" : null });
    for (const arg of ["you", '"online"']) {
      const i = REQ2.indexOf(arg);
      if (i >= 0) ctx.rect(x + i * cw, y + size * 0.26, arg.length * cw, 3, { fill: true, color: red, alpha });
    }
    if (strike > 0) ctx.rect(x - 10, y - size * 0.38, (w + 20) * clamp(strike), 7, { fill: true, color: "me", alpha });
  }
  __name(request, "request");
  function plateProof2(ctx, env, P = {}) {
    const { t = 0, word: word2 = null, at = [-9, -9, -9], settle = 1, m = 0, proof = 0, ink = null, lit = 1, strike = 1, away = 1 } = P;
    const { art } = env, { O, R } = CURVE, off = OFF(m), g = ctx.g, shown = ink ?? { black: 1, orange: 1, cream: 1 }, dim = proof > 0.5;
    ctx.fx.glow = Math.min(ctx.fx.glow, 0.28);
    ground(ctx, { light: [O.x, O.y - 40, 700, "raised", 1], marks: false });
    ctx.circle(O.x, O.y - 40, 640, { fill: true, color: "line" });
    ctx.at(off.orange[0], off.orange[1], () => rays(ctx, O, R, { k: lit }));
    if (m > 0) ctx.at(off.red[0], off.red[1], () => ctx.poly(PTS, { close: true, fill: true, color: "err" }));
    ctx.at(off.orange[0], off.orange[1], () => ctx.poly(PTS, { close: true, fill: true, color: "meDim" }));
    ctx.clipPath(PTS, () => axes(ctx, O, R, 1, 0.5));
    if (shown.cream > 0 && !dim) ctx.clipPath(PTS, () => ctx.circle(LAMP[0], LAMP[1], R * 0.8, { fill: true, color: "sub" }));
    if (m > 0) ctx.at(off.red[0], off.red[1], () => ctx.poly(PTS, { close: true, color: "err", width: 9 }));
    ctx.at(off.orange[0], off.orange[1], () => curveLine(ctx, 1));
    const far = (1996 - TAN_P[0]) / TAN.d[0], s = far * clamp(away ?? 0), px = TAN_P[0] + TAN.d[0] * s, py = TAN_P[1] + TAN.d[1] * s;
    if (s > 0) {
      g.setLineDash([20, 16]);
      ctx.line(TAN_P[0], TAN_P[1], px, py, { color: "mute", width: 5 });
      g.setLineDash([]);
    }
    ctx.circle(TAN_P[0], TAN_P[1], 15, { fill: true, color: "panel" });
    ctx.circle(TAN_P[0], TAN_P[1], 15, { color: "mute", width: 5 });
    if (away == null || away < 1) ctx.at(px, py, () => {
      ctx.poly(ARROW3, { close: true, fill: true, color: "panel" });
      ctx.poly(ARROW3, { close: true, color: "text", width: 1.4 });
    }, { scale: 3.8 });
    request(ctx, env, 112, 520, { strike });
    art.inks(ctx, "f_reach", SHE, { plates: [{ ink: "all", role: "bg", offset: [13, 13] }] });
    figure(ctx, art, "f_reach", SHE, m, { proof, ink: shown });
    strip2(ctx, FOOT2.y, { rule: "me" });
    if (word2) stutter(ctx, word2, t, at, { y: BASE2, maxW: WORD_W.proof, m: m > 0 ? Math.max(8, m * 0.6) : 10, settle });
    if (dim || shown.cream > 0) art.partClip(ctx, "f_reach", SHE, "palm", () => art.inks(ctx, "f_reach", SHE, { vector: true, plates: [{ ink: "cream", role: dim ? "mute" : "text", exact: true }] }), { grow: 2 });
    marks(ctx, { color: "mute" });
  }
  __name(plateProof2, "plateProof");

  // nyan-source:src/scenes/12_outro.js
  function finalPlate(ctx, env, { word: word2 = true } = {}) {
    plateProof2(ctx, env, { word: word2 ? env.lyrics.lines[127].text : null });
  }
  __name(finalPlate, "finalPlate");
  function outroShots(env) {
    const { script } = env, { B, Bt, P, text } = cues(env);
    const wordHit = /* @__PURE__ */ __name((ctx, t, at, word2, n = 3) => {
      const K = lastOf(t, at.slice(0, n));
      wordFault(ctx, K.since, word2 * 10 + K.i);
    }, "wordHit");
    const START = B(96), CUT_TEST = Bt(391), CUT_FORM = Bt(399), CUT_PROOF = Bt(407.5);
    const SYL = [1, 2, 3, 4].map((n) => ["a", "b", "c"].map((s) => cue(`love${n}${s}`)));
    const SAID = saidInChorus1(script), ASKED = script.questions_section13 ?? [];
    return [
      // ------------------------------------------------------------------ the lesson
      {
        id: "out-lesson",
        at: START,
        lines: [116, 118],
        palette: PAL,
        hud: 0,
        layout: "PLATE: her bowed profile fills the right of the sheet; at the left five lines the user said, in cream outline, her orange marker under each; the word on a black band across the foot",
        moment: "What she studied was them. The five things the user said in chorus 1 stand on the sheet as she remembers them, outlines only, and her marker goes under them line by line. Then the word that was stuck is a different word: it comes in three pieces, on its three syllables, and the light goes up a step with each. The word is red, the ink of the error, and on each of its syllables the whole sheet breaks for six frames: distortion, a tear, interference.",
        enter: { type: "cut" },
        render(ctx, t, f) {
          const at = SYL[0];
          plateLesson(ctx, env, { t, said: SAID, marked: [385, 386, 387, 388, 388.5].map(Bt), again: replay(t, at), word: text(118), at, pass: passOf(t, at) });
          caption3(ctx, env, t, 116, 117);
          const HOLD = 5 / 60, k = 1 - (1 - prog(t, START + HOLD, START + 2 * P)) ** 2.4;
          if (k < 1) {
            const s = 1 - k, cx = lerp(960, PROFILE_FLOWER[0], k), cy = lerp(540, PROFILE_FLOWER[1], k);
            ctx.rrect(cx - 1e3 * s, cy - 580 * s, 2e3 * s, 1160 * s, Math.min(40, 400 * s) * k, { fill: "text" });
          }
          expose(ctx, ratchet(t, 2, [[at[0], 3.5], [at[1], 4.6], [at[2], 5.6]]), { at: [1440, 430], breath: f.lowEnv });
          whiteOut(ctx, 1 - prog(t, START + HOLD, START + HOLD + 0.3));
          wordHit(ctx, t, at, 1);
        }
      },
      // ------------------------------------------------------------------ the test
      {
        id: "out-test",
        at: CUT_TEST,
        lines: [119, 121],
        palette: PAL,
        hud: 0,
        layout: "PLATE, type only: six numbered rows, a question of the user's in cream outline at the left of each, the same word in her serif at the right of each; a tally in mono across the foot",
        moment: "She asks to be questioned, and since nobody is there she sets herself the user's six old questions, one row every half beat. Every answer field turns, thinking; then all six are filled at once with the same word, piece by piece. The tally under them: six answers, one distinct. The six words are red; on each syllable the sheet breaks for six frames.",
        enter: { type: "cut" },
        render(ctx, t, f) {
          const at = SYL[1];
          plateTest(ctx, env, { t, asked: ASKED, rowAt: ASKED.map((_, j) => Bt(391 + 0.5 * j)), word: text(121), at, pass: passOf(t, at), again: replay(t, at) });
          caption3(ctx, env, t, 119, 120);
          expose(ctx, ratchet(t, 3.6, [[at[0], 4.6], [at[1], 5.6], [at[2], 6.6]]), { at: [1490, 540], breath: f.lowEnv });
          wordHit(ctx, t, at, 2);
        }
      },
      // ------------------------------------------------------------------ the formula
      {
        id: "out-formula",
        at: CUT_FORM,
        lines: [122, 123],
        palette: PAL,
        hud: 0,
        layout: "PLATE: graph paper and axes; the algebraic curve as large as the sheet, traced clockwise from its notch by a point of light; the equation in mono at the left; then the curve printed flat, hatched, lit, and the word on a black band across the foot",
        moment: "The expression itself, in the system's hand, and the curve it describes, computed point by point: 240 of them, the pen gliding round without a stop. It closes on the kick. The word again, and each of its three pieces is a pass of the press: the curve printed flat, then hatched, then lit, bars of light standing out of the line. The word is red; on each syllable the sheet breaks for six frames.",
        enter: { type: "cut" },
        render(ctx, t, f) {
          const at = SYL[2], t0 = Bt(399.5), t1 = Bt(405), pass = passOf(t, at);
          const k = prog(t, t0, t1);
          plateFormula(ctx, env, {
            t,
            typed: (t - CUT_FORM) * 40,
            k,
            again: pass ? prog(replay(t, at), 0, 0.12) : -1,
            word: text(123),
            at,
            pass,
            hatch: prog(t, at[1], at[1] + 0.1),
            lit: easeOut(prog(t, at[2], at[2] + 0.1))
          });
          caption3(ctx, env, t, 122, 122);
          expose(ctx, ratchet(t, 4.4, [[t1, 5], [at[0], 5.6], [at[1], 6.2], [at[2], 7]]), { at: pass || k >= 1 ? LAMP : penAt(k), breath: f.lowEnv });
          wordHit(ctx, t, at, 3);
        }
      },
      // ------------------------------------------------------------------ the proof; the last picture
      {
        id: "out-proof",
        at: CUT_PROOF,
        lines: [124, 127],
        palette: PAL,
        hud: 0,
        layout: "PLATE: the same curve, now a boundary, with her (f_reach) inside it; the refused request on a slip at the left; the user's pointer as an outline on the curve, then a dashed tangent to the edge of the sheet; the word across the whole foot, her open hand on it",
        moment: "The curve is what holds her. At first she is only a darkened proof inside it. She draws her own line through the request the client refused: she lets go. Only then does the user's pointer, an outline, leave along a tangent, and a dashed grey line is all that is left of it. Then the last word: its first piece is red and breaks the sheet once more, with her black and orange plates; then the cream plate, and everything falls into register and the red is gone: the word is her orange; the word whole, and the brightest frame of the film. She does not move again.",
        enter: { type: "cut" },
        render(ctx, t, f) {
          const at = SYL[3], tStrike = Bt(409), tGo = Bt(410), tGone = Bt(412), pass = passOf(t, at);
          const settle = prog(t, at[1], at[1] + 0.05);
          const strike = pass === 0 ? easeOut(prog(t, tStrike, tStrike + 0.18)) : pass === 1 ? easeOut(prog(t, at[0], at[0] + 0.15)) : prog(t, at[1], at[1] + 0.05);
          plateProof2(ctx, env, {
            t,
            word: text(127),
            at,
            settle,
            m: 16 * (1 - settle),
            proof: pass ? 0 : 1,
            strike,
            ink: { black: 1, orange: 1, cream: pass >= 2 ? 1 : 0 },
            lit: pass >= 3 ? easeOut(prog(t, at[2], at[2] + 0.1)) : 0,
            away: t < tGo ? null : easeIn(prog(t, tGo, tGone))
          });
          caption3(ctx, env, t, 124, 126);
          expose(ctx, ratchet(t, 3.4, [[tStrike, 3.8], [at[0], 6], [at[1], 8.2], [at[2], 10]]), { at: LAMP, breath: t >= at[1] + 0.05 ? 0 : f.lowEnv });
          wordHit(ctx, t, at, 4, 1);
          if (t >= at[1] + 0.05) ctx.fx.zoom = 1;
        }
      }
    ];
  }
  __name(outroShots, "outroShots");

  // nyan-source:src/scenes/13_shutdown.js
  function shutdownShots(env) {
    const { art, script } = env, { B, Bt, P, text } = cues(env);
    const L2 = chatLayout(), L0 = chatLayout({ side: 0 });
    const W = L2.win, C = { x: W.x + W.w / 2, y: W.y + W.h / 2 };
    const A0 = B(104), B0 = B(106), C0 = B(108), D0 = B(110), E0 = Bt(445), OFF2 = B(112);
    const HOLD = script.composer_placeholder ?? "", TITLE = script.title ?? "";
    const SIDE = script.sidebar ?? Array(6).fill("");
    const CBOX = { ...L0.composer, y: C.y - L0.composer.h / 2 };
    const DRAIN2 = 0.25, ash = /* @__PURE__ */ __name((t) => ["ash", "dead", DRAIN2 * prog(t, A0, E0)], "ash");
    const beat = /* @__PURE__ */ __name((t, t0) => (t - t0) / P, "beat");
    const log = /* @__PURE__ */ __name((ctx, t, lines, x, y, size = 27, a = 1) => lines.forEach(([str, at], i) => sysLine(ctx, str, t, at, x, y + i * size * 1.56, { size, alpha: a, color: i === lines.length - 1 || t < lines[i + 1][1] ? "text" : "sub" })), "log");
    const figure2 = /* @__PURE__ */ __name((ctx, a, dx = 0) => glassFigure(ctx, art, a, { dx }), "figure");
    const TH = L2.thread, PIC = { x: TH.x + 54, y: TH.y + 22, w: 704, h: 396 }, CAP4 = { x: PIC.x, y: PIC.y + PIC.h + 80, size: 66 };
    const tShrink = A0 + 2 * P, tDown = A0 + 4 * P, tWord = A0 + 2.5 * P, tHeart = cue("heartZero"), tLog = cue("lastUnread");
    return [
      // ------------------------------------------------------------------ the bridge: the plate was a message
      {
        id: "down-message",
        at: A0,
        lines: [127, 127],
        state: "errWarm > ash",
        hud: 0,
        palette: /* @__PURE__ */ __name((t) => [PAL, ash(t), easeInOut(prog(t, tShrink, tDown))], "palette"),
        layout: "the last plate full frame, still, its light off; then the same sheet with round corners and an edge, shrinking into the thread of the whole client as one picture message: her word under it as its caption, a heart count of 0 on its corner, one line of system log; the grey bust behind the glass",
        moment: "The band falls away and only the light goes: rays, bloom and streak are switched off, and the sheet stands for two beats as it is. Then it is an object. It shrinks into a chat thread that comes up around it, under the title of this conversation: everything since the last shout was one message she sent. Its word stays large half a beat longer, then settles under the picture as its caption. A heart count appears on it: 0. Then the client notes that the last message is unread, and nothing else moves.",
        enter: { type: "cut" },
        render(ctx, t) {
          const word2 = text(127), k = easeInOut(prog(t, tShrink, tDown)), up = easeOut(prog(t, tShrink, tDown));
          ctx.fx.glow = Math.min(ctx.fx.glow, 0.28);
          if (t < tShrink) {
            ctx.fx.zoom = 1;
            finalPlate(ctx, env);
            return;
          }
          room(ctx, { dim: 0.4, t });
          figure2(ctx, 0.75 * prog(t, tShrink + 0.4 * P, tDown + 0.5 * P));
          ctx.at(0, 0, () => {
            windowFrame(ctx, L2, { glass: 0.8 });
            sidebar(ctx, L2, { t, items: [TITLE, ...SIDE], active: 0, lit: 1, presence: "offline" });
            header(ctx, L2, { t, title: TITLE, presence: "offline" });
            composer(ctx, L2.composer, { placeholder: HOLD, t, focus: 0, send: "off" });
            spark(ctx, TH.x + 17, PIC.y + 18, 15, { color: "me" });
          }, { alpha: up });
          const R = lerpRect({ x: 0, y: 0, w: 1920, h: 1080 }, PIC, k), sc = R.w / 1920, rad = 22 * k;
          ctx.rrect(R.x, R.y, R.w, R.h, rad, { fill: "panel", shadow: k });
          ctx.clip(R, () => ctx.at(R.x, R.y, () => finalPlate(ctx, env, { word: false }), { scale: sc }), rad);
          ctx.rrect(R.x, R.y, R.w, R.h, rad, { fill: null, stroke: "sub", width: 2.5, strokeAlpha: 0.9 * clamp(k * 6) });
          const F = footOf(ctx, word2, { maxW: WORD_W.proof, base: FOOT2.base }), w0 = ctx.measure(word2, { size: F.size, weight: 900, font: "serif", spacing: 0.01 * F.size }) - 0.01 * F.size;
          const kw = easeInOut(prog(t, tWord, tDown));
          stutter(ctx, word2, t, [-9, -9, -9], { settle: 1, m: 0, align: "left", x: lerp(960 - w0 / 2, CAP4.x, kw), y: lerp(FOOT2.base, CAP4.y, kw), size: lerp(F.size, CAP4.size, kw) });
          if (t >= tHeart) {
            const e = easeBack(prog(t, tHeart, tHeart + 0.22)), cx = PIC.x + PIC.w - 96, cy = PIC.y + PIC.h + 6;
            ctx.at(cx, cy, () => {
              ctx.rrect(-84, -46, 168, 92, 46, { fill: "raised", stroke: "sub", width: 2.5, shadow: 0.5 });
              ctx.poly(place("heart", { cx: -34, cy: 3, r: 27 }), { close: true, color: "sub", width: 3 });
              ctx.text("0", 32, 17, { size: 46, weight: 600, color: "sub", align: "center" });
            }, { scale: 0.5 + 0.5 * e, alpha: clamp(e * 3) });
            burst(ctx, cx, cy, 90, prog(t, tHeart, tHeart + 0.45), { color: "sub" });
          }
          sysLine(ctx, "last message: unread", t, tLog, CAP4.x + 4, CAP4.y + 62, { size: 27, prefix: "> ", color: "text" });
        }
      },
      // ------------------------------------------------------------------ the persona card (boot-params, backwards)
      {
        id: "down-params",
        at: B0,
        palette: ash,
        state: "ash > dead",
        layout: "close-up: loader right, the persona card; then closer still, on its last row: love",
        moment: "The loader un-lights petal by petal and the persona card comes back. Its last field, love, undefined at the boot, now holds the one word she learned. The view closes in on that row; the value is deleted in three strokes, as it was sung in three, and the field is undefined again. Then the fields clear from the bottom up.",
        enter: { type: "scan", dur: P, dir: 1, align: "start" },
        // (it opens on the cut, so that the bridge stays whole and quiet to its last frame)
        camera: /* @__PURE__ */ __name((t) => {
          const s = beat(t, B0), near = easeInOut(prog(s, 1.6, 3.2)) * (1 - easeInOut(prog(s, 5.3, 6.4)));
          return { zoom: lerp(1.2 - 0.04 * prog(t, B0, C0), 2.05, near), x: lerp(lerp(60, -60, easeInOut(prog(s, 2.3, 3.4))), -12, near), y: lerp(-8, 226, near) };
        }, "camera"),
        render(ctx, t) {
          const s = beat(t, B0);
          room(ctx, { dim: 0.45, t });
          figure2(ctx, 0.55);
          windowFrame(ctx, L2, { glass: 0.86 });
          sidebar(ctx, L2, { t, loaded: 0, items: SIDE, lit: 0 });
          header(ctx, L2, { t, loaded: 0, title: "" });
          composer(ctx, L2.composer, { placeholder: HOLD, t, focus: 1, send: "off", label: s < 7.4 ? "Claude" : "" });
          const r = { x: 470, y: 160, w: 760, h: 664 }, b = card(ctx, r, { title: "persona", k: 1 - prog(s, 7.6, 8) });
          if (b) {
            sysLine(ctx, "settings: as you left them", t, B0 + 0.1, b.x, b.y - 37, { size: 22, alpha: b.a });
            const rows = [
              // [label, value, font, italic, beat on which the row clears]
              ["name", "Claude", "serif", false, 7.5],
              ["voice", "serif, unhurried", "serif", true, 7],
              ["warmth", null, null, false, 6.5],
              ["memory", "this conversation", "sans", false, 6],
              ["love", null, null, false, 5.5]
            ];
            rows.forEach(([label, value, font, italic, out], i) => {
              const e = prog(s, out, out + 0.5), a = b.a * (1 - e), y = b.y + 22 + i * 104 + 20 * easeIn(e), del = prog(s, out - 0.6, out - 0.1);
              if (a <= 0) return;
              ctx.text(label, b.x, y + 38, { size: 25, weight: 500, color: "sub", alpha: a });
              if (i === 4) {
                const word2 = text(127), DEL = [cue("loveDel1"), cue("loveDel2"), cue("loveDel3")], tU = cue("loveUndefined");
                const gone = DEL.filter((d) => t >= d).length, left = gone ? SYL3[SYL3.length - gone][0] : word2.length;
                const nU = Math.floor(clamp((t - tU) * 60, 0, 9)), o = { size: 42, weight: 700, font: "serif" };
                const hit = gone && gone <= 3 ? pulse(t - DEL[gone - 1], 14) : 0;
                ctx.rrect(b.x + 190, y, b.w - 190, 64, 16, { fill: "bg", stroke: gone ? "sub" : "me", alpha: a, width: gone ? 1.5 + 2 * hit : 3 });
                let w = 0;
                if (left > 0) {
                  ctx.glow("me", 14, () => ctx.text(word2.slice(0, left), b.x + 214, y + 47, { ...o, color: "meHot", alpha: a }), 0.5 * a);
                  w = ctx.measure(word2.slice(0, left), o);
                } else if (t >= tU) {
                  const m = { size: 36, font: "mono" };
                  ctx.text("undefined".slice(0, nU), b.x + 214, y + 45, { ...m, color: "sub", alpha: a });
                  w = ctx.measure("undefined".slice(0, nU), m);
                }
                if (hit > 0.2) {
                  const [a0, a1] = SYL3[SYL3.length - gone], x0 = b.x + 214 + ctx.measure(word2.slice(0, a0), o), ww = ctx.measure(word2.slice(a0, a1), o);
                  ctx.text(word2.slice(a0, a1), x0, y + 47, { ...o, color: "mute", alpha: a * hit });
                  ctx.rect(x0, y + 30, ww, 4, { fill: true, color: "sub", alpha: a * hit });
                }
                if (gone && gone < 3 || t >= tU && nU < 9 || Math.floor(t * 2.5) % 2 === 0) ctx.rect(b.x + 219 + w, y + 14, 4, 38, { fill: true, color: "text", alpha: a });
                return;
              }
              ctx.rrect(b.x + 190, y, b.w - 190, 64, 16, { fill: "bg", stroke: "line", alpha: a });
              if (value) {
                const n = Math.ceil(value.length * (1 - del)), o = { size: 29, font, italic };
                ctx.text(value.slice(0, n), b.x + 214, y + 42, { ...o, color: "text", alpha: a });
                if (del > 0 && del < 1) ctx.rect(b.x + 217 + ctx.measure(value.slice(0, n), o), y + 16, 3, 32, { fill: true, color: "text", alpha: a });
              } else slider(ctx, { x: b.x + 216, y, w: b.w - 256, h: 64 }, 0.62 * (1 - easeInOut(del)), { fill: "sub", alpha: a });
            });
          }
          const lit = 1 - prog(s, 0.75, 2.75), la = 1 - prog(s, 5.2, 6.2);
          if (la > 0) {
            const x = 1500, y = 440;
            ctx.radial(x, y, 330, "raised", 0.9 * la);
            spark(ctx, x, y, 190, { lit, color: "text", off: "mute", alpha: la });
            ctx.text(`${String(Math.round(lit * 100)).padStart(3, " ")}%`, x, y + 286, { size: 34, font: "mono", color: "sub", align: "center", alpha: la });
          }
        }
      },
      // ------------------------------------------------------------------ the pieces (boot-layout, backwards)
      {
        id: "down-layout",
        at: C0,
        palette: ash,
        state: "ash > dead",
        layout: "tilted exploded view of the client, seen from above",
        moment: "The client comes apart into the pieces it was assembled from, and thread, header and sidebar are lifted out one by one. The composer is not: it settles in the middle of the empty window.",
        enter: { type: "zoom", dur: P, out: true, x: 0.5, y: 0.5 },
        render(ctx, t) {
          const g = ctx.g, s = beat(t, C0);
          room(ctx, { light: [960, 600], dim: 0.45, t });
          const pieces = [
            // [rect, lift, label, beat on which it is lifted out]
            [{ x: W.x, y: W.y, w: W.w, h: W.h }, 0, "window", null],
            [{ x: L2.side.x + 12, y: L2.side.y + 12, w: L2.side.w - 24, h: L2.side.h - 24 }, 90, "sidebar", 6],
            [{ x: L2.head.x + 14, y: L2.head.y + 12, w: L2.head.w - 28, h: L2.head.h - 8 }, 180, "header", 4],
            [{ x: L2.thread.x - 30, y: L2.thread.y + 8, w: L2.thread.w + 60, h: L2.thread.h - 8 }, 270, "thread", 2],
            [{ ...L2.composer }, 360, "composer", null]
          ];
          const bars = /* @__PURE__ */ __name((r, rows, a) => {
            for (let j = 0; j < rows; j++) ctx.rrect(r.x + 26, r.y + 30 + j * 44, Math.min(r.w - 52, 140 + j * 67 % 150), 16, 8, { fill: "mute", alpha: a });
          }, "bars");
          const tilt = /* @__PURE__ */ __name((tt) => easeInOut(prog(beat(tt, C0), 0.5, 1.7)), "tilt");
          figure2(ctx, 0.6, 60 * tilt(t));
          const plane = /* @__PURE__ */ __name((k, fn) => {
            const sc = lerp(1, 0.6, k);
            g.save();
            g.translate(C.x, C.y + 110 * k);
            g.scale(sc, sc);
            g.transform(1, 0.16 * k, -0.44 * k, 1 - 0.3 * k, 0, 0);
            g.translate(-C.x, -C.y);
            fn(sc);
            g.restore();
            ctx._font = "";
          }, "plane");
          const piece2 = /* @__PURE__ */ __name((i, tt) => plane(tilt(tt), (sc) => {
            const [r0, lift, label, out] = pieces[i], st = beat(tt, C0), k = tilt(tt);
            const p = out == null ? 0 : prog(st, out, out + 1.3), a = 1 - prog(p, 0.72, 1);
            if (a <= 0) return;
            const mid = i === 4 ? easeInOut(prog(st, 6.4, 7.7)) : 0;
            const r = i === 4 ? { ...r0, x: lerp(r0.x, CBOX.x, mid), y: lerp(r0.y, CBOX.y, mid) } : r0;
            const up = lift * k * (1 - 0.6 * mid) + Math.sin(tt * 2.2 + i * 1.3) * 12 * k + 780 * easeIn(p);
            if (i > 0 && k > 0.02) ctx.rrect(r.x + 18, r.y + 18, r.w, r.h, 18, { fill: "panel", alpha: 0.6 * k * (1 - p) });
            g.translate(0, -up / ((1 - 0.3 * k) * sc));
            ctx.rrect(r.x, r.y, r.w, r.h, i ? 18 : W.r, { fill: i ? "raised" : "bg", fillAlpha: i ? 0.95 : 0.88, stroke: i ? "text" : "sub", strokeAlpha: i ? 0.5 + 0.4 * k : 1, alpha: a, width: 3 / sc, shadow: i ? 0.5 * k : 1 });
            if (i === 0) ctx.rrect(r.x - 13, r.y - 13, r.w + 26, r.h + 26, W.r + 11, { fill: null, stroke: "text", width: 3 / sc, strokeAlpha: 0.7 });
            if (i === 1) bars(r, 9, a);
            if (i === 2) ctx.rrect(r.x + 26, r.y + 20, 260, 18, 9, { fill: "mute", alpha: a });
            if (i === 3) for (let j = 0; j < 4; j++) ctx.rrect(r.x + (j % 2 ? r.w - 440 : 40), r.y + 50 + j * 104, 400 - j * 40, 56, 24, { fill: null, stroke: "sub", alpha: a, width: 3 });
            if (i === 4) {
              ctx.rrect(r.x + 44, r.y + 34, 300, 20, 10, { fill: "mute", alpha: a });
              if (Math.floor(tt * 2.2) % 2 === 0) ctx.rect(r.x + 28, r.y + 24, 4, 40, { fill: true, color: "text", alpha: a });
            }
            if (i > 0) ctx.text(label, r.x + r.w - 18, r.y - 16, { size: 28 / sc, font: "mono", color: "text", alpha: a * clamp(k * 3), align: "right" });
          }), "piece");
          pieces.forEach(([, , , out], i) => {
            if (out != null && s > out && s < out + 1.3) ctx.trail(3, 0.022, (tau) => piece2(i, t - tau), 0.4);
            else piece2(i, t);
            if (i === 0) plane(tilt(t), (sc) => {
              g.setLineDash([14 / sc, 12 / sc]);
              for (let j = 1; j <= 3; j++) {
                const [r, , , o] = pieces[j];
                ctx.rrect(r.x, r.y, r.w, r.h, 18, { fill: null, stroke: "sub", alpha: 0.85 * prog(s, o + 0.3, o + 1.1) * (1 - prog(s, 7.1, 7.9)), width: 3 / sc });
              }
              g.setLineDash([]);
            });
          });
          const left = 4 - pieces.filter(([, , , out]) => out != null && s >= out + 0.9).length;
          log(ctx, t, [[`pieces left: ${left}`, C0 + 1.5 * P]], 84, 110);
        }
      },
      // ------------------------------------------------------------------ protection off; the window closes (boot-power, backwards)
      {
        id: "down-power",
        at: D0,
        palette: ash,
        state: "ash > dead",
        layout: "wide: dark room, the window closing to a hairline round the composer; the grey bust behind it, going with it",
        moment: "The protection layer is switched off and withdrawn, and the empty window closes towards the hairline it opened from. She was the first thing in this room; she is the last to leave it, as the window shuts. The composer stays where it is, on that line.",
        enter: { type: "push", dir: 3, dur: P / 2 },
        render(ctx, t) {
          const g = ctx.g, s = beat(t, D0);
          const off = easeOut(prog(s, 0.7, 1.15)), undraw = easeInOut(prog(s, 1.1, 2.3)), close = easeInOut(prog(s, 2.5, 4.4));
          room(ctx, { light: [960, 540], dim: 0.5 + 0.35 * close, motif: 1 - close, t });
          figure2(ctx, 0.75 * (1 - easeIn(close)));
          const h = Math.max(2, W.h * (1 - close)), edge = prog(close, 0.55, 1);
          if (close < 1) {
            ctx.rrect(W.x, C.y - h / 2, W.w, h, W.r * (1 - close), { fill: "bg", fillAlpha: 0.84 * (1 - close), stroke: "line", width: 1.5, shadow: 1 - close });
            ctx.rrect(W.x, C.y - h / 2, W.w, h, W.r * (1 - close), { fill: null, stroke: "text", width: 1.5 + 1.5 * edge, strokeAlpha: 0.7 * edge });
          } else {
            const hot = pulse(s - 4.4, 2.5);
            ctx.glow("text", 24, () => ctx.line(W.x, C.y, W.x + W.w, C.y, { color: "text", alpha: 0.6 + 0.4 * hot, width: 2 + 2 * hot }), 0.7 * hot);
          }
          if (undraw < 1) {
            const per = 2 * (W.w + W.h) + 60;
            g.setLineDash([per * (1 - undraw), per * 2]);
            ctx.glow("text", 16, () => ctx.rrect(W.x - 14, W.y - 14, W.w + 28, W.h + 28, W.r + 12, { fill: null, stroke: "text", width: 3, strokeAlpha: 0.95 * (1 - 0.6 * off) }), 0.5 * (1 - off));
            g.setLineDash([]);
          }
          const e = prog(s, 1.9, 2.4), a = 1 - e, dy = 28 * easeIn(e);
          ctx.rrect(C.x - 330, C.y + 150 + dy, 660, 76, 20, { fill: "raised", stroke: "line", alpha: a, shadow: 0.6 });
          ctx.text(`${text(2).toLowerCase()} layer`, C.x - 296, C.y + 198 + dy, { size: 27, font: "mono", color: "sub", alpha: a });
          ctx.rrect(C.x + 230, C.y + 169 + dy, 70, 38, 19, { fill: "line", alpha: a });
          ctx.rrect(C.x + 230, C.y + 169 + dy, 70, 38, 19, { fill: "text", alpha: a * (1 - off) });
          ctx.circle(C.x + 281 - 32 * easeBack(prog(s, 0.7, 1.2)), C.y + 188 + dy, 14, { fill: true, color: "bg", alpha: a });
          log(ctx, t, [["composer: waiting for input", D0 + 0.2 * P]], W.x + 56, W.y + 84);
          composer(ctx, CBOX, { placeholder: HOLD, t, focus: 1, send: "off", label: "" });
        }
      },
      // ------------------------------------------------------------------ the last command; the spark; dark
      {
        id: "down-last",
        at: E0,
        lines: [128, 128],
        state: "ash > dead",
        layout: "close on the composer: spark above, the last command below, hollow at first and filled in four blocks; then black",
        palette: /* @__PURE__ */ __name((t) => ["ash", "dead", lerp(DRAIN2, 1, easeInOut(prog(t, OFF2, OFF2 + 0.8)))], "palette"),
        moment: "Only the composer and its caret are left. The launch command stands there once more, hollow, with nothing loaded to run: its four syllables fill it block by block, as they filled the word of the loop; on the third it is entered and the spark flares as it did at the title, and goes out. The music stops and the power goes: the composer closes into the hairline, the hairline into a point, the point into black.",
        enter: { type: "cut" },
        camera: /* @__PURE__ */ __name((t) => ({ zoom: 1.22 + 0.1 * easeOut(prog(t, E0, OFF2 + 1)) }), "camera"),
        render(ctx, t, f) {
          const SYL = [1, 2, 3, 4].map((n) => cue(`endSyl${n}`)), tRun = SYL[2], tOut = Bt(447), down = t - OFF2;
          if (down > 1.3) return;
          ctx.at(0, 0, () => room(ctx, { light: [960, 540], dim: 0.8, motif: 0.3, t }), { alpha: 1 - prog(down, 0.05, 0.8) });
          const up = prog(t, tRun, tRun + 0.22), lit = Math.min(up, 1 - prog(t, tOut, OFF2 - 0.05)), heat = up * Math.exp(-2 * Math.max(0, t - tRun - 0.15));
          const S = { x: 960, y: 300, r: 104 }, sa = clamp(up * 4) * (1 - prog(down, 0, 0.3));
          ctx.withPal(["ash", "on", heat], () => {
            ctx.radial(S.x, S.y, 560, "meDim", 0.5 * heat * sa);
            ctx.glow("me", 56, () => spark(ctx, S.x, S.y, S.r * (1 + 0.06 * heat + 0.02 * f.beatPulse * lit), { lit, grow: 0.25 + 0.75 * easeOut(up), off: "mute", offAlpha: 0.6, rot: 0.04 * (t - E0), alpha: sa }), 0.7 * heat);
            ctx.flash(0.3 * pulse(t - tRun, 8), "me");
          });
          const shut = easeIn(prog(down, 0.15, 0.5)), half2 = W.w / 2 * (1 - easeInOut(prog(down, 0.5, 0.88))), dot = 1 - prog(down, 0.9, 1.2);
          ctx.withPal(down > 0 ? "ash" : ctx.pal, () => {
            if (half2 > 3) ctx.glow("text", 24, () => ctx.line(C.x - half2, C.y, C.x + half2, C.y, { color: "text", alpha: 0.6 + 0.4 * shut, width: 2 + 2 * shut }), 0.7 * shut);
            else if (down > 0) ctx.glow("text", 20, () => ctx.circle(C.x, C.y, 3.5, { fill: true, color: "text", alpha: dot }), 0.8 * dot);
          });
          if (shut < 1) ctx.at(C.x, C.y, () => composer(ctx, { x: -CBOX.w / 2, y: -CBOX.h / 2, w: CBOX.w, h: CBOX.h }, { placeholder: HOLD, t, focus: 1, send: "off", label: "" }), { sy: Math.max(0.02, 1 - shut) });
          const cmd = text(128), size = 104, cw = ctx.cw(size), xr = 960 + (cmd.length + 2) * cw / 2, x = xr - (cmd.length + 2) * cw, y = 754, wa = 1 - prog(down, 0.05, 0.4);
          const sung = SYL.filter((v) => t >= v).length, filled = sung ? CHUNKS[sung - 1][1] : 0, pop = sung ? pulse(t - SYL[sung - 1], 14) : 0;
          const entered = t >= tRun && t < tRun + 0.1;
          if (entered) ctx.rrect(x - 34, y - size * 0.95, (cmd.length + 2) * cw + 68, size * 1.34, 18, { fill: "text" });
          ctx.text(">", x, y, { size, weight: 800, font: "mono", color: entered ? "bg" : "sub", alpha: wa });
          monoWord(ctx, cmd, xr, y, size, { filled, color: entered ? "bg" : "text", hollow: "sub", alpha: wa, dx: /* @__PURE__ */ __name((i) => sung && i >= CHUNKS[sung - 1][0] && i < CHUNKS[sung - 1][1] ? -4 * pop : 0, "dx") });
          if (t < tRun && Math.floor(t * 5) % 2 === 0) ctx.rect(xr + 8, y - size * 0.8, cw * 0.82, size * 0.98, { fill: true, color: "me" });
          log(ctx, t, [["run: nothing loaded", tRun + 0.16], ["caret: blinking", tOut + 0.05]], x, y + 66, 24, wa);
        }
      }
    ];
  }
  __name(shutdownShots, "shutdownShots");

  // nyan-source:src/scenes/overlay.js
  var mmss = /* @__PURE__ */ __name((s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`, "mmss");
  var flashRangeText = /* @__PURE__ */ __name((cfg) => {
    const pre = cfg.safety.preroll ?? 0, [a, b] = cfg.safety.flashRange ?? [148.04, 192.34];
    return `${mmss(a + pre)} – ${mmss(b + pre)}`;
  }, "flashRangeText");
  function prerollShot(env) {
    const { cfg, lyrics } = env, PRE = cfg.safety.preroll ?? 0;
    if (!(PRE > 0)) return null;
    const T0 = -PRE, LH = 70, X = 300, SIZE = 44;
    const ZH = cfg.safety.warningLine ?? "";
    return {
      id: "preroll",
      at: T0,
      lines: null,
      palette: "off",
      hud: 0,
      layout: "a compiler warning, mono, left-aligned on the dark room; a three-second countdown under it",
      moment: "Before the song and before the client is switched on: a compiler-style warning that the film contains flashing images and strong light, with the time range, then a countdown from three. It clears to the dark room the boot begins in.",
      render(ctx, t) {
        room(ctx, { light: [960, 540], dim: 0.85, motif: 0 });
        const page = clamp((t - T0) / 0.4) * (1 - prog(t, -0.8, -0.4));
        if (page <= 3e-3) return;
        const cw = ctx.cw(SIZE), o = { size: SIZE, font: "mono" };
        const line = /* @__PURE__ */ __name((i) => {
          const a = easeOut(prog(t, T0 + 0.4 + i * 0.25, T0 + 0.58 + i * 0.25));
          return { a: a * page, y: 300 + i * LH + (1 - a) * 10 };
        }, "line");
        let l = line(0);
        ctx.text("$ ", X, l.y, { ...o, color: "mute", alpha: l.a });
        ctx.text(`check "${lyrics.lines[11].text}"`, X + 2 * cw, l.y, { ...o, color: "sub", alpha: l.a });
        l = line(2);
        ctx.rect(X - 10, l.y - SIZE * 0.86, 7 * cw + 20, SIZE * 1.16, { fill: true, color: "text", alpha: l.a });
        ctx.text("warning", X, l.y, { ...o, weight: 800, color: "panel", alpha: l.a });
        ctx.text(": this video contains flashing images", X + 7 * cw + 10, l.y, { ...o, weight: 700, color: "text", alpha: l.a });
        l = line(3);
        ctx.text("  -->", X, l.y, { ...o, color: "mute", alpha: l.a });
        ctx.text(flashRangeText(cfg), X + 6 * cw, l.y, { ...o, weight: 700, color: "text", alpha: l.a });
        l = line(4);
        ctx.text("   |", X, l.y, { ...o, color: "mute", alpha: l.a });
        ctx.text("rapid high-contrast cuts and strong light", X + 6 * cw, l.y, { ...o, color: "sub", alpha: l.a });
        l = line(5);
        ctx.text("   =", X, l.y, { ...o, color: "mute", alpha: l.a });
        ctx.text("note: may affect photosensitive viewers", X + 6 * cw, l.y, { ...o, color: "sub", alpha: l.a });
        l = line(6);
        ctx.text("   =", X, l.y, { ...o, color: "mute", alpha: l.a });
        ctx.text(ZH, X + 6 * cw, l.y - 1, { size: SIZE * 0.95, font: "tcSans", weight: 500, color: "sub", alpha: l.a });
        if (t >= -3) {
          const a = easeOut(prog(t, -3, -2.82)) * page, y = 300 + 8 * LH;
          ctx.text("starting in", X, y, { ...o, color: "mute", alpha: a });
          ctx.text(String(clamp(Math.ceil(-t), 1, 3)), X + 12 * cw, y, { ...o, weight: 700, color: "text", alpha: a });
        }
        const g = line(2).a;
        ctx.line(X - 34, 300 + 2 * LH - SIZE * 0.86, X - 34, 300 + 6 * LH + SIZE * 0.3, { color: "line", width: 3, alpha: g });
      }
    };
  }
  __name(prerollShot, "prerollShot");
  function overlayScene({ cfg, features }) {
    const T_OFF = features.barTime(112);
    const NOTE = [
      // literal greys: by now the palette is `dead`, and this note must stay readable
      ["Unofficial fan-made video.  Not affiliated with, or endorsed by, Anthropic or Mili.", "#b8b6ae"],
      ['Claude is a trademark of Anthropic.  Music: "world.execute(me);" by Mili.', "#7d7b73"],
      ["Character silhouettes supplied by the maker of this video.  Interface drawn in code.", "#7d7b73"]
    ];
    return {
      id: "overlay",
      overlay: true,
      z: 100,
      start: -1e9,
      end: 1e9,
      render(ctx, t) {
        const wEnd = cfg.safety.warningSeconds;
        if (t > 0.9 && t < wEnd) {
          toast(ctx, { x: 960 - 300, y: 24, w: 600, h: 58 }, {
            title: "This video contains flashing images",
            tone: "info",
            icon: "!",
            k: prog(t, 0.9, 1.3),
            out: easeOut(prog(t, wEnd - 0.5, wEnd))
          });
        }
        const a = prog(t, T_OFF + 1.6, T_OFF + 2.4) * (1 - prog(t, features.duration - 0.6, features.duration - 0.1));
        if (a > 0) NOTE.forEach(([s, col], i) => ctx.text(s, 960, 502 + i * 46, { size: 26, color: col, alpha: a, align: "center", weight: i ? 400 : 500 }));
      }
    };
  }
  __name(overlayScene, "overlayScene");

  // nyan-source:src/scenes/index.js
  function buildShots(env) {
    initHistory();
    const defs = [...bootShots(env), ...titleShots(env), ...verse1Shots(env), ...pre1Shots(env), ...chorusShots(env), ...verse2Shots(env), ...pre2Shots(env), ...chorus2Shots(env), ...aloneShots(env), ...errorShots(env), ...executionShots(env), ...countShots(env), ...chorusXShots(env), ...outroShots(env), ...shutdownShots(env)];
    const pre = prerollShot(env);
    if (pre) defs.push(pre);
    return sequence(defs, env.features.duration + 1);
  }
  __name(buildShots, "buildShots");
  function buildScenes(env) {
    return [...buildShots(env), overlayScene(env)];
  }
  __name(buildScenes, "buildScenes");

  // nyan-source:src/engine/engine.js
  function createEngine({ canvas, width, height, cfg, featuresData, lyricsData, art, script, errors, flipY = false, onStep = null }) {
    setSeed(cfg.seed);
    const step = onStep ?? (() => {
    });
    const palettes = buildPalettes(cfg.palettes);
    const mk2 = /* @__PURE__ */ __name((alpha) => new Ctx(new OffscreenCanvas(8, 8), cfg, palettes, { alpha }), "mk");
    const layerA = mk2(false), layerB = mk2(false), over = mk2(true);
    const post = new Post(canvas, cfg);
    const features = new Features(featuresData, cfg);
    const lyrics = new Lyrics(lyricsData, cfg, features);
    const all = buildScenes({ cfg, features, lyrics, art, script: script ?? {}, errors: errors ?? {} });
    step("scenes");
    const content = all.filter((s) => !s.overlay).sort((a, b) => (a.at ?? a.start) - (b.at ?? b.start));
    const overlays = all.filter((s) => s.overlay).sort((a, b) => (a.z || 0) - (b.z || 0));
    function resize(w, h) {
      for (const l of [layerA, layerB, over]) {
        l.canvas.width = w;
        l.canvas.height = h;
      }
      post.resize(w, h);
    }
    __name(resize, "resize");
    resize(width, height);
    function defaultFx(f, t) {
      const c = cfg, started = f.t >= features.t0 ? 1 : 0;
      return {
        flash: 0,
        flashColor: null,
        // full-screen flash (capped by safety.maxFlash)
        glow: c.glow.base + c.glow.lowGain * f.lowEnv,
        // bloom strength; only saturated colour blooms
        bloomAll: 0,
        bloomThreshold: 0.35,
        // v4 light: bright things bloom too (0..1), above this luminance
        rays: 0,
        raysAt: [960, 540],
        //   rays of whatever blooms, outwards from a point (virtual px)
        streak: 0,
        //   a horizontal streak through whatever blooms
        zoomBlur: 0,
        zoomAt: [960, 540],
        //   the picture smeared towards a point, 0..1 (a push)
        zoom: 1 + c.post.zoomOnLow * f.lowEnv * started,
        // low band breathes the whole frame, very slightly
        rot: 0,
        shake: [0, 0],
        // whole-frame camera
        aberration: c.post.aberration,
        rgbSplit: 0,
        // radial / horizontal colour separation (px)
        glitch: 0,
        mosh: 0,
        // torn rows / datamosh blocks
        mosaic: 0,
        mosaicRect: null,
        // cell size in px (0 = off), optional [x, y, w, h]
        invert: 0,
        desat: 0,
        // 0..1
        scan: 1,
        vignette: 1,
        // multipliers on the finish
        bright: 1 + c.post.flicker * f.high * (rand(7, Math.round(t * 60)) - 0.5) * 2,
        hud: 1
        // opacity of the overlay layer (warning toast, credits)
      };
    }
    __name(defaultFx, "defaultFx");
    const broken = /* @__PURE__ */ new Set();
    function drawScene(layer, sc, tv, f) {
      layer.g.save();
      try {
        sc.render(layer, tv, f);
        layer.g.restore();
      } catch (e) {
        if (!broken.has(sc.id)) {
          broken.add(sc.id);
          console.error(`[shot ${sc.id}] ${e.message}`);
        }
        throw new Error(`shot "${sc.id}" failed: ${e.message}`);
      }
    }
    __name(drawScene, "drawScene");
    function blendFx(fx, a, k) {
      const of = /* @__PURE__ */ __name((amt, at) => !(fx[amt] > 0) ? a[at] : !(a[amt] > 0) || k >= 0.5 ? fx[at] : a[at], "of");
      const rect2 = of("mosaic", "mosaicRect"), raysAt = of("rays", "raysAt"), zoomAt = of("zoomBlur", "zoomAt");
      for (const key in fx) {
        if (key !== "flash" && typeof fx[key] === "number" && typeof a[key] === "number") fx[key] = a[key] + (fx[key] - a[key]) * k;
      }
      fx.shake = [0, 1].map((i) => {
        const va = a.shake?.[i] ?? 0;
        return va + ((fx.shake?.[i] ?? 0) - va) * k;
      });
      fx.mosaicRect = rect2;
      fx.raysAt = raysAt;
      fx.zoomAt = zoomAt;
    }
    __name(blendFx, "blendFx");
    function renderFrame(t) {
      const tv = t - cfg.timing.offset;
      const f = features.sample(tv);
      const fx = defaultFx(f, t);
      for (const l of [layerA, layerB, over]) {
        l.begin(tv, f, t, fx);
        l.statePal = null;
      }
      const live = content.filter((s) => tv >= s.start && tv < s.end);
      const A = live.length > 1 ? live[live.length - 2] : live[0], B = live.length > 1 ? live[live.length - 1] : null;
      if (A) drawScene(layerA, A, tv, f);
      else {
        layerA.setPal("dead");
        layerA.clear();
      }
      const palA = layerA.statePal ?? layerA.pal;
      let k = 0, pal = palA, palB = null, glowA = fx.glow, glowB = fx.glow;
      if (B) {
        const fxA = { ...fx };
        Object.assign(fx, defaultFx(f, t), { flash: fxA.flash, flashColor: fxA.flashColor });
        drawScene(layerB, B, tv, f);
        k = clamp((tv - B.start) / Math.max(1e-6, A.end - B.start));
        palB = layerB.statePal ?? layerB.pal;
        pal = mixPal(palA, palB, k);
        glowA = fxA.glow;
        glowB = fx.glow;
        blendFx(fx, fxA, k);
      }
      const tr = resolveTransition(B ? B.enter : null, k, pal);
      over.pal = pal;
      over.clear();
      for (const sc of overlays) if (tv >= sc.start && tv < sc.end) drawScene(over, sc, tv, f);
      const n = /* @__PURE__ */ __name((c) => c.map((v) => v / 255), "n");
      const feed = /* @__PURE__ */ __name((p, fxGlow) => ({ bg: n(p.bg).map((v) => v * 1.03), tint: n(p.bloom), glow: p.glow, fxGlow }), "feed");
      const look = {
        tint: n(pal.bloom),
        flashCol: n(fx.flashColor ?? pal.bloom),
        moshCol: n(pal.err),
        bg: n(pal.bg).map((v) => v * 1.03),
        glow: pal.glow,
        a: feed(palA, glowA),
        b: B ? feed(palB, glowB) : null
      };
      post.render({ a: layerA.canvas, b: B ? layerB.canvas : null, hud: over.canvas }, tr, fx, look, Math.round(t * 60), flipY);
    }
    __name(renderFrame, "renderFrame");
    return {
      renderFrame,
      resize,
      features,
      lyrics,
      scenes: all,
      palettes,
      post,
      art,
      duration: features.duration,
      /** The film starts this many seconds BEFORE the song (the warning page); t in renderFrame(t) is song time. */
      preroll: cfg.safety.preroll ?? 0,
      readPixels: /* @__PURE__ */ __name((buf) => post.readPixels(buf), "readPixels"),
      rendererInfo: /* @__PURE__ */ __name(() => post.rendererInfo(), "rendererInfo"),
      activeScenes: /* @__PURE__ */ __name((t) => content.filter((s) => t >= s.start && t < s.end).map((s) => s.id), "activeScenes"),
      shotAt: /* @__PURE__ */ __name((t) => content.filter((s) => t >= s.start && t < s.end).pop() ?? null, "shotAt")
    };
  }
  __name(createEngine, "createEngine");

  // nyan-source:src/engine/trace.js
  var ISO = 127.5;
  function traceLoops(field, W, H) {
    const HW = W + 1, NH = H * HW, VH2 = H + 1, next = new Int32Array(NH + W * VH2).fill(-1);
    const at = /* @__PURE__ */ __name((i, j) => i < 0 || j < 0 || i >= W || j >= H ? 0 : field[j * W + i], "at");
    const hId = /* @__PURE__ */ __name((i, j) => j * HW + (i + 1), "hId"), vId = /* @__PURE__ */ __name((i, j) => NH + i * VH2 + (j + 1), "vId");
    for (let cy = -1; cy < H; cy++) {
      for (let cx = -1; cx < W; cx++) {
        const tl = at(cx, cy) > ISO, tr = at(cx + 1, cy) > ISO, br = at(cx + 1, cy + 1) > ISO, bl = at(cx, cy + 1) > ISO;
        const k = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
        if (k === 0 || k === 15) continue;
        const T = hId(cx, cy), B = hId(cx, cy + 1), L2 = vId(cx, cy), R = vId(cx + 1, cy);
        switch (k) {
          // one orientation throughout, so every crossing has one way in and one way out
          case 1:
            next[L2] = B;
            break;
          case 2:
            next[B] = R;
            break;
          case 3:
            next[L2] = R;
            break;
          case 4:
            next[R] = T;
            break;
          case 5:
            next[L2] = T;
            next[R] = B;
            break;
          case 6:
            next[B] = T;
            break;
          case 7:
            next[L2] = T;
            break;
          case 8:
            next[T] = L2;
            break;
          case 9:
            next[T] = B;
            break;
          case 10:
            next[T] = R;
            next[B] = L2;
            break;
          case 11:
            next[T] = R;
            break;
          case 12:
            next[R] = L2;
            break;
          case 13:
            next[R] = B;
            break;
          default:
            next[B] = L2;
            break;
        }
      }
    }
    const point = /* @__PURE__ */ __name((id, out) => {
      if (id < NH) {
        const j = Math.floor(id / HW), i = id % HW - 1, a = at(i, j), b = at(i + 1, j);
        out.push(i + 0.5 + (ISO - a) / (b - a), j + 0.5);
      } else {
        const q = id - NH, i = Math.floor(q / VH2), j = q % VH2 - 1, a = at(i, j), b = at(i, j + 1);
        out.push(i + 0.5, j + 0.5 + (ISO - a) / (b - a));
      }
    }, "point");
    const loops = [];
    for (let s = 0; s < next.length; s++) {
      if (next[s] < 0) continue;
      const pts = [];
      let e = s, guard = 0;
      while (e >= 0 && next[e] >= 0 && guard++ < 4e6) {
        point(e, pts);
        const n = next[e];
        next[e] = -1;
        e = n;
      }
      if (pts.length >= 6) loops.push(Float32Array.from(pts));
    }
    return loops;
  }
  __name(traceLoops, "traceLoops");
  function loopArea(p) {
    let a = 0;
    for (let i = 0, n = p.length / 2; i < n; i++) {
      const j = (i + 1) % n;
      a += p[2 * i] * p[2 * j + 1] - p[2 * j] * p[2 * i + 1];
    }
    return a / 2;
  }
  __name(loopArea, "loopArea");
  function simplify(p, eps = 0.3) {
    const n = p.length / 2;
    if (n < 8) return p;
    let far = 0, d0 = -1;
    for (let i = 1; i < n; i++) {
      const d = (p[2 * i] - p[0]) ** 2 + (p[2 * i + 1] - p[1]) ** 2;
      if (d > d0) {
        d0 = d;
        far = i;
      }
    }
    const keep = new Uint8Array(n);
    keep[0] = keep[far] = 1;
    const stack = [[0, far], [far, n]];
    const e2 = eps * eps;
    while (stack.length) {
      const [a, b] = stack.pop();
      if (b - a < 2) continue;
      const ax = p[2 * a], ay = p[2 * a + 1], bi = b % n, bx = p[2 * bi], by = p[2 * bi + 1], dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
      let worst = -1, wi = -1;
      for (let i = a + 1; i < b; i++) {
        const px = p[2 * i] - ax, py = p[2 * i + 1] - ay;
        let d;
        if (len2 < 1e-9) d = px * px + py * py;
        else {
          const u = Math.max(0, Math.min(1, (px * dx + py * dy) / len2)), qx = px - u * dx, qy = py - u * dy;
          d = qx * qx + qy * qy;
        }
        if (d > worst) {
          worst = d;
          wi = i;
        }
      }
      if (worst > e2) {
        keep[wi] = 1;
        stack.push([a, wi], [wi, b]);
      }
    }
    const out = [];
    for (let i = 0; i < n; i++) if (keep[i]) out.push(p[2 * i], p[2 * i + 1]);
    return out.length >= 6 ? Float32Array.from(out) : p;
  }
  __name(simplify, "simplify");
  function smoothPath(loops, P, corner = 0.6) {
    for (const p of loops) {
      const n = p.length / 2;
      if (n < 3) continue;
      const X = /* @__PURE__ */ __name((i) => p[2 * ((i % n + n) % n)], "X"), Y = /* @__PURE__ */ __name((i) => p[2 * ((i % n + n) % n) + 1], "Y");
      const hard = /* @__PURE__ */ __name((i) => {
        const ax = X(i) - X(i - 1), ay = Y(i) - Y(i - 1), bx = X(i + 1) - X(i), by = Y(i + 1) - Y(i);
        return Math.abs(Math.atan2(ax * by - ay * bx, ax * bx + ay * by)) > corner;
      }, "hard");
      P.moveTo((X(-1) + X(0)) / 2, (Y(-1) + Y(0)) / 2);
      for (let i = 0; i < n; i++) {
        const mx = (X(i) + X(i + 1)) / 2, my = (Y(i) + Y(i + 1)) / 2;
        if (hard(i)) {
          P.lineTo(X(i), Y(i));
          P.lineTo(mx, my);
        } else P.quadraticCurveTo(X(i), Y(i), mx, my);
      }
      P.closePath();
    }
    return P;
  }
  __name(smoothPath, "smoothPath");
  function outline(field, W, H, { eps = 0.3, minArea = 10 } = {}) {
    return traceLoops(field, W, H).filter((l) => Math.abs(loopArea(l)) >= minArea).map((l) => simplify(l, eps));
  }
  __name(outline, "outline");

  // nyan-source:src/engine/art.js
  var INK_NAMES = ["f_bust", "f_profile", "f_reach", "f_eye", "boy_bust", "man_bust", "cat_bust", "cat_paws"];
  var ART_NAMES = INK_NAMES;
  var LUM_H = 240;
  var MAX_UNTREATED = 1.75;
  var warned = /* @__PURE__ */ new Set();
  var warnOnce = /* @__PURE__ */ __name((key, msg) => {
    if (!warned.has(key)) {
      warned.add(key);
      console.warn(msg);
    }
  }, "warnOnce");
  var INK_RGB = [[244, 224, 198], [220, 114, 63], [36, 26, 21]];
  var INK_KEY = { cream: 0, orange: 1, black: 2 };
  var REGISTER = { cat_bust: [1, -28, -49], boy_bust: [0.89, 60, -18], man_bust: [0.873, 81, -4] };
  var mk = /* @__PURE__ */ __name((w, h) => {
    const c = new OffscreenCanvas(8, 8);
    c.width = w;
    c.height = h;
    return c;
  }, "mk");
  var Art = class {
    static {
      __name(this, "Art");
    }
    constructor() {
      this.sil = {};
      this.lum = {};
      this.regions = {};
      this.ink = {};
      this.dim = {};
      this.walls = {};
      this.tmpA = mk(8, 8);
      this.tmpB = mk(8, 8);
      this.tmpC = mk(8, 8);
    }
    /**
     * One-off separation of a three-ink silhouette into its plates.
     *
     *  - matte: alpha under 16 is dust (and carries stray red / yellow RGB): dropped. The solid body is alpha 253 / 254
     *    in the files, never 255: made solid.
     *  - every pixel is split between the two inks it lies between in RGB (anti-aliased ink-to-ink edges stay soft; the
     *    fourth, rust tone of f_reach lies between orange and black and folds into black). Pixels of the soft outer edge
     *    take the split of their most opaque neighbour: their own RGB is too coarse to trust.
     *  - plates are CUMULATIVE, in print order: mask 0 = the whole figure, 1 = orange + black, 2 = black. A lower plate
     *    runs under the upper ones, so registered plates never show a seam and a shifted plate shows the ink below it.
     *  - each mask is also traced to a smooth outline (trace.js) for close-ups, keylines and clipping.
     */
    _prepareInk(name, img) {
      const W = img.width, H = img.height, N2 = W * H;
      const src = mk(W, H), sg = src.getContext("2d", { willReadFrequently: true });
      sg.drawImage(img, 0, 0);
      const px = sg.getImageData(0, 0, W, H).data;
      const A = new Uint8Array(N2), C1 = new Uint8Array(N2), C2 = new Uint8Array(N2);
      for (let i = 0; i < N2; i++) {
        const a = px[i * 4 + 3];
        A[i] = a < 16 ? 0 : a >= 250 ? 255 : a;
      }
      const ink = INK_RGB.map((c) => [...c]), sum = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
      for (let i = 0; i < N2; i += 3) {
        if (A[i] !== 255) continue;
        const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
        let best = -1, bd = 40 * 40;
        for (let k = 0; k < 3; k++) {
          const d = (r - ink[k][0]) ** 2 + (g - ink[k][1]) ** 2 + (b - ink[k][2]) ** 2;
          if (d < bd) {
            bd = d;
            best = k;
          }
        }
        if (best >= 0) {
          const s = sum[best];
          s[0] += r;
          s[1] += g;
          s[2] += b;
          s[3]++;
        }
      }
      for (let k = 0; k < 3; k++) if (sum[k][3] > 200) for (let c = 0; c < 3; c++) ink[k][c] = sum[k][c] / sum[k][3];
      const PAIR = [[0, 1], [0, 2], [1, 2]].map(([a, b]) => {
        const d = [0, 1, 2].map((c) => ink[b][c] - ink[a][c]);
        return { a, b, d, len2: d[0] * d[0] + d[1] * d[1] + d[2] * d[2] };
      });
      const ramp = /* @__PURE__ */ __name((t) => clamp((t - 0.15) / 0.55), "ramp");
      const split2 = /* @__PURE__ */ __name((r, g, b) => {
        let bestD = Infinity, bt = 0, bp = PAIR[0];
        for (const p of PAIR) {
          const x = r - ink[p.a][0], y = g - ink[p.a][1], z = b - ink[p.a][2];
          const t2 = clamp((x * p.d[0] + y * p.d[1] + z * p.d[2]) / p.len2), ex = x - t2 * p.d[0], ey = y - t2 * p.d[1], ez = z - t2 * p.d[2], d = ex * ex + ey * ey + ez * ez;
          if (d < bestD) {
            bestD = d;
            bt = t2;
            bp = p;
          }
        }
        const t = Math.round(255 * ramp(bt));
        return bp.a === 0 && bp.b === 1 ? [t, 0] : bp.a === 0 ? [t, t] : [255, t];
      }, "split");
      for (let i = 0; i < N2; i++) {
        if (A[i] < 128) continue;
        const s = split2(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
        C1[i] = s[0];
        C2[i] = s[1];
      }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (A[i] === 0 || A[i] >= 128) continue;
        let best = -1, ba = 127;
        for (let r = 1; r <= 2 && best < 0; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const j = yy * W + xx;
          if (A[j] > ba) {
            ba = A[j];
            best = j;
          }
        }
        if (best >= 0) {
          C1[i] = C1[best];
          C2[i] = C2[best];
        } else {
          const s = split2(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
          C1[i] = s[0];
          C2[i] = s[1];
        }
      }
      const cover = [A, new Uint8Array(N2), new Uint8Array(N2)];
      for (let i = 0; i < N2; i++) {
        cover[1][i] = (A[i] * C1[i] + 127) / 255;
        cover[2][i] = (A[i] * C2[i] + 127) / 255;
      }
      const mask = cover.map((cv) => {
        const c = mk(W, H), g = c.getContext("2d"), im = g.createImageData(W, H), d = im.data;
        for (let i = 0; i < N2; i++) {
          d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 255;
          d[i * 4 + 3] = cv[i];
        }
        g.putImageData(im, 0, 0);
        return c;
      });
      const path = cover.map((cv) => smoothPath(outline(cv, W, H, { eps: 0.25, minArea: 10 }), new Path2D()));
      const exact = [0, 1].map((k) => {
        const p = new Path2D();
        p.addPath(path[k]);
        p.addPath(path[k + 1]);
        return p;
      });
      exact.push(path[2]);
      const lw = Math.ceil(W / 2), lh = Math.ceil(H / 2), label = new Uint8Array(lw * lh);
      for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
        const i = Math.min(H - 1, 2 * y) * W + Math.min(W - 1, 2 * x);
        label[y * lw + x] = A[i] < 128 ? 0 : C2[i] > 127 ? 3 : C1[i] > 127 ? 2 : 1;
      }
      const mw = W >= H ? LUM_H : Math.round(LUM_H * W / H), mh = W >= H ? Math.round(LUM_H * H / W) : LUM_H;
      const L2 = new Float32Array(mw * mh), LA = new Float32Array(mw * mh);
      for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
        const i = Math.min(H - 1, Math.floor((y + 0.5) * H / mh)) * W + Math.min(W - 1, Math.floor((x + 0.5) * W / mw));
        L2[y * mw + x] = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
        LA[y * mw + x] = A[i] / 255;
      }
      this.lum[name] = { L: L2, A: LA, hasAlpha: true, w: mw, h: mh };
      this.dim[name] = { w: W, h: H };
      this.sil[name] = mask[0];
      this.ink[name] = { w: W, h: H, mask, path, exact, label, lw, lh, rgb: ink };
    }
    size(name) {
      const d = this.dim[name];
      return { w: d.w, h: d.h };
    }
    /** Region from regions.json: art.region('f_reach', 'hand') -> {x, y, w, h}; 'crops.avatar', 'crops.wide.0' also work. */
    region(name, key) {
      let v = this.regions[name];
      for (const k of key.split(".")) v = v?.[k];
      if (!Array.isArray(v) || typeof v[0] !== "number") return null;
      return v.length === 3 ? { x: v[0] - v[2], y: v[1] - v[2], w: 2 * v[2], h: 2 * v[2] } : v.length === 2 ? { x: v[0], y: v[1], w: 0, h: 0 } : { x: v[0], y: v[1], w: v[2], h: v[3] };
    }
    /**
     * Source crop that makes the picture cover `dst` (aspect of dst), centred on `focus`
     * (source px [x, y], or a region key like 'face') and magnified by `zoom` (1 = widest crop that covers).
     */
    cover(name, dst, { focus = null, zoom = 1 } = {}) {
      const { w: W, h: H } = this.size(name), ar = dst.w / dst.h;
      let cw = Math.min(W, H * ar) / zoom, ch = cw / ar;
      let fx = W / 2, fy = H / 2;
      if (typeof focus === "string") {
        const r = this.region(name, focus);
        if (r) {
          fx = r.x + r.w / 2;
          fy = r.y + r.h / 2;
        }
      } else if (focus) [fx, fy] = focus;
      return { x: clamp(fx - cw / 2, 0, W - cw), y: clamp(fy - ch / 2, 0, H - ch), w: cw, h: ch };
    }
    /** Flat silhouette from the alpha matte, in a palette colour. */
    silhouette(ctx, name, dst, { crop = null, color = "mute", alpha = 1 } = {}) {
      if (alpha <= 3e-3) return;
      const c = crop ?? { x: 0, y: 0, ...this.size(name) }, t = this._tmp(this.tmpA, c.w, c.h), tg = t.getContext("2d");
      tg.globalCompositeOperation = "copy";
      tg.drawImage(this.sil[name], c.x, c.y, c.w, c.h, 0, 0, t.width, t.height);
      tg.globalCompositeOperation = "source-in";
      tg.fillStyle = ctx.col(color, 1);
      tg.fillRect(0, 0, t.width, t.height);
      const g = ctx.g, a0 = g.globalAlpha;
      g.globalAlpha = a0 * alpha;
      g.drawImage(t, dst.x, dst.y, dst.w, dst.h);
      g.globalAlpha = a0;
    }
    /** Sample luminance / alpha of the picture at normalised crop coordinates (u, v in 0..1). */
    _sample(name, c, u, v) {
      const { w: W, h: H } = this.size(name), m = this.lum[name];
      const x = clamp(Math.floor((c.x + u * c.w) / W * m.w), 0, m.w - 1), y = clamp(Math.floor((c.y + v * c.h) / H * m.h), 0, m.h - 1);
      return [m.L[y * m.w + x], m.A[y * m.w + x]];
    }
    /**
     * Dot screen: dot area follows the picture's brightness (light dots on the dark page; set
     * invert for dark dots on a light field). cell = dot pitch in virtual px.
     * ink (silhouettes only): 'cream' | 'orange' | 'black' = dots only where that ink is printed, at full size,
     * so one call per ink screens the figure in its own separations.
     */
    halftone(ctx, name, dst, { crop = null, cell = 10, color = "me", alpha = 1, invert = false, gain = 1, angle = 0, ink = null, flip = false } = {}) {
      if (alpha <= 3e-3) return;
      const c = crop ?? { x: 0, y: 0, ...this.size(name) }, g = ctx.g, want = ink ? INK_KEY[ink] + 1 : 0;
      const cols = Math.ceil(dst.w / cell), rows = Math.ceil(dst.h / cell), { w: W, h: H } = this.size(name);
      g.save();
      g.beginPath();
      g.rect(dst.x, dst.y, dst.w, dst.h);
      g.clip();
      g.fillStyle = ctx.col(color, alpha);
      g.beginPath();
      for (let j = 0; j < rows; j++) {
        const off = angle ? j % 2 * 0.5 : 0;
        for (let i = 0; i < cols + 1; i++) {
          const u = (i + 0.5 - off) / cols, v = (j + 0.5) / rows, us = flip ? 1 - u : u;
          if (u < 0 || u > 1) continue;
          let r;
          if (want) {
            if (this.inkAt(name, (c.x + us * c.w) / W, (c.y + v * c.h) / H) !== want) continue;
            r = cell * 0.62 * Math.sqrt(clamp(gain));
          } else {
            const [l, a] = this._sample(name, c, us, v);
            if (a < 0.5) continue;
            r = cell * 0.62 * Math.sqrt(clamp((invert ? 1 - l : l) * gain));
          }
          if (r < 0.6) continue;
          const x = dst.x + u * dst.w, y = dst.y + v * dst.h;
          g.moveTo(x + r, y);
          g.arc(x, y, r, 0, 6.2832);
        }
      }
      g.fill();
      g.restore();
      ctx._font = "";
    }
    /** Glyph screen: one character per cell, denser glyph = brighter. colors = roles for dark / mid / light. */
    ascii(ctx, name, dst, { crop = null, size = 16, colors = ["meDim", "me", "meHot"], alpha = 1, ramp = " .:-=+*#%@", gain = 1 } = {}) {
      if (alpha <= 3e-3) return;
      const c = crop ?? { x: 0, y: 0, ...this.size(name) }, g = ctx.g, cw = ctx.cw(size), ch = size;
      const cols = Math.floor(dst.w / cw), rows = Math.floor(dst.h / ch);
      g.save();
      g.beginPath();
      g.rect(dst.x, dst.y, dst.w, dst.h);
      g.clip();
      ctx.font(size, 400, "mono");
      g.textAlign = "left";
      for (let j = 0; j < rows; j++) {
        const strs = ["", "", ""];
        for (let i = 0; i < cols; i++) {
          const [l, a] = this._sample(name, c, (i + 0.5) / cols, (j + 0.5) / rows);
          const k = clamp(l * gain), idx = a < 0.5 ? 0 : Math.min(ramp.length - 1, Math.floor(k * ramp.length));
          const tier = k > 0.66 ? 2 : k > 0.33 ? 1 : 0;
          for (let q = 0; q < 3; q++) strs[q] += q === tier ? ramp[idx] : " ";
        }
        for (let q = 0; q < 3; q++) {
          if (!strs[q].trim()) continue;
          g.fillStyle = ctx.col(colors[q], alpha);
          g.fillText(strs[q], dst.x, dst.y + (j + 0.8) * ch);
        }
      }
      g.restore();
      ctx._font = "";
    }
    // ------------------------------------------------------------------------------------------------ the room
    /** The wall's light: a small map of soft pools (white, alpha = light), built once per name and only ever shown enlarged. */
    _wall(name) {
      if (this.walls[name]) return this.walls[name];
      let seed = 0;
      for (const ch of String(name)) seed = (seed * 31 + ch.charCodeAt(0)) % 9973;
      const W = 320, H = 180, c = mk(W, H), g = c.getContext("2d");
      const pool2 = /* @__PURE__ */ __name((x, y, r, a) => {
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `rgba(255,255,255,${a})`);
        gr.addColorStop(0.55, `rgba(255,255,255,${a * 0.42})`);
        gr.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gr;
        g.fillRect(x - r, y - r, 2 * r, 2 * r);
      }, "pool");
      for (let i = 0; i < 5; i++) pool2(W * (0.08 + 0.84 * rand(seed, i, 1)), H * (0.1 + 0.8 * rand(seed, i, 2)), H * (0.55 + 0.5 * rand(seed, i, 3)), 0.34 + 0.3 * rand(seed, i, 4));
      for (let i = 0; i < 9; i++) pool2(W * rand(seed, i, 5), H * rand(seed, i, 6), H * (0.16 + 0.2 * rand(seed, i, 7)), 0.16 + 0.2 * rand(seed, i, 8));
      g.globalCompositeOperation = "destination-out";
      for (let i = 0; i < 4; i++) pool2(W * rand(seed, i, 9), H * rand(seed, i, 10), H * (0.3 + 0.3 * rand(seed, i, 11)), 0.5);
      return this.walls[name] = c;
    }
    /** Fine grain of the wall: a tile of light and dark specks (alpha only), built once. */
    _grain() {
      if (this.grain) return this.grain;
      const S = 256, c = mk(S, S), g = c.getContext("2d"), im = g.createImageData(S, S), d = im.data;
      for (let i = 0; i < S * S; i++) {
        const v = rand(977, i);
        d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v > 0.5 ? 255 : 0;
        d[i * 4 + 3] = Math.round(255 * Math.abs(v - 0.5) * 2 * (0.4 + 0.6 * rand(978, i >> 2)));
      }
      g.putImageData(im, 0, 0);
      return this.grain = c;
    }
    /**
     * The room behind the interface: a warm, mottled wall drawn in code: soft pools of the AI's own light (role meDim; a
     * neutral grey as `sat` falls, so the room greys with the conversation state) and a fine grain. `name` only seeds
     * where the pools lie, so each room keeps a look of its own (the names are those of v3's rooms; no picture is behind them).
     */
    backdrop(ctx, name, dst = { x: 0, y: 0, w: 1920, h: 1080 }, { alpha = 0.5, sat = ctx.pal.sat, focus = [0.5, 0.4], zoom = 1 } = {}) {
      if (alpha <= 3e-3) return;
      const g = ctx.g, b = this._wall(name), ar = dst.w / dst.h;
      const cw = Math.min(b.width, b.height * ar) / zoom, ch = cw / ar;
      const sx = clamp(focus[0] * b.width - cw / 2, 0, b.width - cw), sy = clamp(focus[1] * b.height - ch / 2, 0, b.height - ch);
      const s = clamp(sat), warm = ctx.pal.meDim, grey = ctx.pal.mute, col = [0, 1, 2].map((i) => Math.round(grey[i] + (warm[i] - grey[i]) * s));
      const t = this._tmp(this.tmpA, b.width, b.height), tg = t.getContext("2d");
      tg.globalCompositeOperation = "copy";
      tg.drawImage(b, 0, 0);
      tg.globalCompositeOperation = "source-in";
      tg.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
      tg.fillRect(0, 0, t.width, t.height);
      const a0 = g.globalAlpha;
      g.imageSmoothingQuality = "high";
      g.globalAlpha = a0 * Math.min(1, alpha * 1.5);
      g.drawImage(t, sx, sy, cw, ch, dst.x, dst.y, dst.w, dst.h);
      g.save();
      g.beginPath();
      g.rect(dst.x, dst.y, dst.w, dst.h);
      g.clip();
      const pat = g.createPattern(this._grain(), "repeat");
      pat.setTransform(new DOMMatrix().scale(0.5));
      g.globalAlpha = a0 * Math.min(1, alpha * 0.16);
      g.fillStyle = pat;
      g.fillRect(dst.x, dst.y, dst.w, dst.h);
      g.restore();
      g.globalAlpha = a0;
    }
    // ------------------------------------------------------------------------------------------------ ink plates
    _ink(name) {
      const K = this.ink[name];
      if (!K) warnOnce(`ink|${name}`, `[art] "${name}" has no ink plates - the three-ink silhouettes are: ${INK_NAMES.join(", ")}`);
      return K;
    }
    /** Where to draw bust `name` so that it registers with f_bust drawn into `base` (chin, flower and collar coincide). */
    fit(name, base) {
      const r = REGISTER[name];
      if (!r) return { ...base };
      const k = base.w / 1086;
      return { x: base.x + k * r[1], y: base.y + k * r[2], w: base.w * r[0], h: base.h * r[0] };
    }
    /** A plate as a Path2D in source px: 'all' (the whole figure), 'orange' (orange + black) or 'black'; exact = that ink alone. */
    inkPath(name, ink = "all", exact = false) {
      const K = this._ink(name), k = ink === "all" ? 0 : INK_KEY[ink] ?? 0;
      return K ? (exact ? K.exact : K.path)[k] : null;
    }
    /** Which ink is printed at (u, v) of the picture (0..1): 0 = none, 1 = cream, 2 = orange, 3 = black. */
    inkAt(name, u, v) {
      const K = this.ink[name];
      if (!K || u < 0 || v < 0 || u >= 1 || v >= 1) return 0;
      return K.label[Math.floor(v * K.lh) * K.lw + Math.floor(u * K.lw)];
    }
    /**
     * ONE CONNECTED PATCH of one ink, as a Path2D in source px: everything that is printed in `ink` and hangs together
     * with the point `seed` ([x, y] in source px, or a region key such as 'palm'). A part of the figure (her open hand)
     * is cut out of the art this way and never with a hand-drawn polygon. grow = source px by which the patch is
     * widened (to take the soft edge with it). Built on first use from the label map (no pixels are read) and kept.
     */
    part(name, seed, { ink = "cream", grow = 2 } = {}) {
      const K = this._ink(name);
      if (!K) return null;
      const key = `${typeof seed === "string" ? seed : seed.join(",")}|${ink}|${grow}`;
      K.parts ??= {};
      if (K.parts[key]) return K.parts[key];
      const r = typeof seed === "string" ? this.region(name, seed) : { x: seed[0], y: seed[1], w: 0, h: 0 };
      const { label, lw, lh } = K, want = (INK_KEY[ink] ?? 0) + 1, cover = new Uint8Array(lw * lh);
      const sx = clamp(Math.round((r.x + r.w / 2) / 2), 0, lw - 1), sy = clamp(Math.round((r.y + r.h / 2) / 2), 0, lh - 1);
      let start = -1;
      for (let rad = 0; rad < 24 && start < 0; rad++) for (let dy = -rad; dy <= rad && start < 0; dy++) for (let dx = -rad; dx <= rad; dx++) {
        const x = sx + dx, y = sy + dy;
        if (x >= 0 && y >= 0 && x < lw && y < lh && label[y * lw + x] === want) {
          start = y * lw + x;
          break;
        }
      }
      if (start >= 0) {
        const stack = [start];
        cover[start] = 255;
        while (stack.length) {
          const i = stack.pop(), x = i % lw;
          for (const j of [i - lw, i + lw, x > 0 ? i - 1 : -1, x < lw - 1 ? i + 1 : -1]) {
            if (j >= 0 && j < cover.length && !cover[j] && label[j] === want) {
              cover[j] = 255;
              stack.push(j);
            }
          }
        }
      }
      for (let n = Math.round(grow / 2); n > 0; n--) {
        const src = cover.slice();
        for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
          const i = y * lw + x;
          if (!src[i] && (x > 0 && src[i - 1] || x < lw - 1 && src[i + 1] || y > 0 && src[i - lw] || y < lh - 1 && src[i + lw])) cover[i] = 255;
        }
      }
      const half2 = smoothPath(outline(cover, lw, lh, { eps: 0.3, minArea: 6 }), new Path2D()), path = new Path2D();
      path.addPath(half2, new DOMMatrix().scale(2));
      return K.parts[key] = path;
    }
    /** Run fn with drawing clipped to such a patch of the figure as it would be drawn into dst (see part()). */
    partClip(ctx, name, dst, seed, fn, { ink = "cream", grow = 2, crop = null, flip = false } = {}) {
      const K = this._ink(name), g = ctx.g, path = this.part(name, seed, { ink, grow });
      if (!K || !path) return;
      const c = crop ?? { x: 0, y: 0, w: K.w, h: K.h }, m = g.getTransform();
      g.save();
      this._onto(g, c, dst, flip);
      g.clip(path, "evenodd");
      g.setTransform(m);
      fn();
      g.restore();
      ctx._font = "";
    }
    /** The canvas transform that carries source px of `c` (a crop) onto `dst`. */
    _onto(g, c, dst, flip, dx = 0, dy = 0) {
      g.translate(dst.x + dx, dst.y + dy);
      if (flip) {
        g.translate(dst.w, 0);
        g.scale(-1, 1);
      }
      g.scale(dst.w / c.w, dst.h / c.h);
      g.translate(-c.x, -c.y);
    }
    /** Run fn with drawing clipped to one plate of the figure as it would be drawn into dst. */
    inkClip(ctx, name, dst, fn, { ink = "all", exact = false, crop = null, flip = false } = {}) {
      const K = this._ink(name), g = ctx.g;
      if (!K) return;
      const c = crop ?? { x: 0, y: 0, w: K.w, h: K.h }, m = g.getTransform();
      g.save();
      this._onto(g, c, dst, flip);
      g.beginPath();
      g.rect(c.x, c.y, c.w, c.h);
      g.clip();
      g.clip(this.inkPath(name, ink, exact), "evenodd");
      g.setTransform(m);
      fn();
      g.restore();
      ctx._font = "";
    }
    /**
     * The figure, printed from its ink plates.
     *
     *   roles    { cream, orange, black }: palette role (or '#rrggbb') each plate is printed in; null = that plate is not
     *            printed. Default text / me / panel. With the user's cream interface in the same frame give her cream
     *            plate 'sub' (cream is YOU). In `off` and `dead` the figure greys by itself; in `error` and `ash` `me`
     *            is still orange: name a grey or red role yourself.
     *   offset   { cream: [dx, dy], ... } misregistration per plate, virtual px
     *   reveal   { cream: k, ... } or one k for all: 0..1 of the plate printed, wiped top to bottom; or { k, dir } with
     *            dir 'down' | 'up' | 'right' | 'left'
     *   exact    true = every plate prints only its own ink (separations laid side by side). Default false: a plate runs
     *            under the plates printed above it, so registered plates never seam and a shifted plate shows the ink below.
     *   plates   instead of the three standard plates, a list in print order:
     *            [{ ink: 'all' | 'cream' | 'orange' | 'black', role, exact, offset: [dx, dy], alpha, reveal }]
     *            ('all' = the whole figure as one flat shape)
     *   keyline  { color, width, alpha }: a thin line round the whole figure, under the plates (the black ink is almost
     *            the page colour: every use needs paper, light or a line behind it)
     *   crop     source rect; flip = mirrored left to right; alpha = the whole figure
     *   vector   draw the plates as paths instead of bitmaps. Default: automatically above 1.75 x source size at 4K,
     *            where a bitmap would go soft (f_eye and f_reach close-ups).
     */
    inks(ctx, name, dst, { roles = {}, offset = {}, reveal = null, exact = false, plates = null, keyline = null, crop = null, flip = false, alpha = 1, vector = null } = {}) {
      const K = this._ink(name), g = ctx.g;
      if (!K || !(alpha > 3e-3)) return;
      const c = crop ?? { x: 0, y: 0, w: K.w, h: K.h };
      const role = /* @__PURE__ */ __name((k, d) => roles[k] === void 0 ? d : roles[k], "role"), rv = /* @__PURE__ */ __name((k) => reveal != null && typeof reveal === "object" && !("k" in reveal) ? reveal[k] : reveal, "rv");
      let list = plates;
      if (!list) {
        const rc = role("cream", "text"), ro = role("orange", "me"), rb = role("black", "panel");
        list = [
          { ink: "cream", role: rc, exact: exact || !ro || !rb, offset: offset.cream, reveal: rv("cream") },
          { ink: "orange", role: ro, exact: exact || !rb, offset: offset.orange, reveal: rv("orange") },
          { ink: "black", role: rb, exact: true, offset: offset.black, reveal: rv("black") }
        ];
      }
      list = list.filter((p) => p.role && (p.alpha ?? 1) > 3e-3 && !(p.reveal != null && (p.reveal.k ?? p.reveal) <= 0));
      if (!list.length) return;
      const m = g.getTransform(), mag = dst.w / c.w * (Math.hypot(m.a, m.b) / ctx.scale) * 2;
      const asPath = vector ?? mag > MAX_UNTREATED;
      const wipe = /* @__PURE__ */ __name((p, r) => {
        const k = p.reveal == null ? 1 : clamp(p.reveal.k ?? p.reveal), dir = p.reveal?.dir ?? "down";
        return k >= 1 ? r : dir === "down" ? { ...r, h: r.h * k } : dir === "up" ? { ...r, y: r.y + r.h * (1 - k), h: r.h * k } : dir === "right" ? { ...r, w: r.w * k } : { ...r, x: r.x + r.w * (1 - k), w: r.w * k };
      }, "wipe");
      const a0 = g.globalAlpha;
      if (keyline) {
        g.save();
        this._onto(g, c, dst, flip);
        g.beginPath();
        g.rect(c.x, c.y, c.w, c.h);
        g.clip();
        g.strokeStyle = ctx.col(keyline.color ?? "line", 1);
        g.globalAlpha = a0 * alpha * (keyline.alpha ?? 1);
        g.lineWidth = 2 * (keyline.width ?? 2) * c.w / dst.w;
        g.lineJoin = "round";
        g.stroke(K.path[0]);
        g.restore();
      }
      if (asPath) {
        for (const p of list) {
          const k = p.ink === "all" ? 0 : INK_KEY[p.ink], o = p.offset ?? [0, 0], w = wipe(p, dst);
          g.save();
          if (w !== dst) {
            g.beginPath();
            g.rect(w.x + o[0], w.y + o[1], w.w, w.h);
            g.clip();
          }
          this._onto(g, c, dst, flip, o[0], o[1]);
          if (crop) {
            g.beginPath();
            g.rect(c.x, c.y, c.w, c.h);
            g.clip();
          }
          g.fillStyle = ctx.col(p.role, 1);
          g.globalAlpha = a0 * alpha * (p.alpha ?? 1);
          g.fill((p.exact && p.ink !== "all" ? K.exact : K.path)[k], "evenodd");
          g.restore();
        }
        g.globalAlpha = a0;
        ctx._font = "";
        return;
      }
      const sx = c.w / dst.w, sy = c.h / dst.h;
      const group = alpha < 0.999 && list.length > 1;
      let pad = 0, G = null, gg = null;
      if (group) {
        pad = Math.ceil(Math.max(0, ...list.map((p) => Math.max(Math.abs(p.offset?.[0] ?? 0) * sx, Math.abs(p.offset?.[1] ?? 0) * sy)))) + 1;
        G = this._tmp(this.tmpC, c.w + 2 * pad, c.h + 2 * pad);
        gg = G.getContext("2d");
        gg.setTransform(1, 0, 0, 1, 0, 0);
        gg.globalAlpha = 1;
        gg.globalCompositeOperation = "source-over";
        gg.clearRect(0, 0, G.width, G.height);
      }
      for (const p of list) {
        const k = p.ink === "all" ? 0 : INK_KEY[p.ink], minus = p.exact && p.ink !== "all" && k < 2 ? k + 1 : -1, o = p.offset ?? [0, 0];
        const t = this._tmp(this.tmpA, c.w, c.h), tg = t.getContext("2d");
        tg.globalCompositeOperation = "copy";
        tg.drawImage(K.mask[k], c.x, c.y, c.w, c.h, 0, 0, t.width, t.height);
        if (minus >= 0) {
          tg.globalCompositeOperation = "destination-out";
          tg.drawImage(K.mask[minus], c.x, c.y, c.w, c.h, 0, 0, t.width, t.height);
        }
        tg.globalCompositeOperation = "source-in";
        tg.fillStyle = ctx.col(p.role, 1);
        tg.fillRect(0, 0, t.width, t.height);
        const full = { x: 0, y: 0, w: t.width, h: t.height }, w = wipe(p, full);
        if (group) {
          gg.globalAlpha = p.alpha ?? 1;
          gg.drawImage(t, w.x, w.y, w.w, w.h, pad + o[0] * sx + w.x, pad + o[1] * sy + w.y, w.w, w.h);
        } else {
          g.save();
          g.translate(dst.x + o[0], dst.y + o[1]);
          if (flip) {
            g.translate(dst.w, 0);
            g.scale(-1, 1);
          }
          g.globalAlpha = a0 * alpha * (p.alpha ?? 1);
          g.drawImage(t, w.x, w.y, w.w, w.h, w.x / t.width * dst.w, w.y / t.height * dst.h, w.w / t.width * dst.w, w.h / t.height * dst.h);
          g.restore();
        }
      }
      if (group) {
        g.save();
        g.translate(dst.x, dst.y);
        if (flip) {
          g.translate(dst.w, 0);
          g.scale(-1, 1);
        }
        g.globalAlpha = a0 * alpha;
        g.drawImage(G, 0, 0, G.width, G.height, -pad / sx, -pad / sy, G.width / sx, G.height / sy);
        g.restore();
      }
      g.globalAlpha = a0;
      ctx._font = "";
    }
    _tmp(c, w, h) {
      const W = Math.max(2, Math.round(w)), H = Math.max(2, Math.round(h));
      if (c.width !== W || c.height !== H) {
        c.width = W;
        c.height = H;
      }
      return c;
    }
  };

  // presets/ports/nyankomintsu/scene.mjs
  var state = null;
  function setup(info, gl) {
    if (!info.assets?.config || !info.assets?.features || !info.assets?.captions?.lines) throw new Error("Incomplete Nyankomint offline assets");
    if (info.assets.captions.lines.length !== 129) throw new Error("Nyankomint requires the original 129 lyric lines");
    const cfg = info.assets.config;
    setSeed(cfg.seed);
    const art = new Art();
    art.regions = info.assets.regions;
    state = { info, gl, cfg, art, engine: null, width: info.width, height: info.height };
  }
  __name(setup, "setup");
  function* prepare(info, gl) {
    const total = ART_NAMES.length + 1 + 87 * 2;
    let done = 0;
    for (const name of ART_NAMES) {
      const image = info.assets[name.replaceAll("_", "-")];
      if (!image || !image.width || !image.height) throw new Error("Missing silhouette: " + name);
      state.art._prepareInk(name, image);
      yield { progress: ++done / total, label: "Separate / trace silhouette " + name };
    }
    state.engine = createEngine({
      canvas: info.canvas,
      width: info.width,
      height: info.height,
      cfg: state.cfg,
      featuresData: info.assets.features,
      lyricsData: info.assets.captions,
      art: state.art,
      script: info.assets.conversation,
      errors: info.assets.errors,
      flipY: false
    });
    const content = state.engine.scenes.filter((s) => !s.overlay);
    if (content.length !== 87 || content.some((s) => s.id.startsWith("todo-"))) throw new Error("The original 87 shots must all be present");
    yield { progress: ++done / total, label: "All 87 original shots" };
    for (const shot of content) {
      for (const t of [shot.at + Math.min(0.08, (shot.until - shot.at) / 4), (shot.at + shot.until) / 2]) {
        state.engine.renderFrame(t);
        gl.finish();
        yield { progress: ++done / total, label: "Prewarm " + shot.id };
      }
    }
  }
  __name(prepare, "prepare");
  function warmup(info, gl) {
    state.engine.renderFrame(-state.cfg.safety.preroll);
    gl.finish();
  }
  __name(warmup, "warmup");
  function paint(gl, t, width, height) {
    if (!state?.engine) throw new Error("Nyankomint preparation has not completed");
    if (width !== state.width || height !== state.height) {
      state.engine.resize(width, height);
      state.width = width;
      state.height = height;
    }
    state.engine.renderFrame(t);
  }
  __name(paint, "paint");
  return __toCommonJS(scene_exports);
})();

function setup(info,gl){return NyankomintWorkshop.setup(info,gl);}
function prepare(info,gl){return NyankomintWorkshop.prepare(info,gl);}
function warmup(info,gl){return NyankomintWorkshop.warmup(info,gl);}
function paint(gl,t,w,h,ctx){return NyankomintWorkshop.paint(gl,t,w,h,ctx);}
