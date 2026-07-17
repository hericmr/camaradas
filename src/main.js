import './style.css';
import { SimuladoEngine } from './engine/SimuladoEngine';

// Fetch the exam data statically since it's local in Vite
import ibamData from './data/ibam_provas.json';

// Get the first available exam
const examKey = Object.keys(ibamData)[0];
const examQuestions = ibamData[examKey];

// State
let engine = null;
let currentQuestionIndex = 0;
let timerInterval = null;

// DOM Elements
const screens = {
  loading: document.getElementById('loading'),
  start: document.getElementById('start-screen'),
  exam: document.getElementById('exam-screen'),
  results: document.getElementById('results-screen')
};

// Start Screen
const elExamTitle = document.getElementById('exam-title');
const elQCount = document.getElementById('q-count');
const btnStart = document.getElementById('btn-start');

// Exam Screen
const elTimer = document.getElementById('timer');
const btnFinish = document.getElementById('btn-finish');
const gridContainer = document.getElementById('question-grid');
const elCurrentDisciplina = document.getElementById('current-disciplina');
const elCurrentQNumber = document.getElementById('current-q-number');
const elQuestionText = document.getElementById('question-text');
const elOptionsContainer = document.getElementById('options-container');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');

// Initialize App
function init() {
  elExamTitle.textContent = examKey;
  elQCount.textContent = examQuestions.length;
  showScreen('start');
  
  // Event Listeners
  btnStart.addEventListener('click', startExam);
  btnFinish.addEventListener('click', finishExam);
  btnPrev.addEventListener('click', () => navigateTo(currentQuestionIndex - 1));
  btnNext.addEventListener('click', () => navigateTo(currentQuestionIndex + 1));
  
  document.getElementById('btn-restart').addEventListener('click', () => {
    init(); // Reset
  });
}

function showScreen(name) {
  Object.values(screens).forEach(el => el.classList.add('hidden'));
  screens[name].classList.remove('hidden');
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function updateTimerDisplay() {
  if (!engine || !engine.startTime) return;
  const elapsed = Date.now() - engine.startTime;
  elTimer.textContent = formatTime(elapsed);
}

function startExam() {
  engine = new SimuladoEngine(examQuestions);
  engine.start();
  currentQuestionIndex = 0;
  
  timerInterval = setInterval(updateTimerDisplay, 1000);
  
  buildNavigationGrid();
  renderQuestion(currentQuestionIndex);
  
  showScreen('exam');
}

function buildNavigationGrid() {
  gridContainer.innerHTML = '';
  engine.questions.forEach((_, i) => {
    const btn = document.createElement('button');
    btn.className = 'grid-btn';
    btn.textContent = i + 1;
    btn.id = `nav-q-${i}`;
    btn.addEventListener('click', () => navigateTo(i));
    gridContainer.appendChild(btn);
  });
}

function updateNavigationGrid() {
  engine.questions.forEach((_, i) => {
    const btn = document.getElementById(`nav-q-${i}`);
    if (!btn) return;
    
    // Reset classes
    btn.className = 'grid-btn';
    
    // Add states
    if (engine.answers[i]) btn.classList.add('answered');
    if (i === currentQuestionIndex) btn.classList.add('active');
  });
}

function navigateTo(index) {
  if (index < 0 || index >= engine.questions.length) return;
  currentQuestionIndex = index;
  renderQuestion(index);
}

function renderQuestion(index) {
  const q = engine.questions[index];
  
  elCurrentDisciplina.textContent = q.disciplina;
  elCurrentQNumber.textContent = `Questão ${index + 1} de ${engine.questions.length}`;
  
  // Format question text (simple HTML encoding avoiding XSS since it's local, but be careful)
  elQuestionText.textContent = q.questão;
  
  // Render options
  elOptionsContainer.innerHTML = '';
  const selectedAnswer = engine.answers[index];
  
  if (q.alternativas) {
    Object.entries(q.alternativas).forEach(([letter, text]) => {
      const btn = document.createElement('button');
      btn.className = `option-btn ${selectedAnswer === letter ? 'selected' : ''}`;
      
      // Clean up the text: removes the "(A) " prefix if present since we'll style it
      const cleanText = text.replace(/^\([A-E]\)\s*/, '');
      
      btn.innerHTML = `<strong>${letter}</strong><span style="margin-left:1rem">${cleanText}</span>`;
      
      btn.addEventListener('click', () => {
        engine.answerQuestion(index, letter);
        renderQuestion(index); // Re-render to show selection
      });
      
      elOptionsContainer.appendChild(btn);
    });
  }

  // Update Buttons
  btnPrev.disabled = index === 0;
  btnNext.disabled = index === engine.questions.length - 1;
  
  // Update Grid
  updateNavigationGrid();
}

function finishExam() {
  if (!confirm("Tem certeza que deseja finalizar a prova?")) return;
  
  clearInterval(timerInterval);
  engine.finish();
  const score = engine.getScore();
  
  showScreen('results');
  
  // Animate the circle
  const scorePath = document.getElementById('score-path');
  const scoreText = document.getElementById('score-text');
  
  // Dash array calculation: circle circumference is ~100 with radius 15.9155
  setTimeout(() => {
    scorePath.setAttribute('stroke-dasharray', `${score.percentage}, 100`);
    scoreText.textContent = `${Math.round(score.percentage)}%`;
  }, 100);
  
  document.getElementById('res-correct').textContent = score.correct;
  document.getElementById('res-total').textContent = score.total;
  document.getElementById('res-time').textContent = formatTime(score.timeTakenMs);
}

// Start
init();
