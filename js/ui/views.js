import { SUBJECT_ORDER, SUBJECTS } from '../config/subjects.js';
import { levelProgress } from '../core/game-state.js';
import { diagnosticCards } from '../core/personalization.js';
import { questionMaterial, reasonSelect, renderEnglishTtsControls } from './exam-views.js';

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
    <section class="hero-panel jh-hero">
      <div class="countdown"><span>距離會考</span><strong>${countdown}</strong><small>DAYS</small></div>
      <div class="hero-copy"><span class="status-chip">🔥 ${player.streak} 天連續學習</span><h2>今天，前進一個關卡。</h2><div class="xp-row"><span>EXP ${player.exp}</span><span>下一級 ${progress.required}</span></div><div class="progress"><i style="width:${progress.percent}%"></i></div><div class="currency">💰 ${player.coins} 金幣　・　👹 ${player.bossesDefeated} Boss</div></div>
    </section>
    <section class="section-heading"><div><span class="eyebrow">ADVENTURE MAP</span><h2>選擇今天的世界</h2></div><a href="#/exam-center" class="text-link">🏆 官方會考與補強</a></section>
    <section class="world-grid">${SUBJECT_ORDER.map((id) => {
      const item = SUBJECTS[id]; const stars = subjectProgress[id]?.stars ?? 0;
      return `<a class="world-card jh-card world-${id}" href="#/world/${id}" style="--subject:${item.color}"><span class="world-icon">${item.icon}</span><div><small>${item.name}</small><h3>${item.world}</h3><p>${item.levels[0]}等待挑戰</p></div><span class="world-score">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span></a>`;
    }).join('')}</section>
    <section class="dashboard-grid"><article class="quest-card jh-card"><div><span class="eyebrow">TODAY</span><h2>今日任務</h2></div><strong>${quest.complete} / ${quest.total}</strong><div class="progress"><i style="width:${quest.total ? (quest.complete / quest.total) * 100 : 0}%"></i></div><ul class="quest-list">${questLabels.map((label, index) => `<li class="${questItems[index] ? 'done' : ''}"><span>${questItems[index] ? '✓' : '○'}</span>${label}</li>`).join('')}</ul><p>完成 5 項任務，開啟每日寶箱。</p>${quest.complete === quest.total && !quest.chestClaimed ? '<button data-action="claim-chest">🎁 開啟寶箱</button>' : ''}</article><a class="revenge-card jh-card" href="#/revenge"><span>👿</span><div><small>REVENGE LIST</small><h2>${wrongCount} 隻錯題怪物</h2><p>把錯過的題目練成真正實力。</p></div></a></section>
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

