// ===== DOM ELEMENT REFERENCES =====
const grid = document.getElementById('letter-grid');
const wordsContainer = document.getElementById('selected-words-container');
const timerDisplay = document.getElementById('timer');
const successMessage = document.getElementById('success-message');
const hintDisplay = document.getElementById('hint-display');
const themeDisplay = document.getElementById('theme-display');

// ===== AUDIO ELEMENTS =====
const letterClickSound = new Audio('click-sound.mp3');
const matchSound = new Audio('match-sound.mp3');
const successSound = new Audio('finish-sound.mp3');
const bonusSound = new Audio('bonus.mp3');

// ===== GAME STATE VARIABLES =====
let selectedLetters = [];    // Currently selected letters
let matchedWords = [];       // Words successfully matched
let bonusWordsFound = new Set(); // Bonus words discovered
let isMuted = false;         // Audio state
let timer;                   // Timer reference
let timeLeft = 0;            // Time elapsed in seconds
let isArchiveVisible = false; // Archive visibility state
let isDarkMode = false;      // Dark mode state
let dictionary = new Set();  // Dictionary for bonus words validation

// ===== STYLING CONSTANTS =====
const colours = ['#a0d2eb', '#ffc6a0', '#c8e6a0', '#f7a0eb', '#d0a0ff']; // Colors for word groups

// ===== INITIALIZATION =====
// Create a container for bonus words
const bonusWordsContainer = document.createElement('div');
bonusWordsContainer.id = 'bonus-words-container';
bonusWordsContainer.style.marginTop = '20px';
bonusWordsContainer.style.display = 'none';
document.body.insertBefore(bonusWordsContainer, wordsContainer.nextSibling);

// Add a heading for bonus words
const bonusWordsHeading = document.createElement('h3');
bonusWordsHeading.textContent = 'Bonus Words:';
bonusWordsHeading.style.textAlign = 'center';
bonusWordsHeading.style.marginBottom = '10px';
bonusWordsContainer.appendChild(bonusWordsHeading);

// Set initial UI state
hintDisplay.style.display = 'none';  // Hide hint by default
themeDisplay.style.display = 'none'; // Hide theme by default

// Hide the buttons initially
document.getElementById('hint-button').style.display = 'none'; 
document.getElementById('theme-button').style.display = 'none';
document.getElementById('mute-button').style.display = 'none';
document.getElementById('grid-reset-button').style.display = 'none';
document.getElementById('reset-button').style.display = 'none';
document.getElementById('mode-toggle').style.display = 'none';

// ===== DATA RETRIEVAL FUNCTIONS =====
/**
 * Gets the word list for a specific date
 * @param {string} selectedDate - Date in YYYY-MM-DD format
 * @returns {Array} Array of words for the puzzle
 */
function getWordsByDate(selectedDate) {
  // Convert the YYYY-MM-DD format to "DD Month YYYY"
  const date = new Date(selectedDate);
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'long' });
  const year = date.getFullYear();
  const formattedDate = `${day} ${month} ${year}`;
  
  console.log("Looking for puzzle for date:", formattedDate);
  
  // Check each key in wordListsByDate to find a match (case insensitive)
  for (const key in wordListsByDate) {
    // Normalize both strings for comparison (remove leading zeros, lowercase)
    const normalizedKey = key.toLowerCase().replace(/^0(\d)/, '$1');
    const normalizedDate = formattedDate.toLowerCase().replace(/^0(\d)/, '$1');
    
    if (normalizedKey === normalizedDate) {
      console.log("Found puzzle for date:", key);
      return wordListsByDate[key];
    }
  }
  
  // If no words for this date, use default
  console.log("No puzzle found for date:", formattedDate, "Using default puzzle.");
  alert('No puzzle available for this date. Using default puzzle instead.');
  return wordListsByDate['default'];
}

/**
 * Gets the theme for a specific date
 * @param {string} selectedDate - Date in YYYY-MM-DD format
 * @returns {string} Theme text for the puzzle
 */
