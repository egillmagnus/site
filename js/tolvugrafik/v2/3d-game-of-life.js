var canvas;
var gl;

var points = [];
var colors = [];

var movement = false;
var spinX = -10;
var spinY = 180;
var origX;
var origY;

var gridSize = 10;
var grid = create3DGrid(gridSize);

var updateInterval = 3000;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    const resetButton = document.getElementById('reset-button');
    resetButton.addEventListener('click', function () {
        grid = create3DGrid(gridSize);
    });

    let menuicon = document.querySelector("#menu-icon");
    let navbar = document.querySelector(".navbar");

    menuicon.onclick = () => {
        menuicon.classList.toggle("bx-x");
        navbar.classList.toggle("active");
    };

    setCanvasSize(canvas);

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

    // Event listeners for mouse
    canvas.addEventListener("mousedown", function (e) {
        movement = true;
        origX = e.offsetX;
        origY = e.offsetY;
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

    setInterval(updateGrid, updateInterval);
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
        [1.0, 0.0, 0.0, 1.0],  // red
        [1.0, 1.0, 0.0, 1.0],  // yellow
        [0.0, 1.0, 0.0, 1.0],  // green
        [0.0, 0.0, 1.0, 1.0],  // blue
        [1.0, 0.0, 1.0, 1.0],  // magenta
        [0.0, 1.0, 1.0, 1.0],  // cyan
        [1.0, 1.0, 1.0, 1.0]   // white
    ];

    // Vertex color assigned by the index of the face
    var indices = [a, b, c, a, c, d];

    for (var i = 0; i < indices.length; ++i) {
        points.push(vertices[indices[i]]);
        colors.push(vertexColors[a]);
    }
}

function create3DGrid(size) {
    let grid = [];
    for (let x = 0; x < size; x++) {
        grid[x] = [];
        for (let y = 0; y < size; y++) {
            grid[x][y] = [];
            for (let z = 0; z < size; z++) {
                grid[x][y][z] = Math.random() > 0.7 ? 1 : 0;
            }
        }
    }
    return grid;
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var aspectRatio = canvas.width / canvas.height;
    var fov = 45;
    var near = 0.1;
    var far = 100.0;
    var projectionMatrix = perspective(fov, aspectRatio, near, far);

    var eye = vec3(0.0, 0.0, 25.0);
    var at = vec3(0.0, 0.0, 0.0);
    var up = vec3(0.0, 1.0, 0.0);
    var viewMatrix = lookAt(eye, at, up);

    var globalTransform = mult(projectionMatrix, viewMatrix);

    globalTransform = mult(globalTransform, rotateX(spinX));
    globalTransform = mult(globalTransform, rotateY(spinY));


    renderGrid(globalTransform);

    requestAnimationFrame(render);
}

function countNeighbors(x, y, z) {
    let neighbors = 0;
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            for (let k = -1; k <= 1; k++) {
                if (i === 0 && j === 0 && k === 0) continue;
                let nx = x + i;
                let ny = y + j;
                let nz = z + k;
                if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize && nz >= 0 && nz < gridSize) {
                    neighbors += grid[nx][ny][nz];
                }
            }
        }
    }
    return neighbors;
}

function updateGrid() {
    let newGrid = createEmpty3DGrid(gridSize);

    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            for (let z = 0; z < gridSize; z++) {
                let neighbors = countNeighbors(x, y, z);

                if (grid[x][y][z] === 1) {
                    // Survive if 5, 6, or 7 neighbors
                    if (neighbors >= 5 && neighbors <= 7) {
                        newGrid[x][y][z] = 1;
                    } else {
                        newGrid[x][y][z] = 0;
                    }
                } else {
                    // Spawn if exactly 6 neighbors
                    if (neighbors === 6) {
                        newGrid[x][y][z] = 1;
                    } else {
                        newGrid[x][y][z] = 0;
                    }
                }
            }
        }
    }
    grid = newGrid;
}

function createEmpty3DGrid(size) {
    let grid = [];
    for (let x = 0; x < size; x++) {
        grid[x] = [];
        for (let y = 0; y < size; y++) {
            grid[x][y] = [];
            for (let z = 0; z < size; z++) {
                grid[x][y][z] = 0;
            }
        }
    }
    return grid;
}

function renderGrid(globalTransform) {
    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            for (let z = 0; z < gridSize; z++) {
                if (grid[x][y][z] === 1) {
                    drawCube(x, y, z, globalTransform);
                }
            }
        }
    }
}

function drawCube(x, y, z, globalTransform) {
    let modelMatrix = mat4();

    modelMatrix = mult(modelMatrix, scalem(0.95, 0.95, 0.95));

    let spacing = 1.1;
    modelMatrix = mult(modelMatrix, translate(
        (x - gridSize / 2) * spacing,
        (y - gridSize / 2) * spacing,
        (z - gridSize / 2) * spacing
    ));

    let transform = mult(globalTransform, modelMatrix);

    gl.uniformMatrix4fv(matrixLoc, false, flatten(transform));

    gl.drawArrays(gl.TRIANGLES, 0, 36);
}


function setCanvasSize(canvas) {
    var size = Math.min(window.innerWidth * 0.95, window.innerHeight * 0.8);
    canvas.width = size;
    canvas.height = size;
    if (gl) {
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
}
