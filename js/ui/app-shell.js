const APPS = [
  ['https://alger68.github.io/JHSEE-Study-Planner/','Study Planner'],
  ['https://alger68.github.io/JHSEE-All-Subjects/','All Subjects'],
  ['https://alger68.github.io/JHSEE-English-Adventure/','English Adventure']
];

function activeSection(route) {
  if (route === '#/revenge') return 'review';
  if (route.startsWith('#/exam') || route.startsWith('#/paper/')) return 'exam';
  if (route === '#/placement') return 'more';
  if (route === '#/analysis' || route === '#/profile' || route === '#/results') return 'more';
  return 'practice';
}

export function renderAppShell(content, route = '#/') {
  const active = activeSection(route);
  const primary = [
    ['practice','#/','今日'],
    ['exam','#/exam-center','模考'],
    ['review','#/revenge','錯題'],
    ['more','#/profile','更多']
  ];

  const nav = primary.map(([id,href,label]) =>
    `<a href="${href}" ${active===id?'aria-current="page"':''}>${label}</a>`
  ).join('');

  return `<div class="jh-suite-shell">
    <header class="jh-suite-header">
      <a class="jh-suite-brand" href="#/"><span>JHSEE</span><strong>All Subjects</strong><small>116 會考準備</small></a>
      <nav class="jh-section-nav" aria-label="All Subjects 導覽">${nav}</nav>
      <details class="jh-app-switcher"><summary>其他網站</summary><nav aria-label="切換 JHSEE 產品">
        ${APPS.map(([href,label])=>`<a href="${href}" ${label==='All Subjects'?'aria-current="page"':''}>${label}</a>`).join('')}
      </nav></details>
    </header>
    <div class="jh-suite-content">${content}</div>
    <nav class="mobile-bottom-nav jh-mobile-nav" aria-label="手機主要導覽">${nav}</nav>
  </div>`;
}
