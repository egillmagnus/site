// globals
var canvas, gl;
var posTexA, posTexB, velTexA, velTexB;
var fbCompute;
var physicsProgram, renderProgram;
var quadVBO, uvVBO;

const PARTICLE_RES = 100;
const PARTICLE_COUNT = PARTICLE_RES * PARTICLE_RES;
const fixedDeltaTime = 0.016;

// ——— Helper to create an RGBA32F texture ———
function createTexture() {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F,
        PARTICLE_RES, PARTICLE_RES, 0,
        gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    return t;
}

// ——— Random initial particle data ———
function initGalaxyXY() {
    const pos = new Float32Array(PARTICLE_COUNT * 4);
    const vel = new Float32Array(PARTICLE_COUNT * 4);

    const G = 0.0001;    // gravitational constant
    const centralMass = 0;  // mass at the origin

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        // ——— Position in the XY plane ———
        const maxR = 1.0;
        const r = Math.sqrt(Math.random()) * maxR;
        const theta = Math.random() * 2 * Math.PI;
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);

        pos[i * 4 + 0] = x;
        pos[i * 4 + 1] = y;
        pos[i * 4 + 2] = 0.0;   // force z = 0
        pos[i * 4 + 3] = 1.0;

        // ——— Tangential velocity in XY ———
        // v = sqrt(G M / r)
        const speed = r > 0
            ? Math.sqrt(G * centralMass / r) + 0.0001
            : 100000;

        // tangent to (x, y) is (−y, x)
        let tx = -y, ty = x;
        const len = Math.hypot(tx, ty);
        if (len > 0) {
            tx /= len;
            ty /= len;
        }

        vel[i * 4 + 0] = tx * speed * 1000;
        vel[i * 4 + 1] = ty * speed * 1000;
        vel[i * 4 + 2] = 0.0;   // no Z velocity
        vel[i * 4 + 3] = 0.0;
    }

    return { pos, vel };
}

// ——— Shader boilerplate ———
function createShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(s));
    return s;
}
function createProgram(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, createShader(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, createShader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(p));
    return p;
}

// ——— Physics “compute” shaders ———
const quadVS = `#version 300 es
in vec2 aPos;
out vec2 vUV;
void main(){
  vUV = aPos*0.5 + 0.5;
  gl_Position = vec4(aPos,0,1);
}`;
const physicsFS = `#version 300 es
precision highp float;
in vec2 vUV;
layout(location=0) out vec4 outPos;
layout(location=1) out vec4 outVel;
uniform sampler2D uPosTex, uVelTex;
uniform float uDeltaTime, uGravity;
#define R ${PARTICLE_RES}.0
void main(){
  vec3 pos = texture(uPosTex,vUV).xyz;
  vec3 vel = texture(uVelTex,vUV).xyz;
  vec3 acc = vec3(0.0);
  for(float i=0.; i<R; i++){
    for(float j=0.; j<R; j++){
      vec2 uv = vec2(i,j)/R;
      vec3 other = texture(uPosTex,uv).xyz;
      vec3 d = other-pos;
      float d2 = dot(d,d)+0.01;
      acc += uGravity * d/(d2*sqrt(d2));
    }
  }
  vel += acc*uDeltaTime;
  pos += vel*uDeltaTime;
  outPos = vec4(pos,1);
  outVel = vec4(vel,0);
}`;

// ——— Render shaders ———
const renderVS = `#version 300 es
precision highp float;
in vec2 aUV;
uniform sampler2D uPosTex;
uniform mat4 uVP;
void main(){
  vec3 p = texture(uPosTex,aUV).xyz;
  gl_Position = uVP * vec4(p,1);
  gl_PointSize = 2.0;
}`;
const renderFS = `#version 300 es
precision highp float;
out vec4 o;
void main(){ o = vec4(1); }`;

// ——— Simulation state ———
let pingPong = true;
let lastTime = performance.now();
let accumulator = 0;

