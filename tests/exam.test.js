import { describe, expect, it } from 'vitest';
import { createExam, submitExam } from '../js/core/exam.js';

const questions = [
  { id: 'M1', subject: 'math', question: '1+1?', choices: ['1', '2'], answer: 1, explanation: '2' },
  { id: 'E1', subject: 'english', question: 'cat?', choices: ['貓', '狗'], answer: 0, explanation: 'cat 是貓' }
];

describe('quick exam', () => {
  it('does not reveal answers before submission', () => {
    const exam = createExam(questions, { durationMinutes: 20 });
    expect(exam.questions.every((question) => !('answer' in question) && !('explanation' in question))).toBe(true);
  });

  it('scores answers only at submission', () => {
    const exam = createExam(questions, { durationMinutes: 20 });
    expect(submitExam(exam, { M1: 1, E1: 1 })).toMatchObject({ total: 2, correct: 1, accuracy: 50 });
  });
});
