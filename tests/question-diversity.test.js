import { describe, expect, it } from 'vitest';
import {
  recentQuestionIds,
  buildPracticeReservoir,
  preferFreshQuestions,
  recentAvoidQuestions,
  recentQuestionFingerprints
} from '../js/core/question-diversity.js';

describe('question diversity pool',()=>{
  it('tracks unique recently answered ids newest first',()=>{
    const history=[
      {questionId:'a'},{questionId:'b'},{questionId:'a'},{questionId:'c'}
    ];
    expect([...recentQuestionIds(history,2)]).toEqual(['c','a']);
  });

  it('merges cached AI questions into the local reservoir without duplicate ids',()=>{
    const local=[{id:'a',subject:'english'},{id:'b',subject:'math'}];
    const ai=[{id:'b',subject:'math',aiGenerated:true},{id:'c',subject:'english',aiGenerated:true}];
    expect(buildPracticeReservoir(local,ai).map(q=>q.id)).toEqual(['a','b','c']);
  });

  it('prefers fresh questions but keeps due review questions eligible',()=>{
    const questions=[
      {id:'old',subject:'english',examProfile:{domain:'R',competency:'K'}},
      {id:'fresh',subject:'english',examProfile:{domain:'R2',competency:'K2'}},
      {id:'due',subject:'english',examProfile:{domain:'R3',competency:'K3'}}
    ];
    const recent=new Set(['old','due']);
    const skills={
      'english::R3::K3':{nextReviewDate:'2026-09-18'}
    };
    const result=preferFreshQuestions(questions,recent,skills,'2026-09-18',2);
    expect(result.map(q=>q.id)).toEqual(expect.arrayContaining(['fresh','due']));
    expect(result.map(q=>q.id)).not.toContain('old');
  });

  it('returns compact recent question examples for AI anti-repeat prompts',()=>{
    const questions=[
      {id:'1',question:'Q1',passage:'P1'},
      {id:'2',question:'Q2',passage:'P2'},
      {id:'3',question:'Q3',passage:'P3'}
    ];
    expect(recentAvoidQuestions(questions,2)).toEqual([
      {question:'Q2',passage:'P2'},
      {question:'Q3',passage:'P3'}
    ]);
  });
  it('collapses different ids with the same recent fingerprint',()=>{
    const lookup=new Map([
      ['a',{id:'a',question:'Same prompt',passage:'Same material',competency:'K',questionType:'T'}],
      ['b',{id:'b',question:'Same prompt',passage:'Same material',competency:'K',questionType:'T'}]
    ]);
    const result=recentQuestionFingerprints([{questionId:'a'},{questionId:'b'}],lookup,30);
    expect(result.size).toBe(1);
  });
});
