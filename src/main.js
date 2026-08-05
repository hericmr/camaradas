import './style.css';
import { SimuladoEngine } from './engine/SimuladoEngine';
import * as Storage from './engine/Storage';
import ibamData from './data/ibam_provas.json';

const examKeys = Object.keys(ibamData);
let examKey = examKeys[0];
let examQuestions = ibamData[examKey];

// Pool de todas as questões de todas as provas, usado pelo modo "Por disciplina"
// (cada questão já carrega cargo/disciplina/banca próprios, então dá pra filtrar
// e misturar entre provas sem perder esse contexto).
const allQuestions = examKeys.flatMap((key) => ibamData[key]);
const cargoList = [...new Set(allQuestions.map((q) => q.cargo).filter(Boolean))];
let activeStartMode = 'prova';

let engine = null;
let currentQuestionIndex = 0;
let timerInterval = null;
let currentMode = 'simulado';
let lastResult = null;

const ROUTE_HOME = '#/';
const ROUTE_EXAM = '#/simulado';
const ROUTE_RESULTS = '#/resultado';
const ACTIVE_EXAM_KEY = 'ibam_active_exam_v1';

const screens = {
  start: document.getElementById('start-screen'),
  exam: document.getElementById('exam-screen'),
  results: document.getElementById('results-screen')
};

const elHeader = document.querySelector('.app-header');

const btnStart = document.getElementById('btn-start');
const elExamSelect = document.getElementById('exam-select');

const tabProva = document.getElementById('tab-prova');
const tabDisciplina = document.getElementById('tab-disciplina');
const panelProva = document.getElementById('panel-prova');
const panelDisciplina = document.getElementById('panel-disciplina');
const elCargoChecklist = document.getElementById('cargo-checklist');
const elDisciplinaChecklist = document.getElementById('disciplina-checklist');
const elQuestionCount = document.getElementById('question-count');
const elQuestionCountHint = document.getElementById('question-count-hint');

const elProgressCard = document.getElementById('progress-card');
const elErrorBankCount = document.getElementById('error-bank-count');
const btnPracticeErrors = document.getElementById('btn-practice-errors');
const elHistoryList = document.getElementById('history-list');
const btnClearHistory = document.getElementById('btn-clear-history');

const elTimer = document.getElementById('timer');
const btnFinish = document.getElementById('btn-finish');
const gridContainer = document.getElementById('question-grid');

const elNavProgressText = document.getElementById('nav-progress-text');
const elNavPendingBadge = document.getElementById('nav-pending-badge');
const elNavProgressFill = document.getElementById('nav-progress-fill');

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

