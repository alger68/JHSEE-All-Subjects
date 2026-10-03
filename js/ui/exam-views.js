import { SUBJECTS, SUBJECT_ORDER } from '../config/subjects.js';
import { OFFICIAL_PAPERS, OFFICIAL_SOURCE } from '../config/official-papers.js';
import { REVIEW_REASONS } from '../core/mastery.js';
import { renderOfficialQuestion, renderPaperReader, renderOfficialMode, renderOfficialManual, renderOfficialFormula } from './official-reader.js';

export const html = (v) => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const link = (url,label) => `<a class="secondary-button" href="${html(url)}" target="_blank" rel="noopener noreferrer">${html(label)} ↗</a>`;
const letter = (n) => Number.isInteger(n) ? String.fromCharCode(65+n) : '未作答';
export const clock = (seconds) => `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;

export function questionMaterial(q) {
  return `${q.passage ? `<div class="passage">${html(q.passage)}</div>` : ''}${q.table ? `<div class="table-scroll"><table><thead><tr>${q.table.headers.map(h=>`<th scope="col">${html(h)}</th>`).join('')}</tr></thead><tbody>${q.table.rows.map(row=>`<tr>${row.map(c=>`<td>${html(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}`;
}

export function renderEnglishTtsControls(q,rate=1) {
  if(!q||q.subject!=='english'||q.source==='official')return '';
  const safeRate=[0.75,1,1.25].includes(Number(rate))?Number(rate):1;
  return `<div class="english-tts" aria-label="英文朗讀控制">
    <div class="english-tts-buttons">
      <button type="button" data-action="tts-full" data-id="${html(q.id)}">🔊 全文</button>
      <button type="button" data-action="tts-question" data-id="${html(q.id)}">🔊 題目</button>
      <button type="button" data-action="tts-choices" data-id="${html(q.id)}">🔊 選項</button>
      <button type="button" data-action="tts-stop">⏹ 停止</button>
    </div>
    <div class="english-tts-settings">
      <label>聲音
        <select data-english-tts-voice aria-label="英文朗讀聲音"><option value="">自動（推薦）</option></select>
      </label>
      <label>語速
        <select data-english-tts-rate>
          ${[0.75,1,1.25].map(value=>`<option value="${value}" ${value===safeRate?'selected':''}>${value}×</option>`).join('')}
        </select>
      </label>
    </div>
  </div>`;
}

export function renderExamCenter({papers,activeSession,attempts=[],reports=[],dueCount=0,practiceCount=0,alignedCount=0,diagnostic=null,adaptive=null,mockWarRoom=null,repairPlan=[],coverage=null}) {
  return `<div class="app-shell"><header class="page-header"><a href="#/" aria-label="回首頁">←</a><div><span class="eyebrow">CAP STUDY CENTER</span><h1>會考與補強中心</h1></div></header>
  ${activeSession?`<section class="notice"><strong>尚有進行中的測驗：${html(activeSession.title)}</strong><p>原倒數持續計時，作答已保存在這台裝置。</p><a class="primary-button" href="#/exam">繼續作答</a></section>`:''}
  <section class="study-intro"><h2>真題熟悉考試，練習補足弱點。</h2><p>官方題目直接在本站閱讀、選答案；可切換逐題作答或整份題本，完整保留文章、圖表與題組。交卷後才核對答案。</p><div class="study-intro-actions"><a class="text-link" href="${OFFICIAL_SOURCE}" target="_blank" rel="noopener noreferrer">官方 115 年資料來源 ↗</a><a class="primary-button" href="#/placement">🎯 查看基北區升學落點</a></div></section>
  <section class="practice-panel cap-war-room"><span class="eyebrow">CAP WAR ROOM</span><h2>會考戰情中心</h2><p>記錄每次模擬考的五科等級，系統用來看趨勢、安排下一週讀書比例，並調整 Adaptive 出題權重。這是內部學習配置，不是官方級距換算或錄取預測。</p>
    <input id="mock-record-id" type="hidden" value="${html(mockWarRoom?.latest?.id??'')}">
    <div class="practice-filters">
      <label>模考日期<input id="mock-date" type="date" value="${html(mockWarRoom?.latest?.date??'')}"></label>
      <label>名稱<input id="mock-title" type="text" maxlength="40" value="${html(mockWarRoom?.latest?.title??'')}" placeholder="例如：第二次模考"></label>
      ${SUBJECT_ORDER.map(id=>{const current=mockWarRoom?.latest?.grades?.[id]??'';return `<label>${SUBJECTS[id].name}<select data-mock-grade="${id}"><option value="" ${current?'':'selected'} disabled>請選擇</option>${['A++','A+','A','B++','B+','B','C'].map(level=>`<option value="${level}" ${current===level?'selected':''}>${level}</option>`).join('')}</select></label>`;}).join('')}
    </div>
    <details ${mockWarRoom?.latest&&SUBJECT_ORDER.some(id=>(mockWarRoom.latest.errors?.[id]?.wrong??0)>0||(mockWarRoom.latest.errors?.[id]?.topics?.length??0)>0)?'open':''}><summary>這次錯題明細（選填）</summary><div class="practice-filters">
      ${SUBJECT_ORDER.map(id=>{const row=mockWarRoom?.latest?.errors?.[id]??{wrong:0,topics:[]};return `<label>${SUBJECTS[id].name}錯題數<input type="number" min="0" max="99" value="${Number(row.wrong??0)}" data-mock-wrong="${id}"></label><label>${SUBJECTS[id].name}錯誤題型<input type="text" maxlength="200" value="${html((row.topics??[]).join('、'))}" data-mock-topics="${id}" placeholder="例如：閱讀理解, 推論題"></label>`;}).join('')}
    </div></details>
    <div class="mock-form-actions"><button class="primary-button" data-action="save-mock-exam">${mockWarRoom?.latest?'更新這筆模考':'儲存這次模考'}</button>${mockWarRoom?.latest?'<button class="secondary-button" data-action="new-mock-exam">新增另一筆模考</button>':''}</div>
    ${mockWarRoom?.latest?`<div class="diagnostic-panel"><h3>${html(mockWarRoom.latest.title)}・${html(mockWarRoom.latest.date)}</h3><div class="diagnostic-list">${SUBJECT_ORDER.map(id=>{const t=mockWarRoom.trend[id];const subject=SUBJECTS[id];const change=t?.previous?`（${html(t.previous)} → ${html(t.level)}）`:'';return `<article><div><strong>${subject.icon} ${subject.name}</strong><span>${html(t?.level??'—')}</span></div><p>${change||'第一次紀錄'}</p></article>`;}).join('')}</div><h3>下一週讀書比例</h3><div class="weight-grid">${Object.entries(mockWarRoom.studyWeights??{}).sort((a,b)=>b[1]-a[1]).map(([id,w])=>`<div><span>${SUBJECTS[id]?.name??id}</span><strong>${Number(w).toFixed(1)}%</strong><i style="width:${Math.min(100,w*2.2)}%"></i></div>`).join('')}</div>${mockWarRoom.prioritySubjects?.length?`<p class="notice"><strong>目前優先：</strong>${mockWarRoom.prioritySubjects.slice(0,3).map(item=>`${SUBJECTS[item.subject]?.name??item.subject} ${item.level}`).join(' → ')}</p>`:''}</div>`:'<p class="muted">尚未輸入模考紀錄。輸入後才會用實際等級修正學習配置。</p>'}
    ${mockWarRoom?.records?.length?`<details><summary>查看歷次模考（${mockWarRoom.records.length} 次）</summary><ul class="attempt-list">${mockWarRoom.records.slice().reverse().slice(0,20).map(record=>`<li><strong>${html(record.title)}</strong><span>${SUBJECT_ORDER.map(id=>`${SUBJECTS[id].name}${record.grades[id]}`).join('・')}</span><small>${html(record.date)}</small><button type="button" class="mock-delete-button" data-action="delete-mock-exam" data-id="${html(record.id)}" aria-label="刪除 ${html(record.title)} ${html(record.date)}">刪除</button></li>`).join('')}</ul></details>`:''}
  </section>
  ${repairPlan?.length?`<section class="practice-panel repair-plan"><span class="eyebrow">7 DAY REPAIR</span><h2>模考後 7 天修復計畫</h2><p>按任務開始會考導向題；交卷後依實際作答題數計入進度。主題題不足時會由同科題補足。</p><button type="button" class="secondary-button" data-action="restart-repair-plan">重新安排 7 天（會清除本計畫進度）</button><div class="diagnostic-list">${repairPlan.map((day,index)=>`<article><div><strong>Day ${index+1}・${html(day.date)}</strong><span>${day.tasks.filter(task=>task.completed).length} / ${day.tasks.length} 組完成</span></div>${day.tasks.map((task,taskIndex)=>`<div class="repair-task"><div><strong>${SUBJECTS[task.subject]?.name??html(task.subject)}${task.topic?`・${html(task.topic)}`:''}</strong><span>${task.answered??0} / ${task.questionTarget} 題</span></div>${task.topic&&task.topicAvailable===false?'<p>題庫暫無對應主題，本組改練同科題。</p>':''}${task.completed?'<b>✓ 已完成</b>':`<button type="button" class="secondary-button" data-action="start-repair-task" data-day="${index}" data-task="${taskIndex}">開始補強・${task.answered??0} / ${task.questionTarget} →</button>`}</div>`).join('')}</article>`).join('')}</div></section>`:''}
  ${coverage?`<section class="practice-panel"><span class="eyebrow">CAP COVERAGE</span><h2>會考考點覆蓋率</h2><div class="diagnostic-list">${SUBJECT_ORDER.map(id=>{const row=coverage[id]??{covered:0,total:0,percent:0,missingSkills:[]};return `<article><div><strong>${SUBJECTS[id].icon} ${SUBJECTS[id].name}</strong><span>${row.percent}%</span></div><b>${row.covered} / ${row.total} 個核心能力已練</b><p>${row.missingSkills.length?`尚未覆蓋：${row.missingSkills.slice(0,4).map(html).join('、')}`:'目前沒有未覆蓋能力'}</p></article>`;}).join('')}</div></section>`:''}
  <h2>115 年官方歷屆試卷</h2><section class="paper-grid">${papers.map(p=>`<article class="paper-card"><span class="status-chip">官方歷屆題</span><h3>${html(p.title)}</h3><p>${p.count?`${p.count} 題選擇題`:'1 篇寫作'}${p.subject==='math'?'＋2 題非選':''}・${p.durationMinutes} 分鐘</p><p class="muted">${p.section==='listening'?'站內看題＋官方音檔・三選一':p.section==='writing'?'紙筆練寫／草稿保存・官方樣卷對照':'逐題作答／整份題本・站內閱讀'}</p><a class="primary-button" href="#/paper/${p.id}">準備這份試卷 →</a></article>`).join('')}</section>
  <section class="practice-panel"><span class="eyebrow">DAILY PRACTICE</span><h2>原創短練習</h2><p>目前 ${practiceCount} 題原創練習：會考導向 ${alignedCount} 題、基礎補強 ${practiceCount-alignedCount} 題。與官方卷分開記錄，沒有正式等級換算。</p><p class="muted">預設練習已核對的會考導向題，著重閱讀、情境、資料分析與推論。會考導向是本站分類；官方真題請使用上方試卷。</p>${diagnostic?`<p class="notice"><strong>${mockWarRoom?.latest?'依自己模考調整的學習比例：':'五科均衡起步：'}</strong>${mockWarRoom?.latest?'已依最新模考等級配置科目；作答後會繼續修正。':'尚未輸入模考，先不預設個人弱點。'}${adaptive?.subjectWeights?`目前比例：${Object.entries(adaptive.subjectWeights).sort((a,b)=>b[1]-a[1]).map(([id,w])=>`${SUBJECTS[id]?.name??id} ${Number(w).toFixed(1)}%`).join('・')}`:'開始作答後會依核心能力動態修訂。'}</p>`:''}<div class="practice-filters"><label>練習目的<select id="practice-focus"><option value="aligned">會考導向</option><option value="basic">基礎補強</option><option value="all">全部原創題</option></select></label><label>科目<select id="practice-subject"><option value="all">五科混合</option>${SUBJECT_ORDER.map(id=>`<option value="${id}">${SUBJECTS[id].name}</option>`).join('')}</select></label><label>練習範圍<select id="practice-grade"><option value="9">國中三年</option><option value="7">國一年級考點</option><option value="8">國一至國二考點</option></select></label><label>題型<select id="practice-type"><option value="">全部</option>${['閱讀理解','情境應用','資料分析','推論'].map(t=>`<option>${t}</option>`).join('')}</select></label></div><p class="muted">年級分類為本站教材分類，章節教學順序可能因版本而異。每次最多 10 題，20 分鐘。</p><p data-practice-matches role="status">符合條件 ${alignedCount} 題・本次 ${Math.min(10,alignedCount)} 題</p><button class="primary-button" data-action="start-practice" ${alignedCount?'':'disabled'}>開始短練習</button></section>
  <section class="practice-panel"><h2>今天先複習這裡</h2><p>有 ${dueCount} 題到期複習。答錯和猜對的題目都值得再確認。</p><a class="primary-button" href="#/revenge">打開複習清單</a><p class="muted">補課資源：</p>${link('https://www.junyiacademy.org/','均一：觀念影片與習題')}${link('https://adl.edu.tw/','因材網：學校適性學習')}</section>
  <section class="practice-panel"><h2>最近完整報告與草稿</h2><p class="muted">這台裝置保留最近 10 份完整報告（含非選／寫作草稿）；重要草稿請自行另存。</p>${reports.length?`<ul class="attempt-list">${reports.slice().reverse().map(r=>`<li><strong>${html(r.title)}</strong><a class="text-link" href="#/exam-results/${html(r.sessionId)}">開啟報告與草稿 →</a></li>`).join('')}</ul>`:'<p>交卷後可從這裡重新開啟。</p>'}</section><section class="practice-panel"><h2>最近作答紀錄</h2>${attempts.length?`<ul class="attempt-list">${attempts.slice(-8).reverse().map(a=>`<li><strong>${html(a.title??a.subject)}</strong><span>${a.kind==='official-writing'?'寫作已保存':`${a.accuracy}%` }・${a.attemptNumber>1?`第 ${a.attemptNumber} 次`:'首次'}${a.hintCount?'・有提示':''}</span><small>${html(a.at?.slice(0,10))}</small></li>`).join('')}</ul>`:'<p>完成一次練習後，這裡會顯示首次與重做成績。</p>'}</section><a class="secondary-button" href="#/">返回冒險首頁</a></div>`;
}

export function renderPaperSetup(paper) {
  if (!paper) return '<div class="app-shell"><h1>找不到這份試卷</h1><a href="#/exam-center">返回會考中心</a></div>';
  return `<div class="app-shell"><header class="page-header"><a href="#/exam-center">←</a><div><span class="eyebrow">OFFICIAL PAPER</span><h1>${html(paper.title)}</h1></div></header><section class="practice-panel"><h2>直接在本站看題與作答</h2><p>題目使用官方原題影像，保留文章、圖表、公式與全部選項。開始後也能隨時切換閱讀方式。</p><fieldset class="paper-mode-setup"><legend>選擇看題方式</legend><label><input type="radio" name="paper-mode" value="question" checked> 逐題作答 <small>一題一題閱讀，題組附共用文章。</small></label><label><input type="radio" name="paper-mode" value="whole"> 整份題本 <small>在本站翻閱原試卷，搭配答案卡。</small></label></fieldset><ol class="setup-list"><li>${paper.section==='listening'?'本站可播放官方完整聽力音檔；請先準備耳機，開始後按播放。':paper.subject==='math'?'準備紙筆，80 分鐘包含選擇題及 2 題非選。非選題與參考公式也在本站。':paper.section==='writing'?'官方寫作題目會顯示在草稿上方；可用紙筆作答或保存文字草稿。':'選擇 A、B、C、D，可標記不確定題並返回檢查。'}</li><li>開始後持續計時 ${paper.durationMinutes} 分鐘，離開頁面也不暫停；時間到會自動交卷。</li></ol><p class="notice">本站為自主練習工具。${paper.manualCount?'非選與寫作由你對照官方樣卷檢討，不自動評級。':'僅核對選擇題，不推估正式會考等級。'}</p><button class="primary-button" data-action="start-paper" data-id="${paper.id}">開始作答・${paper.durationMinutes} 分鐘</button><details class="official-source"><summary>需要下載或列印原檔？</summary>${link(paper.paperUrl,paper.section==='listening'?'官方聽力題本與音檔 ZIP':'官方原 PDF 題本')}</details></section></div>`;
}

export function renderSession({session,questions,paper,remaining,ttsRate=1}) {
  const q=questions[session.index];
  const unanswered=questions.filter(q=>session.answers[q.id]===undefined).length;
  const questionPaper=q?.source==='official' ? (paper?.id===q.paperId ? paper : OFFICIAL_PAPERS.find(item=>item.id===q.paperId)) : null;
  const official=Boolean(questionPaper);
  const manual=session.kind==='review'?0:(paper?.manualCount??0);
  const subject=SUBJECTS[q?.subject??paper?.subject];
  const canSwitchPaper=official&&session.kind!=='review';
  return `<div class="exam-page" style="--subject:${subject?.color??'#63e6e2'}"><header class="exam-header"><a href="#/exam-center" aria-label="返回會考中心，計時繼續">←</a><div><span class="eyebrow">${official?'OFFICIAL PAPER':session.kind==='review'?'REVENGE REVIEW':'PRACTICE'}</span><h1>${html(session.title)}</h1></div><strong data-exam-timer aria-label="剩餘時間">⏱ ${clock(remaining)}</strong></header>
  <div class="exam-top-actions"><span data-exam-progress>${questions.length?`已答 ${questions.length-unanswered} / ${questions.length}`:'寫作練習'}</span><button class="submit-button" data-action="submit-exam">${manual?'交卷並保存':'交卷'}</button></div>
  ${official&&canSwitchPaper?`<details class="official-source"><summary>官方來源與原檔</summary>${link(questionPaper.paperUrl,'開啟官方原檔')}<p>本站顯示官方原題影像。${manual&&paper.subject==='math'?'本倒數包含非選題時間。':''}</p></details>`:''}
  <div class="exam-layout"><main class="question-card exam-question">${canSwitchPaper?renderOfficialMode(questionPaper,session):''}${canSwitchPaper&&session.paperMode==='whole'?renderPaperReader(questionPaper,session):''}${q?`<div class="question-meta"><span>${html(subject?.name)}</span><span>${session.index+1} / ${questions.length}</span></div>${!official?renderEnglishTtsControls(q,ttsRate):''}${official?`<h2>第 ${q.number} 題</h2>${session.paperMode==='whole'&&canSwitchPaper?'<p class="muted">請依上方題本的題號填答；可用「逐題作答」直接顯示這題。</p>':renderOfficialQuestion(questionPaper,q)}`:`${questionMaterial(q)}<h2>${html(q.question)}</h2>`}<div class="choices">${q.choices.map((choice,i)=>`<button class="choice ${session.answers[q.id]===i?'selected':''}" data-action="exam-answer" data-choice="${i}" aria-pressed="${session.answers[q.id]===i}"><b>${letter(i)}</b><span>${official?`選 ${letter(i)}`:html(choice||`選項 ${letter(i)}`)}</span></button>`).join('')}</div><button class="uncertain-button ${session.uncertain[q.id]?'marked':''}" data-action="exam-uncertain" aria-pressed="${!!session.uncertain[q.id]}">${session.uncertain[q.id]?'⚑ 已標記不確定':'⚐ 不確定／這題用猜的'}</button>${!official&&session.kind!=='quick-exam'?`<button class="uncertain-button" data-action="practice-hint">${session.hinted[q.id]?'已使用提示':'練習提示（會記錄使用）'}</button>${session.hinted[q.id]?`<p class="notice">${html(q.hint1)}</p>`:''}`:''}<div class="exam-controls"><button data-action="exam-prev" ${session.index===0?'disabled':''}>← 上一題</button>${session.index===questions.length-1?'<button class="submit-button" data-action="submit-exam">交卷 →</button>':'<button data-action="exam-next">下一題 →</button>'}</div>`:'<h2>寫作草稿</h2><p>閱讀下方官方題目後，可用紙筆完成正式版，並在下方保存草稿或檢討筆記。</p>'}
  ${manual?`<section class="manual-notes"><h2>${paper.subject==='math'?'非選擇題紀錄':'文字草稿'}</h2><p>草稿會自動保存在這台裝置；紙筆作答完成後再交卷。</p>${Array.from({length:manual},(_,i)=>{const id=paper.subject==='math'?`math${i+1}`:'writing';return `${renderOfficialManual(paper,i)}<label>${paper.subject==='math'?`非選第 ${i+1} 題過程／筆記`:'寫作內容'}<textarea data-exam-note="${id}" rows="${paper.subject==='math'?5:14}" maxlength="20000">${html(session.notes[id]??'')}</textarea></label>`;}).join('')}</section>`:''}${paper?renderOfficialFormula(paper):''}</main>
  ${questions.length?`<aside class="answer-sheet"><h2>答案卡</h2><p class="muted">⚑ 代表不確定題；可點題號跳題。</p><div>${questions.map((x,i)=>`<button data-action="exam-go" data-index="${i}" aria-label="第 ${i+1} 題，${letter(session.answers[x.id])}${session.uncertain[x.id]?'，不確定':''}" class="${i===session.index?'current':''} ${session.answers[x.id]!==undefined?'answered':''}">${i+1}${session.uncertain[x.id]?'⚑':''}</button>`).join('')}</div><button class="submit-button" data-action="submit-exam">交卷</button></aside>`:''}</div></div>`;
}

export const REASONS = REVIEW_REASONS;
export function reasonSelect(id,value='') {
  return `<label class="reason-label">這題卡在哪裡？<select data-wrong-reason="${html(id)}"><option value="">自行選擇錯因</option>${Object.entries(REASONS).map(([key,label])=>`<option value="${key}" ${value===key?'selected':''}>${label}</option>`).join('')}</select></label>`;
}

const officialReviewPrompt = {
  chinese: '先在原文圈出關鍵句，對照題目問法，再排除不符的選項。',
  english: '先在原題找出判斷依據，核對關鍵字、語境與選項差異。',
  math: '先寫出題目已知與所求，再核對算式、單位和答案。',
  science: '先讀圖表的變因與單位，再用題目資料核對推論。',
  social: '先確認時間、地點或制度，再對照圖表和選項。'
};

export function renderSessionResults({result,questions,paper,wrongQuestions=[]}) {
  const manual=result.kind==='review'?0:(paper?.manualCount??0);
  const indexed=result.items.map((item,index)=>({item,index}));
  const needsReview=({item})=>!item.correct||item.uncertain||item.hinted;
  const ordered=paper?[...indexed].sort((a,b)=>Number(needsReview(b))-Number(needsReview(a))||a.index-b.index):indexed;
  const reviewCount=indexed.filter(needsReview).length;
  const unansweredCount=indexed.filter(({item})=>item.choice===undefined).length;
  return `<div class="app-shell"><header class="page-header"><a href="#/exam-center">←</a><div><span class="eyebrow">LEARNING REPORT</span><h1>${html(result.title)}・完成</h1></div></header><section class="practice-panel"><div class="result-score"><strong>${result.total?`${result.accuracy}%`:'已保存'}</strong><span>${result.total?`${result.correct} / ${result.total} 題選擇題正確`:'寫作草稿已保存'}</span></div><p>${result.attemptNumber>1?`第 ${result.attemptNumber} 次作答`:'首次作答'}・用時 ${clock(result.elapsedSeconds??0)}${result.items.some(x=>x.hinted)?'・本次使用過提示':''}</p><p class="notice">${paper?'官方歷屆題練習':'原創練習'}，不是正式會考成績。${manual?'非選／寫作不包含在上述選擇題正確率中。':''}答錯或標記不確定的題目已加入複習清單。</p>${paper&&result.total?link(paper.answerUrl,'官方參考答案'):''}${paper?.reviewUrls.map(x=>link(x.url,x.label)).join('')??''}</section>
  ${paper&&result.total?`<section class="practice-panel"><h2>先檢討 ${reviewCount} 題需要確認的題目</h2><p>${unansweredCount} 題未作答；未作答題不會自動加入錯題清單。下方已把答錯、未作答和標記不確定的題目排在前面。逐題看官方原題與參考答案，記下錯因，再做同科五題短練習。同科練習尚未對應這道官方題的考點。</p></section>`:''}
  ${manual?`<section class="practice-panel"><h2>本次保存的草稿</h2>${Array.from({length:manual},(_,i)=>paper.subject==='math'?`math${i+1}`:'writing').map(key=>`<h3>${key==='writing'?'寫作':key==='math1'?'非選第 1 題':'非選第 2 題'}</h3>${renderOfficialManual(paper,key==='math2'?1:0)}<div class="passage">${html(result.notes?.[key])||'未填寫文字草稿（可對照紙本）'}</div>`).join('')}</section>`:''}
  <section class="review-list">${ordered.map(({item,index})=>{const q=questions.find(q=>q.id===item.id);const wrong=wrongQuestions.find(w=>w.questionId===item.id);const review=needsReview({item});return `<article class="${review?'wrong':'correct'}"><b>${html(q?.number??index+1)}</b><div><strong>${paper?`第 ${html(q?.number??index+1)} 題・`:''}${item.choice===undefined?'○ 未作答':item.correct?'✓ 答對':'✕ 需複習'}${item.uncertain?'・曾標記不確定':''}${item.hinted?'・用過提示':''}</strong><p>${html(q?.question??item.id)}</p><p>你的答案：${letter(item.choice)}　正確答案：${letter(item.answer)}</p>${!paper&&q?`${questionMaterial(q)}<ol class="report-choices">${q.choices.map((choice,choiceIndex)=>`<li class="${choiceIndex===item.answer?'correct':''}">${letter(choiceIndex)}．${html(choice)}${choiceIndex===item.answer?' ✓':''}</li>`).join('')}</ol><p>${html(item.explanation)}</p><p class="muted">${html(q.examProfile?.domain??'未分類')}・${html(q.examProfile?.type??'未分類')}・${html(q.examProfile?.competency??'尚未標註')}</p><p class="muted">${q.examAligned?'原創會考導向・本站核對':'原創基礎練習・未完成會考對照'}</p>`:(q&&paper?`<details class="report-original" data-original-paper="${html(paper.id)}" data-original-number="${html(q.number)}"><summary>查看這道官方原題</summary><div data-original-slot></div></details>${review?`<div class="official-review-steps"><p>檢討步驟：${html(officialReviewPrompt[q.subject]??'先核對原題資料與選項。')}</p><p class="muted">本站尚未提供逐題解析；請以官方參考答案與原題核對。</p><button type="button" class="secondary-button" data-action="start-official-repair" data-subject="${html(q.subject)}">練同科 5 題 →</button></div>`:''}`:'<p>搭配原題本與官方答案檢討。</p>')}${wrong&&item.choice!==undefined?reasonSelect(item.id,wrong.reason):''}</div></article>`;}).join('')}</section>
  ${!paper&&result.items.some(item=>item.choice!==undefined&&(!item.correct||item.uncertain||item.hinted))?`<section class="practice-panel"><span class="eyebrow">ADAPTIVE VALIDATION</span><h2>立即驗收這次弱點</h2><p>依本次答錯、猜題或使用提示的核心能力，先挑最高 Priority 產生 2～4 題近遷移題。驗收結果會繼續更新 Mastery，並排入 1／3／7／14／30 天複習。</p><button class="primary-button" data-action="start-ai-remediation">開始 AI 弱點驗收</button></section>`:''}
  <a class="primary-button" href="#/revenge">安排錯題複習</a><a class="secondary-button" href="#/exam-center">返回會考中心</a></div>`;
}
