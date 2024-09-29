var canvas;
var gl;

var numVertices = 36;
var points = [];
var colors = [];

var movement = false;
var spinX = 0;
var spinY = 180;
var origX;
var origY;

var matrixLoc;
var secondAngle = 0;
var minuteAngle = 0;
var hourAngle = 0;
var logo;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    let menuicon = document.querySelector("#menu-icon");
    let navbar = document.querySelector(".navbar");

    logo = document.getElementById("log");

    menuicon.onclick = () => {
        menuicon.classList.toggle("bx-x");
        navbar.classList.toggle("active");
    };

    setCanvasSize(canvas);
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    colorCube();

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(31 / 255, 36 / 255, 45 / 255, 1.0);

    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    matrixLoc = gl.getUniformLocation(program, "transform");

    //event listeners for mouse
    canvas.addEventListener("mousedown", function (e) {
        movement = true;
        origX = e.offsetX;
        origY = e.offsetY;
        e.preventDefault(); // Disable drag and drop
    });

    canvas.addEventListener("mouseup", function (e) {
        movement = false;
    });

    canvas.addEventListener("mousemove", function (e) {
        if (movement) {
            spinY = (spinY + (origX - e.offsetX)) % 360;
            spinX = (spinX + (origY - e.offsetY)) % 360;

            if (spinX < -90) {
                spinX = -90;
            } else if (spinX > 90) {
                spinX = 90;
            }
            origX = e.offsetX;
            origY = e.offsetY;
        }
    });


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

    render();
}

function colorCube() {
    quad(1, 0, 3, 2);
    quad(2, 3, 7, 6);
    quad(3, 0, 4, 7);
    quad(6, 5, 1, 2);
    quad(4, 5, 6, 7);
    quad(5, 4, 0, 1);
}

function quad(a, b, c, d) {
    var vertices = [
        vec3(-0.5, -0.5, 0.5),
        vec3(-0.5, 0.5, 0.5),
        vec3(0.5, 0.5, 0.5),
        vec3(0.5, -0.5, 0.5),
        vec3(-0.5, -0.5, -0.5),
        vec3(-0.5, 0.5, -0.5),
        vec3(0.5, 0.5, -0.5),
        vec3(0.5, -0.5, -0.5)
    ];

    var vertexColors = [
        [0.0, 0.0, 0.0, 1.0],  // black
        [0.0, 255.0, 51.0 / 255, 1.0],  // minn grænn
        [1.0, 1.0, 0.0, 1.0],  // yellow
        [0.0, 1.0, 0.0, 1.0],  // green
        [50 / 255, 57 / 255, 70 / 255, 1.0],  // Bakgrunnur
        [1.0, 0.0, 1.0, 1.0],  // magenta
        [0.0, 1.0, 1.0, 1.0],  // cyan
        [1.0, 1.0, 1.0, 1.0]   // white
    ];

    var indices = [a, b, c, a, c, d];

    for (var i = 0; i < indices.length; ++i) {
        points.push(vertices[indices[i]]);
        colors.push(vertexColors[a]);
    }
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var aspectRatio = canvas.width / canvas.height;
    var fov = 45;
    var near = 0.1;
    var far = 100.0;
    var projectionMatrix = perspective(fov, aspectRatio, near, far);

    var eye = vec3(0.0, -1.0, -3);
    var at = vec3(0.0, 0.0, 0.0);
    var up = vec3(0.0, -1.0, 0.0);
    var viewMatrix = lookAt(eye, at, up);

    var mv = mult(projectionMatrix, viewMatrix);

    mv = mult(mv, rotateX(spinX));
    mv = mult(mv, rotateY(spinY));

    var currentTime = new Date();
    var milliseconds = currentTime.getMilliseconds();
    var seconds = currentTime.getSeconds();
    var minutes = currentTime.getMinutes();
    var hours = currentTime.getHours();

    logo.textContent = hours.toString().padStart(2, '0') + ":" +
        minutes.toString().padStart(2, '0') + ":" +
        seconds.toString().padStart(2, '0');


    var offsetTime = -90;
    var hourAngle = (360 + offsetTime - ((hours % 12) * 30 + minutes * 0.5)) % 360;

    var minuteAngle = (360 + offsetTime - hourAngle - (minutes * 6 + seconds * 0.1)) % 360;

    var secondAngle = (360 + offsetTime - hourAngle - minuteAngle - (seconds * 6 + (milliseconds / 166.66))) % 360;

    var mv1 = mult(mv, translate(0.0, 0.0, -0.05));
    var mv1 = mult(mv1, rotateX(180));
    mv1 = mult(mv1, scalem(1.5, 1.5, 0.01));
    gl.uniformMatrix4fv(matrixLoc, false, flatten(mv1));
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);

    var armLength = 0.33;
    var armWidth = 0.03;

    mv1 = mult(mv, rotateZ(hourAngle));
    mv1Final = mult(mv1, translate(armLength / 2, 0.0, 0.0));
    mv1Final = mult(mv1Final, scalem(armLength, armWidth, armWidth));
    gl.uniformMatrix4fv(matrixLoc, false, flatten(mv1Final));
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);

    var mv2 = mv1;
    mv2 = mult(mv2, translate(armLength, 0.0, 0.0));
    mv2 = mult(mv2, rotateZ(minuteAngle));
    mv2Final = mult(mv2, translate(armLength / 2, 0.0, 0.0));
    mv2Final = mult(mv2Final, scalem(armLength, armWidth * 0.8, armWidth * 0.8));
    gl.uniformMatrix4fv(matrixLoc, false, flatten(mv2Final));
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);

    var mv3 = mv2;
    mv3 = mult(mv3, translate(armLength, 0.0, 0.0));
    mv3 = mult(mv3, rotateZ(secondAngle));
    mv3 = mult(mv3, translate(armLength / 2, 0.0, 0.0));
    mv3 = mult(mv3, scalem(armLength, armWidth * 0.6, armWidth * 0.6));
    gl.uniformMatrix4fv(matrixLoc, false, flatten(mv3));
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);

    requestAnimFrame(render);
}


function setCanvasSize(canvas) {
    var size = Math.min(window.innerWidth * 0.95, window.innerHeight * 0.8);
    canvas.width = size;
    canvas.height = size;
    if (gl) {
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
}
