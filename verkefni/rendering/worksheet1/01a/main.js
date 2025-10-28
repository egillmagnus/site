async function init() {
    if (!('gpu' in navigator)) { alert('WebGPU not supported'); return; }

    const canvas = document.getElementById('gfx');
    const context = canvas.getContext('webgpu');

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) { alert('No GPU adapter'); return; }

    const device = await adapter.requestDevice();
    const format = navigator.gpu.getPreferredCanvasFormat();

    context.configure({ device, format, alphaMode: 'opaque' });

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
        colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            loadOp: 'clear',
            storeOp: 'store',
        }],
    });
    pass.end();
    device.queue.submit([encoder.finish()]);
}
init();
