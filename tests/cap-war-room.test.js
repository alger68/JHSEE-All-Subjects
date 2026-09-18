import { describe, expect, it } from 'vitest';
import {
  CAP_MOCK_LEVELS,
  normalizeMockExamRecord,
  buildMockWarRoom,
  buildMockAdjustedDiagnostic,
  normalizeMockErrorImport,
  buildSevenDayRepairPlan,
  buildCoverageReport
} from '../js/core/cap-war-room.js';

const baseDiagnostic={
  student:'學生',
  source:'初始',
  subjectWeights:{english:30,science:20,math:20,social:15,chinese:10},
  focuses:[]
};

describe('CAP mock war room',()=>{
  it('normalizes a five-subject mock record',()=>{
    const record=normalizeMockExamRecord({
      date:'2026-09-18',
      title:'第一次模考',
      grades:{chinese:'A',english:'B',math:'A+',science:'A',social:'B++'}
    });
    expect(record.date).toBe('2026-09-18');
    expect(record.grades.english).toBe('B');
    expect(record.grades.math).toBe('A+');
    expect(CAP_MOCK_LEVELS).toContain('A++');
  });

  it('rejects incomplete or invalid records',()=>{
    expect(normalizeMockExamRecord({date:'2026-09-18',grades:{english:'A'}})).toBeNull();
    expect(normalizeMockExamRecord({
      date:'2026-09-18',
      grades:{chinese:'A',english:'Z',math:'A',science:'A',social:'A'}
    })).toBeNull();
  });

  it('ranks weaker latest subjects first and shows grade change',()=>{
    const records=[
      normalizeMockExamRecord({date:'2026-08-20',title:'前次',grades:{chinese:'A',english:'B',math:'A',science:'B+',social:'B'}}),
      normalizeMockExamRecord({date:'2026-09-18',title:'本次',grades:{chinese:'A',english:'B+',math:'A+',science:'A',social:'B++'}})
    ];
    const room=buildMockWarRoom(records,{english:30,science:20,math:20,social:15,chinese:10});
    expect(room.latest.title).toBe('本次');
    expect(room.prioritySubjects[0].subject).toBe('english');
    expect(room.trend.english.delta).toBeGreaterThan(0);
    expect(Object.values(room.studyWeights).reduce((a,b)=>a+b,0)).toBeCloseTo(100,0);
  });

  it('builds a diagnostic whose subject weights reflect latest mock weakness',()=>{
    const records=[normalizeMockExamRecord({
      date:'2026-09-18',
      grades:{chinese:'A',english:'C',math:'A+',science:'A',social:'B++'}
    })];
    const adjusted=buildMockAdjustedDiagnostic(baseDiagnostic,records);
    expect(adjusted.subjectWeights.english).toBeGreaterThan(adjusted.subjectWeights.chinese);
    expect(adjusted.source).toContain('模考');
  });
});


it('normalizes mock error details by subject and topic',()=>{
  const details=normalizeMockErrorImport({
    english:{wrong:8,topics:['閱讀理解','上下文推論']},
    science:{wrong:5,topics:['受力分析']},
    math:{wrong:2,topics:['情境應用']},
    social:{wrong:4,topics:['公民']},
    chinese:{wrong:3,topics:['文意理解']}
  });
  expect(details.english.wrong).toBe(8);
  expect(details.english.topics).toContain('上下文推論');
});

it('builds a seven-day repair plan from mock weaknesses',()=>{
  const room=buildMockWarRoom([
    normalizeMockExamRecord({
      date:'2026-09-18',
      grades:{chinese:'A',english:'B',math:'A+',science:'A',social:'B++'},
      errors:{
        english:{wrong:8,topics:['閱讀理解','上下文推論']},
        science:{wrong:5,topics:['受力分析']}
      }
    })
  ],baseDiagnostic.subjectWeights);
  const plan=buildSevenDayRepairPlan(room,'2026-09-19');
  expect(plan).toHaveLength(7);
  expect(plan[0].tasks.length).toBeGreaterThan(0);
  expect(plan.flatMap(day=>day.tasks).some(task=>task.subject==='english')).toBe(true);
});

it('builds coverage by practiced competencies',()=>{
  const questions=[
    {subject:'english',examAligned:true,examProfile:{competency:'上下文推論'}},
    {subject:'english',examAligned:true,examProfile:{competency:'主旨判讀'}},
    {subject:'science',examAligned:true,examProfile:{competency:'受力分析'}}
  ];
  const history=[
    {subject:'english',competency:'上下文推論'},
    {subject:'science',competency:'受力分析'}
  ];
  const coverage=buildCoverageReport(questions,history);
  expect(coverage.english.covered).toBe(1);
  expect(coverage.english.total).toBe(2);
  expect(coverage.english.percent).toBe(50);
});
