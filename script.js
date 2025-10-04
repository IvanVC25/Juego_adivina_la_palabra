// Variables globales
let TOPICOS_DE_ESPANOL = {};
let current = { solucion: '', pista: '' };
let revealed = [];
let lives = 6;
const maxLives = 6;
let gameStats = {
    wordsGuessed: 0,
    currentStreak: 0,
    totalGames: 0,
    record: parseInt(localStorage.getItem('ahorcadoRecord') || '0')
};

// Referencias a elementos del DOM
const topicSelect = document.getElementById('topicSelect');
const keyboard = document.getElementById('keyboard');
const wordDisplay = document.getElementById('wordDisplay');
const message = document.getElementById('message');
const livesCount = document.getElementById('livesCount');
const eyeL = document.getElementById('eyeL');
const eyeR = document.getElementById('eyeR');
const mascot = document.getElementById('mascot');
const hintBtn = document.getElementById('hintBtn');
const hintModal = document.getElementById('hintModal');
const hintShort = document.getElementById('hintShort');
const hintFull = document.getElementById('hintFull');
const newGameBtn = document.getElementById('newGame');
const giveUpBtn = document.getElementById('giveUp');

// Referencias a las nuevas pantallas
const welcomeScreen = document.getElementById('welcomeScreen');
const gameScreen = document.getElementById('gameScreen');
const congratulationsScreen = document.getElementById('congratulationsScreen');
const startGameBtn = document.getElementById('startGameBtn');
const continueGameBtn = document.getElementById('continueGameBtn');
const restartGameBtn = document.getElementById('restartGameBtn');
const wordsGuessedEl = document.getElementById('wordsGuessed');
const currentStreakEl = document.getElementById('currentStreak');
const congratsMessage = document.getElementById('congratsMessage');
const recordDisplay = document.getElementById('recordDisplay');

// Cargar datos desde JSON
async function loadTopics() {
    try {
        const response = await fetch('./topicos.json');
        TOPICOS_DE_ESPANOL = await response.json();
        populateTopicSelect();
        // No iniciar automáticamente, esperar a que el usuario haga clic en "Comenzar"
    } catch (error) {
        console.error('Error al cargar los tópicos:', error);
        message.textContent = 'Error al cargar los datos del juego.';
    }
}

// Poblar el selector de tópicos
function populateTopicSelect() {
    topicSelect.innerHTML = '';
    for (const topic in TOPICOS_DE_ESPANOL) {
        const option = document.createElement('option');
        option.value = topic;
        option.textContent = topic.replace('_', ' ');
        topicSelect.appendChild(option);
    }
}

// Crear el teclado
function createKeyboard() {
    const letters = 'QWERTYUIOPASDFGHJKLÑZXCVBNM';
    keyboard.innerHTML = '';
    
    for (let letter of letters) {
        const btn = document.createElement('button');
        btn.classList.add('key');
        btn.textContent = letter;
        btn.dataset.letter = letter;
        btn.onclick = onKeyClick;
        keyboard.appendChild(btn);
    }
}

// Elegir palabra aleatoria del tópico
function pickRandomWord(topic) {
    const words = TOPICOS_DE_ESPANOL[topic];
    if (!words || words.length === 0) return null;
    return words[Math.floor(Math.random() * words.length)];
}

// Preparar array de letras reveladas
function prepareRevealed(word) {
    revealed = [];
    for (let i = 0; i < word.length; i++) {
        if (word[i] === ' ') {
            revealed[i] = ' ';
        } else {
            revealed[i] = '_';
        }
    }
}

// Renderizar palabra en pantalla
function renderWord() {
    wordDisplay.innerHTML = revealed.map(letter => 
        letter === ' ' ? '<span class="space"></span>' : 
        `<span class="letter">${letter}</span>`
    ).join('');
}

function onKeyClick(e) {
    const btn = e.currentTarget;
    if (btn.classList.contains('disabled')) return;
    const letter = btn.dataset.letter;
    checkLetter(letter, btn);
}

function normalize(s) {
    return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();
}

function checkLetter(letter, btn) {
    const normSol = normalize(current.solucion);
    const normLetter = normalize(letter);
    let found = false;
    for (let i = 0; i < current.solucion.length; i++) {
        if (normSol[i] === normLetter) {
            revealed[i] = current.solucion[i];
            found = true;
        }
    }
    if (found) {
        btn.classList.add('ok', 'disabled');
        renderWord(); 
        checkWin();
    } else {
        btn.classList.add('bad', 'disabled');
        loseLife();
    }
}

function checkWin() {
    if (revealed.join('') === current.solucion) {
        message.textContent = '¡Ganaste! 🎉'; 
        disableAllKeys();
        gameStats.wordsGuessed++;
        gameStats.currentStreak++;
        gameStats.totalGames++;
        
        // Mostrar pantalla de felicitaciones después de un breve delay
        setTimeout(() => {
            showCongratulations();
        }, 1500);
    }
}