function getThemeByDate(selectedDate) {
  const date = new Date(selectedDate);
  const day = String(date.getDate()).padStart(2, '0'); // Ensure two digits with leading zero if needed
  const month = date.toLocaleString('en-US', { month: 'long' });
  const year = date.getFullYear();
  const formattedDate = `${day} ${month} ${year}`;
  
  // Check each key in ThemesByDate to find a match (case insensitive)
  for (const key in ThemesByDate) {
    if (key.toLowerCase() === formattedDate.toLowerCase() || 
        key.toLowerCase() === formattedDate.replace(/^0/, '').toLowerCase()) { // Try without leading zero
      return ThemesByDate[key];
    }
  }
  
  return ThemesByDate['default'];
}

/**
 * Gets the hint for a specific date
 * @param {string} selectedDate - Date in YYYY-MM-DD format
 * @returns {string} Hint text for the puzzle
 */
function getHintByDate(selectedDate) {
  const date = new Date(selectedDate);
  const day = String(date.getDate()).padStart(2, '0'); // Ensure two digits with leading zero if needed
  const month = date.toLocaleString('en-US', { month: 'long' });
  const year = date.getFullYear();
  const formattedDate = `${day} ${month} ${year}`;
  
  // Check each key in HintsByDate to find a match (case insensitive)
  for (const key in HintsByDate) {
    if (key.toLowerCase() === formattedDate.toLowerCase() || 
        key.toLowerCase() === formattedDate.replace(/^0/, '').toLowerCase()) { // Try without leading zero
      return HintsByDate[key];
    }
  }
  
  return HintsByDate['default'];
}

// ===== INSTRUCTIONS TOGGLE =====
document.addEventListener('DOMContentLoaded', function() {
  const instructionsToggle = document.getElementById('instructions-toggle');
  const instructions = document.getElementById('instructions');
  
  // Set up toggle functionality
  instructionsToggle.addEventListener('click', function() {
    const isVisible = instructions.style.display !== 'none';
    
    if (isVisible) {
      // Hide instructions
      instructions.style.display = 'none';
      instructionsToggle.textContent = 'Show Instructions';
    } else {
      // Show instructions
      instructions.style.display = 'block';
      instructionsToggle.textContent = 'Hide Instructions';
    }
    
    // Track the event
    if (typeof gtag === 'function') {
      gtag('event', 'toggle_instructions', {
        'event_category': 'navigation',
        'event_label': isVisible ? 'Hide Instructions' : 'Show Instructions',
        'value': 1
      });
    }
  });
});


/**
 * Gets the puzzle setter for a specific date
 * @param {string} selectedDate - Date in YYYY-MM-DD format
 * @returns {string} Name of the puzzle setter
 */
function getPuzzleSetterByDate(selectedDate) {
  const date = new Date(selectedDate);
  const day = String(date.getDate()).padStart(2, '0'); // Ensure two digits with leading zero if needed
  const month = date.toLocaleString('en-US', { month: 'long' });
  const year = date.getFullYear();
  const formattedDate = `${day} ${month} ${year}`;
  
  // Check each key in puzzleSetterbyDate to find a match (case insensitive)
  for (const key in puzzleSetterbyDate) {
    if (key.toLowerCase() === formattedDate.toLowerCase() || 
        key.toLowerCase() === formattedDate.replace(/^0/, '').toLowerCase()) { // Try without leading zero
      return puzzleSetterbyDate[key];
    }
  }
  
  return puzzleSetterbyDate['default'];
}

// ===== DICTIONARY LOADING =====
/**
 * Loads the dictionary file for bonus word validation
 */
fetch('dictionary.txt')
  .then(response => response.text())
  .then(text => {
    // Split the text file by newlines and add each word to the Set
    const words = text.split('\n').map(word => word.trim().toUpperCase());
    dictionary = new Set(words);
    console.log('Dictionary loaded with', dictionary.size, 'words');
  })
  .catch(error => console.error('Error loading dictionary:', error));

// ===== DATE PICKER FUNCTIONS =====
/**
 * Initializes the date picker with Flatpickr
 * Sets up available dates and default selection
 */
