const grid = document.getElementById('letter-grid');
const wordsContainer = document.getElementById('selected-words-container');
const timerDisplay = document.getElementById('timer');
const successMessage = document.getElementById('success-message');
const hintDisplay = document.getElementById('hint-display');
const themeDisplay = document.getElementById('theme-display');

// Add the audio elements
const letterClickSound = new Audio('click-sound.mp3');
const matchSound = new Audio('match-sound.mp3');
const successSound = new Audio('finish-sound.mp3');
const bonusSound = new Audio('bonus.mp3');

// Dictionary for bonus words
let dictionary = new Set(); // Using a Set for fast lookups
let bonusWordsFound = new Set(); // Track found bonus words

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

// Load the dictionary file
fetch('dictionary.txt')
  .then(response => response.text())
  .then(text => {
    // Split the text file by newlines and add each word to the Set
    const words = text.split('\n').map(word => word.trim().toUpperCase());
    dictionary = new Set(words);
    console.log('Dictionary loaded with', dictionary.size, 'words');
  })
  .catch(error => console.error('Error loading dictionary:', error));

// Function to initialize the date picker with Flatpickr
function initializeDatePicker() {
  // Get today's date
  const today = new Date();
  
  // Create an array of available dates from your puzzle data
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
      // You can add custom styling or tooltips here if needed
      if (!availableDates.some(date => 
        date.getDate() === dayElem.dateObj.getDate() &&
        date.getMonth() === dayElem.dateObj.getMonth() &&
        date.getFullYear() === dayElem.dateObj.getFullYear()
      )) {
        // Add a class to dates without puzzles
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

// Archive toggle functionality
let isArchiveVisible = false;

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


// Function to get words based on selected date
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


// Function to get theme based on selected date
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

// Function to get hint based on selected date
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


// Function to load puzzle for selected date
function loadPuzzleForDate() {
  // Reset game state
  selectedLetters = [];
  matchedWords = [];
  bonusWordsFound = new Set();
  
  // Get the selected date
  const selectedDate = document.getElementById('puzzle-date').value;
  
  // Get words, theme, and hint for the selected date
  const words = getWordsByDate(selectedDate);
  const themeText = getThemeByDate(selectedDate);
  const hintText = getHintByDate(selectedDate);
  const setterName = getPuzzleSetterByDate(selectedDate);
  
  // Update the puzzle setter display
  document.getElementById('puzzle-setter').textContent = setterName;
  
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
  
  // Note: We don't start the timer here anymore - it will start when the Start Puzzle button is clicked
  
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

// Function to create the grid based on words
function createGrid(words) {
  // Determine the height of the grid (based on the longest word)
  const numRows = Math.max(...words.map(word => word.length)); 
  const numCols = words.length;
  
  // Create the grid based on the words list
  const gridArray = Array.from({ length: numRows }, () => Array(numCols).fill(null));
  
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
  
  gridArray.forEach((row, rowIndex) => {
    row.forEach((letter, colIndex) => {
      const div = document.createElement('div');
      div.classList.add('letter');
      div.textContent = letter || '';  // Fill empty cells with nothing
      div.dataset.row = rowIndex;
      div.dataset.col = colIndex;
      
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



function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
}

// Function to update the bonus words display
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
      wordDiv.style.backgroundColor = '#f7d358';
      wordDiv.style.padding = '0.5em';
      wordDiv.style.borderRadius = '5px';
      wordDiv.style.margin = '5px';
      flexContainer.appendChild(wordDiv);
    });
    
    bonusWordsContainer.appendChild(flexContainer);
  } else {
    bonusWordsContainer.style.display = 'none';
  }
}

let selectedLetters = [];
let matchedWords = [];
let isMuted = false;

const colours = ['#a0d2eb', '#ffc6a0', '#c8e6a0', '#f7a0eb', '#d0a0ff'];

// Set the hint and theme as hidden by default
hintDisplay.style.display = 'none';
themeDisplay.style.display = 'none';

// Hide the buttons initially
document.getElementById('hint-button').style.display = 'none'; 
document.getElementById('theme-button').style.display = 'none';
document.getElementById('mute-button').style.display = 'none';
document.getElementById('grid-reset-button').style.display = 'none';
document.getElementById('reset-button').style.display = 'none';
document.getElementById('mode-toggle').style.display = 'none';

// Timer functionality
let timer;
let timeLeft = 0;

function startTimer() {
  timer = setInterval(() => {
    timeLeft++;
    timerDisplay.textContent = `Time: ${timeLeft}`;
  }, 1000);  // Update the timer every second
}

function stopTimer() {
  clearInterval(timer);
}

// Function to unselect specific letters (for bonus words)
function unselectLetters(lettersToUnselect) {
  lettersToUnselect.forEach(obj => {
    obj.element.classList.remove('selected');
    obj.element.style.backgroundColor = '';
  });
  
  // Remove these letters from the selectedLetters array
  selectedLetters = selectedLetters.filter(obj => !lettersToUnselect.includes(obj));
}

// Update word groups and check for matches
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
      
      if (matchedWords.length === words.length) {
  stopTimer();
  if (!isMuted){
    successSound.play(); // Play success sound
  }

  const playerTimeInSeconds = timeLeft; 
  const averageTimeInSeconds = 111;     
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
  
  // Build the share message with appropriate text based on date
  let message = '';
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
  
  // Show the text box with the completion message
  showCompletionMessage();

  // Populate the text box with the completion message
  document.getElementById('gameCompletionMessage').value = message;

  // Show the copy and share buttons
  document.getElementById('shareButton').style.display = 'block';
  document.getElementById('copyButton').style.display = 'block';
        
        // Remove the grid once all words are matched
        grid.style.display = 'none';  // Hide the grid
        hintDisplay.style.display = 'none'; //Hide the Hint text
        themeDisplay.style.display = 'none'; //hide the theme text
        document.getElementById('hint-button').style.display = 'none'; //hide all the buttons
        document.getElementById('theme-button').style.display = 'none';
        document.getElementById('mute-button').style.display = 'none';
        document.getElementById('grid-reset-button').style.display = 'none';
        document.getElementById('date-picker-container').style.display = 'none'; // Hide date picker
        bonusWordsContainer.style.display = 'none'; // Hide bonus words container

        if (typeof gtag === 'function') {
          gtag('event', 'game_completed', {
            'event_category': 'gameplay',
            'event_label': 'DownWords Game Completed',
            'value': timeLeft  // You could even track how long it took!
          });
        }
      }
    } else {
      // Check if it's a bonus word (in dictionary but not in target words)
      if (group.length === words[0].length && // Only check if the group has the right number of letters
          !words.includes(word) && 
          dictionary.has(word) && 
          word.length >= 3 && // Only consider words of at least 3 letters
          !bonusWordsFound.has(word)) { // Only show alert for new bonus words

        //Play a sound
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

// Initialize date picker and load puzzle when page loads
window.onload = () => {
  // Initialize the date picker
  initializeDatePicker();
  
  // Setup the archive toggle button
  setupArchiveToggle();
  
  // Hide the start button since we're loading immediately
  if (document.getElementById('start-button')) {
    document.getElementById('start-button').style.display = 'none';
  }
  
  // Load puzzle for the default date (today or most recent available date)
  loadPuzzleForDate();
  
  // Show dark mode toggle
  document.getElementById('mode-toggle').style.display = 'block';
  
  // Show archive toggle
  document.getElementById('archive-toggle').style.display = 'block';
};

// Hint Button functionality
document.getElementById('hint-button').addEventListener('click', () => {
  const selectedDate = document.getElementById('puzzle-date').value;
  const hintText = getHintByDate(selectedDate);
  hintDisplay.textContent = hintText;
  hintDisplay.style.display = 'block'; // Reveal the hint

  if (typeof gtag === 'function') {
    gtag('event', 'reveal_hint', {
      event_category: 'help',
      event_label: 'Reveal Hint Button',
      value: 1
    });
  }
});

// Mute button functionality
document.getElementById('mute-button').addEventListener('click', () => {
  isMuted = !isMuted;
  document.getElementById('mute-button').textContent = isMuted ? '🔊 Unmute' : '🔇 Mute';

  if (typeof gtag === 'function') {
    gtag('event', 'mute_toggle', {
      event_category: 'settings',
      event_label: 'Mute Button',
      value: 1
    });
  }
});

// Share button functionality
document.getElementById('shareButton').addEventListener('click', () => {
  const message = document.getElementById('gameCompletionMessage').value;
  
  // Twitter URL
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
  window.open(twitterUrl, '_blank');

  if (typeof gtag === 'function') {
    gtag('event', 'share_to_twitter', {
      event_category: 'social',
      event_label: 'Twitter Share Button',
      value: 1
    });
  }
});

// Theme Button functionality//
document.getElementById('theme-button').addEventListener('click', () => {
  const selectedDate = document.getElementById('puzzle-date').value;
  const themeText = getThemeByDate(selectedDate);
  themeDisplay.textContent = themeText;
  themeDisplay.style.display = 'block'; // Reveal the theme

  if (typeof gtag === 'function') {
    gtag('event', 'reveal_theme', {
      event_category: 'help',
      event_label: 'Reveal Theme Button',
      value: 1
    });
  }
});

// Dark Mode Toggle Functionality
const modeToggle = document.getElementById('mode-toggle');
let isDarkMode = false;

// Initialize in light mode by default
modeToggle.textContent = '☀️';
localStorage.setItem('darkMode', 'false');

// Only check for saved user preference if it exists
if (localStorage.getItem('darkMode') === 'true') {
  enableDarkMode();
}

modeToggle.addEventListener('click', () => {
  if (isDarkMode) {
    disableDarkMode();
  } else {
    enableDarkMode();
  }
});

function enableDarkMode() {
  document.body.classList.add('dark-mode');
  modeToggle.textContent = '🌙';
  isDarkMode = true;
  localStorage.setItem('darkMode', 'true');
  
  if (typeof gtag === 'function') {
    gtag('event', 'dark_mode_enabled', {
      event_category: 'settings',
      event_label: 'Dark Mode Toggle',
      value: 1
    });
  }
}

function disableDarkMode() {
  document.body.classList.remove('dark-mode');
  modeToggle.textContent = '☀️';
  isDarkMode = false;
  localStorage.setItem('darkMode', 'false');
  
  if (typeof gtag === 'function') {
    gtag('event', 'light_mode_enabled', {
      event_category: 'settings',
      event_label: 'Light Mode Toggle',
      value: 1
    });
  }
}

//Reset Button for StartOver
document.getElementById('reset-button').addEventListener('click', () => {
  location.reload(); // Reloads the page, effectively resetting everything

  if (typeof gtag === 'function') {
    gtag('event', 'start_over', {
      event_category: 'game_control',
      event_label: 'Start Over Button',
      value: 1
    });
  }
});

// Add copy button functionality
document.getElementById('copyButton').addEventListener('click', () => {
  document.getElementById('gameCompletionMessage').select();
  document.execCommand('copy');
  alert('Copied to clipboard!');

  if (typeof gtag === 'function') {
    gtag('event', 'copy_result', {
      event_category: 'engagement',
      event_label: 'Copy Result Button',
      value: 1
    });
  }
});

function showCompletionMessage() {
  const message = document.getElementById('gameCompletionMessage');
  message.style.display = 'block'; // Make it block first
  setTimeout(() => {
    message.classList.add('active'); // Then animate
  }, 10); // Tiny delay so the browser can register the transition
}

//Reset Grid Button 
document.getElementById('grid-reset-button').addEventListener('click', () => {
  selectedLetters = [];
  matchedWords = [];

  if (typeof gtag === 'function') {
    gtag('event', 'grid_reset', {
      event_category: 'game_control',
      event_label: 'Grid Reset Button',
      value: 1
    });
  }
  
  wordsContainer.innerHTML = '';
  grid.innerHTML = '';
  
  // Get the selected date
  const selectedDate = document.getElementById('puzzle-date').value;
  
  // Get words for the selected date
  const words = getWordsByDate(selectedDate);
  
  // Create the grid with these words
  createGrid(words);
});

// --- GAME DATA ---
// Word lists by date
const wordListsByDate = {
  '26 April 2025': ['SPACE', 'EARTH', 'ALIEN', 'ORBIT', 'COMET', 'SOLAR'],
  '27 April 2025': ['SUMMER', 'PICNIC', 'TRAVEL', 'GARDEN', 'BIKINI', 'SEASON'],
  '28 April 2025': ['NATURE', 'FOREST', 'LEAVES', 'STREAM', 'JUNGLE', 'FLOWER'],
  '29 April 2025': ['BOARD', 'GAMES', 'CARDS', 'TOKEN', 'SCORE', 'CATAN'],
  '30 April 2025': ['DRINK', 'LATTE', 'WATER', 'JUICE', 'SHAKE', 'GLASS'],
  '01 May 2025': ['BIRDS', 'EAGLE', 'ROBIN', 'GOOSE', 'CRANE', 'RAVEN'],
  '02 May 2025': ['SHAPES', 'CIRCLE', 'SQUARE', 'SPHERE', 'SPIRAL', 'OBLONG'],
  '03 May 2025': ['PASTA', 'SAUCE', 'PLATE', 'ITALY', 'PENNE', 'PESTO'],
  '04 May 2025': ['RIDDLE', 'CIPHER', 'ENIGMA', 'PUZZLE', 'JIGSAW', 'SUDOKU'],
  '05 May 2025': ['BODY', 'BUTT', 'NOSE', 'FOOT', 'NECK', 'KNEE'],
  '06 May 2025': ['GREEN', 'GRAPE', 'GRASS', 'ALGAE', 'FROGS', 'APPLE'],
  '07 May 2025': ['CAREER', 'DOCTOR', 'LAWYER', 'WAITER', 'BARBER', 'DANCER'],
  '08 May 2025': ['NOISE', 'CRASH', 'WHOOP', 'SHOUT', 'TRILL', 'CLICK'],
  '09 May 2025': ['ANIMALS', 'LEOPARD', 'RACCOON', 'HAMSTER', 'GIRAFFE', 'MEERKAT'],
  '10 May 2025': ['BOARD', 'GAMES', 'CARDS', 'TOKEN', 'SCORE', 'CHESS'],
  '11 May 2025': ['POKER', 'CARDS', 'FLUSH', 'TABLE', 'RAISE', 'CHIPS'],
  '12 May 2025': ['FICTION', 'TRAGEDY', 'MYSTERY', 'ROMANCE', 'FANTASY', 'HISTORY'],
  '13 May 2025': ['VIRUS', 'GERMS', 'EBOLA', 'HANTA', 'MUMPS', 'FEVER'],
  '14 May 2025': ['JOKER', 'PRANK', 'TRICK', 'CLOWN', 'FUNNY', 'LAUGH'],
  '15 May 2025': ['OPERA', 'TENOR', 'ARIAS', 'STAGE', 'DEATH', 'TOSCA'],
'16 May 2025': ['TOOLS', 'SPADE', 'LATHE', 'DRILL', 'SNIPS', 'POKER'],
'17 May 2025': ['STATES', 'ALASKA', 'HAWAII', 'KANSAS', 'NEVADA', 'OREGON'],
'18 May 2025': ['TATTOO', 'NEEDLE', 'DESIGN', 'LETTER', 'SAILOR', 'ANCHOR'],
'19 May 2025': ['KITTY', 'CLAWS', 'MIAOW', 'LASER', 'BEANS', 'FLUFF'],
'20 May 2025': ['THEME', 'TOPIC', 'FIELD', 'ISSUE', 'STORY', 'MOTIF'],
'21 May 2025': ['GRAIN', 'WHEAT', 'MAIZE', 'FLOUR', 'BREAD', 'SPELT'],
'22 May 2025': ['WOMAN', 'DAISY', 'CLARE', 'EMILY', 'WANDA', 'POPPY'],
'23 May 2025': ['CLOTH', 'DENIM', 'LINEN', 'SATIN', 'WEAVE', 'TWEED'],
'24 May 2025': ['UNDEAD', 'WRAITH', 'ZOMBIE', 'GHOULS', 'CORPSE', 'DRAUGR'],
'25 May 2025': ['WEDDED', 'COUPLE', 'SPOUSE', 'LAWFUL', 'SUITOR', 'FIANCÉ'],
'26 May 2025': ['FRUITS', 'LYCHEE', 'BANANA', 'CHERRY', 'ORANGE', 'PAPAYA'],
'27 May 2025': ['SAUCE', 'GRAVY', 'SYRUP', 'BROWN', 'SALSA', 'AIOLI'],
'28 May 2025': ['SCOUT', 'TROOP', 'BADGE', 'YOUTH', 'HIKES', 'MERIT'],
'29 May 2025': ['BABY', 'FOAL', 'LAMB', 'FAWN', 'CALF', 'JOEY'],
'30 May 2025': ['HERB', 'MINT', 'SAGE', 'MACE', 'DILL', 'GROW'],
'31 May 2025': ['WRITER', 'SCRIBE', 'AUTHOR', 'GOSPEL', 'COLUMN', 'LETTER'],
'1 Jun 2025': ['ZOMBIE', 'UNDEAD', 'GHOULS', 'BRAINS', 'PLANTS', 'CORPSE'],
'2 Jun 2025': ['CASTLE', 'KNIGHT', 'DRAGON', 'MAIDEN', 'STONES', 'TOWERS'],
'3 Jun 2025': ['SODAS', 'FANTA', 'PEPSI', 'FIZZY', 'MIXER', 'CRUSH'],
'4 Jun 2025': ['MONKEY', 'LANGUR', 'RHESUS', 'SIMIAN', 'BABOON', 'GIBBON'],
'5 Jun 2025': ['MUSIC', 'BLUES', 'METAL', 'INDIE', 'DISCO', 'SWING'],
'6 Jun 2025': ['ANIMAL', 'CANINE', 'FELINE', 'LUPINE', 'BOVINE', 'URSINE'],
'7 Jun 2025': ['APPAREL', 'CLOTHES', 'CHEMISE', 'GARMENT', 'DRAWERS', 'HOSIERY'],
'8 Jun 2025': ['ARTISAN', 'PAINTER', 'FARRIER', 'CRAFTER', 'PLUMBER', 'GLAZIER'],
'9 Jun 2025': ['MYTHIC', 'DRAGON', 'GOBLIN', 'KOBOLD', 'KELPIE', 'KRAKEN'],
'10 Jun 2025': ['GHOST', 'SHADE', 'HAUNT', 'SPOOK', 'SCARY', 'DEATH'],
'11 Jun 2025': ['BABY', 'MILK', 'POOP', 'WAIL', 'PRAM', 'NAPS'],
'12 Jun 2025': ['SMITH', 'COALS', 'METAL', 'FORGE', 'LATHE', 'ANVIL'],
'13 Jun 2025': ['RULER', 'WIDTH', 'DEPTH', 'METRE', 'SCALE', 'GAUGE'],
'14 Jun 2025': ['DIETARY', 'VITAMIN', 'MINERAL', 'CALCIUM', 'PROTEIN', 'CALORIE'],
'15 Jun 2025': ['ELEMENT', 'CALCIUM', 'BROMINE', 'SILICON', 'ARSENIC', 'MERCURY'],
'16 Jun 2025': ['EUROPE', 'FRANCE', 'SWEDEN', 'GREECE', 'TURKEY', 'POLAND'],
'17 Jun 2025': ['LEGUME', 'LENTIL', 'PEANUT', 'PULSES', 'KIDNEY', 'COWPEA'],
'18 Jun 2025': ['ROBOT', 'GOLEM', 'DROID', 'CYBER', 'GEARS', 'METAL'],
'19 Jun 2025': ['POTUS', 'OBAMA', 'GRANT', 'NIXON', 'ELECT', 'ADAMS'],
'20 Jun 2025': ['SLEEP', 'NIGHT', 'SNORE', 'QUIET', 'DREAM', 'DUVET'],
'21 Jun 2025': ['FLAVOUR', 'PARSLEY', 'PAPRIKA', 'MUSTARD', 'CAYENNE', 'OREGANO'],
'22 Jun 2025': ['FUNFAIR', 'SKELTER', 'COASTER', 'WALTZER', 'ARCADES', 'DODGEMS'],
'23 Jun 2025': ['PANTS', 'BRIEF', 'BOXER', 'THONG', 'TANGA', 'UNDER'],
'24 Jun 2025': ['GARAGE', 'HAMMER', 'CHISEL', 'PLIERS', 'WRENCH', 'TROWEL'],
'25 Jun 2025': ['SPICE', 'CUMIN', 'CHILI', 'CURRY', 'CLOVE', 'ANISE'],
'26 Jun 2025': ['FAMILY', 'SISTER', 'MOTHER', 'FATHER', 'COUSIN', 'NEPHEW'],
'27 Jun 2025': ['TASTE', 'SALTY', 'UMAMI', 'SWEET', 'SENSE', 'VOGUE'],
'28 Jun 2025': ['HAZARDS', 'VOLCANO', 'TSUNAMI', 'TORNADO', 'DROUGHT', 'INFERNO'],
'29 Jun 2025': ['HEROISM', 'BRAVERY', 'COURAGE', 'RESCUES', 'VALIANT', 'PROWESS'],
'30 Jun 2025': ['SPORT', 'RUGBY', 'COACH', 'PITCH', 'MATCH', 'POINT'],
'1 Jul 2025': ['TREES', 'CEDAR', 'TRUNK', 'ASPEN', 'MAPLE', 'ROWAN'],
'2 Jul 2025': ['GOWN', 'WRAP', 'ROBE', 'MINI', 'MAXI', 'BALL'],
'3 Jul 2025': ['HIKE', 'WALK', 'BOOT', 'LOST', 'MAPS', 'PACK'],
'4 Jul 2025': ['LADY', 'ANNA', 'BETH', 'LUCY', 'ELSA', 'KATE'],
'5 Jul 2025': ['HOLIDAY', 'SEASIDE', 'SUNBURN', 'AIRPORT', 'LUGGAGE', 'RELAXED'],
'6 Jul 2025': ['LEGENDS', 'CYCLOPS', 'CHIMERA', 'PHOENIX', 'CENTAUR', 'BANSHEE'],
'7 Jul 2025': ['MEAT', 'PORK', 'LOIN', 'RUMP', 'BEEF', 'VEAL'],
'8 Jul 2025': ['PETS', 'CATS', 'DOGS', 'FISH', 'MICE', 'RATS'],
'9 Jul 2025': ['POLE', 'BEAR', 'SNOW', 'COLD', 'SEAL', 'SLED'],
'10 Jul 2025': ['ROCK', 'GRIT', 'COLD', 'HARD', 'MINE', 'LAVA'],
'11 Jul 2025': ['SING', 'ALTO', 'BASS', 'REST', 'TUNE', 'BEAT'],
'12 Jul 2025': ['PICKLES', 'GHERKIN', 'CHUTNEY', 'CABBAGE', 'HERRING', 'VINEGAR'],
'13 Jul 2025': ['PIRATES', 'CUTLASS', 'PLUNDER', 'CAPTAIN', 'DUBLOON', 'LOOTING'],
'14 Jul 2025': ['BAKERY', 'DANISH', 'PASTRY', 'MUFFIN', 'LOAVES', 'ECLAIR'],
'15 Jul 2025': ['BEASTS', 'DONKEY', 'MONKEY', 'JAGUAR', 'COYOTE', 'POSSUM'],
'16 Jul 2025': ['BIKING', 'HELMET', 'PEDALS', 'SADDLE', 'BRAKES', 'WHEELS'],
'17 Jul 2025': ['TOOL', 'FORK', 'RAKE', 'VICE', 'PICK', 'ADZE'],
'18 Jul 2025': ['TREE', 'WOOD', 'LEAF', 'ROOT', 'PINE', 'TEAK'],
'19 Jul 2025': ['PUPPIES', 'SPANIEL', 'MONGREL', 'TERRIER', 'BULLDOG', 'LURCHER'],
'20 Jul 2025': ['PYJAMAS', 'LEGGING', 'DRAWERS', 'NIGHTIE', 'CHEMISE', 'FLANNEL'],
'21 Jul 2025': ['XMAS', 'NOEL', 'TREE', 'STAR', 'GIFT', 'CAKE'],
'22 Jul 2025': ['YARN', 'KNIT', 'HOOK', 'BALL', 'PURL', 'WOOL'],
'23 Jul 2025': ['BAKED', 'SCONE', 'TWIST', 'STRAW', 'DOUGH', 'BREAD'],
'24 Jul 2025': ['BEARS', 'TEDDY', 'POLAR', 'BROWN', 'BLACK', 'HONEY'],
'25 Jul 2025': ['BEAST', 'TROLL', 'HYDRA', 'SATYR', 'GNOME', 'HARPY'],
'26 Jul 2025': ['SCHOOLS', 'STUDENT', 'TEACHER', 'CLASSES', 'LEARNED', 'SUBJECT'],
'27 Jul 2025': ['SEAFOOD', 'LOBSTER', 'HERRING', 'ANCHOVY', 'OCTOPUS', 'SARDINE'],
'28 Jul 2025': ['BLOKE', 'CHRIS', 'TERRY', 'OSCAR', 'JAMES', 'STEVE'],
'29 Jul 2025': ['BLUES', 'BERRY', 'SKIES', 'AZURE', 'ROYAL', 'BLOOD'],
'30 Jul 2025': ['BOOKS', 'SPINE', 'NOVEL', 'COVER', 'PAGES', 'STORY'],
'31 Jul 2025': ['BRAIN', 'THINK', 'SMART', 'IDEAS', 'WAVES', 'STORM'],
'1 Aug 2025': ['BREAD', 'ROLLS', 'WHEAT', 'YEAST', 'FLOUR', 'BAKER'],
'2 Aug 2025': ['TEACHER', 'SCIENCE', 'ENGLISH', 'HISTORY', 'SUBJECT', 'PHYSICS'],
'3 Aug 2025': ['TOOLBOX', 'SPANNER', 'HANDSAW', 'SCRAPER', 'MEASURE', 'RATCHET'],
'4 Aug 2025': ['BUILD', 'BRICK', 'STONE', 'PLANK', 'SCREW', 'TILES'],
'5 Aug 2025': ['CAKES', 'SLICE', 'ICING', 'CREAM', 'SWEET', 'LAYER'],
'6 Aug 2025': ['CHILD', 'PUPPY', 'OWLET', 'LARVA', 'WHELP', 'CHICK'],
'7 Aug 2025': ['CHORE', 'CLEAN', 'SWEEP', 'BRUSH', 'SCRUB', 'SCOUR'],
'8 Aug 2025': ['CRAFT', 'PAINT', 'BUILD', 'MODEL', 'PAPER', 'HOBBY'],
'9 Aug 2025': ['UTILITY', 'WASHING', 'LAUNDRY', 'FREEZER', 'IRONING', 'STORAGE'],
'10 Aug 2025': ['VEGGIES', 'PARSNIP', 'CABBAGE', 'LETTUCE', 'PUMPKIN', 'SPROUTS'],
'11 Aug 2025': ['DRESS', 'SKIRT', 'STRAP', 'FRILL', 'TUNIC', 'SHIFT'],
'12 Aug 2025': ['DRIVE', 'LORRY', 'MOPED', 'TRUCK', 'MOTOR', 'WHEEL'],
'13 Aug 2025': ['FRUIT', 'LEMON', 'MELON', 'BERRY', 'MANGO', 'APPLE'],
'14 Aug 2025': ['HELLO', 'ALOHA', 'JAMBO', 'NIHAO', 'SELAM', 'HOWDY'],
'15 Aug 2025': ['HERBS', 'BASIL', 'THYME', 'CHIVE', 'FRESH', 'DRIED'],
'16 Aug 2025': ['VOLCANO', 'ERUPTED', 'KILAUEA', 'FISSURE', 'CALDERA', 'POMPEII'],
'17 Aug 2025': ['WEATHER', 'TORNADO', 'MONSOON', 'DRIZZLE', 'SUNBEAM', 'CYCLONE'],
'18 Aug 2025': ['JEANS', 'DENIM', 'FADED', 'SEAMS', 'RIVET', 'LEVIS'],
'19 Aug 2025': ['MASON', 'STONE', 'CARVE', 'LEVEL', 'BLOCK', 'DRILL'],
'20 Aug 2025': ['MONEY', 'DINAR', 'RUBLE', 'FRANC', 'KRONA', 'POUND'],
'21 Aug 2025': ['SENSE', 'SIGHT', 'SOUND', 'TOUCH', 'TASTE', 'SMELL'],
'22 Aug 2025': ['SHARK', 'GREAT', 'WHITE', 'NURSE', 'TIGER', 'TEETH'],
'23 Aug 2025': ['WEDDING', 'FLOWERS', 'BOUQUET', 'PROMISE', 'NUPTIAL', 'PARTNER'],
'24 Aug 2025': ['CREATURE', 'WEREWOLF', 'GARGOYLE', 'MINOTAUR', 'BASILISK', 'CERBERUS'],
'25 Aug 2025': ['SHOES', 'COURT', 'HEELS', 'SOLES', 'LACED', 'PUMPS'],
'26 Aug 2025': ['UNITS', 'LITRE', 'GRAMS', 'METRE', 'HERTZ', 'OUNCE'],
'27 Aug 2025': ['ARCADE', 'WINNER', 'CASINO', 'TOKENS', 'PRIZES', 'GAMING'],
'28 Aug 2025': ['ARTIST', 'SCULPT', 'SKETCH', 'CREATE', 'COLOUR', 'STUDIO'],
'29 Aug 2025': ['AUTHOR', 'AUSTEN', 'BLYTON', 'ASIMOV', 'ORWELL', 'BRONTË'],
'30 Aug 2025': ['MACHINES', 'AUTOMATA', 'COMPUTER', 'ANDROIDS', 'CYBERMEN', 'ARTIFICE'],
'31 Aug 2025': ['SYMMETRY', 'EVENNESS', 'REGULATE', 'MIRRORED', 'EQUALITY', 'CENTERED'],
'1 Sep 2025': ['COLOUR', 'YELLOW', 'INDIGO', 'PURPLE', 'MAROON', 'COBALT'],
'2 Sep 2025': ['DRAGON', 'LIZARD', 'FLAMES', 'WYVERN', 'FLYING', 'LEGEND'],
'3 Sep 2025': ['FABRIC', 'COTTON', 'CANVAS', 'JERSEY', 'FLEECE', 'THREAD'],
'4 Sep 2025': ['FLOWER', 'VIOLET', 'ORCHID', 'DAHLIA', 'ACACIA', 'CLOVER'],
'5 Sep 2025': ['GARDEN', 'FLOWER', 'MOWING', 'GAZEBO', 'HEDGES', 'FENCED'],
'6 Sep 2025': ['VACATION', 'SUNSHINE', 'SWIMMING', 'AIRPLANE', 'SUITCASE', 'PASSPORT'],
'7 Sep 2025': ['CARNIVORE', 'ALLIGATOR', 'WOLVERINE', 'MEATEATER', 'CROCODILE', 'CHAMELEON'],
'8 Sep 2025': ['HAIRDO', 'MULLET', 'MOHAWK', 'BRAIDS', 'BARNET', 'FRINGE'],
'9 Sep 2025': ['HORSES', 'SADDLE', 'RIDING', 'CANTER', 'GALLOP', 'BRIDLE'],
'10 Sep 2025': ['PICKLE', 'KIMCHI', 'GARLIC', 'ONIONS', 'BRINED', 'WALNUT'],
'11 Sep 2025': ['PIRATE', 'PARROT', 'PEGLEG', 'ISLAND', 'CANNON', 'MUTINY'],
'12 Sep 2025': ['SECRET', 'SNEAKY', 'HIDDEN', 'COVERT', 'CYPHER', 'SILENT'],
'13 Sep 2025': ['SEWING', 'THREAD', 'NEEDLE', 'BOBBIN', 'STITCH', 'FABRIC'],
'14 Sep 2025': ['SPICES', 'GARLIC', 'NUTMEG', 'PEPPER', 'GINGER', 'SESAME'],
'15 Sep 2025': ['BEAR', 'POOH', 'CLAW', 'MOON', 'FISH', 'PAWS'],
'16 Sep 2025': ['CAMP', 'FIRE', 'TENT', 'PEGS', 'WILD', 'WOOD'],
'17 Sep 2025': ['COSY', 'WARM', 'SOFT', 'HOME', 'NEST', 'SAFE'],
'18 Sep 2025': ['DUDE', 'CHAD', 'TONY', 'JEFF', 'ALAN', 'JACK'],
'19 Sep 2025': ['GENT', 'MIKE', 'KARL', 'TOBY', 'ANDY', 'MATT'],
'20 Sep 2025': ['GIRL', 'MARY', 'LILY', 'SARA', 'EMMA', 'ROSE'],
'21 Sep 2025': ['TALES', 'FAIRY', 'GRIMM', 'OGRES', 'DWARF', 'WITCH'],
'22 Sep 2025': ['SOUND', 'MIAOW', 'NEIGH', 'GROWL', 'CHEEP', 'CLUCK'],


  'default': ['SPACE', 'EARTH', 'ALIEN', 'ORBIT', 'COMET', 'SOLAR']
};

// Themes by date
const ThemesByDate = {
  '26 April 2025': ['Theme: SPACE'],
  '27 April 2025': ['Theme: SUMMER'],
  '28 April 2025': ['Theme: NATURE'],
  '29 April 2025': ['Theme: TRIAL'],
  '30 April 2025': ['Theme: DRINK'],
  '01 May 2025':  ['Theme: BIRDS'],
  '02 May 2025':  ['Theme: SHAPES'],
  '03 May 2025':  ['Theme: PASTA'],
  '04 May 2025':  ['Theme: PUZZLE'],
  '05 May 2025':  ['Theme: BODY'],
  '06 May 2025':  ['Theme: GREEN'],
  '07 May 2025':  ['Theme: CAREER'],
  '08 May 2025':  ['Theme: NOISE'],
  '09 May 2025':  ['Theme: ANIMALS'],
  '10 May 2025':  ['Theme: GAMES'],
  '11 May 2025':  ['Theme: POKER'],
  '12 May 2025':  ['Theme: FICTION'],
  '13 May 2025':  ['Theme: VIRUS'],
  '14 May 2025':  ['Theme: JOKER'],
  '15 May 2025': ['Theme: OPERA'],
'16 May 2025': ['Theme: TOOLS'],
'17 May 2025': ['Theme: STATES'],
'18 May 2025': ['Theme: TATTOO'],
'19 May 2025': ['Theme: KITTY'],
'20 May 2025': ['Theme: THEME'],
'21 May 2025': ['Theme: GRAIN'],
'22 May 2025': ['Theme: WOMAN'],
'23 May 2025': ['Theme: CLOTH'],
'24 May 2025': ['Theme: UNDEAD'],
'25 May 2025': ['Theme: WEDDED'],
'26 May 2025': ['Theme: FRUITS'],
'27 May 2025': ['Theme: SAUCE'],
'28 May 2025': ['Theme: SCOUT'],
'29 May 2025': ['Theme: BABY'],
'30 May 2025': ['Theme: HERB'],
'31 May 2025': ['Theme: WRITER'],
'1 Jun 2025': ['Theme: ZOMBIE'],
'2 Jun 2025': ['Theme: CASTLE'],
'3 Jun 2025': ['Theme: SODAS'],
'4 Jun 2025': ['Theme: MONKEY'],
'5 Jun 2025': ['Theme: MUSIC'],
'6 Jun 2025': ['Theme: ANIMAL'],
'7 Jun 2025': ['Theme: APPAREL'],
'8 Jun 2025': ['Theme: ARTISAN'],
'9 Jun 2025': ['Theme: MYTHIC'],
'10 Jun 2025': ['Theme: GHOST'],
'11 Jun 2025': ['Theme: BABY'],
'12 Jun 2025': ['Theme: SMITH'],
'13 Jun 2025': ['Theme: RULER'],
'14 Jun 2025': ['Theme: DIETARY'],
'15 Jun 2025': ['Theme: ELEMENT'],
'16 Jun 2025': ['Theme: EUROPE'],
'17 Jun 2025': ['Theme: LEGUME'],
'18 Jun 2025': ['Theme: ROBOT'],
'19 Jun 2025': ['Theme: POTUS'],
'20 Jun 2025': ['Theme: SLEEP'],
'21 Jun 2025': ['Theme: FLAVOUR'],
'22 Jun 2025': ['Theme: FUNFAIR'],
'23 Jun 2025': ['Theme: PANTS'],
'24 Jun 2025': ['Theme: GARAGE'],
'25 Jun 2025': ['Theme: SPICE'],
'26 Jun 2025': ['Theme: FAMILY'],
'27 Jun 2025': ['Theme: TASTE'],
'28 Jun 2025': ['Theme: HAZARDS'],
'29 Jun 2025': ['Theme: HEROISM'],
'30 Jun 2025': ['Theme: SPORT'],
'1 Jul 2025': ['Theme: TREES'],
'2 Jul 2025': ['Theme: GOWN'],
'3 Jul 2025': ['Theme: HIKE'],
'4 Jul 2025': ['Theme: LADY'],
'5 Jul 2025': ['Theme: HOLIDAY'],
'6 Jul 2025': ['Theme: LEGENDS'],
'7 Jul 2025': ['Theme: MEAT'],
'8 Jul 2025': ['Theme: PETS'],
'9 Jul 2025': ['Theme: POLE'],
'10 Jul 2025': ['Theme: ROCK'],
'11 Jul 2025': ['Theme: SING'],
'12 Jul 2025': ['Theme: PICKLES'],
'13 Jul 2025': ['Theme: PIRATES'],
'14 Jul 2025': ['Theme: BAKERY'],
'15 Jul 2025': ['Theme: BEASTS'],
'16 Jul 2025': ['Theme: BIKING'],
'17 Jul 2025': ['Theme: TOOL'],
'18 Jul 2025': ['Theme: TREE'],
'19 Jul 2025': ['Theme: PUPPIES'],
'20 Jul 2025': ['Theme: PYJAMAS'],
'21 Jul 2025': ['Theme: XMAS'],
'22 Jul 2025': ['Theme: YARN'],
'23 Jul 2025': ['Theme: BAKED'],
'24 Jul 2025': ['Theme: BEARS'],
'25 Jul 2025': ['Theme: BEAST'],
'26 Jul 2025': ['Theme: SCHOOLS'],
'27 Jul 2025': ['Theme: SEAFOOD'],
'28 Jul 2025': ['Theme: BLOKE'],
'29 Jul 2025': ['Theme: BLUES'],
'30 Jul 2025': ['Theme: BOOKS'],
'31 Jul 2025': ['Theme: BRAIN'],
'1 Aug 2025': ['Theme: BREAD'],
'2 Aug 2025': ['Theme: TEACHER'],
'3 Aug 2025': ['Theme: TOOLBOX'],
'4 Aug 2025': ['Theme: BUILD'],
'5 Aug 2025': ['Theme: CAKES'],
'6 Aug 2025': ['Theme: CHILD'],
'7 Aug 2025': ['Theme: CHORE'],
'8 Aug 2025': ['Theme: CRAFT'],
'9 Aug 2025': ['Theme: UTILITY'],
'10 Aug 2025': ['Theme: VEGGIES'],
'11 Aug 2025': ['Theme: DRESS'],
'12 Aug 2025': ['Theme: DRIVE'],
'13 Aug 2025': ['Theme: FRUIT'],
'14 Aug 2025': ['Theme: HELLO'],
'15 Aug 2025': ['Theme: HERBS'],
'16 Aug 2025': ['Theme: VOLCANO'],
'17 Aug 2025': ['Theme: WEATHER'],
'18 Aug 2025': ['Theme: JEANS'],
'19 Aug 2025': ['Theme: MASON'],
'20 Aug 2025': ['Theme: MONEY'],
'21 Aug 2025': ['Theme: SENSE'],
'22 Aug 2025': ['Theme: SHARK'],
'23 Aug 2025': ['Theme: WEDDING'],
'24 Aug 2025': ['Theme: CREATURE'],
'25 Aug 2025': ['Theme: SHOES'],
'26 Aug 2025': ['Theme: UNITS'],
'27 Aug 2025': ['Theme: ARCADE'],
'28 Aug 2025': ['Theme: ARTIST'],
'29 Aug 2025': ['Theme: AUTHOR'],
'30 Aug 2025': ['Theme: MACHINES'],
'31 Aug 2025': ['Theme: SYMMETRY'],
'1 Sep 2025': ['Theme: COLOUR'],
'2 Sep 2025': ['Theme: DRAGON'],
'3 Sep 2025': ['Theme: FABRIC'],
'4 Sep 2025': ['Theme: FLOWER'],
'5 Sep 2025': ['Theme: GARDEN'],
'6 Sep 2025': ['Theme: VACATION'],
'7 Sep 2025': ['Theme: CARNIVORE'],
'8 Sep 2025': ['Theme: HAIRDO'],
'9 Sep 2025': ['Theme: HORSES'],
'10 Sep 2025': ['Theme: PICKLE'],
'11 Sep 2025': ['Theme: PIRATE'],
'12 Sep 2025': ['Theme: SECRET'],
'13 Sep 2025': ['Theme: SEWING'],
'14 Sep 2025': ['Theme: SPICES'],
'15 Sep 2025': ['Theme: BEAR'],
'16 Sep 2025': ['Theme: CAMP'],
'17 Sep 2025': ['Theme: COSY'],
'18 Sep 2025': ['Theme: DUDE'],
'19 Sep 2025': ['Theme: GENT'],
'20 Sep 2025': ['Theme: GIRL'],
'21 Sep 2025': ['Theme: TALES'],
'22 Sep 2025': ['Theme: SOUND'],

  'default': ['Theme: SPACE']
};

// Hints by date
const HintsByDate = {
  '26 April 2025': ['Hint: The Final Frontier'],
  '27 April 2025': ['Hint: When schools are out and trips begin.'],
  '28 April 2025': ['Hint: Forests, rivers, and mountains belong here.'],
  '29 April 2025': ['Hint: Prosecution and defence meet here.'],
  '30 April 2025': ['Hint: Quenches thirst in many forms.'],
  '01 May 2025': ['Hint: They come in flocks or solo, soaring above.'],
  '02 May 2025': ['Hint: Geometric figures with defined sides or curves.'],
  '03 May 2025': ['Hint: You`ll find it on menus in Italian restaurants.'],
  '04 May 2025': ['Hint: Something that needs solving, often for fun'],
  '05 May 2025': ['The physical form of a person'],
  '06 May 2025': ['Colour of grass and leaves'],
  '07 May 2025': ['Job path or profession'],
  '08 May 2025': ['Things you can hear'],
  '09 May 2025': ['Found at the zoo'],
  '10 May 2025': ['Hint: Rules based activities played with friends and family at tables.'],
  '11 May 2025': ['Hint: Card game typically played in Casinos'],
  '12 May 2025': ['Hint: Different types of made-up books'],
  '13 May 2025': ['Hint: Tiny things that can make you very sick'],
  '14 May 2025': ['Hint: A non-serious person who tries to make you laugh'],
  '15 May 2025': ['Hint: Musical drama with powerful singing'],
'16 May 2025': ['Hint: Implements used for building and fixing things'],
'17 May 2025': ['Hint: Different regions of the USA'],
'18 May 2025': ['Hint: Permanent body art using needles and ink'],
'19 May 2025': ['Hint: A small feline pet and its characteristics'],
'20 May 2025': ['Hint: The main subject or idea being explored'],
'21 May 2025': ['Hint: Seeds and crops used to make flour and bread'],
'22 May 2025': ['Hint: Adult female humans and female names'],
'23 May 2025': ['Hint: Materials used to make clothing and textiles'],
'24 May 2025': ['Hint: Reanimated corpses from horror stories'],
'25 May 2025': ['Hint: Related to marriage and matrimony'],
'26 May 2025': ['Hint: Sweet edible plant parts containing seeds'],
'27 May 2025': ['Hint: Liquid condiments added to food'],
'28 May 2025': ['Hint: Youth organisation focused on outdoor skills'],
'29 May 2025': ['Hint: Very young offspring of various animals'],
'30 May 2025': ['Hint: Aromatic plants used for flavouring food'],
'31 May 2025': ['Hint: Person who creates books, articles or stories'],
'1 Jun 2025': ['Hint: Undead creatures that hunger for brains'],
'2 Jun 2025': ['Hint: Medieval fortified structure with towers'],
'3 Jun 2025': ['Hint: Carbonated sweet beverages in various flavours'],
'4 Jun 2025': ['Hint: Primates with long tails and no tails'],
'5 Jun 2025': ['Hint: Art form using sound, rhythm and melody'],
'6 Jun 2025': ['Hint: Living organisms in the kingdom Animalia'],
'7 Jun 2025': ['Hint: Clothing and items worn on the body'],
'8 Jun 2025': ['Hint: Skilled craftspeople who make things by hand'],
'9 Jun 2025': ['Hint: Legendary creatures from folklore and fantasy'],
'10 Jun 2025': ['Hint: Spirits of the dead that haunt the living'],
'11 Jun 2025': ['Hint: Human infant and related items'],
'12 Jun 2025': ['Hint: Metalworker who shapes iron and steel'],
'13 Jun 2025': ['Hint: Tool for measuring length or guiding straight lines'],
'14 Jun 2025': ['Hint: Relating to nutrition and food components'],
'15 Jun 2025': ['Hint: Basic substances from the periodic table'],
'16 Jun 2025': ['Hint: Countries on the European continent'],
'17 Jun 2025': ['Hint: Edible seeds from the legumes family'],
'18 Jun 2025': ['Hint: Mechanical beings with artificial intelligence'],
'19 Jun 2025': ['Hint: Presidents of the United States'],
'20 Jun 2025': ['Hint: The state of rest and unconsciousness'],
'21 Jun 2025': ['Hint: Tastes and seasonings that enhance food'],
'22 Jun 2025': ['Hint: Amusement park with rides and attractions'],
'23 Jun 2025': ['Hint: Undergarments worn below the waist'],
'24 Jun 2025': ['Hint: Workshop space and tools for repairs'],
'25 Jun 2025': ['Hint: Aromatic plant parts used to flavour food'],
'26 Jun 2025': ['Hint: People related to you by blood or marriage'],
'27 Jun 2025': ['Hint: Sensations detected by the tongue'],
'28 Jun 2025': ['Hint: Dangerous natural phenomena and disasters'],
'29 Jun 2025': ['Hint: Acts of bravery and courage'],
'30 Jun 2025': ['Hint: Competitive physical activities and games'],
'1 Jul 2025': ['Hint: Tall woody plants with trunks and branches'],
'2 Jul 2025': ['Hint: Formal dress worn by women for special occasions'],
'3 Jul 2025': ['Hint: Walking journey through natural areas'],
'4 Jul 2025': ['Hint: Formal or polite term for a woman'],
'5 Jul 2025': ['Hint: Time spent away from work or home for relaxation'],
'6 Jul 2025': ['Hint: Traditional stories of heroes and supernatural beings'],
'7 Jul 2025': ['Hint: Animal flesh consumed as food'],
'8 Jul 2025': ['Hint: Animals kept in homes for companionship'],
'9 Jul 2025': ['Hint: Long staff or rod, especially in cold regions'],
'10 Jul 2025': ['Hint: Hard mineral material forming Earth\'s crust'],
'11 Jul 2025': ['Hint: Using your voice to make musical sounds'],
'12 Jul 2025': ['Hint: Vegetables preserved in vinegar or brine'],
'13 Jul 2025': ['Hint: Seafaring robbers who plunder ships'],
'14 Jul 2025': ['Hint: Place where bread and pastries are made'],
'15 Jul 2025': ['Hint: Wild animals, especially large or dangerous ones'],
'16 Jul 2025': ['Hint: Cycling and related equipment'],
'17 Jul 2025': ['Hint: Implement used for a specific task or job'],
'18 Jul 2025': ['Hint: Woody plant with trunk and branches'],
'19 Jul 2025': ['Hint: Young dogs of various breeds'],
'20 Jul 2025': ['Hint: Comfortable clothing worn for sleeping'],
'21 Jul 2025': ['Hint: December holiday celebrating the birth of Christ'],
'22 Jul 2025': ['Hint: Spun thread used for knitting and crochet'],
'23 Jul 2025': ['Hint: Food items cooked in an oven'],
'24 Jul 2025': ['Hint: Large furry mammals with sharp claws'],
'25 Jul 2025': ['Hint: Dangerous or frightening mythical creature'],
'26 Jul 2025': ['Hint: Educational institutions for children and teens'],
'27 Jul 2025': ['Hint: Edible aquatic animals like fish and shellfish'],
'28 Jul 2025': ['Hint: Informal term for a man'],
'29 Jul 2025': ['Hint: Music genre and shades of blue colour'],
'30 Jul 2025': ['Hint: Written works bound together with pages'],
'31 Jul 2025': ['Hint: Organ in your head that controls thought'],
'1 Aug 2025': ['Hint: Baked food made from flour, water and yeast'],
'2 Aug 2025': ['Hint: Person who educates students in a school'],
'3 Aug 2025': ['Hint: Container for storing and carrying tools'],
'4 Aug 2025': ['Hint: To construct or assemble something'],
'5 Aug 2025': ['Hint: Sweet baked desserts with frosting'],
'6 Aug 2025': ['Hint: Young human being below the age of puberty'],
'7 Aug 2025': ['Hint: Routine household task or duty'],
'8 Aug 2025': ['Hint: Making things by hand as a hobby or profession'],
'9 Aug 2025': ['Hint: Services and appliances for household convenience'],
'10 Aug 2025': ['Hint: Edible plants typically eaten with main courses'],
'11 Aug 2025': ['Hint: Garment worn by women and girls'],
'12 Aug 2025': ['Hint: Operating a vehicle on roads'],
'13 Aug 2025': ['Hint: Sweet edible plant parts containing seeds'],
'14 Aug 2025': ['Hint: Greeting words from different languages'],
'15 Aug 2025': ['Hint: Aromatic plants used in cooking'],
'16 Aug 2025': ['Hint: Mountain that erupts with lava and ash'],
'17 Aug 2025': ['Hint: Atmospheric conditions like rain, sun, and wind'],
'18 Aug 2025': ['Hint: Denim pants worn by all genders'],
'19 Aug 2025': ['Hint: Craftsperson who works with stone'],
'20 Aug 2025': ['Hint: Currency used for buying goods and services'],
'21 Aug 2025': ['Hint: The five ways humans perceive the world'],
'22 Aug 2025': ['Hint: Predatory fish with multiple rows of teeth'],
'23 Aug 2025': ['Hint: Ceremony where two people get married'],
'24 Aug 2025': ['Hint: Monstrous being from mythology or fiction'],
'25 Aug 2025': ['Hint: Footwear for protecting and covering feet'],
'26 Aug 2025': ['Hint: Standard measurements for physical quantities'],
'27 Aug 2025': ['Hint: Place with games that require tokens or coins'],
'28 Aug 2025': ['Hint: Person who creates visual works of art'],
'29 Aug 2025': ['Hint: Person who writes books or literary works'],
'30 Aug 2025': ['Hint: Devices that perform automated tasks'],
'31 Aug 2025': ['Hint: Balance and proportion in design or nature'],
'1 Sep 2025': ['Hint: Visual property of objects produced by light waves'],
'2 Sep 2025': ['Hint: Large mythical reptile that breathes fire'],
'3 Sep 2025': ['Hint: Woven material used to make clothes and furnishings'],
'4 Sep 2025': ['Hint: Reproductive structure of plants with petals'],
'5 Sep 2025': ['Hint: Area of land for growing plants and relaxing'],
'6 Sep 2025': ['Hint: Trip taken for pleasure and relaxation'],
'7 Sep 2025': ['Hint: Animals that primarily eat meat'],
'8 Sep 2025': ['Hint: Style in which hair is cut or arranged'],
'9 Sep 2025': ['Hint: Large hoofed mammals used for riding'],
'10 Sep 2025': ['Hint: Preserved vegetable in vinegar or brine'],
'11 Sep 2025': ['Hint: Seafaring robber who attacks ships'],
'12 Sep 2025': ['Hint: Information kept hidden from others'],
'13 Sep 2025': ['Hint: Craft of joining fabric with needle and thread'],
'14 Sep 2025': ['Hint: Flavourful plant parts used in cooking'],
'15 Sep 2025': ['Hint: Large furry mammal with sharp claws'],
'16 Sep 2025': ['Hint: Temporary shelter used outdoors'],
'17 Sep 2025': ['Hint: Warm and comfortable feeling'],
'18 Sep 2025': ['Hint: Casual term for a man or guy'],
'19 Sep 2025': ['Hint: Polite term for a well-mannered man'],
'20 Sep 2025': ['Hint: Young female human and female names'],
'21 Sep 2025': ['Hint: Stories passed down through generations'],
'22 Sep 2025': ['Hint: Noises made by different animals'],
  'default': ['Hint: The Final Frontier']
};

// Puzzle Setter by date
const puzzleSetterbyDate = {

  '14 May 2025': ['Gino'],
  'default': ['Kit Cat']
};


