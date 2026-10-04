// Polytech Tree · 人类科技树漫游 — a dsh-mv pixel scene (canvas.output "pixels").
// Original: https://github.com/secwind7/polytech-tree (commit 51d6e1f5141e) — © 2026 secwind, code MIT (LICENSE.txt);
// data (canvas.assets, precomputed by build.mjs from data/*.json): CC BY 4.0, see data/NOTICE.md.
// Adapted for dsh-mv by Alice-Marx: the Three.js tour (src/tour.ts, controls.ts, polyhedra.ts, edges.ts,
// labels.ts) re-drawn on a 2D canvas — camera on the tower axis looking straight down, rising with the
// era being revealed, slow roll, field of view fitted to the disc; techs pop in by year with a flash,
// names stay 2 s, prerequisite edges crawl towards the tech and arrive when it appears.

const LEAD = 130, FOV_MARGIN = 1.1, FOV_MIN = 45, FOV_MAX = 125, ROLL = 0.03, START_ANGLE = Math.PI * 0.25
const FLASH = 0.5, NAME_LIFE = 2, NAME_FADE = 0.35, OUTRO = 5
const BG = [5, 7, 15], FOG_NEAR = 140, FOG_FAR = 860
const SIDES = [10, 10, 8, 6, 3] // outline of icosahedron / dodecahedron / octahedron / cube / tetrahedron
let T = null // { eras, cats, nodes, names, edges, total, eraEnd, rgb, stars }

function setup(info) {
  const a = info && info.assets
  if (!a || !a.tower || !a.nodes || !a.edges) return
  const eras = a.tower.eras
  const rgb = a.tower.categories.map(c => { const n = parseInt(c.color.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255] })
  const stars = []
  for (let i = 0; i < 1600; i++) {
    const r = 550 + hash(i * 3 + 1) * 380, th = hash(i * 3 + 2) * Math.PI * 2, ph = Math.acos(2 * hash(i * 3 + 3) - 1)
    stars.push([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)])
  }
  // edges grouped by the target's category (one path per colour)
  const byCat = rgb.map(() => [])
  for (const e of a.edges.edges) byCat[a.nodes.nodes[e[1]][3]].push(e)
  T = { eras, cats: a.tower.categories, nodes: a.nodes.nodes, names: a.nodes.names, edges: byCat, total: a.tower.total, eraEnd: eras.map(e => e.start + e.dur), rgb, stars }
}

function hash(n) { n = Math.imul((n | 0) ^ 0x9E3779B9, 0x85EBCA6B); n ^= n >>> 13; n = Math.imul(n, 0xC2B2AE35); n ^= n >>> 16; return (n >>> 0) / 4294967296 }
const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
const smooth = x => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t) }

function eraOf(t) { for (let e = 0; e < T.eraEnd.length; e++) if (t < T.eraEnd[e]) return e; return T.eraEnd.length - 1 }
function trackY(t) {
  const top = T.eras.length - 1, e = eraOf(t), w = T.eras[e]
  const u = w.dur > 0 ? clamp((t - w.start) / w.dur, 0, 1) : 1
  const next = e < top ? T.eras[e + 1].y : T.eras[top].y + (T.eras[top].y - T.eras[top - 1].y)
  return w.y + (next - w.y) * smooth(u)
}
function radiusAtY(y) {
  const E = T.eras
  if (y <= E[0].y) return E[0].r
  for (let i = 0; i < E.length - 1; i++) if (y <= E[i + 1].y) return E[i].r + (E[i + 1].r - E[i].r) * (y - E[i].y) / (E[i + 1].y - E[i].y)
  return E[E.length - 1].r
}
// pop-in: overshoot to 2.5x and settle within FLASH
function pop(k) { return k < 0.35 ? 2.5 * smooth(k / 0.35) : 1 + 1.5 * (1 - smooth((k - 0.35) / 0.65)) }

