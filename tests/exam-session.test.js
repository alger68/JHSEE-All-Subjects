import { describe, expect, it } from 'vitest';
import {
  answerSession,
  createSession,
  finishSession,
  remainingSeconds,
  validateSession
} from '../js/core/exam-session.js';

const questions = [
  { id: 'a', choices: ['A', 'B', 'C'], answer: 1, explanation: 'B is correct.' },
  { id: 'b', choices: ['A', 'B', 'C', 'D'], answer: 3, explanation: 'D is correct.' }
];

const makeSession = (overrides = {}) => createSession(questions, {
  id: 'session-1',
  title: '聽力',
  kind: 'official',
  paperId: 'eng-listening-115',
  durationMinutes: 25,
  startedAt: 1_000,
  attemptNumber: 2,
  ...overrides
});

describe('serializable exam sessions', () => {
  it('creates the documented session shape', () => {
    expect(makeSession()).toEqual({
      id: 'session-1',
      title: '聽力',
      kind: 'official',
      paperId: 'eng-listening-115',
      durationMinutes: 25,
      startedAt: 1_000,
      questionIds: ['a', 'b'],
      index: 0,
      answers: {},
      uncertain: {},
      hinted: {},
      notes: {},
      attemptNumber: 2,
      status: 'active'
    });
  });

  it('preserves an answered question through a JSON roundtrip', () => {
    const answered = answerSession(makeSession(), questions, 'a', 1, 2_000);
    const restored = JSON.parse(JSON.stringify(answered));

    expect(restored.answers).toEqual({ a: 1 });
    expect(validateSession(restored, questions)).toBe(true);
  });

  it('returns the original session for an out-of-range three-choice answer', () => {
    const session = makeSession();
    expect(answerSession(session, questions, 'a', 3, 2_000)).toBe(session);
    expect(session.answers).toEqual({});
  });

  it('returns the original session for unknown question ids', () => {
    const session = makeSession();
    expect(answerSession(session, questions, 'missing', 0, 2_000)).toBe(session);
  });

  it('returns the original session after the deadline or after settlement', () => {
    const session = makeSession();
    expect(answerSession(session, questions, 'a', 1, 1_501_000)).toBe(session);

    const finished = { ...session, status: 'finished' };
    expect(answerSession(finished, questions, 'a', 1, 2_000)).toBe(finished);
  });

  it('counts down from startedAt and clamps at zero', () => {
    const session = makeSession();
    expect(remainingSeconds(session, 1_000)).toBe(1_500);
    expect(remainingSeconds(session, 1_500_999)).toBe(1);
    expect(remainingSeconds(session, 1_501_000)).toBe(0);
  });

  it('validates catalog-backed saved sessions and rejects corrupt answers', () => {
    const session = makeSession();
    expect(validateSession(session, questions)).toBe(true);
    expect(validateSession({ ...session, questionIds: ['a', 'missing'] }, questions)).toBe(false);
    expect(validateSession({ ...session, answers: { a: 3 } }, questions)).toBe(false);
    expect(validateSession({ ...session, answers: { missing: 0 } }, questions)).toBe(false);
  });

  it('rejects implausible or overflowing restored durations', () => {
    const session = makeSession();
    expect(validateSession({ ...session, durationMinutes: 180 }, questions)).toBe(true);
    expect(validateSession({ ...session, durationMinutes: 181 }, questions)).toBe(false);
    expect(validateSession({ ...session, durationMinutes: 1e308 }, questions)).toBe(false);
  });

  it('rejects invalid start timestamps and deadlines outside the Date range', () => {
    const session = makeSession();
    expect(validateSession({ ...session, startedAt: -1 }, questions)).toBe(false);
    expect(validateSession({ ...session, startedAt: 8_640_000_000_000_000 }, questions)).toBe(false);
    expect(validateSession({ ...session, startedAt: 8_640_000_000_000_001 }, questions)).toBe(false);
  });

  it('allows modest future clock skew but rejects implausible future starts', () => {
    const session = makeSession();
    expect(validateSession({ ...session, startedAt: Date.now() + 60_000 }, questions)).toBe(true);
    expect(validateSession({ ...session, startedAt: Date.now() + 10 * 60_000 }, questions)).toBe(false);
  });

  it('allows an official writing session with no choice questions and draft notes', () => {
    const session = createSession([], {
      id: 'writing-1', title: '寫作測驗', kind: 'official-writing',
      paperId: 'cap115-writing', durationMinutes: 50, startedAt: 1_000
    });
    session.notes = { math1: '', math2: '', writing: '草稿' };

    expect(validateSession(session, [])).toBe(true);
    expect(finishSession(session, [], 2_000)).toMatchObject({ total: 0, correct: 0, accuracy: 0, items: [] });
  });
});

describe('exam settlement', () => {
  it('scores unanswered choices false without mutating or finishing the session', () => {
    const session = {
      ...makeSession(),
      answers: { a: 1 },
      uncertain: { a: true },
      hinted: { a: 2 }
    };
    const before = JSON.stringify(session);

    expect(finishSession(session, questions, 11_000)).toEqual({
      title: '聽力',
      kind: 'official',
      paperId: 'eng-listening-115',
      attemptNumber: 2,
      total: 2,
      correct: 1,
      accuracy: 50,
      elapsedSeconds: 10,
      items: [
        { id: 'a', choice: 1, answer: 1, correct: true, uncertain: true, hinted: 2, explanation: 'B is correct.' },
        { id: 'b', choice: undefined, answer: 3, correct: false, uncertain: false, hinted: 0, explanation: 'D is correct.' }
      ]
    });
    expect(JSON.stringify(session)).toBe(before);
    expect(session.status).toBe('active');
  });

  it('caps elapsed time at the session duration', () => {
    expect(finishSession(makeSession(), questions, 2_000_000).elapsedSeconds).toBe(1_500);
  });
});
