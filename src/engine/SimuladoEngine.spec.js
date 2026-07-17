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
});
