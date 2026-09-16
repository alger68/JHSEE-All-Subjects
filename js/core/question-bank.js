import { classifyQuestion } from './exam-blueprint.js';

const REQUIRED_FIELDS = [
  'id', 'subject', 'chapter', 'topic', 'grade', 'difficulty', 'question',
  'choices', 'answer', 'explanation', 'hint1', 'hint2', 'source', 'tags'
];

export function validateQuestion(question) {
  const errors = [];
  for (const field of REQUIRED_FIELDS) {
    const value = question?.[field];
    if (value === undefined || value === null || value === '') errors.push(`${field} is required`);
  }
  if (!Array.isArray(question?.choices) || question.choices.length < 2) errors.push('choices must contain at least two items');
  if (!Number.isInteger(question?.answer) || question.answer < 0 || question.answer >= (question.choices?.length ?? 0)) {
    errors.push('answer must point to a choice');
  }
  if (!['chinese', 'english', 'math', 'science', 'social'].includes(question?.subject)) errors.push('unknown subject');
  if (question?.source !== 'original') errors.push('V1 questions must use original source');
  return { ok: errors.length === 0, errors };
}

export function createQuestionBank(input) {
  const questions = [];
  const diagnostics = [];
  const ids = new Set();

  for (const question of input) {
    const result = validateQuestion(question);
    if (!result.ok) {
      diagnostics.push(`${question?.id ?? 'unknown'}: ${result.errors.join(', ')}`);
      continue;
    }
    if (ids.has(question.id)) {
      diagnostics.push(`duplicate id: ${question.id}`);
      continue;
    }
    ids.add(question.id);
    questions.push(Object.freeze(classifyQuestion(question)));
  }

  const filter = (criteria = {}) => questions.filter((question) => Object.entries(criteria).every(([key, value]) => {
    if (value === undefined || value === null || value === '') return true;
    return question[key] === value;
  }));

  return {
    diagnostics,
    all: () => [...questions],
    getById: (id) => questions.find((question) => question.id === id) ?? null,
    filter,
    pick(criteria, count, rng = Math.random) {
      const pool = filter(criteria);
      for (let index = pool.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(rng() * (index + 1));
        [pool[index], pool[swap]] = [pool[swap], pool[index]];
      }
      return pool.slice(0, count);
    }
  };
}
