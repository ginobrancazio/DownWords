// ===== RULEBREAKERS CONFIG & DAILY SELECTION =====

const RULEBREAKERS = [
  {
    id: 'scannerIconsNotPositions',
    name: 'Scanners Reveal Icons, Not Positions',
    description:
      'Scanners list which icons they cover (e.g. “2× ❤️, 1× ⭐”) but do not flip any tiles.',
    effects: {
      scannerRevealMode: 'icons-only'
    }
  },
  {
    id: 'sharedScannerCooldown',
    name: 'Shared Scanner Cooldown',
    description:
      'You start with 3 scanners, but can use only 1 every 5 guesses. All scanners share a cooldown.',
    effects: {
      startingScanners: 3,
      scannerCooldownGuesses: 5
    }
  },
  {
    id: 'gravitySideways',
    name: 'Gravity Pulls Sideways Today',
    description:
      'Instead of falling down, tiles slide sideways to fill gaps after matches.',
    effects: {
      gravityDirection: 'left' // actual left/right chosen per day
    }
  },
  {
    id: 'rotateEveryMatch',
    name: 'Grid Rotates After Every Match',
    description:
      'The grid rotates 90° after every successful match instead of every three.',
    effects: {
      rotationTrigger: 'every-match'
    }
  },
  {
    id: 'noRotation',
    name: 'Grid Never Rotates Today',
    description:
      'The grid does not rotate at all today. Pure memory, no spins.',
    effects: {
      rotationDisabled: true
    }
  },
  {
    id: 'spinAfterScan',
    name: 'Random 90° Spin After Each Scanner Use',
    description:
      'Every time you use a scanner, the grid rotates 90° in a random direction afterward.',
    effects: {
      spinAfterScan: true
    }
  },
  {
    id: 'dominoDay',
    name: 'Domino Day',
    description:
      'All scanners are 2-tile dominoes (either 1×2 or 2×1).',
    effects: {
      scannerShapeMode: 'domino-only'
    }
  },
  {
    id: 'oneShotScanners',
    name: 'One-Shot Scanners',
    description:
      'You only get 3 scanners for the entire game and never earn more.',
    effects: {
      startingScanners: 3,
      scannersMaxTotal: 3,
      scannersEarnedFromMisses: false,
      scannersEarnedFromMatches: false
    }
  },
  {
    id: 'speedyScanners',
    name: 'Speedy Scanners',
    description:
      'Scanner reveals last only 1 second instead of 2.',
    effects: {
      scannerRevealMs: 1000
    }
  },
  {
    id: 'mirrorScanners',
    name: 'Mirror Scanners',
    description:
      'Each scanner also affects the symmetrically opposite tiles, mirrored across the grid centre.',
    effects: {
      scannerMirror: true
    }
  },
  {
    id: 'noFreeScanners',
    name: 'No Free Scanners',
    description:
      'You start with 6 scanners, but never earn additional ones from guesses.',
    effects: {
      startingScanners: 6,
      scannersEarnedFromMisses: false,
      scannersEarnedFromMatches: false,
      scannersMaxTotal: 6
    }
  },
  {
    id: 'spinOnMiss',
    name: 'Spin on Miss',
    description:
      'The grid rotates 90° every time you make an incorrect guess.',
    effects: {
      rotateOnMiss: true
    }
  },
  {
    id: 'fixedSpinDirection',
    name: 'Fixed Spin Direction',
    description:
      'The grid always rotates in the same direction, so you can plan around the spins.',
    effects: {
      fixedSpinDirection: true, // actual direction set per day
      spinDirection: null
    }
  },
  {
    id: 'chillDay',
    name: 'Chill Day',
    description:
      'Scanner reveals last 3 seconds instead of 2, but you only start with 3 scanners.',
    effects: {
      scannerRevealMs: 3000,
      startingScanners: 3
    }
  }
];

// Simple deterministic pseudo-random generator from a seed
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStringToSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

// Choose N rulebreakers in a deterministic order for a given date
function getDailyRulebreakers(date = new Date()) {
  const dayStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
  const seed = hashStringToSeed(dayStr);
  const rng = mulberry32(seed);

  const pool = RULEBREAKERS.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Example policy: pick 2–3 rulebreakers per day
  const count = 2 + Math.floor(rng() * 2); // 2 or 3
  const chosen = pool.slice(0, count);

  // If fixedSpinDirection is active, decide CW vs CCW per day
  const fixed = chosen.find(
    (rb) => rb.id === 'fixedSpinDirection'
  );
  if (fixed) {
    fixed.effects.spinDirection =
      rng() < 0.5 ? 'clockwise' : 'counterclockwise';
  }

  // If gravitySideways is active, choose left vs right
  const sideways = chosen.find(
    (rb) => rb.id === 'gravitySideways'
  );
  if (sideways) {
    sideways.effects.gravityDirection =
      rng() < 0.5 ? 'left' : 'right';
  }

  return chosen;
}

