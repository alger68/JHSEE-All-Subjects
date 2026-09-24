import { describe, expect, it } from 'vitest';
import {
  calculateExamPlacementScore,
  calculateTotalAdmissionScore,
  buildPlacementBands,
  nextGrade,
  subjectUpgradePlan,
  targetSchoolAnalysis,
  buildTargetSevenDayPlan,
  buildPlacementModel
} from '../js/core/admission-placement.js';

const grades={chinese:'B++',english:'B+',math:'A',science:'B++',social:'B++'};

describe('admission placement',()=>{
  it('calculates the 115 reference exam score on a 36-point scale',()=>{
    const result=calculateExamPlacementScore(grades,4);
    expect(result.complete).toBe(true);
    expect(result.subjectPoints).toBe(20);
    expect(result.writingPoints).toBe(0.6);
    expect(result.examScore).toBe(20.6);
    expect(result.max).toBe(36);
  });

  it('calculates the optional official 108-point total when all components are provided',()=>{
    const exam=calculateExamPlacementScore(grades,4);
    const result=calculateTotalAdmissionScore(exam,{preferencePoints:36,balancedPoints:24,servicePoints:12});
    expect(result.complete).toBe(true);
    expect(result.total).toBe(92.6);
    expect(result.max).toBe(108);
  });

  it('does not assume multi-learning points when they are not supplied',()=>{
    const exam=calculateExamPlacementScore(grades,4);
    const result=calculateTotalAdmissionScore(exam,{});
    expect(result.complete).toBe(false);
    expect(result.total).toBeNull();
  });

  it('requires all five subject levels',()=>{
    const result=calculateExamPlacementScore({...grades,english:''},4);
    expect(result.complete).toBe(false);
  });

  it('builds challenge, match and safer reference bands around a score',()=>{
    const bands=buildPlacementBands(21.6,'all');
    expect(bands.match.some(school=>school.id==='yongping'||school.id==='xinzhuang')).toBe(true);
    expect(Object.keys(bands)).toEqual(['challenge','match','safe']);
  });

  it('moves one CAP mark at a time',()=>{
    expect(nextGrade('B+')).toBe('B++');
    expect(nextGrade('A++')).toBeNull();
  });

  it('prioritizes lower current levels plus adaptive weight',()=>{
    const plan=subjectUpgradePlan(grades,{english:35,science:25,math:15,social:15,chinese:10});
    expect(plan[0].subject).toBe('english');
    expect(plan[0]).toMatchObject({current:'B+',next:'B++',gain:1});
  });

  it('computes a target-school gap and upgrade paths',()=>{
    const analysis=targetSchoolAnalysis(26.8,{...grades,english:'A+',science:'A+'},'banqiao',{english:30});
    expect(analysis.school.name).toContain('板橋');
    expect(analysis.gapToLow).toBe(1);
    expect(analysis.upgrades.length).toBeGreaterThan(0);
  });

  it('builds a seven-day target-school repair plan from score gap and adaptive weaknesses',()=>{
    const target=targetSchoolAnalysis(20.6,grades,'banqiao',{english:35,science:25,math:15,social:15,chinese:10});
    const plan=buildTargetSevenDayPlan(target,{
      'english::閱讀理解::上下文推論':{
        subject:'english',domain:'閱讀理解',competency:'上下文推論',
        mastery:42,priorityScore:88
      },
      'science::理化::受力分析':{
        subject:'science',domain:'理化',competency:'受力分析',
        mastery:50,priorityScore:76
      }
    },'2026-09-24');
    expect(plan).toHaveLength(7);
    expect(plan[0].date).toBe('2026-09-24');
    expect(plan[6].date).toBe('2026-09-30');
    expect(plan[0].tasks[0].subject).toBe('english');
    expect(plan[0].tasks[0].competency).toBe('上下文推論');
    expect(plan.every(day=>day.questionTarget>0)).toBe(true);
    expect(plan[6].phase).toBe('週末驗收');
  });

  it('uses latest mock grades by default but preserves writing and target preferences',()=>{
    const model=buildPlacementModel({
      latestMock:{grades:{chinese:'A',english:'B',math:'A+',science:'A',social:'B++'}},
      profile:{source:'latest-mock',grades:{},writing:5,gender:'all',targetSchoolId:'banqiao'}
    });
    expect(model.profile.grades.english).toBe('B');
    expect(model.score.writingPoints).toBe(0.8);
    expect(model.target.school.id).toBe('banqiao');
  });
});
