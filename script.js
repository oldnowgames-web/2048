/* ===================================================
   1. ANIMAÇÃO DE QUADRADOS NUMERADOS CAINDO NO FUNDO
   =================================================== */
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let bgWidth, bgHeight;
let fallingBlocks = [];

const blockValues = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];
const blockGradients = {
    2: ['#38bdf8', '#0284c7'],
    4: ['#818cf8', '#4f46e5'],
    8: ['#c084fc', '#9333ea'],
    16: ['#f472b6', '#db2777'],
    32: ['#fb7185', '#e11d48'],
    64: ['#fb923c', '#ea580c'],
    128: ['#facc15', '#ca8a04'],
    256: ['#4ade80', '#16a34a'],
    512: ['#2dd4bf', '#0d9488'],
    1024: ['#22d3ee', '#0891b2'],
    2048: ['#f43f5e', '#881337']
};

function resizeCanvas() {
    bgWidth = canvas.width = window.innerWidth;
    bgHeight = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class FallingBlock {
    constructor() {
        this.reset(true);
    }

    reset(initial = false) {
        this.size = Math.random() * 32 + 45;
        this.x = Math.random() * (bgWidth - this.size);
        this.y = initial ? Math.random() * bgHeight : -this.size - Math.random() * 120;
        this.speed = Math.random() * 1.6 + 0.8;
        this.value = blockValues[Math.floor(Math.random() * blockValues.length)];
        this.opacity = Math.random() * 0.35 + 0.55;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.02;
    }

    update() {
        this.y += this.speed;
        this.rotation += this.rotSpeed;
        if (this.y > bgHeight + this.size) {
            this.reset(false);
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.opacity;

        const colors = blockGradients[this.value] || ['#818cf8', '#4f46e5'];

        // Sombra Neon
        ctx.shadowColor = colors[0];
        ctx.shadowBlur = 18;

        // Gradiente
        const grad = ctx.createLinearGradient(-this.size/2, -this.size/2, this.size/2, this.size/2);
        grad.addColorStop(0, colors[0]);
        grad.addColorStop(1, colors[1]);
        ctx.fillStyle = grad;

        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(-this.size / 2, -this.size / 2, this.size, this.size, 12);
        } else {
            ctx.rect(-this.size / 2, -this.size / 2, this.size, this.size);
        }
        ctx.fill();

        // Borda Borda Branca Sutil
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Texto do Número
        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${this.size * 0.42}px Outfit, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 4;
        ctx.fillText(this.value, 0, 1);

        ctx.restore();
    }
}

for (let i = 0; i < 35; i++) {
    fallingBlocks.push(new FallingBlock());
}

function animateCanvas() {
    ctx.clearRect(0, 0, bgWidth, bgHeight);
    fallingBlocks.forEach(block => {
        block.update();
        block.draw();
    });
    requestAnimationFrame(animateCanvas);
}
animateCanvas();

/* ===================================================
   2. LÓGICA COMPLETA DO JOGO 2048
   =================================================== */
const GRID_SIZE = 4;
let board = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
let score = 0;
let bestScore = parseInt(localStorage.getItem('2048_best_score')) || 0;
let previousState = null;
let soundEnabled = true;
let hasWon = false;
let keepPlayingMode = false;
let isMoving = false;
let tileIdCounter = 1;

let boardSize = 0;
let cellSize = 0;
let gapSize = 0;

// Web Audio API
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
    if (!audioCtx) audioCtx = new AudioContext();
}

function playSound(type) {
    if (!soundEnabled) return;
    try {
        initAudio();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const now = audioCtx.currentTime;

        if (type === 'move') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(240, now);
            osc.frequency.exponentialRampToValueAtTime(360, now + 0.05);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (type === 'merge') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(350, now);
            osc.frequency.exponentialRampToValueAtTime(700, now + 0.1);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'win') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(659.25, now + 0.1);
            osc.frequency.setValueAtTime(783.99, now + 0.2);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
            osc.start(now);
            osc.stop(now + 0.45);
        }
    } catch (e) {}
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    const soundIcon = document.getElementById('sound-icon');
    if (soundEnabled) {
        soundIcon.innerHTML = `<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>`;
    } else {
        soundIcon.innerHTML = `<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>`;
    }
}

