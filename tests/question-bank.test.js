import { describe, expect, it } from 'vitest';
import { createQuestionBank, validateQuestion } from '../js/core/question-bank.js';

const makeQuestion = (overrides = {}) => ({
  id: 'MATH-ALG-001', subject: 'math', chapter: '代數城', topic: '一元一次方程式',
  grade: 7, difficulty: 1, question: '2x + 7 = 19，x = ?',
  choices: ['4', '5', '6', '7'], answer: 2,
  explanation: '2x = 12，所以 x = 6。', hint1: '先移項。', hint2: '2x = 12。',
  source: 'original', tags: ['代數'], ...overrides
});

describe('question bank', () => {
  it('accepts a complete original question', () => {
    expect(validateQuestion(makeQuestion())).toEqual({ ok: true, errors: [] });
  });

  it('rejects an answer outside the choices', () => {
    expect(validateQuestion(makeQuestion({ answer: 9 })).errors).toContain('answer must point to a choice');
  });

  it('filters by subject and topic and excludes duplicate ids', () => {
    const bank = createQuestionBank([
      makeQuestion(),
      makeQuestion({ id: 'MATH-GEO-001', topic: '三角形' }),
      makeQuestion({ id: 'MATH-ALG-001', question: 'duplicate' })
    ]);
    expect(bank.filter({ subject: 'math', topic: '三角形' }).map((q) => q.id)).toEqual(['MATH-GEO-001']);
    expect(bank.diagnostics.some((item) => item.includes('duplicate id'))).toBe(true);
  });

  it('uses injected randomness when picking questions', () => {
    const bank = createQuestionBank([
      makeQuestion({ id: 'Q1' }), makeQuestion({ id: 'Q2' }), makeQuestion({ id: 'Q3' })
    ]);
    expect(bank.pick({ subject: 'math' }, 2, () => 0).map((q) => q.id)).toEqual(['Q2', 'Q3']);
  });
});
