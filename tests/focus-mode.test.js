import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { isFocusMode } from '../js/ui/focus-mode.js';

describe('All Subjects Focus Mode', () => {
  it.each([
    ['#/exam', { kind:'official' }],
    ['#/exam-check', { kind:'official' }],
    ['#/exam', { kind:'official-writing' }],
    ['#/exam-check', { kind:'diagnostic' }]
  ])('enables focus mode for %s formal session', (route, session) => {
    expect(isFocusMode(route, session)).toBe(true);
  });

  it.each([
    ['#/', null],
    ['#/exam-center', null],
    ['#/results', null],
    ['#/revenge', null],
    ['#/profile', null],
    ['#/exam', { kind:'practice' }],
    ['#/exam-check', { kind:'review' }],
    ['#/exam', { kind:'quick-exam' }]
  ])('keeps %s outside focus mode', (route, session) => {
    expect(isFocusMode(route, session)).toBe(false);
  });
  it('keeps the formal exam controls required in Focus Mode', () => {
    const sessionView = readFileSync('js/ui/exam-views.js','utf8');
    const checkView = readFileSync('js/ui/exam-check.js','utf8');
    const app = readFileSync('js/app.js','utf8');

    for (const token of ['data-exam-timer','exam-prev','exam-next','exam-uncertain','submit-exam']) {
      expect(sessionView).toContain(token);
    }
    for (const token of ['return-exam','confirm-submit-exam','check-question']) {
      expect(checkView).toContain(token);
    }
    expect(app).toContain('focusMode ? content : renderAppShell');
  });
});
