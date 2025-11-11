async function init() {
    if (!('gpu' in navigator)) { alert('WebGPU not supported'); return; }

    const canvas = document.getElementById('gfx');
    canvas.width = 512;
    canvas.height = 512;
    
    const context = canvas.getContext('webgpu');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) { alert('No GPU adapter'); return; }
    
    const device = await adapter.requestDevice();
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'opaque' });

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

    // Camera for Cornell box (millimeters)
    let eye = vec3(277.0, 275.0, -570.0);
    const at = vec3(277.0, 275.0, 0.0);
    const up = vec3(0.0, 1.0, 0.0);
    const W = normalize(subtract(at, eye));
    const U = normalize(cross(W, up));
    const V = normalize(cross(U, W));
    const zoom = 1.0;

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
        const d = Math.sign(notches) * Math.min(Math.abs(notches), 4) * 0.15;
        eye[0] += d * W[0]; 
        eye[1] += d * W[1]; 
        eye[2] += d * W[2];
        render();
    }, { passive: false });

    // Uniforms
    const uniformBuffer = device.createBuffer({
        size: 512,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    function writeUniforms() {
        const aspect = canvas.width / canvas.height;
        const invW = 1.0 / canvas.width;
        const buf = new ArrayBuffer(96);
        const f32 = new Float32Array(buf);
        const u32 = new Uint32Array(buf);

        f32.set([eye[0], eye[1], eye[2], 1.0], 0);
        f32.set([U[0], U[1], U[2], 1.0], 4);
        f32.set([V[0], V[1], V[2], 0.0], 8);
        f32.set([W[0], W[1], W[2], 0.0], 12);
        f32.set([aspect, zoom, gamma, invW], 16);
        u32[20] = 0;
        u32[21] = 0;
        u32[22] = 0;
        u32[23] = (subdiv * subdiv) >>> 0;

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

    // Load Cornell box
    const di = await readOBJFile('../../common/objects/CornellBoxWithBlocks.obj', 1.0, false);
    if (!di) throw new Error('Failed to load OBJ');

    const vertF32 = di.vertices;
    const faceCount = di.mat_indices.length;
    
    // Triangle indices
    const triIdx = new Uint32Array(faceCount * 3);
    for (let f = 0; f < faceCount; ++f) {
        const src = 4 * f;
        const dst = 3 * f;
        triIdx[dst + 0] = di.indices[src + 0];
        triIdx[dst + 1] = di.indices[src + 1];
        triIdx[dst + 2] = di.indices[src + 2];
    }

    // Vertex buffer
    const vertBuffer = device.createBuffer({
        size: vertF32.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertBuffer, 0, vertF32.buffer, vertF32.byteOffset, vertF32.byteLength);

    // Index buffer
    const indexBuffer = device.createBuffer({
        size: triIdx.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(indexBuffer, 0, triIdx.buffer, triIdx.byteOffset, triIdx.byteLength);

    // Normals buffer
    const normalsF32 = di.normals;
    const normalsBuffer = device.createBuffer({
        size: normalsF32.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(normalsBuffer, 0, normalsF32.buffer, normalsF32.byteOffset, normalsF32.byteLength);

    // Mesh info
    const meshInfoBuf = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(meshInfoBuf, 0, new Uint32Array([faceCount, 0, 0, 0]));

    // Material indices
    const matIndices = new Uint32Array(di.mat_indices);
    const matIndexBuffer = device.createBuffer({
        size: matIndices.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(matIndexBuffer, 0, matIndices.buffer, matIndices.byteOffset, matIndices.byteLength);

    // Materials buffer
    const numMaterials = di.materials.length;
    const materialsData = new Float32Array(numMaterials * 8);

    for (let i = 0; i < numMaterials; i++) {
        const mat = di.materials[i];
        const offset = i * 8;
        
        materialsData[offset + 0] = mat.color[0];
        materialsData[offset + 1] = mat.color[1];
        materialsData[offset + 2] = mat.color[2];
        materialsData[offset + 3] = mat.color[3];
        
        materialsData[offset + 4] = mat.emission[0];
        materialsData[offset + 5] = mat.emission[1];
        materialsData[offset + 6] = mat.emission[2];
        materialsData[offset + 7] = mat.emission[3];
    }

    const materialsBuffer = device.createBuffer({
        size: materialsData.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(materialsBuffer, 0, materialsData.buffer, materialsData.byteOffset, materialsData.byteLength);

    // Dummy texture
    const texture = await load_texture(device, '../../common/grass.jpg');

    // Pipeline
    const pipeline = await device.createRenderPipelineAsync({
        layout: 'auto',
        vertex: { module, entryPoint: 'vsMain' },
        fragment: { module, entryPoint: 'fsMain', targets: [{ format }] },
        primitive: { topology: 'triangle-strip' },
    });

    // Bind group
    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
            { binding: 1, resource: texture.createView() },
            { binding: 2, resource: { buffer: jitterBuffer } },
            { binding: 3, resource: { buffer: vertBuffer } },
            { binding: 4, resource: { buffer: indexBuffer } },
            { binding: 5, resource: { buffer: meshInfoBuf } },
            { binding: 6, resource: { buffer: normalsBuffer } },
            { binding: 7, resource: { buffer: matIndexBuffer } },
            { binding: 8, resource: { buffer: materialsBuffer } },
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
        { texture },
        { width: img.width, height: img.height },
    );

    return texture;
}