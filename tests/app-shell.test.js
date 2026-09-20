import { describe, expect, it } from 'vitest';
import { renderAppShell } from '../js/ui/app-shell.js';

describe('All Subjects unified app shell', () => {
  it('renders family identity, three suite destinations and four mobile entries', () => {
    const html = renderAppShell('<section>content</section>', '#/');
    expect(html).toContain('JHSEE');
    expect(html).toContain('All Subjects');
    for (const label of ['練習','模考','錯題','更多']) expect(html).toContain(label);
    for (const url of [
      'https://alger68.github.io/JHSEE-Study-Planner/',
      'https://alger68.github.io/JHSEE-All-Subjects/',
      'https://alger68.github.io/JHSEE-English-Adventure/'
    ]) expect(html).toContain(url);
  });
});
