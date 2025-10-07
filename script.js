// --- Configuración de la API ---
const API_CONFIG = {
    BASE_URL: 'http://puramente.test/api/gamedata/game/5/category/espanol'
};

// Variables globales
let TOPICOS_DE_ESPANOL = {};
let current = { solucion: '', pista: '' };
let revealed = [];
let lives = 6;
const maxLives = 6;
let selectedTopic = ''; // Variable para almacenar el tema seleccionado
let usedWords = []; // Array para almacenar palabras ya usadas
let gameStats = {
    wordsGuessed: 0,
    currentStreak: 0,
    totalGames: 0,
    record: parseInt(localStorage.getItem('ahorcadoRecord') || '0')
};

// Variables para tracking del juego para API
let gameSession = {
    startTime: null,
    totalChallenges: 0,
    correctChallenges: 0,
    gameStarted: false,
    obtainedScore: 0,        // Puntos reales obtenidos
    maxPossibleScore: 0      // Puntos máximos posibles basados en palabras intentadas
};

// Sistema de puntaje
let gameScore = {
    currentScore: 0,
    sessionScore: 0,
    bestScore: parseInt(localStorage.getItem('ahorcadoBestScore') || '0'),
    wordStartTime: 0,
    incorrectGuesses: 0
};

// Constantes de puntaje
const SCORING = {
    BASE_POINTS: 10,
    LIFE_BONUS: 2,
    SPEED_BONUS: 5,
    SPEED_THRESHOLD: 30, // segundos
    NO_ERRORS_BONUS: 8,
    FEW_ERRORS_BONUS: 4,
    STREAK_BONUS: {
        3: 5,
        5: 10,
        10: 20
    }
};

// Referencias a elementos del DOM
const topicSelectWelcome = document.getElementById('topicSelectWelcome');
const backToHomeBtn = document.getElementById('backToHomeBtn');
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

// Referencias para el modal de confirmación
const confirmModal = document.getElementById('confirmModal');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');
const confirmAccept = document.getElementById('confirmAccept');
const confirmCancel = document.getElementById('confirmCancel');

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

// Referencias para el sistema de puntaje
const sessionScoreEl = document.getElementById('sessionScore');
const bestScoreEl = document.getElementById('bestScore');
const currentStreakGameEl = document.getElementById('currentStreakGame');
const sessionScoreCongratsEl = document.getElementById('sessionScoreCongrats');

// Función para calcular puntaje máximo posible para una palabra
function calculateMaxPossibleScore() {
    // Puntaje máximo = base + todas las vidas + rapidez + sin errores + bonus de racha actual
    let maxScore = SCORING.BASE_POINTS;
    
    // Bonus por todas las vidas (máximo posible)
    maxScore += maxLives * SCORING.LIFE_BONUS;
    
    // Bonus por rapidez (asumiendo que se puede completar rápido)
    maxScore += SCORING.SPEED_BONUS;
    
    // Bonus por no tener errores
    maxScore += SCORING.NO_ERRORS_BONUS;
    
    // Bonus por racha (basado en la racha actual + 1)
    const potentialStreak = gameStats.currentStreak + 1;
    if (potentialStreak >= 10) {
        maxScore += SCORING.STREAK_BONUS[10];
    } else if (potentialStreak >= 5) {
        maxScore += SCORING.STREAK_BONUS[5];
    } else if (potentialStreak >= 3) {
        maxScore += SCORING.STREAK_BONUS[3];
    }
    
    return maxScore;
}

// Función para obtener user_id de la URL
function getUserIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('user_id');
}