function openHowToPlay() {
    const modal = document.getElementById('how-to-play-modal');
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.add('opacity-100', 'pointer-events-auto');
}

function closeHowToPlay() {
    const modal = document.getElementById('how-to-play-modal');
    modal.classList.remove('opacity-100', 'pointer-events-auto');
    modal.classList.add('opacity-0', 'pointer-events-none');
}

function startGame() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-view').classList.remove('hidden');
    initGame();
}

function goToMenu() {
    document.getElementById('menu-best-score').textContent = bestScore;
    document.getElementById('game-view').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
}

function calculateDimensions() {
    const boardEl = document.getElementById('game-board');
    boardSize = boardEl.clientWidth;
    gapSize = Math.max(8, Math.floor(boardSize * 0.03));
    const totalGaps = (GRID_SIZE + 1) * gapSize;
    cellSize = (boardSize - totalGaps) / GRID_SIZE;
}

function getCoordinates(row, col) {
    const x = gapSize + col * (cellSize + gapSize);
    const y = gapSize + row * (cellSize + gapSize);
    return { x, y };
}

function setupGridBackground() {
    const boardEl = document.getElementById('game-board');
    const oldCells = boardEl.querySelectorAll('.grid-cell');
    oldCells.forEach(cell => cell.remove());

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const { x, y } = getCoordinates(r, c);
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;
            cell.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            boardEl.appendChild(cell);
        }
    }
}

class Tile {
    constructor(row, col, value) {
        this.id = tileIdCounter++;
        this.row = row;
        this.col = col;
        this.value = value;

        this.element = document.createElement('div');
        this.element.className = 'tile';

        this.innerElement = document.createElement('div');
        this.innerElement.className = 'tile-inner';
        this.element.appendChild(this.innerElement);

        this.updatePosition();
        this.updateValue(value, true);
        document.getElementById('game-board').appendChild(this.element);
    }

    updatePosition() {
        const { x, y } = getCoordinates(this.row, this.col);
        this.element.style.width = `${cellSize}px`;
        this.element.style.height = `${cellSize}px`;
        this.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    updateValue(newValue, isNew = false, isMerged = false) {
        this.value = newValue;
        this.innerElement.textContent = newValue;

        const tileClass = newValue <= 2048 ? `tile-${newValue}` : 'tile-super';
        this.element.className = `tile ${tileClass}`;

        if (newValue >= 1024) this.innerElement.style.fontSize = `${cellSize * 0.3}px`;
        else if (newValue >= 100) this.innerElement.style.fontSize = `${cellSize * 0.38}px`;
        else this.innerElement.style.fontSize = `${cellSize * 0.45}px`;

        this.innerElement.classList.remove('tile-inner-new', 'tile-inner-merged');
        if (isNew) {
            this.innerElement.classList.add('tile-inner-new');
        } else if (isMerged) {
            this.innerElement.classList.add('tile-inner-merged');
        }
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

function initGame() {
    calculateDimensions();
    setupGridBackground();

    const oldTiles = document.querySelectorAll('.tile');
    oldTiles.forEach(t => t.remove());

    board = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    score = 0;
    updateScore(0);
    previousState = null;
    hasWon = false;
    keepPlayingMode = false;
    isMoving = false;
    document.getElementById('undo-btn').disabled = true;
    hideOverlay();

    addRandomTile();
    addRandomTile();
}

function saveState() {
    previousState = {
        board: board.map(row => row.map(tile => tile ? { value: tile.value } : null)),
        score: score
    };
    document.getElementById('undo-btn').disabled = false;
}

function undoMove() {
    if (!previousState || isMoving) return;

    document.querySelectorAll('.tile').forEach(t => t.remove());
    board = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));

    previousState.board.forEach((row, r) => {
        row.forEach((cell, c) => {
            if (cell) {
                board[r][c] = new Tile(r, c, cell.value);
            }
        });
    });

    score = previousState.score;
    updateScore(0, false);
    previousState = null;
    document.getElementById('undo-btn').disabled = true;
    hideOverlay();
}

function addRandomTile() {
    let emptyCells = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (!board[r][c]) emptyCells.push({ r, c });
        }
    }

    if (emptyCells.length > 0) {
        const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const val = Math.random() < 0.9 ? 2 : 4;
        board[r][c] = new Tile(r, c, val);
    }
}