export function renderBattle({ subject, battle, question, feedback, ttsRate=1 }) {
  const item = SUBJECTS[subject] ?? SUBJECTS.math;
  const levelName = item.levels.find((level) => level === question?.chapter) ?? item.levels[0];
  const total = battle.questions.length;
  const hp = '♥'.repeat(battle.playerHp) + '♡'.repeat(5 - battle.playerHp);
  const enemyMax = battle.mode === 'boss' ? 500 : 100;
  return `<div class="battle-screen" style="--subject:${item.color}">
    <header class="battle-top"><a href="#/world/${subject}" aria-label="離開戰鬥">×</a><div><small>${battle.mode === 'boss' ? 'BOSS BATTLE' : item.world}</small><strong>問題 ${Math.min(battle.index + 1, total)} / ${total}</strong></div><span class="combo">🔥 ×${battle.combo}</span></header>
    <section class="enemy-stage"><div class="enemy-name"><span>${battle.mode === 'boss' ? item.boss : levelName + '怪物'}</span><b>${battle.enemyHp} HP</b></div><div class="hp-bar enemy"><i style="width:${Math.max(0, (battle.enemyHp / enemyMax) * 100)}%"></i></div><div class="monster ${feedback?.correct === true ? 'hit' : ''}">${battle.mode === 'boss' ? '🐲' : item.monster}</div><div class="player-hp" aria-label="玩家生命 ${battle.playerHp} 點">${hp}</div></section>
    <main class="question-card"><div class="question-meta"><span>${escapeHtml(question.topic ?? item.name)}</span><span>${escapeHtml(question.examProfile?.type ?? '原創基礎練習')}・難度 ${'◆'.repeat(question.difficulty ?? 1)}</span></div>${renderEnglishTtsControls(question,ttsRate)}${questionMaterial(question)}<h1>${escapeHtml(question.question)}</h1><div class="choices">${question.choices.map((choice, index) => `<button type="button" class="choice" data-action="answer" data-choice="${index}" aria-label="選項 ${String.fromCharCode(65 + index)}：${escapeHtml(choice)}"><b>${String.fromCharCode(65 + index)}</b><span>${escapeHtml(choice)}</span></button>`).join('')}</div>${feedback ? `<div class="feedback ${feedback.correct ? 'correct' : 'wrong'}"><strong>${feedback.correct ? '⚔️ Critical！答對了' : '✕ 還差一點'}</strong><p>${escapeHtml(feedback.explanation)}</p><small>核心能力：${escapeHtml(question.examProfile?.competency ?? '核心概念理解')}</small><button type="button" data-action="next">${battle.index >= total ? '查看結算' : '下一題'} →</button></div>` : ''}</main>
  </div>`;
}

export function renderResults({ subject, result }) {
  const item = SUBJECTS[subject] ?? SUBJECTS.math;
  return `<div class="result-page" style="--subject:${item.color}"><div class="result-burst">${result.cleared ? '🏆' : '🛡️'}</div><span class="eyebrow">${result.cleared ? 'STAGE CLEARED' : 'KEEP TRAINING'}</span><h1>${result.cleared ? '挑戰成功！' : '這次先記住弱點'}</h1><div class="stars">${'★'.repeat(result.stars)}${'☆'.repeat(3 - result.stars)}</div><div class="result-score"><strong>${result.accuracy}%</strong><span>${result.correct} / ${result.total} 題正確</span></div><div class="reward-row"><span>⚡ +${result.expGained} EXP</span><span>💰 +${result.coinsGained}</span><span>🔥 Max ${result.maxCombo}</span></div><p>答錯題目已自動加入「錯題復仇」。</p><a class="primary-button" href="#/world/${subject}">返回關卡地圖</a><a class="secondary-button" href="#/revenge">前往錯題復仇</a></div>`;
}

export function renderRevenge({ items = [], date = '' }) {
  const sorted=[...items].sort((a,b)=>a.nextReview.localeCompare(b.nextReview));
  const due=sorted.filter(i=>i.nextReview<=date).length;
  const available=sorted.filter(item=>item.available!==false);
  const missing=sorted.length-available.length;
  const sessionButton=available.length?`<section class="review-start-panel"><div><span class="eyebrow">CONTINUOUS REVIEW</span><h2>一次完成這批複習</h2><p>會依序進入每一題，作答後自動到下一題；可用答案卡返回修改。</p></div><button class="primary-button" data-action="start-revenge-session">開始連續複習（${available.length} 題）</button></section>`:'';
  const missingNotice=missing?`<p class="notice warning">${missing} 筆題目資料目前無法載入，已暫停這些項目的作答；請重新整理後再試。原紀錄仍保留，不會變成空白題目。</p>`:'';
  return `<div class="app-shell"><header class="page-header"><a href="#/exam-center">←</a><div><span class="eyebrow">SPACED REVIEW</span><h1>錯題與不確定題複習</h1></div></header><p class="notice">今天到期 ${due} 題・共 ${items.length} 題。先自行作答，再看解析；同一天重做不會重複增加熟練度。熟悉的題目也會安排之後再確認。</p>${missingNotice}${sessionButton}${items.length?`<section class="review-list">${sorted.map(item=>{const valid=item.available!==false;return `<article class="${valid?'':'review-missing'}"><b>${valid?(['🔴','🟠','🟡','🟢'][item.mastery]??'🔴'):'⚠️'}</b><div><h3>${escapeHtml(item.topic??item.questionId)}</h3><p>${valid?`${item.source==='official'?'官方原題':'原創練習'}・熟練度 ${item.mastery}/3・答錯 ${item.wrongCount} 次${item.uncertainCount?`・不確定 ${item.uncertainCount} 次`:''}`:'題目資料目前無法載入，無法開始作答'}</p><p>${item.nextReview<=date?'今天到期':'下次複習：'+escapeHtml(item.nextReview)}</p>${valid?`${reasonSelect(item.questionId,item.reason)}<button class="primary-button" data-action="start-revenge" data-id="${escapeHtml(item.questionId)}">${item.nextReview<=date?'開始到期複習':'提前練習'}</button>`:'<span class="muted">請重新整理頁面後再試</span>'}</div></article>`;}).join('')}</section>`:'<section class="empty-state"><span>✨</span><h2>目前沒有待複習題目</h2><p>答錯或標記不確定的題目會出現在這裡。</p><a href="#/exam-center">選擇練習</a></section>'}${nav('revenge')}</div>`;
}

