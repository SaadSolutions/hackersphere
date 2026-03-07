const canvas = document.getElementById('matrix-canvas');
const ctx = canvas.getContext('2d');

// Matrix characters
const matrix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()_+{}|[]\\;<>,.?/~`";
const matrixArray = matrix.split('');

let fontSize = 16;
let columns = 0;
let drops = [];
let animationId = null;
let lastTime = 0;
const frameInterval = 50; // ms between frames (~20fps) — visually identical, less GPU load

// Function to initialize the matrix rain
function initializeMatrix() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    columns = Math.floor(canvas.width / fontSize);
    drops = [];

    for (let x = 0; x < columns; x++) {
        drops[x] = Math.random() * (canvas.height / fontSize);
    }

    ctx.font = fontSize + 'px "Courier New", monospace';
}

// Function to draw the matrix rain
function drawMatrix(timestamp) {
    animationId = requestAnimationFrame(drawMatrix);

    if (timestamp - lastTime < frameInterval) return;
    lastTime = timestamp;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#00ff00'; // Matrix green
    ctx.font = fontSize + 'px "Courier New", monospace';

    for (let i = 0; i < drops.length; i++) {
        const text = matrixArray[Math.floor(Math.random() * matrixArray.length)];

        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        // Reset the drops randomly
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }

        drops[i]++;
    }
}

// Start the animation
function startMatrixAnimation() {
    initializeMatrix();
    if (animationId) cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(drawMatrix);
}

// Debounce resize to avoid thrashing
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(initializeMatrix, 150);
});

// Pause animation when tab is hidden to save resources
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (animationId) cancelAnimationFrame(animationId);
    } else {
        animationId = requestAnimationFrame(drawMatrix);
    }
});

// Start when DOM is loaded
document.addEventListener('DOMContentLoaded', startMatrixAnimation);