function updateScore(amount, showAddition = true) {
    score += amount;
    document.getElementById('score').textContent = score;

    if (amount > 0 && showAddition) {
        const container = document.getElementById('score-addition-container');
        const addEl = document.createElement('div');
        addEl.className = 'score-addition';
        addEl.textContent = `+${amount}`;
        container.appendChild(addEl);
        setTimeout(() => addEl.remove(), 750);
    }

    if (score > bestScore) {
        bestScore = score;
        document.getElementById('best-score').textContent = bestScore;
        document.getElementById('menu-best-score').textContent = bestScore;
        localStorage.setItem('2048_best_score', bestScore);
    }
}

function move(direction) {
    if (isMoving) return;

    const vector = {
        'UP': { r: -1, c: 0 },
        'DOWN': { r: 1, c: 0 },
        'LEFT': { r: 0, c: -1 },
        'RIGHT': { r: 0, c: 1 }
    }[direction];

    if (!vector) return;

    const rows = Array.from({ length: GRID_SIZE }, (_, i) => i);
    const cols = Array.from({ length: GRID_SIZE }, (_, i) => i);

    if (direction === 'DOWN') rows.reverse();
    if (direction === 'RIGHT') cols.reverse();

    let mergedGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
    let moved = false;
    let scoreGained = 0;
    let tilesToDestroy = [];
    let mergesToCreate = [];

    saveState();

    let newBoard = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));

    for (let r of rows) {
        for (let c of cols) {
            const tile = board[r][c];
            if (!tile) continue;

            let nextR = r;
            let nextC = c;

            while (true) {
                const targetR = nextR + vector.r;
                const targetC = nextC + vector.c;

                if (targetR < 0 || targetR >= GRID_SIZE || targetC < 0 || targetC >= GRID_SIZE) break;

                const occupant = newBoard[targetR][targetC];

                if (!occupant) {
                    nextR = targetR;
                    nextC = targetC;
                } else if (occupant.value === tile.value && !mergedGrid[targetR][targetC]) {
                    nextR = targetR;
                    nextC = targetC;
                    break;
                } else {
                    break;
                }
            }

            const occupant = newBoard[nextR][nextC];

            if (occupant && occupant.value === tile.value && !mergedGrid[nextR][nextC]) {
                moved = true;
                mergedGrid[nextR][nextC] = true;

                const newValue = tile.value * 2;
                scoreGained += newValue;

                tile.row = nextR;
                tile.col = nextC;
                tile.element.classList.add('tile-merged-target');
                tile.updatePosition();

                tilesToDestroy.push(tile);
                tilesToDestroy.push(occupant);

                const placeholderTile = { value: newValue, isMergedPlaceholder: true };
                newBoard[nextR][nextC] = placeholderTile;

                mergesToCreate.push({
                    row: nextR,
                    col: nextC,
                    value: newValue
                });

                if (newValue === 2048 && !hasWon && !keepPlayingMode) {
                    hasWon = true;
                }
            } else {
                if (nextR !== r || nextC !== c) {
                    moved = true;
                }
                tile.row = nextR;
                tile.col = nextC;
                tile.updatePosition();
                newBoard[nextR][nextC] = tile;
            }
        }
    }

    if (moved) {
        isMoving = true;

        if (scoreGained > 0) playSound('merge');
        else playSound('move');

        setTimeout(() => {
            tilesToDestroy.forEach(t => t.destroy());

            mergesToCreate.forEach(m => {
                const newTile = new Tile(m.row, m.col, m.value);
                newTile.updateValue(m.value, false, true);
                newBoard[m.row][m.col] = newTile;
            });

            board = newBoard;

            updateScore(scoreGained);
            addRandomTile();

            if (hasWon && !keepPlayingMode) {
                playSound('win');
                showOverlay('🎉 Você Venceu!', 'Chegou ao bloco 2048!', true);
            } else if (checkGameOver()) {
                showOverlay('Fim de Jogo!', 'Não há mais movimentos possíveis.');
            }

            isMoving = false;
        }, 120);
    } else {
        document.getElementById('undo-btn').disabled = !previousState;
    }
}

