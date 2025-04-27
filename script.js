// --- DOM ELEMENT REFERENCES ---
const grid = document.getElementById('letter-grid');
const wordsContainer = document.getElementById('selected-words-container');
const timerDisplay = document.getElementById('timer');
const successMessage = document.getElementById('success-message');
const hintDisplay = document.getElementById('hint-display');
const themeDisplay = document.getElementById('theme-display');

// --- AUDIO ELEMENTS ---
const letterClickSound = new Audio('click-sound.mp3');
const matchSound = new Audio('match-sound.mp3');
const successSound = new Audio('finish-sound.mp3');

// --- GAME DATA ---
// Word lists by date
const wordListsByDate = {
  '26 April 2025': ['SPACE', 'EARTH', 'ALIEN', 'ORBIT', 'COMET', 'SOLAR'],
  '27 April 2025': ['SUMMER', 'PICNIC', 'TRAVEL', 'GARDEN', 'BIKINI', 'SEASON'],
  '28 April 2025': ['NATURE', 'FOREST', 'LEAVES', 'STREAM', 'JUNGLE', 'FLOWER'],
  '29 April 2025': ['LEGAL', 'COURT', 'JUDGE', 'CASES', 'BENCH', 'TRIAL'],
  'default': ['SPACE', 'EARTH', 'ALIEN', 'ORBIT', 'COMET', 'SOLAR']
};

// Themes by date
const ThemesByDate = {
  '26 April 2025': ['Theme: SPACE'],
  '27 April 2025': ['Theme: SUMMER'],
  '28 April 2025': ['Theme: NATURE'],
  '29 April 2025': ['Theme: TRIAL'],
  'default': ['Theme: SPACE']
};

// Hints by date
const HintsByDate = {
  '26 April 2025': ['Hint: The Final Frontier'],
  '27 April 2025': ['Hint: When schools are out and trips begin.'],
  '28 April 2025': ['Hint: Forests, rivers, and mountains belong here.'],
  '29 April 2025': ['Hint: Prosecution and defence meet here.'],
  'default': ['Hint: The Final Frontier']
};

// Colour palette for words
const colours = ['#a0d2eb', '#ffc6a0', '#c8e6a0', '#f7a0eb', '#d0a0ff'];

// --- INITIAL SETUP ---
// Hide the timer, hint, and theme displays initially
timerDisplay.style.display = 'none';
hintDisplay.style.display = 'none';
themeDisplay.style.display = 'none';

// --- HELPER FUNCTIONS ---

// Get today's word list
function getWordsForToday() {
  const today = new Date();
  let selectedWords = wordListsByDate['default']; // fallback
  const dates = Object.keys(wordListsByDate).filter(date => date !== 'default');
  
  for (let i = 0; i < dates.length; i++) {
    if (today >= new Date(dates[i])) {
      selectedWords = wordListsByDate[dates[i]];
    }
  }
  
  return selectedWords;
}

// Get today's theme
function getThemeForToday() {
  const today = new Date();
  let selectedtheme = ThemesByDate['default'];
  const dates = Object.keys(wordListsByDate).filter(date => date !== 'default');
  
  for (let i = 0; i < dates.length; i++) {
    if (today >= new Date(dates[i])) {
      selectedtheme = ThemesByDate[dates[i]];
    }
  }
  
  return selectedtheme;
}

// Get today's hint
function getHintForToday() {
  const today = new Date();
  let selectedhint = HintsByDate['default'];
  const dates = Object.keys(wordListsByDate).filter(date => date !== 'default');
  
  for (let i = 0; i < dates.length; i++) {
    if (today >= new Date(dates[i])) {
      selectedhint = HintsByDate[dates[i]];
    }
  }
  
  return selectedhint;
}

// Start the game timer
function startTimer() {
  timer = setInterval(() => {
    timeLeft++;
    timerDisplay.textContent = `Time: ${timeLeft}`;
  }, 1000);
}

// Stop the game timer
function stopTimer() {
  clearInterval(timer);
}

