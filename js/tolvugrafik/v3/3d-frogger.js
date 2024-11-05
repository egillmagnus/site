
// Global variables
let gl, program;
let frogPosition = { x: -0.5, y: 0, z: -6 };
let matrixLoc;

// Variables for camera rotation in frog view
let spinX = -20; // Rotation along x-axis
let spinY = 180; // Rotation along y-axis
let movement = false;
let origX, origY;

let deathTime;


var finished = [];


var fly = { x: 0, z: 6, active: true, spawnTime: 0 };
let turtles = [];
const turtleLanes = [
    { z: 1, count: 3 },
    { z: 4, count: 2 }
];

const finishPositions = [-6, -3, 0, 3, 6];

let diveTimer = 0;
const diveCycleDuration = 4000;
const divePhaseDuration = 1000;

var vPosition;
var vNormal;
var vColor;

var viewMatrix;

var lastMovementDir = 0;

let modelsLoaded = 0;

let dead = false;


let cars = [];
let difficulty = 0.05;
let lanes = [
    { z: -5, direction: -1 },
    { z: -4, direction: 1 },
    { z: -3, direction: -1 },
    { z: -2, direction: 1 },
    { z: -1, direction: -1 },
];

let logs = [];
const logLanes = [
    { z: 2, speedMultiplier: 0.75 },
    { z: 3, speedMultiplier: 1 },
    { z: 5, speedMultiplier: 0.5 }
];



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
var frogOnThing = false;

const lightPosition = vec3(10.0, 20.0, 200.0);
const lightAmbient = vec3(0.7, 0.7, 0.7);
const lightDiffuse = vec3(0.9, 0.9, 0.9);
const lightSpecular = vec3(1.0, 1.0, 1.0);


var frogBuffers;
var carBuffers;
var flyBuffers;
var turtleBuffers;
var logBuffers;

var update = true;

var viewNr = 0;
let score = 0;
let lives = 3;


var canvas;
var gameInfo;

let groundBuffer, groundColorBuffer, groundVertexCount;



// Global variables for the frog model
let frogVertexBuffer, frogNormalBuffer, frogIndexBuffer, frogIndexCount;




window.onload = function init() {

    // Set up WebGL context
    canvas = document.getElementById("gl-canvas");
    gameInfo = document.getElementById("game-info");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.38, 0.718, 1, 1);
    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

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


    const aspect = canvas.width / canvas.height;
    const fov = 90;
    const near = 0.1;
    const far = 100.0;
    const projectionMatrix = perspective(fov, aspect, near, far);
    gl.uniformMatrix4fv(uProjectionMatrixLoc, false, flatten(projectionMatrix));

    setCanvasSize(canvas);
    window.addEventListener("keydown", (event) => {
        switch (event.key) {
            case "ArrowUp":
            case "ArrowDown":
            case "ArrowLeft":
            case "ArrowRight":
            case "v":
                event.preventDefault();
        }
        if (dead && event.key !== "v") {
            return;
        }
        switch (event.key) {
            case "ArrowUp":
                if (viewNr == 1) {
                    moveInFrogView(0);
                } else {
                    frogPosition.z += 1;
                    lastMovementDir = 0;
                }
                break;
            case "ArrowDown":
                if (viewNr == 1) {
                    moveInFrogView(2);
                } else {
                    frogPosition.z -= 1;
                    lastMovementDir = 2;
                }
                break;
            case "ArrowLeft":
                if (viewNr == 1) {
                    moveInFrogView(1);
                } else {
                    frogPosition.x += 1;
                    lastMovementDir = 1;
                }
                break;
            case "ArrowRight":
                if (viewNr == 1) {
                    moveInFrogView(3);
                } else {
                    frogPosition.x -= 1;
                    lastMovementDir = 3;
                }
                break;
            case "v": // Toggle view
                console.log("Switching view");
                viewNr = (viewNr + 1) % 3
                spinY = (180 + 90 * lastMovementDir) % 360;
                break;
            case "p": // Toggle view
                update = !update;
                break;
            case "s": // Toggle view
                updateElements();
                break;
        }
        frogPosition.x = Math.max(Math.min(frogPosition.x, 6.5), -6.5);
        frogPosition.z = Math.max(Math.min(frogPosition.z, 6), -6);
        console.log("frogPos " + frogPosition.x);
    });

    // Mouse handlers for rotating the view in frog perspective
    canvas.addEventListener("mousedown", function (e) {
        if (viewNr == 1) {
            movement = true;
            origX = e.offsetX;
            origY = e.offsetY;
        }
    });

    canvas.addEventListener("mouseup", () => (movement = false));

    canvas.addEventListener("mousemove", function (e) {
        if (movement && viewNr == 1) {
            spinY = (spinY - (origX - e.offsetX) * 0.2) % 360;
            spinX = Math.min(Math.max(spinX - (origY - e.offsetY) * 0.2, -200), 90); // Limit looking up/down
            origX = e.offsetX;
            origY = e.offsetY;
        }
    });

    window.addEventListener("resize", function () {
        setCanvasSize(canvas);
    });

    initializeThings();


    loadFrogModel(gl, '/verkefni/tolvugrafik/v3/froggy.obj', function (buffers) {
        console.log("loaded frog model");
        frogBuffers = buffers;

        modelsLoaded++;
        if (modelsLoaded === 4) {
            render();
        }

    });

    loadCarModel(gl, '/verkefni/tolvugrafik/v3/car.obj', function (buffers) {
        console.log("Car model loaded");
        carBuffers = buffers;
        modelsLoaded++;
        if (modelsLoaded === 4) {
            render();
        }
    });

    loadFlyModel(gl, '/verkefni/tolvugrafik/v3/fly.obj', function (buffers) {
        console.log("Car model loaded");
        flyBuffers = buffers;
        modelsLoaded++;
        if (modelsLoaded === 4) {
            render();
        }
    });

    loadTurtleModel(gl, '/verkefni/tolvugrafik/v3/turtle.obj', function (buffers) {
        console.log("Car model loaded");
        turtleBuffers = buffers;
        modelsLoaded++;
        if (modelsLoaded === 4) {
            render();
        }
    });

    logBuffers = initLogBuffers(gl);

    fly.spawnTime = Date.now();

};


