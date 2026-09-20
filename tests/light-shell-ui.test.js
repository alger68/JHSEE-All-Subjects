import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('All Subjects professional light views', () => {
  const views = readFileSync('js/ui/views.js','utf8');
  const css = readFileSync('css/app.css','utf8');

  it('uses shared professional card hooks on normal dashboards', () => {
    expect(views).toContain('hero-panel jh-hero');
    expect(views).toContain('quest-card jh-card');
    expect(views).toContain('world-card jh-card');
    expect(views).toContain('diagnostic-panel jh-card');
  });

  it('defines light-shell overrides without changing Focus Mode', () => {
    expect(css).toMatch(/\.jh-suite-shell \.hero-panel\s*\{/);
    expect(css).toMatch(/\.jh-suite-shell \.world-card\s*\{/);
    expect(css).toMatch(/\.jh-suite-shell \.diagnostic-panel\s*\{/);
    expect(css).toContain('body.focus-mode');
  });
});