// Update the selected word groups and check for matches
function updateWordGroups() {
  // Clear all previous colours
  selectedLetters.forEach(obj => obj.element.style.backgroundColor = '');

  // Group selected letters into words
  const groups = [];
  let currentIndex = 0;

  words.forEach(word => {
    const group = selectedLetters.slice(currentIndex, currentIndex + word.length);
    groups.push(group);
    currentIndex += word.length;
  });

  // Sort each group vertically
  groups.forEach(group => {
    group.sort((a, b) => a.rowIndex - b.rowIndex);
  });

  // Display word groups
  wordsContainer.innerHTML = '';
  const wordGroups = [];

  groups.forEach((group, i) => {
    const word = group.map(obj => obj.letter).join('');
    const wordDiv = document.createElement('div');
    wordDiv.textContent = word;
    wordDiv.style.padding = '0.5em';
    wordDiv.style.margin = '0.2em auto';
    wordDiv.style.width = 'fit-content';
    wordDiv.style.borderRadius = '5px';

    // If word matches
    if (words.includes(word)) {
      wordDiv.style.backgroundColor = '#76e77d';  // Green for a match
      wordDiv.textContent = `✔️ ${word}`;

      // Make matched letters semi-transparent
      group.forEach(obj => {
        obj.element.style.opacity = '0.3';
      });

      // Add word to matched words if not already added
      if (!matchedWords.includes(word)) {
        matchedWords.push(word);
        if (!isMuted) {
          matchSound.play();
        }
      }

      // Check for game completion
      if (matchedWords.length === words.length) {
        stopTimer();
        successMessage.textContent = `Congratulations! You found all the words in ${timeLeft} seconds.`;
        successMessage.style.color = 'green';
        if (!isMuted) {
          successSound.play();
        }

        // Hide game elements
        grid.style.display = 'none';
        hintDisplay.style.display = 'none';
        themeDisplay.style.display = 'none';
        document.getElementById('hint-button').style.display = 'none';
        document.getElementById('theme-button').style.display = 'none';
        document.getElementById('mute-button').style.display = 'none';
        document.getElementById('grid-reset-button').style.display = 'none';

        // Google Analytics event (optional)
        if (typeof gtag === 'function') {
          gtag('event', 'game_completed', {
            'event_category': 'gameplay',
            'event_label': 'DownWords Game Completed',
            'value': timeLeft
          });
        }
      }
    } else {
      wordDiv.style.backgroundColor = colours[i % colours.length];
    }

    wordGroups.push(wordDiv);

    // Apply colour to selected letters
    group.forEach(obj => {
      obj.element.style.backgroundColor = wordDiv.style.backgroundColor;
    });
  });

  // Arrange into two columns
  const halfIndex = Math.ceil(wordGroups.length / 2);
  const firstColumn = wordGroups.slice(0, halfIndex);
  const secondColumn = wordGroups.slice(halfIndex);

  wordsContainer.innerHTML = '';
  firstColumn.forEach(wordDiv => wordsContainer.appendChild(wordDiv));
  secondColumn.forEach(wordDiv => wordsContainer.appendChild(wordDiv));
}

// --- GAME VARIABLES ---
const words = getWordsForToday(); // Today's words
const hintText = getHintForToday(); // Today's hint
const themeText = getThemeForToday(); // Today's theme
let selectedLetters = []; // Letters currently selected
let matchedWords = []; // Words successfully matched
let isMuted = false; // Sound toggle
let timer; // Timer interval reference
let timeLeft = 0; // Timer counter

// --- BUILD GRID ---
// Determine grid size
const numRows = Math.max(...words.map(word => word.length));
const numCols = words.length;

// Create empty grid array
const gridArray = Array.from({ length: numRows }, () => Array(numCols).fill(null));

// Fill the grid with letters from words
words.forEach((word, colIndex) => {
  [...word].forEach((letter, rowIndex) => {
    gridArray[rowIndex][colIndex] = letter;
  });
});

// Shuffle letters in each row
gridArray.forEach(row => {
  row.sort(() => Math.random() - 0.5);
});

// Build the grid HTML
grid.style.gridTemplateColumns = `repeat(${numCols}, 60px)`;
grid.style.gridTemplateRows = `repeat(${numRows}, 60px)`;

gridArray.forEach((row, rowIndex) => {
  row.forEach((letter, colIndex) => {
    const div = document.createElement('div');
    div.classList.add('letter');
    div.textContent = letter || '';
    div.dataset.row = rowIndex;
    div.dataset.col = colIndex;

    // Handle letter click
    div.addEventListener('click', () => {
      if (!isMuted) {
        letterClickSound.play();
      }
      const isSelected = div.classList.contains('selected');

      if (isSelected) {
        // Unselect the letter
        selectedLetters = selectedLetters.filter(obj => obj.element !== div);
        div.classList.remove('selected');
        div.style.backgroundColor = '';
      } else {
        // Limit selections per row
        const selectedInRow = selectedLetters.filter(obj => obj.rowIndex === rowIndex).length;
        const allowedPerRow = matchedWords.length + 1;

        if (selectedInRow >= allowedPerRow) {
          div.classList.add('shake');
          setTimeout(() => div.classList.remove('shake'), 300);
          return;
        }

        // Select the letter
        selectedLetters.push({ letter, element: div, rowIndex, colIndex });
        div.classList.add('selected');
      }

      updateWordGroups();
    });

    grid.appendChild(div);
  });
});

// --- EVENT LISTENERS ---
// Start timer when page loads
window.onload = () => {
  startTimer();
};

// Reveal hint when button is clicked
document.getElementById('hint-button').addEventListener('click', () => {
  hintDisplay.textContent = hintText;
  hintDisplay.style.display = 'block';
});

// Reveal theme when button is clicked
document.getElementById('theme-button').addEventListener('click', () => {
  themeDisplay.textContent = themetext;
  themeDisplay.style.display = 'block';
});

// Toggle mute when button is clicked
document.getElementById('mute-button').addEventListener('click', () => {
  isMuted = !isMuted;
  document.getElementById('mute-button').textContent = isMuted ? 'Unmute' : 'Mute';
});