function moveInFrogView(moveDir) {
    newDir = (moveDir + lastMovementDir) % 4;

    console.log("moveDir" + moveDir);
    console.log("lastMovementDir" + lastMovementDir);
    console.log("newDir" + newDir);


    if (newDir == 0) {
        frogPosition.z += 1;
    } else if (newDir == 1) {
        frogPosition.x += 1;
    } else if (newDir == 2) {
        frogPosition.z -= 1;
    } else if (newDir == 3) {
        frogPosition.x -= 1;
    }

    spinY = (180 + 90 * newDir) % 360;
    lastMovementDir = newDir;
}

function initializeThings() {
    initializeCars();
    initializeTurtles();
    initializeLogs();
}


function initializeCars() {
    for (var i = 0; i < 4 * 60; i++) {
        updateCars();
    }
}

function initializeTurtles() {
    for (var i = 0; i < 4 * 160; i++) {
        updateTurtles();
    }
}

function initializeLogs() {
    for (var i = 0; i < 4 * 60; i++) {
        updateLogs();
    }
}


function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let projectionMatrix;
    const aspect = canvas.width / canvas.height;
    const near = 0.01;
    const far = 100.0;

    var transformedLightPos;


    if (viewNr == 1) {

        var frogTranslation = translate(-frogPosition.x, -0.4, -frogPosition.z);
        const frogRotation = rotateY(-spinY);

        viewMatrix = mult(frogRotation, frogTranslation);

        viewMatrix = mult(translate(0, -frogPosition.y, 0.2), viewMatrix);

        projectionMatrix = perspective(120, aspect, near, far);


        const eye = vec3(0, -frogPosition.y, 0.2);
        gl.uniform3fv(uCameraPositionLoc, flatten(eye));
        transformedLightPos = mult(viewMatrix, vec4(lightPosition, 0));
    } else if (viewNr == 0) {
        // Default view
        const eye = vec3(0.0, 15.0, 0.0);
        const at = vec3(0.0, 0.0, 0.0);
        const up = vec3(0.0, 0.0, 1.0);

        viewMatrix = lookAt(eye, at, up);

        const left = -7.0;
        const right = 7.0;
        const bottom = -6.5;
        const top = 6.5;
        const near = 0.1;
        const far = 100.0;
        projectionMatrix = ortho(left, right, bottom, top, near, far);

        gl.uniform3fv(uCameraPositionLoc, flatten(eye));
        transformedLightPos = mult(mat4(), vec4(lightPosition, 0));
    } else {
        const eye = vec3(frogPosition.x, 10.0, frogPosition.z - 5.0);
        const at = vec3(frogPosition.x, 0.0, frogPosition.z);
        const up = vec3(0.0, 1.0, 0.0);

        viewMatrix = lookAt(eye, at, up);

        const fov = 45.0;
        const aspect = canvas.width / canvas.height;
        const near = 0.1;
        const far = 100.0;
        projectionMatrix = perspective(fov, aspect, near, far);

        gl.uniform3fv(uCameraPositionLoc, flatten(eye));
        transformedLightPos = mult(mat4(), vec4(lightPosition, 0));
    }

    gl.uniformMatrix4fv(uViewMatrixLoc, false, flatten(viewMatrix));
    gl.uniformMatrix4fv(uProjectionMatrixLoc, false, flatten(projectionMatrix));

    const modelMatrix = mat4();
    gl.uniformMatrix4fv(uModelMatrixLoc, false, flatten(modelMatrix));

    gl.uniform3fv(uLightPositionLoc, flatten(vec3(transformedLightPos[0], transformedLightPos[1], transformedLightPos[2])));

    const modelViewMatrix = mult(viewMatrix, modelMatrix);
    const normalMatrix1 = normalMatrix(modelViewMatrix, true);
    gl.uniformMatrix3fv(uNormalMatrixLoc, false, flatten(normalMatrix1));

    if (update) {
        updateElements();
    }
    drawElements();

    document.getElementById("score").innerText = `Score: ${score}`;
    document.getElementById("lives").innerText = `Lives: ${lives}`;

    requestAnimationFrame(render);
}

