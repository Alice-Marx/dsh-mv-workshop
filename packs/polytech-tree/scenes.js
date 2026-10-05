// Polytech Tree · 人类科技树漫游 — a true WebGL2 scene for dsh-mv (canvas.output "webgl").
// Original: https://github.com/secwind7/polytech-tree (commit 51d6e1f5141e) — © 2026 secwind, code MIT (LICENSE.txt);
// data (canvas.assets, precomputed by build.mjs from data/*.json): CC BY 4.0, see data/NOTICE.md.
// Adapted for dsh-mv by Alice-Marx: the original Three.js tour schedule and tower layout are rendered as
// GPU-instanced 3D polyhedra, animated prerequisite edges and era rings inside the sandboxed scene Worker.

const LEAD = 130, FOV_MARGIN = 1.1, FOV_MIN = 45, FOV_MAX = 125
const ROLL = 0.03, START_ANGLE = Math.PI * 0.25, FLASH = 0.5, OUTRO = 5
let T = null

const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
const smooth = x => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t) }

function rgb(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function compile(gl, type, source) {
  const value = gl.createShader(type)
  gl.shaderSource(value, source)
  gl.compileShader(value)
  if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) throw new Error(`WebGL shader: ${gl.getShaderInfoLog(value) || 'compile failed'}`)
  return value
}

function link(gl, vertex, fragment) {
  const value = gl.createProgram()
  gl.attachShader(value, compile(gl, gl.VERTEX_SHADER, vertex))
  gl.attachShader(value, compile(gl, gl.FRAGMENT_SHADER, fragment))
  gl.linkProgram(value)
  if (!gl.getProgramParameter(value, gl.LINK_STATUS)) throw new Error(`WebGL program: ${gl.getProgramInfoLog(value) || 'link failed'}`)
  return value
}

function attribute(gl, program, name, width, values, divisor) {
  const location = gl.getAttribLocation(program, name)
  if (location < 0) return null
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, values instanceof Float32Array ? values : new Float32Array(values), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(location)
  gl.vertexAttribPointer(location, width, gl.FLOAT, false, 0, 0)
  if (divisor) gl.vertexAttribDivisor(location, divisor)
  return buffer
}

function uniforms(gl, program) {
  return {
    time: gl.getUniformLocation(program, 'uTime'), camY: gl.getUniformLocation(program, 'uCamY'),
    tanHalf: gl.getUniformLocation(program, 'uTanHalf'), aspect: gl.getUniformLocation(program, 'uAspect'),
    roll: gl.getUniformLocation(program, 'uRoll'), energy: gl.getUniformLocation(program, 'uEnergy'),
  }
}

const CAMERA_GLSL = `
uniform float uCamY, uTanHalf, uAspect, uRoll;
vec4 projectWorld(vec3 world) {
  float depth = uCamY - world.y;
  float cr = cos(uRoll), sr = sin(uRoll);
  float sx = -sr * world.x + cr * world.z;
  float sy = -(cr * world.x + sr * world.z);
  float nearZ = 0.5, farZ = 1400.0;
  float z = ((farZ + nearZ) / (farZ - nearZ)) * depth - (2.0 * farZ * nearZ) / (farZ - nearZ);
  return vec4(sx / (uTanHalf * uAspect), sy / uTanHalf, z, max(depth, 0.001));
}`

const NODE_VERTEX = `#version 300 es
precision highp float;
in vec3 aPosition;
in vec3 aNormal;
in vec3 iPosition;
in vec3 iColor;
in vec4 iMeta;
uniform float uTime, uEnergy;
${CAMERA_GLSL}
out vec3 vColor;
out vec3 vNormal;
out float vFlash;
out float vVisible;
float ease(float x) { x = clamp(x, 0.0, 1.0); return x * x * (3.0 - 2.0 * x); }
float pop(float x) { return x < 0.35 ? 2.5 * ease(x / 0.35) : 1.0 + 1.5 * (1.0 - ease((x - 0.35) / 0.65)); }
void main() {
  float age = uTime - iMeta.y;
  if (age < 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vVisible = 0.0; return; }
  float angle = iMeta.w + uTime * iMeta.z;
  float ca = cos(angle), sa = sin(angle), cb = cos(angle * 0.37), sb = sin(angle * 0.37);
  mat3 ry = mat3(ca, 0.0, -sa, 0.0, 1.0, 0.0, sa, 0.0, ca);
  mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, cb, sb, 0.0, -sb, cb);
  float importanceScale = 1.9 - (iMeta.x - 1.0) * 0.35;
  float base = iMeta.x <= 1.0 ? 2.1 : 1.5;
  float born = age < ${FLASH.toFixed(1)} ? pop(age / ${FLASH.toFixed(1)}) : 1.0;
  vec3 local = ry * rx * aPosition * base * importanceScale * born;
  gl_Position = projectWorld(iPosition + local);
  vNormal = normalize(ry * rx * aNormal);
  vColor = iColor * (1.0 + uEnergy * 0.3);
  vFlash = age < ${FLASH.toFixed(1)} ? 1.0 - age / ${FLASH.toFixed(1)} : 0.0;
  vVisible = 1.0;
}`

