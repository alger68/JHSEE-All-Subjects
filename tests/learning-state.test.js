import { describe, expect, it } from 'vitest';
import { createAdaptiveReset, createNewLearningCycle, cycleArchiveSnapshot } from '../js/core/learning-state.js';

const base={
  player:{exp:100,totalAnswered:30},
  wrongQuestions:[{questionId:'q1'}],
  examReports:[{sessionId:'r1'}],
  attempts:[{title:'測驗'}],
  adaptiveSkills:{'english::閱讀::推論':{subject:'english',competency:'推論',mastery:42,priorityScore:80}},
  answerHistory:[{questionId:'q1'}],
  adaptiveSubjectWeights:{english:30},
  generatedQuestions:[{id:'ai1'}],
  adaptiveSnapshots:[{date:'2026-09-17'}],
  learningCycles:[],
  currentLearningCycle:1,
  activeExam:{id:'exam'}
};

describe('learning reset modes',()=>{
  it('resets only adaptive memory while preserving history and reports',()=>{
    const next=createAdaptiveReset(base);
    expect(next.wrongQuestions).toEqual(base.wrongQuestions);
    expect(next.examReports).toEqual(base.examReports);
    expect(next.player.exp).toBe(100);
    expect(next.adaptiveSkills).toEqual({});
    expect(next.answerHistory).toEqual([]);
    expect(next.generatedQuestions).toEqual([]);
    expect(next.activeExam).toBeNull();
  });
  it('archives a learning cycle before starting the next one',()=>{
    const next=createNewLearningCycle(base,'2026-09-18');
    expect(next.currentLearningCycle).toBe(2);
    expect(next.learningCycles).toHaveLength(1);
    expect(next.learningCycles[0]).toMatchObject({cycle:1,endedAt:'2026-09-18',answered:30});
    expect(next.adaptiveSkills).toEqual({});
    expect(next.examReports).toEqual(base.examReports);
  });
  it('summarizes the strongest recorded cycle facts',()=>{
    const snap=cycleArchiveSnapshot(base,'2026-09-18');
    expect(snap.topSkills[0]).toMatchObject({subject:'english',competency:'推論',mastery:42});
    expect(snap.openWrong).toBe(1);
  });
});