function resetGame() {
    score = 0;
    lives = 3;
    finished = [];
    difficulty = 0.05;
    console.log("Game reset");
    frogPosition = { x: -0.5, y: 0, z: -6 };
}


function killed() {
    if (dead) return;
    dead = true;

    lives -= 1;
    console.log(`Lives remaining: ${lives}`);

    deathTime = Date.now();
    setTimeout(function () {
        frogPosition = { x: -0.5, z: -6 };
        lastMovementDir = 0;
        spinY = (180 + 90 * lastMovementDir) % 360;
        if (lives <= 0) {
            resetGame();
        }
        dead = false;
    }, 1000);
}

function updateElements() {
    updateCars();
    updateFly();
    updateTurtles();
    updateLogs();

    updateFrog();
}

function updateFrog() {
    if ((!frogOnThing) && (frogPosition.z > 0 && frogPosition.z < 6)) {
        console.log("killed on water")
        killed();
    }

    if (!frogOnThing) {
        frogPosition.y = 0;
    }


    if (frogPosition.z == 6) {
        var finishPos = 10
        finishPositions.forEach(finish => {
            if (Math.abs(finish - frogPosition.x) < 1) {
                if (!finished.includes(finish)) {
                    finishPos = finish;
                } else {
                    console.log("killed because already finished here " + finish);
                    killed();
                }
            }
        });
        if (finishPos < 10) {
            gotFinish(finishPos);
        } else {
            killed();
        }
    }
}


function gotFinish(finish) {
    finished.push(finish);
    score += 100 + 5000 * difficulty;

    if (finished.length == 5) {
        score += 10000 * difficulty;
        difficulty *= 1.5;
        finished = [];
    }

    console.log(`Score: ${score}`);
    frogPosition = { x: -0.5, y: 0, z: -6 };
}


function updateCars() {
    lanes.forEach(lane => {
        let carsInLane = cars.filter(car => car.lane === lane.z);

        let canSpawn = !carsInLane.some(car => (car.x * -1 * lane.direction) > 3);

        if (canSpawn && carsInLane.length < 4 && Math.random() < 0.01) {
            let car = {
                x: (lane.direction === 1) ? -8 : 8,
                lane: lane.z,
                speed: lane.direction,
            };
            cars.push(car);
        }
    });

    for (let i = cars.length - 1; i >= 0; i--) {
        let car = cars[i];
        car.x += difficulty * 0.5 * car.speed;
        if (car.x < -8 || car.x > 8) {
            cars.splice(i, 1);
        } else {
            if (car.lane === frogPosition.z) {
                if (Math.abs(car.x - frogPosition.x) <= 1.2) {
                    console.log("killed by car");
                    killed();
                }
            }
        }
    }
}

