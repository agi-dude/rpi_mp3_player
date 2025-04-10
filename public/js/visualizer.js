// Visualizer.js - Audio visualization

class AudioVisualizer {
    constructor(audioContext, analyser, container) {
        // Required elements
        this.audioContext = audioContext;
        this.analyser = analyser;
        this.container = container;

        // State
        this.isActive = false;
        this.animationFrame = null;
        this.visualizerType = localStorage.getItem('visualizerType') || 'bars';

        // Visualization elements
        this.barsContainer = null;
        this.bars = [];
        this.canvas = null;
        this.canvasCtx = null;
        this.circlesContainer = null;
        this.circles = [];

        // Analyzer configuration
        this.analyser.fftSize = 256;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);

        // Initialize
        this.init();
    }

    init() {
        // Clear container
        this.container.innerHTML = '';

        // Create visualizer based on type
        this.createVisualizer(this.visualizerType);

        // Start animation
        this.start();

        // Add event listener for visualization type change
        document.getElementById('visualizationType').addEventListener('change', (e) => {
            this.setVisualizerType(e.target.value);
        });
    }

    createVisualizer(type) {
        this.stop(); // Stop any running animation
        this.container.innerHTML = ''; // Clear container
        this.visualizerType = type;

        // Store preference
        localStorage.setItem('visualizerType', type);

        // Create the requested visualizer type
        if (type === 'bars') {
            this.createBarsVisualizer();
        } else if (type === 'wave') {
            this.createWaveVisualizer();
        } else if (type === 'circle') {
            this.createCircleVisualizer();
        } else {
            // Default to bars
            this.createBarsVisualizer();
        }

        // Start animation
        this.start();
    }

    createBarsVisualizer() {
        this.barsContainer = document.createElement('div');
        this.barsContainer.className = 'bars-visualizer';
        this.container.appendChild(this.barsContainer);

        // Create bars
        this.bars = [];
        const barCount = 32; // Number of bars

        for (let i = 0; i < barCount; i++) {
            const bar = document.createElement('div');
            bar.className = 'visualizer-bar';
            bar.style.height = '0px';
            this.barsContainer.appendChild(bar);
            this.bars.push(bar);
        }
    }

    createWaveVisualizer() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.canvasCtx = this.canvas.getContext('2d');

        const waveContainer = document.createElement('div');
        waveContainer.className = 'wave-visualizer';
        waveContainer.appendChild(this.canvas);

        this.container.appendChild(waveContainer);
    }

    createCircleVisualizer() {
        this.circlesContainer = document.createElement('div');
        this.circlesContainer.className = 'circle-visualizer';
        this.container.appendChild(this.circlesContainer);

        // Create circles
        this.circles = [];
        const circleCount = 5; // Number of circles
        const baseSize = 40;

        for (let i = 0; i < circleCount; i++) {
            const circle = document.createElement('div');
            circle.className = 'visualizer-circle';
            const size = baseSize + (i * 30);
            circle.style.width = `${size}px`;
            circle.style.height = `${size}px`;
            this.circlesContainer.appendChild(circle);
            this.circles.push(circle);
        }
    }

    createPlaceholder() {
        const placeholder = document.createElement('div');
        placeholder.className = 'visualizer-placeholder';
        placeholder.innerHTML = `
      <i class="fas fa-music"></i>
      <p>Play a track to see visualizer</p>
    `;
        this.container.appendChild(placeholder);
    }

    start() {
        // Don't start if audio context isn't provided
        if (!this.analyser) {
            this.createPlaceholder();
            return;
        }

        this.isActive = true;
        this.animate();
    }

    stop() {
        this.isActive = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    animate() {
        if (!this.isActive) return;

        this.animationFrame = requestAnimationFrame(this.animate.bind(this));

        // Get frequency data
        this.analyser.getByteFrequencyData(this.dataArray);

        // Render based on visualizer type
        if (this.visualizerType === 'bars' && this.bars.length) {
            this.renderBars();
        } else if (this.visualizerType === 'wave' && this.canvas) {
            this.renderWave();
        } else if (this.visualizerType === 'circle' && this.circles.length) {
            this.renderCircles();
        }
    }

    renderBars() {
        const bufferLength = this.bufferLength;
        const dataArray = this.dataArray;
        const barCount = this.bars.length;

        // Calculate the average for groups of frequency values
        const step = Math.floor(bufferLength / barCount) || 1;

        for (let i = 0; i < barCount; i++) {
            let sum = 0;
            const startIndex = i * step;

            // Get average value for this frequency range
            for (let j = 0; j < step && (startIndex + j) < bufferLength; j++) {
                sum += dataArray[startIndex + j];
            }

            const average = sum / step;

            // Scale the height based on the frequency value
            const height = (average / 255) * 100;
            this.bars[i].style.height = `${Math.max(4, height)}%`;

            // Color based on frequency
            const hue = (i / barCount) * 240; // Blue to red spectrum
            this.bars[i].style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
        }
    }

    renderWave() {
        const bufferLength = this.bufferLength;
        const dataArray = this.dataArray;
        const canvas = this.canvas;
        const canvasCtx = this.canvasCtx;
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        canvasCtx.clearRect(0, 0, width, height);

        // Draw wave
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-light').trim();
        canvasCtx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * height) / 2;

            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        canvasCtx.lineTo(width, height / 2);
        canvasCtx.stroke();

        // Add glow effect
        canvasCtx.shadowBlur = 15;
        canvasCtx.shadowColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-light').trim();
    }

    renderCircles() {
        const bufferLength = this.bufferLength;
        const dataArray = this.dataArray;
        const circleCount = this.circles.length;

        // Calculate average values for different frequency ranges
        const rangeSize = Math.floor(bufferLength / circleCount);
        const averages = [];

        for (let i = 0; i < circleCount; i++) {
            let sum = 0;
            const startIndex = i * rangeSize;

            for (let j = 0; j < rangeSize && (startIndex + j) < bufferLength; j++) {
                sum += dataArray[startIndex + j];
            }

            averages.push(sum / rangeSize);
        }

        // Update circles based on frequency data
        for (let i = 0; i < circleCount; i++) {
            const value = averages[i];
            const scale = 0.5 + ((value / 255) * 0.5); // Scale between 0.5 and 1.0
            const opacity = 0.2 + ((value / 255) * 0.8); // Opacity between 0.2 and 1.0

            this.circles[i].style.transform = `scale(${scale})`;
            this.circles[i].style.opacity = opacity;

            // Color based on frequency
            const hue = (i / circleCount) * 300; // Color spectrum
            this.circles[i].style.borderColor = `hsl(${hue}, 100%, 50%)`;
        }
    }

    setVisualizerType(type) {
        if (type !== this.visualizerType) {
            this.createVisualizer(type);
        }

        // Update select element
        const visualTypeSelect = document.getElementById('visualizationType');
        if (visualTypeSelect) {
            visualTypeSelect.value = type;
        }
    }

    resize() {
        // Handle window resize events
        if (this.canvas) {
            this.canvas.width = this.container.clientWidth;
            this.canvas.height = this.container.clientHeight;
        }
    }
}

// Initialize the visualizer when the audio player is ready
document.addEventListener('DOMContentLoaded', () => {
    // The visualizer will be initialized from the player
    window.addEventListener('resize', () => {
        // Resize visualizer if it exists
        if (window.visualizer) {
            window.visualizer.resize();
        }
    });
});