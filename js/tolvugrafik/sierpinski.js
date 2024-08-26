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

    const checkbox1 = document.getElementById('checkbox1');
    const checkbox2 = document.getElementById('checkbox2');

    checkbox1.addEventListener('change', () => {
        if (checkbox1.checked) {
            checkbox2.checked = false;
        }
        recalculatePoints();
    });

    checkbox2.addEventListener('change', () => {
        if (checkbox2.checked) {
            checkbox1.checked = false;
        }
        recalculatePoints();
    });

    // Set the initial canvas size and keep it square (based on window width)
    setCanvasSize(canvas);

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    // Setup the slider with width equal to canvas width
    var pointSlider = document.getElementById("point-slider");
    pointSlider.style.width = canvas.width + "px";

    pointSlider.addEventListener("input", function (event) {
        NumPoints = parseInt(event.target.value);
        recalculatePoints();  // Recalculate and re-render based on the new NumPoints
    });

    window.addEventListener("resize", function () {
        setCanvasSize(canvas);
        pointSlider.style.width = canvas.width + "px";  // Adjust slider width with the canvas
        recalculatePoints();  // Recalculate and re-render after resize
    });

    recalculatePoints();  // Initial calculation and rendering
};

function setCanvasSize(canvas) {
    var size = Math.min(window.innerWidth, window.innerHeight);  // Make canvas size based on window size
    canvas.width = size * 0.6;
    canvas.height = size * 0.6;
    if (gl) {
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
}

function recalculatePoints() {
    // Initialize our data for the Sierpinski Gasket
    var vertices = [
        vec2(-1, -1),
        vec2(0, 1),
        vec2(1, -1)
    ];

    // Specify a starting point p for our iterations
    var p;

    // Check which checkbox is selected and apply the corresponding logic
    if (document.getElementById('checkbox1').checked) {
        // If Checkbox 1 is selected, set the starting point to (100, 100)
        p = vec2(100, 100);
    } else if (document.getElementById('checkbox2').checked) {
        // If Checkbox 2 is selected, use normal starting point, but modify the point selection with 90% chance for vertices[0]
        p = vec2(0, 0);
    } else {
        // Default case
        var u = add(vertices[0], vertices[1]);
        var v = add(vertices[0], vertices[2]);
        p = scale(0.25, add(u, v));
    }

    points = [p];  // Reset points

    // Compute new points
    for (var i = 0; points.length < NumPoints; ++i) {
        var j;

        if (document.getElementById('checkbox2').checked) {
            // With 90% chance, select vertices[0]
            if (Math.random() < 0.9) {
                j = 0;
            } else {
                j = Math.floor(Math.random() * 2) + 1;  // Randomly select another vertex
            }
        } else {
            j = Math.floor(Math.random() * 3);  // Normal random selection
        }

        p = add(points[i], vertices[j]);
        p = scale(0.5, p);
        points.push(p);
    }

    // Re-upload the points to the GPU
    var bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    // Associate shader variables with our data buffer
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    render();  // Render the updated points
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, points.length);
}