function updateFly() {
    if (Date.now() - fly.spawnTime > 5000) {
        fly.spawnTime = Date.now();

        if (fly.active) {
            fly.active = false;
        } else {
            const availablePositions = finishPositions.filter(pos => !finished.includes(pos));

            if (availablePositions.length > 0) {
                fly.active = true;
                fly.x = availablePositions[Math.floor(Math.random() * availablePositions.length)];
            } else {
                fly.active = false;
            }
        }
    }
    if (fly.active && frogPosition.z === fly.z && Math.abs(frogPosition.x - fly.x) <= 1.0) {
        fly.active = false;
        score += 700;
    }
}


var spawncountLane1 = 0;
var spawncountLane2 = 0;
var depth = 0.4;

function updateTurtles() {

    turtleLanes.forEach(lane => {
        let turtlesInLane = turtles.filter(turtle => turtle.lane === lane.z);

        // Condition to spawn a new turtle group
        let canSpawn = !turtlesInLane.some(turtle => turtle.x < -8 + lane.count);

        if (canSpawn && turtlesInLane.length < 4 && Math.random() < 0.02) {

            isDivingGroup = false;

            if (lane.z == 1 && spawncountLane1 == 3) {
                isDivingGroup = true;
            } else if (lane.z == 4 && spawncountLane1 == 3) {
                isDivingGroup = true;
            }

            let turtleGroup = {
                x: -9.5,
                lane: lane.z,
                count: lane.count,
                speed: difficulty * 0.5,
                dive: isDivingGroup,
                yOffset: 0.0
            };
            if (lane.z == 1) {
                spawncountLane1 = (spawncountLane1 + 1) % 4
            } else if (lane.z == 4) {
                spawncountLane2 = (spawncountLane2 + 1) % 4
            }

            turtles.push(turtleGroup);
        }
    });

    var frogOnTurtle = false;

    const phaseTime = Date.now() % diveCycleDuration;

    for (let i = turtles.length - 1; i >= 0; i--) {
        let turtleGroup = turtles[i];
        turtleGroup.x += difficulty * 0.5;

        if (turtleGroup.x > 8) {
            turtles.splice(i, 1);
            continue;
        }

        if (turtleGroup.dive) {
            if (phaseTime < divePhaseDuration) {
                turtleGroup.yOffset = 0;
            } else if (phaseTime < divePhaseDuration * 2) {
                const progress = (phaseTime - divePhaseDuration) / divePhaseDuration;
                turtleGroup.yOffset = - progress * depth;
            } else if (phaseTime < divePhaseDuration * 3) {
                turtleGroup.yOffset = -depth;
            } else {
                const progress = (phaseTime - divePhaseDuration * 3) / divePhaseDuration;
                turtleGroup.yOffset = progress * depth - depth;
            }
        } else {
            turtleGroup.yOffset = 0.0;
        }
        if (!dead) {
            for (let j = 0; j < turtleGroup.count; j++) {
                const turtleX = turtleGroup.x + j;

                if (
                    frogPosition.z === turtleGroup.lane &&
                    Math.abs(frogPosition.x - turtleX) <= 0.5 &&
                    turtleGroup.yOffset > -0.2
                ) {
                    frogOnTurtle = true;
                    frogPosition.x += difficulty * 0.5;
                    frogPosition.y = turtleGroup.yOffset + 0.2;
                    break;
                }
            }
        }
    }
    frogOnThing = frogOnTurtle;
}


