import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateQuestion } from '../js/core/question-bank.js';

const questions = JSON.parse(readFileSync(join(process.cwd(), 'data/questions.json'), 'utf8'));

describe('V1 question content', () => {
  it('contains at least six valid original questions per subject', () => {
    for (const subject of ['chinese', 'english', 'math', 'science', 'social']) {
      const items = questions.filter((question) => question.subject === subject);
      expect(items.length).toBeGreaterThanOrEqual(6);
      expect(items.every((question) => validateQuestion(question).ok)).toBe(true);
    }
  });

  it('has globally unique ids', () => {
    expect(new Set(questions.map((question) => question.id)).size).toBe(questions.length);
  });
});
