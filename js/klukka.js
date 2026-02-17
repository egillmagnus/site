/**
 * ISK Earnings Clock
 * An analog clock that visualizes earnings over time
 */

class EarningsClock {
    constructor() {
        // Canvas and context
        this.canvas = document.getElementById('clockCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Input elements
        this.hourlyRateInput = document.getElementById('hourlyRate');
        this.startTimeInput = document.getElementById('startTime');
        this.startBtn = document.getElementById('startBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.toggleControlsBtn = document.getElementById('toggleControlsBtn');
        this.controlsDiv = document.getElementById('controls');
        
        // Display elements
        this.timeWorkedDisplay = document.getElementById('timeWorked');
        this.totalEarnedDisplay = document.getElementById('totalEarned');
        
        // State
        this.isRunning = false;
        this.startTime = null;
        this.elapsedMs = 0;
        this.hourlyRate = 5000;
        this.animationId = null;
        this.lastEarned = 0;
        
        // Clock dimensions (will be set in setupCanvas)
        this.centerX = 0;
        this.centerY = 0;
        this.radius = 0;
        
        this.init();
    }
    
    init() {
        // Set default start time to current time
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        this.startTimeInput.value = `${hours}:${minutes}`;
        
        // Setup canvas with proper sizing
        this.setupCanvas();
        
        // Event listeners
        this.startBtn.addEventListener('click', () => this.toggle());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.hourlyRateInput.addEventListener('input', () => this.updateHourlyRate());
        this.toggleControlsBtn.addEventListener('click', () => this.toggleControls());
        this.startTimeInput.addEventListener('input', (e) => this.formatTimeInput(e));
        
        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Initial draw
        this.draw();
    }
    
    setupCanvas() {
        const container = this.canvas.parentElement;
        
        // Use viewport units - choose based on aspect ratio
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const isPortrait = vh > vw;
        
        // Use 80% of the limiting dimension
        const maxSize = isPortrait ? vw * 0.8 : vh * 0.6;
        const size = Math.min(container.clientWidth * 0.9, maxSize);
        
        // Set canvas size for retina displays
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = size * dpr;
        this.canvas.height = size * dpr;
        this.canvas.style.width = `${size}px`;
        this.canvas.style.height = `${size}px`;
        
        // Scale context for retina
        this.ctx.scale(dpr, dpr);
        
        // Update dimensions
        this.centerX = size / 2;
        this.centerY = size / 2;
        this.radius = size * 0.4;
    }
    
    handleResize() {
        // Debounce resize
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.setupCanvas();
            this.draw();
        }, 250);
    }
    
    updateHourlyRate() {
        const rate = parseFloat(this.hourlyRateInput.value) || 0;
        this.hourlyRate = Math.max(0, rate);
    }
    
    toggleControls() {
        this.controlsDiv.classList.toggle('hidden');
        const isHidden = this.controlsDiv.classList.contains('hidden');
        this.toggleControlsBtn.textContent = isHidden ? '⚙️ Show Settings' : '⚙️ Hide Settings';
    }
    
    formatTimeInput(e) {
        let value = e.target.value.replace(/[^0-9]/g, '');
        
        if (value.length >= 2) {
            value = value.slice(0, 2) + ':' + value.slice(2, 4);
        }
        
        e.target.value = value.slice(0, 5);
    }
    
    toggle() {
        if (this.isRunning) {
            this.stop();
        } else {
            this.start();
        }
    }
    
    start() {
        if (this.isRunning) return;
        
        this.updateHourlyRate();
        
        // Parse start time
        const startTimeValue = this.startTimeInput.value.trim();
        if (!startTimeValue || !startTimeValue.match(/^[0-2][0-9]:[0-5][0-9]$/)) {
            alert('Please enter a valid start time in 24-hour format (HH:MM)');
            return;
        }
        
        const [hours, minutes] = startTimeValue.split(':').map(Number);
        
        if (hours > 23 || minutes > 59) {
            alert('Invalid time. Hours must be 00-23, minutes 00-59');
            return;
        }
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0, 0);
        
        // Calculate elapsed time from start time to now
        const now = new Date();
        const diff = now - startDate;
        
        if (diff < 0) {
            alert('Start time cannot be in the future');
            return;
        }
        
        this.startTime = startDate;
        this.elapsedMs = diff;
        this.isRunning = true;
        
        this.startBtn.textContent = 'Pause';
        this.startBtn.classList.remove('btn-primary');
        this.startBtn.classList.add('btn-pause');
        
