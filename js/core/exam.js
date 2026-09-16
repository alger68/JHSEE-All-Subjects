const ANSWER_KEYS = new WeakMap();

export function createExam(questions, options = {}) {
  const exam = {
    id: `exam-${Date.now()}`,
    durationMinutes: options.durationMinutes ?? 20,
    startedAt: options.startedAt ?? Date.now(),
    questions: questions.map(({ answer, explanation, hint1, hint2, ...question }) => question)
  };
  ANSWER_KEYS.set(exam, questions.map(({ id, answer, explanation }) => ({ id, answer, explanation })));
  return exam;
}

export function submitExam(exam, answers) {
  const key = ANSWER_KEYS.get(exam);
  if (!key) throw new Error('Unknown exam');
  const items = key.map((question) => ({
    id: question.id,
    choice: answers[question.id],
    answer: question.answer,
    correct: answers[question.id] === question.answer,
    explanation: question.explanation
  }));
  const correct = items.filter((item) => item.correct).length;
  return { total: items.length, correct, accuracy: items.length ? Math.round((correct / items.length) * 100) : 0, items };
}
