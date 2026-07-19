// This engine handles the core logic for the exams.
// Pure JS, decoupled from the UI.
export class SimuladoEngine {
  constructor(examData) {
    this.questions = examData;
    this.answers = {}; // questionIndex -> letter selected
    this.checkedQuestions = {}; // questionIndex -> boolean
    this.startTime = null;
    this.endTime = null;
    this.isFinished = false;
  }

  start() {
    this.startTime = Date.now();
  }

  answerQuestion(index, letter) {
    if (this.isFinished) throw new Error("Exam is already finished");
    if (index < 0 || index >= this.questions.length) throw new Error("Invalid question index");
    if (this.checkedQuestions[index]) throw new Error("Question already checked");
    this.answers[index] = letter;
  }

  checkQuestion(index) {
    if (this.isFinished) throw new Error("Exam is already finished");
    if (!this.answers[index]) throw new Error("Question not answered yet");
    this.checkedQuestions[index] = true;
    return this.questions[index].resposta_correta;
  }

  finish() {
    this.endTime = Date.now();
    this.isFinished = true;
  }

  isAnswerCorrect(index) {
    const q = this.questions[index];
    return q.resposta_correta === 'Nula' || this.answers[index] === q.resposta_correta;
  }

  getScore() {
    if (!this.isFinished) throw new Error("Cannot calculate score before finishing");

    let correct = 0;
    for (let i = 0; i < this.questions.length; i++) {
      if (this.isAnswerCorrect(i)) correct++;
    }

    return {
      total: this.questions.length,
      correct: correct,
      percentage: (correct / this.questions.length) * 100,
      timeTakenMs: this.endTime - this.startTime
    };
  }

  getReview() {
    if (!this.isFinished) throw new Error("Cannot calculate review before finishing");

    return this.questions.map((q, i) => ({
      index: i,
      disciplina: q.disciplina || null,
      userAnswer: this.answers[i] || null,
      correctAnswer: q.resposta_correta,
      isCorrect: this.isAnswerCorrect(i)
    }));
  }

  getBreakdownByArea() {
    if (!this.isFinished) throw new Error("Cannot calculate breakdown before finishing");

    const areas = {};
    this.questions.forEach((q, i) => {
      const area = q.disciplina || 'Outros';
      if (!areas[area]) areas[area] = { area, correct: 0, total: 0 };
      areas[area].total++;
      if (this.isAnswerCorrect(i)) areas[area].correct++;
    });

    return Object.values(areas).map(({ area, correct, total }) => ({
      area,
      correct,
      total,
      percentage: (correct / total) * 100
    }));
  }
}
