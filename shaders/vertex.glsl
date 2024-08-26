attribute vec2 aPosition; // The position of the vertex
uniform vec2 uResolution; // The resolution of the canvas
uniform mat3 uMatrix;     // The transformation matrix (for zoom and pan)

void main() {
    // Apply the transformation matrix to the vertex position
    vec2 position = (uMatrix * vec3(aPosition, 1)).xy;

    // Convert the position from pixels to normalized device coordinates (NDC)
    // Normalized device coordinates are in the range [-1, 1] in both x and y
    vec2 zeroToOne = position / uResolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;

    // Flip the y axis to account for WebGL's coordinate system
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
}