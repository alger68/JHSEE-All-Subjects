import { describe, expect, it } from 'vitest';
import {
  REVIEW_REASONS,
  dueWrongQuestions,
  recordUncertain,
  recordWrong,
  reviewWrong,
  setWrongReason
} from '../js/core/mastery.js';

describe('wrong-answer revenge mastery', () => {
  it('adds a new wrong question with zero mastery', () => {
    expect(recordWrong([], 'Q1', '2026-09-16')[0]).toMatchObject({
      questionId: 'Q1', mastery: 0, wrongCount: 1, resolved: false,
      nextReview: '2026-09-17', lastReviewed: '2026-09-16'
    });
  });

  it('never resolves a wrong item by repeating the same original question', () => {
    let list = recordWrong([], 'Q1', '2026-09-16');
    list = reviewWrong(list, 'Q1', true, '2026-09-17');
    list = reviewWrong(list, 'Q1', true, '2026-09-19');
    list = reviewWrong(list, 'Q1', true, '2026-09-23');
    expect(list[0]).toMatchObject({ mastery: 2, resolved: false });
    list = reviewWrong(list, 'Q1', false, '2026-10-07');
    expect(list[0]).toMatchObject({ mastery: 1, resolved: false });
  });

  it('awards mastery at most once on the same date', () => {
    let list = recordWrong([], 'Q1', '2026-09-16');
    list = reviewWrong(list, 'Q1', true, '2026-09-17');
    const reviewedAgain = reviewWrong(list, 'Q1', true, '2026-09-17');

    expect(reviewedAgain[0]).toMatchObject({ mastery: 1, nextReview: '2026-09-19', lastReviewed: '2026-09-17' });
  });

  it('demotes legacy compatibility mastery after another miss without resolving', () => {
    let list = recordWrong([], 'Q1', '2026-09-16');
    list = reviewWrong(list, 'Q1', true, '2026-09-17');
    list = reviewWrong(list, 'Q1', true, '2026-09-19');
    list = reviewWrong(list, 'Q1', false, '2026-09-23');

    expect(list[0]).toMatchObject({
      mastery: 1,
      wrongCount: 2,
      resolved: false,
      nextReview: '2026-09-24',
      lastReviewed: '2026-09-23'
    });
  });

  it('recording another wrong answer resets the review date and blocks same-day mastery farming', () => {
    let list = recordWrong([], 'Q1', '2026-09-16');
    list = reviewWrong(list, 'Q1', true, '2026-09-17');
    list = recordWrong(list, 'Q1', '2026-09-19');
    const immediateRetry = reviewWrong(list, 'Q1', true, '2026-09-19');

    expect(immediateRetry[0]).toMatchObject({ mastery: 0, wrongCount: 2, nextReview: '2026-09-20', lastReviewed: '2026-09-19' });
  });

  it('keeps unresolved compatibility entries scheduled while transfer review owns resolution', () => {
    let list = recordWrong([], 'Q1', '2026-09-16');
    list = reviewWrong(list, 'Q1', true, '2026-09-17');
    list = reviewWrong(list, 'Q1', true, '2026-09-19');

    expect(list[0]).toMatchObject({ mastery: 2, resolved: false, nextReview: '2026-09-23' });
    expect(dueWrongQuestions(list, '2026-09-23').map((item) => item.questionId)).toEqual(['Q1']);
  });

  it('queues an uncertain answer without counting it wrong', () => {
    const list = recordUncertain([], 'Q2', '2026-09-17');
    expect(list[0]).toMatchObject({
      questionId: 'Q2', mastery: 0, wrongCount: 0, uncertainCount: 1,
      resolved: false, nextReview: '2026-09-18', lastReviewed: '2026-09-17'
    });
  });

  it('stores only a supported learner-selected wrong reason', () => {
    const list = recordWrong([], 'Q1', '2026-09-16');
    const updated = setWrongReason(list, 'Q1', 'reading');

    expect(REVIEW_REASONS.reading).toBe('讀錯題意');
    expect(updated[0].reason).toBe('reading');
    expect(setWrongReason(updated, 'Q1', 'invented')).toBe(updated);
  });
});
