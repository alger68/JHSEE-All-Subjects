function addDays(date, days) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function createDailyQuest(date, carry = {}) {
  return {
    date,
    answered: 0,
    subjectCounts: {},
    revenge: 0,
    boss: 0,
    chestClaimed: false,
    streak: carry.streak ?? 0,
    lastQualifiedDate: carry.lastQualifiedDate ?? null
  };
}

export function updateDailyQuest(current, event, date) {
  let quest = current?.date === date ? { ...current, subjectCounts: { ...current.subjectCounts } } : createDailyQuest(date, current ?? {});
  if (event.type === 'answered') {
    quest.answered += 1;
    quest.subjectCounts[event.subject] = (quest.subjectCounts[event.subject] ?? 0) + 1;
  }
  if (event.type === 'revenge') quest.revenge += 1;
  if (event.type === 'boss') quest.boss += 1;

  if (quest.answered >= 10 && quest.lastQualifiedDate !== date) {
    quest.streak = quest.lastQualifiedDate && addDays(quest.lastQualifiedDate, 1) === date ? quest.streak + 1 : 1;
    quest.lastQualifiedDate = date;
  }
  return quest;
}

export function questProgress(quest) {
  const subjects = Object.keys(quest.subjectCounts).filter((subject) => quest.subjectCounts[subject] > 0).length;
  const items = [quest.answered >= 10, subjects >= 3, quest.revenge >= 3, quest.boss >= 1, Object.values(quest.subjectCounts).some((count) => count >= 5)];
  return { complete: items.filter(Boolean).length, total: items.length, items };
}

export function claimDailyChest(quest, date) {
  const eligible = quest.date === date && questProgress(quest).complete === 5 && !quest.chestClaimed;
  if (!eligible) return { quest, reward: { exp: 0, coins: 0 } };
  return { quest: { ...quest, chestClaimed: true }, reward: { exp: 150, coins: 100 } };
}
