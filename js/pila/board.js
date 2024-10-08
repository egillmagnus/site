
import { Throw } from './throw.js';

export class Board {
    constructor(canvasId, width) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.scale = 1;
        this.targetScale = 1;
        this.translateX = 0;
        this.translateY = 0;
        this.targetTranslateX = this.translateX;
        this.targetTranslateY = this.translateY;
        this.isZooming = false;
        this.zoomSpeed = 0.1;
        this.outerRadius = width / 2;
        this.doubleTopMin = this.outerRadius * 0.71;
        this.doubleTopMax = this.outerRadius * 0.8;
        this.tripleMin = this.outerRadius * 0.4;
        this.tripleMax = this.outerRadius * 0.5;
        this.twentyFiveTopMin = this.outerRadius * 0.1;
        this.bullTopMin = this.outerRadius * 0.05;
        this.previousTranslateX = 0;
        this.previousTranslateY = 0;
        this.previousZoom = 1;

        this.sections = {
            single: [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5],
            bullseye: 50,
            outerBullseye: 25,
            noHit: 0
        };

        this.updateCanvas();
    }

    windowResized(width) {
        this.outerRadius = width / 2;
        this.doubleTopMin = this.outerRadius * 0.71;
        this.doubleTopMax = this.outerRadius * 0.8;
        this.tripleMin = this.outerRadius * 0.4;
        this.tripleMax = this.outerRadius * 0.5;
        this.twentyFiveTopMin = this.outerRadius * 0.1;
        this.bullTopMin = this.outerRadius * 0.05;
        this.scale = 1;
        this.zoomOut();
        this.drawBoard();
    }

    easeInOut(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    clearBoard() {
        this.ctx.clearRect(0, 0, this.outerRadius * 2, this.outerRadius * 2);
    }

    drawBoard() {
        const ctx = this.ctx;
        this.clearBoard();
        ctx.save();

        const PIECES = 18;
        let count = 0;
        let pos = 0;

        // Draw the dartboard first
        this.drawCircle(this.outerRadius, "black", "black");

        this.buildRing(this.doubleTopMin, this.doubleTopMax, 0, 361, 'red');

        for (let counter = -9; counter < (360 - 9); counter += PIECES) {
            this.buildRing(this.doubleTopMin, this.doubleTopMax, counter, counter + PIECES, count++ % 2 ? 'red' : 'green');
            this.buildRing(this.tripleMin, this.tripleMax, counter, counter + PIECES, count % 2 ? 'green' : 'red');
            this.buildRing(this.doubleTopMin, this.tripleMax, counter, counter + PIECES, count % 2 ? 'white' : 'black');
            this.buildRing(this.tripleMin, this.twentyFiveTopMin, counter, counter + PIECES, count % 2 ? 'white' : 'black');

            this.printLabel(counter, pos++);
        }

        this.drawCircle(this.twentyFiveTopMin, 'silver', 'green');
        this.drawCircle(this.bullTopMin, 'silver', 'red');
        this.drawCircle(this.doubleTopMax + 1, 'silver');
        this.drawCircle(this.doubleTopMin, 'silver');
        this.drawCircle(this.tripleMax, 'silver');
        this.drawCircle(this.tripleMin, 'silver');
        this.drawCircle(this.twentyFiveTopMin, 'silver', 'green');
        this.drawCircle(this.bullTopMin, 'silver', 'red');
        this.drawRadials();


        ctx.restore();
    }

    applyBlurEffect(value) {
        const ctx = this.ctx;

        if (!(this.targetScale <= this.scale && this.targetScale != 4)) {
            value = 1 - value;
        }

        const gradient = ctx.createRadialGradient(
            this.outerRadius,
            this.outerRadius,
            this.outerRadius * 0.8 - (0.6 * value),
            this.outerRadius,
            this.outerRadius,
            this.outerRadius
        );

        gradient.addColorStop(0, "rgba(0, 0, 0, 0");
        gradient.addColorStop(1 - (0.2 * (1 - value)), "rgba(31, 36, 45, 0.6)");
        gradient.addColorStop(1, "rgba(31, 36, 45, 1)");

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawRadials() {
        const ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = "silver";
        ctx.lineWidth = 1 * this.scale;
        const PIECES = 18;

        for (let counter = -9; counter < 360 - 9; counter += PIECES) {
            var deg = counter;

            const angleRad = this.degToRad(deg);
            const startX = Math.cos(angleRad) * this.twentyFiveTopMin * this.scale + this.outerRadius + this.translateX * this.scale;
            const startY = Math.sin(angleRad) * this.twentyFiveTopMin * this.scale + this.outerRadius + this.translateY * this.scale;
            const endX = Math.cos(angleRad) * (this.doubleTopMax + 1) * this.scale + this.outerRadius + this.translateX * this.scale;
            const endY = Math.sin(angleRad) * (this.doubleTopMax + 1) * this.scale + this.outerRadius + this.translateY * this.scale;

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }

        ctx.restore();
    }


    drawCircle(radius, colour, fillColour) {

        this.ctx.beginPath();
        this.ctx.arc(this.translateX * this.scale + this.outerRadius, this.translateY * this.scale + this.outerRadius, radius * this.scale, 0, 2 * Math.PI, false);
        this.ctx.lineWidth = 1 * this.scale;
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

        for (let counter = startDeg; counter <= endDeg; counter++) {
            const outerX = (Math.cos(this.degToRad(counter)) * max + this.translateX) * this.scale + this.outerRadius;
            const outerY = (Math.sin(this.degToRad(counter)) * max + this.translateY) * this.scale + this.outerRadius;
            this.ctx.lineTo(outerX, outerY);
        }

        for (let counter = endDeg; counter >= startDeg; counter--) {
            const innerX = (Math.cos(this.degToRad(counter)) * min + this.translateX) * this.scale + this.outerRadius;
            const innerY = (Math.sin(this.degToRad(counter)) * min + this.translateY) * this.scale + this.outerRadius;
            this.ctx.lineTo(innerX, innerY);
        }

        this.ctx.fill();
        this.ctx.stroke();
    }


    printLabel(counter, pos) {
        const labels = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
        const labelRadius = (this.outerRadius * 0.89);
        const angle = this.degToRad(counter + 9 - 90);

        const x = (Math.cos(angle) * labelRadius + this.translateX) * this.scale + this.outerRadius;
        const y = (Math.sin(angle) * labelRadius + this.translateY) * this.scale + this.outerRadius;

        this.ctx.fillStyle = 'white';
        this.ctx.font = this.outerRadius * 0.1 * this.scale + "px Arial Black";
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        this.ctx.fillText(labels[pos], x, y);
    }


    degToRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    zoomIn(clickX, clickY) {
        this.previousTranslateX = this.translateX;
        this.previousTranslateY = this.translateY;
        this.previousZoom = this.scale;

        this.targetScale = 4;
        this.targetTranslateX = -((clickX) - (this.outerRadius));
        this.targetTranslateY = -((clickY) - (this.outerRadius));
        this.isZooming = true;
    }

    zoomOut() {
        this.previousTranslateX = this.translateX;
        this.previousTranslateY = this.translateY;
        this.previousZoom = this.scale;
        this.targetScale = 1;
        this.targetTranslateX = 0;
        this.targetTranslateY = 0;
        this.isZooming = true;
    }

    updateCanvas() {
        if (this.isZooming) {
            const t = this.zoomSpeed;

            var easedT = this.easeInOut(t);
            this.zoomSpeed += 1 / 30;
            if (easedT >= 1) {
                easedT = 1;
                this.isZooming = false;
                this.zoomSpeed = 0;
            }

            this.scale = this.previousZoom + (this.targetScale - this.previousZoom) * easedT;
            this.translateX = this.previousTranslateX + (this.targetTranslateX - this.previousTranslateX) * easedT;
            this.translateY = this.previousTranslateY + (this.targetTranslateY - this.previousTranslateY) * easedT;

            this.drawBoard();
            this.applyBlurEffect(easedT);
        } else if (this.scale > 1) {
            this.drawBoard();
            this.applyBlurEffect(1);
        }

        requestAnimationFrame(() => this.updateCanvas());
    }

    calculatePoints(clickX, clickY) {
        const distX = ((clickX - this.outerRadius) / this.scale) - this.translateX;
        const distY = -(((clickY - this.outerRadius) / this.scale) - this.translateY);

        console.log("distX; " + distX);
        console.log("distY; " + distY);
        const distanceFromCenter = Math.sqrt((distX * distX) + (distY * distY));

        console.log(distanceFromCenter);
        let section, multiplier;

        let angle = Math.atan2(distY, distX);

        angle = - ((angle * (180 / Math.PI)) - 90);
        if (angle < 0) {
            angle += 360;
        }


        const sectionIndex = (Math.floor((angle + 9) / 18)) % 20;
        console.log("Angle: " + angle);
        console.log("sectionIndex: " + sectionIndex);

        section = this.sections.single[sectionIndex];


        if (distanceFromCenter <= this.bullTopMin) {
            section = this.sections.outerBullseye;
            multiplier = 2;
        } else if (distanceFromCenter <= this.twentyFiveTopMin) {
            section = this.sections.outerBullseye;
            multiplier = 1;
        } else if (distanceFromCenter < this.tripleMin) {
            multiplier = 1;
        } else if (distanceFromCenter <= this.tripleMax) {
            multiplier = 3;
        } else if (distanceFromCenter < this.doubleTopMin) {
            multiplier = 1;
        } else if (distanceFromCenter <= this.doubleTopMax) {
            multiplier = 2
        } else {
            section = this.sections.noHit;
            multiplier = 1;
        }

        return new Throw(section, multiplier);
    }

    isValidThrow(score) {
        return true;
        const allValidScores = [
            ...this.sections.single,
            ...this.sections.single * 2,
            ...this.sections.single * 3,
            this.sections.bullseye,
            this.sections.outerBullseye
        ];

        return allValidScores.includes(score);
    }
}
