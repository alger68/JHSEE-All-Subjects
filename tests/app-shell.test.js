import { describe, expect, it } from 'vitest';
import { renderAppShell } from '../js/ui/app-shell.js';

describe('All Subjects unified app shell', () => {
  it('renders four primary entries and keeps other suite destinations in a disclosure', () => {
    const html = renderAppShell('<section>content</section>', '#/');
    expect(html).toContain('JHSEE');
    expect(html).toContain('All Subjects');
    const container=document.createElement('div');
    container.innerHTML=html;
    expect([...container.querySelectorAll('.jh-section-nav a')].map(a=>a.textContent)).toEqual(['今日','模考','錯題','更多']);
    expect(container.querySelector('details.jh-app-switcher').open).toBe(false);
    for (const url of [
      'https://alger68.github.io/JHSEE-Study-Planner/',
      'https://alger68.github.io/JHSEE-All-Subjects/',
      'https://alger68.github.io/JHSEE-English-Adventure/'
    ]) expect(html).toContain(url);
  });
});
