import { SUBJECT_ORDER, SUBJECTS } from '../config/subjects.js';
import { levelProgress } from '../core/game-state.js';

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

function nav(active = 'home') {
  const items = [
    ['home', '#/', '⌂', '首頁'], ['worlds', '#/world/math', '⌁', '關卡'],
    ['revenge', '#/revenge', '⚔', '復仇'], ['analysis', '#/analysis', '▥', '分析'],
    ['profile', '#/profile', '♙', '我的']
  ];
  return `<nav class="bottom-nav" aria-label="主要導覽">${items.map(([id, href, icon, label]) => `<a href="${href}" class="${active === id ? 'active' : ''}"><span>${icon}</span>${label}</a>`).join('')}</nav>`;
}

export function renderLobby({ player, countdown, quest, wrongCount, subjectProgress }) {
  const progress = levelProgress(player);
  const questItems = quest.items ?? [];
  const questLabels = ['完成 10 題', '練習 3 個科目', '錯題復仇 3 題', '挑戰 Boss', '單科完成 5 題'];
  return `<div class="app-shell">
    <header class="topbar"><div><span class="eyebrow">116 會考大冒險</span><h1>知識遠征基地</h1></div><div class="player-badge"><span>LV.${player.level}</span><b>${escapeHtml(player.name)}</b></div></header>
    <section class="hero-panel">
      <div class="countdown"><span>距離會考</span><strong>${countdown}</strong><small>DAYS</small></div>
      <div class="hero-copy"><span class="status-chip">🔥 ${player.streak} 天連續學習</span><h2>今天，前進一個關卡。</h2><div class="xp-row"><span>EXP ${player.exp}</span><span>下一級 ${progress.required}</span></div><div class="progress"><i style="width:${progress.percent}%"></i></div><div class="currency">💰 ${player.coins} 金幣　・　👹 ${player.bossesDefeated} Boss</div></div>
    </section>
    <section class="section-heading"><div><span class="eyebrow">ADVENTURE MAP</span><h2>選擇今天的世界</h2></div><a href="#/exam" class="text-link">🏆 快速模考</a></section>
    <section class="world-grid">${SUBJECT_ORDER.map((id) => {
      const item = SUBJECTS[id]; const stars = subjectProgress[id]?.stars ?? 0;
      return `<a class="world-card world-${id}" href="#/world/${id}" style="--subject:${item.color}"><span class="world-icon">${item.icon}</span><div><small>${item.name}</small><h3>${item.world}</h3><p>${item.levels[0]}等待挑戰</p></div><span class="world-score">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span></a>`;
    }).join('')}</section>
    <section class="dashboard-grid"><article class="quest-card"><div><span class="eyebrow">TODAY</span><h2>今日任務</h2></div><strong>${quest.complete} / ${quest.total}</strong><div class="progress"><i style="width:${quest.total ? (quest.complete / quest.total) * 100 : 0}%"></i></div><ul class="quest-list">${questLabels.map((label, index) => `<li class="${questItems[index] ? 'done' : ''}"><span>${questItems[index] ? '✓' : '○'}</span>${label}</li>`).join('')}</ul><p>完成 5 項任務，開啟每日寶箱。</p>${quest.complete === quest.total && !quest.chestClaimed ? '<button data-action="claim-chest">🎁 開啟寶箱</button>' : ''}</article><a class="revenge-card" href="#/revenge"><span>👿</span><div><small>REVENGE LIST</small><h2>${wrongCount} 隻錯題怪物</h2><p>把錯過的題目練成真正實力。</p></div></a></section>
    ${nav('home')}
  </div>`;
}

export function renderWorld({ subject, levelProgress: progress = {} }) {
  const item = SUBJECTS[subject] ?? SUBJECTS.math;
  return `<div class="app-shell world-page" style="--subject:${item.color}">
    <header class="page-header"><a href="#/" aria-label="回首頁">←</a><div><span class="eyebrow">${item.name} WORLD</span><h1>${item.icon} ${item.world}</h1></div><span></span></header>
    <section class="world-banner"><span class="monster-orb">${item.monster}</span><div><p>目前區域</p><h2>${item.levels[0]}</h2><span>完成關卡後解鎖 Boss 挑戰</span></div></section>
    <ol class="level-path">
      ${item.levels.map((level, index) => {
        const id = `${subject}-${index + 1}`; const unlocked = index === 0 || progress[id]?.cleared;
        const cleared = Boolean(progress[id]?.cleared);
        const status = cleared ? '已完成・再次挑戰' : unlocked ? '5 題・約 3 分鐘' : '完成上一關後解鎖';
        return `<li class="level-node ${unlocked ? '' : 'locked'}"><span class="path-line"></span><a ${unlocked ? `href="#/battle/${subject}/${id}"` : 'aria-disabled="true"'} aria-label="${level}，${status}"><b>${unlocked ? index + 1 : '🔒'}</b><div><small>LEVEL ${index + 1}</small><h3>${level}</h3><p>${status}</p></div><span>${progress[id]?.stars ? '★'.repeat(progress[id].stars) : '›'}</span></a></li>`;
      }).join('')}
      <li class="level-node boss-node"><span class="path-line"></span><a href="#/boss/${subject}"><b>👹</b><div><small>BOSS BATTLE</small><h3>${item.boss}</h3><p>10 題綜合挑戰・80% 擊敗</p></div><span>⚔</span></a></li>
    </ol>${nav('worlds')}
  </div>`;
}

