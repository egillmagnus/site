// ground.js

let groundVertices;
let groundColors;
let groundNormals;

function initGroundBuffers(gl) {
    groundVertices = [];
    groundColors = [];
    groundNormals = []; // New array for normals

    const cellWidth = 1.0;
    const cellDepth = 1.0;
    const groundLevel = 0.0; // Y = 0
    const wallHeight = 1;

    const gridWidth = 14;
    const gridDepth = 13;

    const colors = {
        grass: [0.0, 0.5, 0.0, 1.0],
        road: [0.2, 0.2, 0.2, 1.0],
        water: [0.0, 0.0, 0.8, 1.0],
        wall: [0.0, 0.6, 0.0, 1.0],
    };

    function addCell(x, y, z, color) {
        const normal = [0.0, 1.0, 0.0];

        // Define the vertices
        groundVertices.push(
            x, y, z,
            x + cellWidth, y, z,
            x + cellWidth, y, z + cellDepth,
            x, y, z,
            x + cellWidth, y, z + cellDepth,
            x, y, z + cellDepth
        );

        for (let i = 0; i < 6; i++) groundNormals.push(...normal);

        for (let i = 0; i < 6; i++) groundColors.push(...color);
    }

    // Build ground cells
    const startX = -gridWidth / 2;
    const startZ = -gridDepth / 2;

    // Starting grass row
    for (let x = startX; x < startX + gridWidth; x += cellWidth) {
        addCell(x, groundLevel, startZ, colors.grass);
    }

    // Road section (5 rows)
    for (let z = startZ + cellDepth; z < startZ + 6 * cellDepth; z += cellDepth) {
        for (let x = startX; x < startX + gridWidth; x += cellWidth) {
            addCell(x, groundLevel, z, colors.road);
        }
    }

    // Middle grass row
    for (let x = startX; x < startX + gridWidth; x += cellWidth) {
        addCell(x, groundLevel, startZ + 6 * cellDepth, colors.grass);
    }

    // Water section (5 rows)
    for (let z = startZ + 7 * cellDepth; z < startZ + 12 * cellDepth; z += cellDepth) {
        for (let x = startX; x < startX + gridWidth; x += cellWidth) {
            addCell(x, groundLevel, z, colors.water);
        }
    }

    // Finish row
    count = 0;
    for (let x = startX; x < startX + gridWidth; x += cellWidth) {
        if (count < 2) {
            addCell(x, groundLevel, startZ + 12 * cellDepth, colors.grass);
            count++
        } else {
            addCell(x, groundLevel, startZ + 12 * cellDepth, colors.water);
            count = 0;
        }
    }

    for (let x = startX - 10; x < -startX + 10; x++) {
        for (let z = startZ - 10; z < -startX + 10; z++) {
            if ((x < startX || x > -startX - 1) || (z < startZ || z > -startZ - 1)) {
                const greenVariation = [
                    0.0,                       // R: fixed for green
                    0.5 + Math.random() * 0.3, // G: base green with slight variation (0.5 to 0.8)
                    0.0,
                    1.0                        // B: fixed for green
                ];
                addCell(x, groundLevel + 1, z, greenVariation);
            }
        }
    }



    // Walls around the grid (as vertical planes)
    function addWall(x1, z1, x2, z2) {
        // Compute normal for the wall (facing inward)
        const dx = x2 - x1;
        const dz = z2 - z1;
        const normal = normalize(vec3(-dz, 0, dx));

        groundVertices.push(
            x1, groundLevel, z1,
            x2, groundLevel, z2,
            x2, groundLevel + wallHeight, z2,
            x1, groundLevel, z1,
            x2, groundLevel + wallHeight, z2,
            x1, groundLevel + wallHeight, z1
        );

        // Add normals for each vertex
        for (let i = 0; i < 6; i++) groundNormals.push(...normal);

        for (let i = 0; i < 6; i++) groundColors.push(...colors.wall);
    }

    // Left wall
    addWall(startX, startZ, startX, startZ + gridDepth);
    // Right wall
    addWall(startX + gridWidth, startZ, startX + gridWidth, startZ + gridDepth);
    // Front wall
    addWall(startX, startZ, startX + gridWidth, startZ);
    // Back wall
    addWall(startX, startZ + gridDepth, startX + gridWidth, startZ + gridDepth);

    const groundBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(groundVertices), gl.STATIC_DRAW);

    const groundColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, groundColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(groundColors), gl.STATIC_DRAW);

    const groundNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, groundNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(groundNormals), gl.STATIC_DRAW);

    // Return buffer references and vertex count
    return {
        groundBuffer,
        groundNormalBuffer,
        groundColorBuffer,  // Return the color buffer
        vertexCount: groundVertices.length / 3
    };
}