// Función para enviar datos al API
async function sendGameDataToAPI() {
    const userId = getUserIdFromUrl();
    
    if (!userId) {
        console.log('No se encontró user_id en la URL, no se enviarán datos al API');
        return false;
    }
    
    const gameData = {
        user_id: userId,
        game_id: 5,
        obtained_score: gameSession.obtainedScore,     // Puntos reales obtenidos
        max_possible_score: gameSession.maxPossibleScore, // Puntos máximos posibles
        time_spent: gameSession.startTime ? Math.floor((Date.now() - gameSession.startTime) / 1000) : 0
    };
    
    try {
        console.log('Enviando datos al API:', gameData);
        
        
        const response = await fetch('https://puramentebackend.onrender.com/api/game-attempts/from-game', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(gameData)
        });
        
        if (response.ok) {
            console.log('Datos enviados exitosamente al API');
            return true;
        } else {
            console.error('Error al enviar datos al API:', response.status);
            return false;
        }
    } catch (error) {
        console.error('Error de conexión al enviar datos al API:', error);
        return false;
    }
}

// --- Funciones para mostrar/ocultar mensaje de carga ---
function showLoadingMessage(message) {
    const topicSelect = document.getElementById('topicSelectWelcome');
    if (topicSelect) {
        topicSelect.innerHTML = `<option value="">${message}</option>`;
        topicSelect.disabled = true;
    }
}

function hideLoadingMessage() {
    const topicSelect = document.getElementById('topicSelectWelcome');
    if (topicSelect) {
        topicSelect.disabled = false;
    }
}

// --- Carga de datos desde API ---
async function loadGameDataFromAPI() {
    try {
        const response = await fetch(API_CONFIG.BASE_URL);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const apiData = await response.json();
        
        // Transformar la estructura de la API al formato que usa el juego
        const gameTopics = {};
        
        if (apiData.data && Array.isArray(apiData.data)) {
            apiData.data.forEach(item => {
                // Extraer los datos de cada subcategoría
                if (item.gamedata && typeof item.gamedata === 'object') {
                    Object.keys(item.gamedata).forEach(subject => {
                        gameTopics[subject] = item.gamedata[subject];
                    });
                }
            });
        }
        
        return gameTopics;
    } catch (error) {
        console.error('Error al cargar datos desde API:', error);
        throw error;
    }
}

// --- Función principal para cargar datos del juego ---
async function loadGameData() {
    showLoadingMessage('Cargando datos desde API...');
    
    try {
        const gameData = await loadGameDataFromAPI();
        hideLoadingMessage();
        return gameData;
    } catch (error) {
        hideLoadingMessage();
        showLoadingMessage('Error al cargar datos');
        throw error;
    }
}

// Cargar datos desde API (reemplaza la función anterior que usaba JSON)
async function loadTopics() {
    try {
        showLoadingMessage('Conectando con servidor...');
        TOPICOS_DE_ESPANOL = await loadGameData();
        
        // Verificar que se cargaron datos
        if (Object.keys(TOPICOS_DE_ESPANOL).length === 0) {
            throw new Error('No se encontraron datos de juego');
        }
        
        populateTopicSelect();
        console.log('Datos cargados exitosamente desde API:', Object.keys(TOPICOS_DE_ESPANOL));
    } catch (error) {
        console.error('Error al cargar los tópicos desde API:', error);
        
        // Mostrar mensaje de error al usuario
        showLoadingMessage('Error de conexión');
        
        // Intentar cargar datos de respaldo desde JSON local si existe
        try {
            console.log('Intentando cargar datos de respaldo desde JSON local...');
            const response = await fetch('./topicos.json');
            if (response.ok) {
                TOPICOS_DE_ESPANOL = await response.json();
                populateTopicSelect();
                showLoadingMessage('Datos locales cargados');
                console.log('Datos de respaldo cargados desde JSON local');
            } else {
                throw new Error('No se pudo cargar respaldo local');
            }
        } catch (backupError) {
            console.error('Error al cargar respaldo local:', backupError);
            showLoadingMessage('Error: Sin conexión');
            
            // Mostrar modal de error al usuario
            setTimeout(() => {
                showConfirmDialog(
                    'Error de Conexión',
                    'No se pudieron cargar los datos del juego. Por favor, verifica tu conexión a internet e inténtalo de nuevo.',
                    () => {
                        location.reload(); // Recargar la página
                    }
                );
            }, 1000);
        }
    }
}

