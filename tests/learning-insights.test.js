import { describe, expect, it } from 'vitest';
import { adaptiveSnapshot, buildParentSummary, errorReasonStats, upsertAdaptiveSnapshot } from '../js/core/learning-insights.js';

describe('learning insights',()=>{
  const skills={
    e:{subject:'english',competency:'推論',mastery:40,priorityScore:85,nextReviewDate:'2026-09-19'},
    m:{subject:'math',competency:'情境列式',mastery:80,priorityScore:45,nextReviewDate:'2026-09-22'}
  };
  it('stores one progress snapshot per day',()=>{
    const a=adaptiveSnapshot(skills,'2026-09-18');
    const b=adaptiveSnapshot({...skills,e:{...skills.e,mastery:55}},'2026-09-18');
    const list=upsertAdaptiveSnapshot([a],b);
    expect(list).toHaveLength(1);
    expect(list[0].subjects.english).toBe(55);
  });
  it('aggregates both automatic and manual error reasons',()=>{
    const stats=errorReasonStats(
      [{correct:false,errorReason:'忽略關鍵線索'},{correct:false,errorReason:'忽略關鍵線索'}],
      [{questionId:'q1',reason:'calculation'}]
    );
    expect(stats[0]).toMatchObject({label:'忽略關鍵線索',count:2});
    expect(stats.some(x=>x.label==='計算失誤')).toBe(true);
  });
  it('creates a concise parent summary and tomorrow plan',()=>{
    const state={
      adaptiveSkills:skills,
      answerHistory:[
        {date:'2026-09-18',correct:true,subject:'english'},
        {date:'2026-09-18',correct:false,subject:'english',errorReason:'忽略關鍵線索'}
      ],
      wrongQuestions:[],
      aiUsage:{date:'2026-09-18',questions:3,requests:2,limit:15},
      currentLearningCycle:2
    };
    const summary=buildParentSummary(state,'2026-09-18');
    expect(summary.today).toMatchObject({answered:2,correct:1,accuracy:50});
    expect(summary.topWeaknesses[0].competency).toBe('推論');
    expect(summary.tomorrowPlan.length).toBeGreaterThan(0);
    expect(summary.ai.remaining).toBe(12);
  });
});