function paint(g, t, W, H, ctx) {
  g.fillStyle = 'rgb(5,7,15)'; g.fillRect(0, 0, W, H)
  if (!T) { g.fillStyle = '#dce8ff'; g.font = '28px sans-serif'; g.textAlign = 'center'; g.fillText('Polytech Tree: data missing (canvas.assets)', W / 2, H / 2); return }
  const top = T.eras.length - 1, end = T.eraEnd[top]
  const ty = trackY(Math.min(t, end))
  const out = t > end ? smooth((t - end) / OUTRO) : 0
  const camY = ty + LEAD + out * 160
  const fov = clamp(2 * Math.atan(FOV_MARGIN * radiusAtY(ty) / LEAD) * 180 / Math.PI + out * 12, FOV_MIN, FOV_MAX) * Math.PI / 180
  const f = (H / 2) / Math.tan(fov / 2)
  const a = START_ANGLE + t * ROLL, ux = Math.cos(a), uz = Math.sin(a), rx = -uz, rz = ux
  const cx = W / 2, cy = H / 2
  const glow = 1 + 0.35 * clamp((ctx && ctx.energy) || 0, 0, 1)
  const curEra = t > end ? top : eraOf(t)
  // project: returns depth (<=0: behind) and fills P
  const P = [0, 0, 0]
  const project = (x, y, z) => { const d = camY - y; if (d <= 0.5) return 0; const s = f / d; P[0] = cx + (x * rx + z * rz) * s; P[1] = cy - (x * ux + z * uz) * s; P[2] = s; return d }
  const fog = d => clamp((d - FOG_NEAR) / (FOG_FAR - FOG_NEAR), 0, 1)
  const mix = (c, k, m) => `rgb(${Math.round(c[0] * m + (BG[0] - c[0] * m) * k)},${Math.round(c[1] * m + (BG[1] - c[1] * m) * k)},${Math.round(c[2] * m + (BG[2] - c[2] * m) * k)})`

  // stars
  g.fillStyle = 'rgba(191,208,255,0.8)'
  for (const s of T.stars) { if (project(s[0], s[1], s[2]) && P[0] >= 0 && P[0] < W && P[1] >= 0 && P[1] < H) g.fillRect(P[0], P[1], 1.4, 1.4) }
  // polar grid under the tower (y = -3)
  {
    const d = camY + 3, s = f / d
    g.strokeStyle = 'rgba(28,42,74,0.9)'; g.lineWidth = 1
    for (let i = 1; i <= 8; i++) { g.beginPath(); g.arc(cx, cy, 130 * i / 8 * s, 0, Math.PI * 2); g.stroke() }
    g.beginPath()
    for (let i = 0; i < 16; i++) { const th = i / 16 * Math.PI * 2; project(Math.cos(th) * 130, -3, Math.sin(th) * 130); g.moveTo(cx, cy); g.lineTo(P[0], P[1]) }
    g.stroke()
  }
  // era rings (only eras already reached)
  for (let e = 0; e <= curEra; e++) {
    const E = T.eras[e], d = camY - E.y; if (d <= 0.5) continue
    g.strokeStyle = `rgba(58,74,122,${0.4 * (1 - fog(d) * 0.7)})`; g.lineWidth = 1.2
    g.beginPath(); g.arc(cx, cy, (E.r + 2.5) * f / d, 0, Math.PI * 2); g.stroke()
  }
  // edges: crawl from the prerequisite, arrive when the target appears (additive, low opacity)
  g.globalCompositeOperation = 'lighter'; g.lineWidth = 1
  const N = T.nodes
  for (let c = 0; c < T.edges.length; c++) {
    const list = T.edges[c]; if (!list.length) continue
    const col = T.rgb[c]
    g.strokeStyle = `rgba(${col[0] >> 1},${col[1] >> 1},${col[2] >> 1},${0.3 * glow})`
    g.beginPath()
    for (const e of list) {
      if (t < e[2]) continue
      const p = e[3] <= 0 ? 1 : Math.min(1, (t - e[2]) / e[3])
      const A = N[e[0]], B = N[e[1]]
      const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, mz = (A[2] + B[2]) / 2
      const dist = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]), bend = Math.min(8, dist * 0.12), ml = Math.hypot(mx, mz) || 1
      const kx = mx - mx / ml * bend, ky = my, kz = mz - mz / ml * bend
      const steps = Math.max(1, Math.ceil(8 * p))
      let first = true
      for (let s = 0; s <= steps; s++) {
        const u = p * s / steps, iu = 1 - u
        const x = iu * iu * A[0] + 2 * iu * u * kx + u * u * B[0], y = iu * iu * A[1] + 2 * iu * u * ky + u * u * B[1], z = iu * iu * A[2] + 2 * iu * u * kz + u * u * B[2]
        if (!project(x, y, z)) { first = true; continue }
        if (first) { g.moveTo(P[0], P[1]); first = false } else g.lineTo(P[0], P[1])
      }
    }
    g.stroke()
  }
  g.globalCompositeOperation = 'source-over'
  // nodes (era-major order = far to near), polygons by importance, pop + flash on reveal
  const names = []
  for (let i = 0; i < N.length; i++) {
    const n = N[i], age = t - n[5]
    if (age < 0) continue
    const d = project(n[0], n[1], n[2]); if (!d) continue
    const imp = clamp(Math.round(n[4]), 1, 5)
    let size = (imp <= 1 ? 2.1 : 1.5) * (1.9 - (imp - 1) * 0.35)
    let flash = 0
    if (age < FLASH) { size *= pop(age / FLASH); flash = 1 - age / FLASH }
    const px = size * P[2]
    if (P[0] < -px || P[0] > W + px || P[1] < -px || P[1] > H + px) continue
    const k = fog(d), col = T.rgb[n[3]]
    if (px < 1.2) { g.fillStyle = mix(col, k, glow); g.fillRect(P[0] - 0.7, P[1] - 0.7, 1.4, 1.4) }
    else {
      const sides = SIDES[imp - 1], rot = n[7] + t * n[6]
      g.beginPath()
      for (let s = 0; s < sides; s++) { const th = rot + s / sides * Math.PI * 2; const x = P[0] + Math.cos(th) * px, y = P[1] + Math.sin(th) * px; if (s) g.lineTo(x, y); else g.moveTo(x, y) }
      g.closePath()
      g.fillStyle = flash > 0 ? `rgb(${Math.min(255, col[0] * (1 + flash * 12))},${Math.min(255, col[1] * (1 + flash * 12))},${Math.min(255, col[2] * (1 + flash * 12))})` : mix(col, k, 0.62 * glow)
      g.fill()
      if (px > 3) {
        // a lit facet: the half towards the light, lighter
        g.beginPath(); g.moveTo(P[0], P[1])
        for (let s = 0; s <= sides / 2; s++) { const th = rot + s / sides * Math.PI * 2; g.lineTo(P[0] + Math.cos(th) * px, P[1] + Math.sin(th) * px) }
        g.closePath(); g.fillStyle = flash > 0 ? 'rgba(255,255,255,0.5)' : `rgba(255,255,255,${0.16 * (1 - k)})`; g.fill()
        g.strokeStyle = `rgba(0,0,0,${0.35 * (1 - k)})`; g.lineWidth = 1; g.stroke()
      }
    }
    if (age < NAME_LIFE) names.push([i, P[0], P[1] - px - 4, Math.min(1, age / 0.15, (NAME_LIFE - age) / NAME_FADE), d, imp])
  }
  // era names: characters along the outside of each reached ring, both sides, spiralling per era
  g.textAlign = 'center'; g.textBaseline = 'middle'
  for (let e = 0; e <= curEra; e++) {
    const E = T.eras[e], R = E.r + 2.5 + 11, step = 3.6 / R, d0 = camY - E.y
    if (d0 <= 0.5) continue
    const px = clamp(3 * f / d0, 10, 64)
    g.font = `bold ${Math.round(px)}px "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif`
    g.shadowColor = 'rgba(80,140,255,0.85)'; g.shadowBlur = px / 5
    g.globalAlpha = 1 - fog(d0) * 0.6
    for (let side = 0; side < 2; side++) {
      const center = START_ANGLE + e * Math.PI * 0.367 + side * Math.PI, chars = [...E.name], startA = center - (chars.length - 1) / 2 * step
      chars.forEach((ch, i) => {
        const an = startA + i * step
        if (!project(Math.cos(an) * R, E.y, Math.sin(an) * R)) return
        g.lineWidth = px / 10; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.strokeText(ch, P[0], P[1]); g.fillStyle = '#dce8ff'; g.fillText(ch, P[0], P[1])
      })
    }
  }
  g.shadowBlur = 0; g.globalAlpha = 1
  // tech names of the last 2 seconds
  g.textBaseline = 'bottom'
  for (const [i, x, y, alpha, d, imp] of names) {
    const px = clamp((1.9 - imp * 0.2) * f / d, 16, 28) * H / 720
    g.font = `600 ${Math.round(px)}px "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif`
    g.globalAlpha = clamp(alpha, 0, 1)
    g.lineWidth = 3; g.strokeStyle = 'rgba(5,7,15,0.9)'; g.strokeText(T.names[i], x, y)
    g.fillStyle = '#f2f6ff'; g.fillText(T.names[i], x, y)
  }
  g.globalAlpha = 1
  // small caption: current era (bottom left), like the original's tour HUD-less frame
  const E = T.eras[curEra]
  g.textAlign = 'left'; g.textBaseline = 'alphabetic'
  g.font = `600 ${Math.round(H / 34)}px "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`; g.fillStyle = 'rgba(220,232,255,0.75)'
  g.fillText(`${E.name} · ${E.nameEn}`, W * 0.03, H * 0.95)
  g.font = `${Math.round(H / 52)}px ui-monospace, Consolas, monospace`; g.fillStyle = 'rgba(160,180,220,0.6)'
  g.fillText('Polytech Tree · github.com/secwind7/polytech-tree', W * 0.03, H * 0.95 + H / 30)
}
