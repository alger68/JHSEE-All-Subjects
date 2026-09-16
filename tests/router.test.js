import { describe, expect, it } from 'vitest';
import { createRouter, matchRoute } from '../js/router.js';

describe('router', () => {
  it('matches static routes', () => {
    expect(matchRoute('#/analysis', ['#/', '#/analysis'])).toEqual({
      route: '#/analysis',
      params: {}
    });
  });

  it('extracts dynamic route parameters', () => {
    expect(matchRoute('#/battle/math/MATH-1', ['#/battle/:subject/:levelId'])).toEqual({
      route: '#/battle/:subject/:levelId',
      params: { subject: 'math', levelId: 'MATH-1' }
    });
  });

  it('falls back to the home route', () => {
    const home = () => 'home';
    const router = createRouter({ '#/': home });
    expect(router.resolve('#/missing').handler).toBe(home);
  });
});
