import { describe, it, expect, beforeEach } from 'vitest';
import { SimuladoEngine } from './SimuladoEngine';

describe('SimuladoEngine', () => {
  let mockQuestions;
  
  beforeEach(() => {
    mockQuestions = [
      { questão: "Q1", resposta_correta: "A" },
      { questão: "Q2", resposta_correta: "B" },
      { questão: "Q3", resposta_correta: "Nula" }
    ];
  });

  it('should initialize correctly', () => {
    const engine = new SimuladoEngine(mockQuestions);
    expect(engine.questions.length).toBe(3);
    expect(engine.isFinished).toBe(false);
  });

  it('should register answers properly', () => {
    const engine = new SimuladoEngine(mockQuestions);
    engine.start();
    engine.answerQuestion(0, "A");
    engine.answerQuestion(1, "C"); // Wrong answer
    
    expect(engine.answers[0]).toBe("A");
    expect(engine.answers[1]).toBe("C");
  });

  it('should calculate score correctly including annulled questions', () => {
    const engine = new SimuladoEngine(mockQuestions);
    engine.start();
    
    // Q1 correct
    engine.answerQuestion(0, "A");
    // Q2 wrong
    engine.answerQuestion(1, "C");
    // Q3 annulled, should count as correct regardless of answer
    
    engine.finish();
    const score = engine.getScore();
    
    expect(score.total).toBe(3);
    expect(score.correct).toBe(2); // Q1 and Q3(Nula)
    expect(score.percentage).toBeCloseTo(66.67, 1);
    expect(score.timeTakenMs).toBeGreaterThanOrEqual(0);
  });

  it('should throw error if answering after finish', () => {
    const engine = new SimuladoEngine(mockQuestions);
    engine.start();
    engine.finish();
    expect(() => engine.answerQuestion(0, "A")).toThrow("Exam is already finished");
  });

  it('should provide a per-question review with the user answer and the correct answer', () => {
    const engine = new SimuladoEngine(mockQuestions);
    engine.start();
    engine.answerQuestion(0, "A"); // correct
    engine.answerQuestion(1, "C"); // wrong
    // Q3 left unanswered, but is annulled
    engine.finish();

    const review = engine.getReview();
    expect(review).toEqual([
      { index: 0, disciplina: null, userAnswer: "A", correctAnswer: "A", isCorrect: true },
      { index: 1, disciplina: null, userAnswer: "C", correctAnswer: "B", isCorrect: false },
      { index: 2, disciplina: null, userAnswer: null, correctAnswer: "Nula", isCorrect: true }
    ]);
  });

  it('should calculate the breakdown of correct/incorrect answers per disciplina', () => {
    const questionsByArea = [
      { questão: "Q1", disciplina: "Português", resposta_correta: "A" },
      { questão: "Q2", disciplina: "Português", resposta_correta: "B" },
      { questão: "Q3", disciplina: "Matemática", resposta_correta: "C" }
    ];
    const engine = new SimuladoEngine(questionsByArea);
    engine.start();
    engine.answerQuestion(0, "A"); // Português correct
    engine.answerQuestion(1, "X"); // Português wrong
    engine.answerQuestion(2, "C"); // Matemática correct
    engine.finish();

    const breakdown = engine.getBreakdownByArea();
    expect(breakdown).toEqual([
      { area: "Português", correct: 1, total: 2, percentage: 50 },
      { area: "Matemática", correct: 1, total: 1, percentage: 100 }
    ]);
  });
});
