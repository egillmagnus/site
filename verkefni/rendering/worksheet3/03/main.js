async function init() {
    if (!('gpu' in navigator)) { alert('WebGPU not supported'); return; }

    const canvas = document.getElementById('gfx');
    const context = canvas.getContext('webgpu');

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) { alert('No GPU adapter'); return; }
    const device = await adapter.requestDevice();
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'opaque' });

    // --- UI: gamma + shader selects ---
    const gammaSlider = document.getElementById('gammaSlider');
    const gammaValue = document.getElementById('gammaValue');
    const addrSel = document.getElementById('addrMode');
    const filterSel = document.getElementById('filterMode');
    const texSel = document.getElementById('texOn');

    let gamma = 2.2;
    let addrMode = addrSel ? parseInt(addrSel.value, 10) : 0;    // 0=clamp, 1=repeat
    let filterMode = filterSel ? parseInt(filterSel.value, 10) : 0; // 0=nearest, 1=linear
    let texturingOn = texSel ? parseInt(texSel.value, 10) : 1; // 1 on, 0 off

    function setGamma(g) {
        const min = parseFloat(gammaSlider.min), max = parseFloat(gammaSlider.max);
        gamma = Math.min(max, Math.max(min, g));
        gammaSlider.value = gamma.toFixed(2);
        gammaValue.textContent = gamma.toFixed(2);
        render();
    }
    gammaSlider.addEventListener('input', () => setGamma(parseFloat(gammaSlider.value)));
    if (addrSel) addrSel.addEventListener('change', () => { addrMode = parseInt(addrSel.value, 10); render(); });
    if (filterSel) filterSel.addEventListener('change', () => { filterMode = parseInt(filterSel.value, 10); render(); });
    if (texSel) texSel.addEventListener('change', () => { texturingOn = parseInt(texSel.value, 10); render(); });

    // --- Camera ---
    let eye = vec3(2.0, 1.5, 2.0);
    const at = vec3(0.0, 0.5, 0.0);
    const up = vec3(0.0, 1.0, 0.0);
    const W = normalize(subtract(at, eye));
    const U = normalize(cross(W, up));
    const V = normalize(cross(U, W));
    const zoom = 1.0;


    const aaMinus = document.getElementById('aaMinus');
    const aaPlus = document.getElementById('aaPlus');
    const aaValue = document.getElementById('aaValue');

    let subdiv = 1;           // 1..8 is plenty (i.e., up to 64 spp)
    const S_MAX = 8;
    function updateAAUI() { aaValue.textContent = `${subdiv}×${subdiv}`; }
    updateAAUI();

    if (aaMinus) aaMinus.addEventListener('click', () => { subdiv = Math.max(1, subdiv - 1); uploadJitters(); updateAAUI(); render(); });
    if (aaPlus) aaPlus.addEventListener('click', () => { subdiv = Math.min(S_MAX, subdiv + 1); uploadJitters(); updateAAUI(); render(); });
    // Pre-allocate for S_MAX×S_MAX samples (each sample is vec2<f32> = 8 bytes)
    const MAX_SAMPLES = S_MAX * S_MAX;                 // up to 64
    const JITTER_BYTES = MAX_SAMPLES * 2 * 4;          // 2 floats per sample
    // Round up a bit for safety; storage buffers don't need 256B alignment, but extra space is fine
    const jitterBuffer = device.createBuffer({
        size: Math.ceil(JITTER_BYTES / 256) * 256,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });

    function uploadJitters() {
        const arr = compute_jitters(subdiv);
        device.queue.writeBuffer(jitterBuffer, 0, arr.buffer, arr.byteOffset, arr.byteLength);
    }
    uploadJitters(); // initial
    // Returns Float32Array of length 2*N with offsets in [-0.5, 0.5]
    function compute_jitters(S) {
        const N = S * S;
        const out = new Float32Array(2 * N);
        let k = 0;
        for (let j = 0; j < S; ++j) {
            for (let i = 0; i < S; ++i) {
                // Stratified jitter: (i + rand)/S - 0.5
                const rx = Math.random();
                const ry = Math.random();
                const dx = (i + rx) / S - 0.5;
                const dy = (j + ry) / S - 0.5;
                out[k++] = dx;
                out[k++] = dy;
            }
        }
        return out;
    }
    // Dolly along look direction with scroll
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const notches = (e.deltaMode === WheelEvent.DOM_DELTA_LINE) ? e.deltaY : e.deltaY / 100;
        const d = Math.sign(notches) * Math.min(Math.abs(notches), 4) * 0.15;
        eye[0] += d * W[0];
        eye[1] += d * W[1];
        eye[2] += d * W[2];
        render();
    }, { passive: false });

    const uniformBuffer = device.createBuffer({
        size: 256,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    function writeUniforms() {
        const aspect = canvas.width / canvas.height;
        const invW = 1.0 / canvas.width;   // for jitter → NDC conversion

        const buf = new ArrayBuffer(96);
        const f32 = new Float32Array(buf);
        const u32 = new Uint32Array(buf);

        f32.set([eye[0], eye[1], eye[2], 1.0], 0);     // eye
        f32.set([U[0], U[1], U[2], 0.0], 4);           // U
        f32.set([V[0], V[1], V[2], 0.0], 8);           // V
        f32.set([W[0], W[1], W[2], 0.0], 12);          // W
        f32.set([aspect, zoom, gamma, invW], 16);      // note: _pad0 now holds invWidth
        u32[20] = (addrMode >>> 0);                 // addr
        u32[21] = (filterMode >>> 0);                 // filter
        u32[22] = (texturingOn >>> 0);                 // texturing on/off
        u32[23] = (subdiv * subdiv) >>> 0;             // sampleCount

        device.queue.writeBuffer(uniformBuffer, 0, buf);
    }


    // --- Pipeline ---
    const resp = await fetch('shader.wgsl');
    const wgsl = await resp.text();
    const module = device.createShaderModule({ code: wgsl });
    const texture = await load_texture(device, '../../common/grass.jpg');
    const pipeline = await device.createRenderPipelineAsync({
        layout: 'auto',
        vertex: { module, entryPoint: 'vsMain' },
        fragment: { module, entryPoint: 'fsMain', targets: [{ format }] },
        primitive: { topology: 'triangle-strip' },
    });
    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
            { binding: 1, resource: texture.createView() },
            { binding: 2, resource: { buffer: jitterBuffer } },  // NEW
        ],
    });

    function render() {
        writeUniforms();
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: context.getCurrentTexture().createView(),
                loadOp: 'clear',
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                storeOp: 'store',
            }],
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(4, 1, 0, 0);
        pass.end();
        device.queue.submit([encoder.finish()]);
    }

    setGamma(parseFloat(gammaSlider.value));
}

init();

async function load_texture(device, filename) {
    const response = await fetch(filename);
    const blob = await response.blob();
    const img = await createImageBitmap(blob, { colorSpaceConversion: 'none' });

    const texture = device.createTexture({
        size: [img.width, img.height, 1],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
    });

    device.queue.copyExternalImageToTexture(
        { source: img, flipY: true },
        { texture: texture },
        { width: img.width, height: img.height },
    );

    return texture;
}
