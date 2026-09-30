import { describe, expect, it } from 'vitest';
import {
  PERSONAL_DIAGNOSTIC,
  diagnosticCards,
  prioritizeQuestions,
  personalizedQuestionScore,
  buildStarterPractice
} from '../js/core/personalization.js';

const targetedDiagnostic = {
  subjectWeights: { english: 30, science: 20, math: 20, social: 15, chinese: 10 },
  focuses: [
    { label: '英文閱讀', result: '5 / 10', priority: '最高', recommendation: '練習閱讀推論。', subject: 'english', match: /reading|閱讀/i },
    { label: '自然理化', result: '6 / 10', priority: '最高', recommendation: '練習理化分析。', subject: 'science', match: /理化|物理|化學/i }
  ]
};

describe('personalized diagnostic', () => {
  it('starts a new student with equal subject weights and no borrowed weak points', () => {
    expect(PERSONAL_DIAGNOSTIC.student).toBe('新同學');
    expect(PERSONAL_DIAGNOSTIC.source).toBe('尚未輸入模考');
    expect(PERSONAL_DIAGNOSTIC.subjectWeights).toEqual({
      english: 20, science: 20, math: 20, social: 20, chinese: 20
    });
    expect(diagnosticCards()).toEqual([]);
    const reading = { subject: 'english', questionType: '閱讀理解', examAligned: true };
    const geometry = { subject: 'math', questionType: '幾何', examAligned: true };
    expect(personalizedQuestionScore(reading)).toBe(personalizedQuestionScore(geometry));
  });

  it('gives weak topic questions more priority than stable topics', () => {
    const reading = { subject: 'english', chapter: 'Reading Sky', questionType: '閱讀理解', topic: '主旨判讀' };
    const vocabulary = { subject: 'english', chapter: 'Vocabulary Bay', questionType: '情境應用', topic: 'Vocabulary' };
    const physics = { subject: 'science', chapter: '理化工坊', questionType: '資料分析', topic: '力與運動' };
    expect(personalizedQuestionScore(reading, targetedDiagnostic)).toBeGreaterThan(personalizedQuestionScore(vocabulary, targetedDiagnostic));
    expect(personalizedQuestionScore(physics, targetedDiagnostic)).toBeGreaterThan(0);
  });

  it('orders a practice pool by the current diagnostic before the session starts', () => {
    const pool = [
      { id: 'math-1', subject: 'math', chapter: '幾何山', questionType: '閱讀理解', topic: '三角形' },
      { id: 'english-1', subject: 'english', chapter: 'Reading Sky', questionType: '閱讀理解', topic: '推論' },
      { id: 'science-1', subject: 'science', chapter: '理化工坊', questionType: '資料分析', topic: '化學' }
    ];
    expect(prioritizeQuestions(pool, targetedDiagnostic).map((item) => item.id)).toEqual(['english-1', 'science-1', 'math-1']);
  });

  it('exposes a concise diagnostic card for the analysis page', () => {
    expect(diagnosticCards(targetedDiagnostic)).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: '英文閱讀', result: '5 / 10', priority: '最高' }),
      expect.objectContaining({ label: '自然理化', result: '6 / 10', priority: '最高' })
    ]));
  });

  it('gives an undiagnosed student two starter questions from each subject',()=>{
    const subjects=['english','science','math','social','chinese'];
    const pool=subjects.flatMap(subject=>Array.from({length:8},(_,i)=>({
      id:`${subject}-${i}`,
      subject,
      examAligned:true,
      chapter:subject==='english'?'Reading Sky':'一般',
      questionType:'閱讀理解',
      topic:`topic-${i}`
    })));
    const selected=buildStarterPractice(pool,10,{rng:()=>0.5});
    const counts=Object.fromEntries(subjects.map(subject=>[
      subject,selected.filter(q=>q.subject===subject).length
    ]));
    expect(selected).toHaveLength(10);
    expect(new Set(selected.map(q=>q.id)).size).toBe(10);
    expect(counts).toEqual({english:2,science:2,math:2,social:2,chinese:2});
  });

  it('uses a student-provided diagnostic to increase weak subject coverage',()=>{
    const subjects=['english','science','math','social','chinese'];
    const pool=subjects.flatMap(subject=>Array.from({length:8},(_,i)=>({id:`${subject}-${i}`,subject})));
    const selected=buildStarterPractice(pool,10,{diagnostic:targetedDiagnostic,rng:()=>0.5});
    expect(Object.fromEntries(subjects.map(subject=>[
      subject,selected.filter(q=>q.subject===subject).length
    ]))).toEqual({english:3,science:2,math:2,social:2,chinese:1});
  });

  it('can vary starter questions across sessions while keeping subject quotas',()=>{
    const pool=['english','science','math','social','chinese'].flatMap(subject=>
      Array.from({length:8},(_,i)=>({id:`${subject}-${i}`,subject,examAligned:true,topic:`T${i}`}))
    );
    const a=buildStarterPractice(pool,10,{rng:()=>0.05});
    const b=buildStarterPractice(pool,10,{rng:()=>0.95});
    expect(a.map(q=>q.id)).not.toEqual(b.map(q=>q.id));
    expect(new Set(a.map(q=>q.id)).size).toBe(10);
    expect(new Set(b.map(q=>q.id)).size).toBe(10);
  });
});
