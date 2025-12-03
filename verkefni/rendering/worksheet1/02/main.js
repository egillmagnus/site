async function init() {
    if (!('gpu' in navigator)) { alert('WebGPU not supported'); return; }
    const canvas = document.getElementById('gfx');
    const context = canvas.getContext('webgpu');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) { alert('No GPU adapter'); return; }
    const device = await adapter.requestDevice();
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'opaque' });
    const aspect = canvas.width / canvas.height;
    const zoom = 1;
    const eye = vec3(0.0, 0.0, 0.0);
    const at = vec3(0.0, 0.0, 1.0);
    const up = vec3(0.0, 1.0, 0.0);
    const W = normalize(subtract(at, eye));
    const U = normalize(cross(W, up));
    const V = normalize(cross(U, W));
    const uniformBuffer = device.createBuffer({
        size: 80,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    const u = new Float32Array(20);
    u[0] = aspect;
    u[1] = zoom;
    u.set([eye[0], eye[1], eye[2], 1.0], 4);
    u.set([U[0], U[1], U[2], 0.0], 8);
    u.set([V[0], V[1], V[2], 0.0], 12);
    u.set([W[0], W[1], W[2], 0.0], 16);
    device.queue.writeBuffer(uniformBuffer, 0, u);
    const wgsl = document.getElementById('shader-rays').textContent.trim();
    const module = device.createShaderModule({ code: wgsl });
    const pipeline = await device.createRenderPipelineAsync({
        layout: 'auto',
        vertex: { module, entryPoint: 'vsMain' },
        fragment: { module, entryPoint: 'fsMain', targets: [{ format }] },
        primitive: { topology: 'triangle-strip' },
    });
    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
    });
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
init();