function disableAllKeys() {
    keyboard.querySelectorAll('.key').forEach(k => k.classList.add('disabled'));
}

function updateLivesDisplay() {
    livesCount.textContent = lives;
    const lost = maxLives - lives;
    eyeL.classList.toggle('dead', lost >= 1);
    eyeR.classList.toggle('dead', lost >= 3);
    mascot.classList.toggle('dead', lives <= 0);
}

function loseLife() {
    lives = Math.max(0, lives - 1);
    updateLivesDisplay();
    if (lives <= 0) {
        message.textContent = 'Se acabaron las vidas. :('; 
        revealSolution(); 
        disableAllKeys();
        gameStats.currentStreak = 0; // Resetear racha
        gameStats.totalGames++;
    }
}

function revealSolution() {
    for (let i = 0; i < current.solucion.length; i++) {
        if (revealed[i] === '_') revealed[i] = current.solucion[i];
    }
    renderWord();
}

function startNew(topic) {
    message.textContent = '';
    const picked = pickRandomWord(topic);
    if (!picked) { 
        message.textContent = 'No hay palabras.'; 
        return; 
    }
    current = { solucion: picked.solucion.toUpperCase(), pista: picked.pista };
    prepareRevealed(current.solucion);
    lives = maxLives; 
    updateLivesDisplay();
    hintFull.textContent = current.pista;
    renderWord();
    keyboard.querySelectorAll('.key').forEach(k => k.className = 'key');
}

// Funciones para manejar las pantallas
function showWelcomeScreen() {
    welcomeScreen.style.display = 'flex';
    gameScreen.style.display = 'none';
    congratulationsScreen.classList.remove('show');
}

function showGameScreen() {
    welcomeScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
    congratulationsScreen.classList.remove('show');
}

function showCongratulations() {
    updateStatsDisplay();
    congratulationsScreen.classList.add('show');
}

function updateStatsDisplay() {
    wordsGuessedEl.textContent = gameStats.wordsGuessed;
    currentStreakEl.textContent = gameStats.currentStreak;
    
    // Actualizar récord si es necesario
    if (gameStats.currentStreak > gameStats.record) {
        gameStats.record = gameStats.currentStreak;
        localStorage.setItem('ahorcadoRecord', gameStats.record.toString());
    }
    
    // Mensaje personalizado basado en la racha
    let message = '';
    if (gameStats.currentStreak >= 10) {
        message = '¡Increíble! ¡Eres un maestro de las palabras! 🌟';
    } else if (gameStats.currentStreak >= 5) {
        message = '¡Excelente! ¡Estás en racha! 🔥';
    } else if (gameStats.currentStreak >= 3) {
        message = '¡Muy bien! ¡Sigue así! 👏';
    } else {
        message = '¡Felicitaciones por resolver esta palabra! 🎯';
    }
    congratsMessage.textContent = message;
}

function resetGame() {
    gameStats.wordsGuessed = 0;
    gameStats.currentStreak = 0;
    gameStats.totalGames = 0;
    // No resetear el récord
    showWelcomeScreen();
}

function updateRecordDisplay() {
    if (recordDisplay) {
        recordDisplay.textContent = `${gameStats.record} Palabras`;
    }
}

function continueGame() {
    congratulationsScreen.classList.remove('show');
    startNew(topicSelect.value);
}

// Event listeners
hintBtn.onclick = () => hintModal.classList.add('show');
document.getElementById('closeHint').onclick = () => hintModal.classList.remove('show');
hintModal.onclick = e => { if (e.target === hintModal) hintModal.classList.remove('show'); };
newGameBtn.onclick = () => startNew(topicSelect.value);
giveUpBtn.onclick = () => { revealSolution(); disableAllKeys(); message.textContent = 'Te rendiste.' };
topicSelect.onchange = () => startNew(topicSelect.value);

// Event listeners para las nuevas pantallas
startGameBtn.onclick = () => {
    showGameScreen();
    startNew(Object.keys(TOPICOS_DE_ESPANOL)[0]);
};

continueGameBtn.onclick = continueGame;
restartGameBtn.onclick = resetGame;

document.addEventListener('keydown', e => {
    const key = e.key.toUpperCase();
    if (key.length === 1 && gameScreen.style.display !== 'none') {
        const btn = Array.from(keyboard.querySelectorAll('.key')).find(k => k.dataset.letter === key);
        if (btn) btn.click();
    }
});

// Inicializar el juego
document.addEventListener('DOMContentLoaded', () => {
    createKeyboard();
    loadTopics();
    updateRecordDisplay();
    showWelcomeScreen();
});