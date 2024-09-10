
import { Throw } from './throw.js';  // Import the Throw class
export class Board {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');  // Get 2D drawing context
        this.scale = 1;
        this.targetScale = 1;
        this.translateX = this.canvas.width / 2;
        this.translateY = this.canvas.height / 2;
        this.targetTranslateX = this.translateX;
        this.targetTranslateY = this.translateY;
        this.isZooming = false;  // To track if zooming is happening
        this.zoomSpeed = 0.1;  // Speed of zoom transition
        this.outerRadius = this.canvas.width / 2;
        this.doubleTopMin = this.outerRadius * 0.71;
        this.doubleTopMax = this.outerRadius * 0.8;
        this.tripleMin = this.outerRadius * 0.4;
        this.tripleMax = this.outerRadius * 0.5;
        this.twentyFiveTopMin = this.outerRadius * 0.1;
        this.bullTopMin = this.outerRadius * 0.05;

        // Scoring sections
        this.sections = {
            single: [...Array(20).keys()].map(i => i + 1), // Single 1-20
            double: [...Array(20).keys()].map(i => (i + 1) * 2), // Double 2-40
            triple: [...Array(20).keys()].map(i => (i + 1) * 3), // Triple 3-60
            bullseye: 50, // Bullseye is 50
            outerBullseye: 25 // Outer bullseye is 25
        };