export function renderAnalysis(summary, { diagnostic = null, adaptive = null, trend = {}, parentSummary = null, errorReasons = [], cycleComparison = {}, latestBaseline = null } = {}) {
  const subjectRows = SUBJECT_ORDER.filter((id) => summary.subjects[id]).map((id) => {
    const stat = summary.subjects[id]; const item = SUBJECTS[id];
    return `<article style="--subject:${item.color}"><span>${item.icon}</span><div><h3>${item.name}</h3><div class="progress"><i style="width:${stat.accuracy}%"></i></div><p>${stat.status === 'insufficient-data' ? '資料不足' : `正確率 ${stat.accuracy}%`}</p></div><strong>${stat.accuracy}%</strong></article>`;
  }).join('');
  const diagnosticPanel = diagnostic ? `<section class="diagnostic-panel jh-card"><div class="section-heading"><div><span class="eyebrow">PERSONAL DIAGNOSTIC</span><h2>${escapeHtml(diagnostic.student)}・${escapeHtml(diagnostic.source)}診斷</h2></div></div><p class="muted">推薦順序：英文閱讀 → 自然理化 → 數學非選 → 歷史／公民。這是初始底盤；後續會依實際作答動態修訂。</p><div class="diagnostic-list">${diagnosticCards(diagnostic).map((card) => `<article><div><strong>${escapeHtml(card.label)}</strong><span>${escapeHtml(card.result)}</span></div><b>${escapeHtml(card.priority)}</b><p>${escapeHtml(card.recommendation)}</p></article>`).join('')}</div></section>` : '';
  const weightNames={english:'英文',science:'自然',math:'數學',social:'社會',chinese:'國文'};
  const adaptivePanel = adaptive ? `<section class="diagnostic-panel adaptive-panel"><div class="section-heading"><div><span class="eyebrow">ADAPTIVE ENGINE</span><h2>動態學習引擎</h2></div></div>
    <p class="muted">每次作答後重新計算核心能力熟練度、優先級與科目比例。單一弱點不會無限霸佔題量。</p>
    <div class="adaptive-summary"><span>高優先弱點 <b>${adaptive.weakCount??0}</b></span><span>診斷模式 <b>${adaptive.diagnosticCount??0}</b></span><span>到期技能 <b>${adaptive.dueCount??0}</b></span></div>
    ${adaptive.subjectWeights?`<div class="weight-grid">${Object.entries(adaptive.subjectWeights).sort((a,b)=>b[1]-a[1]).map(([id,w])=>`<div><span>${weightNames[id]??id}</span><strong>${Number(w).toFixed(1)}%</strong><i style="width:${Math.min(100,w*2.2)}%"></i></div>`).join('')}</div>`:''}
    ${adaptive.topSkills?.length?`<h3>目前優先核心能力</h3><div class="diagnostic-list">${adaptive.topSkills.slice(0,5).map((skill,index)=>`<article><div><strong>#${index+1} ${escapeHtml(skill.competency)}</strong><span>P${skill.priorityScore}</span></div><b>熟練度 ${skill.mastery}/100・${escapeHtml(skill.lastMode)}</b><p>${escapeHtml(skill.domain)}${skill.consecutiveWrong? `・連錯 ${skill.consecutiveWrong} 次`:''}${skill.nextReviewDate?`・下次 ${escapeHtml(skill.nextReviewDate)}`:''}</p></article>`).join('')}</div>`:'<p class="muted">完成幾題後，這裡會開始顯示真正的核心能力弱點。</p>'}
  </section>` : '';
  const trendPanel = Object.keys(trend??{}).length ? `<section class="diagnostic-panel jh-card"><div class="section-heading"><div><span class="eyebrow">7 DAY TREND</span><h2>最近 7 天進步曲線</h2></div></div><div class="diagnostic-list">${SUBJECT_ORDER.filter(id=>trend[id]).map(id=>{const t=trend[id],item=SUBJECTS[id];const sign=t.delta>0?'+':'';return `<article><div><strong>${item.icon} ${item.name}</strong><span>${sign}${t.delta}</span></div><b>熟練度 ${t.first} → ${t.latest}</b><p>${t.delta>0?'持續進步':t.delta<0?'近期需要補強':'目前持平'}・${t.points.length} 個紀錄點</p></article>`;}).join('')}</div></section>` : '';
  const parentPanel = parentSummary ? `<section class="diagnostic-panel jh-card"><div class="section-heading"><div><span class="eyebrow">PARENT SUMMARY</span><h2>家長摘要</h2></div></div><div class="adaptive-summary"><span>今日作答 <b>${parentSummary.answeredToday}</b></span><span>到期複習 <b>${parentSummary.dueCount}</b></span><span>AI 剩餘 <b>${parentSummary.aiRemaining}</b></span></div><p class="notice">${escapeHtml(parentSummary.nextAction)}</p>${parentSummary.topWeak?.length?`<div class="diagnostic-list">${parentSummary.topWeak.map((skill,index)=>`<article><div><strong>#${index+1} ${escapeHtml(skill.competency)}</strong><span>P${skill.priorityScore}</span></div><b>熟練度 ${skill.mastery}/100</b><p>${escapeHtml(SUBJECTS[skill.subject]?.name??skill.subject)}・${escapeHtml(skill.domain??'')}</p></article>`).join('')}</div>`:''}${parentSummary.errorReasons?.length?`<h3>常見錯因</h3><div class="diagnostic-list">${parentSummary.errorReasons.slice(0,3).map(item=>`<article><div><strong>${escapeHtml(item.label)}</strong><span>${item.count} 次</span></div></article>`).join('')}</div>`:''}</section>` : '';
  const errorPanel = errorReasons.length ? `<section class="diagnostic-panel jh-card"><div class="section-heading"><div><span class="eyebrow">ERROR PATTERNS</span><h2>錯因統計</h2></div></div><div class="diagnostic-list">${errorReasons.slice(0,6).map(item=>`<article><div><strong>${escapeHtml(item.label)}</strong><span>${item.count} 次</span></div></article>`).join('')}</div></section>` : '';
  const baselinePanel = latestBaseline ? `<section class="diagnostic-panel jh-card"><div class="section-heading"><div><span class="eyebrow">DIAGNOSTIC BASELINE</span><h2>最近一次重新診斷</h2></div></div><div class="adaptive-summary"><span>正確 <b>${latestBaseline.correct}/${latestBaseline.total}</b></span><span>正確率 <b>${latestBaseline.accuracy}%</b></span><span>日期 <b>${escapeHtml(latestBaseline.date)}</b></span></div><div class="diagnostic-list">${SUBJECT_ORDER.filter(id=>latestBaseline.subjects?.[id]).map(id=>{const row=latestBaseline.subjects[id];return `<article><div><strong>${SUBJECTS[id].icon} ${SUBJECTS[id].name}</strong><span>${row.accuracy}%</span></div><b>${row.correct} / ${row.total}</b><p>重新診斷基準</p></article>`;}).join('')}</div></section>` : '';
  const cyclePanel = Object.keys(cycleComparison??{}).length ? `<section class="diagnostic-panel jh-card"><div class="section-heading"><div><span class="eyebrow">CYCLE COMPARISON</span><h2>上一週期 vs 目前</h2></div></div><div class="diagnostic-list">${SUBJECT_ORDER.filter(id=>cycleComparison[id]).map(id=>{const row=cycleComparison[id];const sign=row.delta>0?'+':'';return `<article><div><strong>${SUBJECTS[id].icon} ${SUBJECTS[id].name}</strong><span>${sign}${row.delta}</span></div><b>${row.before} → ${row.after}</b><p>${row.delta>0?'熟練度提升':row.delta<0?'需要重新補強':'維持不變'}</p></article>`;}).join('')}</div></section>` : '';
  return `<div class="app-shell"><header class="page-header"><a href="#/">←</a><div><span class="eyebrow">ABILITY SCAN</span><h1>能力分析</h1></div><span></span></header>${subjectRows ? `<section class="analysis-list">${subjectRows}</section>` : '<section class="empty-state"><span>📊</span><h2>還沒有足夠資料</h2><p>完成每科至少 3 題後，這裡會開始顯示強項與弱點。</p><a href="#/">開始第一場冒險</a></section>'}${adaptivePanel}${trendPanel}${errorPanel}${parentPanel}${baselinePanel}${cyclePanel}${diagnosticPanel}${nav('analysis')}</div>`;
}