function titleCase(str) {
  return str.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function setStartMode(mode) {
  activeStartMode = mode;
  tabProva.classList.toggle('active', mode === 'prova');
  tabDisciplina.classList.toggle('active', mode === 'disciplina');
  panelProva.classList.toggle('hidden', mode !== 'prova');
  panelDisciplina.classList.toggle('hidden', mode !== 'disciplina');
}

function renderCargoChecklist() {
  elCargoChecklist.innerHTML = '';
  cargoList.forEach((cargo) => {
    const label = document.createElement('label');
    label.className = 'disciplina-checklist-item';
    label.innerHTML = `<input type="checkbox" value="${cargo}" checked> ${titleCase(cargo)}`;
    label.querySelector('input').addEventListener('change', renderDisciplinaChecklist);
    elCargoChecklist.appendChild(label);
  });
}

function getCheckedCargos() {
  return [...elCargoChecklist.querySelectorAll('input:checked')].map((cb) => cb.value);
}

function getDisciplinasForCargos(cargos) {
  const disciplinas = [];
  allQuestions.forEach((q) => {
    if (cargos.includes(q.cargo) && q.disciplina && !disciplinas.includes(q.disciplina)) {
      disciplinas.push(q.disciplina);
    }
  });
  return disciplinas;
}

function renderDisciplinaChecklist() {
  const cargos = getCheckedCargos();
  const disciplinas = getDisciplinasForCargos(cargos);

  elDisciplinaChecklist.innerHTML = '';
  if (disciplinas.length === 0) {
    elDisciplinaChecklist.innerHTML = '<span class="disciplina-checklist-empty">Nenhuma disciplina encontrada.</span>';
    updateQuestionCountHint();
    return;
  }

  disciplinas.forEach((disciplina) => {
    const label = document.createElement('label');
    label.className = 'disciplina-checklist-item';
    label.innerHTML = `<input type="checkbox" value="${disciplina}" checked> ${disciplina}`;
    label.querySelector('input').addEventListener('change', updateQuestionCountHint);
    elDisciplinaChecklist.appendChild(label);
  });

  updateQuestionCountHint();
}

function getCheckedDisciplinas() {
  return [...elDisciplinaChecklist.querySelectorAll('input:checked')].map((cb) => cb.value);
}

function getDisciplinaPool() {
  const cargos = getCheckedCargos();
  const disciplinas = getCheckedDisciplinas();
  return allQuestions.filter((q) => cargos.includes(q.cargo) && disciplinas.includes(q.disciplina));
}

function updateQuestionCountHint() {
  const total = getDisciplinaPool().length;
  elQuestionCount.max = total || 1;
  elQuestionCount.value = total || 1;
  elQuestionCountHint.textContent = total > 0
    ? `${total} questão${total === 1 ? '' : 'ões'} disponível${total === 1 ? '' : 'is'} — todas incluídas por padrão, reduza se quiser um simulado mais curto`
    : 'nenhuma questão disponível para essa combinação';
}

function prepareDisciplinaSession() {
  const cargos = getCheckedCargos();
  if (cargos.length === 0) {
    alert('Selecione ao menos um cargo.');
    return false;
  }

  const disciplinas = getCheckedDisciplinas();
  if (disciplinas.length === 0) {
    alert('Selecione ao menos uma disciplina.');
    return false;
  }

  const pool = getDisciplinaPool();
  if (pool.length === 0) {
    alert('Nenhuma questão encontrada para essa combinação.');
    return false;
  }

  const requested = parseInt(elQuestionCount.value, 10) || 1;
  const count = Math.min(Math.max(1, requested), pool.length);

  const cargosLabel = cargos.length === cargoList.length
    ? 'Todos os cargos'
    : cargos.map(titleCase).join(', ');

  examQuestions = shuffle([...pool]).slice(0, count);
  examKey = `${cargosLabel} — ${disciplinas.join(', ')}`;
  return true;
}

function init() {
  populateExamSelect();
  selectExam(examKey);
  renderCargoChecklist();
  renderDisciplinaChecklist();
  renderProgressSection();

  tabProva.addEventListener('click', () => setStartMode('prova'));
  tabDisciplina.addEventListener('click', () => setStartMode('disciplina'));

  elExamSelect.addEventListener('change', () => selectExam(elExamSelect.value));
  btnStart.addEventListener('click', () => {
    if (activeStartMode === 'disciplina') {
      if (!prepareDisciplinaSession()) return;
    } else {
      selectExam(elExamSelect.value);
    }
    startExam();
  });
  btnFinish.addEventListener('click', () => finishExam());
  btnPrev.addEventListener('click', () => navigateTo(currentQuestionIndex - 1));
  btnCheck.addEventListener('click', checkCurrentQuestion);
  btnNext.addEventListener('click', () => navigateTo(currentQuestionIndex + 1));
  btnPracticeErrors.addEventListener('click', startErrorPractice);
  btnClearHistory.addEventListener('click', () => {
    if (!confirm('limpar todo o histórico?')) return;
    Storage.clearHistory();
    renderProgressSection();
  });

  document.getElementById('btn-restart').addEventListener('click', resetToHome);
  window.addEventListener('hashchange', route);

  if (!location.hash) {
    history.replaceState(null, '', ROUTE_HOME);
  }
  route();
}

function renderProgressSection() {
  const bank = Storage.getErrorBankList();
  const history = Storage.getHistory();

  elProgressCard.classList.toggle('hidden', history.length === 0);

  elErrorBankCount.textContent = `${bank.length} questões`;
  btnPracticeErrors.disabled = bank.length === 0;

  elHistoryList.innerHTML = '';

  if (history.length === 0) {
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

function showScreenOnly(name) {
  Object.values(screens).forEach(el => el.classList.add('hidden'));
  screens[name].classList.remove('hidden');
  elHeader.classList.toggle('hidden', name === 'start');
}

// Roteamento por hash: dá URL própria pra cada tela (compartilhável, funciona
// com voltar/avançar do navegador) sem precisar de servidor com rewrites,
// já que o site é hospedado estático (GitHub Pages).
function route() {
  const hash = location.hash;

  if (hash === ROUTE_EXAM) {
    if (engine && !engine.isFinished) {
      showScreenOnly('exam');
    } else if (resumeActiveExam()) {
      // resumeActiveExam já mostra a tela do exame
    } else {
      history.replaceState(null, '', ROUTE_HOME);
      showScreenOnly('start');
    }
    return;
  }

  if (hash === ROUTE_RESULTS) {
    if (lastResult) {
      showScreenOnly('results');
    } else {
      history.replaceState(null, '', ROUTE_HOME);
      showScreenOnly('start');
    }
    return;
  }

  showScreenOnly('start');
}

function goToRoute(hash) {
  if (location.hash !== hash) {
    location.hash = hash;
  }
  route();
}

function persistActiveExam() {
  if (!engine || engine.isFinished) return;
  const state = {
    examKey,
    questions: engine.questions,
    answers: engine.answers,
    checkedQuestions: engine.checkedQuestions,
    startTime: engine.startTime,
    currentQuestionIndex,
    currentMode
  };
  try {
    sessionStorage.setItem(ACTIVE_EXAM_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage indisponível, ignora
  }
}

function clearActiveExam() {
  try {
    sessionStorage.removeItem(ACTIVE_EXAM_KEY);
  } catch {
    // ignora
  }
}

function resumeActiveExam() {
  let saved;
  try {
    saved = JSON.parse(sessionStorage.getItem(ACTIVE_EXAM_KEY));
  } catch {
    return false;
  }
  if (!saved || !Array.isArray(saved.questions) || saved.questions.length === 0) return false;

  examKey = saved.examKey;
  examQuestions = saved.questions;
  currentMode = saved.currentMode;
  currentQuestionIndex = saved.currentQuestionIndex || 0;

  engine = new SimuladoEngine(examQuestions);
  engine.answers = saved.answers || {};
  engine.checkedQuestions = saved.checkedQuestions || {};
  engine.startTime = saved.startTime;

  btnFinish.classList.remove('hidden');

  updateTimerDisplay();
  timerInterval = setInterval(updateTimerDisplay, 1000);

  buildNavigationGrid();
  renderQuestion(currentQuestionIndex);
  showScreenOnly('exam');
  return true;
}

function resetToHome() {
  clearInterval(timerInterval);
  engine = null;
  lastResult = null;
  examKey = examKeys[0];
  selectExam(examKey);
  setStartMode('prova');
  clearActiveExam();
  renderProgressSection();
  history.replaceState(null, '', ROUTE_HOME);
  route();
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

function startExam({ forcedMode = null } = {}) {
  currentMode = forcedMode || 'simulado';

  btnFinish.classList.remove('hidden');

  engine = new SimuladoEngine(examQuestions);
  engine.start();
  currentQuestionIndex = 0;

  updateTimerDisplay();
  timerInterval = setInterval(updateTimerDisplay, 1000);

  buildNavigationGrid();
  renderQuestion(currentQuestionIndex);

  persistActiveExam();
  goToRoute(ROUTE_EXAM);
}

function startErrorPractice() {
  const practiceSet = Storage.buildErrorPracticeSet();
  if (practiceSet.length === 0) return;
  examKey = 'caderno de erros';
  examQuestions = practiceSet;
  startExam({ forcedMode: 'erros' });
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

function updateProgressPanel(index) {
  const total = engine.questions.length;
  const answered = Object.keys(engine.answers).length;
  const pending = total - answered;

  elNavProgressText.textContent = `Questão ${index + 1} de ${total}`;
  elNavProgressFill.style.width = `${total ? (answered / total) * 100 : 0}%`;

  elNavPendingBadge.classList.toggle('nav-pending-badge--done', pending === 0);
  elNavPendingBadge.textContent = pending === 0
    ? 'todas respondidas'
    : `${pending} pendente${pending === 1 ? '' : 's'}`;
}

function countPending() {
  return engine.questions.length - Object.keys(engine.answers).length;
}

function navigateTo(index) {
  if (index < 0 || index >= engine.questions.length) return;
  currentQuestionIndex = index;
  renderQuestion(index);
  persistActiveExam();
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
          persistActiveExam();
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
  updateProgressPanel(index);
}

function checkCurrentQuestion() {
  if (!engine.answers[currentQuestionIndex]) return;
  engine.checkQuestion(currentQuestionIndex);
  renderQuestion(currentQuestionIndex);
  persistActiveExam();
}

function finishExam() {
  const pending = countPending();
  const message = pending > 0
    ? `Você ainda tem ${pending} questão${pending === 1 ? '' : 'ões'} sem resposta. Deseja finalizar mesmo assim?`
    : 'Tem certeza que deseja finalizar a prova?';
  if (!confirm(message)) return;

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
  clearActiveExam();
  lastResult = { score, breakdown, review };

  document.getElementById('score-text').textContent = `${Math.round(score.percentage)}%`;
  document.getElementById('res-correct').textContent = score.correct;
  document.getElementById('res-total').textContent = score.total;
  document.getElementById('res-time').textContent = formatTime(score.timeTakenMs);

  renderAreaBreakdown(breakdown);
  renderReviewList(review);

  goToRoute(ROUTE_RESULTS);
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
