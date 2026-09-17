import { html, clock } from './exam-views.js';

export function renderExamCheck({ session, questions, paper, remaining }) {
  const rows = questions.map((question, index) => ({
    index,
    number: question.number ?? index + 1,
    unanswered: session.answers[question.id] === undefined,
    uncertain: session.uncertain[question.id] === true
  }));
  const unanswered = rows.filter(row => row.unanswered);
  const uncertain = rows.filter(row => row.uncertain);
  const manualCount = session.kind === 'review' ? 0 : (paper?.manualCount ?? 0);
  const questionButtons = (items, label) => items.map(row =>
    `<button data-action="check-question" data-index="${row.index}" aria-label="返回第 ${row.number} 題，${label}">第 ${row.number} 題</button>`
  ).join('');

  return `<div class="exam-check-page">
    <header class="exam-check-header"><div><span class="eyebrow">FINAL CHECK</span><h1 tabindex="-1">交卷前檢查</h1><p>${html(session.title)}</p></div><strong data-exam-timer aria-label="剩餘時間">⏱ ${clock(remaining)}</strong></header>
    <section class="practice-panel" data-submit-summary aria-label="作答摘要">
      ${questions.length ? `<div class="submit-summary"><span>已作答 <b>${questions.length - unanswered.length}</b> 題</span><span>未作答 <b>${unanswered.length}</b> 題</span><span>不確定 <b>${uncertain.length}</b> 題</span></div><p>${unanswered.length ? '還有題目未作答。可以點下方題號補答，也可以直接交卷。' : '所有選擇題都已填答，可以再檢查不確定的題目。'}</p>` : '<p>準備提交寫作草稿。請確認紙本或文字作答已完成。</p>'}
      <p class="muted">檢查期間倒數持續，時間到會自動交卷。確認交卷後才會顯示答案，並保存本次報告。</p>
    </section>
    <div class="check-actions"><button class="secondary-button" data-action="return-exam">返回繼續作答</button><button class="primary-button" data-action="confirm-submit-exam" data-session-id="${html(session.id)}">確認交卷${manualCount ? '並保存草稿' : ''}</button></div>
    ${unanswered.length ? `<section class="practice-panel"><h2>未作答的題目</h2><div class="check-question-list">${questionButtons(unanswered, '未作答')}</div></section>` : ''}
    ${uncertain.length ? `<section class="practice-panel"><h2>標記不確定的題目</h2><p class="muted">標記不確定不會更動你的答案。</p><div class="check-question-list">${questionButtons(uncertain, '不確定')}</div></section>` : ''}
    ${manualCount ? `<section class="practice-panel"><h2>草稿確認</h2><ul class="draft-check">${Array.from({length: manualCount}, (_, i) => {const key = paper.subject === 'math' ? `math${i + 1}` : 'writing'; const length = (session.notes[key] ?? '').trim().length; return `<li>${key === 'writing' ? '寫作草稿' : `非選第 ${i + 1} 題`}：${length ? `已填寫 ${length} 字元` : '未填寫文字草稿'}</li>`;}).join('')}</ul><p class="muted">若已在紙上完成，不必重複輸入。非選與寫作須自行對照官方樣卷。</p></section>` : ''}
  </div>`;
}
