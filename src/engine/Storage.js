// Persistência local: histórico de tentativas e caderno de erros.
// Pure JS, decoupled from the UI.

const HISTORY_KEY = 'ibam_history_v1';
const ERROR_BANK_KEY = 'ibam_error_bank_v1';
const MAX_HISTORY = 50;

function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage indisponível, ignora
  }
}

export function getHistory() {
  return safeGet(HISTORY_KEY, []);
}

export function clearHistory() {
  safeSet(HISTORY_KEY, []);
}

export function getErrorBank() {
  return safeGet(ERROR_BANK_KEY, {});
}

export function getErrorBankList() {
  return Object.values(getErrorBank()).sort((a, b) => b.addedAt - a.addedAt);
}

function questionOrigin(examKey, index, question) {
  const originExam = question._examKey || examKey;
  const qid = question._qid || `${originExam}#${index}`;
  return { originExam, qid };
}

function updateErrorBank({ examKey, review, questions }) {
  const bank = getErrorBank();
  review.forEach((item, i) => {
    const q = questions[i];
    const { originExam, qid } = questionOrigin(examKey, i, q);
    if (item.isCorrect) {
      delete bank[qid];
      return;
    }
    const existing = bank[qid];
    bank[qid] = {
      qid,
      examKey: originExam,
      disciplina: q.disciplina || 'outros',
      cargo: q.cargo,
      id_concurso: q.id_concurso,
      questão: q.questão,
      alternativas: q.alternativas,
      resposta_correta: q.resposta_correta,
      addedAt: existing ? existing.addedAt : Date.now(),
      timesWrong: (existing ? existing.timesWrong : 0) + 1
    };
  });
  safeSet(ERROR_BANK_KEY, bank);
}

export function recordAttempt({ examKey, mode, score, breakdown, review, questions }) {
  const history = getHistory();
  const attempt = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    examKey,
    mode,
    date: Date.now(),
    score,
    breakdown
  };
  history.unshift(attempt);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  safeSet(HISTORY_KEY, history);

  updateErrorBank({ examKey, review, questions });

  return attempt;
}

export function buildErrorPracticeSet() {
  return getErrorBankList().map((entry) => ({
    ...entry,
    _qid: entry.qid,
    _examKey: entry.examKey
  }));
}
