//Byggt á þessu: https://webglfundamentals.org/webgl/lessons/webgl-load-obj.htmls
// ásamt hjálp frá CHATGPT

function addVertex(vert) {
    const ptn = vert.split('/');

    // Parse position index
    const positionIndex = parseInt(ptn[0]);
    const posIndex = positionIndex >= 0 ? positionIndex : objPositions.length + positionIndex;
    positions.push(...objPositions[posIndex]);

    // Parse normal index if available
    if (ptn.length > 2 && ptn[2]) {
        const normalIndex = parseInt(ptn[2]);
        if (!isNaN(normalIndex)) {
            const normIndex = normalIndex >= 0 ? normalIndex : objNormals.length + normalIndex;
            normals.push(...objNormals[normIndex]);
        } else {
            // If normal index is not a number, push zero normals
            normals.push(0, 0, 0);
        }
    } else {
        // If no normal index, push zero normals
        normals.push(0, 0, 0);
    }
}



function parseOBJ(text) {
    const objPositions = [[0, 0, 0]]; // Start with a dummy vertex
    const objNormals = [[0, 0, 0]];   // Start with a dummy normal

    const positions = [];
    const normals = [];

    function addVertex(vert) {
        const ptn = vert.split('/');

        // Parse position index
        const positionIndex = parseInt(ptn[0]);
        const posIndex = positionIndex >= 0 ? positionIndex : objPositions.length + positionIndex;
        positions.push(...objPositions[posIndex]);

        // Parse normal index if available
        if (ptn.length > 2 && ptn[2]) {
            const normalIndex = parseInt(ptn[2]);
            if (!isNaN(normalIndex)) {
                const normIndex = normalIndex >= 0 ? normalIndex : objNormals.length + normalIndex;
                normals.push(...objNormals[normIndex]);
            } else {
                normals.push(0, 0, 0);
            }
        } else {
            normals.push(0, 0, 0);
        }
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

    // Compute normals if they were not provided
    if (objNormals.length === 1) { // Only dummy normal exists
        computeNormals(positions, normals);
    }

    return {
        positions,
        normals,
    };
}


function computeNormals(positions, normals) {
    // Initialize normals array with zeros
    for (let i = 0; i < normals.length; i++) {
        normals[i] = 0;
    }

    for (let i = 0; i < positions.length; i += 9) {
        const p0 = vec3(positions[i], positions[i + 1], positions[i + 2]);
        const p1 = vec3(positions[i + 3], positions[i + 4], positions[i + 5]);
        const p2 = vec3(positions[i + 6], positions[i + 7], positions[i + 8]);

        const u = subtract(p1, p0);
        const v = subtract(p2, p0);

        const normal = cross(u, v);

        // Accumulate normals for each vertex
        for (let j = 0; j < 3; j++) {
            normals[i + j * 3] += normal[0];
            normals[i + j * 3 + 1] += normal[1];
            normals[i + j * 3 + 2] += normal[2];
        }
    }

    // Normalize the normals
    for (let i = 0; i < normals.length; i += 3) {
        const normal = vec3(normals[i], normals[i + 1], normals[i + 2]);
        const normalized = normalize(normal);
        normals[i] = normalized[0];
        normals[i + 1] = normalized[1];
        normals[i + 2] = normalized[2];
    }
}