        this.updateCanvas();  // Start the animation loop
    }

    // Easing function (ease-out)
    easeOut(t) {
        return t * (2 - t);  // A simple ease-out function
    }

    // Method to clear the canvas before each draw
    clearBoard() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Method to draw the dartboard
    drawBoard() {
        const ctx = this.ctx;
        this.clearBoard();
    
        // Setup
        ctx.save();
        ctx.translate(this.translateX, this.translateY);
        ctx.scale(this.scale, this.scale);
    
        // Constants
        const PIECES = 18; // 18 degrees per segment
        let count = 0;
        let pos = 0;

        this.drawCircle(this.outerRadius, "black", "black");
    
        // Draw segments
        for (let counter = -9; counter < (360 - 9); counter += PIECES) {
            this.buildRing(this.doubleTopMin, this.doubleTopMax, counter, counter + PIECES, count++ % 2 ? 'red' : 'green');
            this.buildRing(this.tripleMin, this.tripleMax, counter, counter + PIECES, count % 2 ? 'green' : 'red');
            this.buildRing(this.doubleTopMin, this.tripleMax, counter, counter + PIECES, count % 2 ? 'white' : 'black');
            this.buildRing(this.tripleMin, this.twentyFiveTopMin, counter, counter + PIECES, count % 2 ? 'white' : 'black');
    
            // Add labels
            this.printLabel(counter, pos++);
        }
    
        // Draw bullseye and outer bull
        this.drawCircle(this.twentyFiveTopMin, 'silver', 'green');  // Outer bullseye
        this.drawCircle(this.bullTopMin, 'silver', 'red');  // Inner bullseye
    
        ctx.restore();
    }
    

    // Helper method to draw a circle (using the arc function)
    drawCircle(radius, colour, fillColour) {

        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, 2 * Math.PI, false);
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = colour;

        if (fillColour) {
            this.ctx.fillStyle = fillColour;
            this.ctx.fill();
        }

        this.ctx.stroke();
    }

    buildRing(min, max, startDeg, endDeg, color) {
        this.ctx.beginPath();
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = color;
    
        for (let counter = startDeg; counter <= endDeg + 1; counter++) {
            const outerX = Math.cos(this.degToRad(counter)) * max;
            const outerY = Math.sin(this.degToRad(counter)) * max;
            this.ctx.lineTo(outerX, outerY);
        }
        
        for (let counter = endDeg; counter >= startDeg; counter--) {
            const innerX = Math.cos(this.degToRad(counter)) * min;
            const innerY = Math.sin(this.degToRad(counter)) * min;
            this.ctx.lineTo(innerX, innerY);
        }
    
        this.ctx.fill();
        this.ctx.stroke();
    }
    

    printLabel(counter, pos) {
        const labels = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
        const labelRadius = this.outerRadius * 0.89;  // Position for labels
        const angle = this.degToRad(counter + 9 - 90);  // Adjust to start at top (12 o'clock)
    
        const x = Math.cos(angle) * labelRadius;
        const y = Math.sin(angle) * labelRadius;
    
        this.ctx.fillStyle = 'white';
        this.ctx.font = this.outerRadius * 0.1 + "px Arial";
        this.ctx.textAlign = 'center';  // Center the text horizontally
        this.ctx.textBaseline = 'middle';  // Center the text vertically
    
        this.ctx.fillText(labels[pos], x, y);
    }
    
    
    degToRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    // Smooth zoom in with easing
    zoomIn(clickX, clickY) {
        this.targetScale = 4;  // Target zoom scale
        this.targetTranslateX = this.translateX - (clickX - (this.canvas.width / 2)) * this.targetScale;
        this.targetTranslateY = this.translateY - (clickY - (this.canvas.height / 2)) * this.targetScale;
        this.isZooming = true;  // Start the zoom
    }

    // Smooth zoom out with easing
    zoomOut() {
        this.targetScale = 1;
        this.targetTranslateX = this.canvas.width / 2;
        this.targetTranslateY = this.canvas.height / 2;
        this.isZooming = true;  // Start the zoom
    }

    // Smoothly animate the zoom and translation changes
    updateCanvas() {
        if (this.isZooming) {
            const t = this.zoomSpeed;  // Zoom speed factor

            // Apply easing to scale
            this.scale += (this.targetScale - this.scale) * this.easeOut(t);

            // Apply easing to translation
            this.translateX += (this.targetTranslateX - this.translateX) * this.easeOut(t);
            this.translateY += (this.targetTranslateY - this.translateY) * this.easeOut(t);

            // Check if we've reached the target (close enough)
            if (Math.abs(this.scale - this.targetScale) < 0.005 &&
                Math.abs(this.translateX - this.targetTranslateX) < 1 &&
                Math.abs(this.translateY - this.targetTranslateY) < 1) {
                this.translateX = this.targetTranslateX;
                this.translateY = this.targetTranslateY;
                this.scale = this.targetScale;
                this.isZooming = false;  // Stop zooming once we're close enough
            }

            // Redraw the board after scaling and translating
            this.drawBoard();
        }

        requestAnimationFrame(() => this.updateCanvas());  // Continuously update the canvas
    }

    // Calculate points based on where the player clicked on the board
    calculatePoints(clickX, clickY) {
        const distX = clickX - centerX - this.translateX;
        const distY = clickY - centerY - this.translateY;
        const distanceFromCenter = Math.sqrt(distX * distX + distY * distY);

        let section, multiplier;

        if (distanceFromCenter <= 20) {
            // Bullseye
            section = this.sections.bullseye;
            multiplier = 1; // Single multiplier for bullseye
        } else if (distanceFromCenter <= 40) {
            // Outer bullseye
            section = this.sections.outerBullseye;
            multiplier = 1; // Single multiplier for outer bullseye
        } else if (distanceFromCenter <= 100) {
            // Triple ring
            section = this.sections.triple[Math.floor(Math.random() * 20)];
            multiplier = 3; // Triple multiplier
        } else if (distanceFromCenter <= 150) {
            // Double ring
            section = this.sections.double[Math.floor(Math.random() * 20)];
            multiplier = 2; // Double multiplier
        } else {
            // Single ring
            section = this.sections.single[Math.floor(Math.random() * 20)];
            multiplier = 1; // Single multiplier
        }

        // Return the Throw object with the section and multiplier
        return new Throw(section, multiplier);
    }

    isValidThrow(score) {
        const allValidScores = [
            ...this.sections.single,
            ...this.sections.double,
            ...this.sections.triple,
            this.sections.bullseye,
            this.sections.outerBullseye
        ];

        return allValidScores.includes(score);
    }
}
