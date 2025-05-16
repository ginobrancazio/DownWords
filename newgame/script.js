// ===== DOM ELEMENT REFERENCES =====
const grid = document.getElementById('letter-grid');
const currentWordDisplay = document.getElementById('current-word');
const foundWordsList = document.getElementById('found-words-list');
const timerDisplay = document.getElementById('timer');
const scoreDisplay = document.getElementById('score');
const submitButton = document.getElementById('submit-word');
const clearButton = document.getElementById('clear-selection');
const startButton = document.getElementById('start-game');
const newGameButton = document.getElementById('new-game');
const modeToggle = document.getElementById('mode-toggle');
const muteButton = document.getElementById('mute-button');
const gameResults = document.getElementById('game-results');
const finalScoreDisplay = document.getElementById('final-score');
const wordsFoundDisplay = document.getElementById('words-found');
const playAgainButton = document.getElementById('play-again');

// ===== AUDIO ELEMENTS =====
const letterClickSound = document.getElementById('click-sound');
const matchSound = document.getElementById('match-sound');
const finishSound = document.getElementById('finish-sound');
const errorSound = document.getElementById('error-sound');

// ===== GAME STATE VARIABLES =====
let selectedLetters = [];    // Currently selected letters
let foundWords = [];         // Words successfully found
let usedCells = new Set();   // Cells that have been used in found words
let score = 0;               // Current score
let timeLeft = 120;          // Time left in seconds (2 minutes)
let timer;                   // Timer reference
let dictionary = new Set();  // Dictionary for word validation
let isMuted = false;         // Audio state
let isDarkMode = false;      // Dark mode state
let isGameActive = false;    // Whether the game is currently active
let gridLetters = [];        // 2D array of letters in the grid

// ===== CONSTANTS =====
const GRID_SIZE = 8;
const MIN_WORD_LENGTH = 3;
const GAME_TIME = 120; // 2 minutes in seconds
const VOWELS = ['A', 'E', 'I', 'O', 'U'];
const COMMON_CONSONANTS = ['B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'V', 'W'];
const RARE_CONSONANTS = ['Q', 'X', 'Y', 'Z'];

// Letter frequency distribution (roughly based on English language frequency)
const LETTER_DISTRIBUTION = [
  // Vowels (more common)
  ...Array(9).fill('A'),
  ...Array(12).fill('E'),
  ...Array(9).fill('I'),
  ...Array(8).fill('O'),
  ...Array(4).fill('U'),
  // Common consonants
  ...Array(2).fill('B'),
  ...Array(3).fill('C'),
  ...Array(4).fill('D'),
  ...Array(2).fill('F'),
  ...Array(3).fill('G'),
  ...Array(2).fill('H'),
  ...Array(1).fill('J'),
  ...Array(1).fill('K'),
  ...Array(4).fill('L'),
  ...Array(2).fill('M'),
  ...Array(6).fill('N'),
  ...Array(2).fill('P'),
  ...Array(1).fill('Q'),
  ...Array(6).fill('R'),
  ...Array(6).fill('S'),
  ...Array(6).fill('T'),
  ...Array(2).fill('V'),
  ...Array(2).fill('W'),
  ...Array(1).fill('X'),
  ...Array(2).fill('Y'),
  ...Array(1).fill('Z')
];

// ===== INITIALIZATION =====
// Load dictionary when the page loads
loadDictionary();

// Set up event listeners
setupEventListeners();

// Check for saved dark mode preference
if (localStorage.getItem('darkMode') === 'true') {
  enableDarkMode();
}

// ===== DICTIONARY LOADING =====
/**
 * Loads the dictionary file for word validation
 */
function loadDictionary() {
  fetch('dictionary.txt')
    .then(response => response.text())
    .then(text => {
      // Split the text file by newlines and add each word to the Set
      const words = text.split('\n').map(word => word.trim().toUpperCase());
      dictionary = new Set(words);
      console.log('Dictionary loaded with', dictionary.size, 'words');
    })
    .catch(error => {
      console.error('Error loading dictionary:', error);
      // Fallback to a small dictionary if the file can't be loaded
      const fallbackDictionary = [
        "CAT", "DOG", "BIRD", "FISH", "LION", "TIGER", "BEAR", "WOLF", "FOX", "DEER",
        "RED", "BLUE", "GREEN", "YELLOW", "BLACK", "WHITE", "PURPLE", "ORANGE", "BROWN",
        "RUN", "JUMP", "WALK", "SWIM", "FLY", "CLIMB", "DANCE", "SING", "PLAY", "READ",
        "BOOK", "PAGE", "WORD", "LETTER", "STORY", "NOVEL", "POEM", "WRITE", "AUTHOR",
        "FOOD", "MEAL", "LUNCH", "DINNER", "SNACK", "FRUIT", "APPLE", "BANANA", "GRAPE",
        "WATER", "RIVER", "LAKE", "OCEAN", "STREAM", "RAIN", "SNOW", "CLOUD", "STORM",
        "TREE", "FLOWER", "GRASS", "PLANT", "GARDEN", "FOREST", "JUNGLE", "MOUNTAIN",
        "HOUSE", "ROOM", "DOOR", "WINDOW", "FLOOR", "WALL", "ROOF", "TABLE", "CHAIR",
        "SCHOOL", "TEACHER", "STUDENT", "CLASS", "LEARN", "STUDY", "TEST", "GRADE",
        "FRIEND", "FAMILY", "PARENT", "CHILD", "MOTHER", "FATHER", "SISTER", "BROTHER"
      ];
      dictionary = new Set(fallbackDictionary);
      console.log('Using fallback dictionary with', dictionary.size, 'words');
    });
}

// ===== EVENT LISTENERS =====
/**
 * Sets up all event listeners for the game
 */
function setupEventListeners() {
  // Start game button
  startButton.addEventListener('click', startGame);
  
  // New game button
  newGameButton.addEventListener('click', resetGame);
  
  // Play again button
  playAgainButton.addEventListener('click', () => {
    gameResults.classList.add('hidden');
    resetGame();
  });
  
  // Submit word button
  submitButton.addEventListener('click', submitWord);
  
  // Clear selection button
  clearButton.addEventListener('click', clearSelection);
  
  // Dark mode toggle
  modeToggle.addEventListener('click', toggleDarkMode);
  
  // Mute button
  muteButton.addEventListener('click', toggleMute);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyPress);
}

