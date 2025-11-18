async function init() {
    if (!('gpu' in navigator)) { alert('WebGPU not supported'); return; }

    const canvas = document.getElementById('gfx');
    canvas.width = 512;
    canvas.height = 512;

    const context = canvas.getContext('webgpu');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) { alert('No GPU adapter'); return; }

    const requiredFeatures = [];
    if (adapter.features && adapter.features.has('timestamp-query')) {
        requiredFeatures.push('timestamp-query');
    }
    const device = await adapter.requestDevice({ requiredFeatures });
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'opaque' });

    // Create TimingHelper
    const timingHelper = new TimingHelper(device);
    const frameTimeDisplay = document.getElementById('frameTime');

    // UI: gamma
    const gammaSlider = document.getElementById('gammaSlider');
    const gammaValue = document.getElementById('gammaValue');
    let gamma = 1.0;

    function setGamma(g) {
        const min = parseFloat(gammaSlider.min), max = parseFloat(gammaSlider.max);
        gamma = Math.min(max, Math.max(min, g));
        gammaSlider.value = gamma.toFixed(2);
        gammaValue.textContent = gamma.toFixed(2);
        render();
    }
    gammaSlider.addEventListener('input', () => setGamma(parseFloat(gammaSlider.value)));
    // === Progressive accumulation controls ===
    let frame = 0;
    let accumulate = true;

    const frameCounter = document.getElementById('frameCounter');
    const accumulateToggle = document.getElementById('accumulateToggle');
    const resetButton = document.getElementById('resetButton');
    const bgToggle = document.getElementById('bgToggle');
    let blueBackground = false;

    if (bgToggle) {
        bgToggle.checked = blueBackground;
        bgToggle.addEventListener('change', () => {
            blueBackground = bgToggle.checked;
            frame = 0;
        });
    }

    if (accumulateToggle) {
        accumulateToggle.checked = accumulate;
        accumulateToggle.addEventListener('change', () => {
            accumulate = accumulateToggle.checked;
        });
    }

    if (resetButton) {
        resetButton.addEventListener('click', () => {
            frame = 0;
        });
    }

    function updateFrameCounter() {
        if (frameCounter) frameCounter.textContent = `Frame: ${frame}`;
    }

    let eye = vec3(277.0, 275.0, -570.0);
    const at = vec3(277.0, 275.0, 0.0);
    const up = vec3(0.0, 1.0, 0.0);
    const W = normalize(subtract(at, eye));
    const U = normalize(cross(W, up));
    const V = normalize(cross(U, W));
    const zoom = 2.0;

    // Jitter AA UI
    const aaMinus = document.getElementById('aaMinus');
    const aaPlus = document.getElementById('aaPlus');
    const aaValue = document.getElementById('aaValue');
    let subdiv = 1;
    const S_MAX = 8;

    function updateAAUI() { aaValue.textContent = `${subdiv}×${subdiv}`; }
    updateAAUI();

    if (aaMinus) aaMinus.addEventListener('click', () => {
        subdiv = Math.max(1, subdiv - 1);
        uploadJitters();
        updateAAUI();
        render();
    });
    if (aaPlus) aaPlus.addEventListener('click', () => {
        subdiv = Math.min(S_MAX, subdiv + 1);
        uploadJitters();
        updateAAUI();
        render();
    });

    // Jitter buffer
    const MAX_SAMPLES = S_MAX * S_MAX;
    const JITTER_BYTES = MAX_SAMPLES * 2 * 4;
    const jitterBuffer = device.createBuffer({
        size: Math.ceil(JITTER_BYTES / 256) * 256,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });

    function compute_jitters(S) {
        const N = S * S;
        const out = new Float32Array(2 * N);
        let k = 0;
        for (let j = 0; j < S; ++j) {
            for (let i = 0; i < S; ++i) {
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

    function uploadJitters() {
        const arr = compute_jitters(subdiv);
        device.queue.writeBuffer(jitterBuffer, 0, arr.buffer, arr.byteOffset, arr.byteLength);
    }
    uploadJitters();

    // Dolly with mouse wheel
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const notches = (e.deltaMode === WheelEvent.DOM_DELTA_LINE) ? e.deltaY : e.deltaY / 100;
        const d = Math.sign(notches) * Math.min(Math.abs(notches), 4) * 5;
        eye[0] += d * W[0];
        eye[1] += d * W[1];
        eye[2] += d * W[2];
        frame = 0;
        updateFrameCounter();
        render();
    }, { passive: false });


    // Uniforms
    const uniformBuffer = device.createBuffer({
        size: 512,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    function writeUniforms() {
        const aspect = canvas.width / canvas.height;
        var invW = 1.0 / canvas.width;

        if (blueBackground) {
            invW = -invW;
        }

        // Camera buffer is 96 bytes float section + 4 u32s at the end in your layout.
        const buf = new ArrayBuffer(96);
        const f32 = new Float32Array(buf);
        const u32 = new Uint32Array(buf);

        f32.set([eye[0], eye[1], eye[2], 1.0], 0);   // eye
        f32.set([U[0], U[1], U[2], 1.0], 4);        // U
        f32.set([V[0], V[1], V[2], 0.0], 8);        // V
        f32.set([W[0], W[1], W[2], 0.0], 12);       // W
        f32.set([aspect, zoom, gamma, invW], 16);   // aspect, zoom, gamma, invW

        // Pack ints:
        // addrMode   = width
        // filterMode = height
        // _pad1      = frame number
        // _pad2      = N (jitter count per frame)
        const N = subdiv * subdiv >>> 0;
        u32[20] = canvas.width >>> 0;
        u32[21] = canvas.height >>> 0;
        u32[22] = frame >>> 0;
        u32[23] = N;

        device.queue.writeBuffer(uniformBuffer, 0, buf);
    }


    // Load shader
    const resp = await fetch('shader.wgsl');
    const wgsl = await resp.text();
    const module = device.createShaderModule({ code: wgsl });

    // Check for shader compilation errors
    const info = await module.getCompilationInfo();
    for (const m of info.messages) {
        console[m.type === 'error' ? 'error' : 'warn'](`${m.lineNum}:${m.linePos} ${m.message}`);
    }
    if (info.messages.some(m => m.type === 'error')) {
        throw new Error('WGSL compilation failed');
    }
    // Ping-pong textures (rgba32float)
    const textures = {};
    textures.width = canvas.width;
    textures.height = canvas.height;

    textures.renderSrc = device.createTexture({
        size: [canvas.width, canvas.height],
        format: 'rgba32float',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });

    textures.renderDst = device.createTexture({
        size: [canvas.width, canvas.height],
        format: 'rgba32float',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    const di = await readOBJFile('../../common/objects/CornellBox.obj', 1.0, false);


    // Build BSP tree with INTERLEAVED data (attribs = pos+norm interleaved)
    console.log('Building BSP tree...');
    let buffers = {};
    buffers = build_bsp_tree(di, device, buffers);
    console.log('BSP tree built!');

    // Combine indices with material indices (4 u32 per triangle: i0, i1, i2, matIdx)
    const faceCount = di.indices.length / 4;  // 4 u32 per face in indices buffer

    // Extract or create material indices array
    let matIndices;
    if (di.mat_indices) {
        matIndices = new Uint32Array(di.mat_indices);
    } else {
        // Material indices might be the 4th component of each face in indices
        matIndices = new Uint32Array(faceCount);
        for (let f = 0; f < faceCount; f++) {
            matIndices[f] = di.indices[f * 4 + 3] || 0;  // Default to 0 if not present
        }
    }

    // Combine indices with material indices
    const combinedIndices = new Uint32Array(faceCount * 4);
    for (let f = 0; f < faceCount; f++) {
        combinedIndices[f * 4 + 0] = di.indices[f * 4 + 0];
        combinedIndices[f * 4 + 1] = di.indices[f * 4 + 1];
        combinedIndices[f * 4 + 2] = di.indices[f * 4 + 2];
        combinedIndices[f * 4 + 3] = matIndices[f];
    }

    // Overwrite indices buffer with combined data
    buffers.indices = device.createBuffer({
        size: combinedIndices.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(buffers.indices, 0, combinedIndices.buffer, combinedIndices.byteOffset, combinedIndices.byteLength);

    // Materials buffer
    const numMaterials = di.materials.length;
    const materialsData = new Float32Array(numMaterials * 8);
    for (let i = 0; i < numMaterials; i++) {
        const mat = di.materials[i];
        const offset = i * 8;
        materialsData[offset + 0] = mat.color.r;
        materialsData[offset + 1] = mat.color.g;
        materialsData[offset + 2] = mat.color.b;
        materialsData[offset + 3] = 1.0;
        materialsData[offset + 4] = mat.emission.r;
        materialsData[offset + 5] = mat.emission.g;
        materialsData[offset + 6] = mat.emission.b;
        materialsData[offset + 7] = 0.0;
    }
    buffers.materials = device.createBuffer({
        size: materialsData.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(buffers.materials, 0, materialsData.buffer, materialsData.byteOffset, materialsData.byteLength);

    // Light indices
    const lightIndices = new Uint32Array(di.light_indices);
    buffers.lightIndices = device.createBuffer({
        size: Math.max(lightIndices.byteLength, 16),
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(buffers.lightIndices, 0, lightIndices.buffer, lightIndices.byteOffset, lightIndices.byteLength);

    // Light info
    buffers.lightInfo = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(buffers.lightInfo, 0, new Uint32Array([lightIndices.length, 0, 0, 0]));

    // Mesh info
    buffers.meshInfo = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(buffers.meshInfo, 0, new Uint32Array([faceCount, 0, 0, 0]));

    // left mirror: center(420,90,370), r=90, type=1 (mirror), ior ignored
    // right glass: center(130,90,250), r=90, type=2 (glass), ior=1.5
    const sphereUBOData = new Float32Array([
        // c0.xyz, r
        420.0, 90.0, 370.0, 90.0,
        // c1.xyz, r
        130.0, 90.0, 250.0, 90.0,
        // params0: x=type(1 mirror), y=ior, z,w unused
        1.0, 1.0, 0.0, 0.0,
        // params1: x=type(2 glass),  y=ior(1.5), z,w unused
        2.0, 1.5, 0.0, 0.0,
    ]);
    const sphereUBO = device.createBuffer({
        size: sphereUBOData.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(sphereUBO, 0, sphereUBOData);
    // Pipeline
    const pipeline = await device.createRenderPipelineAsync({
        layout: 'auto',
        vertex: { module, entryPoint: 'vsMain' },
        fragment: {
            module,
            entryPoint: 'fsMain',
            targets: [
                { format },                 // attachment 0: the canvas
                { format: 'rgba32float' }   // attachment 1: accumulation buffer
            ]
        },
        primitive: { topology: 'triangle-strip' },
    });

    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
            { binding: 1, resource: { buffer: buffers.attribs } },
            { binding: 2, resource: { buffer: buffers.indices } },
            { binding: 3, resource: { buffer: buffers.materials } },
            { binding: 4, resource: { buffer: buffers.lightIndices } },
            { binding: 5, resource: { buffer: buffers.lightInfo } },
            { binding: 6, resource: { buffer: buffers.aabb } },
            { binding: 7, resource: { buffer: buffers.treeIds } },
            { binding: 8, resource: { buffer: buffers.bspTree } },
            { binding: 9, resource: { buffer: buffers.bspPlanes } },
            { binding: 10, resource: { buffer: sphereUBO } },
            { binding: 11, resource: textures.renderDst.createView() }, // <-- previous accum
        ],
    });


    function render() {
        writeUniforms();
        const encoder = device.createCommandEncoder();

        const pass = timingHelper.beginRenderPass(encoder, {
            colorAttachments: [
                {
                    view: context.getCurrentTexture().createView(),
                    loadOp: 'clear',
                    clearValue: { r: 0, g: 0, b: 0, a: 1 },
                    storeOp: 'store',
                },
                {
                    view: textures.renderSrc.createView(), // write new accumulation here
                    loadOp: frame === 0 ? 'clear' : 'load', // fresh accumulation on frame 0
                    storeOp: 'store',
                }
            ],
        });

        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(4, 1, 0, 0);
        pass.end();

        // Copy the just-written accumulation into the texture bound for reading next frame
        encoder.copyTextureToTexture(
            { texture: textures.renderSrc },
            { texture: textures.renderDst },
            [textures.width, textures.height]
        );

        device.queue.submit([encoder.finish()]);

        // Timing
        timingHelper.getResult().then(duration => {
            if (frameTimeDisplay) frameTimeDisplay.textContent = (duration / 1e6).toFixed(2) + ' ms';
        });

        // Advance frame if progressive; otherwise keep re-rendering a single-sample frame
        if (accumulate) {
            frame++;
        }
        updateFrameCounter();
    }
    function animate() {
        if (accumulate) {
            render();           // only draw when accumulating
        }
        requestAnimationFrame(animate);  // loop always runs
    }



    setGamma(parseFloat(gammaSlider.value));
    animate();
}

init();