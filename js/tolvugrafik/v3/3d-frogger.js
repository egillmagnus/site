
// Global variables
let gl, program;
let frogPosition = { x: -0.5, y: -6 }; // Start position at bottom middle (0, -6)
let matrixLoc;
let isFrogView = false; // Flag to toggle views

// Variables for camera rotation in frog view
let spinX = -20; // Rotation along x-axis
let spinY = 180; // Rotation along y-axis
let movement = false;
let origX, origY;

var vPosition;
var vNormal;
var vColor;

var viewMatrix;

var lastMovementDir = 0;


var uModelMatrixLoc
var uViewMatrixLoc
var uProjectionMatrixLoc
var uNormalMatrixLoc
var uLightPositionLoc
var uLightAmbientLoc
var uLightDiffuseLoc
var uLightSpecularLoc
var uMaterialAmbientLoc
var uMaterialDiffuseLoc
var uMaterialSpecularLoc
var uShininessLoc
var uCameraPositionLoc

const lightPosition = vec3(0.0, 5.0, 15.0);
const lightAmbient = vec3(0.7, 0.7, 0.7);
const lightDiffuse = vec3(0.9, 0.9, 0.9);
const lightSpecular = vec3(1.0, 1.0, 1.0);


var frogBuffers;

var canvas;

let groundBuffer, groundColorBuffer, groundVertexCount;



// Global variables for the frog model
let frogVertexBuffer, frogNormalBuffer, frogIndexBuffer, frogIndexCount;




window.onload = function init() {

    // Set up WebGL context
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
        return;
    }

    // Initialize WebGL settings
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.2, 0.2, 0.3, 1.0); // Background color
    gl.enable(gl.DEPTH_TEST);

    // Load shaders and initialize program
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Uniform location for transformation matrix
    matrixLoc = gl.getUniformLocation(program, "transform");

    const groundData = initGroundBuffers(gl);
    groundBuffer = groundData.groundBuffer;
    groundColorBuffer = groundData.groundColorBuffer;
    groundVertexCount = groundData.vertexCount;
    groundNormalBuffer = groundData.groundNormalBuffer;


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
    uCameraPositionLoc = gl.getUniformLocation(program, 'uCameraPosition');


    gl.uniform3fv(uLightPositionLoc, flatten(lightPosition));
    gl.uniform3fv(uLightAmbientLoc, flatten(lightAmbient));
    gl.uniform3fv(uLightDiffuseLoc, flatten(lightDiffuse));
    gl.uniform3fv(uLightSpecularLoc, flatten(lightSpecular));


    vPosition = gl.getAttribLocation(program, 'vPosition');
    vNormal = gl.getAttribLocation(program, 'vNormal');
    vColor = gl.getAttribLocation(program, 'vColor');

    // Set up projection matrix (perspective)
    const aspect = canvas.width / canvas.height;
    const fov = 90;
    const near = 0.1;
    const far = 100.0;
    const projectionMatrix = perspective(fov, aspect, near, far);
    gl.uniformMatrix4fv(uProjectionMatrixLoc, false, flatten(projectionMatrix));

    // Set canvas size and start rendering loop
    setCanvasSize(canvas);
    // Key handlers for movement
    window.addEventListener("keydown", (event) => {
        switch (event.key) {
            case "ArrowUp":
                if (isFrogView) {
                    moveInFrogView(0);
                } else {
                    frogPosition.y += 1;
                    lastMovementDir = 0;
                }
                event.preventDefault();
                break;
            case "ArrowDown":
                if (isFrogView) {
                    moveInFrogView(2);
                } else {
                    frogPosition.y -= 1;
                    lastMovementDir = 2;
                }
                event.preventDefault();
                break;
            case "ArrowLeft":
                if (isFrogView) {
                    moveInFrogView(1);
                } else {
                    frogPosition.x += 1;
                    lastMovementDir = 1;
                }
                event.preventDefault();
                break;
            case "ArrowRight":
                if (isFrogView) {
                    moveInFrogView(3);
                } else {
                    frogPosition.x -= 1;
                    lastMovementDir = 3;
                }
                event.preventDefault();
                break;
            case "v": // Toggle view
                console.log("Switching view");
                isFrogView = !isFrogView;
                event.preventDefault();
                break;
        }

        frogPosition.x = Math.max(Math.min(frogPosition.x, 6.5), -6.5);
        frogPosition.y = Math.max(Math.min(frogPosition.y, 6), -6);
    });

    // Mouse handlers for rotating the view in frog perspective
    canvas.addEventListener("mousedown", function (e) {
        if (isFrogView) {
            movement = true;
            origX = e.offsetX;
            origY = e.offsetY;
        }
    });

    canvas.addEventListener("mouseup", () => (movement = false));

    canvas.addEventListener("mousemove", function (e) {
        if (movement && isFrogView) {
            spinY = (spinY - (origX - e.offsetX) * 0.2) % 360;
            spinX = Math.min(Math.max(spinX - (origY - e.offsetY) * 0.2, -200), 90); // Limit looking up/down
            origX = e.offsetX;
            origY = e.offsetY;
        }
    });


    loadFrogModel(gl, '/verkefni/tolvugrafik/v3/froggy.obj', function (buffers) {
        console.log("loaded frog model");
        frogBuffers = buffers;
        render();
    });

};


