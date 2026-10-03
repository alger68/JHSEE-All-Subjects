function addDays(date, days) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function createDailyQuest(date, carry = {}, availableReviews = 0) {
  return {
    schemaVersion: 2,
    date,
    answered: 0,
    correct: 0,
    rounds: 0,
    reviewTarget: Math.min(3, Math.max(0, availableReviews)),
    subjectCounts: {},
    revenge: 0,
    boss: 0,
    chestClaimed: false,
    streak: carry.streak ?? 0,
    lastQualifiedDate: carry.lastQualifiedDate ?? null
  };
}

export function migrateDailyQuest(current, date, availableReviews = 0) {
  if (current?.date !== date) return createDailyQuest(date, current ?? {}, availableReviews);
  if (current.schemaVersion === 2) return current;
  return {
    ...createDailyQuest(date, current, availableReviews),
    ...current,
    schemaVersion: 2,
    correct: current.correct ?? 0,
    rounds: current.rounds ?? (current.boss > 0 ? 1 : 0),
    reviewTarget: Math.min(3, Math.max(0, availableReviews))
  };
}

export function updateDailyQuest(current, event, date) {
  let quest = current?.date === date ? { ...current, subjectCounts: { ...current.subjectCounts } } : createDailyQuest(date, current ?? {});
  if (event.type === 'answered') {
    quest.answered += 1;
    if (event.correct) quest.correct = (quest.correct ?? 0) + 1;
    quest.subjectCounts[event.subject] = (quest.subjectCounts[event.subject] ?? 0) + 1;
  }
  if (event.type === 'revenge') quest.revenge += 1;
  if (event.type === 'round') quest.rounds = (quest.rounds ?? 0) + 1;
  if (event.type === 'boss') quest.boss += 1;

  if (quest.answered >= 10 && quest.lastQualifiedDate !== date) {
    quest.streak = quest.lastQualifiedDate && addDays(quest.lastQualifiedDate, 1) === date ? quest.streak + 1 : 1;
    quest.lastQualifiedDate = date;
  }
  return quest;
}

export function questProgress(quest) {
  const subjects = Object.keys(quest.subjectCounts).filter((subject) => quest.subjectCounts[subject] > 0).length;
  const reviewTarget = quest.reviewTarget ?? 3;
  const items = [quest.answered >= 10, subjects >= 3, (reviewTarget > 0 && quest.revenge >= reviewTarget) || (quest.correct ?? 0) >= 5, (quest.rounds ?? 0) >= 1, Object.values(quest.subjectCounts).some((count) => count >= 5)];
  return { complete: items.filter(Boolean).length, total: items.length, items, reviewTarget };
}

export function claimDailyChest(quest, date) {
  const progress = questProgress(quest);
  const eligible = quest.date === date && progress.complete === progress.total && !quest.chestClaimed;
  if (!eligible) return { quest, reward: { exp: 0, coins: 0 } };
  return { quest: { ...quest, chestClaimed: true }, reward: { exp: 150, coins: 100 } };
}
