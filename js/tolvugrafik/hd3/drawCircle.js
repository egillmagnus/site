var gl;

var msek = 0;

var speed = 2;

window.onload = function init() {
    var canvas = document.getElementById("gl-canvas");

    let menuicon = document.querySelector("#menu-icon");
    let navbar = document.querySelector(".navbar");

    menuicon.onclick = () => {
        menuicon.classList.toggle("bx-x");
        navbar.classList.toggle("active");
    };

    var speedSlider = document.getElementById("speed");
    speedSlider.oninput = function () {
        speed = parseFloat(this.value);
    };

    setCanvasSize(canvas);

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var vertices = [vec2(-1, -1), vec2(1, -1), vec2(1, 1),
    vec2(-1, -1), vec2(1, 1), vec2(-1, 1)
    ];

    var bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    locTime = gl.getUniformLocation(program, "time");

    iniTime = Date.now();

    window.addEventListener("resize", function () {
        setCanvasSize(canvas);
        speedSlider.style.width = canvas.width / 2 + "px";
        canvasRes = vec2(canvas.width, canvas.height);
        gl.uniform2fv(gl.getUniformLocation(program, "resolution"), flatten(canvasRes))
        render();
    });

    speedSlider.style.width = canvas.width + "px";
    canvasRes = vec2(canvas.width, canvas.height);
    gl.uniform2fv(gl.getUniformLocation(program, "resolution"), flatten(canvasRes));

    render();
};


function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    msek = msek + speed;

    var time = ((msek * 0.005));
    gl.uniform1f(locTime, time);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    window.requestAnimFrame(render);
}

function setCanvasSize(canvas) {
    var size = Math.min(window.innerWidth * 0.95, window.innerHeight * 0.8);
    canvas.width = size;
    canvas.height = size;
    if (gl) {
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
}