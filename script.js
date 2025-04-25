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

const words = ['SPACE', 'EARTH', 'ALIEN', 'ORBIT', 'COMET', 'SOLAR']; // Your words list

// Hint and Theme Text
const hintText = "Hint: The final frontier";
const themeText = "Theme: Space";

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
        successMessage.textContent = `Congratulations! You found all the words in ${timeLeft} seconds.`;
        successMessage.style.color = 'green';  // You can style it as needed
        if (!isMuted){
        successSound.play(); // Play success sound
        }
        // Remove the grid once all words are matched
        grid.style.display = 'none';  // Hide the grid
         hintDisplay.style.display = 'none'; //Hide the Hint text
          themeDisplay.style.display = 'none'; //hide the theme text
        document.getElementById('hint-button').style.display = 'none'; //hide all the buttons
        document.getElementById('theme-button').style.display = 'none';
        document.getElementById('mute-button').style.display = 'none';
        document.getElementById('grid-reset-button').style.display = 'none';

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
});



// Mute button functionality
document.getElementById('mute-button').addEventListener('click', () => {
  isMuted = !isMuted;
  document.getElementById('mute-button').textContent = isMuted ? '🔊 Unmute' : '🔇 Mute';
});


// Theme Button functionality
document.getElementById('theme-button').addEventListener('click', () => {
  themeDisplay.textContent = themeText;
  themeDisplay.style.display = 'block'; // Reveal the theme
});

//Reset Button for StartOver
document.getElementById('reset-button').addEventListener('click', () => {
    location.reload(); // Reloads the page, effectively resetting everything
});

//Reset Grid Button 
document.getElementById('grid-reset-button').addEventListener('click', () => {
selectedLetters = []
matchedWords = [];
  
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