// Poblar el selector de tópicos
function populateTopicSelect() {
    // Solo poblar el selector de la pantalla de bienvenida
    const topicSelect = document.getElementById('topicSelectWelcome');
    if (!topicSelect) return;
    
    topicSelect.innerHTML = '';
    
    const topicKeys = Object.keys(TOPICOS_DE_ESPANOL);
    
    if (topicKeys.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No hay temas disponibles';
        topicSelect.appendChild(option);
        topicSelect.disabled = true;
        return;
    }
    
    // Agregar opción por defecto
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Selecciona un tema';
    topicSelect.appendChild(defaultOption);
    
    // Agregar temas disponibles
    topicKeys.forEach(topic => {
        const option = document.createElement('option');
        option.value = topic;
        option.textContent = topic.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        topicSelect.appendChild(option);
    });
    
    topicSelect.disabled = false;
    console.log(`Cargados ${topicKeys.length} temas:`, topicKeys);
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
    
    // Filtrar palabras que ya se han usado
    const availableWords = words.filter(word => 
        !usedWords.some(used => used.solucion === word.solucion && used.topic === topic)
    );
    
    // Si no hay palabras disponibles, reiniciar la lista de usadas para este tema
    if (availableWords.length === 0) {
        usedWords = usedWords.filter(used => used.topic !== topic);
        return words[Math.floor(Math.random() * words.length)];
    }
    
    const selectedWord = availableWords[Math.floor(Math.random() * availableWords.length)];
    
    // Agregar la palabra seleccionada a la lista de usadas
    usedWords.push({
        solucion: selectedWord.solucion,
        topic: topic
    });
    
    return selectedWord;
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
        const wordScore = updateScore();
        const breakdown = getScoreBreakdown(wordScore);
        
        message.innerHTML = `
            ¡Ganaste! 🎉<br>
            <span style="font-size: 14px; color: var(--secondary); font-weight: 600;">
                +${wordScore} puntos | Total: ${gameScore.sessionScore}
            </span>
        `;
        
        disableAllKeys();
        gameStats.wordsGuessed++;
        gameStats.currentStreak++;
        gameStats.totalGames++;
        
        // Tracking para API - incrementar desafíos correctos y sumar puntos reales
        gameSession.correctChallenges++;
        gameSession.obtainedScore += wordScore; // Sumar puntos reales obtenidos
        
        // Mostrar pantalla de felicitaciones después de un breve delay
        setTimeout(() => {
            showCongratulations();
        }, 2500);
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
    gameScore.incorrectGuesses++;
    
    updateLivesDisplay();
    if (lives <= 0) {
        message.textContent = 'Se acabaron las vidas. :('; 
        revealSolution(); 
        disableAllKeys();
        gameStats.currentStreak = 0;
        gameStats.totalGames++;
        // Resetear puntaje de la palabra actual (no se suman puntos por perder)
        gameScore.currentScore = 0;
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
    
    // Inicializar variables de puntaje para esta palabra
    gameScore.wordStartTime = Date.now();
    gameScore.incorrectGuesses = 0;
    
    // Tracking para API - incrementar total de desafíos
    gameSession.totalChallenges++;
    
    // Calcular y agregar el puntaje máximo posible para esta palabra
    const maxPossibleForThisWord = calculateMaxPossibleScore();
    gameSession.maxPossibleScore += maxPossibleForThisWord;
    
    // Inicializar tiempo de sesión si es la primera palabra
    if (!gameSession.gameStarted) {
        gameSession.startTime = Date.now();
        gameSession.gameStarted = true;
    }
}

// Función para calcular puntaje de la palabra actual
function calculateWordScore() {
    let score = SCORING.BASE_POINTS;
    
    // Bonus por vidas restantes
    score += lives * SCORING.LIFE_BONUS;
    
    // Bonus por rapidez
    const timeElapsed = (Date.now() - gameScore.wordStartTime) / 1000;
    if (timeElapsed < SCORING.SPEED_THRESHOLD) {
        score += SCORING.SPEED_BONUS;
    }
    
    // Bonus por precisión
    if (gameScore.incorrectGuesses === 0) {
        score += SCORING.NO_ERRORS_BONUS;
    } else if (gameScore.incorrectGuesses <= 2) {
        score += SCORING.FEW_ERRORS_BONUS;
    }
    
    // Bonus por racha
    const streak = gameStats.currentStreak + 1; // +1 porque aún no se ha actualizado
    if (streak >= 10) {
        score += SCORING.STREAK_BONUS[10];
    } else if (streak >= 5) {
        score += SCORING.STREAK_BONUS[5];
    } else if (streak >= 3) {
        score += SCORING.STREAK_BONUS[3];
    }
    
    return score;
}

// Función para actualizar el puntaje
function updateScore() {
    const wordScore = calculateWordScore();
    gameScore.currentScore += wordScore;
    gameScore.sessionScore += wordScore;
    
    // Actualizar mejor puntaje si es necesario
    if (gameScore.sessionScore > gameScore.bestScore) {
        gameScore.bestScore = gameScore.sessionScore;
        localStorage.setItem('ahorcadoBestScore', gameScore.bestScore.toString());
    }
    
    // Actualizar display en tiempo real
    updateScoreDisplay();
    
    return wordScore;
}

// Función para mostrar el desglose del puntaje
function getScoreBreakdown(wordScore) {
    const breakdown = [];
    
    breakdown.push(`Base: ${SCORING.BASE_POINTS} pts`);
    
    if (lives > 0) {
        breakdown.push(`Vidas: +${lives * SCORING.LIFE_BONUS} pts`);
    }
    
    const timeElapsed = (Date.now() - gameScore.wordStartTime) / 1000;
    if (timeElapsed < SCORING.SPEED_THRESHOLD) {
        breakdown.push(`Rapidez: +${SCORING.SPEED_BONUS} pts`);
    }
    
    if (gameScore.incorrectGuesses === 0) {
        breakdown.push(`Sin errores: +${SCORING.NO_ERRORS_BONUS} pts`);
    } else if (gameScore.incorrectGuesses <= 2) {
        breakdown.push(`Pocos errores: +${SCORING.FEW_ERRORS_BONUS} pts`);
    }
    
    const streak = gameStats.currentStreak + 1;
    if (streak >= 3) {
        const bonus = streak >= 10 ? SCORING.STREAK_BONUS[10] : 
                     streak >= 5 ? SCORING.STREAK_BONUS[5] : 
                     SCORING.STREAK_BONUS[3];
        breakdown.push(`Racha x${streak}: +${bonus} pts`);
    }
    
    return breakdown;
}

// Función para actualizar el display de puntaje en tiempo real
function updateScoreDisplay() {
    if (sessionScoreEl) sessionScoreEl.textContent = gameScore.sessionScore;
    if (bestScoreEl) bestScoreEl.textContent = gameScore.bestScore;
    if (currentStreakGameEl) currentStreakGameEl.textContent = gameStats.currentStreak;
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
    updateScoreDisplay(); // Actualizar puntajes al mostrar pantalla
}

function showCongratulations() {
    updateStatsDisplay();
    congratulationsScreen.classList.add('show');
}

function updateStatsDisplay() {
    wordsGuessedEl.textContent = gameStats.wordsGuessed;
    currentStreakEl.textContent = gameStats.currentStreak;
    if (sessionScoreCongratsEl) sessionScoreCongratsEl.textContent = gameScore.sessionScore;
    
    // Actualizar récord si es necesario
    if (gameStats.currentStreak > gameStats.record) {
        gameStats.record = gameStats.currentStreak;
        localStorage.setItem('ahorcadoRecord', gameStats.record.toString());
    }
    
    // Mensaje personalizado basado en la racha y puntaje
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
    
    // Agregar mensaje de puntaje si es significativo
    if (gameScore.sessionScore >= 100) {
        message += ` ¡${gameScore.sessionScore} puntos impresionantes!`;
    } else if (gameScore.sessionScore >= 50) {
        message += ` ¡Buen puntaje de ${gameScore.sessionScore} puntos!`;
    }
    
    congratsMessage.textContent = message;
}

async function resetGame() {
    // Enviar datos al API antes de resetear
    if (gameSession.gameStarted) {
        await sendGameDataToAPI();
    }
    
    // Resetear todas las variables
    gameStats.wordsGuessed = 0;
    gameStats.currentStreak = 0;
    gameStats.totalGames = 0;
    usedWords = []; // Limpiar palabras usadas al reiniciar
    
    // Resetear puntajes (excepto mejor puntaje)
    gameScore.currentScore = 0;
    gameScore.sessionScore = 0;
    gameScore.wordStartTime = 0;
    gameScore.incorrectGuesses = 0;
    
    // Resetear tracking de sesión
    gameSession.startTime = null;
    gameSession.totalChallenges = 0;
    gameSession.correctChallenges = 0;
    gameSession.gameStarted = false;
    gameSession.obtainedScore = 0;
    gameSession.maxPossibleScore = 0;
    
    // No resetear el récord ni el mejor puntaje
    showWelcomeScreen();
}

function updateRecordDisplay() {
    if (recordDisplay) {
        recordDisplay.textContent = `${gameStats.record} Palabras`;
    }
}

// Función para mostrar modal de confirmación personalizado
function showConfirmDialog(title, message, onConfirm) {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmModal.classList.add('show');
    
    // Remover listeners anteriores
    confirmAccept.onclick = null;
    confirmCancel.onclick = null;
    
    // Agregar nuevos listeners
    confirmAccept.onclick = () => {
        confirmModal.classList.remove('show');
        if (onConfirm) onConfirm();
    };
    
    confirmCancel.onclick = () => {
        confirmModal.classList.remove('show');
    };
    
    // Cerrar al hacer clic fuera del modal
    confirmModal.onclick = (e) => {
        if (e.target === confirmModal) {
            confirmModal.classList.remove('show');
        }
    };
}

function continueGame() {
    congratulationsScreen.classList.remove('show');
    startNew(selectedTopic);
}

// Event listeners
hintBtn.onclick = () => hintModal.classList.add('show');
document.getElementById('closeHint').onclick = () => hintModal.classList.remove('show');
hintModal.onclick = e => { if (e.target === hintModal) hintModal.classList.remove('show'); };
newGameBtn.onclick = () => startNew(selectedTopic);
giveUpBtn.onclick = () => { revealSolution(); disableAllKeys(); message.textContent = 'Te rendiste.' };

// Event listeners para las nuevas pantallas
startGameBtn.onclick = () => {
    const chosenTopic = topicSelectWelcome.value;
    if (!chosenTopic) {
        showConfirmDialog(
            'Tema requerido',
            'Por favor selecciona un tema antes de comenzar el juego.',
            null
        );
        return;
    }
    
    // Guardar el tema seleccionado
    selectedTopic = chosenTopic;
    
    // Limpiar palabras usadas al iniciar un nuevo tema
    usedWords = usedWords.filter(used => used.topic !== selectedTopic);
    
    showGameScreen();
    startNew(selectedTopic);
};

continueGameBtn.onclick = continueGame;
restartGameBtn.onclick = resetGame;

// Agregar event listener para el botón de regreso al inicio
backToHomeBtn.onclick = () => {
    showConfirmDialog(
        'Volver al inicio',
        '¿Estás seguro de que quieres volver al inicio? Se perderá el progreso actual.',
        () => {
            showWelcomeScreen();
        }
    );
};

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
    updateScoreDisplay(); // Cargar puntajes guardados
    showWelcomeScreen();
});