        this.lastUpdateTime = Date.now();
        this.animate();
    }
    
    stop() {
        this.isRunning = false;
        this.startBtn.textContent = 'Resume';
        this.startBtn.classList.remove('btn-pause');
        this.startBtn.classList.add('btn-primary');
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    reset() {
        this.stop();
        this.elapsedMs = 0;
        this.startTime = null;
        this.startBtn.textContent = 'Start';
        this.updateDisplay();
        this.draw();
    }
    
    animate() {
        if (!this.isRunning) return;
        
        // Get current time and calculate difference in milliseconds
        const now = Date.now();
        this.elapsedMs = now - this.startTime.getTime();
        
        // Update display and draw every frame
        this.updateDisplay();
        this.draw();
        
        // Request next frame
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    updateDisplay() {
        // Format time worked
        const totalSeconds = Math.floor(this.elapsedMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        this.timeWorkedDisplay.textContent = 
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        // Calculate and display total earned
        const totalEarned = this.calculateTotalEarned();
        this.totalEarnedDisplay.textContent = `${Math.floor(totalEarned).toLocaleString('is-IS')} ISK`;
    }
    
    calculateTotalEarned() {
        // ISK per millisecond for smooth calculation
        const iskPerMs = this.hourlyRate / 3600000;
        return this.elapsedMs * iskPerMs;
    }
    
    draw() {
        const ctx = this.ctx;
        
        // Clear canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw clock face
        this.drawClockFace();
        
        // Calculate hand positions based on earnings
        const totalEarned = this.calculateTotalEarned();
        
        // Second hand: 0-1000 ISK (one rotation per 1000 ISK)
        const iskRemainder = totalEarned % 1000;
        const secondAngle = (iskRemainder / 1000) * 2 * Math.PI - Math.PI / 2;
        
        // Minute hand: thousands of ISK (0-24000, one rotation per 24000)
        const thousands = (totalEarned / 1000) % 24;
        const minuteAngle = (thousands / 24) * 2 * Math.PI - Math.PI / 2;
        
        // Hour hand: 24-hour blocks (0-24000 per rotation)
        const hourBlocks = (totalEarned / 24000) % 24;
        const hourAngle = (hourBlocks / 24) * 2 * Math.PI - Math.PI / 2;
        
        // Draw hands (from back to front)
        this.drawHand(hourAngle, this.radius * 0.5, 8, '#333');     // Hour hand
        this.drawHand(minuteAngle, this.radius * 0.7, 6, '#666');   // Minute hand
        this.drawHand(secondAngle, this.radius * 0.85, 2, '#e74c3c'); // Second hand
        
        // Draw center dot
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#333';
        ctx.fill();
    }
    
    drawClockFace() {
        const ctx = this.ctx;
        
        // Outer circle
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.radius, 0, 2 * Math.PI);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw 24-hour markers
        for (let i = 0; i < 24; i++) {
            const angle = (i / 24) * 2 * Math.PI - Math.PI / 2;
            const isMainHour = i % 6 === 0; // Emphasize every 6 hours
            
            const startRadius = isMainHour ? this.radius * 0.85 : this.radius * 0.92;
            const endRadius = this.radius;
            
            const x1 = this.centerX + Math.cos(angle) * startRadius;
            const y1 = this.centerY + Math.sin(angle) * startRadius;
            const x2 = this.centerX + Math.cos(angle) * endRadius;
            const y2 = this.centerY + Math.sin(angle) * endRadius;
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = '#555';
            ctx.lineWidth = isMainHour ? 3 : 1;
            ctx.stroke();
            
            // Draw number labels for main hours (0, 6, 12, 18)
            if (isMainHour) {
                const labelRadius = this.radius * 0.7;
                const labelX = this.centerX + Math.cos(angle) * labelRadius;
                const labelY = this.centerY + Math.sin(angle) * labelRadius;
                
                // Bright color for better visibility
                ctx.fillStyle = '#1a1a1a';
                ctx.font = `bold ${this.radius * 0.14}px Arial, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Display as thousands (0k, 6k, 12k, 18k)
                ctx.fillText(`${i}k`, labelX, labelY);
            }
        }
        
        // Draw inner circles for reference
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.radius * 0.05, 0, 2 * Math.PI);
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    drawHand(angle, length, width, color) {
        const ctx = this.ctx;
        const endX = this.centerX + Math.cos(angle) * length;
        const endY = this.centerY + Math.sin(angle) * length;
        
        ctx.beginPath();
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.stroke();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EarningsClock();
});
