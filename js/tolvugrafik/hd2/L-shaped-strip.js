//////////////////////////////////////////////////////////////////////
//    Sýnisforrit í Tölvugrafík
//     L-laga form teiknað með TRIANGLE-FAN
//
//    Hjálmtýr Hafsteinsson, ágúst 2024
//////////////////////////////////////////////////////////////////////
var gl;
var points;

window.onload = function init()
{
    let menuicon = document.querySelector("#menu-icon");
    let navbar = document.querySelector(".navbar");

    menuicon.onclick = () => {
        menuicon.classList.toggle("bx-x");
        navbar.classList.toggle("active");
    };
    

    var canvas = document.getElementById( "gl-canvas" );

    window.addEventListener("resize", function () {
        setCanvasSize(canvas);
        pointSlider.style.width = canvas.width + "px";
        recalculatePoints();
    });
    setCanvasSize(canvas);
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    var vertices = new Float32Array([-0.35,  0.75,
                                     -0.75,  0.75,
                                     -0.35, -0.35,
                                     -0.75, -0.75,
                                      0.45, -0.75,
                                      0.45, -0.35,
                                     -0.35, -0.35]);

    //  Configure WebGL

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor(31 / 255, 36 / 255, 45 / 255, 1.0);
    
    
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    
    var bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER,vertices, gl.STATIC_DRAW );
    
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    render();
};


function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays( gl.TRIANGLE_STRIP, 0, 7 );
}

function setCanvasSize(canvas) {
    var size = Math.min(window.innerWidth, window.innerHeight);
    canvas.width = size * 0.6;
    canvas.height = size * 0.6;
    if (gl) {
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
}