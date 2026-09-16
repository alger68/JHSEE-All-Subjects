function addDays(date, days) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

const REVIEW_INTERVALS = [1, 2, 4, 14];

export function recordWrong(list, questionId, date) {
  const found = list.find((item) => item.questionId === questionId);
  if (!found) return [...list, { questionId, mastery: 0, wrongCount: 1, resolved: false, nextReview: addDays(date, 1) }];
  return list.map((item) => item.questionId === questionId ? {
    ...item,
    mastery: Math.max(0, item.mastery - 1),
    wrongCount: item.wrongCount + 1,
    resolved: false,
    nextReview: addDays(date, 1)
  } : item);
}

export function reviewWrong(list, questionId, correct, date) {
  return list.map((item) => {
    if (item.questionId !== questionId) return item;
    const mastery = correct ? Math.min(3, item.mastery + 1) : Math.max(0, item.mastery - 1);
    return {
      ...item,
      mastery,
      wrongCount: item.wrongCount + (correct ? 0 : 1),
      resolved: mastery === 3,
      nextReview: addDays(date, REVIEW_INTERVALS[mastery])
    };
  });
}

export function dueWrongQuestions(list, date) {
  return list.filter((item) => !item.resolved && item.nextReview <= date);
}
