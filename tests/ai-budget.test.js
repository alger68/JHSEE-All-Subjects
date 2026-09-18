import { describe, expect, it } from 'vitest';
import { DEFAULT_DAILY_AI_LIMIT, aiBudgetStatus, recordAiUsage } from '../js/core/ai-budget.js';

describe('AI daily budget',()=>{
  it('starts with a fresh daily allowance',()=>{
    expect(aiBudgetStatus(null,'2026-09-18')).toMatchObject({used:0,remaining:DEFAULT_DAILY_AI_LIMIT,limit:DEFAULT_DAILY_AI_LIMIT});
  });
  it('tracks generated questions and resets on a new day',()=>{
    const used=recordAiUsage(null,'2026-09-18',{questions:4,requests:2});
    expect(aiBudgetStatus(used,'2026-09-18').remaining).toBe(DEFAULT_DAILY_AI_LIMIT-4);
    expect(aiBudgetStatus(used,'2026-09-19').remaining).toBe(DEFAULT_DAILY_AI_LIMIT);
  });
  it('never consumes past the daily limit',()=>{
    const used=recordAiUsage({date:'2026-09-18',questions:14,requests:3,limit:15},'2026-09-18',{questions:5,requests:1});
    expect(used.questions).toBe(15);
    expect(aiBudgetStatus(used,'2026-09-18').remaining).toBe(0);
  });
});