const NODE_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vColor;
in vec3 vNormal;
in float vFlash;
in float vVisible;
out vec4 outColor;
void main() {
  if (vVisible < 0.5) discard;
  vec3 light = normalize(vec3(-0.35, 0.75, 0.55));
  float diffuse = 0.26 + max(0.0, dot(normalize(vNormal), light)) * 0.74;
  vec3 color = mix(vColor * diffuse, vec3(1.0), clamp(vFlash * 0.9, 0.0, 0.9));
  outColor = vec4(color, 1.0);
}`

const LINE_VERTEX = `#version 300 es
precision highp float;
in vec3 aFrom;
in vec3 aTo;
in vec3 aColor;
in vec3 aTiming;
uniform float uTime, uEnergy;
${CAMERA_GLSL}
out vec3 vColor;
out float vVisible;
void main() {
  float start = aTiming.x, span = aTiming.y, endpoint = aTiming.z;
  float progress = span <= 0.0 ? step(start, uTime) : clamp((uTime - start) / span, 0.0, 1.0);
  if (uTime < start) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vVisible = 0.0; return; }
  gl_Position = projectWorld(mix(aFrom, aTo, endpoint * progress));
  vColor = aColor * (0.55 + uEnergy * 0.35);
  vVisible = 1.0;
}`

const LINE_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vColor;
in float vVisible;
out vec4 outColor;
void main() { if (vVisible < 0.5) discard; outColor = vec4(vColor, 0.48); }`

function octahedron() {
  const p = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
  const faces = [[2, 0, 4], [2, 4, 1], [2, 1, 5], [2, 5, 0], [3, 4, 0], [3, 1, 4], [3, 5, 1], [3, 0, 5]]
  const positions = [], normals = []
  for (const face of faces) {
    const a = p[face[0]], b = p[face[1]], c = p[face[2]]
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2]
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
    const length = Math.hypot(nx, ny, nz) || 1; nx /= length; ny /= length; nz /= length
    for (const index of face) { positions.push(...p[index]); normals.push(nx, ny, nz) }
  }
  return { positions, normals, count: positions.length / 3 }
}

function buildNodes(gl, nodes, colors) {
  const program = link(gl, NODE_VERTEX, NODE_FRAGMENT)
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao)
  const shape = octahedron()
  attribute(gl, program, 'aPosition', 3, shape.positions, 0)
  attribute(gl, program, 'aNormal', 3, shape.normals, 0)
  const positions = [], tint = [], meta = []
  for (const node of nodes) {
    positions.push(node[0], node[1], node[2])
    tint.push(...colors[node[3]])
    meta.push(node[4], node[5], node[6], node[7])
  }
  attribute(gl, program, 'iPosition', 3, positions, 1)
  attribute(gl, program, 'iColor', 3, tint, 1)
  attribute(gl, program, 'iMeta', 4, meta, 1)
  gl.bindVertexArray(null)
  return { program, vao, uniforms: uniforms(gl, program), vertices: shape.count, instances: nodes.length }
}

function pushLine(data, from, to, color, start, span) {
  for (let end = 0; end < 2; end++) {
    data.from.push(...from); data.to.push(...to); data.color.push(...color); data.timing.push(start, span, end)
  }
}

function buildLines(gl, nodes, edges, eras, colors) {
  const data = { from: [], to: [], color: [], timing: [] }
  for (const edge of edges) {
    const a = nodes[edge[0]], b = nodes[edge[1]], color = colors[b[3]]
    pushLine(data, [a[0], a[1], a[2]], [b[0], b[1], b[2]], color, edge[2], edge[3])
  }
  const segments = 96
  for (const era of eras) {
    const color = [0.18, 0.28, 0.5]
    for (let i = 0; i < segments; i++) {
      const a = i / segments * Math.PI * 2, b = (i + 1) / segments * Math.PI * 2, radius = era.r + 2.5
      pushLine(data, [Math.cos(a) * radius, era.y, Math.sin(a) * radius], [Math.cos(b) * radius, era.y, Math.sin(b) * radius], color, era.start, 0)
    }
  }
  const program = link(gl, LINE_VERTEX, LINE_FRAGMENT)
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao)
  attribute(gl, program, 'aFrom', 3, data.from, 0)
  attribute(gl, program, 'aTo', 3, data.to, 0)
  attribute(gl, program, 'aColor', 3, data.color, 0)
  attribute(gl, program, 'aTiming', 3, data.timing, 0)
  gl.bindVertexArray(null)
  return { program, vao, uniforms: uniforms(gl, program), vertices: data.from.length / 3 }
}

