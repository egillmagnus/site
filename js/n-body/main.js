// main.js - WebGL2 N-body with Barnes-Hut quadtree
// Requires MV.js (for perspective, translate, mult, flatten)

// Globals
let canvas, gl;
let posTexA, posTexB, velTexA, velTexB;
let fbCompute;
let nodeTex;
let physicsProgram, renderProgram;
let quadVBO, uvVBO;

// Quadtree for Barnes-Hut (2D)
class QuadNode {
    constructor(x0, y0, x1, y1) {
        this.x0 = x0; this.y0 = y0; this.x1 = x1; this.y1 = y1;
        this.mass = 0; this.comX = 0; this.comY = 0;
        this.particle = null;
        this.children = [null, null, null, null];
    }
    insert(px, py, m = 1) {
        // Empty leaf: store particle
        if (this.particle === null && this.children[0] === null) {
            this.particle = { x: px, y: py, m };
            this.mass = m;
            this.comX = px;
            this.comY = py;
            return;
        }
        // Same-position leaf: accumulate mass
        if (this.children[0] === null && this.particle) {
            const p = this.particle;
            if (Math.abs(p.x - px) < 1e-6 && Math.abs(p.y - py) < 1e-6) {
                const totalM = p.m + m;
                this.mass = totalM;
                this.comX = (p.x * p.m + px * m) / totalM;
                this.comY = (p.y * p.m + py * m) / totalM;
                this.particle.m = totalM;
                return;
            }
        }
        // Subdivide if this is still a leaf
        if (this.children[0] === null) this.subdivide();
        // Re-insert existing particle
        if (this.particle) {
            const p = this.particle;
            this.particle = null;
            this._insertChild(p.x, p.y, p.m);
        }
        // Insert new particle
        this._insertChild(px, py, m);
        // Update mass and center of mass
        let sumM = 0, sumX = 0, sumY = 0;
        for (const c of this.children) {
            if (c && c.mass > 0) {
                sumM += c.mass;
                sumX += c.comX * c.mass;
                sumY += c.comY * c.mass;
            }
        }
        this.mass = sumM;
        this.comX = sumX / sumM;
        this.comY = sumY / sumM;
    }
    subdivide() {
        const width = this.x1 - this.x0;
        const height = this.y1 - this.y0;
        if (width < 1e-6 || height < 1e-6) return;
        const mx = 0.5 * (this.x0 + this.x1);
        const my = 0.5 * (this.y0 + this.y1);
        // NW
        this.children[0] = new QuadNode(this.x0, my, mx, this.y1);
        // NE
        this.children[1] = new QuadNode(mx, my, this.x1, this.y1);
        // SW
        this.children[2] = new QuadNode(this.x0, this.y0, mx, my);
        // SE
        this.children[3] = new QuadNode(mx, this.y0, this.x1, my);
    }
    _insertChild(px, py, m) {
        const mx = 0.5 * (this.x0 + this.x1);
        const my = 0.5 * (this.y0 + this.y1);
        const idx = (px < mx ? 0 : 1) + (py < my ? 2 : 0);
        this.children[idx].insert(px, py, m);
    }
}

// Settings
const PARTICLE_RES = 128;                // e.g. 128×128 =16384 particles
const PARTICLE_COUNT = PARTICLE_RES * PARTICLE_RES;
const fixedDeltaTime = 0.016;
const theta = 0.5;                // opening angle
const centralMass = 100.0;
const Gconst = 1.0;

// Helper: create float texture
function createTexture32() {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, PARTICLE_RES, PARTICLE_RES, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    return t;
}

// Build quadtree from positions
function buildTree(posArr) {
    const root = new QuadNode(-1, -1, 1, 1);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const x = posArr[i * 4], y = posArr[i * 4 + 1];
        root.insert(x, y, 1);
    }
    return root;
}

