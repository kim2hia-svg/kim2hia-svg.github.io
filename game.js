(() => {
  const canvas = document.querySelector('#tetris-board');
  const nextCanvas = document.querySelector('#tetris-next');
  if (!canvas || !nextCanvas) return;

  const context = canvas.getContext('2d');
  const nextContext = nextCanvas.getContext('2d');
  const COLS = 10;
  const ROWS = 20;
  const CELL = canvas.width / COLS;
  const COLORS = ['#d9ff4f', '#ff7f66', '#72c8ff', '#b28dff', '#ffcf5c', '#67e8b0', '#ff8fcb'];
  const SHAPES = [
    [[1, 1, 1, 1]],
    [[1, 1, 1], [0, 1, 0]],
    [[1, 1, 0], [0, 1, 1]],
    [[0, 1, 1], [1, 1, 0]],
    [[1, 1], [1, 1]],
    [[1, 0, 0], [1, 1, 1]],
    [[0, 0, 1], [1, 1, 1]],
  ];
  let board;
  let current;
  let next;
  let score = 0;
  let lines = 0;
  let level = 1;
  let highScore = Number(localStorage.getItem('tetris-high-score') || 0);
  let running = false;
  let paused = false;
  let animationFrameId = null;
  let lastTime = 0;
  let dropAccumulator = 0;

  const scoreElement = document.querySelector('#tetris-score');
  const linesElement = document.querySelector('#tetris-lines');
  const levelElement = document.querySelector('#tetris-level');
  const highScoreElement = document.querySelector('#tetris-high-score');
  const statusElement = document.querySelector('#tetris-status');
  const foodStatusElement = document.querySelector('#tetris-food-status');
  const pauseButton = document.querySelector('#tetris-pause');
  const startButton = document.querySelector('#tetris-start');

  const createBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  const cloneShape = (shape) => shape.map((row) => [...row]);
  const randomPiece = () => { const index = Math.floor(Math.random() * SHAPES.length); const shape = cloneShape(SHAPES[index]); return { shape, color: COLORS[index], x: Math.floor((COLS - shape[0].length) / 2), y: 0 }; };
  const rotate = (shape) => shape[0].map((_, index) => shape.map((row) => row[index]).reverse());
  const collides = (piece, testBoard = board) => piece.shape.some((row, y) => row.some((cell, x) => cell && (testBoard[piece.y + y]?.[piece.x + x] !== 0 || piece.x + x < 0 || piece.x + x >= COLS || piece.y + y >= ROWS)));
  const drawCell = (ctx, x, y, color, size) => { ctx.fillStyle = color; ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2); };
  const draw = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    board.forEach((row, y) => row.forEach((color, x) => { if (color) drawCell(context, x, y, color, CELL); }));
    if (current) current.shape.forEach((row, y) => row.forEach((cell, x) => { if (cell) drawCell(context, current.x + x, current.y + y, current.color, CELL); }));
    nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (next) { const size = 24; const offsetX = (5 - next.shape[0].length) / 2; const offsetY = (5 - next.shape.length) / 2; next.shape.forEach((row, y) => row.forEach((cell, x) => { if (cell) drawCell(nextContext, offsetX + x, offsetY + y, next.color, size); })); }
  };
  const updateStats = () => { scoreElement.textContent = String(score); linesElement.textContent = String(lines); levelElement.textContent = String(level); highScoreElement.textContent = String(highScore); foodStatusElement.textContent = `Food: next block ready · Growth: level ${level}`; };
  const setStatus = (message) => { statusElement.textContent = message; };
  const stopLoop = () => { if (animationFrameId !== null) { cancelAnimationFrame(animationFrameId); animationFrameId = null; } };
  const loop = (time = 0) => {
    if (!running || paused) { animationFrameId = null; return; }
    const delta = time - lastTime; lastTime = time; dropAccumulator += delta;
    if (dropAccumulator > Math.max(100, 800 - ((level - 1) * 65))) { playerDrop(); dropAccumulator = 0; }
    draw(); animationFrameId = requestAnimationFrame(loop);
  };
  const startLoop = () => { if (animationFrameId === null) { lastTime = performance.now(); animationFrameId = requestAnimationFrame(loop); } };
  const merge = () => current.shape.forEach((row, y) => row.forEach((cell, x) => { if (cell) board[current.y + y][current.x + x] = current.color; }));
  const clearLines = () => { let cleared = 0; board = board.filter((row) => { if (row.every(Boolean)) { cleared += 1; return false; } return true; }); while (board.length < ROWS) board.unshift(Array(COLS).fill(0)); if (cleared) { lines += cleared; level = Math.floor(lines / 10) + 1; score += [0, 100, 300, 500, 800][cleared] * level; if (score > highScore) { highScore = score; localStorage.setItem('tetris-high-score', String(highScore)); } updateStats(); } };
  const spawn = () => { current = next || randomPiece(); next = randomPiece(); if (collides(current)) gameOver(); };
  const playerMove = (direction) => { if (!running || paused || !current) return; current.x += direction; if (collides(current)) current.x -= direction; draw(); };
  const playerRotate = () => { if (!running || paused || !current) return; const previous = current.shape; current.shape = rotate(current.shape); if (collides(current)) current.shape = previous; draw(); };
  function playerDrop() { if (!running || paused || !current) return; current.y += 1; if (collides(current)) { current.y -= 1; merge(); clearLines(); spawn(); } draw(); }
  const gameOver = () => { running = false; paused = false; stopLoop(); pauseButton.disabled = true; startButton.disabled = false; setStatus('Game over — press Restart to try again.'); draw(); };
  const reset = () => { stopLoop(); board = createBoard(); score = 0; lines = 0; level = 1; next = randomPiece(); spawn(); updateStats(); draw(); };
  const start = () => { reset(); running = true; paused = false; pauseButton.disabled = false; startButton.disabled = true; setStatus('Playing. Clear lines to grow your level.'); startLoop(); };
  const restart = () => { start(); };
  const togglePause = () => { if (!running) return; paused = !paused; pauseButton.textContent = paused ? 'Resume' : 'Pause'; setStatus(paused ? 'Paused.' : 'Playing. Clear lines to grow your level.'); if (paused) stopLoop(); else startLoop(); };
  const action = (name) => ({ left: () => playerMove(-1), right: () => playerMove(1), rotate: playerRotate, down: playerDrop }[name]?.());
  document.querySelector('#tetris-start')?.addEventListener('click', start);
  document.querySelector('#tetris-restart')?.addEventListener('click', restart);
  pauseButton?.addEventListener('click', togglePause);
  document.querySelectorAll('[data-game-action]').forEach((button) => button.addEventListener('click', () => action(button.dataset.gameAction)));
  document.addEventListener('keydown', (event) => { const key = event.key.toLowerCase(); if (['arrowleft', 'arrowright', 'arrowdown', 'arrowup', ' ', 'p', 'r', 'a', 'd', 's', 'w'].includes(key)) event.preventDefault(); if (key === 'arrowleft' || key === 'a') playerMove(-1); if (key === 'arrowright' || key === 'd') playerMove(1); if (key === 'arrowdown' || key === 's') playerDrop(); if (key === 'arrowup' || key === 'w') playerRotate(); if (key === 'p' || key === ' ') togglePause(); if (key === 'r') restart(); });
  reset();
})();