export function renderProfile({ player, aiUsage={count:0,limit:12}, cycleCount=0, currentCycleStartedOn=null }) {
  const used=Number(aiUsage.count??0),limit=Number(aiUsage.limit??12);
  return `<div class="app-shell"><header class="page-header"><a href="#/">←</a><div><span class="eyebrow">PLAYER</span><h1>我的冒險資料</h1></div><span></span></header>
  <section class="profile-card jh-card"><span class="avatar">🧑‍🚀</span><h2>${escapeHtml(player.name)}</h2><strong>LV.${player.level}</strong><dl><div><dt>累積 EXP</dt><dd>${player.exp}</dd></div><div><dt>金幣</dt><dd>${player.coins}</dd></div><div><dt>總答題</dt><dd>${player.totalAnswered}</dd></div><div><dt>擊敗 Boss</dt><dd>${player.bossesDefeated}</dd></div></dl></section>
  <section class="practice-panel"><span class="eyebrow">AI BUDGET</span><h2>今日 AI 題目額度</h2><p>已使用 ${used} / ${limit} 題。超過上限後會自動改用本地題庫，不會中斷練習。</p><label>每日 AI 題目上限<select id="ai-daily-limit">${[0,6,12,20,30,50].map(value=>`<option value="${value}" ${value===limit?'selected':''}>${value===0?'停用 AI':value+' 題'}</option>`).join('')}</select></label></section>
  <section class="practice-panel"><span class="eyebrow">BACKUP</span><h2>學習資料備份／還原</h2><p>重置或更換裝置前，建議先下載 JSON 備份。還原會覆蓋目前這台裝置的學習資料。</p><button class="secondary-button" data-action="export-backup">下載備份</button><button class="secondary-button" data-action="import-backup">選擇備份還原</button><input id="backup-file-input" type="file" accept="application/json,.json" hidden></section>
  <section class="practice-panel"><span class="eyebrow">RE-DIAGNOSIS</span><h2>重新建立學習底盤</h2><p>進行 25 題五科平衡診斷，每科 5 題；AI 額度允許時最多混入 5 題 AI 診斷題，其餘使用本地題庫。完成後會用這次結果重建核心能力 Mastery 與 Priority。</p><button class="primary-button" data-action="start-diagnostic">開始 25 題重新診斷</button></section>
  <section class="practice-panel"><span class="eyebrow">RESET MODES</span><h2>重新開始方式</h2><p class="muted">目前已封存 ${cycleCount} 個學習週期${currentCycleStartedOn?`・本週期自 ${escapeHtml(currentCycleStartedOn)} 開始`:''}。</p>
    <button class="secondary-button" data-action="reset-adaptive">只重置 AI／自適應記憶</button>
    <button class="secondary-button" data-action="start-new-cycle">建立新學習週期</button>
    <button class="danger-button" data-action="reset-progress">完整重置全部資料</button>
  </section>${nav('profile')}</div>`;
}

