import { describe, it, expect, beforeEach } from 'vitest';
import * as Storage from './Storage';

describe('Storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with empty history and error bank', () => {
    expect(Storage.getHistory()).toEqual([]);
    expect(Storage.getErrorBankList()).toEqual([]);
  });

  it('records an attempt in the history', () => {
    Storage.recordAttempt({
      examKey: 'prova-1',
      mode: 'prova',
      score: { total: 2, correct: 1, percentage: 50, timeTakenMs: 1000 },
      breakdown: [],
      review: [
        { index: 0, disciplina: 'português', isCorrect: true },
        { index: 1, disciplina: 'matemática', isCorrect: false }
      ],
      questions: [
        { questão: 'Q1', disciplina: 'português', resposta_correta: 'A' },
        { questão: 'Q2', disciplina: 'matemática', resposta_correta: 'B' }
      ]
    });

    const history = Storage.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].examKey).toBe('prova-1');
    expect(history[0].score.percentage).toBe(50);
  });

  it('adds wrong answers to the error bank and skips correct ones', () => {
    Storage.recordAttempt({
      examKey: 'prova-1',
      mode: 'prova',
      score: { total: 2, correct: 1, percentage: 50, timeTakenMs: 1000 },
      breakdown: [],
      review: [
        { index: 0, disciplina: 'português', isCorrect: true },
        { index: 1, disciplina: 'matemática', isCorrect: false }
      ],
      questions: [
        { questão: 'Q1', disciplina: 'português', resposta_correta: 'A' },
        { questão: 'Q2', disciplina: 'matemática', resposta_correta: 'B' }
      ]
    });

    const bank = Storage.getErrorBankList();
    expect(bank.length).toBe(1);
    expect(bank[0].qid).toBe('prova-1#1');
    expect(bank[0].timesWrong).toBe(1);
  });

  it('removes a question from the error bank once answered correctly', () => {
    const questions = [{ questão: 'Q1', disciplina: 'português', resposta_correta: 'A' }];

    Storage.recordAttempt({
      examKey: 'prova-1',
      mode: 'prova',
      score: { total: 1, correct: 0, percentage: 0, timeTakenMs: 1000 },
      breakdown: [],
      review: [{ index: 0, disciplina: 'português', isCorrect: false }],
      questions
    });
    expect(Storage.getErrorBankList().length).toBe(1);

    Storage.recordAttempt({
      examKey: 'prova-1',
      mode: 'erros',
      score: { total: 1, correct: 1, percentage: 100, timeTakenMs: 1000 },
      breakdown: [],
      review: [{ index: 0, disciplina: 'português', isCorrect: true }],
      questions
    });
    expect(Storage.getErrorBankList().length).toBe(0);
  });

  it('increments timesWrong when a question is missed again', () => {
    const questions = [{ questão: 'Q1', disciplina: 'português', resposta_correta: 'A' }];
    const attempt = {
      examKey: 'prova-1',
      mode: 'prova',
      score: { total: 1, correct: 0, percentage: 0, timeTakenMs: 1000 },
      breakdown: [],
      review: [{ index: 0, disciplina: 'português', isCorrect: false }],
      questions
    };

    Storage.recordAttempt(attempt);
    Storage.recordAttempt(attempt);

    const bank = Storage.getErrorBankList();
    expect(bank.length).toBe(1);
    expect(bank[0].timesWrong).toBe(2);
  });

  it('builds a practice set from the error bank carrying the origin qid', () => {
    Storage.recordAttempt({
      examKey: 'prova-1',
      mode: 'prova',
      score: { total: 1, correct: 0, percentage: 0, timeTakenMs: 1000 },
      breakdown: [],
      review: [{ index: 0, disciplina: 'português', isCorrect: false }],
      questions: [{ questão: 'Q1', disciplina: 'português', resposta_correta: 'A' }]
    });

    const practiceSet = Storage.buildErrorPracticeSet();
    expect(practiceSet.length).toBe(1);
    expect(practiceSet[0]._qid).toBe('prova-1#0');
    expect(practiceSet[0]._examKey).toBe('prova-1');
    expect(practiceSet[0].questão).toBe('Q1');
  });

  it('keeps qid stable for practice-set answers so they update the same bank entry', () => {
    Storage.recordAttempt({
      examKey: 'prova-1',
      mode: 'prova',
      score: { total: 1, correct: 0, percentage: 0, timeTakenMs: 1000 },
      breakdown: [],
      review: [{ index: 0, disciplina: 'português', isCorrect: false }],
      questions: [{ questão: 'Q1', disciplina: 'português', resposta_correta: 'A' }]
    });

    const practiceSet = Storage.buildErrorPracticeSet();
    Storage.recordAttempt({
      examKey: 'caderno de erros',
      mode: 'erros',
      score: { total: 1, correct: 1, percentage: 100, timeTakenMs: 500 },
      breakdown: [],
      review: [{ index: 0, disciplina: 'português', isCorrect: true }],
      questions: practiceSet
    });

    expect(Storage.getErrorBankList().length).toBe(0);
  });

  it('clears the history without touching the error bank', () => {
    Storage.recordAttempt({
      examKey: 'prova-1',
      mode: 'prova',
      score: { total: 1, correct: 0, percentage: 0, timeTakenMs: 1000 },
      breakdown: [],
      review: [{ index: 0, disciplina: 'português', isCorrect: false }],
      questions: [{ questão: 'Q1', disciplina: 'português', resposta_correta: 'A' }]
    });

    Storage.clearHistory();
    expect(Storage.getHistory()).toEqual([]);
    expect(Storage.getErrorBankList().length).toBe(1);
  });
});
