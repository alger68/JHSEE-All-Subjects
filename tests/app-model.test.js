import { describe, expect, it } from 'vitest';
import { daysUntil, levelQuestionPool, makeBossQuestions, pickLevelQuestions, pickQuickExam } from '../js/core/app-model.js';

describe('application model helpers', () => {
  it('counts calendar days until the first exam day', () => {
    expect(daysUntil('2027-05-15', new Date('2026-09-16T12:00:00+08:00'))).toBe(241);
  });

  it('keeps a short boss deck unique rather than repeating questions to fill ten slots', () => {
    const bank = { pick: () => [{ id: 'A' }, { id: 'B' }, { id: 'C' }] };
    const deck=makeBossQuestions(bank,'math',10,()=>0);
    expect(deck).toHaveLength(3);
    expect(new Set(deck.map(q=>q.id)).size).toBe(3);
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

  it('includes reviewed CAP-oriented units in their matching level only', () => {
    const reviewed = (id, subject, chapter) => ({ id, subject, chapter, examAligned: true, reviewStatus: 'reviewed' });
    const bank = { all: () => [
      { id: 'legacy', subject: 'english', chapter: 'Grammar Ridge' },
      reviewed('grammar', 'english', '基本文法'),
      reviewed('cloze', 'english', '克漏字'),
      reviewed('reading', 'english', '閱讀理解'),
      reviewed('other-subject', 'chinese', '基本文法'),
      { ...reviewed('draft', 'english', '基本文法'), reviewStatus: 'draft' },
      { ...reviewed('unclassified', 'english', '基本文法'), examAligned: false }
    ], pick: () => [] };

    expect(levelQuestionPool(bank, 'english', 2).map((question) => question.id)).toEqual(['legacy', 'grammar', 'cloze']);
    expect(pickLevelQuestions(bank, 'english', 2, 3, () => 0.5).map((question) => question.id).sort()).toEqual(['cloze', 'grammar', 'legacy']);
    expect(levelQuestionPool(bank, 'english', 3).map((question) => question.id)).toEqual(['reading']);
  });

  it('draws unattempted level questions before replaying earlier answers',()=>{
    const pool=Array.from({length:12},(_,i)=>({id:`Q${i}`,subject:'english',chapter:'Grammar Ridge'}));
    const bank={all:()=>pool};
    const history=pool.slice(0,7).map(q=>({questionId:q.id}));
    const deck=pickLevelQuestions(bank,'english',2,5,()=>0.5,history);
    expect(deck.map(q=>q.id).sort()).toEqual(pool.slice(7).map(q=>q.id).sort());
  });

  it('replays the least recently attempted questions only after the fresh pool is exhausted',()=>{
    const pool=Array.from({length:5},(_,i)=>({id:`Q${i}`,subject:'english',chapter:'Grammar Ridge'}));
    const history=[...pool.map(q=>({questionId:q.id})),{questionId:'Q0'}];
    const deck=pickLevelQuestions({all:()=>pool},'english',2,2,()=>0.5,history);
    expect(deck.map(q=>q.id)).toEqual(['Q1','Q2']);
  });

  it('never pads a short adventure pool with duplicate questions',()=>{
    const pool=[{id:'only',subject:'english',chapter:'Grammar Ridge'}];
    expect(pickLevelQuestions({all:()=>pool},'english',2,10)).toHaveLength(1);
  });
});
