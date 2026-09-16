import { describe, expect, it } from 'vitest';
import { summarizeSkills, updateSkillStats } from '../js/core/analytics.js';

describe('skill analytics', () => {
  it('tracks subject and topic accuracy', () => {
    let stats = {};
    stats = updateSkillStats(stats, { subject: 'math', topic: '代數' }, true);
    stats = updateSkillStats(stats, { subject: 'math', topic: '代數' }, false);
    expect(summarizeSkills(stats, 2).topics['math:代數']).toMatchObject({ attempts: 2, accuracy: 50, status: 'needs-work' });
  });

  it('marks small samples as insufficient data', () => {
    const stats = updateSkillStats({}, { subject: 'science', topic: '生物' }, true);
    expect(summarizeSkills(stats, 3).topics['science:生物'].status).toBe('insufficient-data');
  });
});
