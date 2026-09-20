import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('JHSEE All Subjects theme contract', () => {
  const html = readFileSync('index.html','utf8');
  const tokens = readFileSync('css/design-tokens.css','utf8');

  it('loads shared design tokens before app styles', () => {
    expect(html.indexOf('design-tokens.css')).toBeGreaterThan(-1);
    expect(html.indexOf('design-tokens.css')).toBeLessThan(html.indexOf('app.css'));
  });

  it('defines the teal All Subjects theme', () => {
    expect(tokens).toContain('--jh-primary: #0F766E');
    expect(tokens).toContain('--jh-primary-strong: #115E59');
    expect(tokens).toContain('--jh-primary-soft: #ECFDF5');
    expect(tokens).toContain('JHSEE Design System v1.0');
  });
  it('preserves official reader overflow and accessible motion/contrast contracts', () => {
    const css = readFileSync('css/app.css','utf8');
    expect(css).toMatch(/\.paper-image-scroll\s*\{[^}]*overflow:auto/s);
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toMatch(/\.jh-suite-shell \.official-view-controls/);
    expect(css).toMatch(/body\.focus-mode #official-listening-player/);
  });
});
