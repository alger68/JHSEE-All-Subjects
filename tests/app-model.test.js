import { describe, expect, it } from 'vitest';
import { daysUntil, makeBossQuestions, pickQuickExam } from '../js/core/app-model.js';

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
});