export function renderBattle({ subject, battle, question, feedback }) {
  const item = SUBJECTS[subject] ?? SUBJECTS.math;
  const total = battle.questions.length;
  const hp = '♥'.repeat(battle.playerHp) + '♡'.repeat(5 - battle.playerHp);
  const enemyMax = battle.mode === 'boss' ? 500 : 100;
  return `<div class="battle-screen" style="--subject:${item.color}">
    <header class="battle-top"><a href="#/world/${subject}" aria-label="離開戰鬥">×</a><div><small>${battle.mode === 'boss' ? 'BOSS BATTLE' : item.world}</small><strong>問題 ${Math.min(battle.index + 1, total)} / ${total}</strong></div><span class="combo">🔥 ×${battle.combo}</span></header>
    <section class="enemy-stage"><div class="enemy-name"><span>${battle.mode === 'boss' ? item.boss : item.levels[0] + '怪物'}</span><b>${battle.enemyHp} HP</b></div><div class="hp-bar enemy"><i style="width:${Math.max(0, (battle.enemyHp / enemyMax) * 100)}%"></i></div><div class="monster ${feedback?.correct === true ? 'hit' : ''}">${battle.mode === 'boss' ? '🐲' : item.monster}</div><div class="player-hp" aria-label="玩家生命 ${battle.playerHp} 點">${hp}</div></section>
    <main class="question-card"><div class="question-meta"><span>${escapeHtml(question.topic ?? item.name)}</span><span>難度 ${'◆'.repeat(question.difficulty ?? 1)}</span></div><h1>${escapeHtml(question.question)}</h1><div class="choices">${question.choices.map((choice, index) => `<button type="button" class="choice" data-action="answer" data-choice="${index}" aria-label="選項 ${String.fromCharCode(65 + index)}：${escapeHtml(choice)}"><b>${String.fromCharCode(65 + index)}</b><span>${escapeHtml(choice)}</span></button>`).join('')}</div>${feedback ? `<div class="feedback ${feedback.correct ? 'correct' : 'wrong'}"><strong>${feedback.correct ? '⚔️ Critical！答對了' : '✕ 還差一點'}</strong><p>${escapeHtml(feedback.explanation)}</p><button type="button" data-action="next">${battle.index >= total ? '查看結算' : '下一題'} →</button></div>` : ''}</main>
  </div>`;
}

export function renderResults({ subject, result }) {
  const item = SUBJECTS[subject] ?? SUBJECTS.math;
  return `<div class="result-page" style="--subject:${item.color}"><div class="result-burst">${result.cleared ? '🏆' : '🛡️'}</div><span class="eyebrow">${result.cleared ? 'STAGE CLEARED' : 'KEEP TRAINING'}</span><h1>${result.cleared ? '挑戰成功！' : '這次先記住弱點'}</h1><div class="stars">${'★'.repeat(result.stars)}${'☆'.repeat(3 - result.stars)}</div><div class="result-score"><strong>${result.accuracy}%</strong><span>${result.correct} / ${result.total} 題正確</span></div><div class="reward-row"><span>⚡ +${result.expGained} EXP</span><span>💰 +${result.coinsGained}</span><span>🔥 Max ${result.maxCombo}</span></div><p>答錯題目已自動加入「錯題復仇」。</p><a class="primary-button" href="#/world/${subject}">返回關卡地圖</a><a class="secondary-button" href="#/revenge">前往錯題復仇</a></div>`;
}

export function renderRevenge({ items = [] }) {
  return `<div class="app-shell"><header class="page-header"><a href="#/">←</a><div><span class="eyebrow">REVENGE LIST</span><h1>👿 錯題復仇</h1></div><span></span></header>${items.length ? `<section class="revenge-list">${items.map((item) => `<article><span>${['🔴', '🟠', '🟡', '🟢'][item.mastery]}</span><div><h3>${escapeHtml(item.topic ?? item.questionId)}</h3><p>熟練度 ${item.mastery} / 3・錯誤 ${item.wrongCount} 次</p></div><button data-action="start-revenge" data-id="${item.questionId}">挑戰</button></article>`).join('')}</section>` : '<section class="empty-state"><span>✨</span><h2>目前沒有錯題怪物</h2><p>先去完成一場關卡，新的練習會出現在這裡。</p><a href="#/">選擇世界</a></section>'}${nav('revenge')}</div>`;
}

