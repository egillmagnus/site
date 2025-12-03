async function init() {
    if (!('gpu' in navigator)) { alert('WebGPU not supported'); return; }
    const canvas = document.getElementById('gfx');
    const context = canvas.getContext('webgpu');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) { alert('No GPU adapter'); return; }
    const device = await adapter.requestDevice();
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'opaque' });
    const gammaSlider = document.getElementById('gammaSlider');
    const gammaValue = document.getElementById('gammaValue');
    const matteSel = document.getElementById('matteMode');   
    const sphereSel = document.getElementById('sphereMode');  
    let gamma = 2.2;
    let matteMode = matteSel ? parseInt(matteSel.value, 10) : 1;
    let sphereMode = sphereSel ? parseInt(sphereSel.value, 10) : 2;
    function setGamma(g) {
        const min = parseFloat(gammaSlider.min), max = parseFloat(gammaSlider.max);
        gamma = Math.min(max, Math.max(min, g));
        gammaSlider.value = gamma.toFixed(2);
        gammaValue.textContent = gamma.toFixed(2);
        render();
    }
    gammaSlider.addEventListener('input', () => setGamma(parseFloat(gammaSlider.value)));
    if (matteSel) matteSel.addEventListener('change', () => { matteMode = parseInt(matteSel.value, 10); render(); });
    if (sphereSel) sphereSel.addEventListener('change', () => { sphereMode = parseInt(sphereSel.value, 10); render(); });
    let eye = vec3(2.0, 1.5, 2.0);
    const at = vec3(0.0, 0.5, 0.0);
    const up = vec3(0.0, 1.0, 0.0);
    const W = normalize(subtract(at, eye));
    const U = normalize(cross(W, up));
    const V = normalize(cross(U, W));
    const zoom = 1.0;
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
        size: 96,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    function writeUniforms() {
        const aspect = canvas.width / canvas.height;
        const buf = new ArrayBuffer(96);
        const f32 = new Float32Array(buf);
        const u32 = new Uint32Array(buf);
        f32.set([eye[0], eye[1], eye[2], 1.0], 0);  
        f32.set([U[0], U[1], U[2], 0.0], 4);  
        f32.set([V[0], V[1], V[2], 0.0], 8);  
        f32.set([W[0], W[1], W[2], 0.0], 12);  
        f32.set([aspect, zoom, gamma, 0.0], 16);  
        u32[20] = (matteMode >>> 0);
        u32[21] = (sphereMode >>> 0);
        u32[22] = 0;
        u32[23] = 0;
        device.queue.writeBuffer(uniformBuffer, 0, buf);
    }
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
