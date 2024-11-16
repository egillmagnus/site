function loadCarModel(gl, objUrl, callback) {
    fetch(objUrl)
        .then(response => response.text())
        .then(objText => {
            const objData = parseOBJ(objText);
            const carBuffers = initCarBuffers(gl, objData);
            callback(carBuffers);
        })
        .catch(error => console.error('Error loading car model:', error));
}


function initCarBuffers(gl, objData) {
    const positions = objData.positions;
    const normals = objData.normals;

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    const vertexCount = positions.length / 3;
    const defaultColor = [1.0, 0.0, 0.0, 1.0];
    const colors = new Float32Array(vertexCount * 4);

    for (let i = 0; i < vertexCount; i++) {
        colors.set(defaultColor, i * 4);
    }

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
    console.log(normals)
    return {
        position: positionBuffer,
        normal: normalBuffer,
        color: colorBuffer,
        vertexCount: vertexCount
    };
}
