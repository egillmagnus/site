"use strict";

var gl;
var points;
var NumPoints = 50000;
var scale = 1;
var offset = vec2(0, 0);
var color = vec4(0.0, 1.0, 0.20392156862, 1.0);
var isDragging = false;
var lastMousePosition = vec2(0, 0);
var program;

window.onload = function init() {
    var canvas = document.getElementById("gl-canvas");

    let menuicon = document.querySelector("#menu-icon");
    let navbar = document.querySelector(".navbar");

    menuicon.onclick = () => {
        menuicon.classList.toggle("bx-x");
        navbar.classList.toggle("active");
    };

    setCanvasSize(canvas);

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    gl.clearColor(31 / 255, 36 / 255, 45 / 255, 1.0);

    calculatePoints();
    setUniformVariables();

    window.addEventListener("resize", function () {
        setCanvasSize(canvas);
        pointSlider.style.width = canvas.width + "px";
        setUniformVariables();
    });

    canvas.addEventListener("wheel", function(event) {
        event.preventDefault();
        if (event.deltaY < 0) {
            scale *= 1.03;
        } else {
            scale *= 0.97;
        }
        setUniformVariables();
    });

    canvas.addEventListener("mousedown", function(event) {
        isDragging = true;
        lastMousePosition = vec2(event.clientX, event.clientY);
    });

    canvas.addEventListener("mousemove", function(event) {
        if (isDragging) {
            var currentPosition = vec2(event.clientX, event.clientY);
            var delta = subtract(currentPosition, lastMousePosition);
            offset = add(offset, vec2(delta[0] * 2.0 / canvas.width, delta[1] * -2.0 / canvas.width )); // Adjust offset based on drag
            lastMousePosition = currentPosition;
            setUniformVariables();
        }
    });

    canvas.addEventListener("mouseup", function() {
        isDragging = false;
    });

    canvas.addEventListener("mouseleave", function() {
        isDragging = false;
    });

    window.addEventListener("keydown", function(event) {
        event.preventDefault();
        if (event.code === "Space") {
            color = vec4(Math.random(), Math.random(), Math.random(), 1.0);
            setUniformVariables();
        }
    });
};

function setUniformVariables() {
    console.log("Offset: " + offset);
    console.log("Scale: " + scale);
    var scaleUniformLocation = gl.getUniformLocation(program, "scale");
    var offsetUniformLocation = gl.getUniformLocation(program, "offset");
    var colorUniformLocation = gl.getUniformLocation(program, "color");

    gl.uniform1f(scaleUniformLocation, scale);
    gl.uniform2fv(offsetUniformLocation, offset);
    gl.uniform4fv(colorUniformLocation, flatten(color));
    render();
}

function setCanvasSize(canvas) {
    var size = Math.min(window.innerWidth * 0.95, window.innerHeight * 0.8);
    canvas.width = size;
    canvas.height = size;
    if (gl) {
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
}

function calculatePoints() {
    var vertices = [
        vec2( -0.9, -0.9 ),
        vec2(    0,  0.9 ),
        vec2(  0.9, -0.9 )
    ];

        var u = add(vertices[0], vertices[1]);
        var v = add(vertices[0], vertices[2]);
        var p = mix(u, v, 0.25);

    points = [p];

    for (var i = 0; points.length < NumPoints; ++i) {
        var j = Math.floor(Math.random() * 3); 

        p = add(points[i], vertices[j]);
        p = mix(p, vec2(0, 0), 0.5 );
        points.push(p);
    }

    var bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, points.length);
}
