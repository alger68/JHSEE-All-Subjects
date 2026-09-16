import { describe, expect, it } from 'vitest';
import { createPlayer, levelFromExp, levelProgress, rewardPlayer } from '../js/core/game-state.js';

describe('player progression', () => {
  it('starts at level one with no rewards', () => {
    expect(createPlayer()).toMatchObject({ level: 1, exp: 0, coins: 0, streak: 0 });
  });

  it('calculates level from cumulative experience', () => {
    expect(levelFromExp(0)).toBe(1);
    expect(levelFromExp(100)).toBe(2);
    expect(levelFromExp(283)).toBe(3);
  });

  it('updates rewards and level together', () => {
    expect(rewardPlayer(createPlayer(), { exp: 120, coins: 15 })).toMatchObject({ level: 2, exp: 120, coins: 15 });
  });

  it('never renders a negative level progress percentage', () => {
    expect(levelProgress(createPlayer({ level: 4, exp: 0 })).percent).toBe(0);
  });
});
