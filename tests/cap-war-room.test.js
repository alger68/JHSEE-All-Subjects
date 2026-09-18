import { describe, expect, it } from 'vitest';
import {
  CAP_MOCK_LEVELS,
  normalizeMockExamRecord,
  buildMockWarRoom,
  buildMockAdjustedDiagnostic
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
