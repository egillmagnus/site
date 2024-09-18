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
        setUniformVariables();
    });

    canvas.addEventListener("wheel", function (event) {
        event.preventDefault();
        if (event.deltaY < 0) {
            scale *= 1.03;
        } else {
            scale *= 0.97;
        }
        setUniformVariables();
    });

    canvas.addEventListener("mousedown", function (event) {
        isDragging = true;
        lastMousePosition = vec2(event.clientX, event.clientY);
    });

    canvas.addEventListener("mousemove", function (event) {
        if (isDragging) {
            var currentPosition = vec2(event.clientX, event.clientY);
            var delta = subtract(currentPosition, lastMousePosition);
            offset = add(offset, vec2(delta[0] * 2.0 / canvas.width, delta[1] * -2.0 / canvas.width));
            lastMousePosition = currentPosition;
            setUniformVariables();
        }
    });

    canvas.addEventListener("mouseup", function () {
        isDragging = false;
    });

    canvas.addEventListener("mouseleave", function () {
        isDragging = false;
    });

    window.addEventListener("keydown", function (event) {
        event.preventDefault();
        if (event.code === "Space") {
            hue = Math.random();
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
        vec2(-0.9, -0.9),
        vec2(0, 0.9),
        vec2(0.9, -0.9)
    ];

    var u = add(vertices[0], vertices[1]);
    var v = add(vertices[0], vertices[2]);
    var p = mix(u, v, 0.25);

    points = [p];

    for (var i = 0; points.length < NumPoints; ++i) {
        var j = Math.floor(Math.random() * 3);

        p = add(points[i], vertices[j]);
        p = mix(p, vec2(0, 0), 0.5);
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

// Breytir úr hue, saturation og lightness í rgb, gerir fallegri liti en að randomise-a rgb gildi.
function hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
        r = g = b = l;
    } else {
        function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 3) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        }

        let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        let p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return [r, g, b];
}

let hue = 0.0;
const speed = 0.002;

function render() {
    hue += speed;
    hue = hue % 1;

    const rgb = hslToRgb(hue, 1.0, 0.5);
    color = [...rgb, 1.0];

    setUniformVariables();

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, points.length);

    window.requestAnimFrame(render);
}
