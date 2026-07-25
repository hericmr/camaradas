import './style.css';
import { SimuladoEngine } from './engine/SimuladoEngine';
import * as Storage from './engine/Storage';
import ibamData from './data/ibam_provas.json';

const examKeys = Object.keys(ibamData);
let examKey = examKeys[0];
let examQuestions = ibamData[examKey];
const DURATION_MS = 3.5 * 60 * 60 * 1000;

let engine = null;
let currentQuestionIndex = 0;
let timerInterval = null;
let hasTimerLimit = true;
let currentMode = 'prova';

const screens = {
  start: document.getElementById('start-screen'),
  exam: document.getElementById('exam-screen'),
  results: document.getElementById('results-screen')
};

const elHeader = document.querySelector('.app-header');

const btnStart = document.getElementById('btn-start');
const elModeToggle = document.getElementById('mode-toggle');
const elExamSelect = document.getElementById('exam-select');

const elErrorBankCount = document.getElementById('error-bank-count');
const btnPracticeErrors = document.getElementById('btn-practice-errors');
const elHistoryList = document.getElementById('history-list');
const btnClearHistory = document.getElementById('btn-clear-history');

const elTimer = document.getElementById('timer');
const btnFinish = document.getElementById('btn-finish');
const gridContainer = document.getElementById('question-grid');

const elCardCargo = document.getElementById('card-cargo');
const elCardDisciplina = document.getElementById('card-disciplina');
const elCardEdital = document.getElementById('card-edital');
const elCardAno = document.getElementById('card-ano');
const elCardBanca = document.getElementById('card-banca');

const elCurrentQNumber = document.getElementById('current-q-number');
const elQuestionText = document.getElementById('question-text');
const elOptionsContainer = document.getElementById('options-container');

const btnPrev = document.getElementById('btn-prev');
const btnCheck = document.getElementById('btn-check');
const btnNext = document.getElementById('btn-next');

const elAreaBreakdown = document.getElementById('area-breakdown');
const elReviewList = document.getElementById('review-list');

function populateExamSelect() {
  elExamSelect.innerHTML = '';
  examKeys.forEach((key) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = key;
    elExamSelect.appendChild(option);
  });
  elExamSelect.value = examKey;
}

function selectExam(key) {
  examKey = key;
  examQuestions = ibamData[examKey];
}

function init() {
  if (!examKeys.includes(examKey)) {
    examKey = examKeys[0];
  }
  populateExamSelect();
  selectExam(examKey);
  elModeToggle.checked = false;
  showScreen('start');
  renderProgressSection();

  elExamSelect.addEventListener('change', () => selectExam(elExamSelect.value));
  btnStart.addEventListener('click', () => startExam());
  btnFinish.addEventListener('click', () => finishExam(false));
  btnPrev.addEventListener('click', () => navigateTo(currentQuestionIndex - 1));
  btnCheck.addEventListener('click', checkCurrentQuestion);
  btnNext.addEventListener('click', () => navigateTo(currentQuestionIndex + 1));
  btnPracticeErrors.addEventListener('click', startErrorPractice);
  btnClearHistory.addEventListener('click', () => {
    if (!confirm('limpar todo o histórico?')) return;
    Storage.clearHistory();
    renderProgressSection();
  });

  document.getElementById('btn-restart').addEventListener('click', () => {
    init();
  });
}

function renderProgressSection() {
  const bank = Storage.getErrorBankList();
  elErrorBankCount.textContent = `${bank.length} questões`;
  btnPracticeErrors.disabled = bank.length === 0;

  const history = Storage.getHistory();
  elHistoryList.innerHTML = '';

  if (history.length === 0) {
    elHistoryList.innerHTML = '<p class="history-empty">nenhuma prova feita ainda</p>';
    btnClearHistory.classList.add('hidden');
    return;
  }

  btnClearHistory.classList.remove('hidden');
  history.slice(0, 5).forEach((attempt) => {
    const div = document.createElement('div');
    div.className = 'history-item';
    const date = new Date(attempt.date);
    const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    div.innerHTML = `
      <span class="history-date">${dateStr}</span>
      <span class="history-exam">${attempt.examKey}</span>
      <span class="history-score">${Math.round(attempt.score.percentage)}%</span>
    `;
    elHistoryList.appendChild(div);
  });
}

function showScreen(name) {
  Object.values(screens).forEach(el => el.classList.add('hidden'));
  screens[name].classList.remove('hidden');
  elHeader.classList.toggle('hidden', name === 'start');
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
  
  if (hasTimerLimit) {
    const timeLeft = DURATION_MS - elapsed;
    if (timeLeft <= 0) {
      elTimer.textContent = "00:00:00";
      finishExam(true);
      return;
    }
    elTimer.textContent = formatTime(timeLeft);
    if (timeLeft < 10 * 60 * 1000) {
      elTimer.style.color = 'var(--danger)';
    }
  } else {
    elTimer.textContent = formatTime(elapsed);
  }
}

function startExam({ forcedPractice = false } = {}) {
  hasTimerLimit = forcedPractice ? false : !elModeToggle.checked;
  currentMode = forcedPractice ? 'erros' : (hasTimerLimit ? 'prova' : 'treino');

  if (hasTimerLimit) {
    elTimer.style.color = '#b45309'; // warning
  }

  btnFinish.classList.remove('hidden');

  engine = new SimuladoEngine(examQuestions);
  engine.start();
  currentQuestionIndex = 0;

  updateTimerDisplay();
  timerInterval = setInterval(updateTimerDisplay, 1000);

  buildNavigationGrid();
  renderQuestion(currentQuestionIndex);

  showScreen('exam');
}