function setup(info, gl) {
  const assets = info && info.assets
  if (!gl) throw new Error('Polytech Tree needs WebGL2.')
  if (!assets || !assets.tower || !assets.nodes || !assets.edges) throw new Error('Polytech Tree data is missing from canvas.assets.')
  const eras = assets.tower.eras, nodes = assets.nodes.nodes, colors = assets.tower.categories.map(category => rgb(category.color))
  T = {
    eras, nodes, colors, eraEnd: eras.map(era => era.start + era.dur),
    nodesGpu: buildNodes(gl, nodes, colors), linesGpu: buildLines(gl, nodes, assets.edges.edges, eras, colors),
  }
  gl.enable(gl.DEPTH_TEST)
  gl.depthFunc(gl.LEQUAL)
  gl.enable(gl.CULL_FACE)
  gl.cullFace(gl.BACK)
}

function eraOf(t) {
  for (let index = 0; index < T.eraEnd.length; index++) if (t < T.eraEnd[index]) return index
  return T.eraEnd.length - 1
}

function trackY(t) {
  const top = T.eras.length - 1, index = eraOf(t), era = T.eras[index]
  const u = era.dur > 0 ? clamp((t - era.start) / era.dur, 0, 1) : 1
  const next = index < top ? T.eras[index + 1].y : T.eras[top].y + (T.eras[top].y - T.eras[top - 1].y)
  return era.y + (next - era.y) * smooth(u)
}

function radiusAtY(y) {
  const eras = T.eras
  if (y <= eras[0].y) return eras[0].r
  for (let index = 0; index < eras.length - 1; index++) {
    if (y <= eras[index + 1].y) return eras[index].r + (eras[index + 1].r - eras[index].r) * (y - eras[index].y) / (eras[index + 1].y - eras[index].y)
  }
  return eras[eras.length - 1].r
}

function camera(t, width, height) {
  const top = T.eras.length - 1, end = T.eraEnd[top], y = trackY(Math.min(t, end))
  const outro = t > end ? smooth((t - end) / OUTRO) : 0
  const fov = clamp(2 * Math.atan(FOV_MARGIN * radiusAtY(y) / LEAD) * 180 / Math.PI + outro * 12, FOV_MIN, FOV_MAX) * Math.PI / 180
  return { camY: y + LEAD + outro * 160, tanHalf: Math.tan(fov / 2), aspect: width / Math.max(1, height), roll: START_ANGLE + t * ROLL }
}

function setFrameUniforms(gl, target, frame, t, energy) {
  gl.uniform1f(target.uniforms.time, t)
  gl.uniform1f(target.uniforms.camY, frame.camY)
  gl.uniform1f(target.uniforms.tanHalf, frame.tanHalf)
  gl.uniform1f(target.uniforms.aspect, frame.aspect)
  gl.uniform1f(target.uniforms.roll, frame.roll)
  gl.uniform1f(target.uniforms.energy, energy)
}

function paint(gl, t, width, height, ctx) {
  if (!T) return
  const frame = camera(t, width, height), energy = clamp((ctx && ctx.energy) || 0, 0, 1)
  gl.viewport(0, 0, width, height)
  gl.clearColor(0.018, 0.025, 0.058, 1)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  const lines = T.linesGpu
  gl.useProgram(lines.program); gl.bindVertexArray(lines.vao); setFrameUniforms(gl, lines, frame, t, energy)
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.depthMask(false); gl.disable(gl.CULL_FACE)
  gl.drawArrays(gl.LINES, 0, lines.vertices)

  const nodes = T.nodesGpu
  gl.useProgram(nodes.program); gl.bindVertexArray(nodes.vao); setFrameUniforms(gl, nodes, frame, t, energy)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(true); gl.enable(gl.CULL_FACE)
  gl.drawArraysInstanced(gl.TRIANGLES, 0, nodes.vertices, nodes.instances)
  gl.bindVertexArray(null)
}
