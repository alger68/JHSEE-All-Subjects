const ACTIVE_STATUS = 'active';
const SESSION_STATUSES = new Set([ACTIVE_STATUS, 'finished']);
const MAX_DURATION_MINUTES = 180;
const MAX_DATE_MILLISECONDS = 8_640_000_000_000_000;
const MAX_FUTURE_CLOCK_SKEW = 5 * 60_000;

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function questionMap(questions) {
  if (!Array.isArray(questions)) return null;
  const entries = new Map();
  for (const question of questions) {
    if (!question || typeof question.id !== 'string' || entries.has(question.id)) return null;
    entries.set(question.id, question);
  }
  return entries;
}

function hasValidQuestionShape(question) {
  return Array.isArray(question?.choices)
    && question.choices.length >= 2
    && Number.isInteger(question.answer)
    && question.answer >= 0
    && question.answer < question.choices.length;
}

function hasValidTiming(session, now = Date.now()) {
  if (!Number.isFinite(session?.durationMinutes)
    || session.durationMinutes <= 0
    || session.durationMinutes > MAX_DURATION_MINUTES
    || !Number.isInteger(session?.startedAt)
    || session.startedAt < 0
    || session.startedAt > MAX_DATE_MILLISECONDS
    || !Number.isFinite(now)
    || session.startedAt > now + MAX_FUTURE_CLOCK_SKEW) return false;
  const deadline = session.startedAt + (session.durationMinutes * 60_000);
  return Number.isFinite(deadline) && deadline <= MAX_DATE_MILLISECONDS;
}

function makeSessionId(startedAt) {
  if (globalThis.crypto?.randomUUID) return `session-${globalThis.crypto.randomUUID()}`;
  return `session-${startedAt}-${Math.random().toString(36).slice(2)}`;
}

export function createSession(questions, options = {}) {
  if (!Array.isArray(questions)) throw new TypeError('questions must be an array');
  const startedAt = options.startedAt ?? Date.now();
  return {
    id: options.id ?? makeSessionId(startedAt),
    title: options.title,
    kind: options.kind,
    paperId: options.paperId ?? null,
    durationMinutes: options.durationMinutes,
    startedAt,
    questionIds: questions.map((question) => question.id),
    index: 0,
    answers: {},
    uncertain: {},
    hinted: {},
    notes: {},
    attemptNumber: options.attemptNumber ?? 1,
    status: ACTIVE_STATUS
  };
}

export function remainingSeconds(session, now = Date.now()) {
  if (!hasValidTiming(session, now)) return 0;
  const deadline = session.startedAt + (session.durationMinutes * 60_000);
  return Math.max(0, Math.ceil((deadline - now) / 1_000));
}

export function validateSession(session, questions) {
  const catalog = questionMap(questions);
  if (!catalog || !isRecord(session)) return false;
  if (typeof session.id !== 'string' || session.id.length === 0) return false;
  if (typeof session.title !== 'string' || session.title.length === 0) return false;
  if (typeof session.kind !== 'string' || session.kind.length === 0) return false;
  if (session.paperId !== null && session.paperId !== undefined && typeof session.paperId !== 'string') return false;
  if (!hasValidTiming(session)) return false;
  if (!Number.isInteger(session.attemptNumber) || session.attemptNumber < 1) return false;
  if (!SESSION_STATUSES.has(session.status)) return false;
  if (!Array.isArray(session.questionIds) || new Set(session.questionIds).size !== session.questionIds.length) return false;
  if (!session.questionIds.every((id) => typeof id === 'string' && catalog.has(id) && hasValidQuestionShape(catalog.get(id)))) return false;
  if (!Number.isInteger(session.index)) return false;
  if (session.questionIds.length === 0 ? session.index !== 0 : session.index < 0 || session.index >= session.questionIds.length) return false;
  if (!isRecord(session.answers) || !isRecord(session.uncertain) || !isRecord(session.hinted) || !isRecord(session.notes)) return false;

  const inSession = (id) => session.questionIds.includes(id);
  for (const [id, choice] of Object.entries(session.answers)) {
    const question = catalog.get(id);
    if (!inSession(id) || !Number.isInteger(choice) || choice < 0 || choice >= question.choices.length) return false;
  }
  if (!Object.entries(session.uncertain).every(([id, value]) => inSession(id) && typeof value === 'boolean')) return false;
  if (!Object.entries(session.hinted).every(([id, value]) => inSession(id) && Number.isInteger(value) && value >= 0)) return false;
  if (!Object.values(session.notes).every((value) => typeof value === 'string')) return false;
  return true;
}

export function answerSession(session, questions, questionId, choice, now = Date.now()) {
  if (!validateSession(session, questions)
    || session.status !== ACTIVE_STATUS
    || remainingSeconds(session, now) === 0) return session;

  const question = questions.find((item) => item.id === questionId);
  if (!question
    || !session.questionIds.includes(questionId)
    || !Number.isInteger(choice)
    || choice < 0
    || choice >= question.choices.length) return session;

  return { ...session, answers: { ...session.answers, [questionId]: choice } };
}

export function finishSession(session, questions, now = Date.now()) {
  if (!validateSession(session, questions)) throw new TypeError('Invalid exam session');
  const catalog = new Map(questions.map((question) => [question.id, question]));
  const items = session.questionIds.map((id) => {
    const question = catalog.get(id);
    const choice = session.answers[id];
    return {
      id,
      choice,
      answer: question.answer,
      correct: Number.isInteger(choice) && choice === question.answer,
      uncertain: session.uncertain[id] === true,
      hinted: session.hinted[id] ?? 0,
      explanation: question.explanation ?? ''
    };
  });
  const correct = items.filter((item) => item.correct).length;
  const elapsedSeconds = Math.min(
    session.durationMinutes * 60,
    Math.max(0, Math.floor((now - session.startedAt) / 1_000))
  );
  return {
    title: session.title,
    kind: session.kind,
    paperId: session.paperId ?? null,
    attemptNumber: session.attemptNumber,
    total: items.length,
    correct,
    accuracy: items.length ? Math.round((correct / items.length) * 100) : 0,
    elapsedSeconds,
    items
  };
}