function startErrorPractice() {
  const practiceSet = Storage.buildErrorPracticeSet();
  if (practiceSet.length === 0) return;
  examKey = 'caderno de erros';
  examQuestions = practiceSet;
  startExam({ forcedPractice: true });
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
    btn.className = 'grid-btn';
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
  
  if(q.cargo) elCardCargo.innerHTML = `<strong>Cargo:</strong> ${q.cargo}`;
  if(q.disciplina) elCardDisciplina.innerHTML = `<strong>Disciplina:</strong> ${q.disciplina}`;
  if(q.id_concurso) elCardEdital.innerHTML = `<strong>Edital:</strong> ${q.id_concurso}`;
  if(q.banca) elCardBanca.innerHTML = `<strong>Banca:</strong> ${q.banca}`;
  const ano = q.id_concurso && q.id_concurso.match(/\d{4}/);
  if (ano) elCardAno.innerHTML = `<strong>Ano:</strong> ${ano[0]}`;
  
  elCurrentQNumber.textContent = `Questão ${index + 1} de ${engine.questions.length}`;
  
  // Handling enunciado e texto_relevante
  let htmlText = '';
  if (q.texto_relevante) {
    htmlText += `<div style="background:#f9fafb; padding:1rem; border-radius:0.5rem; margin-bottom:1rem; border:1px solid #f3f4f6;">${q.texto_relevante}</div>`;
  }
  htmlText += `<p>${q.questão || q.enunciado}</p>`;
  elQuestionText.innerHTML = htmlText;
  
  elOptionsContainer.innerHTML = '';
  const selectedAnswer = engine.answers[index];
  const isChecked = engine.checkedQuestions[index];
  const correctAnswer = q.resposta_correta;
  
  if (q.alternativas) {
    Object.entries(q.alternativas).forEach(([letter, text]) => {
      const btn = document.createElement('button');
      
      let classes = ['option-btn'];
      if (selectedAnswer === letter) classes.push('selected');
      
      if (isChecked) {
        if (letter === correctAnswer) {
          classes.push('correct-ans');
        } else if (selectedAnswer === letter && letter !== correctAnswer) {
          classes.push('wrong-ans');
        }
        btn.disabled = true;
      }
      
      btn.className = classes.join(' ');
      
      const cleanText = text.replace(/^\([A-E]\)\s*/, '');
      btn.innerHTML = `<span class="option-letter">${letter})</span><span>${cleanText}</span>`;
      
      if (!isChecked) {
        btn.addEventListener('click', () => {
          engine.answerQuestion(index, letter);
          renderQuestion(index);
        });
      }
      
      elOptionsContainer.appendChild(btn);
    });
  }

  btnPrev.disabled = index === 0;
  btnNext.disabled = index === engine.questions.length - 1;
  
  if (isChecked || !selectedAnswer) {
    btnCheck.disabled = true;
    if (isChecked) {
      btnCheck.classList.add('hidden');
    } else {
      btnCheck.classList.remove('hidden');
    }
  } else {
    btnCheck.disabled = false;
    btnCheck.classList.remove('hidden');
  }
  
  updateNavigationGrid();
}

function checkCurrentQuestion() {
  if (!engine.answers[currentQuestionIndex]) return;
  engine.checkQuestion(currentQuestionIndex);
  renderQuestion(currentQuestionIndex);
}

function finishExam(isAuto = false) {
  if (!isAuto && !confirm("Tem certeza que deseja finalizar a prova?")) return;
  
  clearInterval(timerInterval);
  engine.finish();
  const score = engine.getScore();
  const breakdown = engine.getBreakdownByArea();
  const review = engine.getReview();

  Storage.recordAttempt({
    examKey,
    mode: currentMode,
    score,
    breakdown,
    review,
    questions: engine.questions
  });

  btnFinish.classList.add('hidden');
  showScreen('results');

  document.getElementById('score-text').textContent = `${Math.round(score.percentage)}%`;
  document.getElementById('res-correct').textContent = score.correct;
  document.getElementById('res-total').textContent = score.total;
  document.getElementById('res-time').textContent = formatTime(score.timeTakenMs);

  renderAreaBreakdown(breakdown);
  renderReviewList(review);
}

function renderAreaBreakdown(areas) {
  elAreaBreakdown.innerHTML = '';
  areas.forEach(({ area, correct, total, percentage }) => {
    const div = document.createElement('div');
    div.className = 'area-item';
    div.innerHTML = `
      <div class="area-item-header">
        <span class="area-name">${area}</span>
        <span class="area-percent">${Math.round(percentage)}%</span>
      </div>
      <div class="area-bar"><div class="area-bar-fill" style="width:${percentage}%"></div></div>
      <div class="area-detail">${correct} de ${total} questões</div>
    `;
    elAreaBreakdown.appendChild(div);
  });
}

function renderReviewList(review) {
  elReviewList.innerHTML = '';
  review.forEach(({ index, disciplina, userAnswer, correctAnswer, isCorrect }) => {
    let statusClass = 'review-item--wrong';
    let statusText = 'Incorreta';
    if (!userAnswer) {
      statusClass = 'review-item--blank';
      statusText = 'Não respondida';
    } else if (isCorrect) {
      statusClass = 'review-item--correct';
      statusText = 'Correta';
    }
    const div = document.createElement('div');
    div.className = `review-item ${statusClass}`;
    div.innerHTML = `
      <span class="review-q-number">${index + 1}</span>
      <span class="review-area">${disciplina || ''}</span>
      <span class="review-answer">Sua resposta: <strong>${userAnswer || 'Não respondida'}</strong></span>
      <span class="review-correct">Gabarito: <strong>${correctAnswer}</strong></span>
      <span class="review-status">${statusText}</span>
    `;
    elReviewList.appendChild(div);
  });
}

init();
