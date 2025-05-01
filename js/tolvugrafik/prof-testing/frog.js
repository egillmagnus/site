// Global Variables
let gl, program, frogBuffers;
let uModelMatrixLoc, uViewMatrixLoc, uProjectionMatrixLoc, uNormalMatrixLoc;
let uLightPositionLoc, uLightAmbientLoc, uLightDiffuseLoc, uLightSpecularLoc;
let uMaterialAmbientLoc, uMaterialDiffuseLoc, uMaterialSpecularLoc, uShininessLoc;

const lightPosition = vec3(10.0, 20.0, 20.0);
const lightAmbient = vec3(0.2, 0.2, 0.2);
const lightDiffuse = vec3(0.8, 0.8, 0.8);
const lightSpecular = vec3(1.0, 1.0, 1.0);

const materialAmbient = vec3(0.0, 0.2, 0.0);
const materialDiffuse = vec3(0.1, 0.8, 0.1);
const materialSpecular = vec3(0.8, 0.8, 0.8);
const shininess = 50.0;

var isOffset = false;

var offset = 0.0;

var uMousePosLoc;

var mouseCoords = vec3(100, 100, 100);

window.onload = function init() {
    // Initialize WebGL
    const canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.38, 0.718, 1, 1);
    gl.enable(gl.DEPTH_TEST);

    // Initialize shaders
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    setCanvasSize(canvas);


    // Load Frog Model
    loadFrogModel(gl, '/verkefni/tolvugrafik/v3/froggy.obj', function (buffers) {
        frogBuffers = buffers;
        render();
    });

    // Get uniform locations
    uModelMatrixLoc = gl.getUniformLocation(program, 'uModelMatrix');
    uViewMatrixLoc = gl.getUniformLocation(program, 'uViewMatrix');
    uProjectionMatrixLoc = gl.getUniformLocation(program, 'uProjectionMatrix');
    uNormalMatrixLoc = gl.getUniformLocation(program, 'uNormalMatrix');
    uLightPositionLoc = gl.getUniformLocation(program, 'uLightPosition');
    uLightAmbientLoc = gl.getUniformLocation(program, 'uLightAmbient');
    uLightDiffuseLoc = gl.getUniformLocation(program, 'uLightDiffuse');
    uLightSpecularLoc = gl.getUniformLocation(program, 'uLightSpecular');
    uMaterialAmbientLoc = gl.getUniformLocation(program, 'uMaterialAmbient');
    uMaterialDiffuseLoc = gl.getUniformLocation(program, 'uMaterialDiffuse');
    uMaterialSpecularLoc = gl.getUniformLocation(program, 'uMaterialSpecular');
    uShininessLoc = gl.getUniformLocation(program, 'uShininess');

    // Set light uniforms
    gl.uniform3fv(uLightPositionLoc, flatten(lightPosition));
    gl.uniform3fv(uLightAmbientLoc, flatten(lightAmbient));
    gl.uniform3fv(uLightDiffuseLoc, flatten(lightDiffuse));
    gl.uniform3fv(uLightSpecularLoc, flatten(lightSpecular));

    // Set material uniforms
    gl.uniform3fv(uMaterialAmbientLoc, flatten(materialAmbient));
    gl.uniform3fv(uMaterialDiffuseLoc, flatten(materialDiffuse));
    gl.uniform3fv(uMaterialSpecularLoc, flatten(materialSpecular));
    gl.uniform1f(uShininessLoc, shininess);

    uMousePosLoc = gl.getUniformLocation(program, 'uMousePos');
    uOffsetLoc = gl.getUniformLocation(program, 'uOffset');

    gl.uniform3fv(uMousePosLoc, flatten(mouseCoords));

    canvas.addEventListener("mousemove", (event) => {
        mouseCoords = getMouseWebGLCoordinates(event, canvas);
        console.log(mouseCoords);
        gl.uniform3fv(uMousePosLoc, flatten(mouseCoords));
    });

    canvas.addEventListener("click", () => {
        isOffset = !isOffset;
    });

    setCanvasSize(canvas);

};

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (isOffset) {
        offset = Math.min(offset + 0.2, 10);
    } else {
        offset = Math.max(offset - 0.2, 0)
    }

    gl.uniform1f(uOffsetLoc, offset);


    const aspect = gl.canvas.width / gl.canvas.height;
    const projectionMatrix = perspective(45, aspect, 0.1, 100.0);
    gl.uniformMatrix4fv(uProjectionMatrixLoc, false, flatten(projectionMatrix));

    const eye = vec3(0, 10, 1);
    const at = vec3(0, 0, 0);
    const up = vec3(0, 0, -1);
    const viewMatrix = lookAt(eye, at, up);
    gl.uniformMatrix4fv(uViewMatrixLoc, false, flatten(viewMatrix));

    var scale = 700000;
    const modelMatrix = mult(translate(0, 0, 0), scalem(1 / scale, 1 / scale, 1 / scale));
    gl.uniformMatrix4fv(uModelMatrixLoc, false, flatten(modelMatrix));

    const normalMatrix1 = normalMatrix(mult(viewMatrix, modelMatrix), true);
    gl.uniformMatrix3fv(uNormalMatrixLoc, false, flatten(normalMatrix1));

    drawFrogModel(gl, frogBuffers);

    requestAnimationFrame(render);
}

function drawFrogModel(gl, buffers) {
    if (!buffers) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(gl.getAttribLocation(program, 'vPosition'), 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(gl.getAttribLocation(program, 'vPosition'));

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
    gl.vertexAttribPointer(gl.getAttribLocation(program, 'vNormal'), 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(gl.getAttribLocation(program, 'vNormal'));

    gl.drawArrays(gl.TRIANGLES, 0, buffers.vertexCount);
}

function getMouseWebGLCoordinates(event, canvas) {
    const rect = canvas.getBoundingClientRect();

    // Get mouse position relative to canvas
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    var width = 10;
    // Normalize to [-1, 1] range
    const x = (mouseX / canvas.width) * width - width / 2;
    const y = -((mouseY / canvas.height) * width - width / 2); // Invert y-axis for WebGL

    return vec3(x, 0.1, -y); // z = 0 as per the requirement
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