import { describe, expect, it } from 'vitest';
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
});
