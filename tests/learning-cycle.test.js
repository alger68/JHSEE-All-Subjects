import { describe, expect, it } from 'vitest';
import {
  applyResetMode,
  aiAllowance,
  recordAiUsage,
  buildSevenDayTrend,
  buildParentSummary,
  buildErrorReasonStats,
  pickDiagnosticQuestions
} from '../js/core/learning-cycle.js';

const q=(id,subject)=>({id,subject,examAligned:true,difficulty:3});

describe('learning cycle controls',()=>{
  it('resets only adaptive memory while preserving reports and wrong questions',()=>{
    const state={
      adaptiveSkills:{x:{mastery:20}},answerHistory:[{id:1}],adaptiveSubjectWeights:{english:40},
      generatedQuestions:[{id:'ai1'}],wrongQuestions:[{questionId:'q1'}],examReports:[{id:'r1'}],
      player:{exp:100}
    };
    const next=applyResetMode(state,'adaptive','2026-09-18');
    expect(next.adaptiveSkills).toEqual({});
    expect(next.answerHistory).toEqual([]);
    expect(next.generatedQuestions).toEqual([]);
    expect(next.wrongQuestions).toHaveLength(1);
    expect(next.examReports).toHaveLength(1);
    expect(next.player.exp).toBe(100);
  });

  it('starts a new learning cycle and archives the old adaptive state',()=>{
    const state={
      adaptiveSkills:{x:{mastery:20}},answerHistory:[{date:'2026-09-18'}],
      wrongQuestions:[{questionId:'q1'}],examReports:[{id:'r1'}],learningCycles:[]
    };
    const next=applyResetMode(state,'new-cycle','2026-09-18');
    expect(next.learningCycles).toHaveLength(1);
    expect(next.learningCycles[0].endedOn).toBe('2026-09-18');
    expect(next.adaptiveSkills).toEqual({});
    expect(next.answerHistory).toEqual([]);
    expect(next.wrongQuestions).toEqual([]);
    expect(next.examReports).toHaveLength(1);
  });

  it('enforces a daily AI generated-question quota',()=>{
    expect(aiAllowance({date:'2026-09-18',count:10,limit:12},'2026-09-18',4)).toBe(2);
    expect(aiAllowance({date:'2026-09-17',count:12,limit:12},'2026-09-18',4)).toBe(4);
    expect(recordAiUsage({date:'2026-09-18',count:10,limit:12},'2026-09-18',2)).toMatchObject({count:12,limit:12});
  });

  it('builds seven-day mastery trend by subject',()=>{
    const history=[
      {date:'2026-09-12',subject:'english',masteryAfter:50},
      {date:'2026-09-14',subject:'english',masteryAfter:60},
      {date:'2026-09-18',subject:'english',masteryAfter:70}
    ];
    const trend=buildSevenDayTrend(history,'2026-09-18');
    expect(trend.english.delta).toBe(20);
    expect(trend.english.latest).toBe(70);
  });

  it('creates a concise parent summary',()=>{
    const summary=buildParentSummary({
      history:[{date:'2026-09-18',correct:false},{date:'2026-09-18',correct:true}],
      skills:{
        a:{competency:'上下文推論',subject:'english',priorityScore:88,mastery:42,nextReviewDate:'2026-09-18'},
        b:{competency:'受力分析',subject:'science',priorityScore:75,mastery:51,nextReviewDate:'2026-09-20'}
      },
      today:'2026-09-18',
      aiUsage:{date:'2026-09-18',count:4,limit:12}
    });
    expect(summary.answeredToday).toBe(2);
    expect(summary.topWeak[0].competency).toBe('上下文推論');
    expect(summary.dueCount).toBe(1);
    expect(summary.aiRemaining).toBe(8);
  });

  it('picks a balanced 25-question diagnostic set across five subjects',()=>{
    const questions=['chinese','english','math','science','social'].flatMap(subject=>
      Array.from({length:8},(_,i)=>q(`${subject}-${i}`,subject))
    );
    const picked=pickDiagnosticQuestions(questions,25);
    expect(picked).toHaveLength(25);
    for(const subject of ['chinese','english','math','science','social']){
      expect(picked.filter(item=>item.subject===subject)).toHaveLength(5);
    }
  });
});


it('preserves the current daily AI usage when adaptive memory is reset',()=>{
  const state={aiUsage:{date:'2026-09-18',count:7,limit:12},adaptiveSkills:{x:{mastery:20}},answerHistory:[{}]};
  expect(applyResetMode(state,'adaptive','2026-09-18').aiUsage).toEqual({date:'2026-09-18',count:7,limit:12});
  expect(applyResetMode(state,'new-cycle','2026-09-18').aiUsage).toEqual({date:'2026-09-18',count:7,limit:12});
});

it('aggregates automatic and manual error reasons for reporting',()=>{
  const stats=buildErrorReasonStats(
    [
      {correct:false,errorReason:'忽略關鍵線索'},
      {correct:false,errorReason:'忽略關鍵線索'},
      {correct:true,errorReason:null}
    ],
    [{questionId:'q1',reason:'calculation'}]
  );
  expect(stats[0]).toMatchObject({label:'忽略關鍵線索',count:2});
  expect(stats.some(item=>item.label==='計算失誤')).toBe(true);
});
