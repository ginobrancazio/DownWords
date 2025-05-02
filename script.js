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
  '10 May 2025': ['BOARD', 'GAMES', 'CARDS', 'TOKEN', 'SCORE', 'CHESS'],
  '11 May 2025': ['POKER', 'CARDS', 'FLUSH', 'TABLE', 'RAISE', 'CHIPS'],


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
  '10 May 2025':  ['Theme: GAMES'],
  '11 May 2025':  ['Theme: POKER'],
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
  '03 May 2025': ['Hint: You’ll find it on menus in Italian restaurants.'],
  '10 May 2025': ['Hint: Rules based activities played with friends and family at tables.'],
  '11 May 2025': ['Hint: Card game typically played in Casinos'],
  'default': ['Hint: The Final Frontier']
};

//hide timer as default
timerDisplay.style.display = 'none';

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

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
}

// get theme based on date in list above
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

// get Hint based on date in list above
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


//get word list
const words = getWordsForToday();

// Hint and Theme Text
const hintText = getHintForToday();
const themeText = getThemeForToday();

let selectedLetters = [];
let matchedWords = [];
let isMuted = false;


const colours = ['#a0d2eb', '#ffc6a0', '#c8e6a0', '#f7a0eb', '#d0a0ff'];

// Set the hint and theme as hidden by default
hintDisplay.style.display = 'none';
themeDisplay.style.display = 'none';

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

// Update word groups and check for matches
function updateWordGroups() {
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
const averageTimeInSeconds = 131;     
const blocklength = averageTimeInSeconds/8
        
// Build the share message
let message = `I completed today's DownWords in ${formatTime(timeLeft)} compared to the average of ${formatTime(averageTimeInSeconds)}\n`;

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
  message += `\n${averageBlocksString} - Average (${formatTime(averageTimeInSeconds)}) \n`;
        
 // Both hint and theme are hidden, do something here
if (getComputedStyle(hintDisplay).display === 'none' && getComputedStyle(themeDisplay).display === 'none') {
  message += `\n🏆 - No hints`;
}
        
 //check player speed   
const averageTime = 241;

if (timeLeft < averageTime * 0.2) {
  message += `\n👑 - Top 20% of players today!`;
} else if (timeLeft < averageTime) {
  message += `\n🏅 - Top 50% of players today`;
}
        
message += `\n`;
message += `\nwww.DownWordsGame.com`;
message += `\n#DownWordsGame`;
        
// Show the text box with the completion message
//document.getElementById('gameCompletionMessage').style.display = 'block';
 showCompletionMessage();

// Populate the text box with the completion message
document.getElementById('gameCompletionMessage').value = message

//show the copy and share buttons
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

        if (typeof gtag === 'function') {
          gtag('event', 'game_completed', {
            'event_category': 'gameplay',
            'event_label': 'DownWords Game Completed',
            'value': timeLeft  // You could even track how long it took!
            });
          }


      }
    } else {
      wordDiv.style.backgroundColor = colours[i % colours.length];
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

// Start the timer when the page loads
window.onload = () => {
  startTimer();
};

// Hint Button functionality
document.getElementById('hint-button').addEventListener('click', () => {
  hintDisplay.textContent = hintText;
  hintDisplay.style.display = 'block'; // Reveal the hint

  gtag('event', 'reveal_hint', {
    event_category: 'help',
    event_label: 'Reveal Hint Button',
    value: 1
  });
  
});

// Mute button functionality
document.getElementById('mute-button').addEventListener('click', () => {
  isMuted = !isMuted;
  document.getElementById('mute-button').textContent = isMuted ? '🔊 Unmute' : '🔇 Mute';

gtag('event', 'mute_toggle', {
    event_category: 'settings',
    event_label: 'Mute Button',
    value: 1
  });
  
});

// Share button functionality
document.getElementById('shareButton').addEventListener('click', () => {
  const message = document.getElementById('gameCompletionMessage').value;
  
  // Twitter URL
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
  window.open(twitterUrl, '_blank');

   gtag('event', 'share_to_twitter', {
    event_category: 'social',
    event_label: 'Twitter Share Button',
    value: 1
  });
  
});

// Theme Button functionality//
document.getElementById('theme-button').addEventListener('click', () => {
  themeDisplay.textContent = themeText;
  themeDisplay.style.display = 'block'; // Reveal the theme

  gtag('event', 'reveal_theme', {
    event_category: 'help',
    event_label: 'Reveal Theme Button',
    value: 1
  });
  
});

//Reset Button for StartOver
document.getElementById('reset-button').addEventListener('click', () => {
    location.reload(); // Reloads the page, effectively resetting everything

gtag('event', 'start_over', {
    event_category: 'game_control',
    event_label: 'Start Over Button',
    value: 1
  });
  
});
//
//Hide Timer Button
// document.getElementById('hide-timer-button').addEventListener('click', () => {
// const hideTimerBtn = document.getElementById('hide-timer-button');
//
//  if (timerDisplay.style.display === 'none') {
//  timerDisplay.style.display = 'block';
//  hideTimerBtn.textContent = 'Hide Timer';
//  } else {
//  timerDisplay.style.display = 'none';
//  hideTimerBtn.textContent = 'Show Timer';
//  }
//  });

// Add copy button functionality
document.getElementById('copyButton').addEventListener('click', () => {
  document.getElementById('gameCompletionMessage').select();
  document.execCommand('copy');
  alert('Copied to clipboard!');

    gtag('event', 'copy_result', {
    event_category: 'engagement',
    event_label: 'Copy Result Button',
    value: 1
  });
  
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
selectedLetters = []
matchedWords = [];

gtag('event', 'grid_reset', {
    event_category: 'game_control',
    event_label: 'Grid Reset Button',
    value: 1
  });
  
wordsContainer.innerHTML = '';
grid.innerHTML = '';
  
  
  
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
        // Add to selectedLetters
        selectedLetters.push({ letter, element: div, rowIndex, colIndex });
        div.classList.add('selected');
      }

      updateWordGroups();
    });

    grid.appendChild(div);
  });
});

  
  
});