export function renderAnalysis(summary) {
  const subjectRows = SUBJECT_ORDER.filter((id) => summary.subjects[id]).map((id) => {
    const stat = summary.subjects[id]; const item = SUBJECTS[id];
    return `<article style="--subject:${item.color}"><span>${item.icon}</span><div><h3>${item.name}</h3><div class="progress"><i style="width:${stat.accuracy}%"></i></div><p>${stat.status === 'insufficient-data' ? '資料不足' : `正確率 ${stat.accuracy}%`}</p></div><strong>${stat.accuracy}%</strong></article>`;
  }).join('');
  return `<div class="app-shell"><header class="page-header"><a href="#/">←</a><div><span class="eyebrow">ABILITY SCAN</span><h1>能力分析</h1></div><span></span></header>${subjectRows ? `<section class="analysis-list">${subjectRows}</section>` : '<section class="empty-state"><span>📊</span><h2>還沒有足夠資料</h2><p>完成每科至少 3 題後，這裡會開始顯示強項與弱點。</p><a href="#/">開始第一場冒險</a></section>'}${nav('analysis')}</div>`;
}

export function renderProfile({ player }) {
  return `<div class="app-shell"><header class="page-header"><a href="#/">←</a><div><span class="eyebrow">PLAYER</span><h1>我的冒險資料</h1></div><span></span></header><section class="profile-card"><span class="avatar">🧑‍🚀</span><h2>${escapeHtml(player.name)}</h2><strong>LV.${player.level}</strong><dl><div><dt>累積 EXP</dt><dd>${player.exp}</dd></div><div><dt>金幣</dt><dd>${player.coins}</dd></div><div><dt>總答題</dt><dd>${player.totalAnswered}</dd></div><div><dt>擊敗 Boss</dt><dd>${player.bossesDefeated}</dd></div></dl><button class="danger-button" data-action="reset-progress">重設全部進度</button></section>${nav('profile')}</div>`;
}

export function renderExam({ exam, index, answers, remaining }) {
  const question = exam.questions[index];
  const item = SUBJECTS[question.subject];
  const unanswered = exam.questions.filter((q) => answers[q.id] === undefined).length;
  const nextControl = index === exam.questions.length - 1
    ? `<button class="submit-button" data-action="submit-exam" aria-label="交卷，尚有 ${unanswered} 題未作答">交卷${unanswered ? `（未答 ${unanswered} 題）` : ''}</button>`
    : '<button data-action="exam-next">下一題 →</button>';
  const stickySubmit = index === exam.questions.length - 1 ? `<div class="exam-submit-sticky"><button class="submit-button" data-action="submit-exam">交卷${unanswered ? `（未答 ${unanswered} 題）` : ''}</button></div>` : '';
  return `<div class="exam-page" style="--subject:${item.color}"><header class="exam-header"><a href="#/">×</a><div><span class="eyebrow">QUICK EXAM</span><h1>快速模考</h1></div><strong>⏱ ${remaining}</strong></header><div class="exam-layout"><main class="question-card exam-question"><div class="question-meta"><span>${item.icon} ${item.name}</span><span>${index + 1} / ${exam.questions.length}</span></div><h2>${escapeHtml(question.question)}</h2><div class="choices">${question.choices.map((choice, choiceIndex) => `<button class="choice ${answers[question.id] === choiceIndex ? 'selected' : ''}" data-action="exam-answer" data-choice="${choiceIndex}"><b>${String.fromCharCode(65 + choiceIndex)}</b><span>${escapeHtml(choice)}</span></button>`).join('')}</div><div class="exam-controls"><button data-action="exam-prev" ${index === 0 ? 'disabled' : ''}>← 上一題</button>${nextControl}</div></main><aside class="answer-sheet"><h2>答案卡</h2><div>${exam.questions.map((q, qIndex) => `<button data-action="exam-go" data-index="${qIndex}" class="${qIndex === index ? 'current' : ''} ${answers[q.id] !== undefined ? 'answered' : ''}">${qIndex + 1}</button>`).join('')}</div><button class="submit-button" data-action="submit-exam">交卷</button></aside></div>${stickySubmit}</div>`;
}

export function renderExamResults(result) {
  return `<div class="result-page exam-result"><div class="result-burst">🏆</div><span class="eyebrow">QUICK EXAM REPORT</span><h1>快速模考完成</h1><div class="result-score"><strong>${result.accuracy}%</strong><span>${result.correct} / ${result.total} 題正確</span></div><p class="notice">本結果為平台模擬分析，並非官方會考等級。</p><section class="review-list">${result.items.map((item, index) => `<article class="${item.correct ? 'correct' : 'wrong'}"><b>${index + 1}</b><div><strong>${item.correct ? '答對' : '答錯'}</strong><p>${escapeHtml(item.explanation)}</p></div></article>`).join('')}</section><a class="primary-button" href="#/analysis">查看能力分析</a><a class="secondary-button" href="#/">返回首頁</a></div>`;
}
export { nav };
