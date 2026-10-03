import { describe, expect, it } from 'vitest';
import { claimDailyChest, createDailyQuest, questProgress, updateDailyQuest, migrateDailyQuest } from '../js/core/quests.js';

describe('daily quests', () => {
  it('counts a streak only after ten answered questions', () => {
    let quest = createDailyQuest('2026-09-16');
    for (let index = 0; index < 9; index += 1) quest = updateDailyQuest(quest, { type: 'answered', subject: 'math' }, '2026-09-16');
    expect(quest.streak).toBe(0);
    quest = updateDailyQuest(quest, { type: 'answered', subject: 'math' }, '2026-09-16');
    expect(quest.streak).toBe(1);
  });

  it('does not grant the daily chest twice', () => {
    const ready = { ...createDailyQuest('2026-09-16'), answered: 10, correct: 5, rounds: 1, subjectCounts: { math: 5, english: 3, science: 2 } };
    const first = claimDailyChest(ready, '2026-09-16');
    const second = claimDailyChest(first.quest, '2026-09-16');
    expect(first.reward).toEqual({ exp: 150, coins: 100 });
    expect(second.reward).toEqual({ exp: 0, coins: 0 });
  });

  it('lets a new learner complete five daily goals with no wrong-question backlog or boss', () => {
    let quest = createDailyQuest('2026-09-16', {}, 0);
    for (let index = 0; index < 10; index += 1) {
      quest = updateDailyQuest(quest, { type: 'answered', subject: ['math', 'english', 'science'][index % 3], correct: index < 5 }, '2026-09-16');
    }
    quest = updateDailyQuest(quest, { type: 'round' }, '2026-09-16');
    expect(questProgress(quest).complete).toBe(4);
    quest = updateDailyQuest(quest, { type: 'answered', subject: 'math', correct: false }, '2026-09-16');
    expect(questProgress(quest)).toMatchObject({complete:5,total:5});
    expect(claimDailyChest(quest,'2026-09-16').reward.exp).toBe(150);
  });

  it('sets a reachable review target from the starting backlog and keeps a correct-answer path', () => {
    const quest = createDailyQuest('2026-09-16', {}, 1);
    expect(quest.reviewTarget).toBe(1);
    expect(questProgress(updateDailyQuest(quest,{type:'revenge'},'2026-09-16')).items[2]).toBe(true);
    expect(questProgress({...quest,correct:5}).items[2]).toBe(true);
  });

  it('migrates a same-day legacy quest without resetting answered progress or a claimed chest', () => {
    const legacy={date:'2026-09-16',answered:9,subjectCounts:{math:9},revenge:1,boss:1,chestClaimed:true,streak:2,lastQualifiedDate:'2026-09-15'};
    const migrated=migrateDailyQuest(legacy,'2026-09-16',0);
    expect(migrated).toMatchObject({answered:9,rounds:1,chestClaimed:true,streak:2,reviewTarget:0});
    expect(claimDailyChest(migrated,'2026-09-16').reward.exp).toBe(0);
  });
});
