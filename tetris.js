// Constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    '#FF0D72', // I - Cyan
    '#0DC2FF', // O - Yellow
    '#0DFF72', // T - Purple
    '#F538FF', // S - Green
    '#FF8E0D', // Z - Red
    '#FFE138', // J - Blue
    '#3877FF'  // L - Orange
];

// Tetromino shapes
const SHAPES = [
    // I
    [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    // O
    [
        [1, 1],
        [1, 1]
    ],
    // T
    [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    // S
    [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ],
    // Z
    [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ],
    // J
    [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    // L
    [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ]
];

// DOM elements
const gameBoard = document.getElementById('game-board');
const nextPieceCanvas = document.getElementById('next-piece');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const linesElement = document.getElementById('lines');
const finalScoreElement = document.getElementById('final-score');
const startModal = document.getElementById('start-modal');
const pauseModal = document.getElementById('pause-modal');
const gameOverModal = document.getElementById('game-over-modal');
const startButton = document.getElementById('start-button');
const resumeButton = document.getElementById('resume-button');
const restartButton = document.getElementById('restart-button');

// Canvas contexts
const ctx = gameBoard.getContext('2d');
const nextCtx = nextPieceCanvas.getContext('2d');

// Game state
class GameState {
    constructor() {
        this.reset();
    }

    reset() {
        this.grid = this.createEmptyGrid();
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.gameOver = false;
        this.paused = false;
        this.dropCounter = 0;
        this.dropInterval = 1000; // Start with 1 second interval
        this.lastTime = 0;
        this.piece = this.randomPiece();
        this.nextPiece = this.randomPiece();
    }

    createEmptyGrid() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    randomPiece() {
        const shapeIndex = Math.floor(Math.random() * SHAPES.length);
        const shape = SHAPES[shapeIndex];
        
        // Create a deep copy of the shape
        const pieceCopy = JSON.parse(JSON.stringify(shape));
        
        return {
            shape: pieceCopy,
            color: COLORS[shapeIndex],
            x: Math.floor(COLS / 2) - Math.floor(pieceCopy[0].length / 2),
            y: 0
        };
    }

    collide() {
        const { shape, x, y } = this.piece;
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col] !== 0) {
                    const boardX = x + col;
                    const boardY = y + row;
                    
                    // Check collision with walls or bottom
                    if (
                        boardX < 0 || 
                        boardX >= COLS || 
                        boardY >= ROWS ||
                        // Check collision with locked pieces
                        (boardY >= 0 && this.grid[boardY][boardX])
                    ) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    rotate() {
        const originalShape = this.piece.shape;
        
        // Create a deep copy before modifying
        const shape = JSON.parse(JSON.stringify(originalShape));
        
        // Transpose the matrix
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < y; x++) {
                [shape[x][y], shape[y][x]] = [shape[y][x], shape[x][y]];
            }
        }
        
        // Reverse each row to get a clockwise rotation
        this.piece.shape = shape.map(row => row.reverse());
        
        // Undo rotation if it causes collision
        if (this.collide()) {
            this.piece.shape = originalShape;
        }
    }

    moveDown() {
        this.piece.y++;
        if (this.collide()) {
            this.piece.y--;
            this.lockPiece();
            this.clearLines();
            this.piece = this.nextPiece;
            this.nextPiece = this.randomPiece();
            
            // Check if game is over
            if (this.collide()) {
                this.gameOver = true;
                this.showGameOverModal();
            }
            return false;
        }
        return true;
    }

    hardDrop() {
        while (this.moveDown()) {
            this.score += 2; // Bonus points for hard drop
        }
        this.updateScore();
    }

    moveLeft() {
        this.piece.x--;
        if (this.collide()) {
            this.piece.x++;
        }
    }

    moveRight() {
        this.piece.x++;
        if (this.collide()) {
            this.piece.x--;
        }
    }

    lockPiece() {
        const { shape, x, y, color } = this.piece;
        
        shape.forEach((row, rowIndex) => {
            row.forEach((value, colIndex) => {
                if (value !== 0) {
                    const boardY = y + rowIndex;
                    if (boardY >= 0) { // Only lock visible part
                        this.grid[boardY][x + colIndex] = color;
                    }
                }
            });
        });
    }

    clearLines() {
        let linesCleared = 0;
        
        for (let row = ROWS - 1; row >= 0; row--) {
            if (this.grid[row].every(cell => cell !== 0)) {
                // Remove the row and add an empty one at the top
                this.grid.splice(row, 1);
                this.grid.unshift(Array(COLS).fill(0));
                linesCleared++;
                
                // Since we removed a row, we need to check the same row index again
                row++;
            }
        }
        
        if (linesCleared > 0) {
            // Update score based on number of lines cleared
            const linePoints = [0, 100, 300, 500, 800]; // 0, 1, 2, 3, 4 lines
            this.score += linePoints[linesCleared] * this.level;
            this.lines += linesCleared;
            
            // Increase level every 10 lines
            const newLevel = Math.floor(this.lines / 10) + 1;
            if (newLevel > this.level) {
                this.level = newLevel;
                // Speed up the game as level increases
                this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
            }
            
            this.updateScore();
        }
    }

    updateScore() {
        scoreElement.textContent = this.score;
        levelElement.textContent = this.level;
        linesElement.textContent = this.lines;
    }

    showGameOverModal() {
        finalScoreElement.textContent = this.score;
        gameOverModal.classList.add('active');
    }
}

// Game rendering and animation
class GameRenderer {
    constructor(gameState) {
        this.gameState = gameState;
        this.initCanvasSize();
    }

    initCanvasSize() {
        // Set game board size
        gameBoard.width = COLS * BLOCK_SIZE;
        gameBoard.height = ROWS * BLOCK_SIZE;
        
        // Set next piece preview size
        const maxSize = Math.max(...SHAPES.map(shape => Math.max(shape.length, shape[0].length)));
        nextPieceCanvas.width = maxSize * BLOCK_SIZE;
        nextPieceCanvas.height = maxSize * BLOCK_SIZE;
        
        // Set rendering settings
        ctx.scale(1, 1);
        nextCtx.scale(1, 1);
    }

    drawBlock(x, y, color, context = ctx) {
        context.fillStyle = color;
        context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        
        // Inner border for 3D effect
        context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        context.lineWidth = 2;
        context.strokeRect(
            x * BLOCK_SIZE + 1, 
            y * BLOCK_SIZE + 1, 
            BLOCK_SIZE - 2, 
            BLOCK_SIZE - 2
        );
        
        // Outer border
        context.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        context.lineWidth = 2;
        context.strokeRect(
            x * BLOCK_SIZE, 
            y * BLOCK_SIZE, 
            BLOCK_SIZE, 
            BLOCK_SIZE
        );
    }

    drawGrid() {
        // Draw background grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        
        for (let row = 0; row < ROWS; row++) {
            ctx.beginPath();
            ctx.moveTo(0, row * BLOCK_SIZE);
            ctx.lineTo(COLS * BLOCK_SIZE, row * BLOCK_SIZE);
            ctx.stroke();
        }
        
        for (let col = 0; col < COLS; col++) {
            ctx.beginPath();
            ctx.moveTo(col * BLOCK_SIZE, 0);
            ctx.lineTo(col * BLOCK_SIZE, ROWS * BLOCK_SIZE);
            ctx.stroke();
        }
    }

    drawBoard() {
        // First clear the canvas
        ctx.clearRect(0, 0, gameBoard.width, gameBoard.height);
        
        // Draw the background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, gameBoard.width, gameBoard.height);
        
        // Draw the grid
        this.drawGrid();
        
        // Draw the locked pieces
        this.gameState.grid.forEach((row, y) => {
            row.forEach((color, x) => {
                if (color) {
                    this.drawBlock(x, y, color);
                }
            });
        });
        
        // Draw the current piece
        this.drawPiece();
    }

    drawPiece() {
        const { shape, x, y, color } = this.gameState.piece;
        
        shape.forEach((row, rowIndex) => {
            row.forEach((value, colIndex) => {
                if (value !== 0) {
                    this.drawBlock(x + colIndex, y + rowIndex, color);
                }
            });
        });
    }

    drawNextPiece() {
        // Clear the canvas
        nextCtx.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
        
        // Draw background
        nextCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        nextCtx.fillRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
        
        const { shape, color } = this.gameState.nextPiece;
        const offset = (nextPieceCanvas.width / BLOCK_SIZE - shape[0].length) / 2;
        
        shape.forEach((row, rowIndex) => {
            row.forEach((value, colIndex) => {
                if (value !== 0) {
                    this.drawBlock(offset + colIndex, offset + rowIndex, color, nextCtx);
                }
            });
        });
    }

    draw() {
        this.drawBoard();
        this.drawNextPiece();
    }
}

// Input Handler
class InputHandler {
    constructor(gameState) {
        this.gameState = gameState;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // Button controls
        startButton.addEventListener('click', () => {
            startModal.classList.remove('active');
            game.start();
        });
        
        resumeButton.addEventListener('click', () => {
            pauseModal.classList.remove('active');
            game.resume();
        });
        
        restartButton.addEventListener('click', () => {
            gameOverModal.classList.remove('active');
            game.restart();
        });
    }

    handleKeyDown(event) {
        if (this.gameState.gameOver) return;
        
        // Don't process keys during pause except for the pause key
        if (this.gameState.paused && event.key !== 'p' && event.key !== 'P') return;
        
        switch (event.key) {
            case 'ArrowLeft':
                this.gameState.moveLeft();
                break;
            case 'ArrowRight':
                this.gameState.moveRight();
                break;
            case 'ArrowDown':
                this.gameState.moveDown();
                this.gameState.score += 1; // Small bonus for soft drop
                this.gameState.updateScore();
                break;
            case 'ArrowUp':
                this.gameState.rotate();
                break;
            case ' ': // Space bar
                this.gameState.hardDrop();
                break;
            case 'p':
            case 'P':
                game.togglePause();
                break;
        }
    }
}

// Main Game class
class Game {
    constructor() {
        this.gameState = new GameState();
        this.renderer = new GameRenderer(this.gameState);
        this.inputHandler = new InputHandler(this.gameState);
        this.animationId = null;
        
        // Show start modal
        startModal.classList.add('active');
    }

    update(time = 0) {
        // Exit early if game is paused or over
        if (this.gameState.paused || this.gameState.gameOver) return;
        
        const deltaTime = time - this.gameState.lastTime;
        this.gameState.lastTime = time;
        
        this.gameState.dropCounter += deltaTime;
        if (this.gameState.dropCounter > this.gameState.dropInterval) {
            this.gameState.moveDown();
            this.gameState.dropCounter = 0;
        }
        
        this.renderer.draw();
        this.animationId = requestAnimationFrame(this.update.bind(this));
    }

    start() {
        this.gameState.reset();
        this.gameState.updateScore();
        this.update();
    }

    resume() {
        this.gameState.paused = false;
        this.gameState.lastTime = performance.now();
        this.update();
    }

    pause() {
        this.gameState.paused = true;
        cancelAnimationFrame(this.animationId);
        pauseModal.classList.add('active');
    }

    togglePause() {
        if (this.gameState.paused) {
            pauseModal.classList.remove('active');
            this.resume();
        } else {
            this.pause();
        }
    }

    restart() {
        cancelAnimationFrame(this.animationId);
        this.start();
    }
}

// Initialize the game
const game = new Game();

// Add touch controls for mobile
if ('ontouchstart' in window) {
    // Create touch controls
    const touchControls = document.createElement('div');
    touchControls.className = 'touch-controls';
    touchControls.innerHTML = `
        <button id="touch-left">←</button>
        <button id="touch-rotate">↑</button>
        <button id="touch-right">→</button>
        <button id="touch-down">↓</button>
        <button id="touch-drop">Drop</button>
    `;
    document.body.appendChild(touchControls);
    
    // Style the touch controls
    const style = document.createElement('style');
    style.textContent = `
        .touch-controls {
            display: flex;
            justify-content: center;
            gap: 10px;
            padding: 20px;
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 50;
        }
        .touch-controls button {
            width: 60px;
            height: 60px;
            font-size: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
        }
        #touch-drop {
            width: auto;
            border-radius: 30px;
        }
    `;
    document.head.appendChild(style);
    
    // Add event handlers
    document.getElementById('touch-left').addEventListener('click', () => {
        if (!game.gameState.paused && !game.gameState.gameOver) {
            game.gameState.moveLeft();
            game.renderer.draw();
        }
    });
    
    document.getElementById('touch-right').addEventListener('click', () => {
        if (!game.gameState.paused && !game.gameState.gameOver) {
            game.gameState.moveRight();
            game.renderer.draw();
        }
    });
    
    document.getElementById('touch-rotate').addEventListener('click', () => {
        if (!game.gameState.paused && !game.gameState.gameOver) {
            game.gameState.rotate();
            game.renderer.draw();
        }
    });
    
    document.getElementById('touch-down').addEventListener('click', () => {
        if (!game.gameState.paused && !game.gameState.gameOver) {
            game.gameState.moveDown();
            game.gameState.score += 1;
            game.gameState.updateScore();
            game.renderer.draw();
        }
    });
    
    document.getElementById('touch-drop').addEventListener('click', () => {
        if (!game.gameState.paused && !game.gameState.gameOver) {
            game.gameState.hardDrop();
            game.renderer.draw();
        }
    });
}