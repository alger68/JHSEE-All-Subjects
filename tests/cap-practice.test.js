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
