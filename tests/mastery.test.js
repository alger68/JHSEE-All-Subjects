import { describe, expect, it } from 'vitest';
import { recordWrong, reviewWrong } from '../js/core/mastery.js';

describe('wrong-answer revenge mastery', () => {
  it('adds a new wrong question with zero mastery', () => {
    expect(recordWrong([], 'Q1', '2026-09-16')[0]).toMatchObject({ questionId: 'Q1', mastery: 0, resolved: false, nextReview: '2026-09-17' });
  });

  it('raises mastery on correct reviews and lowers it after another miss', () => {
    let list = recordWrong([], 'Q1', '2026-09-16');
    list = reviewWrong(list, 'Q1', true, '2026-09-17');
    list = reviewWrong(list, 'Q1', true, '2026-09-19');
    list = reviewWrong(list, 'Q1', true, '2026-09-23');
    expect(list[0]).toMatchObject({ mastery: 3, resolved: true });
    list = reviewWrong(list, 'Q1', false, '2026-10-07');
    expect(list[0]).toMatchObject({ mastery: 2, resolved: false });
  });
});
