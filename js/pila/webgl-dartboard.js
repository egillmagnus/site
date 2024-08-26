let scale = 1;
let translateX = 0;
let translateY = 0;

// Global variables for WebGL context, program, and buffer
let gl, program, positionLocation, resolutionLocation, colorLocation, matrixLocation, positionBuffer, positions;

async function initWebGL() {
    console.log("Initializing webGL");
    const canvas = document.getElementById('dartboard');
    gl = canvas.getContext('webgl');

    if (!gl) {
        console.error('WebGL not supported');
        return;
    }

    // Load shaders from external .glsl files using fetch
    const vsSource = await fetchShaderSource('/shaders/vertex.glsl');
    const fsSource = await fetchShaderSource('/shaders/fragment.glsl');

    // Compile shaders and create WebGL program
    program = createProgram(gl, vsSource, fsSource);

    // Get locations of attributes and uniforms
    positionLocation = gl.getAttribLocation(program, 'aPosition');
    resolutionLocation = gl.getUniformLocation(program, 'uResolution');
    colorLocation = gl.getUniformLocation(program, 'uColor');
    matrixLocation = gl.getUniformLocation(program, 'uMatrix');

    // Initialize data for a simple circle
    positions = createCircleVertices(0, 0, 250, 100); // Circle in the center

    // Create buffer and load data
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // Initialize zoom and pan functionality
    initZoomAndPan(canvas);

    // Initial render
    render();
}

// Rendering function moved outside initWebGL
function render() {
    // Clear canvas
    gl.clearColor(1, 1, 1, 1); // White background
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Use the program
    gl.useProgram(program);

    // Set resolution uniform
    gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);

    // Enable position attribute
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Create a transformation matrix for zoom and pan
    const matrix = [
        scale, 0, 0,
        0, scale, 0,
        translateX, translateY, 1
    ];

    // Pass matrix to the shader
    gl.uniformMatrix3fv(matrixLocation, false, matrix);

    // Set color to black for the dartboard
    gl.uniform4f(colorLocation, 0, 0, 0, 1); // Black

    // Draw circle
    gl.drawArrays(gl.TRIANGLE_FAN, 0, positions.length / 2);
}

// Function to load shader source from file
async function fetchShaderSource(url) {
    try {
        const response = await fetch(url);
        return await response.text();
    } catch (error) {
        console.error('Failed to load shader:', error);
    }
}

// Function to create the WebGL program
function createProgram(gl, vsSource, fsSource) {
    const vertexShader = createShader(gl, vsSource, gl.VERTEX_SHADER);
    const fragmentShader = createShader(gl, fsSource, gl.FRAGMENT_SHADER);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Unable to initialize the shader program:', gl.getProgramInfoLog(program));
        return null;
    }

    return program;
}

// Function to create a shader
function createShader(gl, sourceCode, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, sourceCode);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

// Initialize zoom and pan
function initZoomAndPan(canvas) {
    let isDragging = false;
    let lastX, lastY;

    // Zooming via mouse wheel
    canvas.addEventListener('wheel', (event) => {
        event.preventDefault();
        scale += event.deltaY * -0.001;
        scale = Math.min(Math.max(0.5, scale), 5); // Limit zoom scale
        render(); // Re-render with the new scale
    });

    // Handle mouse panning
    canvas.addEventListener('mousedown', (event) => {
        event.preventDefault();
        isDragging = true;
        lastX = event.clientX;
        lastY = event.clientY;
    });

    canvas.addEventListener('mousemove', (event) => {
        event.preventDefault();
        if (isDragging) {
            const dx = event.clientX - lastX;
            const dy = event.clientY - lastY;
            translateX += dx;
            translateY += dy;
            lastX = event.clientX;
            lastY = event.clientY;
            render(); // Re-render with the new translation
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // Ensure mouse release stops panning even if it leaves the canvas
    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
    });
}

// Helper function to create circle vertices
function createCircleVertices(x, y, radius, numSegments) {
    const vertices = [x, y]; // Center of the circle
    for (let i = 0; i <= numSegments; i++) {
        const angle = (i / numSegments) * Math.PI * 2;
        vertices.push(x + Math.cos(angle) * radius);
        vertices.push(y + Math.sin(angle) * radius);
    }
    return vertices;
}

// Initialize WebGL when the page loads
window.onload = initWebGL;
