var canvas;
var gl;

var numVertices = 36;

var pointsArray = [];
var normalsArray = [];

var movement = false;     // Do we rotate?
var spinX = 0;
var spinY = 180;
var origX;
var origY;

var zDist = -2.0;

var fovy = 50.0;
var near = 0.2;
var far = 100.0;

var va = vec4(0.0, 0.0, -1.0, 1);
var vb = vec4(0.0, 0.942809, 0.333333, 1);
var vc = vec4(-0.816497, -0.471405, 0.333333, 1);
var vd = vec4(0.816497, -0.471405, 0.333333, 1);

var lightPosition = vec4(1.0, 1.0, 1.0, 0.0);
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

var materialAmbient = vec4(0.0, 1.0, 0.2, 1.0);
var materialDiffuse = vec4(0.0, 1.0, 0.2, 1.0);
var materialSpecular = vec4(1.0, 1.0, 1.0, 1.0);
var materialShininess = 150.0;

var ctm;
var ambientColor, diffuseColor, specularColor;

var mv, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

var normalMatrix, normalMatrixLoc;

var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);


window.onload = function init() {

    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(31 / 255, 36 / 255, 45 / 255, 1.0);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    var dypi = gl.getParameter(gl.DEPTH_BITS);
    var gildi = gl.getParameter(gl.DEPTH_CLEAR_VALUE);
    var bil = gl.getParameter(gl.DEPTH_RANGE);
    //gl.enable(gl.CULL_FACE);
    //gl.cullFace(gl.BACK);

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);


    ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);

    normalCube();

    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");

    projectionMatrix = perspective(fovy, 1.0, near, far);


    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);

    //event listeners for mouse
    canvas.addEventListener("mousedown", function (e) {
        movement = true;
        origX = e.offsetX;
        origY = e.offsetY;
        e.preventDefault(); // Disable drag and drop
    }, { passive: false });

    canvas.addEventListener("mouseup", function (e) {
        movement = false;
    });

    canvas.addEventListener("mouseleave", function () {
        isDragging = false;
    });

    canvas.addEventListener("mousemove", function (e) {
        if (movement) {
            spinY = (spinY - (origX - e.offsetX)) % 360;
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

            zDist = lastPinchZoom * pinchZoomFactor;

            zDist = Math.max(Math.min(zDist, -0.1), -50.0);

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
    });

    // Event listener for mousewheel
    canvas.addEventListener("wheel", function (e) {
        if (e.deltaY > 0.0) {
            zDist += 0.2;
        } else {
            zDist -= 0.2;
        }
        e.preventDefault()

        zDist = Math.max(Math.min(zDist, -0.1), -50.0);
    });

    setCanvasSize(canvas);

    render();
}


function normalCube() {
    quad(1, 0, 3, 2, 0);
    quad(2, 3, 7, 6, 1);
    quad(3, 0, 4, 7, 2);
    quad(6, 5, 1, 2, 3);
    quad(4, 5, 6, 7, 4);
    quad(5, 4, 0, 1, 5);
}

function quad(a, b, c, d, n) {
    var vertices = [
        vec4(-0.5, -0.5, 0.5, 1.0),
        vec4(-0.5, 0.5, 0.5, 1.0),
        vec4(0.5, 0.5, 0.5, 1.0),
        vec4(0.5, -0.5, 0.5, 1.0),
        vec4(-0.5, -0.5, -0.5, 1.0),
        vec4(-0.5, 0.5, -0.5, 1.0),
        vec4(0.5, 0.5, -0.5, 1.0),
        vec4(0.5, -0.5, -0.5, 1.0)
    ];

    var faceNormals = [
        vec4(0.0, 0.0, 1.0, 0.0),  // front
        vec4(1.0, 0.0, 0.0, 0.0),  // right
        vec4(0.0, -1.0, 0.0, 0.0),  // down
        vec4(0.0, 1.0, 0.0, 0.0),  // up
        vec4(0.0, 0.0, -1.0, 0.0),  // back
        vec4(-1.0, 0.0, 0.0, 0.0)   // left
    ];

    // We need to partition the quad into two triangles in order for
    // WebGL to be able to render it.  In this case, we create two
    // triangles from the quad indices

    //fece normals assigned using the parameter n

    var indices = [a, b, c, a, c, d];

    for (var i = 0; i < indices.length; ++i) {
        pointsArray.push(vertices[indices[i]]);
        normalsArray.push(faceNormals[n]);

    }
}


function render() {

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mv = lookAt(vec3(0.0, 0.0, zDist), at, up);
    mv = mult(mv, rotateX(spinX));
    mv = mult(mv, rotateY(spinY));

    // normal matrix only really need if there is nonuniform scaling
    // it's here for generality but since there is
    // no scaling in this example we could just use modelView matrix in shaders
    normalMatrix = [
        vec3(mv[0][0], mv[0][1], mv[0][2]),
        vec3(mv[1][0], mv[1][1], mv[1][2]),
        vec3(mv[2][0], mv[2][1], mv[2][2])
    ];
    normalMatrix.matrix = true;

    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
    gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix));

    mv1 = mult(mv, translate(0.0, -0.4, 0.0));
    mv1 = mult(mv1, scalem(0.85, 0.05, 0.45));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mv1));
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);

    // Toppur
    mv1 = mult(mv, translate(0.0, 0.4, 0.0));
    mv1 = mult(mv1, scalem(0.85, 0.05, 0.45));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mv1));
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);

    // Vinstri hlið
    mv1 = mult(mv, translate(-0.4, 0.0, 0.0));
    mv1 = mult(mv1, scalem(0.05, 0.8, 0.45));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mv1));
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);

    // Hægri hlið
    mv1 = mult(mv, translate(0.4, 0.0, 0.0));
    mv1 = mult(mv1, scalem(0.05, 0.8, 0.45));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mv1));
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);

    // Bak
    mv1 = mult(mv, translate(0.0, 0.0, -0.2));
    mv1 = mult(mv1, scalem(0.8, 0.8, 0.05));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mv1));
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);

    // Neðri hilla
    mv1 = mult(mv, translate(0.0, 0.12, 0.0));
    mv1 = mult(mv1, scalem(0.8, 0.05, 0.45));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mv1));
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);

    // Efri hilla
    mv1 = mult(mv, translate(0.0, -0.12, 0.0));
    mv1 = mult(mv1, scalem(0.8, 0.05, 0.45));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mv1));
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);


    window.requestAnimFrame(render);
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