function updateLogs() {
    var laneIndexCount = 0;
    logLanes.forEach(lane => {
        let logsInLane = logs.filter(log => log.z == lane.z);

        let canSpawn = !logsInLane.some(log => (log.x - (log.l / 2)) > 4);
        if (canSpawn && logsInLane.length < 3 && Math.random() < 0.01) {
            let logLength = (Math.random() * 2) + 3;
            let log = {
                x: 8 + logLength / 2,
                z: lane.z,
                laneIndex: laneIndexCount,
                l: logLength,
            };
            logs.push(log);
        }
        laneIndexCount++;
    });

    let frogOnLog = false;

    for (let i = logs.length - 1; i >= 0; i--) {
        let log = logs[i];
        log.x -= difficulty * logLanes[log.laneIndex].speedMultiplier;

        if (log.x < -8 - log.l / 2) {
            logs.splice(i, 1);
        }

        if (!dead && frogPosition.z === log.z) {
            const logStart = log.x - log.l / 2;
            const logEnd = log.x + log.l / 2;

            if (frogPosition.x >= logStart && frogPosition.x <= logEnd) {
                frogOnLog = true;
                frogPosition.x -= difficulty * logLanes[log.laneIndex].speedMultiplier;
                frogPosition.y = 0.2;
            }
        }
    }
    frogOnThing |= frogOnLog;
}


function drawElements() {
    drawGround();
    drawFrog();
    drawCars();
    drawTurtles();
    drawLogs();
    drawFly();
}

function drawLogs() {
    if (!logs) return;

    logs.forEach(log => {
        let modelMatrix = mat4();
        modelMatrix = mult(modelMatrix, translate(log.x, 0, log.z));
        modelMatrix = mult(modelMatrix, scalem(log.l, 0.3, 0.7));

        gl.uniform3fv(uMaterialAmbientLoc, [0.5, 0.25, 0.0]); // Brown color
        gl.uniformMatrix4fv(uModelMatrixLoc, false, flatten(modelMatrix));

        const modelViewMatrix = mult(viewMatrix, modelMatrix);
        const normalMatrixLog = normalMatrix(modelViewMatrix, true);
        gl.uniformMatrix3fv(uNormalMatrixLoc, false, flatten(normalMatrixLog));

        gl.bindBuffer(gl.ARRAY_BUFFER, logBuffers.position);
        gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, logBuffers.normal);
        gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vNormal);

        gl.bindBuffer(gl.ARRAY_BUFFER, logBuffers.color);
        gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vColor);

        gl.drawArrays(gl.TRIANGLES, 0, logBuffers.vertexCount);
    });
}

function drawTurtles() {
    if (!turtleBuffers) return;

    turtles.forEach(turtleGroup => {
        for (let i = 0; i < turtleGroup.count; i++) {
            const turtleX = turtleGroup.x + i;

            let modelMatrix = mat4();
            modelMatrix = mult(modelMatrix, translate(turtleX, turtleGroup.yOffset, turtleGroup.lane));
            modelMatrix = mult(modelMatrix, scalem(0.04, 0.04, 0.04));
            modelMatrix = mult(modelMatrix, rotateY(90));
            modelMatrix = mult(modelMatrix, rotateX(-90));

            gl.uniformMatrix4fv(uModelMatrixLoc, false, flatten(modelMatrix));

            const modelViewMatrix = mult(viewMatrix, modelMatrix);
            const normalMatrixTurtle = normalMatrix(modelViewMatrix, true);
            gl.uniformMatrix3fv(uNormalMatrixLoc, false, flatten(normalMatrixTurtle));

            gl.bindBuffer(gl.ARRAY_BUFFER, turtleBuffers.position);
            gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vPosition);

            gl.bindBuffer(gl.ARRAY_BUFFER, turtleBuffers.normal);
            gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vNormal);

            gl.bindBuffer(gl.ARRAY_BUFFER, turtleBuffers.color);
            gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vColor);

            gl.drawArrays(gl.TRIANGLES, 0, turtleBuffers.vertexCount);
        }
    });
}