/**
 * Handles keyboard shortcuts
 * @param {KeyboardEvent} event - The keyboard event
 */
function handleKeyPress(event) {
  if (!isGameActive) return;
  
  if (event.key === 'Enter') {
    submitWord();
  } else if (event.key === 'Escape') {
    clearSelection();
  }
}

// ===== GAME INITIALIZATION =====
/**
 * Starts a new game
 */
function startGame() {
  // Reset game state
  selectedLetters = [];
  foundWords = [];
  usedCells = new Set();
  score = 0;
  timeLeft = GAME_TIME;
  
  // Update displays
  updateScoreDisplay();
  updateTimerDisplay();
  currentWordDisplay.textContent = '';
  foundWordsList.innerHTML = '';
  
  // Create the grid
  createGrid();
  
  // Start the timer
  startTimer();
  
  // Update button states
  startButton.disabled = true;
  newGameButton.disabled = false;
  
  // Set game as active
  isGameActive = true;
  
  // Hide game results if visible
  gameResults.classList.add('hidden');
}

/**
 * Creates the letter grid
 */
function createGrid() {
  // Clear the grid
  grid.innerHTML = '';
  
  // Generate a 2D array of letters
  gridLetters = generateLetterGrid();
  
  // Create the grid elements
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const letter = gridLetters[row][col];
      const cell = document.createElement('div');
      
      cell.classList.add('letter');
      cell.textContent = letter;
      cell.dataset.row = row;
      cell.dataset.col = col;
      
      // Add click event listener
      cell.addEventListener('click', () => handleCellClick(cell, row, col));
      
      grid.appendChild(cell);
    }
  }
}

/**
 * Generates a grid of letters with a good distribution of vowels and consonants
 * @returns {Array} 2D array of letters
 */
function generateLetterGrid() {
  const grid = [];
  
  // Create a copy of the letter distribution to draw from
  let letterPool = [...LETTER_DISTRIBUTION];
  
  // Shuffle the letter pool
  letterPool = shuffleArray(letterPool);
  
  // Fill the grid with letters from the pool
  for (let row = 0; row < GRID_SIZE; row++) {
    const rowLetters = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      // If we've used all letters in the pool, refill it
      if (letterPool.length === 0) {
        letterPool = [...LETTER_DISTRIBUTION];
        letterPool = shuffleArray(letterPool);
      }
      
      // Take a letter from the pool
      const letter = letterPool.pop();
      rowLetters.push(letter);
    }
    grid.push(rowLetters);
  }
  
  return grid;
}