function initializeDatePicker() {
  // Get today's date
  const today = new Date();
  
  // Create an array of available dates from puzzle data
  const availableDates = Object.keys(wordListsByDate)
    .filter(date => date !== 'default')
    .map(dateStr => {
      // Parse dates like "26 April 2025" to Date objects
      const parts = dateStr.split(' ');
      const day = parseInt(parts[0], 10);
      const month = new Date(Date.parse(`${parts[1]} 1, 2000`)).getMonth(); // Get month index (0-11)
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    });
  
  // Sort dates chronologically
  availableDates.sort((a, b) => a - b);
  
  // Check if today has a puzzle
  const todayHasPuzzle = availableDates.some(date => 
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
  
  // If today doesn't have a puzzle, find the most recent date that does
  let defaultDate = today;
  if (!todayHasPuzzle && availableDates.length > 0) {
    // Filter dates that are in the past (up to today)
    const pastDates = availableDates.filter(date => date <= today);
    if (pastDates.length > 0) {
      // Get the most recent past date
      defaultDate = pastDates[pastDates.length - 1];
    } else {
      // If no past dates, use the earliest available date
      defaultDate = availableDates[0];
    }
  }
  
  // Format the default date as YYYY-MM-DD for the input value
  const formattedDefaultDate = defaultDate.toISOString().split('T')[0];
  document.getElementById('puzzle-date').value = formattedDefaultDate;
  
  // Initialize Flatpickr
  flatpickr("#puzzle-date", {
    inline: false,
    dateFormat: "Y-m-d",
    defaultDate: defaultDate,
    minDate: availableDates[0], // First available date
    maxDate: today, // Today (or you can set a specific end date)
    enable: availableDates, // Only enable dates with puzzles
    disableMobile: "true", // Disable mobile-native datepicker
    
    // Customize the calendar appearance
    onDayCreate: function(dObj, dStr, fp, dayElem) {
      // Add custom styling for dates without puzzles
      if (!availableDates.some(date => 
        date.getDate() === dayElem.dateObj.getDate() &&
        date.getMonth() === dayElem.dateObj.getMonth() &&
        date.getFullYear() === dayElem.dateObj.getFullYear()
      )) {
        dayElem.classList.add('no-puzzle');
      }
    },
    
    onChange: function(selectedDates, dateStr, instance) {
      // Automatically load the puzzle when a date is selected
      loadPuzzleForDate();
    }
  });
  
  // Don't show the date picker initially - it will be toggled by the archive button
  document.getElementById('date-picker-container').style.display = 'none';
}

/**
 * Sets up the archive toggle button functionality
 */
function setupArchiveToggle() {
  const archiveToggle = document.getElementById('archive-toggle');
  const datePickerContainer = document.getElementById('date-picker-container');
  
  // Initially hide the date picker
  datePickerContainer.style.display = 'none';
  
  archiveToggle.addEventListener('click', () => {
    isArchiveVisible = !isArchiveVisible;
    
    if (isArchiveVisible) {
      // Show the date picker
      datePickerContainer.style.display = 'flex';
      archiveToggle.innerHTML = '❌';
      archiveToggle.setAttribute('aria-label', 'Close puzzle archive');
    } else {
      // Hide the date picker
      datePickerContainer.style.display = 'none';
      archiveToggle.innerHTML = '📅';
      archiveToggle.setAttribute('aria-label', 'Open puzzle archive');
    }
    
    // Track the event
    if (typeof gtag === 'function') {
      gtag('event', 'toggle_archive', {
        'event_category': 'navigation',
        'event_label': isArchiveVisible ? 'Open Archive' : 'Close Archive',
        'value': 1
      });
    }
  });
}

// ===== PUZZLE LOADING AND CREATION =====
/**
 * Loads the puzzle for the selected date
 * Resets game state and creates a new grid
 */
function loadPuzzleForDate() {
  // Reset game state
  selectedLetters = [];
  matchedWords = [];
  bonusWordsFound = new Set();
  
  // Get the selected date
  const selectedDate = document.getElementById('puzzle-date').value;
  
  // Get words, theme, hint, and setter for the selected date
  const words = getWordsByDate(selectedDate);
  const themeText = getThemeByDate(selectedDate);
  const hintText = getHintByDate(selectedDate);
  const setterName = getPuzzleSetterByDate(selectedDate);
  
  // Update the puzzle setter display
  const setterElement = document.getElementById('puzzle-setter');
  if (setterElement) {
    setterElement.textContent = Array.isArray(setterName) ? setterName[0] : setterName;
  }
  
  // Reset timer
  stopTimer();
  timeLeft = 0;
  timerDisplay.textContent = `Time: ${timeLeft}`;
  
  // Clear the grid and words container
  grid.innerHTML = '';
  wordsContainer.innerHTML = '';
  
  // Hide hint and theme
  hintDisplay.style.display = 'none';
  themeDisplay.style.display = 'none';
  
  // Recreate the grid with the new words
  createGrid(words);
  
  // Update hint and theme text
  hintDisplay.textContent = hintText;
  themeDisplay.textContent = themeText;
  
  // Hide bonus words container
  bonusWordsContainer.style.display = 'none';
  
  // Show the grid
  grid.style.display = 'grid';
  
  // Show game control buttons
  document.getElementById('hint-button').style.display = 'block'; 
  document.getElementById('theme-button').style.display = 'block';
  document.getElementById('mute-button').style.display = 'block';
  document.getElementById('grid-reset-button').style.display = 'block';
  document.getElementById('reset-button').style.display = 'block';
  document.getElementById('mode-toggle').style.display = 'block';
  
  // Track the event
  if (typeof gtag === 'function') {
    gtag('event', 'load_puzzle_by_date', {
      'event_category': 'gameplay',
      'event_label': selectedDate
    });
  }
}

/**
 * Creates the letter grid based on the provided words
 * @param {Array} words - Array of words to create the grid from
 */
function createGrid(words) {
  // Determine the height of the grid (based on the longest word)
  const numRows = Math.max(...words.map(word => word.length)); 
  const numCols = words.length;
  
  // Create the grid based on the words list
  const gridArray = Array.from({ length: numRows }, () => Array(numCols).fill(null));
  
  // Place each word's letters in the grid
  words.forEach((word, colIndex) => {
    [...word].forEach((letter, rowIndex) => {
      gridArray[rowIndex][colIndex] = letter;
    });
  });
  
  // Shuffle each row randomly
  gridArray.forEach(row => {
    row.sort(() => Math.random() - 0.5);  // Shuffle letters within the row
  });
  
  // Clear the grid
  grid.innerHTML = '';
  
  // Create the grid elements
  grid.style.gridTemplateColumns = `repeat(${numCols}, 60px)`;
  grid.style.gridTemplateRows = `repeat(${numRows}, 60px)`;
  
  // Create letter elements and add them to the grid
  gridArray.forEach((row, rowIndex) => {
    row.forEach((letter, colIndex) => {
      const div = document.createElement('div');
      div.classList.add('letter');
      div.textContent = letter || '';  // Fill empty cells with nothing
      div.dataset.row = rowIndex;
      div.dataset.col = colIndex;
      
      // Add click event listener to each letter
      div.addEventListener('click', () => {
        // Play click sound
        if (!isMuted){
          letterClickSound.play();
        }
        const isSelected = div.classList.contains('selected');
        
        if (isSelected) {
          // Remove from selectedLetters and unselect the letter
          selectedLetters = selectedLetters.filter(obj => obj.element !== div);
          div.classList.remove('selected');
          div.style.backgroundColor = '';
        } else {
          // Count how many letters are already selected in this row
          const selectedInRow = selectedLetters.filter(obj => obj.rowIndex === rowIndex).length;
          const allowedPerRow = matchedWords.length + 1;
          
          if (selectedInRow >= allowedPerRow) {
            // Optionally give user feedback
            div.classList.add('shake');
            setTimeout(() => div.classList.remove('shake'), 300);
            return;
          }
          
          // Add to selectedLetters
          selectedLetters.push({ letter, element: div, rowIndex, colIndex });
          div.classList.add('selected');
        }
        
        updateWordGroups();
      });
      
      grid.appendChild(div);
    });
  });
  
  // Create a container for the grid and overlay if it doesn't exist
  let gridContainer = document.getElementById('letter-grid-container');
  if (!gridContainer) {
    // Create a container for the grid
    gridContainer = document.createElement('div');
    gridContainer.id = 'letter-grid-container';
    
    // Insert the container before the grid
    grid.parentNode.insertBefore(gridContainer, grid);
    
    // Move the grid into the container
    gridContainer.appendChild(grid);
  } else {
    // If the container already exists, make sure the grid is inside it
    if (!gridContainer.contains(grid)) {
      gridContainer.appendChild(grid);
    }
  }
  
  // Remove any existing overlay first
  const existingOverlay = document.getElementById('start-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }
  
  // Create the start overlay
  const startOverlay = document.createElement('div');
  startOverlay.id = 'start-overlay';
  
  const startButton = document.createElement('button');
  startButton.id = 'start-puzzle-button';
  startButton.textContent = 'Start Puzzle';
  
  startOverlay.appendChild(startButton);
  gridContainer.appendChild(startOverlay);
  
  // Add event listener to the start button
  startButton.addEventListener('click', () => {
    // Remove the overlay
    startOverlay.remove();
    
    // Start the timer
    startTimer();
    
    // Track the event
    if (typeof gtag === 'function') {
      gtag('event', 'start_puzzle', {
        'event_category': 'gameplay',
        'event_label': 'Start Puzzle Button',
        'value': 1
      });
    }
  });
}

// ===== TIMER FUNCTIONS =====
/**
 * Starts the game timer
 */
function startTimer() {
  timer = setInterval(() => {
    timeLeft++;
    timerDisplay.textContent = `Time: ${timeLeft}`;
  }, 1000);  // Update the timer every second
}

/**
 * Stops the game timer
 */
function stopTimer() {
  clearInterval(timer);
}

/**
 * Formats seconds into a readable time string
 * @param {number} totalSeconds - Time in seconds
 * @returns {string} Formatted time string (e.g., "2m 45s")
 */
function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
}

// ===== WORD MATCHING AND GAME LOGIC =====
/**
 * Updates the display of selected letters and checks for word matches
 * This is the core game logic function
 */
function updateWordGroups() {
  // Get the selected date
  const selectedDate = document.getElementById('puzzle-date').value;
  
  // Get words for the selected date
  const words = getWordsByDate(selectedDate);
  
  // Clear all previous colours
  selectedLetters.forEach(obj => obj.element.style.backgroundColor = '');

  // Group by click order (the first N letters for each word form a group)
  const groups = [];
  let currentIndex = 0;

  words.forEach(word => {
    const group = selectedLetters.slice(currentIndex, currentIndex + word.length);
    groups.push(group);
    currentIndex += word.length;
  });

  // Sort each group by rowIndex to display letters in vertical order within the group
  groups.forEach(group => {
    group.sort((a, b) => a.rowIndex - b.rowIndex);
  });

  // Apply colours and display words
  wordsContainer.innerHTML = '';  // Clear previous words
  const wordGroups = [];
  
  groups.forEach((group, i) => {
    const word = group.map(obj => obj.letter).join('');
    const wordDiv = document.createElement('div');
    wordDiv.textContent = word;
    wordDiv.style.padding = '0.5em';
    wordDiv.style.margin = '0.2em auto';
    wordDiv.style.width = 'fit-content';
    wordDiv.style.borderRadius = '5px';

    // Check if the selected letters match the word
    if (words.includes(word)) {
      wordDiv.style.backgroundColor = '#76e77d';  // Green for a match
      wordDiv.textContent = `✔️ ${word}`;  // Add a checkmark to indicate a valid word

      // Make the matched letters invisible but preserve the grid layout
      group.forEach(obj => {
        obj.element.style.opacity = '0.3';  // Hide the letter but keep the space
        obj.element.style.pointerEvents = 'none';  // Disable any interaction (clicking)
      });

      // Add the word to matchedWords and check if all words are matched
      if (!matchedWords.includes(word)) {
        matchedWords.push(word);
        // Play match sound
        if (!isMuted){
          matchSound.play();
        }
      }
      
      // Check if all words are matched - game completion
      if (matchedWords.length === words.length) {
        handleGameCompletion(words);
      }
    } else {
      // Check if it's a bonus word (in dictionary but not in target words)
      if (group.length === words[0].length && // Only check if the group has the right number of letters
          !words.includes(word) && 
          dictionary.has(word) && 
          word.length >= 3 && // Only consider words of at least 3 letters
          !bonusWordsFound.has(word)) { // Only show alert for new bonus words

        handleBonusWord(word, group);
        return; // Exit early to prevent adding this word to wordGroups
      } else {
        wordDiv.style.backgroundColor = colours[i % colours.length];
      }
    }

    wordGroups.push(wordDiv);
    
    // Apply the same colour to grid letters
    group.forEach(obj => {
      obj.element.style.backgroundColor = wordDiv.style.backgroundColor;
    });
  });

  // Arrange the words into two columns by splitting the array into two part
  const halfIndex = Math.ceil(wordGroups.length / 2);
  const firstColumn = wordGroups.slice(0, halfIndex);
  const secondColumn = wordGroups.slice(halfIndex);

  // Clear the container and add the columns
  wordsContainer.innerHTML = '';

  // Append the two columns
  firstColumn.forEach(wordDiv => wordsContainer.appendChild(wordDiv));
  secondColumn.forEach(wordDiv => wordsContainer.appendChild(wordDiv));
}

/**
 * Handles the discovery of a bonus word
 * @param {string} word - The bonus word found
 * @param {Array} group - The group of letter objects forming the word
 */
function handleBonusWord(word, group) {
  // Play a sound
  if (!isMuted){
    bonusSound.play();
  }
  
  // Add to found bonus words
  bonusWordsFound.add(word);
  
  // Update the bonus words display
  updateBonusWordsDisplay();
  
  // Store the current group to unselect later
  const bonusWordLetters = [...group]; // Create a copy of the group
  
  // Show congratulation alert
  setTimeout(() => {
    alert(`Bonus word found: ${word}! Great job finding an extra word!`);
    
    // Unselect only the letters that formed the bonus word
    unselectLetters(bonusWordLetters);
    
    // Track the bonus word event
    if (typeof gtag === 'function') {
      gtag('event', 'bonus_word_found', {
        'event_category': 'gameplay',
        'event_label': word
      });
    }
    
    // Update the display to remove the bonus word from the main display
    updateWordGroups();
  }, 300); // Small delay so the UI updates first
}

/**
 * Handles game completion when all words are matched
 * @param {Array} words - The list of target words
 */
function handleGameCompletion(words) {
  stopTimer();
  if (!isMuted){
    successSound.play(); // Play success sound
  }

  const playerTimeInSeconds = timeLeft; 
  const averageTimeInSeconds = 508;     
  const blocklength = averageTimeInSeconds/8;
  
  // Get the selected date
  const selectedDate = document.getElementById('puzzle-date').value;
  const date = new Date(selectedDate);
  const formattedDate = date.toLocaleDateString('en-US', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  
  // Check if this is today's date or an archive game
  const today = new Date();
  const isToday = date.getDate() === today.getDate() && 
                  date.getMonth() === today.getMonth() && 
                  date.getFullYear() === today.getFullYear();
  
  // Build the completion message
  let message = buildCompletionMessage(isToday, formattedDate, playerTimeInSeconds, averageTimeInSeconds, blocklength);
  
  // Show the completion area
  const completionArea = document.getElementById('completion-area');
  if (completionArea) {
    completionArea.style.display = 'block';
  }

  // Populate the text box with the completion message
  document.getElementById('gameCompletionMessage').value = message;
  document.getElementById('gameCompletionMessage').classList.add('active');

  // Show the copy and share buttons
  document.getElementById('shareButton').style.display = 'block';
  document.getElementById('copyButton').style.display = 'block';
        
  // Hide game elements
  hideGameElements();

  // Track the completion event
  if (typeof gtag === 'function') {
    gtag('event', 'game_completed', {
      'event_category': 'gameplay',
      'event_label': 'DownWords Game Completed',
      'value': timeLeft
    });
  }
}

/**
 * Builds the completion message for sharing
 * @param {boolean} isToday - Whether the completed puzzle is today's puzzle
 * @param {string} formattedDate - The formatted date string
 * @param {number} playerTimeInSeconds - Player's completion time in seconds
 * @param {number} averageTimeInSeconds - Average completion time in seconds
 * @param {number} blocklength - Length of each block for visualization
 * @returns {string} Formatted completion message
 */
function buildCompletionMessage(isToday, formattedDate, playerTimeInSeconds, averageTimeInSeconds, blocklength) {
  let message = '';
  
  // Initial message based on whether it's today's puzzle or an archive puzzle
  if (isToday) {
    message = `I completed today's DownWords in ${formatTime(timeLeft)} compared to the average of ${formatTime(averageTimeInSeconds)}\n`;
  } else {
    message = `I completed an archive game of DownWords for ${formattedDate} in ${formatTime(timeLeft)}\n`;
  }

  // Convert times to blocks (each block represents one 8th of the average time)
  const playerBlocks = Math.floor(playerTimeInSeconds / blocklength);
  const averageBlocks = Math.floor(averageTimeInSeconds / blocklength);

  // Build the block strings
  let playerBlocksString = '';
  let averageBlocksString = '';

  // If player is slower than average
  if (playerTimeInSeconds > averageTimeInSeconds) {
    const extraTime = Math.min(playerTimeInSeconds - averageTimeInSeconds, blocklength * 3);
    const extraBlocks = Math.ceil(extraTime / blocklength);
    playerBlocksString = '🟩'.repeat(averageBlocks) + '🟥'.repeat(extraBlocks);
  } else {
    const minimumPlayerBlocks = Math.max(1, playerBlocks); // Make sure at least 1 block
    playerBlocksString = '🟩'.repeat(minimumPlayerBlocks);
  }

  // Average is always green blocks (no red needed)
  averageBlocksString = '🟩'.repeat(averageBlocks);

  // Format the final message
  message += `\n${playerBlocksString} - Me (${formatTime(timeLeft)})`;
  
  // Only show average comparison for today's puzzle
  if (isToday) {
    message += `\n${averageBlocksString} - Average (${formatTime(averageTimeInSeconds)}) \n`;
  } else {
    message += '\n';
  }

  // Add bonus words found to the message
  if (bonusWordsFound.size > 0) {
    const duckEmojis = '🦆'.repeat(bonusWordsFound.size);
    message += `\n${duckEmojis} - Found ${bonusWordsFound.size} bonus word${bonusWordsFound.size > 1 ? 's' : ''} \n`;
  }
  
  // Both hint and theme are hidden, do something here
  if (getComputedStyle(hintDisplay).display === 'none' && getComputedStyle(themeDisplay).display === 'none') {
    message += `\n🏆 - No hints`;
  }
  
  // Only show player speed comparison for today's puzzle
  if (isToday) {
    if (timeLeft < averageTimeInSeconds * 0.2) {
      message += `\n👑 - Top 20% of players today!`;
    } else if (timeLeft < averageTimeInSeconds) {
      message += `\n🏅 - Top 50% of players today`;
    }
  }
  
  message += `\n`;
  message += `\nhttp://www.DownWordsGame.com`;
  message += `\n#DownWordsGame`;
  
  return message;
}

/**
 * Hides game elements after completion
 */
function hideGameElements() {
  grid.style.display = 'none';  // Hide the grid
  hintDisplay.style.display = 'none'; // Hide the Hint text
  themeDisplay.style.display = 'none'; // Hide the theme text
  document.getElementById('hint-button').style.display = 'none'; // Hide all the buttons
  document.getElementById('theme-button').style.display = 'none';
  document.getElementById('mute-button').style.display = 'none';
  document.getElementById('grid-reset-button').style.display = 'none';
  document.getElementById('date-picker-container').style.display = 'none'; // Hide date picker
  bonusWordsContainer.style.display = 'none'; // Hide bonus words container
}

/**
 * Updates the display of bonus words found
 */
function updateBonusWordsDisplay() {
  // Clear existing content except the heading
  while (bonusWordsContainer.childNodes.length > 1) {
    bonusWordsContainer.removeChild(bonusWordsContainer.lastChild);
  }
  
  // Show the container if we have bonus words
  if (bonusWordsFound.size > 0) {
    bonusWordsContainer.style.display = 'block';
    
    // Create a flex container for the bonus words
    const flexContainer = document.createElement('div');
    flexContainer.style.display = 'flex';
    flexContainer.style.flexWrap = 'wrap';
    flexContainer.style.justifyContent = 'center';
    flexContainer.style.gap = '10px';
    
    // Add each bonus word
    [...bonusWordsFound].forEach(word => {
      const wordDiv = document.createElement('div');
      wordDiv.textContent = `⭐ ${word}`;
      wordDiv.style.backgroundColor

_**Note:** Response was truncated due to length limits._
