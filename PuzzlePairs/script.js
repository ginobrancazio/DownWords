// ===== CONSTANTS =====

const GRID_SIZE = 5;
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;
const TOTAL_PAIRS = 12; // plus 1 unpaired

// Base timings
const BASE_REVEAL_MS = 2000;
const CELL_FALL_DURATION = 900; // ms – tiles fall visibly
const ROTATION_DURATION = 900; // ms – grid spin duration

// Icon set: 13 distinct icons (12 pairs + 1 single)
const ICONS = [
  '🔴',
  '🔵',
  '🟢',
  '🟣',
  '🟠',
  '🟡',
  '🟥',
  '🟦',
  '🟩',
  '⭐',
  '❤️',
  '⚫',
  '💎'
];

// Polyomino shapes (offsets from top-left)
const SHAPES_POOL = [
  // 2-cells
  { id: 'domino-h', cells: [[0, 0], [0, 1]] },
  { id: 'domino-v', cells: [[0, 0], [1, 0]] },

  // 3-cells
  { id: 'tri-line-h', cells: [[0, 0], [0, 1], [0, 2]] },
  { id: 'tri-line-v', cells: [[0, 0], [1, 0], [2, 0]] },
  { id: 'tri-L', cells: [[0, 0], [1, 0], [1, 1]] },

  // 4-cells
  { id: 'tetra-square', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  { id: 'tetra-line-h', cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
  { id: 'tetra-line-v', cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { id: 'tetra-L', cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
  { id: 'tetra-Z', cells: [[0, 0], [0, 1], [1, 1], [1, 2]] }
];

// ===== RULEBREAKERS CONFIG =====
// Included: all suggested rulebreakers EXCEPT 4,13,14,15,16,17,19,20,21

const RULEBREAKERS = {
  // Original
  BLOCK_SCANNERS_2X2: {
    id: 'BLOCK_SCANNERS_2X2',
    name: 'Block Scanners',
    description: 'All scanner shapes are 2×2 blocks today.'
  },
  ROTATE_EVERY_THREE_GUESSES: {
    id: 'ROTATE_EVERY_THREE_GUESSES',
    name: 'Spin on Guesses',
    description: 'The grid rotates after every three guesses.'
  },

  // Scanner variants
  DOMINO_SCANNERS: {
    id: 'DOMINO_SCANNERS',
    name: 'Domino Scanners',
    description: 'All scanner shapes are 2-tile dominoes.'
  },
  NO_FREE_SCANNERS: {
    id: 'NO_FREE_SCANNERS',
    name: 'No Free Scanners',
    description:
      'You never gain extra scanners from matches or misses.'
  },

  // Rotation / gravity
  ROTATE_EVERY_MATCH: {
    id: 'ROTATE_EVERY_MATCH',
    name: 'Spin on Every Match',
    description: 'The grid rotates after every correct pair.'
  },
  ROTATE_ON_MISS: {
    id: 'ROTATE_ON_MISS',
    name: 'Spin on Misses',
    description: 'The grid rotates after every incorrect guess.'
  },
  FIXED_ROTATION_DIRECTION: {
    id: 'FIXED_ROTATION_DIRECTION',
    name: 'Fixed Spin',
    description: 'The grid always spins in the same direction today.'
  },
  SIDEWAYS_GRAVITY: {
    id: 'SIDEWAYS_GRAVITY',
    name: 'Sideways Gravity',
    description: 'Tiles fall to the left instead of down.'
  },

  // Time / visibility
  CHILL_SCANNERS: {
    id: 'CHILL_SCANNERS',
    name: 'Chill Scanners',
    description:
      'Scans last a bit longer, but you start with fewer scanners.'
  },
  DELAYED_FLIP: {
    id: 'DELAYED_FLIP',
    name: 'Delayed Flip',
    description: 'When guessing, both tiles flip at the same time.'
  }
};

const RULEBREAKER_IDS = Object.keys(RULEBREAKERS);

// ===== RULEBREAKERS RUNTIME STATE =====

let activeRulebreakers = new Set();

let ruleState;

function initDefaultRuleState() {
  ruleState = {
    revealMs: BASE_REVEAL_MS,
    startingScanners: 6,
    canGainScannersFromMatches: true,
    canGainScannersFromMisses: true,
    scannersEnabled: true,
    scannerShapeMode: 'default', // 'default' | 'block2x2' | 'domino2'
    rotateEveryThreeGuesses: false,
    rotateEveryMatch: false,
    rotateOnMiss: false,
    useBaseRotateEvery3Matches: true,
    fixedRotationDirection: null, // 'cw' | 'ccw'
    sidewaysGravity: false,
    delayedFlip: false
  };
}

// ===== GLOBAL GAME STATE =====

let gridElement;
let statusMessage;
let timerDisplay;
let pairsFoundEl;
let totalGuessesEl;
let incorrectGuessesEl;
let scanUsesEl;
let rotationsEl;

let resultTextArea;
let copyButton;
let shareButton;

let tileGrid = []; // [row][col] -> tile or null
let tiles = []; // flat list
let unpairedIconId = null;

let availableShapes = [];
let selectedShapeIndex = null;
let scanUses = 0;

let totalGuesses = 0;
let incorrectGuesses = 0;
let correctPairs = 0;
let rotations = 0;

let isGuessing = false;
let guessSelection = [];
let isBusy = false;
let gameStarted = false;
let gameFinished = false;

// Timer
let timerInterval = null;
let elapsedSeconds = 0;

// Dark mode / audio
let isDarkMode = false;
let isMuted = false;

// Audio
let clickSound;
let matchSound;
let failSound;
let finishSound;

// Dragging scanners
let draggingShape = null; // { index, ghost, offsetX, offsetY, lastValid }
let dragPreviewTiles = [];

// Rulebreaker RNG
let dailyRng = null;

// Completion overlay
let completionOverlay = null;

// ===== SEEDED RNG / DAILY SELECTION =====

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) | 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getDailySeed() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  const d = now.getUTCDate();
  const key = `${y}-${m}-${d}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function shuffleWithRng(array, rng) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function isCompatibleWithActive(id, set) {
  if (
    id === 'BLOCK_SCANNERS_2X2' &&
    set.has('DOMINO_SCANNERS')
  )
    return false;
  if (
    id === 'DOMINO_SCANNERS' &&
    set.has('BLOCK_SCANNERS_2X2')
  )
    return false;
  return true;
}

function pickDailyRulebreakers() {
  activeRulebreakers = new Set();

  const candidates = [...RULEBREAKER_IDS];
  shuffleWithRng(candidates, dailyRng);

  const targetCount = 2; // 2 rulebreakers per day

  for (const id of candidates) {
    if (activeRulebreakers.size >= targetCount) break;
    if (!isCompatibleWithActive(id, activeRulebreakers))
      continue;
    activeRulebreakers.add(id);
  }
}

function configureRuleStateFromActive() {
  initDefaultRuleState();
  const has = (id) => activeRulebreakers.has(id);

  if (has('BLOCK_SCANNERS_2X2')) {
    ruleState.scannerShapeMode = 'block2x2';
  }

  if (
    has('DOMINO_SCANNERS') &&
    ruleState.scannerShapeMode === 'default'
  ) {
    ruleState.scannerShapeMode = 'domino2';
  }

  if (has('NO_FREE_SCANNERS')) {
    ruleState.canGainScannersFromMatches = false;
    ruleState.canGainScannersFromMisses = false;
  }

  if (has('ROTATE_EVERY_THREE_GUESSES')) {
    ruleState.rotateEveryThreeGuesses = true;
    ruleState.useBaseRotateEvery3Matches = false;
  }

  if (has('ROTATE_EVERY_MATCH')) {
    ruleState.rotateEveryMatch = true;
    ruleState.useBaseRotateEvery3Matches = false;
  }

  if (has('ROTATE_ON_MISS')) {
    ruleState.rotateOnMiss = true;
  }

  if (has('FIXED_ROTATION_DIRECTION')) {
    ruleState.fixedRotationDirection =
      dailyRng() < 0.5 ? 'cw' : 'ccw';
  }

  if (has('SIDEWAYS_GRAVITY')) {
    ruleState.sidewaysGravity = true;
  }

  if (has('CHILL_SCANNERS')) {
    ruleState.revealMs = 3000;
    ruleState.startingScanners = Math.min(
      ruleState.startingScanners,
      3
    );
  }

  if (has('DELAYED_FLIP')) {
    ruleState.delayedFlip = true;
  }
}

function getRotationDirection() {
  if (ruleState.fixedRotationDirection) {
    return ruleState.fixedRotationDirection;
  }
  return Math.random() < 0.5 ? 'cw' : 'ccw';
}

// ===== INITIALISATION =====

document.addEventListener('DOMContentLoaded', () => {
  const seed = getDailySeed();
  dailyRng = mulberry32(seed);

  pickDailyRulebreakers();
  configureRuleStateFromActive();

  cacheDom();
  setupDarkMode();
  setupAudio();
  setupInstructionsToggle();
  setupButtons();
  setupRulebreakerDisplay();
  setupCompletionOverlay();
  newGame();
});

function cacheDom() {
  gridElement = document.getElementById('tile-grid');
  statusMessage = document.getElementById('status-message');
  timerDisplay = document.getElementById('timer');
  pairsFoundEl = document.getElementById('pairs-found');
  totalGuessesEl = document.getElementById('total-guesses');
  incorrectGuessesEl = document.getElementById(
    'incorrect-guesses'
  );
  scanUsesEl = document.getElementById('scan-uses');
  rotationsEl = document.getElementById('rotations');

  resultTextArea = document.getElementById(
    'gameCompletionMessage'
  );
  copyButton = document.getElementById('copyButton');
  shareButton = document.getElementById('shareButton');

  clickSound = document.getElementById('click-sound');
  matchSound = document.getElementById('match-sound');
  failSound = document.getElementById('fail-sound');
  finishSound = document.getElementById('finish-sound');
}

// ===== RULEBREAKER DISPLAY =====

function setupRulebreakerDisplay() {
  const banner = document.getElementById(
    'rulebreakers-banner'
  );
  const listEl = document.getElementById(
    'rulebreakers-list'
  );
  if (!listEl) return;

  listEl.innerHTML = '';

  if (activeRulebreakers.size === 0) {
    const li = document.createElement('li');
    li.textContent = 'None today – classic rules.';
    listEl.appendChild(li);
    if (banner) banner.style.display = 'block';
    return;
  }

  for (const id of activeRulebreakers) {
    const rb = RULEBREAKERS[id];
    const li = document.createElement('li');
    li.textContent = rb.description;
    listEl.appendChild(li);
  }

  if (banner) banner.style.display = 'block';
}

// ===== COMPLETION OVERLAY =====

function setupCompletionOverlay() {
  const overlay = document.getElementById(
    'completion-overlay'
  );
  const summary = document.getElementById(
    'completion-summary'
  );
  const btn = document.getElementById(
    'completion-new-game'
  );

  if (!overlay || !summary || !btn) {
    completionOverlay = null;
    return;
  }

  btn.addEventListener('click', () => {
    overlay.classList.remove('visible');
    newGame();
  });

  completionOverlay = { overlay, summary };
}

// ===== DARK MODE & AUDIO =====

function setupDarkMode() {
  const modeToggle = document.getElementById('mode-toggle');
  if (!modeToggle) return;

  const saved = localStorage.getItem('puzzlePairsDarkMode');

  if (saved === 'true') {
    document.body.classList.add('dark-mode');
    isDarkMode = true;
    modeToggle.textContent = '🌙';
  } else {
    modeToggle.textContent = '☀️';
  }

  modeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle(
      'dark-mode',
      isDarkMode
    );
    modeToggle.textContent = isDarkMode ? '🌙' : '☀️';
    localStorage.setItem(
      'puzzlePairsDarkMode',
      isDarkMode ? 'true' : 'false'
    );
  });
}

function setupAudio() {
  const muteButton = document.getElementById('mute-button');
  if (!muteButton) return;

  muteButton.textContent = '🔇 Mute';

  muteButton.addEventListener('click', () => {
    isMuted = !isMuted;
    muteButton.textContent = isMuted
      ? '🔊 Unmute'
      : '🔇 Mute';
  });
}

// ===== INSTRUCTIONS TOGGLE =====

function setupInstructionsToggle() {
  const toggle = document.getElementById(
    'instructions-toggle'
  );
  const instructions = document.getElementById(
    'instructions'
  );
  if (!toggle || !instructions) return;

  toggle.addEventListener('click', () => {
    const visible =
      instructions.style.display !== 'none';
    instructions.style.display = visible
      ? 'none'
      : 'block';
    toggle.textContent = visible
      ? 'Show Instructions'
      : 'Hide Instructions';
  });
}

// ===== BUTTONS & CONTROLS =====

function setupButtons() {
  const startOverlay =
    document.getElementById('start-overlay');
  const startBtn =
    document.getElementById('start-game-button');
  const guessBtn =
    document.getElementById('guess-button');
  const newGameBtn =
    document.getElementById('new-game-button');

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (gameStarted) return;
      gameStarted = true;
      if (startOverlay) {
        startOverlay.style.display = 'none';
      }
      startTimer();

      if (ruleState.scannersEnabled) {
        setStatus(
          'Drag a scanner onto the grid or click "Make a Guess" to begin.'
        );
      } else {
        setStatus(
          'Scanners are disabled today. Click "Make a Guess" to begin.'
        );
      }
    });
  }

  if (guessBtn) {
    guessBtn.addEventListener('click', () => {
      if (!gameStarted || gameFinished || isBusy) return;
      if (isGuessing) return;
      isGuessing = true;
      guessSelection = [];
      setStatus('Select two tiles to guess a pair.');
    });
  }

  if (newGameBtn) {
    newGameBtn.addEventListener('click', () => {
      newGame();
    });
  }

  if (copyButton) {
    copyButton.addEventListener('click', () => {
      const text = resultTextArea.value;
      if (navigator.clipboard?.writeText) {
        navigator.clipboard
          .writeText(text)
          .then(() =>
            alert('Copied to clipboard!')
          )
          .catch(() => fallbackCopy(text));
      } else {
        fallbackCopy(text);
      }
    });
  }

  if (shareButton) {
    shareButton.addEventListener('click', () => {
      const text = resultTextArea.value;
      const url =
        'https://twitter.com/intent/tweet?text=' +
        encodeURIComponent(text);
      window.open(url, '_blank');
    });
  }
}

function fallbackCopy(text) {
  if (!resultTextArea) return;
  resultTextArea.style.display = 'block';
  resultTextArea.focus();
  resultTextArea.select();
  document.execCommand('copy');
  alert('Copied to clipboard!');
}

// ===== GAME SETUP / RESET =====

function newGame() {
  stopTimer();
  elapsedSeconds = 0;
  if (timerDisplay) {
    timerDisplay.textContent = 'Time: 0s';
  }

  tiles = [];
  tileGrid = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(null)
  );
  availableShapes = [];
  selectedShapeIndex = null;
  scanUses = 0;
  totalGuesses = 0;
  incorrectGuesses = 0;
  correctPairs = 0;
  rotations = 0;
  isGuessing = false;
  guessSelection = [];
  isBusy = false;
  gameStarted = false;
  gameFinished = false;

  updateStats();

  buildTiles();
  renderTiles();
  fillInitialShapes();
  renderShapes();

  const startOverlay =
    document.getElementById('start-overlay');
  if (startOverlay) {
    startOverlay.style.display = 'flex';
  }

  if (resultTextArea) {
    resultTextArea.style.display = 'none';
    resultTextArea.classList.remove('active');
  }
  if (copyButton) copyButton.style.display = 'none';
  if (shareButton) shareButton.style.display = 'none';

  if (completionOverlay) {
    completionOverlay.overlay.classList.remove(
      'visible'
    );
  }

  if (ruleState.scannersEnabled) {
    setStatus(
      'Press "Start Game" to begin. Drag a scanner or make guesses.'
    );
  } else {
    setStatus(
      'Press "Start Game" to begin. Scanners are disabled today.'
    );
  }
}

function buildTiles() {
  const pairIcons = ICONS.slice(0, TOTAL_PAIRS);
  unpairedIconId = TOTAL_PAIRS;

  const assignments = [];
  pairIcons.forEach((_, idx) => {
    assignments.push(idx, idx);
  });
  assignments.push(unpairedIconId);

  shuffleArray(assignments);

  for (let i = 0; i < TOTAL_TILES; i++) {
    const row = Math.floor(i / GRID_SIZE);
    const col = i % GRID_SIZE;
    const iconId = assignments[i];

    const tile = {
      id: i,
      row,
      col,
      iconId,
      icon: ICONS[iconId],
      matched: false,
      revealed: false,
      element: null
    };

    tiles.push(tile);
    tileGrid[row][col] = tile;
  }
}

function renderTiles() {
  if (!gridElement) return;
  gridElement.innerHTML = '';

  tiles.forEach((tile) => {
    const div = document.createElement('div');
    div.className = 'tile hidden';
    div.dataset.id = tile.id;
    div.dataset.row = tile.row;
    div.dataset.col = tile.col;
    div.style.gridRowStart = tile.row + 1;
    div.style.gridColumnStart = tile.col + 1;

    const span = document.createElement('span');
    span.className = 'icon';
    span.textContent = tile.icon;
    div.appendChild(span);

    div.addEventListener('click', () =>
      handleTileClick(tile)
    );

    tile.element = div;
    gridElement.appendChild(div);
  });
}

// ===== SHAPES =====

function getShapesPoolForToday() {
  if (ruleState.scannerShapeMode === 'block2x2') {
    return SHAPES_POOL.filter(
      (s) => s.id === 'tetra-square'
    );
  }
  if (ruleState.scannerShapeMode === 'domino2') {
    return SHAPES_POOL.filter(
      (s) =>
        s.id === 'domino-h' || s.id === 'domino-v'
    );
  }
  return SHAPES_POOL;
}

function createRandomShapeFromPool(pool) {
  const base =
    pool[Math.floor(Math.random() * pool.length)];
  return {
    id:
      base.id +
      '-' +
      Math.random().toString(36).slice(2, 7),
    cells: base.cells.map(([r, c]) => [r, c])
  };
}

function fillInitialShapes() {
  availableShapes = [];
  if (!ruleState.scannersEnabled) return;

  const pool = getShapesPoolForToday();
  const count = Math.max(0, ruleState.startingScanners);

  for (let i = 0; i < count; i++) {
    availableShapes.push(
      createRandomShapeFromPool(pool)
    );
  }
}

function renderShapes() {
  const container =
    document.getElementById('shape-list');
  if (!container) return;

  container.innerHTML = '';
  selectedShapeIndex = null;

  if (!ruleState.scannersEnabled) {
    const msg = document.createElement('div');
    msg.style.fontSize = '14px';
    msg.style.opacity = '0.8';
    msg.textContent =
      'Scanners are disabled today – no shapes available.';
    container.appendChild(msg);
    return;
  }

  if (availableShapes.length === 0) {
    const msg = document.createElement('div');
    msg.style.fontSize = '14px';
    msg.style.opacity = '0.8';
    msg.textContent =
      'No scanners available right now. Earn more by playing.';
    container.appendChild(msg);
    return;
  }

  availableShapes.forEach((shape, index) => {
    const poly = document.createElement('div');
    poly.className = 'polyomino';
    poly.dataset.index = index;

    const { rows, cols } = shapeBounds(shape);
    const grid = document.createElement('div');
    grid.className = 'polyomino-grid';
    grid.style.gridTemplateRows = `repeat(${rows}, 12px)`;
    grid.style.gridTemplateColumns = `repeat(${cols}, 12px)`;

    const filled = new Set(
      shape.cells.map(([r, c]) => `${r}:${c}`)
    );

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement('div');
        cell.className = 'poly-cell';
        if (filled.has(`${r}:${c}`)) {
          cell.classList.add('filled');
        }
        grid.appendChild(cell);
      }
    }

    poly.appendChild(grid);

    poly.addEventListener('click', () => {
      if (
        !gameStarted ||
        gameFinished ||
        isBusy ||
        !ruleState.scannersEnabled
      )
        return;
      selectedShapeIndex = index;
      document
        .querySelectorAll('.polyomino')
        .forEach((p) =>
          p.classList.remove('selected')
        );
      poly.classList.add('selected');
      setStatus(
        'Click a tile to place the top-left of this scanner, or drag it onto the grid.'
      );
    });

    poly.addEventListener('mousedown', (e) =>
      startShapeDrag(e)
    );

    container.appendChild(poly);
  });
}

// ===== TILE INTERACTION =====

function handleTileClick(tile) {
  if (!gameStarted || gameFinished || isBusy) return;
  if (!tile || tile.matched) return;

  if (!isMuted && clickSound) {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
  }

  if (!ruleState.scannersEnabled && !isGuessing) {
    setStatus(
      'Scanners are disabled today. Use "Make a Guess" to play.'
    );
    return;
  }

  if (
    selectedShapeIndex !== null &&
    !isGuessing &&
    ruleState.scannersEnabled
  ) {
    placeShapeAt(selectedShapeIndex, tile.row, tile.col);
    return;
  }

  if (isGuessing) {
    handleGuessClick(tile);
    return;
  }

  setStatus(
    'Drag a scanner onto the grid, select a shape then click, or click "Make a Guess".'
  );
}

function handleGuessClick(tile) {
  if (tile.revealed) return;

  if (!ruleState.delayedFlip) {
    revealTile(tile);
    guessSelection.push(tile);

    if (guessSelection.length === 1) {
      setStatus('Now select a second tile.');
      return;
    }

    if (guessSelection.length === 2) {
      isBusy = true;
      const [t1, t2] = guessSelection;

      if (t1.id === t2.id) {
        guessSelection = [t1];
        isBusy = false;
        return;
      }

      const isMatch = t1.iconId === t2.iconId;
      if (isMatch) {
        handleMatch(t1, t2);
      } else {
        handleFailure(t1, t2);
      }
    }
  } else {
    // DELAYED_FLIP: first tile not revealed until second chosen
    if (guessSelection.length === 0) {
      guessSelection.push(tile);
      tile.element.classList.add('pending-guess');
      setStatus('Now select a second tile.');
      return;
    }

    if (guessSelection.length === 1) {
      const t1 = guessSelection[0];
      const t2 = tile;
      if (t1.id === t2.id) return;

      isBusy = true;
      t1.element.classList.remove('pending-guess');
      revealTile(t1);
      revealTile(t2);
      guessSelection.push(t2);

      const isMatch = t1.iconId === t2.iconId;
      if (isMatch) {
        handleMatch(t1, t2);
      } else {
        handleFailure(t1, t2);
      }
    }
  }
}

// ===== SHAPE PLACEMENT / SCANNING =====

function placeShapeAt(shapeIndex, baseRow, baseCol) {
  const shape = availableShapes[shapeIndex];
  if (!shape || !ruleState.scannersEnabled) return;

  const targetCells = [];
  for (const [dr, dc] of shape.cells) {
    const r = baseRow + dr;
    const c = baseCol + dc;
    if (
      r < 0 ||
      r >= GRID_SIZE ||
      c < 0 ||
      c >= GRID_SIZE
    ) {
      gridElement.classList.add('shake');
      setTimeout(
        () => gridElement.classList.remove('shake'),
        300
      );
      setStatus('That scanner does not fit there.');
      return;
    }
    targetCells.push([r, c]);
  }

  isBusy = true;
  scanUses++;
  updateStats();

  const affectedTiles = [];
  for (const [r, c] of targetCells) {
    const tile = tileGrid[r][c];
    if (tile && !tile.matched) {
      affectedTiles.push(tile);
      revealTile(tile);
    }
  }

  availableShapes.splice(shapeIndex, 1);
  renderShapes();
  selectedShapeIndex = null;

  setStatus(
    'Scanner placed. Tiles will hide again in a moment.'
  );

  setTimeout(() => {
    affectedTiles.forEach((tile) => {
      if (!tile.matched) hideTile(tile);
    });
    isBusy = false;
    setStatus(
      'You can place another scanner or click "Make a Guess".'
    );
  }, ruleState.revealMs);
}

// ===== DRAGGING SCANNERS =====

function startShapeDrag(e) {
  if (
    !gameStarted ||
    gameFinished ||
    isBusy ||
    !ruleState.scannersEnabled
  )
    return;
  e.preventDefault();

  const target = e.currentTarget;
  const index = Number(target.dataset.index);
  if (Number.isNaN(index)) return;

  const rect = target.getBoundingClientRect();
  const offsetX = e.clientX - rect.left;
  const offsetY = e.clientY - rect.top;

  const ghost = target.cloneNode(true);
  ghost.style.position = 'fixed';
  ghost.style.left = `${e.clientX - offsetX}px`;
  ghost.style.top = `${e.clientY - offsetY}px`;
  ghost.style.pointerEvents = 'none';
  ghost.style.opacity = '0.85';
  ghost.style.zIndex = '9999';
  ghost.classList.add('drag-ghost');

  document.body.appendChild(ghost);

  draggingShape = {
    index,
    ghost,
    offsetX,
    offsetY,
    lastValid: null
  };

  document.addEventListener('mousemove', onShapeDragMove);
  document.addEventListener('mouseup', onShapeDragEnd);
}

function onShapeDragMove(e) {
  if (!draggingShape) return;

  const { ghost, offsetX, offsetY } = draggingShape;
  ghost.style.left = `${e.clientX - offsetX}px`;
  ghost.style.top = `${e.clientY - offsetY}px`;

  const gridRect = gridElement.getBoundingClientRect();
  const x = e.clientX;
  const y = e.clientY;

  if (
    x < gridRect.left ||
    x > gridRect.right ||
    y < gridRect.top ||
    y > gridRect.bottom
  ) {
    clearDragPreview();
    draggingShape.lastValid = null;
    ghost.style.filter = 'grayscale(0.7)';
    return;
  }

  const cellWidth = gridRect.width / GRID_SIZE;
  const cellHeight = gridRect.height / GRID_SIZE;

  const col = Math.floor((x - gridRect.left) / cellWidth);
  const row = Math.floor((y - gridRect.top) / cellHeight);

  updateDragPreview(draggingShape.index, row, col);
}

function onShapeDragEnd() {
  if (!draggingShape) return;

  const { index, lastValid, ghost } = draggingShape;

  clearDragPreview();

  document.removeEventListener(
    'mousemove',
    onShapeDragMove
  );
  document.removeEventListener(
    'mouseup',
    onShapeDragEnd
  );
  ghost.remove();

  draggingShape = null;

  if (lastValid) {
    placeShapeAt(index, lastValid.row, lastValid.col);
  }
}

function updateDragPreview(shapeIndex, baseRow, baseCol) {
  clearDragPreview();

  const shape = availableShapes[shapeIndex];
  if (!shape || !draggingShape) return;

  const targetCells = [];
  for (const [dr, dc] of shape.cells) {
    const r = baseRow + dr;
    const c = baseCol + dc;
    if (
      r < 0 ||
      r >= GRID_SIZE ||
      c < 0 ||
      c >= GRID_SIZE
    ) {
      draggingShape.lastValid = null;
      draggingShape.ghost.style.filter =
        'grayscale(0.7)';
      return;
    }
    targetCells.push([r, c]);
  }

  draggingShape.ghost.style.filter = 'none';
  const previewEls = [];

  for (const [r, c] of targetCells) {
    const tile = tileGrid[r][c];
    if (tile && !tile.matched) {
      tile.element.classList.add('preview');
      previewEls.push(tile.element);
    }
  }

  dragPreviewTiles = previewEls;
  draggingShape.lastValid = { row: baseRow, col: baseCol };
}

function clearDragPreview() {
  dragPreviewTiles.forEach((el) =>
    el.classList.remove('preview')
  );
  dragPreviewTiles = [];
}

// ===== MATCH / MISMATCH LOGIC =====

function handleMatch(t1, t2) {
  totalGuesses++;
  correctPairs++;
  updateStats();

  if (!isMuted && matchSound) {
    matchSound.currentTime = 0;
    matchSound.play().catch(() => {});
  }

  t1.matched = true;
  t2.matched = true;

  tileGrid[t1.row][t1.col] = null;
  tileGrid[t2.row][t2.col] = null;

  t1.element.classList.remove('hidden', 'revealed');
  t2.element.classList.remove('hidden', 'revealed');
  t1.element.classList.add('matched');
  t2.element.classList.add('matched');

  applyGravity();

  if (ruleState.canGainScannersFromMatches) {
    maybeAddShapeFromMatch();
  }

  setStatus('Match! You found a pair.');

  if (correctPairs === TOTAL_PAIRS) {
    handleGameCompletion();
    isBusy = false;
    isGuessing = false;
    guessSelection = [];
    return;
  }

  maybeRotateAfterGuess(true);

  isBusy = false;
  isGuessing = false;
  guessSelection = [];
}

function handleFailure(t1, t2) {
  totalGuesses++;
  incorrectGuesses++;
  updateStats();

  if (!isMuted && failSound) {
    failSound.currentTime = 0;
    failSound.play().catch(() => {});
  }

  setStatus('No match. The tiles will flip back.');

  setTimeout(() => {
    hideTile(t1);
    hideTile(t2);
    isBusy = false;
    isGuessing = false;
    guessSelection = [];

    if (
      ruleState.canGainScannersFromMisses &&
      incorrectGuesses > 0 &&
      incorrectGuesses % 3 === 0
    ) {
      maybeAddShapeFromMiss();
    }

    maybeRotateAfterGuess(false);
  }, 700);
}

function maybeRotateAfterGuess(isMatch) {
  if (gameFinished) return;

  const dir = getRotationDirection();

  if (ruleState.rotateEveryMatch && isMatch) {
    rotateGrid(dir);
    return;
  }

  if (ruleState.rotateOnMiss && !isMatch) {
    rotateGrid(dir);
    return;
  }

  if (
    ruleState.rotateEveryThreeGuesses &&
    totalGuesses > 0 &&
    totalGuesses % 3 === 0
  ) {
    rotateGrid(dir);
    return;
  }

  if (
    ruleState.useBaseRotateEvery3Matches &&
    isMatch &&
    correctPairs < TOTAL_PAIRS &&
    correctPairs % 3 === 0
  ) {
    rotateGrid(dir);
  }
}

function maybeAddShapeFromMatch() {
  if (!ruleState.scannersEnabled) return;
  if (availableShapes.length >= 6) return;
  const pool = getShapesPoolForToday();
  availableShapes.push(
    createRandomShapeFromPool(pool)
  );
  renderShapes();
}

function maybeAddShapeFromMiss() {
  if (!ruleState.scannersEnabled) return;
  if (availableShapes.length >= 6) return;
  const pool = getShapesPoolForToday();
  availableShapes.push(
    createRandomShapeFromPool(pool)
  );
  renderShapes();
}
// ===== GRAVITY (VERTICAL OR SIDEWAYS) =====

function applyGravity() {
  if (ruleState.sidewaysGravity) {
    applyGravitySideways();
  } else {
    applyGravityVertical();
  }
}

function applyGravityVertical() {
  const N = GRID_SIZE;
  const newGrid = Array.from({ length: N }, () =>
    Array(N).fill(null)
  );

  const gridStyles = window.getComputedStyle(gridElement);
  const rowGap = parseFloat(gridStyles.rowGap) || 0;

  const sampleTile = tiles.find((t) => t && t.element);
  const tileRect = sampleTile
    ? sampleTile.element.getBoundingClientRect()
    : { height: 64 };
  const distancePerRow = tileRect.height + rowGap;

  const movingTiles = [];

  for (let col = 0; col < N; col++) {
    let destRow = N - 1;

    for (let row = N - 1; row >= 0; row--) {
      const tile = tileGrid[row][col];
      if (!tile) continue;

      const fromRow = row;
      const toRow = destRow;

      newGrid[toRow][col] = tile;
      tile.row = toRow;
      tile.col = col;

      if (fromRow !== toRow) {
        movingTiles.push({
          tile,
          fromRow,
          toRow,
          col
        });
      } else {
        tile.element.style.gridRowStart = toRow + 1;
        tile.element.style.gridColumnStart = col + 1;
      }

      destRow--;
    }
  }

  tileGrid = newGrid;

  movingTiles.forEach(({ tile, fromRow, toRow, col }) => {
    const deltaRows = fromRow - toRow; // >0 when falling down
    const offset = deltaRows * distancePerRow; // start above

    const el = tile.element;
    el.style.gridRowStart = toRow + 1;
    el.style.gridColumnStart = col + 1;

    el.style.transition = 'none';
    el.style.transform = `translateY(${offset}px)`;

    void el.offsetHeight;

    const delay = Math.min(
      200,
      Math.abs(deltaRows) * 80
    );

    el.style.transition = `transform ${
      CELL_FALL_DURATION / 1000
    }s cubic-bezier(0.25, 0.8, 0.25, 1) ${delay}ms`;

    requestAnimationFrame(() => {
      el.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      el.style.transition = '';
      el.style.transform = '';
    }, CELL_FALL_DURATION + delay + 50);
  });
}

function applyGravitySideways() {
  const N = GRID_SIZE;
  const newGrid = Array.from({ length: N }, () =>
    Array(N).fill(null)
  );

  const gridStyles = window.getComputedStyle(gridElement);
  const colGap =
    parseFloat(gridStyles.columnGap) || 0;

  const sampleTile = tiles.find((t) => t && t.element);
  const tileRect = sampleTile
    ? sampleTile.element.getBoundingClientRect()
    : { width: 64 };
  const distancePerCol = tileRect.width + colGap;

  const movingTiles = [];

  for (let row = 0; row < N; row++) {
    let destCol = 0;

    for (let col = 0; col < N; col++) {
      const tile = tileGrid[row][col];
      if (!tile) continue;

      const fromCol = col;
      const toCol = destCol;

      newGrid[row][toCol] = tile;
      tile.row = row;
      tile.col = toCol;

      if (fromCol !== toCol) {
        movingTiles.push({
          tile,
          fromCol,
          toCol,
          row
        });
      } else {
        tile.element.style.gridRowStart = row + 1;
        tile.element.style.gridColumnStart =
          toCol + 1;
      }

      destCol++;
    }
  }

  tileGrid = newGrid;

  movingTiles.forEach(({ tile, fromCol, toCol, row }) => {
    const deltaCols = fromCol - toCol; // >0 when moving left
    const offset = deltaCols * distancePerCol; // start right

    const el = tile.element;
    el.style.gridRowStart = row + 1;
    el.style.gridColumnStart = toCol + 1;

    el.style.transition = 'none';
    el.style.transform = `translateX(${offset}px)`;

    void el.offsetHeight;

    const delay = Math.min(
      200,
      Math.abs(deltaCols) * 80
    );

    el.style.transition = `transform ${
      CELL_FALL_DURATION / 1000
    }s cubic-bezier(0.25, 0.8, 0.25, 1) ${delay}ms`;

    requestAnimationFrame(() => {
      el.style.transform = 'translateX(0)';
    });

    setTimeout(() => {
      el.style.transition = '';
      el.style.transform = '';
    }, CELL_FALL_DURATION + delay + 50);
  });
}

// ===== ROTATION (SLOWER, THEN FALL) =====

function rotateGrid(direction) {
  if (gameFinished) return;

  isBusy = true;
  const className =
    direction === 'cw' ? 'rotate-cw' : 'rotate-ccw';

  gridElement.classList.add(className);

  setTimeout(() => {
    performRotation(direction);
    gridElement.classList.remove(
      'rotate-cw',
      'rotate-ccw'
    );

    const dirText =
      direction === 'cw'
        ? 'clockwise'
        : 'anticlockwise';
    setStatus(
      `The grid rotated ${dirText}! Tiles fell into new positions.`
    );
    isBusy = false;
  }, ROTATION_DURATION + 50);
}

function performRotation(direction) {
  const N = GRID_SIZE;
  const newGrid = Array.from({ length: N }, () =>
    Array(N).fill(null)
  );

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const tile = tileGrid[r][c];
      if (!tile) continue;

      let newR, newC;
      if (direction === 'cw') {
        newR = c;
        newC = N - 1 - r;
      } else {
        newR = N - 1 - c;
        newC = r;
      }
      tile.row = newR;
      tile.col = newC;
      newGrid[newR][newC] = tile;

      tile.element.style.gridRowStart = newR + 1;
      tile.element.style.gridColumnStart = newC + 1;
    }
  }

  tileGrid = newGrid;

  applyGravity();
  rotations++;
  updateStats();
}

// ===== TILE VISUAL HELPERS =====

function revealTile(tile) {
  if (!tile || tile.matched) return;
  tile.revealed = true;
  tile.element.classList.remove('hidden');
  tile.element.classList.add('revealed');
}

function hideTile(tile) {
  if (!tile || tile.matched) return;
  tile.revealed = false;
  tile.element.classList.remove('revealed');
  tile.element.classList.add('hidden');
}

// ===== SHAPE HELPERS =====

function shapeBounds(shape) {
  let maxR = 0;
  let maxC = 0;
  for (const [r, c] of shape.cells) {
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  }
  return { rows: maxR + 1, cols: maxC + 1 };
}

// ===== TIMER & STATS =====

function startTimer() {
  timerInterval = setInterval(() => {
    elapsedSeconds++;
    if (timerDisplay) {
      timerDisplay.textContent = `Time: ${formatTime(
        elapsedSeconds
      )}`;
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
}

function updateStats() {
  if (pairsFoundEl)
    pairsFoundEl.textContent = correctPairs;
  if (totalGuessesEl)
    totalGuessesEl.textContent = totalGuesses;
  if (incorrectGuessesEl)
    incorrectGuessesEl.textContent = incorrectGuesses;
  if (scanUsesEl)
    scanUsesEl.textContent = scanUses;
  if (rotationsEl)
    rotationsEl.textContent = rotations;
}

function setStatus(message) {
  if (!statusMessage) return;
  statusMessage.textContent = message;
}

// ===== COMPLETION & SHARE TEXT =====

function handleGameCompletion() {
  gameFinished = true;
  stopTimer();

  if (!isMuted && finishSound) {
    finishSound.currentTime = 0;
    finishSound.play().catch(() => {});
  }

  const message = buildCompletionMessage();
  if (resultTextArea) {
    resultTextArea.value = message;
    showCompletionMessage();
  }

  if (copyButton)
    copyButton.style.display = 'inline-block';
  if (shareButton)
    shareButton.style.display = 'inline-block';

  setStatus('All 12 pairs found! Puzzle complete.');

  if (completionOverlay) {
    const { overlay, summary } = completionOverlay;
    summary.textContent = `Time: ${formatTime(
      elapsedSeconds
    )} • Guesses: ${totalGuesses} • Misses: ${incorrectGuesses}`;
    overlay.classList.add('visible');
  }

  if (gridElement) {
    gridElement.classList.add('complete-flash');
    setTimeout(
      () =>
        gridElement.classList.remove('complete-flash'),
      900
    );
  }
}

function buildCompletionMessage() {
  let msg = '';
  msg += `Puzzle Pairs – 12/12 pairs in ${formatTime(
    elapsedSeconds
  )}\n`;
  msg += `Guesses: ${totalGuesses} (misses: ${incorrectGuesses})\n`;
  msg += `Scans used: ${scanUses}, Rotations: ${rotations}\n`;

  const best = 12;
  const worst = 36;
  const clamped = Math.max(
    best,
    Math.min(totalGuesses || best, worst)
  );
  const greenBlocks = Math.max(
    1,
    Math.round(
      ((worst - clamped) / (worst - best)) * 8
    )
  );
  const redBlocks = 8 - greenBlocks;
  const efficiencyBar =
    '🟩'.repeat(greenBlocks) +
    '🟥'.repeat(redBlocks);

  msg += `\n${efficiencyBar}  Efficiency\n`;

  if (scanUses === 0) {
    msg += `\n🧠 No scanners used – pure memory!\n`;
  } else {
    const scanIcons = '🔍'.repeat(
      Math.min(scanUses, 10)
    );
    msg += `\n${scanIcons}  Scanner uses: ${scanUses}\n`;
  }

  if (incorrectGuesses === 0) {
    msg += `\n✨ Perfect run – no misses!\n`;
  } else if (incorrectGuesses <= 6) {
    msg += `\n👍 Solid memory – only ${incorrectGuesses} miss${
      incorrectGuesses === 1 ? '' : 'es'
    }.\n`;
  } else {
    msg += `\n😅 Took a few tries – ${incorrectGuesses} misses.\n`;
  }

  msg += `\nhttp://www.DownWordsGame.com`;
  msg += `\n#PuzzlePairs`;

  return msg;
}

function showCompletionMessage() {
  if (!resultTextArea) return;
  resultTextArea.style.display = 'block';
  setTimeout(() => {
    resultTextArea.classList.add('active');
  }, 10);
}

// ===== UTILITIES =====

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(
      Math.random() * (i + 1)
    );
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