/**
 * Shuffles an array using the Fisher-Yates algorithm
 * @param {Array} array - The array to shuffle
 * @returns {Array} The shuffled array
 */
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// ===== GAME LOGIC =====
/**
 * Handles a cell click event
 * @param {HTMLElement} cell - The clicked cell
 * @param {number} row - The row index
 * @param {number} col - The column index
 */
function handleCellClick(cell, row, col) {
  if (!isGameActive) return;
  
  // Check if the cell is already used in a found word
  if (usedCells.has(`${row},${col}`)) {
    shakeCellAnimation(cell);
    playSound(errorSound);
    return;
  }
  
  // Check if the cell is already selected
  const cellIndex = selectedLetters.findIndex(
    item => item.row === row && item.col === col
  );
  
  if (cellIndex !== -1) {
    // Cell is already selected, deselect it and all cells after it
    selectedLetters = selectedLetters.slice(0, cellIndex);
    updateSelectedCells();
    updateCurrentWord();
    playSound(letterClickSound);
    return;
  }
  
  // Check if the cell is adjacent to the last selected cell
  if (selectedLetters.length > 0) {
    const lastCell = selectedLetters[selectedLetters.length - 1];
    const isAdjacent = isAdjacentCell(lastCell.row, lastCell.col, row, col);
    
    if (!isAdjacent) {
      shakeCellAnimation(cell);
      playSound(errorSound);
      return;
    }
  }
  
  // Add the cell to selected letters
  selectedLetters.push({
    row,
    col,
    letter: gridLetters[row][col],
    element: cell
  });
  
  // Update UI
  updateSelectedCells();
  updateCurrentWord();
  playSound(letterClickSound);
}

/**
 * Checks if two cells are adjacent
 * @param {number} row1 - Row of first cell
 * @param {number} col1 - Column of first cell
 * @param {number} row2 - Row of second cell
 * @param {number} col2 - Column of second cell
 * @returns {boolean} True if cells are adjacent
 */
function isAdjacentCell(row1, col1, row2, col2) {
  const rowDiff = Math.abs(row1 - row2);
  const colDiff = Math.abs(col1 - col2);
  
  // Cells are adjacent if they are at most 1 cell away in any direction
  return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
}

/**
 * Updates the visual state of selected cells
 */
function updateSelectedCells() {
  // Clear all selections
  document.querySelectorAll('.letter').forEach(cell => {
    cell.classList.remove('selected');
  });
  
  // Apply selection to current selected letters
  selectedLetters.forEach(item => {
    item.element.classList.add('selected');
  });
}

/**
 * Updates the current word display
 */
function updateCurrentWord() {
  const word = selectedLetters.map(item => item.letter).join('');
  currentWordDisplay.textContent = word;
}

/**
 * Submits the current word for validation
 */
function submitWord() {
  const word = selectedLetters.map(item => item.letter).join('');
  
  // Check if the word is long enough
  if (word.length < MIN_WORD_LENGTH) {
    showMessage(`Words must be at least ${MIN_WORD_LENGTH} letters long`);
    shakeCellAnimation(currentWordDisplay);
    playSound(errorSound);
    return;
  }
  
  // Check if the word is in the dictionary
  if (!dictionary.has(word)) {
    showMessage(`"${word}" is not in the dictionary`);
    shakeCellAnimation(currentWordDisplay);
    playSound(errorSound);
    return;
  }
  
  // Check if the word has already been found
  if (foundWords.some(foundWord => foundWord.word === word)) {
    showMessage(`You've already found "${word}"`);
    shakeCellAnimation(currentWordDisplay);
    playSound(errorSound);
    return;
  }
  
  // Word is valid, add it to found words
  const wordScore = calculateWordScore(word);
  foundWords.push({
    word,
    score: wordScore,
    timeFound: GAME_TIME - timeLeft
  });
  
  // Mark cells as used
  selectedLetters.forEach(item => {
    usedCells.add(`${item.row},${item.col}`);
    item.element.classList.add('used');
  });
  
  // Update score
  score += wordScore;
  updateScoreDisplay();
  
  // Update found words display
  updateFoundWordsDisplay();
  
  // Clear selection
  clearSelection();
  
  // Play success sound
  playSound(matchSound);
  
  // Show success message
  showMessage(`+${wordScore} points for "${word}"!`, 'success');
}