// ===== GAME CLASS =====

class PuzzlePairsGame {
  constructor() {
    this.gridSize = 5;
    this.maxPolyominos = 6;

    // Daily rulebreakers
    this.dailyRulebreakers = getDailyRulebreakers();
    this.activeEffects = null;

    this.icons = [
      { symbol: '🔴', color: '#e74c3c', id: 0 },
      { symbol: '🔵', color: '#3498db', id: 1 },
      { symbol: '🟢', color: '#2ecc71', id: 2 },
      { symbol: '🟡', color: '#f1c40f', id: 3 },
      { symbol: '🟣', color: '#9b59b6', id: 4 },
      { symbol: '🟠', color: '#e67e22', id: 5 },
      { symbol: '⭐', color: '#f39c12', id: 6 },
      { symbol: '❤️', color: '#e74c3c', id: 7 },
      { symbol: '💎', color: '#3498db', id: 8 },
      { symbol: '🌟', color: '#f1c40f', id: 9 },
      { symbol: '🔥', color: '#e74c3c', id: 10 },
      { symbol: '⚡', color: '#f39c12', id: 11 },
      { symbol: '🎯', color: '#e74c3c', id: 12 }
    ];

    this.polyominoShapes = [
      [[1, 1]],
      [[1], [1]],
      [[1, 1, 1]],
      [[1], [1], [1]],
      [[1, 1], [1, 0]],
      [[1, 0], [1, 1]],
      [[1, 1], [0, 1]],
      [[0, 1], [1, 1]],
      [[1, 1, 1, 1]],
      [[1], [1], [1], [1]],
      [[1, 1], [1, 1]],
      [[1, 1, 0], [0, 1, 1]],
      [[0, 1, 1], [1, 1, 0]],
      [[1, 1, 1], [0, 1, 0]],
      [[1, 0, 0], [1, 1, 1]],
      [[0, 0, 1], [1, 1, 1]]
    ];

    this.isMuted = false;
    this.isDarkMode = false;

    this.activeEffects = this.computeActiveEffects(
      this.dailyRulebreakers
    );

    this.init();
    this.setupEventListeners();
  }

  computeActiveEffects(rulebreakers) {
    const effects = {
      // defaults
      scannerRevealMs: 2000,
      scannerRevealMode: 'normal', // or 'icons-only'
      startingScanners: 1,
      scannersEarnedFromMisses: true,
      scannersEarnedFromMatches: false,
      scannersMaxTotal: this.maxPolyominos,
      scannerCooldownGuesses: 0,
      gravityDirection: 'down',
      rotationDisabled: false,
      rotationTrigger: 'every-3-matches',
      spinAfterScan: false,
      rotateOnMiss: false,
      fixedSpinDirection: false,
      spinDirection: null, // 'clockwise'|'counterclockwise'
      scannerShapeMode: 'normal',
      scannerMirror: false
    };

    for (const rb of rulebreakers) {
      Object.assign(effects, rb.effects);
    }

    return effects;
  }

  init() {
    this.grid = [];
    this.tiles = [];
    this.selectedGuesses = [];
    this.flippedTiles = new Set();
    this.selectedPolyomino = null;
    this.availablePolyominos = [];

    this.pairsFound = 0;
    this.totalGuesses = 0;
    this.incorrectGuesses = 0;
    this.scanUses = 0;
    this.rotations = 0;
    this.gameStartTime = null;
    this.timerInterval = null;
    this.gameActive = false;
    this.isProcessing = false;

    this.gameHistory = [];

    // Unique id for each tile for animation tracking
    this.uidCounter = 0;

    // Scanner cooldown state
    this.scannerCooldownRemaining = 0;

    this.initGrid();

    // Initial scanners per rulebreakers
    const startScanners =
      this.activeEffects.startingScanners ?? 1;
    for (let i = 0; i < startScanners; i++) {
      this.addPolyomino();
    }

    this.renderGrid();
    this.renderPolyominos();
    this.updateHUD();
    this.updateProgressIndicator();
    this.updateRulebreakersBanner();
    this.updateStatus(
      'Click two tiles to make a guess, or use a scanner.'
    );
  }

  updateRulebreakersBanner() {
    const listEl = document.getElementById('rulebreakers-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (
      !this.dailyRulebreakers ||
      this.dailyRulebreakers.length === 0
    ) {
      const li = document.createElement('li');
      li.textContent =
        'No rulebreakers today. Classic rules apply.';
      listEl.appendChild(li);
      return;
    }

    this.dailyRulebreakers.forEach((rb) => {
      const li = document.createElement('li');
      li.textContent = `${rb.name}: ${rb.description}`;
      listEl.appendChild(li);
    });
  }

