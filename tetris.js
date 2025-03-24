const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    '#00FFFF', // I - Cyan
    '#FFFF00', // O - Yellow
    '#800080', // T - Purple
    '#00FF00', // S - Green
    '#FF0000', // Z - Red
    '#FF7F00', // L - Orange
    '#0000FF', // J - Blue
    '#FFFFFF'  // Special - White
];

const SHAPES = [
    [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    [
        [1, 1],
        [1, 1]
    ],
    [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ],
    [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ],
    [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ],
    [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    [
        [1, 1, 1],
        [1, 0, 0],
        [1, 0, 0]
    ]
];

const gameBoard = document.getElementById('game-board');
const nextPieceCanvas = document.getElementById('next-piece');
const holdPieceCanvas = document.getElementById('hold-piece');
const lockTimerElement = document.getElementById('lock-timer');
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

const ctx = gameBoard.getContext('2d');
const nextCtx = nextPieceCanvas.getContext('2d');
const holdCtx = holdPieceCanvas.getContext('2d');

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
        this.dropInterval = 1000;
        this.lastTime = 0;
        this.piece = this.randomPiece();
        this.nextPiece = this.randomPiece();
        this.holdPiece = null;
        this.canHold = true;
        this.landed = false;
        this.lockDelay = 1000;
        this.lockTimer = 0;
        this.lockMoveCount = 0;
        this.maxLockMoves = 15;
    }
    
    createEmptyGrid() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }
    
    randomPiece() {
        const shapeIndex = Math.floor(Math.random() * SHAPES.length);
        const shape = SHAPES[shapeIndex];
        
        const pieceCopy = JSON.parse(JSON.stringify(shape));
        
        const isSpecial = Math.random() < 0.1;
        
        return {
            shape: pieceCopy,
            color: isSpecial ? COLORS[COLORS.length - 1] : COLORS[shapeIndex],
            x: Math.floor(COLS / 2) - Math.floor(pieceCopy[0].length / 2),
            y: 0,
            shapeIndex: shapeIndex,
            isSpecial: isSpecial,
            rotations: 0,
            matches: 0
        };
    }
    
    collide() {
        const { shape, x, y } = this.piece;
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col] !== 0) {
                    const boardX = x + col;
                    const boardY = y + row;
                    
                    if (
                        boardX < 0 || 
                        boardX >= COLS || 
                        boardY >= ROWS ||
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
        
        const shape = JSON.parse(JSON.stringify(originalShape));
        
        if (this.piece.shapeIndex === 0) {
            const rotatedShape = this.rotateIpiece(shape);
            this.piece.shape = rotatedShape;
        } else if (this.piece.shapeIndex === 1) {
            return;
        } else {
            for (let y = 0; y < shape.length; y++) {
                for (let x = 0; x < y; x++) {
                    [shape[x][y], shape[y][x]] = [shape[y][x], shape[x][y]];
                }
            }
            
            this.piece.shape = shape.map(row => row.reverse());
        }
        
        let wallKickOffset = 0;
        if (this.collide()) {
            for (let offset = 1; offset <= 2; offset++) {
                this.piece.x += offset;
                if (!this.collide()) {
                    wallKickOffset = offset;
                    break;
                }
                this.piece.x -= offset;
            }
            
            if (wallKickOffset === 0) {
                for (let offset = -1; offset >= -2; offset--) {
                    this.piece.x += offset;
                    if (!this.collide()) {
                        wallKickOffset = offset;
                        break;
                    }
                    this.piece.x -= offset;
                }
            }
            
            if (wallKickOffset === 0) {
                this.piece.shape = originalShape;
            }
        }
        
        if (this.landed && wallKickOffset !== 0) {
            this.resetLockDelay();
        }
        
        if (this.piece.isSpecial) {
            this.piece.rotations++;
            if (this.piece.rotations >= 2) {
                this.piece.shape = originalShape;
            }
        }
    }
    
    rotateIpiece(shape) {
        const rows = shape.length;
        const cols = shape[0].length;
        const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));
        
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                rotated[c][rows - 1 - r] = shape[r][c];
            }
        }
        
        return rotated;
    }
    
    moveDown() {
        this.piece.y++;
        
        if (this.collide()) {
            this.piece.y--;
            
            if (!this.landed) {
                this.landed = true;
                this.lockTimer = 0;
                this.lockMoveCount = 0;
                this.updateLockTimerBar(0);
            }
            
            return false;
        }
        
        if (this.landed) {
            this.landed = false;
            this.updateLockTimerBar(0);
        }
        
        return true;
    }
    
    hardDrop() {
        let rowsDropped = 0;
        
        while (this.moveDown()) {
            rowsDropped++;
        }
        
        this.score += rowsDropped * 2;
        this.updateScore();
        
        this.lockPiece();
        this.afterPieceLock();
    }
    
    moveLeft() {
        this.piece.x--;
        
        if (this.collide()) {
            this.piece.x++;
            return false;
        }
        
        if (this.landed) {
            this.resetLockDelay();
        }
        
        return true;
    }
    
    moveRight() {
        this.piece.x++;
        
        if (this.collide()) {
            this.piece.x--;
            return false;
        }
        
        if (this.landed) {
            this.resetLockDelay();
        }
        
        return true;
    }
    
    resetLockDelay() {
        if (this.lockMoveCount < this.maxLockMoves) {
            this.lockTimer = 0;
            this.lockMoveCount++;
            this.updateLockTimerBar(0);
        }
    }
    
    holdCurrentPiece() {
        if (!this.canHold) return;
        
        if (this.holdPiece === null) {
            this.holdPiece = {
                shape: JSON.parse(JSON.stringify(SHAPES[this.piece.shapeIndex])),
                color: COLORS[this.piece.shapeIndex],
                shapeIndex: this.piece.shapeIndex
            };
            
            this.piece = this.nextPiece;
            this.nextPiece = this.randomPiece();
        } else {
            const tempPiece = {
                shape: JSON.parse(JSON.stringify(SHAPES[this.holdPiece.shapeIndex])),
                color: this.holdPiece.color,
                shapeIndex: this.holdPiece.shapeIndex,
                x: Math.floor(COLS / 2) - Math.floor(SHAPES[this.holdPiece.shapeIndex][0].length / 2),
                y: 0
            };
            
            this.holdPiece = {
                shape: JSON.parse(JSON.stringify(SHAPES[this.piece.shapeIndex])),
                color: this.piece.color,
                shapeIndex: this.piece.shapeIndex
            };
            
            this.piece = tempPiece;
        }
        
        this.canHold = false;
        
        this.landed = false;
        this.lockTimer = 0;
        this.updateLockTimerBar(0);
    }
    
    updateLockTimerBar(percentage) {
        lockTimerElement.style.width = `${percentage}%`;
    }
    
    lockPiece() {
        const { shape, x, y, color } = this.piece;
        
        shape.forEach((row, rowIndex) => {
            row.forEach((value, colIndex) => {
                if (value !== 0) {
                    const boardY = y + rowIndex;
                    if (boardY >= 0) {
                        this.grid[boardY][x + colIndex] = {
                            color: color,
                            isSpecial: this.piece.isSpecial,
                            matches: this.piece.matches
                        };
                    }
                }
            });
        });
    }
    
    afterPieceLock() {
        this.clearLines();
        this.piece = this.nextPiece;
        this.nextPiece = this.randomPiece();
        
        this.landed = false;
        this.lockTimer = 0;
        this.updateLockTimerBar(0);
        
        this.canHold = true;
        
        if (this.collide()) {
            this.gameOver = true;
            this.showGameOverModal();
        }
    }
    
    clearLines() {
        let linesCleared = 0;
        
        for (let row = ROWS - 1; row >= 0; row--) {
            const canClear = this.grid[row].every(cell => cell !== 0);
            
            if (canClear) {
                this.grid.splice(row, 1);
                this.grid.unshift(Array(COLS).fill(0));
                linesCleared++;
                
                row++;
            }
        }
        
        if (linesCleared > 0) {
            const linePoints = [0, 100, 300, 500, 800];
            this.score += linePoints[linesCleared] * this.level;
            this.lines += linesCleared;
            
            const newLevel = Math.floor(this.lines / 10) + 1;
            if (newLevel > this.level) {
                this.level = newLevel;
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

class GameRenderer {
    constructor(gameState) {
        this.gameState = gameState;
        this.initCanvasSize();
        this.ghostPieceEnabled = true;
    }
    
    initCanvasSize() {
        gameBoard.width = COLS * BLOCK_SIZE;
        gameBoard.height = ROWS * BLOCK_SIZE;
        
        const maxSize = Math.max(...SHAPES.map(shape => Math.max(shape.length, shape[0].length)));
        nextPieceCanvas.width = maxSize * BLOCK_SIZE;
        nextPieceCanvas.height = maxSize * BLOCK_SIZE;
        holdPieceCanvas.width = maxSize * BLOCK_SIZE;
        holdPieceCanvas.height = maxSize * BLOCK_SIZE;
        
        ctx.scale(1, 1);
        nextCtx.scale(1, 1);
        holdCtx.scale(1, 1);
    }
    
    drawBlock(x, y, color, isGhost = false, context = ctx, isSpecial = false) {
        const opacity = isGhost ? '0.3' : '1';
        context.fillStyle = color + opacity;
        context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        
        context.lineWidth = 2;
        
        context.strokeStyle = isGhost ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.8)';
        context.beginPath();
        context.moveTo(x * BLOCK_SIZE, (y + 1) * BLOCK_SIZE);
        context.lineTo(x * BLOCK_SIZE, y * BLOCK_SIZE);
        context.lineTo((x + 1) * BLOCK_SIZE, y * BLOCK_SIZE);
        context.stroke();
        
        context.strokeStyle = isGhost ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.8)';
        context.beginPath();
        context.moveTo(x * BLOCK_SIZE, (y + 1) * BLOCK_SIZE);
        context.lineTo((x + 1) * BLOCK_SIZE, (y + 1) * BLOCK_SIZE);
        context.lineTo((x + 1) * BLOCK_SIZE, y * BLOCK_SIZE);
        context.stroke();
        
        context.strokeStyle = isGhost ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.4)';
        context.strokeRect(
            x * BLOCK_SIZE + 4, 
            y * BLOCK_SIZE + 4, 
            BLOCK_SIZE - 8, 
            BLOCK_SIZE - 8
        );
        
        if (isSpecial) {
            context.fillStyle = 'white';
            context.beginPath();
            context.arc(
                x * BLOCK_SIZE + BLOCK_SIZE / 2,
                y * BLOCK_SIZE + BLOCK_SIZE / 2,
                BLOCK_SIZE / 4,
                0,
                2 * Math.PI
            );
            context.fill();
        }
    }
    
    drawGhostPiece() {
        if (!this.ghostPieceEnabled) return;
        
        const { shape, x, color } = this.gameState.piece;
        let ghostY = this.gameState.piece.y;
        
        while (true) {
            ghostY++;
            
            if (this.checkGhostCollision(shape, x, ghostY)) {
                ghostY--;
                break;
            }
        }
        
        shape.forEach((row, rowIndex) => {
            row.forEach((value, colIndex) => {
                if (value !== 0) {
                    this.drawBlock(x + colIndex, ghostY + rowIndex, color, true);
                }
            });
        });
    }
    
    checkGhostCollision(shape, x, y) {
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col] !== 0) {
                    const boardX = x + col;
                    const boardY = y + row;
                    
                    if (
                        boardX < 0 || 
                        boardX >= COLS || 
                        boardY >= ROWS ||
                        (boardY >= 0 && this.gameState.grid[boardY][boardX])
                    ) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    drawGrid() {
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
        ctx.clearRect(0, 0, gameBoard.width, gameBoard.height);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, gameBoard.width, gameBoard.height);
        
        this.drawGrid();
        
        this.drawGhostPiece();
        
        this.gameState.grid.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell) {
                    this.drawBlock(x, y, cell.color, false, ctx, cell.isSpecial);
                }
            });
        });
        
        this.drawPiece();
    }
    
    drawPiece() {
        const { shape, x, y, color, isSpecial } = this.gameState.piece;
        
        shape.forEach((row, rowIndex) => {
            row.forEach((value, colIndex) => {
                if (value !== 0) {
                    this.drawBlock(x + colIndex, y + rowIndex, color, false, ctx, isSpecial);
                }
            });
        });
    }
    
    drawNextPiece() {
        nextCtx.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
        
        nextCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        nextCtx.fillRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
        
        const { shape, color, isSpecial } = this.gameState.nextPiece;
        const offset = (nextPieceCanvas.width / BLOCK_SIZE - shape[0].length) / 2;
        
        shape.forEach((row, rowIndex) => {
            row.forEach((value, colIndex) => {
                if (value !== 0) {
                    this.drawBlock(offset + colIndex, offset + rowIndex, color, false, nextCtx, isSpecial);
                }
            });
        });
    }
    
    drawHoldPiece() {
        holdCtx.clearRect(0, 0, holdPieceCanvas.width, holdPieceCanvas.height);
        
        holdCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        holdCtx.fillRect(0, 0, holdPieceCanvas.width, holdPieceCanvas.height);
        
        if (this.gameState.holdPiece) {
            const { shape, color, isSpecial } = this.gameState.holdPiece;
            const offset = (holdPieceCanvas.width / BLOCK_SIZE - shape[0].length) / 2;
            
            shape.forEach((row, rowIndex) => {
                row.forEach((value, colIndex) => {
                    if (value !== 0) {
                        this.drawBlock(offset + colIndex, offset + rowIndex, color, false, holdCtx, isSpecial);
                    }
                });
            });
        }
    }
    
    draw() {
        this.drawBoard();
        this.drawNextPiece();
        this.drawHoldPiece();
    }
}

