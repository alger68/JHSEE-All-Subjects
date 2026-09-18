import { describe, expect, it } from 'vitest';
import {
  adaptiveDashboard,
  buildAdaptivePractice,
  calculateSubjectWeights,
  generationBrief,
  practiceMode,
  recordAdaptiveAttempt,
  skillIdentity,
  targetDifficulty
} from '../js/core/adaptive-learning.js';

const q = (id, subject='english', competency='上下文推論', difficulty=3) => ({
  id,
  subject,
  chapter:'閱讀',
  topic:competency,
  grade:9,
  difficulty,
  question:'Q',
  choices:['A','B','C','D'],
  answer:0,
  explanation:'E',
  hint1:'H1',
  hint2:'H2',
  source:'original',
  tags:[],
  examAligned:true,
  examProfile:{domain:'閱讀理解',type:'推論題',competency},
  questionType:'推論題'
});

describe('adaptive learning engine', () => {
  it('tracks mastery and escalates modes after repeated errors', () => {
    let skills = {};
    let history = [];
    const question = q('e1');
    for (let n=0; n<4; n+=1) {
      const result = recordAdaptiveAttempt(skills, history, question, {
        correct:false,
        date:`2026-09-${String(18+n).padStart(2,'0')}`,
        sourceKind:'practice'
      });
      skills=result.skills;
      history=result.history;
    }
    const profile=skills[skillIdentity(question).key];
    expect(profile.consecutiveWrong).toBe(4);
    expect(profile.diagnosticRequired).toBe(true);
    expect(practiceMode(profile)).toBe('diagnostic');
    expect(profile.mastery).toBeLessThan(60);
    expect(profile.priorityScore).toBeGreaterThanOrEqual(70);
  });

  it('recovers mastery with a correct review and advances spaced review', () => {
    const question=q('e2');
    let result=recordAdaptiveAttempt({},[],question,{correct:false,date:'2026-09-18',sourceKind:'practice'});
    result=recordAdaptiveAttempt(result.skills,result.history,question,{correct:true,date:'2026-09-19',sourceKind:'review'});
    const profile=result.skills[skillIdentity(question).key];
    expect(profile.consecutiveCorrect).toBe(1);
    expect(profile.consecutiveWrong).toBe(0);
    expect(profile.nextReviewDate).toBe('2026-09-22');
  });

  it('keeps subject weights normalized and bounded', () => {
    const english=q('e3');
    const science=q('s1','science','受力分析');
    let state={skills:{},history:[]};
    for(let i=0;i<3;i+=1){
      const e=recordAdaptiveAttempt(state.skills,state.history,english,{correct:false,date:`2026-09-${18+i}`,sourceKind:'mock'});
      state={skills:e.skills,history:e.history};
    }
    const s=recordAdaptiveAttempt(state.skills,state.history,science,{correct:true,date:'2026-09-20',sourceKind:'practice'});
    const weights=calculateSubjectWeights(s.skills,null);
    const total=Object.values(weights).reduce((a,b)=>a+b,0);
    expect(total).toBeGreaterThan(99);
    expect(total).toBeLessThan(101);
    expect(weights.english).toBeGreaterThan(weights.chinese);
    expect(weights.english).toBeLessThanOrEqual(45);
  });

  it('builds a non-duplicated adaptive practice set', () => {
    const questions=[
      q('a1'),q('a2'),q('a3'),q('a4'),
      q('m1','math','情境推理'),q('m2','math','資料分析'),
      q('s1','science','受力分析'),q('s2','science','化學反應'),
      q('c1','chinese','文意理解'),q('g1','social','制度理解')
    ];
    const result=recordAdaptiveAttempt({},[],questions[0],{correct:false,date:'2026-09-18',sourceKind:'practice'});
    const picked=buildAdaptivePractice(questions,6,{
      skills:result.skills,
      subjectWeights:calculateSubjectWeights(result.skills,null),
      today:'2026-09-19',
      rng:()=>0.2
    });
    expect(picked).toHaveLength(6);
    expect(new Set(picked.map(x=>x.id)).size).toBe(6);
  });

  it('creates dashboard counts from skill profiles', () => {
    const question=q('e4');
    let state={skills:{},history:[]};
    for(let i=0;i<4;i+=1){
      const r=recordAdaptiveAttempt(state.skills,state.history,question,{correct:false,date:`2026-09-${18+i}`,sourceKind:'practice'});
      state={skills:r.skills,history:r.history};
    }
    const dashboard=adaptiveDashboard(state.skills,calculateSubjectWeights(state.skills,null),'2026-09-21');
    expect(dashboard.topSkills[0].competency).toBe('上下文推論');
    expect(dashboard.diagnosticCount).toBe(1);
    expect(dashboard.weakCount).toBeGreaterThanOrEqual(1);
  });

  it('builds a targeted generation brief from repeated weakness', () => {
    const question=q('gen1');
    let state={skills:{},history:[]};
    for(let i=0;i<3;i+=1){
      const r=recordAdaptiveAttempt(state.skills,state.history,question,{correct:false,date:`2026-09-${18+i}`,sourceKind:'practice'});
      state={skills:r.skills,history:r.history};
    }
    const profile=state.skills[skillIdentity(question).key];
    const brief=generationBrief(profile,question);
    expect(brief.coreSkill).toBe('上下文推論');
    expect(brief.practiceMode).toBe('remediation');
    expect(brief.targetDifficulty).toBeLessThanOrEqual(question.difficulty);
    expect(targetDifficulty(profile,question.difficulty)).toBe(brief.targetDifficulty);
    expect(brief.requirements.length).toBeGreaterThanOrEqual(5);
    expect(brief.requirements.some(item=>item.includes('刺激形式'))).toBe(true);
  });
});
