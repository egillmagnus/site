/////////////////////////////////////////////////////////////////
//    Sýnidæmi í Tölvugrafík
//     Teiknar hring með random radíus þar sem notandinn smellir
//
//    Hjálmtýr Hafsteinsson, ágúst 2024
/////////////////////////////////////////////////////////////////
var canvas;
var gl;

// Fjöldi punkta á hringnum
var numCirclePoints = 100;
var maxNumPoints = 10000;


var circles = [];

window.onload = function init() {

    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(31 / 255, 36 / 255, 45 / 255, 1.0);



    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 8 * maxNumPoints, gl.DYNAMIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    window.addEventListener("resize", function () {
        setCanvasSize(canvas);
        pointSlider.style.width = canvas.width + "px";
        recalculatePoints();
    });
    setCanvasSize(canvas);

    canvas.addEventListener("mousedown", function (e) {

        var t = vec2(2 * e.offsetX / canvas.width - 1, 2 * (canvas.height - e.offsetY) / canvas.height - 1);

        var randomRadius = Math.random() * 0.1 + 0.05;
        

        var points = createCircle(t, randomRadius);

        circles.push(points);

        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(points)); 

        render();
    });

    render();
};

function createCircle(center, radius) {
    var points = [];
    var dAngle = 2 * Math.PI / numCirclePoints;

    points.push(center);


    for (var i = 0; i <= numCirclePoints; i++) {
        var angle = i * dAngle;
        var p = vec2(center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle));
        points.push(p);
    }

    return points;
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);


    for (var i = 0; i < circles.length; i++) {
        var circlePoints = circles[i];
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(circlePoints));
        gl.drawArrays(gl.TRIANGLE_FAN, 0, circlePoints.length);
    }

    window.requestAnimFrame(render);
}


function setCanvasSize(canvas) {
    var size = Math.min(window.innerWidth, window.innerHeight);
    canvas.width = size * 0.6;
    canvas.height = size * 0.6;
    if (gl) {
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
}