function checkGameOver() {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (!board[r][c]) return false;
            if (c < GRID_SIZE - 1 && board[r][c].value === board[r][c + 1]?.value) return false;
            if (r < GRID_SIZE - 1 && board[r][c].value === board[r + 1][c]?.value) return false;
        }
    }
    return true;
}

function showOverlay(title, msg, canKeepPlaying = false) {
    const overlay = document.getElementById('game-overlay');
    document.getElementById('overlay-title').textContent = title;
    document.getElementById('overlay-msg').textContent = msg;

    const keepBtn = document.getElementById('keep-playing-btn');
    if (canKeepPlaying) keepBtn.classList.remove('hidden');
    else keepBtn.classList.add('hidden');

    overlay.classList.remove('opacity-0', 'pointer-events-none');
    overlay.classList.add('opacity-100', 'pointer-events-auto');
}

function hideOverlay() {
    const overlay = document.getElementById('game-overlay');
    overlay.classList.remove('opacity-100', 'pointer-events-auto');
    overlay.classList.add('opacity-0', 'pointer-events-none');
}

function keepPlaying() {
    keepPlayingMode = true;
    hideOverlay();
}

function restartGame() {
    initGame();
}

// Teclado
window.addEventListener('keydown', (e) => {
    const gameView = document.getElementById('game-view');
    const howToPlayModal = document.getElementById('how-to-play-modal');

    if (!gameView.classList.contains('hidden') && howToPlayModal.classList.contains('opacity-0')) {
        if (['ArrowUp', 'KeyW'].includes(e.code)) { e.preventDefault(); move('UP'); }
        else if (['ArrowDown', 'KeyS'].includes(e.code)) { e.preventDefault(); move('DOWN'); }
        else if (['ArrowLeft', 'KeyA'].includes(e.code)) { e.preventDefault(); move('LEFT'); }
        else if (['ArrowRight', 'KeyD'].includes(e.code)) { e.preventDefault(); move('RIGHT'); }
    }
});

// Gestos Touch
let touchStartX = 0, touchStartY = 0;
let touchEndX = 0, touchEndY = 0;
const gameBoard = document.getElementById('game-board');

gameBoard.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

gameBoard.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
}, { passive: true });

function handleSwipe() {
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    const minSwipe = 30;

    if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) > minSwipe) {
            if (dx > 0) move('RIGHT');
            else move('LEFT');
        }
    } else {
        if (Math.abs(dy) > minSwipe) {
            if (dy > 0) move('DOWN');
            else move('UP');
        }
    }
}

// Redimensionamento Inteligente
window.addEventListener('resize', () => {
    if (!document.getElementById('game-view').classList.contains('hidden')) {
        calculateDimensions();
        setupGridBackground();
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (board[r][c] && typeof board[r][c].updatePosition === 'function') {
                    board[r][c].updatePosition();
                }
            }
        }
    }
});

// Carrega o recorde no Menu ao iniciar
document.getElementById('menu-best-score').textContent = bestScore;