class InputHandler {
    constructor(gameState) {
        this.gameState = gameState;
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        
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
                this.gameState.score += 1;
                this.gameState.updateScore();
                break;
            case 'ArrowUp':
                this.gameState.rotate();
                break;
            case ' ':
                this.gameState.hardDrop();
                break;
            case 'p':
            case 'P':
                game.togglePause();
                break;
            case 'c':
            case 'C':
                this.gameState.holdCurrentPiece();
                break;
        }
    }
}

class Game {
    constructor() {
        this.gameState = new GameState();
        this.renderer = new GameRenderer(this.gameState);
        this.inputHandler = new InputHandler(this.gameState);
        this.animationId = null;
        
        startModal.classList.add('active');
    }
    
    update(time = 0) {
        if (this.gameState.paused || this.gameState.gameOver) return;
        
        const deltaTime = time - this.gameState.lastTime;
        this.gameState.lastTime = time;
        
        this.gameState.dropCounter += deltaTime;
        if (this.gameState.dropCounter > this.gameState.dropInterval) {
            this.gameState.moveDown();
            this.gameState.dropCounter = 0;
        }
        
        if (this.gameState.landed) {
            this.gameState.lockTimer += deltaTime;
            const lockPercentage = (this.gameState.lockTimer / this.gameState.lockDelay) * 100;
            this.gameState.updateLockTimerBar(Math.min(lockPercentage, 100));
            
            if (this.gameState.lockTimer >= this.gameState.lockDelay) {
                this.gameState.lockPiece();
                this.gameState.afterPieceLock();
            }
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

const game = new Game();

if ('ontouchstart' in window) {
    const touchControls = document.createElement('div');
    touchControls.className = 'touch-controls';
    touchControls.innerHTML = `
        <button id="touch-left">←</button>
        <button id="touch-rotate">↑</button>
        <button id="touch-right">→</button>
        <button id="touch-down">↓</button>
        <button id="touch-hold">HOLD</button>
        <button id="touch-drop">DROP</button>
    `;
    document.body.appendChild(touchControls);
    
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
            padding: 12px;
            font-size: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
        }
    `;
    document.head.appendChild(style);
    
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
    
    document.getElementById('touch-hold').addEventListener('click', () => {
        if (!game.gameState.paused && !game.gameState.gameOver) {
            game.gameState.holdCurrentPiece();
            game.renderer.draw();
        }
    });
    
    document.getElementById('touch-drop').addEventListener('click', () => {
        if (!game.gameState.paused && !game.gameState.gameOver) {
            game.gameState.hardDrop();
        }
    });
}
