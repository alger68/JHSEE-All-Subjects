import { describe, expect, it } from 'vitest';
import { claimDailyChest, createDailyQuest, updateDailyQuest } from '../js/core/quests.js';

describe('daily quests', () => {
  it('counts a streak only after ten answered questions', () => {
    let quest = createDailyQuest('2026-09-16');
    for (let index = 0; index < 9; index += 1) quest = updateDailyQuest(quest, { type: 'answered', subject: 'math' }, '2026-09-16');
    expect(quest.streak).toBe(0);
    quest = updateDailyQuest(quest, { type: 'answered', subject: 'math' }, '2026-09-16');
    expect(quest.streak).toBe(1);
  });

  it('does not grant the daily chest twice', () => {
    const ready = { ...createDailyQuest('2026-09-16'), answered: 10, subjectCounts: { math: 5, english: 5, science: 5 }, revenge: 3, boss: 1 };
    const first = claimDailyChest(ready, '2026-09-16');
    const second = claimDailyChest(first.quest, '2026-09-16');
    expect(first.reward).toEqual({ exp: 150, coins: 100 });
    expect(second.reward).toEqual({ exp: 0, coins: 0 });
  });
});
