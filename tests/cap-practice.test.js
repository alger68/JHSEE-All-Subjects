import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { createQuestionBank } from '../js/core/question-bank.js';
const questions=JSON.parse(readFileSync('data/cap-practice.json','utf8'));
it('adds reviewed contextual practice in every subject, all playable with distinct answers',()=>{
  const bank=createQuestionBank(questions);
  expect(bank.diagnostics).toEqual([]);
  for(const subject of ['chinese','english','math','science','social'])expect(bank.filter({subject}).length).toBeGreaterThanOrEqual(6);
  for(const q of bank.all()){
    expect(q.examAligned).toBe(true);
    expect(q.source).toBe('original');
    expect(q.alignmentBasis).toContain('https://cap.rcpet.edu.tw');
    expect(new Set(q.choices).size).toBe(4);
    expect(q.passage||q.table).toBeTruthy();
  }
});


it('keeps the expanded CAP-aligned bank balanced and varied',()=>{
  const bank=createQuestionBank(questions);
  for(const subject of ['chinese','english','math','science','social']){
    const list=bank.filter({subject});
    expect(list).toHaveLength(30);
    expect(new Set(list.map(q=>q.id)).size).toBe(30);
    expect(new Set(list.map(q=>q.questionType))).toEqual(
      new Set(['閱讀理解','推論','資料分析','情境應用'])
    );
    const difficulties=new Set(list.map(q=>q.difficulty));
    expect(difficulties.has(2)).toBe(true);
    expect(difficulties.has(3)).toBe(true);
    expect(difficulties.has(4)).toBe(true);
    for(const q of list){
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
      expect(q.passage||q.table).toBeTruthy();
      expect(q.explanation.length).toBeGreaterThan(12);
      expect(q.hint1.length).toBeGreaterThan(2);
      expect(q.hint2.length).toBeGreaterThan(2);
    }
  }
  expect(bank.all()).toHaveLength(150);
});
