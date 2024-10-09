var canvas;
var gl;

var points = [];
var colors = [];

var nEmptyIterations = 0;

var movement = false;
var spinX = 30;
var spinY = 45;
var origX;
var origY;

var normals = [];

var program;

var gridSize = 10;
var grid = createGrid(gridSize);
var lastUpdateTime = Date.now();

let initialPinchDistance = null;
let lastPinchZoom = zoom;

var zoom = 25.0;


var prevGrid = createEmptyGrid(gridSize);

var animationDuration = 1000;
var fullRotation = Math.PI * 2;

var updateInterval = 2500;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    const resetButton = document.getElementById('reset-button');
    resetButton.addEventListener('click', function () {
        resetGrid();
    });

    let menuicon = document.querySelector("#menu-icon");
    let navbar = document.querySelector(".navbar");

    menuicon.onclick = () => {
        menuicon.classList.toggle("bx-x");
        navbar.classList.toggle("active");
    };

    var speedSlider = document.getElementById("speed-slider");
    speedSlider.addEventListener("input", function (event) {
        var newUpdateInterval = parseInt(event.target.value);

        var ratio = newUpdateInterval / updateInterval
        updateInterval = newUpdateInterval;
        animationDuration = Math.max(500, updateInterval * 2 / 5);
        var timeSinceUpdate = Date.now() - lastUpdateTime;
        timeSinceUpdate = Date.now() - (timeSinceUpdate * ratio)
    });
    colorCube();

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(31 / 255, 36 / 255, 45 / 255, 1.0);

    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    // lighting 
    var lightPosLoc = gl.getUniformLocation(program, "lightPos");
    var viewPosLoc = gl.getUniformLocation(program, "viewPos");
    var ambientColorLoc = gl.getUniformLocation(program, "ambientColor");
    var diffuseColorLoc = gl.getUniformLocation(program, "diffuseColor");
    var specularColorLoc = gl.getUniformLocation(program, "specularColor");
    var shininessLoc = gl.getUniformLocation(program, "shininess");

    gl.uniform3fv(lightPosLoc, flatten(vec3(10.0, 10.0, 10.0)));
    gl.uniform3fv(viewPosLoc, flatten(vec3(0.0, 0.0, zoom)));
    gl.uniform3fv(ambientColorLoc, flatten(vec3(0.1, 0.1, 0.1)));
    gl.uniform3fv(diffuseColorLoc, flatten(vec3(0.0, 1.0, 0.0)));
    gl.uniform3fv(specularColorLoc, flatten(vec3(0.5, 1.0, 0.5)));
    gl.uniform1f(shininessLoc, 32.0);

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
            spinY = (spinY - (origX - e.offsetX) * 0.2) % 360;
            spinX = (spinX - (origY - e.offsetY) * 0.2) % 360;

            if (spinX < -90) {
                spinX = -90;
            } else if (spinX > 90) {
                spinX = 90;
            }
            origX = e.offsetX;
            origY = e.offsetY;
        }
    });

    canvas.addEventListener("mouseleave", function () {
        isDragging = false;
    });

    canvas.addEventListener("wheel", function (event) {
        event.preventDefault();
        if (event.deltaY < 0) {
            zoom += 0.5;
        } else {
            zoom -= 0.5;
        }

        zoom = Math.max(Math.min(zoom, 100.0), 0.5);
    }, { passive: false });

    canvas.addEventListener("touchstart", function (e) {
        if (e.touches.length === 1) {
            movement = true;
            origX = e.touches[0].clientX;
            origY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            movement = false;
            initialPinchDistance = getPinchDistance(e.touches[0], e.touches[1]);
            lastPinchZoom = zoom;
        }
    }, { passive: false });

    canvas.addEventListener("touchmove", function (e) {
        if (e.touches.length === 1 && movement) {
            var deltaX = e.touches[0].clientX - origX;
            var deltaY = e.touches[0].clientY - origY;
            spinY += (deltaX * 0.5) % 360;
            spinX += (deltaY * 0.5) % 360;

            if (spinX < -90) spinX = -90;
            if (spinX > 90) spinX = 90;

            origX = e.touches[0].clientX;
            origY = e.touches[0].clientY;
        } else if (e.touches.length === 2 && initialPinchDistance) {
            let currentPinchDistance = getPinchDistance(e.touches[0], e.touches[1]);

            let pinchZoomFactor = initialPinchDistance / currentPinchDistance;

            zoom = lastPinchZoom * pinchZoomFactor;

            zoom = Math.max(Math.min(zoom, 100.0), 0.5);

            e.preventDefault();
        }
    }, { passive: false });

    canvas.addEventListener("touchend", function (e) {
        if (e.touches.length < 2) {
            initialPinchDistance = null;
        }

        if (e.touches.length === 0) {
            movement = false;
        }
    }, { passive: false });

    window.addEventListener("resize", function () {
        setCanvasSize(canvas);
        speedSlider.style.width = Math.min(canvas.width, window.innerWidth * 0.9) + "px";
    });

    render();

    setCanvasSize(canvas);
    speedSlider.style.width = Math.min(canvas.width, window.innerWidth * 0.9) + "px";
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

    var normal = cross(
        subtract(vertices[b], vertices[a]),
        subtract(vertices[c], vertices[b])
    );

    normal = normalize(normal);

    var indices = [a, b, c, a, c, d];


    for (var i = 0; i < indices.length; ++i) {
        points.push(vertices[indices[i]]);
        normals.push(normal);
    }
}

