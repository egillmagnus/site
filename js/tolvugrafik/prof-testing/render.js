var rotation = 0;

var legLength = 0.7;
var swingLength = 0.5;
var topWidth = 0.3;
var canvas;
var gl;

var numVertices = 36;
var points = [];
var colors = [];

var wireframes = false;

var movement = false;
var spinX = 0;
var spinY = 0;
var origX;

var time = 0;
var origY

var matrixLoc;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    // Set canvas size
    setCanvasSize(canvas);

    // Create the cube
    colorCube();

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(31 / 255, 36 / 255, 45 / 255, 1.0);

    gl.enable(gl.DEPTH_TEST);

    // Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Color buffer
    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    // Vertex buffer
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Get location of the transformation matrix in shader
    matrixLoc = gl.getUniformLocation(program, "transform");

    // Event listeners for mouse
    canvas.addEventListener("mousedown", function (e) {
        movement = true;
        origX = e.offsetX;
        origY = e.offsetY;
        e.preventDefault(); // Disable drag and dropfmult
    }, { passive: false });

    canvas.addEventListener("mouseup", function (e) {
        movement = false;
    }, { passive: false });

    canvas.addEventListener("mouseleave", function () {
        movement = false;
    }, { passive: false });

    canvas.addEventListener("mousemove", function (e) {
        if (movement) {
            spinY = (spinY + (origX - e.offsetX)) % 360;
            spinX = (spinX + (origY - e.offsetY)) % 360;

            if (spinX < -90) spinX = -90;
            if (spinX > 90) spinX = 90;

            origX = e.offsetX;
            origY = e.offsetY;
        }
    }, { passive: false });

    // Event listeners for touch
    canvas.addEventListener("touchstart", function (e) {
        movement = true;
        origX = e.touches[0].clientX;
        origY = e.touches[0].clientY;
    });

    canvas.addEventListener("touchmove", function (e) {
        if (movement) {
            var deltaX = e.touches[0].clientX - origX;
            var deltaY = e.touches[0].clientY - origY;
            spinY += deltaX % 360;
            spinX += deltaY % 360;

            if (spinX < -90) spinX = -90;
            if (spinX > 90) spinX = 90;

            origX = e.touches[0].clientX;
            origY = e.touches[0].clientY;
        }
    });

    canvas.addEventListener("touchend", function (e) {
        movement = false;
    });

    window.addEventListener("resize", function () {
        setCanvasSize(canvas);
    });

    // Start rendering
    render();
};

function colorCube() {
    quad(1, 0, 3, 2); // Front face
    quad(2, 3, 7, 6); // Right face
    quad(3, 0, 4, 7); // Bottom face
    quad(6, 5, 1, 2); // Top face
    quad(4, 5, 6, 7); // Back face
    quad(5, 4, 0, 1); // Left face
}

function quad(a, b, c, d) {
    var vertices = [
        vec3(-0.5, -0.5, 0.5), // 0
        vec3(-0.5, 0.5, 0.5), // 1
        vec3(0.5, 0.5, 0.5), // 2
        vec3(0.5, -0.5, 0.5), // 3
        vec3(-0.5, -0.5, -0.5), // 4
        vec3(-0.5, 0.5, -0.5), // 5
        vec3(0.5, 0.5, -0.5), // 6
        vec3(0.5, -0.5, -0.5)  // 7
    ];

    var vertexColors = [
        [0.0, 0.0, 0.0, 1.0],  // black
        [1.0, 0.0, 0.0, 1.0],  // red
        [1.0, 1.0, 0.0, 1.0],  // yellow
        [0.0, 1.0, 0.0, 1.0],  // green
        [0.0, 0.0, 1.0, 1.0],  // blue
        [1.0, 0.0, 1.0, 1.0],  // magenta
        [0.0, 1.0, 1.0, 1.0],  // cyan
        [1.0, 1.0, 1.0, 1.0]   // white
    ];

    var indices = [a, b, c, a, c, d];

    for (var i = 0; i < indices.length; ++i) {
        points.push(vertices[indices[i]]);
        colors.push(vertexColors[a]); // Assign color based on the first vertex
    }
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    rotation = Math.sin(time) * 30;

    modelMatrix = mult(rotateX(spinX), rotateY(spinY))

    //Leg 1
    mv = scalem(0.02, legLength, 0.06);
    var mv1 = mult(translate(-topWidth / 2, 0, 0), mv);
    mv1 = mult(modelMatrix, mv1);
    gl.uniformMatrix4fv(matrixLoc, false, flatten(mv1));

    drawArrays();
    //Leg 2
    var mv1 = mult(translate(topWidth / 2, 0, 0), mv);
    mv1 = mult(modelMatrix, mv1);
    gl.uniformMatrix4fv(matrixLoc, false, flatten(mv1));
    drawArrays();
    // top
    mv = scalem(topWidth, 0.02, 0.1);
    mv = mult(translate(0, legLength / 2, 0), mv);
    mv = mult(modelMatrix, mv);
    gl.uniformMatrix4fv(matrixLoc, false, flatten(mv));
    drawArrays();

    //strings
    mv = scalem(0.01, swingLength, 0.01);
    mv = mult(translate(0, -swingLength / 2, 0), mv);
    mv = mult(rotateX(rotation), mv);
    //string 1
    mv1 = mult(translate(-topWidth / 3, legLength / 2, 0), mv);
    mv1 = mult(modelMatrix, mv1);
    gl.uniformMatrix4fv(matrixLoc, false, flatten(mv1));
    drawArrays();
    //string 2
    mv1 = mult(translate(topWidth / 3, legLength / 2, 0), mv);
    mv1 = mult(modelMatrix, mv1);
    gl.uniformMatrix4fv(matrixLoc, false, flatten(mv1));
    drawArrays();

    //seat
    mv = scalem(2 / 3 * topWidth, 0.02, 0.06);
    mv = mult(translate(0, -swingLength, 0), mv);
    mv = mult(rotateX(rotation), mv);
    mv = mult(translate(0, legLength / 2, 0), mv);
    mv1 = mult(modelMatrix, mv);
    gl.uniformMatrix4fv(matrixLoc, false, flatten(mv1));
    drawArrays();

    time += 0.1;

    requestAnimFrame(render);
}

function drawArrays() {
    if (wireframes) {
        for (var i = 0; i < numVertices; i += 3)
            gl.drawArrays(gl.LINE_LOOP, i, 3);
    } else {
        gl.drawArrays(gl.TRIANGLES, 0, numVertices);
    }
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