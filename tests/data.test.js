import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateQuestion } from '../js/core/question-bank.js';
import { createQuestionBank } from '../js/core/question-bank.js';
import { pickLevelQuestions } from '../js/core/app-model.js';
import { classifyQuestion } from '../js/core/exam-blueprint.js';

const questions = JSON.parse(readFileSync(join(process.cwd(), 'data/questions.json'), 'utf8'));
const practice = JSON.parse(readFileSync(join(process.cwd(), 'data/cap-practice.json'), 'utf8'));

describe('V1 question content', () => {
  it('contains at least six valid original questions per subject', () => {
    for (const subject of ['chinese', 'english', 'math', 'science', 'social']) {
      const items = questions.filter((question) => question.subject === subject);
      expect(items.length).toBeGreaterThanOrEqual(10);
      expect(items.every((question) => validateQuestion(question).ok)).toBe(true);
    }
  });

  it('has globally unique ids', () => {
    expect(new Set(questions.map((question) => question.id)).size).toBe(questions.length);
  });

  it('offers five different questions in every subject level', () => {
    const bank = createQuestionBank([...questions, ...practice]);
    for (const subject of ['chinese', 'english', 'math', 'science', 'social']) {
      for (const level of [1, 2, 3]) {
        const deck = pickLevelQuestions(bank, subject, level, 5, () => 0.5);
        expect(deck, `${subject} level ${level}`).toHaveLength(5);
        expect(new Set(deck.map((question) => question.id)).size, `${subject} level ${level} ids`).toBe(5);
        expect(new Set(deck.map((question) => `${question.passage ?? ''}\n${question.question}`)).size, `${subject} level ${level} prompts`).toBe(5);
      }
    }
  });

  it('does not infer reviewed exam alignment or a domain from legacy tags and RPG chapters', () => {
    const classified = classifyQuestion(questions[0]);
    expect(classified.examAligned).toBe(false);
    expect(classified.examProfile).toEqual({ domain: '未分類', type: '未分類', competency: '未分類' });
    expect(classified.examProfile.domain).not.toBe(questions[0].chapter);
  });

  it('requires explicit reviewed alignment metadata', () => {
    const base = {
      ...questions[0],
      examAligned: true,
      domain: '白話文閱讀',
      questionType: '主旨推論',
      competency: '閱讀理解與推論',
      alignmentBasis: '依官方命題原則檢核',
      reviewStatus: 'reviewed'
    };

    expect(classifyQuestion(base)).toMatchObject({
      examAligned: true,
      examProfile: { domain: '白話文閱讀', type: '主旨推論', competency: '閱讀理解與推論' }
    });
    expect(classifyQuestion({ ...base, reviewStatus: 'draft' })).toMatchObject({
      examAligned: false,
      examProfile: { domain: '未分類', type: '未分類', competency: '未分類' }
    });
  });
});