function drawFly() {
    if (!flyBuffers || !fly.active) {
        return;
    }

    gl.uniform3fv(uMaterialAmbientLoc, [0.3, 0.3, 0.0]);
    gl.uniform3fv(uMaterialSpecularLoc, [0.5, 0.5, 0.5]);
    gl.uniform1f(uShininessLoc, 50.0);

    let modelMatrix = mat4();
    modelMatrix = mult(modelMatrix, translate(fly.x - 0.4, 0.2, fly.z));
    modelMatrix = mult(modelMatrix, scalem(0.1, 0.1, 0.1));
    modelMatrix = mult(modelMatrix, rotateY(-90));
    modelMatrix = mult(modelMatrix, rotateX(-90));


    gl.uniformMatrix4fv(uModelMatrixLoc, false, flatten(modelMatrix));

    const modelViewMatrix = mult(viewMatrix, modelMatrix);
    const normalMatrixFly = normalMatrix(modelViewMatrix, true);
    gl.uniformMatrix3fv(uNormalMatrixLoc, false, flatten(normalMatrixFly));

    gl.bindBuffer(gl.ARRAY_BUFFER, flyBuffers.position);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, flyBuffers.normal);
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    gl.bindBuffer(gl.ARRAY_BUFFER, flyBuffers.color);
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    gl.drawArrays(gl.TRIANGLES, 0, flyBuffers.vertexCount);
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
    gl.uniform3fv(uMaterialAmbientLoc, [0.0, 0.2, 0.]);
    gl.uniform3fv(uMaterialSpecularLoc, [0.5, 0.5, 0.5]);
    gl.uniform1f(uShininessLoc, 50.0);

    let modelMatrix = mat4();

    let height = 0.2;

    if (dead) {
        const time = Date.now() - deathTime;

        height = ((time / 1000) / -2) + 0.2;
    } else {
        height = frogPosition.y + 0.2;
    }

    modelMatrix = mult(modelMatrix, translate(frogPosition.x, height, frogPosition.z));

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

    finished.forEach(finishX => {
        let finishModelMatrix = mat4();
        finishModelMatrix = mult(finishModelMatrix, translate(finishX, 0.2, 6)); // Position at z = 6 and y = 0.2
        finishModelMatrix = mult(finishModelMatrix, scalem(scaleFactor, scaleFactor, scaleFactor));
        finishModelMatrix = mult(finishModelMatrix, translate(0, 0, 3900000 * 0.15));
        gl.uniformMatrix4fv(uModelMatrixLoc, false, flatten(finishModelMatrix));

        const finishModelViewMatrix = mult(viewMatrix, finishModelMatrix);
        const normalMatrixFinish = normalMatrix(finishModelViewMatrix, true);
        gl.uniformMatrix3fv(uNormalMatrixLoc, false, flatten(normalMatrixFinish));

        drawFrogModel(gl, frogBuffers);
    });
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


function drawCars() {
    // Set material properties common to all cars
    gl.uniform3fv(uMaterialAmbientLoc, [0.2, 0.2, 0.2]);
    gl.uniform3fv(uMaterialSpecularLoc, [0.5, 0.5, 0.5]);
    gl.uniform1f(uShininessLoc, 30.0);

    // Draw each car
    cars.forEach(car => drawCar(car));
}

function drawCar(car) {
    if (!carBuffers) return; // Ensure the buffers are loaded

    gl.uniform3fv(uMaterialAmbientLoc, [0.2, 0.2, 0.2]);
    gl.uniform3fv(uMaterialSpecularLoc, [0.5, 0.5, 0.5]);
    gl.uniform1f(uShininessLoc, 30.0);

    let modelMatrix = mat4();

    // Apply transformations to position the car
    modelMatrix = mult(modelMatrix, translate(car.x, 0.0, car.lane));
    modelMatrix = mult(modelMatrix, scalem(0.4, 0.4, 0.4));

    // If the car is moving left (-x direction), rotate it by 180 degrees
    if (car.speed < 0) {
        modelMatrix = mult(modelMatrix, rotateY(-90));
    } else {
        modelMatrix = mult(modelMatrix, rotateY(90));
    }

    gl.uniformMatrix4fv(uModelMatrixLoc, false, flatten(modelMatrix));

    // Compute normal matrix
    const modelViewMatrix = mult(viewMatrix, modelMatrix);
    const normalMatrixCar = normalMatrix(modelViewMatrix, true);
    gl.uniformMatrix3fv(uNormalMatrixLoc, false, flatten(normalMatrixCar));

    // Bind buffers and draw the car
    gl.bindBuffer(gl.ARRAY_BUFFER, carBuffers.position);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, carBuffers.normal);
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    gl.bindBuffer(gl.ARRAY_BUFFER, carBuffers.color);
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    gl.drawArrays(gl.TRIANGLES, 0, carBuffers.vertexCount);
}



function setCanvasSize(canvas) {
    var size = Math.min(window.innerWidth * 0.95, window.innerHeight * 0.8);

    var dpr = window.devicePixelRatio || 1;

    canvas.width = size * dpr;
    canvas.height = size * dpr;

    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';

    gameInfo.style.width = `${size}px`;

    if (gl) {
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
}