// ——— Initialize everything ———
window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext("webgl2");
    gl.getExtension("EXT_color_buffer_float");
    gl.enable(gl.DEPTH_TEST);

    // textures
    posTexA = createTexture();
    posTexB = createTexture();
    velTexA = createTexture();
    velTexB = createTexture();

    // upload initial data (A-set)
    const { pos, vel } = initGalaxyXY();
    gl.bindTexture(gl.TEXTURE_2D, posTexA);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, PARTICLE_RES, PARTICLE_RES,
        gl.RGBA, gl.FLOAT, pos);
    gl.bindTexture(gl.TEXTURE_2D, velTexA);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, PARTICLE_RES, PARTICLE_RES,
        gl.RGBA, gl.FLOAT, vel);

    // single compute‐FBO
    fbCompute = gl.createFramebuffer();

    // compile
    physicsProgram = createProgram(quadVS, physicsFS);
    renderProgram = createProgram(renderVS, renderFS);

    // fullscreen quad VBO
    quadVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW);

    // UV buffer for particles
    uvVBO = gl.createBuffer();
    const uvs = [];
    for (let y = 0; y < PARTICLE_RES; y++) {
        for (let x = 0; x < PARTICLE_RES; x++) {
            uvs.push(x / PARTICLE_RES, y / PARTICLE_RES);
        }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, uvVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
    setCanvasSize(canvas)

    requestAnimationFrame(loop);
};

// ——— Simulation step (ping-pong) ———
function simulate(dt) {
    gl.useProgram(physicsProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
    let loc = gl.getAttribLocation(physicsProgram, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    // bind inputs
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pingPong ? posTexA : posTexB);
    gl.uniform1i(gl.getUniformLocation(physicsProgram, "uPosTex"), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, pingPong ? velTexA : velTexB);
    gl.uniform1i(gl.getUniformLocation(physicsProgram, "uVelTex"), 1);

    gl.uniform1f(gl.getUniformLocation(physicsProgram, "uDeltaTime"), dt);
    gl.uniform1f(gl.getUniformLocation(physicsProgram, "uGravity"), 0.0001);

    // attach outputs
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbCompute);
    const pT = pingPong ? posTexB : posTexA;
    const vT = pingPong ? velTexB : velTexA;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pT, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, vT, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);

    // sanity check
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        console.error("Incomplete FBO");
    }

    gl.viewport(0, 0, PARTICLE_RES, PARTICLE_RES);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

// ——— Render pass ———
function renderParticles() {
    gl.useProgram(renderProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, uvVBO);
    let loc = gl.getAttribLocation(renderProgram, "aUV");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pingPong ? posTexB : posTexA);
    gl.uniform1i(gl.getUniformLocation(renderProgram, "uPosTex"), 0);

    // build VP with MV.js
    const proj = perspective(60, canvas.width / canvas.height, 0.1, 100);
    const view = translate(0, 0, -5);
    const vp = mult(proj, view);
    gl.uniformMatrix4fv(
        gl.getUniformLocation(renderProgram, "uVP"),
        false,
        flatten(vp)
    );

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, PARTICLE_COUNT);
}

// ——— Main loop with fixed‐timestep accumulator ———
function loop(now) {
    const delta = (now - lastTime) / 1000;
    lastTime = now;
    accumulator += delta;

    while (accumulator >= fixedDeltaTime) {
        simulate(fixedDeltaTime);
        accumulator -= fixedDeltaTime;
        pingPong = !pingPong;
    }

    renderParticles();
    requestAnimationFrame(loop);
}

function setCanvasSize(canvas) {
    var size = Math.min(window.innerWidth * 0.95, window.innerHeight * 0.8);

    var dpr = window.devicePixelRatio || 1;

    canvas.width = size * dpr;
    canvas.height = size * dpr;

    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';

    if (gl) {
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
}