// Flatten nodes for GPU
function flattenTree(root) {
    const out = [];
    function recurse(n) {
        if (!n || n.mass === 0) return;
        out.push(n.mass, n.comX, n.comY);
        if (n.children[0]) n.children.forEach(recurse);
    }
    recurse(root);
    return out;
}

// Upload node list texture (RGB array)
function updateNodeTexture(nodeList) {
    const count = nodeList.length / 3;
    const size = Math.ceil(Math.sqrt(count));
    const data = new Float32Array(size * size * 3);
    data.set(nodeList);
    if (!nodeTex) nodeTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, nodeTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB32F, size, size, 0, gl.RGB, gl.FLOAT, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    return { size, count };
}

// Init data arrays
function initData() {
    const p = new Float32Array(PARTICLE_COUNT * 4);
    const v = new Float32Array(PARTICLE_COUNT * 4);
    // simple random in disk
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const r = Math.sqrt(Math.random()), th = Math.random() * 2 * Math.PI;
        const x = r * Math.cos(th), y = r * Math.sin(th);
        p.set([x, y, 0, 1], i * 4);
        // circular vel
        const speed = Math.sqrt(Gconst * centralMass / (r || 1));
        const tx = -y, ty = x, L = Math.hypot(tx, ty) || 1;
        v.set([tx / L * speed, ty / L * speed, 0, 0], i * 4);
    }
    return { pos: p, vel: v };
}

// Shader sources
const quadVS = `#version 300 es
in vec2 aPos; out vec2 vUV; void main(){ vUV=aPos*0.5+0.5; gl_Position=vec4(aPos,0,1); }`;
const physicsFS = `#version 300 es
precision highp float;
in vec2 vUV;
layout(location=0) out vec4 outP;
layout(location=1) out vec4 outV;
uniform sampler2D uPosTex, uVelTex, uNodeTex;
uniform int uNodeCount, uNodeTexSize;
uniform float uDt, uG;
void main(){ vec2 uv=vUV;
  vec3 pos=texture(uPosTex,uv).xyz;
  vec3 vel=texture(uVelTex,uv).xyz;
  vec2 acc=vec2(0);
  for(int i=0;i<uNodeCount;i++){
    int x=i%uNodeTexSize, y=i/uNodeTexSize;
    vec3 data = texture(uNodeTex,(vec2(x,y)+0.5)/float(uNodeTexSize)).rgb;
    float m=data.x; vec2 com=data.yz;
    vec2 d=com-pos.xy; float d2=dot(d,d)+0.01;
    acc += uG*m*d/(d2*sqrt(d2));
  }
  vel.xy += acc*uDt; pos.xy += vel.xy*uDt;
  outP=vec4(pos,1); outV=vec4(vel,0);
}`;
const renderVS = `#version 300 es
precision highp float;
in vec2 aUV; uniform sampler2D uPosTex; uniform mat4 uVP;
void main(){ vec3 p=texture(uPosTex,aUV).xyz; gl_Position=uVP*vec4(p,1); gl_PointSize=1.5; }`;
const renderFS = `#version 300 es
precision highp float; out vec4 o; void main(){ o=vec4(1); }`;

