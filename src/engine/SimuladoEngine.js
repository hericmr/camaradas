// This engine handles the core logic for the exams.
// Pure JS, decoupled from the UI.
export class SimuladoEngine {
  constructor(examData) {
    this.questions = examData;
    this.answers = {}; // questionIndex -> letter selected
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
    this.answers[index] = letter;
  }

  finish() {
    this.endTime = Date.now();
    this.isFinished = true;
  }

  getScore() {
    if (!this.isFinished) throw new Error("Cannot calculate score before finishing");
    
    let correct = 0;
    for (let i = 0; i < this.questions.length; i++) {
      const q = this.questions[i];
      if (q.resposta_correta === 'Nula') {
        correct++; // Anuladas count as correct
      } else if (this.answers[i] === q.resposta_correta) {
        correct++;
      }
    }
    
    return {
      total: this.questions.length,
      correct: correct,
      percentage: (correct / this.questions.length) * 100,
      timeTakenMs: this.endTime - this.startTime
    };
  }
}
