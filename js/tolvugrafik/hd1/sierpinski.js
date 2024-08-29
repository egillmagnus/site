"use strict";

var gl;
var points;
var NumPoints = 5000;

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

    var pointSlider = document.getElementById("point-slider");
    pointSlider.style.width = canvas.width + "px";

    pointSlider.addEventListener("input", function (event) {
        NumPoints = parseInt(event.target.value);
        recalculatePoints();
    });

    window.addEventListener("resize", function () {
        setCanvasSize(canvas);
        pointSlider.style.width = canvas.width + "px";
        recalculatePoints();
    });
    gl.clearColor(31 / 255, 36 / 255, 45 / 255, 1.0);


    recalculatePoints();
};

function setCanvasSize(canvas) {
    var size = Math.min(window.innerWidth, window.innerHeight);
    canvas.width = size * 0.6;
    canvas.height = size * 0.6;
    if (gl) {
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
}

function recalculatePoints() {
    var vertices = [
        vec2( -0.9, -0.9 ),
        vec2(    0,  0.9 ),
        vec2(  0.9, -0.9 )
    ];

    var p;

    var u = add(vertices[0], vertices[1]);
    var v = add(vertices[0], vertices[2]);
    p = scale(0.25, add(u, v));

    points = [p];

    for (var i = 0; points.length < NumPoints; ++i) {
        var j = Math.floor(Math.random() * 3);


        p = add(points[i], vertices[j]);
        p = scale(0.5, p);
        points.push(p);
    }

    var bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
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