// Compile
function createShader(t, s) {
    const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(sh); return sh;
}
function createProg(v, f) {
    const p = gl.createProgram(); gl.attachShader(p, createShader(gl.VERTEX_SHADER, v)); gl.attachShader(p, createShader(gl.FRAGMENT_SHADER, f)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw gl.getProgramInfoLog(p); return p;
}

// Simulation state
let ping = true, last = 0, acc = 0;
let nodeCount, nodeTexSize;

function simulateStep(dt) {
    // build tree and upload nodes:
    const posData = new Float32Array(PARTICLE_COUNT * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbCompute);
    // read posTexA or posTexB into CPU array
    gl.bindTexture(gl.TEXTURE_2D, ping ? posTexA : posTexB);
    gl.readPixels(0, 0, PARTICLE_RES, PARTICLE_RES, gl.RGBA, gl.FLOAT, posData);
    const root = buildTree(posData);
    const nodeList = flattenTree(root);
    ({ size: nodeTexSize, count: nodeCount } = updateNodeTexture(nodeList));

    // run physics shader
    gl.useProgram(physicsProgram);
    // bind quad, inputs, uniforms...
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
    const locA = gl.getAttribLocation(physicsProgram, "aPos"); gl.enableVertexAttribArray(locA);
    gl.vertexAttribPointer(locA, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, ping ? posTexA : posTexB);
    gl.uniform1i(gl.getUniformLocation(physicsProgram, 'uPosTex'), 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, ping ? velTexA : velTexB);
    gl.uniform1i(gl.getUniformLocation(physicsProgram, 'uVelTex'), 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, nodeTex);
    gl.uniform1i(gl.getUniformLocation(physicsProgram, 'uNodeTex'), 2);
    gl.uniform1i(gl.getUniformLocation(physicsProgram, 'uNodeCount'), nodeCount);
    gl.uniform1i(gl.getUniformLocation(physicsProgram, 'uNodeTexSize'), nodeTexSize);
    gl.uniform1f(gl.getUniformLocation(physicsProgram, 'uDt'), dt);
    gl.uniform1f(gl.getUniformLocation(physicsProgram, 'uG'), Gconst);
    // attach outputs and draw
    const pT = ping ? posTexB : posTexA, vT = ping ? velTexB : velTexA;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pT, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, vT, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.viewport(0, 0, PARTICLE_RES, PARTICLE_RES);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function renderParticles() {
    gl.useProgram(renderProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, uvVBO);
    const loc = gl.getAttribLocation(renderProgram, 'aUV'); gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, ping ? posTexB : posTexA);
    gl.uniform1i(gl.getUniformLocation(renderProgram, 'uPosTex'), 0);
    const proj = perspective(60, canvas.width / canvas.height, 0.1, 100);
    const vp = mult(proj, translate(0, 0, -5));
    gl.uniformMatrix4fv(gl.getUniformLocation(renderProgram, 'uVP'), false, flatten(vp));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, PARTICLE_COUNT);
}

// Main loop
function loop(now) {
    if (!last) last = now;
    const dtSec = (now - last) / 1000; last = now;
    acc += dtSec;
    while (acc >= fixedDeltaTime) { simulateStep(fixedDeltaTime); acc -= fixedDeltaTime; ping = !ping; }
    renderParticles();
    requestAnimationFrame(loop);
}

// Entry
window.onload = function () {
    canvas = document.getElementById('gl-canvas');
    gl = canvas.getContext('webgl2'); if (!gl) alert('WebGL2 unavailable');
    gl.getExtension('EXT_color_buffer_float'); gl.enable(gl.DEPTH_TEST);
    // create ping-pong textures
    posTexA = createTexture32(); posTexB = createTexture32(); velTexA = createTexture32(); velTexB = createTexture32();
    fbCompute = gl.createFramebuffer();
    // init data
    const { pos, vel } = initData();
    gl.bindTexture(gl.TEXTURE_2D, posTexA); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, PARTICLE_RES, PARTICLE_RES, gl.RGBA, gl.FLOAT, pos);
    gl.bindTexture(gl.TEXTURE_2D, velTexA); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, PARTICLE_RES, PARTICLE_RES, gl.RGBA, gl.FLOAT, vel);
    // compile shaders
    physicsProgram = createProg(quadVS, physicsFS);
    renderProgram = createProg(renderVS, renderFS);
    // VBOs
    quadVBO = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    uvVBO = gl.createBuffer(); const uvs = [];
    for (let y = 0; y < PARTICLE_RES; y++) for (let x = 0; x < PARTICLE_RES; x++) uvs.push(x / PARTICLE_RES, y / PARTICLE_RES);
    gl.bindBuffer(gl.ARRAY_BUFFER, uvVBO); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
    // start loop
    requestAnimationFrame(loop);
};