function moveInFrogView(moveDir) {
    newDir = (moveDir + lastMovementDir) % 4;

    console.log("moveDir" + moveDir);
    console.log("lastMovementDir" + lastMovementDir);
    console.log("newDir" + newDir);


    if (newDir == 0) {
        frogPosition.y += 1;
    } else if (newDir == 1) {
        frogPosition.x += 1;
    } else if (newDir == 2) {
        frogPosition.y -= 1;
    } else if (newDir == 3) {
        frogPosition.x -= 1;
    }

    spinY = (180 + 90 * newDir) % 360;
    lastMovementDir = newDir;
}




function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let projectionMatrix;
    const aspect = canvas.width / canvas.height;
    const near = 0.1;
    const far = 100.0;


    if (isFrogView) {

        const frogTranslation = translate(-frogPosition.x, -0.5, -frogPosition.y);
        const frogRotation = rotateY(-spinY);

        viewMatrix = mult(frogRotation, frogTranslation);

        projectionMatrix = perspective(90, aspect, near, far);

        const eye = vec3(0.0, 0.5, 0.0);
        gl.uniform3fv(uCameraPositionLoc, flatten(eye));
    } else {
        // Default view
        const eye = vec3(frogPosition.x, 15.0, frogPosition.y - 1);
        const at = vec3(frogPosition.x, 0.0, frogPosition.y);
        const up = vec3(0.0, 0.0, 1.0);

        viewMatrix = lookAt(eye, at, up);
        projectionMatrix = perspective(45, aspect, near, far);

        gl.uniform3fv(uCameraPositionLoc, flatten(eye));
    }

    gl.uniformMatrix4fv(uViewMatrixLoc, false, flatten(viewMatrix));
    gl.uniformMatrix4fv(uProjectionMatrixLoc, false, flatten(projectionMatrix));

    const modelMatrix = mat4();
    gl.uniformMatrix4fv(uModelMatrixLoc, false, flatten(modelMatrix));

    const modelViewMatrix = mult(viewMatrix, modelMatrix);
    const normalMatrix1 = normalMatrix(modelViewMatrix, true);
    gl.uniformMatrix3fv(uNormalMatrixLoc, false, flatten(normalMatrix1));

    drawElements();

    requestAnimationFrame(render);
}




function drawElements() {
    drawGround();
    drawFrog();
}



function drawGround() {
    gl.uniform3fv(uMaterialAmbientLoc, [0.2, 0.2, 0.2]);
    gl.uniform3fv(uMaterialSpecularLoc, [0.0, 0.0, 0.0]);
    gl.uniform1f(uShininessLoc, 10.0);

    gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffer);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, groundNormalBuffer);
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    gl.bindBuffer(gl.ARRAY_BUFFER, groundColorBuffer);
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    gl.drawArrays(gl.TRIANGLES, 0, groundVertexCount);
}

function drawFrog() {
    gl.uniform3fv(uMaterialAmbientLoc, [0.0, 0.3, 0.]);
    gl.uniform3fv(uMaterialSpecularLoc, [0.5, 0.5, 0.5]);
    gl.uniform1f(uShininessLoc, 50.0);

    let modelMatrix = mat4();

    modelMatrix = mult(modelMatrix, translate(frogPosition.x, 0.2, frogPosition.y));

    modelMatrix = mult(modelMatrix, rotateY(lastMovementDir * 90));

    const scaleFactor = 1 / 3900000;
    modelMatrix = mult(modelMatrix, scalem(scaleFactor, scaleFactor, scaleFactor));

    modelMatrix = mult(modelMatrix, translate(0, 0, 3900000 * 0.15));


    gl.uniformMatrix4fv(uModelMatrixLoc, false, flatten(modelMatrix));

    // Compute normal matrix
    const modelViewMatrix = mult(viewMatrix, modelMatrix);
    const normalMatrixFrog = normalMatrix(modelViewMatrix, true);
    gl.uniformMatrix3fv(uNormalMatrixLoc, false, flatten(normalMatrixFrog));

    drawFrogModel(gl, frogBuffers);
}



function drawFrogModel(gl, buffers) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    gl.drawArrays(gl.TRIANGLES, 0, buffers.vertexCount);
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