/**
 * Calculates the score for a word
 * @param {string} word - The word to score
 * @returns {number} The score for the word
 */
function calculateWordScore(word) {
  // Base score based on word length
  let baseScore;
  
  switch (word.length) {
    case 3: baseScore = 100; break;
    case 4: baseScore = 200; break;
    case 5: baseScore = 400; break;
    case 6: baseScore = 800; break;
    case 7: baseScore = 1600; break;
    default: baseScore = 2000 + (word.length - 8) * 500; // 8+ letters
  }
  
  // Time bonus: earlier finds get more points
  // Full bonus at start, decreasing to 50% bonus at the end
  const timeRatio = timeLeft / GAME_TIME;
  const timeBonus = Math.floor(baseScore * timeRatio);
  
  return baseScore + timeBonus;
}

/**
 * Clears the current selection
 */
function clearSelection() {
  selectedLetters = [];
  updateSelectedCells();
  updateCurrentWord();
}

/**
 * Updates the found words display
 */
function updateFoundWordsDisplay() {
  // Clear the list
  foundWordsList.innerHTML = '';
  
  // Sort words by time found (earliest first)
  const sortedWords = [...foundWords].sort((a, b) => a.timeFound - b.timeFound);
  
  // Add each word to the list
  sortedWords.forEach(({ word, score }) => {
    const wordElement = document.createElement('div');
    wordElement.textContent = `${word} (${score})`;
    wordElement.classList.add('found-word');
    
    // Add class based on word length
    if (word.length <= 7) {
      wordElement.classList.add(`word-length-${word.length}`);
    } else {
      wordElement.classList.add('word-length-8plus');
    }
    
    foundWordsList.appendChild(wordElement);
  });
}

/**
 * Shows a temporary message
 * @param {string} message - The message to show
 * @param {string} type - The type of message ('error' or 'success')
 */
function showMessage(message, type = 'error') {
  // Create message element if it doesn't exist
  let messageElement = document.getElementById('message');
  if (!messageElement) {
    messageElement = document.createElement('div');
    messageElement.id = 'message';
    messageElement.style.position = 'fixed';
    messageElement.style.top = '20px';
    messageElement.style.left = '50%';
    messageElement.style.transform = 'translateX(-50%)';
    messageElement.style.padding = '10px 20px';
    messageElement.style.borderRadius = '5px';
    messageElement.style.fontWeight = 'bold';
    messageElement.style.zIndex = '1000';
    messageElement.style.opacity = '0';
    messageElement.style.transition = 'opacity 0.3s ease';
    document.body.appendChild(messageElement);
  }
  
  // Set message style based on type
  if (type === 'error') {
    messageElement.style.backgroundColor = '#f44336';
    messageElement.style.color = 'white';
  } else {
    messageElement.style.backgroundColor = '#4caf50';
    messageElement.style.color = 'white';
  }
  
  // Set message text and show
  messageElement.textContent = message;
  messageElement.style.opacity = '1';
  
  // Hide after 2 seconds
  setTimeout(() => {
    messageElement.style.opacity = '0';
  }, 2000);
}

/**
 * Applies a shake animation to an element
 * @param {HTMLElement} element - The element to animate
 */
function shakeCellAnimation(element) {
  element.classList.add('shake');
  setTimeout(() => element.classList.remove('shake'), 500);
}

// ===== TIMER FUNCTIONS =====
/**
 * Starts the game timer
 */