  initGrid() {
    const tileSet = [];

    // Add 12 pairs with unique uids
    for (let i = 0; i < 12; i++) {
      tileSet.push({ ...this.icons[i], uid: this.uidCounter++ });
      tileSet.push({ ...this.icons[i], uid: this.uidCounter++ });
    }
    // Add 1 unpaired tile
    tileSet.push({ ...this.icons[12], uid: this.uidCounter++ });

    // Shuffle
    for (let i = tileSet.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tileSet[i], tileSet[j]] = [tileSet[j], tileSet[i]];
    }

    // Build 5x5 grid
    this.grid = [];
    for (let row = 0; row < this.gridSize; row++) {
      this.grid[row] = [];
      for (let col = 0; col < this.gridSize; col++) {
        const idx = row * this.gridSize + col;
        this.grid[row][col] = tileSet[idx];
      }
    }
  }

  addPolyomino() {
    const maxTotal =
      this.activeEffects.scannersMaxTotal ?? this.maxPolyominos;
    if (this.availablePolyominos.length >= maxTotal) return;

    let shape;

    if (this.activeEffects.scannerShapeMode === 'domino-only') {
      const dominos = [
        [[1, 1]], // horizontal
        [[1], [1]] // vertical
      ];
      shape = dominos[Math.floor(Math.random() * dominos.length)];
    } else {
      shape =
        this.polyominoShapes[
          Math.floor(Math.random() * this.polyominoShapes.length)
        ];
    }

    this.availablePolyominos.push({
      id: Date.now() + Math.random(),
      shape
    });
  }

  setupEventListeners() {
    document
      .getElementById('start-game-button')
      .addEventListener('click', () => this.startGame());

    document
      .getElementById('new-game-button')
      .addEventListener('click', () => this.newGame());

    // Completion overlay button becomes "Close"
    const completionBtn = document.getElementById(
      'completion-new-game'
    );
    if (completionBtn) {
      completionBtn.textContent = 'Close';
      completionBtn.addEventListener('click', () =>
        this.closeCompletionOverlay()
      );
    }

    document
      .getElementById('mode-toggle')
      .addEventListener('click', () => this.toggleDarkMode());

    document
      .getElementById('mute-button')
      .addEventListener('click', () => this.toggleMute());

    document
      .getElementById('instructions-toggle')
      .addEventListener('click', () => this.toggleInstructions());

    document
      .getElementById('copyButton')
      .addEventListener('click', () => this.copyResults());

    document
      .getElementById('shareButton')
      .addEventListener('click', () => this.shareResults());

    const gridEl = document.getElementById('tile-grid');
    gridEl.addEventListener('mousemove', (e) =>
      this.handleGridHover(e)
    );
    gridEl.addEventListener('mouseleave', () =>
      this.clearPreview()
    );
    gridEl.addEventListener('click', (e) =>
      this.handleGridClick(e)
    );
  }

  startGame() {
    document.getElementById('start-overlay').style.display =
      'none';
    this.gameActive = true;
    this.gameStartTime = Date.now();
    this.timerInterval = setInterval(
      () => this.updateTimer(),
      1000
    );
  }

  newGame() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    document
      .getElementById('completion-overlay')
      .classList.remove('visible');
    document.getElementById('start-overlay').style.display =
      'flex';

    const completionMsg = document.getElementById(
      'gameCompletionMessage'
    );
    completionMsg.style.display = 'none';
    completionMsg.classList.remove('active');

    document.getElementById('copyButton').style.display =
      'none';
    document.getElementById('shareButton').style.display =
      'none';

    this.init();
  }

  closeCompletionOverlay() {
    const overlay = document.getElementById(
      'completion-overlay'
    );
    if (overlay) {
      overlay.classList.remove('visible');
    }
  }

  updateTimer() {
    if (!this.gameStartTime) return;
    const elapsed = Math.floor(
      (Date.now() - this.gameStartTime) / 1000
    );
    document.getElementById(
      'timer'
    ).textContent = `Time: ${elapsed}s`;
  }

  updateHUD() {
    document.getElementById('pairs-found').textContent =
      this.pairsFound;
    document.getElementById('total-guesses').textContent =
      this.totalGuesses;
    document.getElementById(
      'incorrect-guesses'
    ).textContent = this.incorrectGuesses;
    document.getElementById('scan-uses').textContent =
      this.scanUses;
    document.getElementById('rotations').textContent =
      this.rotations;
  }

  updateProgressIndicator() {
    const labelEl = document.querySelector('.progress-label');
    const hintEl = document.querySelector('.progress-hint');
    const dots = document.querySelectorAll('.progress-dot');

    if (!dots.length) return;

    // If we use a scanner cooldown, show that instead
    if (this.activeEffects.scannerCooldownGuesses > 0) {
      const total = this.activeEffects.scannerCooldownGuesses;
      const remaining = this.scannerCooldownRemaining;
      const used = total - remaining;

      if (labelEl) labelEl.textContent = 'Scanner cooldown:';

      if (hintEl) {
        if (remaining > 0) {
          hintEl.textContent = `${remaining} guesses until next scan`;
        } else {
          hintEl.textContent = 'Scanner ready!';
        }
      }

      dots.forEach((dot, index) => {
        if (index < used) {
          dot.classList.add('filled');
        } else {
          dot.classList.remove('filled');
        }
      });

      return;
    }

    // Default: next scanner from misses
    if (labelEl) labelEl.textContent = 'Next scanner in:';
    if (hintEl) hintEl.textContent = '3 incorrect guesses';

    if (this.activeEffects.scannersEarnedFromMisses === false) {
      // No free scanners: show 0 progress
      dots.forEach((dot) => dot.classList.remove('filled'));
      return;
    }

    const progress = this.incorrectGuesses % 3;
    dots.forEach((dot, index) => {
      if (index < progress) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled');
      }
    });
  }

  updateStatus(message) {
    document.getElementById('status-message').textContent =
      message;
  }

  // Render grid; if prevGrid is provided, animate tiles that moved
  renderGrid(prevGrid = null) {
    const gridEl = document.getElementById('tile-grid');
    gridEl.innerHTML = '';

    // Map previous positions by uid so we can animate falls
    let prevPos = null;
    if (prevGrid) {
      prevPos = new Map();
      for (let r = 0; r < this.gridSize; r++) {
        for (let c = 0; c < this.gridSize; c++) {
          const prevTile = prevGrid[r][c];
          if (prevTile) {
            prevPos.set(prevTile.uid, { row: r, col: c });
          }
        }
      }
    }

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const tileData = this.grid[row][col];

        const tileEl = document.createElement('div');
        tileEl.className = 'tile';
        tileEl.dataset.row = row;
        tileEl.dataset.col = col;

        const key = `${row},${col}`;
        const isFlipped = this.flippedTiles.has(key);

        if (tileData) {
          tileEl.dataset.uid = tileData.uid;
          tileEl.classList.add(
            isFlipped ? 'revealed' : 'hidden'
          );

          const iconEl = document.createElement('span');
          iconEl.className = 'icon';
          iconEl.textContent = tileData.symbol;
          iconEl.style.color = tileData.color;
          tileEl.appendChild(iconEl);

          // (Optional) falling animation only for downward gravity
          if (prevPos && this.activeEffects.gravityDirection === 'down') {
            const oldPos = prevPos.get(tileData.uid);
            if (
              oldPos &&
              oldPos.col === col &&
              oldPos.row < row
            ) {
              const distance = row - oldPos.row;
              tileEl.style.setProperty(
                '--fall-distance',
                distance.toString()
              );
              tileEl.classList.add('falling-down');
            }
          }
        } else {
          tileEl.classList.add('empty');
        }

        gridEl.appendChild(tileEl);
      }
    }
  }

  renderPolyominos() {
    const container = document.getElementById('shape-list');
    container.innerHTML = '';

    this.availablePolyominos.forEach((poly, idx) => {
      const polyEl = document.createElement('div');
      polyEl.className = 'polyomino';
      if (this.selectedPolyomino === idx) {
        polyEl.classList.add('selected');
      }

      const rows = poly.shape.length;
      const cols = poly.shape[0].length;

      const gridEl = document.createElement('div');
      gridEl.className = 'polyomino-grid';
      gridEl.style.gridTemplateColumns = `repeat(${cols}, 12px)`;
      gridEl.style.gridTemplateRows = `repeat(${rows}, 12px)`;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = document.createElement('div');
          cell.className = 'poly-cell';
          if (poly.shape[r][c] === 1) {
            cell.classList.add('filled');
          }
          gridEl.appendChild(cell);
        }
      }

      polyEl.appendChild(gridEl);
      polyEl.addEventListener('click', () =>
        this.selectPolyomino(idx)
      );
      container.appendChild(polyEl);
    });
  }

  selectPolyomino(idx) {
    if (this.isProcessing) return;

    this.selectedPolyomino =
      this.selectedPolyomino === idx ? null : idx;
    this.selectedGuesses = [];
    this.renderGrid();
    this.renderPolyominos();

    if (this.selectedPolyomino !== null) {
      this.updateStatus(
        "Click where to place the scanner's top-left."
      );
      this.playSound('click-sound');
    } else {
      this.updateStatus(
        'Click two tiles to make a guess, or select a scanner.'
      );
    }
  }

  handleGridHover(e) {
    if (this.selectedPolyomino === null || this.isProcessing) {
      this.clearPreview();
      return;
    }

    const { row, col } = this.getTileFromEvent(e);
    if (row === null) {
      this.clearPreview();
      return;
    }

    this.showPolyominoPreview(row, col);
  }

  showPolyominoPreview(startRow, startCol) {
    this.clearPreview();

    const poly =
      this.availablePolyominos[this.selectedPolyomino];
    const tiles = document.querySelectorAll('.tile');

    tiles.forEach((tileEl) => {
      const row = parseInt(tileEl.dataset.row);
      const col = parseInt(tileEl.dataset.col);

      const polyRow = row - startRow;
      const polyCol = col - startCol;

      if (
        polyRow >= 0 &&
        polyRow < poly.shape.length &&
        polyCol >= 0 &&
        polyCol < poly.shape[0].length &&
        poly.shape[polyRow][polyCol] === 1
      ) {
        tileEl.classList.add('preview');
      }
    });
  }

  clearPreview() {
    document
      .querySelectorAll('.tile.preview')
      .forEach((el) => {
        el.classList.remove('preview');
      });
  }

  handleGridClick(e) {
    if (this.isProcessing || !this.gameActive) return;

    const { row, col, tileEl } = this.getTileFromEvent(e);
    if (row === null || !tileEl) return;

    if (!this.grid[row][col]) return;

    const key = `${row},${col}`;

    // If a polyomino is selected, place it
    if (this.selectedPolyomino !== null) {
      this.placePolyomino(row, col);
      return;
    }

    // Otherwise, handle tile selection for guessing
    this.handleTileGuess(row, col, tileEl, key);
  }

  handleTileGuess(row, col, tileEl, key) {
    // Check if already selected
    const existingIdx = this.selectedGuesses.findIndex(
      (g) => g.key === key
    );
    if (existingIdx !== -1) {
      this.selectedGuesses.splice(existingIdx, 1);
      tileEl.classList.remove('guess-selected');
      this.updateStatus('Click two tiles to make a guess.');
      return;
    }

    // Add to selection
    if (this.selectedGuesses.length < 2) {
      this.selectedGuesses.push({
        key,
        row,
        col,
        icon: this.grid[row][col],
        element: tileEl
      });
      tileEl.classList.add('guess-selected');
      this.playSound('click-sound');

      if (this.selectedGuesses.length === 1) {
        this.updateStatus(
          'Click another tile to complete your guess.'
        );
      } else {
        this.checkMatch();
      }
    }
  }

  getTileFromEvent(e) {
    const tileEl = e.target.closest('.tile');
    if (!tileEl) return { row: null, col: null, tileEl: null };

    const row = parseInt(tileEl.dataset.row);
    const col = parseInt(tileEl.dataset.col);
    return { row, col, tileEl };
  }

  placePolyomino(startRow, startCol) {
    const poly =
      this.availablePolyominos[this.selectedPolyomino];

    // Cooldown gate
    if (
      this.activeEffects.scannerCooldownGuesses > 0 &&
      this.scannerCooldownRemaining > 0
    ) {
      this.updateStatus(
        `Scanner recharging: ${this.scannerCooldownRemaining} guesses remaining.`
      );
      this.shakeGrid();
      return;
    }

    if (
      !this.canPlacePolyomino(startRow, startCol, poly.shape)
    ) {
      this.updateStatus('Cannot place scanner there!');
      this.shakeGrid();
      return;
    }

    // Collect all affected coordinates (including mirror)
    const coords = [];
    const addCoord = (r, c) => {
      if (
        r < 0 ||
        r >= this.gridSize ||
        c < 0 ||
        c >= this.gridSize
      )
        return;
      if (!this.grid[r][c]) return;
      coords.push({ row: r, col: c });
    };

    for (let r = 0; r < poly.shape.length; r++) {
      for (let c = 0; c < poly.shape[0].length; c++) {
        if (poly.shape[r][c] === 1) {
          const gr = startRow + r;
          const gc = startCol + c;
          addCoord(gr, gc);

          if (this.activeEffects.scannerMirror) {
            const mr = this.gridSize - 1 - gr;
            const mc = this.gridSize - 1 - gc;
            addCoord(mr, mc);
          }
        }
      }
    }

    // Deduplicate coords
    const seen = new Set();
    const uniqueCoords = [];
    for (const pos of coords) {
      const k = `${pos.row},${pos.col}`;
      if (!seen.has(k)) {
        seen.add(k);
        uniqueCoords.push(pos);
      }
    }

    this.scanUses++;
    this.gameHistory.push({
      type: 'scan',
      revealed: uniqueCoords.length
    });

    let revealedKeys = [];
    const revealMs =
      this.activeEffects.scannerRevealMs ?? 2000;

    if (this.activeEffects.scannerRevealMode === 'icons-only') {
      // Icons-only mode: summarize icons, no tile flipping
      const counts = {};
      for (const { row, col } of uniqueCoords) {
        const tile = this.grid[row][col];
        if (!tile) continue;
        counts[tile.symbol] = (counts[tile.symbol] || 0) + 1;
      }

      const summary = Object.entries(counts)
        .map(([sym, n]) => `${n}× ${sym}`)
        .join(', ');

      this.updateStatus(
        summary ? `Scanner found: ${summary}` : 'Scanner found no tiles.'
      );
    } else {
      // Normal reveal mode: temporarily flip tiles
      for (const { row, col } of uniqueCoords) {
        const key = `${row},${col}`;
        this.flippedTiles.add(key);
        revealedKeys.push(key);
      }

      this.playSound('scanreveal-sound');
      this.renderGrid();
      this.updateHUD();
      this.clearPreview();

      setTimeout(() => {
        revealedKeys.forEach((k) =>
          this.flippedTiles.delete(k)
        );
        this.renderGrid();
      }, revealMs);
    }

    // Scanner cooldown starts now (if enabled)
    if (this.activeEffects.scannerCooldownGuesses > 0) {
      this.scannerCooldownRemaining =
        this.activeEffects.scannerCooldownGuesses;
    }

    // Remove used polyomino
    this.availablePolyominos.splice(
      this.selectedPolyomino,
      1
    );
    this.selectedPolyomino = null;
    this.renderPolyominos();

    // Optional spin after scan
    if (
      this.activeEffects.spinAfterScan &&
      !this.activeEffects.rotationDisabled
    ) {
      this.rotateGrid(() => {
        this.applyGravity(() => {});
      });
    }

    this.updateProgressIndicator();
    this.updateStatus(
      'Click two tiles to make a guess, or select a scanner.'
    );
  }

  canPlacePolyomino(startRow, startCol, shape) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (shape[r][c] === 1) {
          const gridRow = startRow + r;
          const gridCol = startCol + c;

          if (
            gridRow < 0 ||
            gridRow >= this.gridSize ||
            gridCol < 0 ||
            gridCol >= this.gridSize
          ) {
            return false;
          }
        }
      }
    }
    return true;
  }

  checkMatch() {
    this.isProcessing = true;
    const [guess1, guess2] = this.selectedGuesses;

    this.flippedTiles.add(guess1.key);
    this.flippedTiles.add(guess2.key);
    guess1.element.classList.remove('guess-selected');
    guess2.element.classList.remove('guess-selected');
    this.renderGrid();

    this.totalGuesses++;

    // Scanner cooldown ticks down on guesses
    if (
      this.activeEffects.scannerCooldownGuesses > 0 &&
      this.scannerCooldownRemaining > 0
    ) {
      this.scannerCooldownRemaining = Math.max(
        0,
        this.scannerCooldownRemaining - 1
      );
    }
    this.updateProgressIndicator();

    // Shorter delay before resolving match / mismatch
    setTimeout(() => {
      if (guess1.icon.id === guess2.icon.id) {
        // Match!
        this.grid[guess1.row][guess1.col] = null;
        this.grid[guess2.row][guess2.col] = null;
        this.pairsFound++;

        this.gameHistory.push({
          type: 'match',
          correct: true
        });
        this.playSound('match-sound');
        this.updateStatus('Match found!');

        // Remove from flipped tiles
        this.flippedTiles.delete(guess1.key);
        this.flippedTiles.delete(guess2.key);

        this.renderGrid();

        // After a short delay, apply gravity, then maybe rotate, then gravity again
        setTimeout(() => {
          this.applyGravity(() => {
            // Decide if rotation is needed
            let needsRotation = false;
            if (this.activeEffects.rotationDisabled) {
              needsRotation = false;
            } else if (
              this.activeEffects.rotationTrigger ===
              'every-match'
            ) {
              needsRotation = this.pairsFound < 12;
            } else {
              // default: every 3 matches
              needsRotation =
                this.pairsFound % 3 === 0 &&
                this.pairsFound < 12;
            }

            const finishAfterAll = () => {
              if (this.pairsFound === 12) {
                setTimeout(
                  () => this.completeGame(),
                  1000
                );
              }
              this.isProcessing = false;
              this.updateHUD();
              if (this.pairsFound < 12) {
                this.updateStatus(
                  'Click two tiles to make a guess, or select a scanner.'
                );
              }
            };

            if (needsRotation) {
              setTimeout(() => {
                this.rotateGrid(() => {
                  this.applyGravity(() => {
                    finishAfterAll();
                  });
                });
              }, 600);
            } else {
              finishAfterAll();
            }
          });
        }, 300);
      } else {
        // No match
        this.incorrectGuesses++;
        this.gameHistory.push({
          type: 'match',
          correct: false
        });
        this.playSound('fail-sound');
        this.updateStatus('No match. Try again!');

        // Tiles stay revealed briefly, then hide again (shorter)
        setTimeout(() => {
          this.flippedTiles.delete(guess1.key);
          this.flippedTiles.delete(guess2.key);
          this.renderGrid();
        }, 600);

        // Award polyomino every 3 incorrect guesses, if allowed
        if (
          this.incorrectGuesses % 3 === 0 &&
          this.activeEffects.scannersEarnedFromMisses !== false
        ) {
          this.addPolyomino();
          this.renderPolyominos();
          this.updateStatus('New scanner earned!');
        }

        this.updateProgressIndicator();

        // Optional spin on miss
        if (
          this.activeEffects.rotateOnMiss &&
          !this.activeEffects.rotationDisabled
        ) {
          this.rotateGrid(() => {
            this.applyGravity(() => {});
          });
        }

        this.selectedGuesses = [];
        this.updateHUD();
        this.isProcessing = false;

        if (
          this.pairsFound < 12 &&
          this.incorrectGuesses % 3 !== 0
        ) {
          setTimeout(() => {
            this.updateStatus(
              'Click two tiles to make a guess, or select a scanner.'
            );
          }, 2000);
        }
      }

      this.selectedGuesses = [];
    }, 450);
  }

  cloneGrid() {
    return this.grid.map((row) => row.slice());
  }

  applyGravity(callback) {
    const applyGravityStep = () => {
      const prevGrid = this.cloneGrid();
      let changed = false;

      const dir = this.activeEffects.gravityDirection || 'down';

      if (dir === 'down') {
        // Vertical gravity (default)
        for (let col = 0; col < this.gridSize; col++) {
          for (
            let row = this.gridSize - 2;
            row >= 0;
            row--
          ) {
            if (
              this.grid[row][col] &&
              !this.grid[row + 1][col]
            ) {
              this.grid[row + 1][col] = this.grid[row][col];
              this.grid[row][col] = null;
              changed = true;
            }
          }
        }
      } else if (dir === 'left' || dir === 'right') {
        const startCol = dir === 'left' ? 1 : this.gridSize - 2;
        const endCol = dir === 'left' ? this.gridSize : -1;
        const step = dir === 'left' ? 1 : -1;

        for (let row = 0; row < this.gridSize; row++) {
          for (
            let col = startCol;
            col !== endCol;
            col += step
          ) {
            const nextCol = col - step;
            if (
              this.grid[row][col] &&
              !this.grid[row][nextCol]
            ) {
              this.grid[row][nextCol] = this.grid[row][col];
              this.grid[row][col] = null;
              changed = true;
            }
          }
        }
      }

      if (changed) {
        this.playSound('drop-sound');
        this.renderGrid(prevGrid);
        setTimeout(() => applyGravityStep(), 150);
      } else {
        if (callback) callback();
      }
    };

    applyGravityStep();
  }

  // Rotate grid with visual spin, then update data afterward
  rotateGrid(onComplete) {
    if (this.activeEffects.rotationDisabled) {
      if (onComplete) onComplete();
      return;
    }

    this.rotations++;
    const gridEl = document.getElementById('tile-grid');

    let clockwise;
    if (
      this.activeEffects.fixedSpinDirection &&
      this.activeEffects.spinDirection
    ) {
      clockwise =
        this.activeEffects.spinDirection === 'clockwise';
    } else {
      clockwise = Math.random() < 0.5;
    }

    this.gameHistory.push({
      type: 'rotation',
      direction: clockwise ? 'clockwise' : 'counterclockwise'
    });

    // Ensure we start from a clean transform state
    gridEl.classList.remove('rotate-cw', 'rotate-ccw');
    void gridEl.offsetWidth;

    gridEl.classList.add(
      clockwise ? 'rotate-cw' : 'rotate-ccw'
    );
    this.playSound('rotate-sound');

    setTimeout(() => {
      // Compute rotated data AFTER the spin finishes
      const newGrid = Array(this.gridSize)
        .fill(null)
        .map(() => Array(this.gridSize).fill(null));

      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.grid[row][col]) {
            let newRow, newCol;
            if (clockwise) {
              newRow = col;
              newCol = this.gridSize - 1 - row;
            } else {
              newRow = this.gridSize - 1 - col;
              newCol = row;
            }
            newGrid[newRow][newCol] = this.grid[row][col];
          }
        }
      }

      this.grid = newGrid;
      this.flippedTiles.clear();

      // Snap transform back to 0 without animating backward
      const originalTransition = gridEl.style.transition;
      gridEl.style.transition = 'none';
      gridEl.classList.remove('rotate-cw', 'rotate-ccw');
      void gridEl.offsetWidth;
      gridEl.style.transition = originalTransition;

      this.renderGrid();

      if (onComplete) onComplete();
    }, 900); // Match the CSS rotation duration
  }

  shakeGrid() {
    const gridEl = document.getElementById('tile-grid');
    gridEl.classList.add('shake');
    setTimeout(() => gridEl.classList.remove('shake'), 300);
  }

  completeGame() {
    this.gameActive = false;
    if (this.timerInterval) clearInterval(this.timerInterval);

    const elapsed = Math.floor(
      (Date.now() - this.gameStartTime) / 1000
    );
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timeStr =
      minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    this.playSound('win-sound');

    const gridEl = document.getElementById('tile-grid');
    gridEl.classList.add('complete-flash');

    setTimeout(() => {
      const overlay = document.getElementById(
        'completion-overlay'
      );
      overlay.classList.add('visible');

      const summary = document.getElementById(
        'completion-summary'
      );
      summary.textContent =
        `Time: ${timeStr} | Incorrect: ${this.incorrectGuesses} | ` +
        `Scans: ${this.scanUses} | Rotations: ${this.rotations}`;

      this.generateResultsText();
    }, 800);
  }

  generateResultsText() {
    const elapsed = Math.floor(
      (Date.now() - this.gameStartTime) / 1000
    );
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timeStr =
      minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    const accuracy =
      this.totalGuesses > 0
        ? Math.round(
            ((this.totalGuesses -
              this.incorrectGuesses) /
              this.totalGuesses) *
              100
          )
        : 0;

    let performance;
    if (this.incorrectGuesses === 0)
      performance = '🏆 PERFECT!';
    else if (this.incorrectGuesses <= 3)
      performance = '⭐ EXCELLENT!';
    else if (this.incorrectGuesses <= 6)
      performance = '👍 GREAT!';
    else if (this.incorrectGuesses <= 10)
      performance = '✓ GOOD!';
    else performance = '✓ COMPLETE!';

    let text = `${performance}\n\n`;
    text += `🧩 PUZZLE PAIRS RESULTS\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `Time: ${timeStr}\n`;
    text += `Total Guesses: ${this.totalGuesses}\n`;
    text += `Incorrect: ${this.incorrectGuesses}\n`;
    text += `Accuracy: ${accuracy}%\n`;
    text += `Scans Used: ${this.scanUses}\n`;
    text += `Rotations: ${this.rotations}\n\n`;

    text += `🎯 GAMEPLAY SUMMARY\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;

    let matchCount = 0;
    for (const event of this.gameHistory) {
      if (event.type === 'scan') {
        text += `🔍 Scanned ${event.revealed} tiles\n`;
      } else if (event.type === 'match') {
        if (event.correct) {
          matchCount++;
          text += `✓ Match ${matchCount}/12 found!\n`;
        } else {
          text += `✗ Incorrect guess\n`;
        }
      } else if (event.type === 'rotation') {
        text += `🔄 Grid rotated ${event.direction}\n`;
      }
    }

    text += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Share your score: ${this.incorrectGuesses} incorrect in ${timeStr}!`;

    const textarea = document.getElementById(
      'gameCompletionMessage'
    );
    textarea.value = text;
    textarea.style.display = 'block';
    textarea.classList.add('active');

    document.getElementById('copyButton').style.display =
      'inline-block';
    document.getElementById('shareButton').style.display =
      'inline-block';
  }

  copyResults() {
    const textarea = document.getElementById(
      'gameCompletionMessage'
    );
    textarea.select();
    document.execCommand('copy');
    this.updateStatus('Results copied to clipboard!');
  }

  shareResults() {
    const text = document.getElementById(
      'gameCompletionMessage'
    ).value;
    const tweetText = encodeURIComponent(text);
    window.open(
      `https://twitter.com/intent/tweet?text=${tweetText}`,
      '_blank'
    );
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    document.body.classList.toggle(
      'dark-mode',
      this.isDarkMode
    );
    document.getElementById('mode-toggle').textContent =
      this.isDarkMode ? '🌙' : '☀️';
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    document.getElementById('mute-button').textContent =
      this.isMuted ? '🔊 Unmute' : '🔇 Mute';
  }

  toggleInstructions() {
    const instructionsEl =
      document.getElementById('instructions');
    const toggleBtn = document.getElementById(
      'instructions-toggle'
    );
    const isHidden = instructionsEl.style.display === 'none';

    instructionsEl.style.display = isHidden
      ? 'block'
      : 'none';
    toggleBtn.textContent = isHidden
      ? 'Hide Instructions'
      : 'Show Instructions';
  }

  playSound(soundId) {
    if (this.isMuted) return;
    const audio = document.getElementById(soundId);
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  }
}

// Initialize game
const game = new PuzzlePairsGame();
