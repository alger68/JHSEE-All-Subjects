import { describe, expect, it } from 'vitest';
import { daysUntil, makeBossQuestions, pickLevelQuestions, pickQuickExam } from '../js/core/app-model.js';

describe('application model helpers', () => {
  it('counts calendar days until the first exam day', () => {
    expect(daysUntil('2027-05-15', new Date('2026-09-16T12:00:00+08:00'))).toBe(241);
  });

  it('creates a ten-question boss deck even from a small subject pool', () => {
    const bank = { pick: () => [{ id: 'A' }, { id: 'B' }, { id: 'C' }] };
    expect(makeBossQuestions(bank, 'math', 10, () => 0)).toHaveLength(10);
  });

  it('picks an equal number of quick-exam questions from every subject', () => {
    const bank = { pick: ({ subject }, count) => Array.from({ length: count }, (_, index) => ({ id: `${subject}-${index}`, subject })) };
    const questions = pickQuickExam(bank, 2, () => 0);
    expect(questions).toHaveLength(10);
    expect(new Set(questions.map((question) => question.subject)).size).toBe(5);
  });

  it('selects questions from the matching level instead of mixing a whole subject', () => {
    const bank = {
      all: () => [
        { id: 'v', subject: 'english', chapter: 'Vocabulary Bay' },
        { id: 'g', subject: 'english', chapter: 'Grammar Ridge' },
        { id: 'r', subject: 'english', chapter: 'Reading Sky' },
        { id: 'other', subject: 'math', chapter: '代數城' }
      ],
      pick: () => []
    };
    expect(pickLevelQuestions(bank, 'english', 2, 5, () => 0).every((question) => question.chapter === 'Grammar Ridge')).toBe(true);
    expect(pickLevelQuestions(bank, 'english', 3, 5, () => 0).every((question) => question.chapter === 'Reading Sky')).toBe(true);
  });

  it('supports the Chinese, math, science and social level maps', () => {
    const bank = { all: () => [
      { id: 'c', subject: 'chinese', chapter: '文言古城' },
      { id: 'm', subject: 'math', chapter: '幾何山' },
      { id: 's', subject: 'science', chapter: '理化工坊' },
      { id: 'soc', subject: 'social', chapter: '公民議會' }
    ], pick: () => [] };
    expect(pickLevelQuestions(bank, 'chinese', 2, 1)[0].chapter).toBe('文言古城');
    expect(pickLevelQuestions(bank, 'math', 3, 1)[0].chapter).toBe('幾何山');
    expect(pickLevelQuestions(bank, 'science', 2, 1)[0].chapter).toBe('理化工坊');
    expect(pickLevelQuestions(bank, 'social', 3, 1)[0].chapter).toBe('公民議會');
  });
});