function startTimer() {
  // Clear any existing timer
  if (timer) clearInterval(timer);
  
  // Start a new timer
  timer = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    
    // Check if time is up
    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

/**
 * Updates the timer display
 */
function updateTimerDisplay() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  timerDisplay.textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Updates the score display
 */
function updateScoreDisplay() {
  scoreDisplay.textContent = `Score: ${score}`;
}

/**
 * Ends the game
 */
function endGame() {
  // Stop the timer
  clearInterval(timer);
  
  // Set game as inactive
  isGameActive = false;
  
  // Play finish sound
  playSound(finishSound);
  
  // Show game results
  showGameResults();
  
  // Update button states
  startButton.disabled = false;
  newGameButton.disabled = false;
}

/**
 * Shows the game results
 */
function showGameResults() {
  // Update final score
  finalScoreDisplay.textContent = `Final Score: ${score}`;
  
  // Update words found
  wordsFoundDisplay.innerHTML = '';
  
  if (foundWords.length === 0) {
    wordsFoundDisplay.textContent = 'No words found';
  } else {
    // Sort words by length (longest first), then alphabetically
    const sortedWords = [...foundWords].sort((a, b) => {
      if (b.word.length !== a.word.length) {
        return b.word.length - a.word.length;
      }
      return a.word.localeCompare(b.word);
    });
    
    // Group words by length
    const wordsByLength = {};
    sortedWords.forEach(({ word, score }) => {
      const length = word.length;
      if (!wordsByLength[length]) {
        wordsByLength[length] = [];
      }
      wordsByLength[length].push({ word, score });
    });
    
    // Create elements for each group
    Object.keys(wordsByLength)
      .sort((a, b) => b - a) // Sort lengths in descending order
      .forEach(length => {
        const words = wordsByLength[length];
        
        // Create group header
        const header = document.createElement('h4');
        header.textContent = `${length}-letter words (${words.length})`;
        wordsFoundDisplay.appendChild(header);
        
        // Create word list
        const wordList = document.createElement('div');
        wordList.style.display = 'flex';
        wordList.style.flexWrap = 'wrap';
        wordList.style.gap = '5px';
        wordList.style.marginBottom = '10px';
        
        words.forEach(({ word, score }) => {
          const wordElement = document.createElement('span');
          wordElement.textContent = `${word} (${score})`;
          wordElement.style.padding = '3px 8px';
          wordElement.style.borderRadius = '12px';
          wordElement.style.backgroundColor = getColorForWordLength(length);
          wordElement.style.color = 'white';
          wordElement.style.fontWeight = 'bold';
          wordList.appendChild(wordElement);
        });
        
        wordsFoundDisplay.appendChild(wordList);
      });
  }
  
  // Show the results
  gameResults.classList.remove('hidden');
}

/**
 * Gets the color for a word based on its length
 * @param {number} length - The word length
 * @returns {string} The color for the word
 */
function getColorForWordLength(length) {
  switch (parseInt(length)) {
    case 3: return '#8bc34a'; // Light green
    case 4: return '#4caf50'; // Green
    case 5: return '#009688'; // Teal
    case 6: return '#3f51b5'; // Indigo
    case 7: return '#673ab7'; // Deep purple
    default: return '#9c27b0'; // Purple (8+ letters)
  }
}

/**
 * Resets the game
 */
function resetGame() {
  // Stop the timer
  clearInterval(timer);
  
  // Reset game state
  selectedLetters = [];
  foundWords = [];
  usedCells = new Set();
  score = 0;
  timeLeft = GAME_TIME;
  
  // Update displays
  updateScoreDisplay();
  updateTimerDisplay();
  currentWordDisplay.textContent = '';
  foundWordsList.innerHTML = '';
  
  // Update button states
  startButton.disabled = false;
  newGameButton.disabled = true;
  
  // Set game as inactive
  isGameActive = false;
  
  // Clear the grid
  grid.innerHTML = '';
}

// ===== UTILITY FUNCTIONS =====
/**
 * Plays a sound if not muted
 * @param {HTMLAudioElement} sound - The sound to play
 */
function playSound(sound) {
  if (!isMuted && sound) {
    // Clone the audio element to allow overlapping sounds
    const soundClone = sound.cloneNode();
    soundClone.volume = 0.5;
    soundClone.play();
  }
}

/**
 * Toggles mute state
 */
function toggleMute() {
  isMuted = !isMuted;
  muteButton.textContent = isMuted ? '🔊 Unmute' : '🔇 Mute';
}

/**
 * Toggles dark mode
 */
function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  
  if (isDarkMode) {
    enableDarkMode();
  } else {
    disableDarkMode();
  }
}

/**
 * Enables dark mode
 */
function enableDarkMode() {
  document.body.classList.add('dark-mode');
  modeToggle.textContent = '🌙';
  isDarkMode = true;
  localStorage.setItem('darkMode', 'true');
}

/**
 * Disables dark mode
 */
function disableDarkMode() {
  document.body.classList.remove('dark-mode');
  modeToggle.textContent = '☀️';
  isDarkMode = false;
  localStorage.setItem('darkMode', 'false');
}
