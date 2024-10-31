function loadFlyModel(gl, url, callback) {
    fetch(url)
        .then(response => response.text())
        .then(data => {
            const objData = parseOBJ(data);
            const buffers = initFlyBuffers(gl, objData);
            console.log("Buffers:", buffers);
            callback(buffers);
        })
        .catch(error => console.error('Error loading OBJ file:', error));
}

function initFlyBuffers(gl, objData) {
    const positions = objData.positions;
    const normals = objData.normals;

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    const vertexCount = positions.length / 3;
    const singleColor = [0.8, 0.8, 0.0, 1.0];
    const colors = new Float32Array(vertexCount * 4);

    for (let i = 0; i < vertexCount; i++) {
        colors.set(singleColor, i * 4);
    }

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        normal: normalBuffer,
        color: colorBuffer,
        vertexCount: vertexCount,
    };
}
