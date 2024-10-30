function loadFrogModel(gl, url, callback) {
    fetch(url)
        .then(response => response.text())
        .then(data => {
            const objData = parseOBJ(data);
            const buffers = initFrogBuffers(gl, objData);
            console.log("Buffers:", buffers);
            callback(buffers);
        })
        .catch(error => console.error('Error loading OBJ file:', error));
}

function initFrogBuffers(gl, objData) {
    const positions = objData.positions;
    const normals = objData.normals;

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    const vertexCount = positions.length / 3;
    const singleColor = [0.0, 1.0, 0.0, 1.0];
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




//Byggt á þessu: https://webglfundamentals.org/webgl/lessons/webgl-load-obj.html

function parseOBJ(text) {
    const objPositions = [[0, 0, 0]];
    const objNormals = [[0, 0, 0]];

    const positions = [];
    const normals = [];

    function addVertex(vert) {
        const ptn = vert.split('/');
        const positionIndex = parseInt(ptn[0]) || 0;
        const normalIndex = parseInt(ptn[2]) || 0;

        const posIndex = positionIndex >= 0 ? positionIndex : objPositions.length + positionIndex;
        const normIndex = normalIndex >= 0 ? normalIndex : objNormals.length + normalIndex;

        positions.push(...objPositions[posIndex]);
        normals.push(...objNormals[normIndex]);
    }

    const lines = text.split('\n');

    for (let line of lines) {
        line = line.trim();
        if (line === '' || line.startsWith('#')) {
            continue;
        }
        const parts = line.split(/\s+/);
        const keyword = parts[0];
        const data = parts.slice(1);

        switch (keyword) {
            case 'v':
                objPositions.push(data.map(parseFloat));
                break;
            case 'vn':
                objNormals.push(data.map(parseFloat));
                break;
            case 'f':
                const numTriangles = data.length - 2;
                for (let i = 0; i < numTriangles; ++i) {
                    addVertex(data[0]);
                    addVertex(data[i + 1]);
                    addVertex(data[i + 2]);
                }
                break;
        }
    }
    console.log(positions);
    return {
        positions,
        normals,
    };
}