export function renderExam({ exam, index, answers, remaining }) {
  const question = exam.questions[index];
  const item = SUBJECTS[question.subject];
  const unanswered = exam.questions.filter((q) => answers[q.id] === undefined).length;
  const nextControl = index === exam.questions.length - 1
    ? `<button class="submit-button" data-action="submit-exam" aria-label="交卷，尚有 ${unanswered} 題未作答">交卷${unanswered ? `（未答 ${unanswered} 題）` : ''}</button>`
    : '<button data-action="exam-next">下一題 →</button>';
  const stickySubmit = index === exam.questions.length - 1 ? `<div class="exam-submit-sticky"><button class="submit-button" data-action="submit-exam">交卷${unanswered ? `（未答 ${unanswered} 題）` : ''}</button></div>` : '';
  return `<div class="exam-page" style="--subject:${item.color}"><header class="exam-header"><a href="#/">×</a><div><span class="eyebrow">QUICK EXAM</span><h1>快速模考</h1></div><strong>⏱ ${remaining}</strong></header><div class="exam-layout"><main class="question-card exam-question"><div class="question-meta"><span>${item.icon} ${item.name}</span><span>${escapeHtml(question.examProfile?.type ?? '原創基礎練習')}・${index + 1} / ${exam.questions.length}</span></div><h2>${escapeHtml(question.question)}</h2><div class="choices">${question.choices.map((choice, choiceIndex) => `<button class="choice ${answers[question.id] === choiceIndex ? 'selected' : ''}" data-action="exam-answer" data-choice="${choiceIndex}"><b>${String.fromCharCode(65 + choiceIndex)}</b><span>${escapeHtml(choice)}</span></button>`).join('')}</div><div class="exam-controls"><button data-action="exam-prev" ${index === 0 ? 'disabled' : ''}>← 上一題</button>${nextControl}</div></main><aside class="answer-sheet"><h2>答案卡</h2><div>${exam.questions.map((q, qIndex) => `<button data-action="exam-go" data-index="${qIndex}" class="${qIndex === index ? 'current' : ''} ${answers[q.id] !== undefined ? 'answered' : ''}">${qIndex + 1}</button>`).join('')}</div><button class="submit-button" data-action="submit-exam">交卷</button></aside></div>${stickySubmit}</div>`;
}

export function renderExamResults(result) {
  return `<div class="result-page exam-result"><div class="result-burst">🏆</div><span class="eyebrow">QUICK EXAM REPORT</span><h1>快速模考完成</h1><div class="result-score"><strong>${result.accuracy}%</strong><span>${result.correct} / ${result.total} 題正確</span></div><p class="notice">本結果為平台模擬分析，並非官方會考等級。</p><section class="review-list">${result.items.map((item, index) => `<article class="${item.correct ? 'correct' : 'wrong'}"><b>${index + 1}</b><div><strong>${item.correct ? '答對' : '答錯'}</strong><p>${escapeHtml(item.explanation)}</p></div></article>`).join('')}</section><a class="primary-button" href="#/analysis">查看能力分析</a><a class="secondary-button" href="#/">返回首頁</a></div>`;
}
export { nav };