function createGrid(size) {
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
    var near = 0.001;
    var far = zoom + 8;
    var projectionMatrix = perspective(fov, aspectRatio, near, far);
    var eye = vec3(0.0, 0.0, zoom);
    var at = vec3(0.0, 0.0, 0.0);
    var up = vec3(0.0, 1.0, 0.0);
    var viewMatrix = lookAt(eye, at, up);

    var viewPosLoc = gl.getUniformLocation(program, "viewPos");
    gl.uniform3fv(viewPosLoc, flatten(eye));

    var globalTransform = mult(projectionMatrix, viewMatrix);

    globalTransform = mult(globalTransform, rotateX(spinX));
    globalTransform = mult(globalTransform, rotateY(spinY));


    var currentTime = Date.now();

    if (currentTime - lastUpdateTime > updateInterval) {
        updateGrid();
    }


    if (currentTime - lastUpdateTime < animationDuration) {
        var elapsed = (currentTime - lastUpdateTime) % animationDuration;
        var progress = elapsed / animationDuration;
        var rotation = progress * fullRotation;

        renderGrid(globalTransform, progress, rotation, true);
    } else {
        renderGrid(globalTransform, 1, 0, false);
    }

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
    prevGrid = grid;
    var empty = true;
    let newGrid = createEmptyGrid(gridSize);

    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            for (let z = 0; z < gridSize; z++) {
                let neighbors = countNeighbors(x, y, z);

                if (grid[x][y][z] === 1) {
                    if (neighbors >= 5 && neighbors <= 7) {
                        newGrid[x][y][z] = 1;
                        empty = false;
                    } else {
                        newGrid[x][y][z] = 0;
                    }
                } else {
                    if (neighbors === 6) {
                        newGrid[x][y][z] = 1;
                        empty = false;
                    } else {
                        newGrid[x][y][z] = 0;
                    }
                }
            }
        }
    }

    if (empty) {
        nEmptyIterations++;
    }


    grid = newGrid;
    lastUpdateTime = Date.now();
    if (nEmptyIterations >= 5) {
        resetGrid();
    }
}

function renderGrid(globalTransform, progress, rotation, animate) {
    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            for (let z = 0; z < gridSize; z++) {
                var isPrevActive = prevGrid[x][y][z] === 1;
                var isNewActive = grid[x][y][z] === 1;
                var isAnimating = isPrevActive !== isNewActive;

                if (animate && isAnimating) {
                    var scale = isNewActive ? progress : 1 - progress;
                    drawAnimatedCube(x, y, z, globalTransform, scale, rotation);
                } else if (isNewActive) {
                    drawCube(x, y, z, globalTransform);
                }
            }
        }
    }
}


function easing(t) {
    return t * t;
}



function drawCube(x, y, z, globalTransform) {
    let mv = mat4();

    let spacing = 1.1;
    let centerOffset = (gridSize - 1) / 2;
    mv = mult(mv, translate(
        (x - centerOffset) * spacing,
        (y - centerOffset) * spacing,
        (z - centerOffset) * spacing
    ));

    let transform = mult(globalTransform, mv);

    gl.uniformMatrix4fv(matrixLoc, false, flatten(transform));

    gl.drawArrays(gl.TRIANGLES, 0, 36);
}

function drawAnimatedCube(x, y, z, globalTransform, scale, rotation) {
    let mv = mat4();

    let spacing = 1.1;

    let easedScale = easing(scale);
    let centerOffset = (gridSize - 1) / 2;
    mv = mult(mv, translate(
        (x - centerOffset) * spacing,
        (y - centerOffset) * spacing,
        (z - centerOffset) * spacing
    ));


    mv = mult(mv, rotateY(rotation * (180 / Math.PI)))

    mv = mult(mv, scalem(easedScale * 0.95, easedScale * 0.95, easedScale * 0.95));

    let finalTransform = mult(globalTransform, mv);

    gl.uniformMatrix4fv(matrixLoc, false, flatten(finalTransform));

    gl.drawArrays(gl.TRIANGLES, 0, 36);
}

function createEmptyGrid(size) {
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

function resetGrid() {
    grid = createGrid(gridSize);
    prevGrid = createEmptyGrid(gridSize);
    lastUpdateTime = Date.now();
    nEmptyIterations = 0;
}


function getPinchDistance(touch1, touch2) {
    let dx = touch1.clientX - touch2.clientX;
    let dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
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
