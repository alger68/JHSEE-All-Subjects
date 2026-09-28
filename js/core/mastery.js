function addDays(date, days) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

const REVIEW_INTERVALS = [1, 2, 4, 14];

export const REVIEW_REASONS = Object.freeze({
  concept: '觀念不懂',
  reading: '讀錯題意',
  calculation: '計算失誤',
  time: '時間不足',
  guess: '猜答／不確定'
});

export function recordWrong(list, questionId, date) {
  const found = list.find((item) => item.questionId === questionId);
  if (!found) return [...list, {
    questionId,
    mastery: 0,
    wrongCount: 1,
    resolved: false,
    nextReview: addDays(date, 1),
    lastReviewed: date
  }];
  return list.map((item) => item.questionId === questionId ? {
    ...item,
    mastery: Math.max(0, item.mastery - 1),
    wrongCount: item.wrongCount + 1,
    resolved: false,
    nextReview: addDays(date, 1),
    lastReviewed: date
  } : item);
}

export function reviewWrong(list, questionId, correct, date) {
  return list.map((item) => {
    if (item.questionId !== questionId) return item;
    if (correct && item.lastReviewed === date) return item;
    const mastery = correct ? Math.min(2, item.mastery + 1) : Math.max(0, item.mastery - 1);
    return {
      ...item,
      mastery,
      wrongCount: item.wrongCount + (correct ? 0 : 1),
      resolved: false,
      nextReview: addDays(date, correct ? REVIEW_INTERVALS[Math.max(1, mastery)] : 1),
      lastReviewed: date
    };
  });
}

export function dueWrongQuestions(list, date) {
  return list.filter((item) => item.nextReview <= date);
}

export function recordUncertain(list, questionId, date) {
  const found = list.find((item) => item.questionId === questionId);
  if (!found) return [...list, {
    questionId,
    mastery: 0,
    wrongCount: 0,
    uncertainCount: 1,
    resolved: false,
    nextReview: addDays(date, 1),
    lastReviewed: date
  }];
  return list.map((item) => item.questionId === questionId ? {
    ...item,
    uncertainCount: (item.uncertainCount ?? 0) + 1,
    resolved: false,
    nextReview: addDays(date, 1),
    lastReviewed: date
  } : item);
}

export function setWrongReason(list, questionId, reason) {
  if (!Object.hasOwn(REVIEW_REASONS, reason) || !list.some((item) => item.questionId === questionId)) return list;
  return list.map((item) => item.questionId === questionId ? { ...item, reason } : item);
}
