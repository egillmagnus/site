export class Board {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.gl = this.canvas.getContext('webgl');
        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;
        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;

        // Scoring sections
        this.sections = {
            single: [...Array(20).keys()].map(i => i + 1),  // Single 1-20
            double: [...Array(20).keys()].map(i => (i + 1) * 2),  // Double 2-40
            triple: [...Array(20).keys()].map(i => (i + 1) * 3),  // Triple 3-60
            bullseye: 50,  // Bullseye is 50
            outerBullseye: 25  // Outer bullseye is 25
        };

        // Initialize WebGL
        this.initWebGL();
        this.initZoomAndPan();
    }

    // WebGL initialization
    async initWebGL() {
        if (!this.gl) {
            console.error('WebGL not supported');
            return;
        }

        // Load shaders from external .glsl files
        const vsSource = await this.fetchShaderSource('/shaders/vertex.glsl');
        const fsSource = await this.fetchShaderSource('/shaders/fragment.glsl');

        // Compile shaders and create WebGL program
        this.program = this.createProgram(vsSource, fsSource);

        // Get locations of attributes and uniforms
        this.positionLocation = this.gl.getAttribLocation(this.program, 'aPosition');
        this.resolutionLocation = this.gl.getUniformLocation(this.program, 'uResolution');
        this.colorLocation = this.gl.getUniformLocation(this.program, 'uColor');
        this.matrixLocation = this.gl.getUniformLocation(this.program, 'uMatrix');

        // Create and bind buffer
        this.positions = this.createCircleVertices(0, 0, 250, 100);  // Circle in the center
        this.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.positions), this.gl.STATIC_DRAW);

        // Initial render
        this.render();
    }

    // Method to fetch shader source
    async fetchShaderSource(url) {
        try {
            const response = await fetch(url);
            return await response.text();
        } catch (error) {
            console.error('Failed to load shader:', error);
        }
    }

    // Create a WebGL program
    createProgram(vsSource, fsSource) {
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fsSource);
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Unable to initialize the shader program:', this.gl.getProgramInfoLog(program));
            return null;
        }

        return program;
    }

    // Create a shader
    createShader(type, sourceCode) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, sourceCode);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shaders:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    // Rendering method
    render() {
        // Clear canvas
        this.gl.clearColor(1, 1, 1, 1);  // White background
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // Use the program
        this.gl.useProgram(this.program);

        // Set resolution uniform
        this.gl.uniform2f(this.resolutionLocation, this.gl.canvas.width, this.gl.canvas.height);

        // Enable position attribute
        this.gl.enableVertexAttribArray(this.positionLocation);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);

        // Create a transformation matrix for zoom and pan
        const matrix = [
            this.scale, 0, 0,
            0, this.scale, 0,
            this.translateX, this.translateY, 1
        ];

        // Pass matrix to the shader
        this.gl.uniformMatrix3fv(this.matrixLocation, false, matrix);

        // Set color to black for the dartboard
        this.gl.uniform4f(this.colorLocation, 0, 0, 0, 1);  // Black

        // Draw circle
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, this.positions.length / 2);
    }

    // Helper to create a circle vertex array
    createCircleVertices(x, y, radius, numSegments) {
        const vertices = [x, y];  // Center of the circle
        for (let i = 0; i <= numSegments; i++) {
            const angle = (i / numSegments) * Math.PI * 2;
            vertices.push(x + Math.cos(angle) * radius);
            vertices.push(y + Math.sin(angle) * radius);
        }
        return vertices;
    }

    // Zoom in based on click position
    zoomIn(clickX, clickY) {
        // Set the zoom level and pan based on where the user clicked
        this.scale = 2; // Zoom in
        const rect = this.canvas.getBoundingClientRect();
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Calculate the translation needed to center the zoom on the click point
        this.translateX = -(clickX - rect.left - centerX);
        this.translateY = -(clickY - rect.top - centerY);

        this.render();
    }

    // Zoom out to default view
    zoomOut() {
        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;
        this.render();
    }

    // Calculate points based on where the player clicked on the board
    calculatePointsFromClick(clickX, clickY) {
        // Transform click coordinates to dartboard coordinates
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = clickX - rect.left;
        const canvasY = clickY - rect.top;
        
        // Calculate the distance from the center
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const distX = canvasX - centerX;
        const distY = canvasY - centerY;
        const distanceFromCenter = Math.sqrt(distX * distX + distY * distY);

        // Determine scoring based on distance from center (you can fine-tune this logic)
        if (distanceFromCenter <= 20) {
            return this.sections.bullseye;  // Bullseye
        } else if (distanceFromCenter <= 40) {
            return this.sections.outerBullseye;  // Outer bullseye
        } else if (distanceFromCenter <= 100) {
            return this.sections.triple[Math.floor(Math.random() * 20)];  // Triple ring (randomized)
        } else if (distanceFromCenter <= 150) {
            return this.sections.double[Math.floor(Math.random() * 20)];  // Double ring (randomized)
        } else {
            return this.sections.single[Math.floor(Math.random() * 20)];  // Single ring (randomized)
        }
    }

    // Initialize zoom and pan
    initZoomAndPan() {
        this.canvas.addEventListener('wheel', (event) => {
            event.preventDefault();  // Prevent default scroll behavior
            this.scale += event.deltaY * -0.01;
            this.scale = Math.min(Math.max(0.5, this.scale), 5);  // Limit zoom scale
            this.render();  // Re-render with the new scale
        });

        this.canvas.addEventListener('mousedown', (event) => {
            this.isDragging = true;
            this.lastX = event.clientX;
            this.lastY = event.clientY;
        });

        this.canvas.addEventListener('mousemove', (event) => {
            if (this.isDragging) {
                const dx = event.clientX - this.lastX;
                const dy = event.clientY - this.lastY;
                this.translateX += dx;
                this.translateY += dy;
                this.lastX = event.clientX;
                this.lastY = event.clientY;
                this.render();  // Re-render with the new translation
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });
    }

    // Method to validate if points are valid based on the board layout
    isValidThrow(points) {
        return points >= 0 && points <= 60 || points === 25 || points === 50;
    }

    // Method to calculate throw scores based on section
    calculateScore(section, multiplier = 1) {
        let score;

        if (section === 'bullseye') {
            score = this.sections.bullseye;
        } else if (section === 'outerBullseye') {
            score = this.sections.outerBullseye;
        } else {
            score = section;
        }

        // Create and return a Throw object
        return new Throw(score, multiplier);
    }
}
