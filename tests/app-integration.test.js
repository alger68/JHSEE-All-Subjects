import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const questions = JSON.parse(readFileSync('data/questions.json','utf8'));
const practice = JSON.parse(readFileSync('data/cap-practice.json','utf8'));
const key = 'jhsee.adventure.v1';
beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-17T01:00:00Z'));
  localStorage.clear(); document.body.innerHTML='<main id="app"></main>';
  window.history.replaceState(null,'','#/exam');
  vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
  vi.spyOn(window,'confirm').mockReturnValue(true);
  vi.spyOn(window,'addEventListener');
  vi.stubGlobal('fetch', vi.fn(async (url)=>({ok:true,json:async()=>String(url).includes('cap-practice')?practice:questions})));
});
function disconnect(){ for(const [type,fn] of window.addEventListener.mock.calls)window.removeEventListener(type,fn);vi.clearAllTimers(); }
afterEach(()=>{disconnect();vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();});
async function boot(){await import('../js/app.js'); await vi.advanceTimersByTimeAsync(0);}
function submitExam(){document.querySelector('[data-action="submit-exam"]').click();document.querySelector('[data-action="confirm-submit-exam"]').click();}
async function go(hash){window.location.hash=hash;await vi.advanceTimersByTimeAsync(1);}
it('shows official question images in-site and preserves answers, zoom and deadline across reader modes',async()=>{
  window.history.replaceState(null,'','#/paper/cap115-math');await boot();
  document.querySelector('[data-action="start-paper"]').click();
  expect(document.querySelector('[data-official-question="1"]')).not.toBeNull();
  expect(document.querySelector('iframe')).toBeNull();
  document.querySelector('[data-action="paper-zoom"]').click();
  const reader=document.querySelector('.official-question-material');
  document.querySelector('[data-choice="2"]').click();
  expect(document.querySelector('.official-question-material')).toBe(reader);
  expect(reader.classList.contains('zoomed')).toBe(true);
  const before=JSON.parse(localStorage.getItem(key)).activeExam;
  document.querySelector('[data-mode="whole"]').click();
  expect(document.querySelector('[data-paper-page]').textContent).toContain('2 / 14');
  document.querySelector('[data-action="paper-page-next"]').click();
  expect(document.querySelector('[data-paper-page]').textContent).toContain('3 / 14');
  document.querySelector('[data-mode="question"]').click();
  const after=JSON.parse(localStorage.getItem(key)).activeExam;
  expect(after.startedAt).toBe(before.startedAt);expect(after.answers).toEqual(before.answers);
  expect(after.index).toBe(0);expect(after.paperMode).toBe('question');
  document.querySelector('[data-action="exam-next"]').click();
  expect(document.querySelector('[data-official-question="2"]')).not.toBeNull();
});
it('keeps whole-paper preferences and page after reload, with the selected question intact',async()=>{
  window.history.replaceState(null,'','#/paper/cap115-english');await boot();
  document.querySelector('input[value="whole"]').checked=true;
  document.querySelector('[data-action="start-paper"]').click();
  const select=document.querySelector('[data-paper-page-select]');select.value='12';select.dispatchEvent(new Event('change',{bubbles:true}));
  document.querySelector('[data-choice="1"]').click();
  const startedAt=JSON.parse(localStorage.getItem(key)).activeExam.startedAt;
  disconnect();document.body.innerHTML='<main id="app"></main>';vi.resetModules();vi.setSystemTime(startedAt+1000);await boot();
  expect(document.querySelector('[data-paper-page]').textContent).toContain('12 / 15');
  expect(document.querySelector('[data-choice="1"]').getAttribute('aria-pressed')).toBe('true');
});
it('keeps the same listening audio element while answering, changing question and checking submission',async()=>{
  window.history.replaceState(null,'','#/paper/cap115-listening');await boot();
  document.querySelector('[data-action="start-paper"]').click();
  const audio=document.querySelector('audio');expect(audio).not.toBeNull();
  audio.currentTime=90;
  document.querySelector('[data-choice="1"]').click();
  document.querySelector('[data-action="exam-next"]').click();
  document.querySelector('[data-action="submit-exam"]').click();
  expect(document.querySelector('audio')).toBe(audio);expect(audio.currentTime).toBe(90);
  document.querySelector('[data-action="return-exam"]').click();
  expect(document.querySelector('audio')).toBe(audio);
  submitExam();expect(document.querySelector('audio')).toBeNull();
});
it('stops the old listening audio when replacing an unfinished listening session',async()=>{
  window.history.replaceState(null,'','#/paper/cap115-listening');await boot();
  document.querySelector('[data-action="start-paper"]').click();
  const oldAudio=document.querySelector('audio');Object.defineProperty(oldAudio,'paused',{value:false});
  const pause=vi.spyOn(oldAudio,'pause').mockImplementation(()=>{});
  await go('#/paper/cap115-listening');document.querySelector('[data-action="start-paper"]').click();
  expect(pause).toHaveBeenCalledOnce();expect(document.querySelector('audio')).not.toBe(oldAudio);
});
it('includes original math manual questions and writing prompt before the draft fields',async()=>{
  window.history.replaceState(null,'','#/paper/cap115-math');await boot();
  document.querySelector('[data-action="start-paper"]').click();
  expect(document.querySelectorAll('.official-manual svg')).toHaveLength(2);
  expect(document.querySelector('.official-formula svg')).not.toBeNull();
  submitExam();await go('#/paper/cap115-writing');document.querySelector('[data-action="start-paper"]').click();
  expect(document.querySelector('.official-manual[open] svg')).not.toBeNull();
});
it('loads original result questions only when opened and keeps the writing prompt in archived reports',async()=>{
  window.history.replaceState(null,'','#/paper/cap115-english');await boot();
  document.querySelector('[data-action="start-paper"]').click();submitExam();
  expect(document.querySelectorAll('.report-original svg')).toHaveLength(0);
  const details=document.querySelector('[data-original-number="35"]');details.open=true;details.dispatchEvent(new Event('toggle'));
  expect(details.querySelector('[data-official-question="35"]')).not.toBeNull();
  expect(details.querySelector('.official-shared')).not.toBeNull();
  await go('#/paper/cap115-writing');document.querySelector('[data-action="start-paper"]').click();
  const input=document.querySelector('[data-exam-note="writing"]');input.value='草稿';input.dispatchEvent(new Event('input',{bubbles:true}));submitExam();
  expect(document.querySelector('.official-manual svg')).not.toBeNull();
});
it('keeps manual prompts in the report even when the student answered only on paper',async()=>{
  window.history.replaceState(null,'','#/paper/cap115-math');await boot();
  document.querySelector('[data-action="start-paper"]').click();submitExam();
  expect(document.querySelectorAll('.official-manual svg')).toHaveLength(2);
  expect(document.body.textContent).toContain('未填寫文字草稿');
  await go('#/paper/cap115-writing');document.querySelector('[data-action="start-paper"]').click();submitExam();
  expect(document.querySelectorAll('.official-manual svg')).toHaveLength(1);
});
it('keeps the actual question node and scroll stable while countdown advances',async()=>{
  await boot(); const node=document.querySelector('.question-card'); expect(node).not.toBeNull();
  window.scrollTo.mockClear();
  await vi.advanceTimersByTimeAsync(1000);
  expect(document.querySelector('.question-card')).toBe(node);
  expect(window.scrollTo).not.toHaveBeenCalled();
});
it('submits from the last question and saves a result only once',async()=>{
  await boot();
  const jump=[...document.querySelectorAll('[data-action="exam-go"]')].at(-1); jump.click();
  document.querySelector('[data-action="exam-answer"]').click();
  submitExam();
  await vi.advanceTimersByTimeAsync(1000);
  const state=JSON.parse(localStorage.getItem(key));
  expect(state.lastExamResult.total).toBe(10);
  expect(state.activeExam).toBeNull();
  const total=state.player.totalAnswered;
  await vi.advanceTimersByTimeAsync(2000);
  expect(JSON.parse(localStorage.getItem(key)).player.totalAnswered).toBe(total);
});
it('restores the same answers and deadline after reloading',async()=>{
  await boot(); document.querySelector('[data-action="exam-answer"][data-choice="2"]').click();
  const before=JSON.parse(localStorage.getItem(key)).activeExam;
  disconnect();document.body.innerHTML='<main id="app"></main>';vi.resetModules();
  vi.setSystemTime(new Date('2026-09-17T01:01:05Z'));await boot();
  const after=JSON.parse(localStorage.getItem(key)).activeExam;
  expect(after.id).toBe(before.id);expect(after.startedAt).toBe(before.startedAt);expect(after.answers).toEqual(before.answers);
  expect(document.querySelector('[data-exam-timer]').textContent).toContain('18:55');
  expect(document.querySelector('[data-choice="2"]').getAttribute('aria-pressed')).toBe('true');
});
it('keeps official answers hidden until submission and accepts only three listening choices',async()=>{
  window.history.replaceState(null,'','#/paper/cap115-listening');await boot();
  document.querySelector('[data-action="start-paper"]').click();await vi.advanceTimersByTimeAsync(1);
  expect(document.querySelectorAll('[data-action="exam-answer"]').length).toBe(3);
  expect(document.querySelector('[data-action="practice-hint"]')).toBeNull();
  expect(document.body.textContent).not.toContain('正確答案');
  document.querySelector('[data-choice="2"]').click();document.querySelector('[data-action="exam-uncertain"]').click();
  submitExam();await vi.advanceTimersByTimeAsync(1);
  const state=JSON.parse(localStorage.getItem(key));
  expect(state.lastExamResult).toMatchObject({total:21,correct:1,paperId:'cap115-listening',attemptNumber:1});
  expect(state.wrongQuestions.find(x=>x.questionId==='cap115-listening-1')).toMatchObject({wrongCount:0,uncertainCount:1});
  const select=document.querySelector('[data-wrong-reason="cap115-listening-1"]');select.value='guess';select.dispatchEvent(new Event('change',{bubbles:true}));
  expect(JSON.parse(localStorage.getItem(key)).wrongQuestions.find(x=>x.questionId==='cap115-listening-1').reason).toBe('guess');
  expect(document.body.textContent).toContain('正確答案：C');
});
it('blocks an answer arriving after deadline before the next timer tick',async()=>{
  await boot();vi.setSystemTime(Date.now()+1200000);
  document.querySelector('[data-action="exam-answer"]').click();
  const result=JSON.parse(localStorage.getItem(key)).lastExamResult;
  expect(result.correct).toBe(0);expect(result.items.every(x=>x.choice===undefined)).toBe(true);
});
it('automatically submits when time expires away from the exam page',async()=>{
  await boot();await go('#/exam-center');vi.setSystemTime(Date.now()+1200000);
  await vi.advanceTimersByTimeAsync(1000);
  expect(JSON.parse(localStorage.getItem(key)).activeExam).toBeNull();
  expect(window.location.hash).toBe('#/exam-results');
});
it('preserves math notes and separates manual answers from objective score',async()=>{
  window.history.replaceState(null,'','#/paper/cap115-math');await boot();
  document.querySelector('[data-action="start-paper"]').click();
  const note=document.querySelector('[data-exam-note="math1"]');note.value='我的推導：x = 3';note.dispatchEvent(new Event('input',{bubbles:true}));
  submitExam();
  const result=JSON.parse(localStorage.getItem(key)).lastExamResult;
  expect(result.total).toBe(25);expect(result.notes.math1).toBe('我的推導：x = 3');
  expect(document.body.textContent).toContain('非選／寫作不包含');
});
it('offers a grade and question-type filtered original practice, with material visible',async()=>{
  window.history.replaceState(null,'','#/exam-center');await boot();
  document.querySelector('#practice-subject').value='math';
  document.querySelector('#practice-grade').value='7';
  document.querySelector('#practice-type').value='情境應用';
  document.querySelector('[data-action="start-practice"]').click();
  const session=JSON.parse(localStorage.getItem(key)).activeExam;
  expect(session.questionIds).toHaveLength(2);
  expect(session.questionIds.every(id=>['CAP-P-math-001','CAP-P-math-006'].includes(id))).toBe(true);
  expect(document.querySelector('.passage')).not.toBeNull();
});
it('a correct but uncertain review does not increase the wrong-answer count',async()=>{
  localStorage.setItem(key,JSON.stringify({version:1,wrongQuestions:[{questionId:'cap115-listening-1',mastery:1,wrongCount:2,nextReview:'2026-09-17',lastReviewed:'2026-09-15',resolved:false}]}));
  window.history.replaceState(null,'','#/revenge');await boot();
  document.querySelector('[data-action="start-revenge"]').click();
  document.querySelector('[data-choice="2"]').click();document.querySelector('[data-action="exam-uncertain"]').click();
  submitExam();
  expect(JSON.parse(localStorage.getItem(key)).wrongQuestions[0]).toMatchObject({wrongCount:2,mastery:1,uncertainCount:1});
});
it('records writing as an ungraded saved draft and supports a repeated paper attempt',async()=>{
  window.history.replaceState(null,'','#/paper/cap115-writing');await boot();
  document.querySelector('[data-action="start-paper"]').click();
  const input=document.querySelector('[data-exam-note="writing"]');input.value='今天的寫作練習';input.dispatchEvent(new Event('input',{bubbles:true}));
  submitExam();await vi.advanceTimersByTimeAsync(1);
  expect(JSON.parse(localStorage.getItem(key)).lastExamResult.notes.writing).toBe('今天的寫作練習');
  expect(document.body.textContent).not.toContain('0%');
  await go('#/paper/cap115-writing');document.querySelector('[data-action="start-paper"]').click();
  expect(JSON.parse(localStorage.getItem(key)).activeExam.attemptNumber).toBe(2);
});
it('reviews an official math choice without adding the full paper manual section',async()=>{
  localStorage.setItem(key,JSON.stringify({version:1,wrongQuestions:[{questionId:'cap115-math-1',mastery:0,wrongCount:1,nextReview:'2026-09-17',resolved:false}]}));
  window.history.replaceState(null,'','#/revenge');await boot();
  document.querySelector('[data-action="start-revenge"]').click();
  expect(document.querySelector('[data-exam-note]')).toBeNull();
  expect(document.body.textContent).not.toContain('本倒數包含非選題時間');
  submitExam();
  expect(document.body.textContent).not.toContain('本次保存的草稿');
});
it('gives no answer rewards for an entirely blank paper',async()=>{
  await boot();const before=JSON.parse(localStorage.getItem(key)).player;
  submitExam();
  const after=JSON.parse(localStorage.getItem(key)).player;
  expect(after.exp).toBe(before.exp);expect(after.coins).toBe(before.coins);expect(after.totalAnswered).toBe(before.totalAnswered);
});
it('reopens a saved writing draft after completing a different exam',async()=>{
  window.history.replaceState(null,'','#/paper/cap115-writing');await boot();
  document.querySelector('[data-action="start-paper"]').click();
  const input=document.querySelector('[data-exam-note="writing"]');input.value='不能被下一次測驗覆蓋的作文';input.dispatchEvent(new Event('input',{bubbles:true}));
  submitExam();
  const id=JSON.parse(localStorage.getItem(key)).lastExamResult.sessionId;
  await go('#/paper/cap115-listening');document.querySelector('[data-action="start-paper"]').click();
  submitExam();
  await go('#/exam-center');
  expect(document.querySelector(`a[href="#/exam-results/${id}"]`)).not.toBeNull();
  await go(`#/exam-results/${id}`);
  expect(document.body.textContent).toContain('不能被下一次測驗覆蓋的作文');
});
it('recovers an invalid saved session without deleting player progress',async()=>{
  localStorage.setItem(key,JSON.stringify({version:1,player:{exp:999},activeExam:{id:'broken',questionIds:['missing-question']}}));
  await boot();
  const state=JSON.parse(localStorage.getItem(key));
  expect(state.player.exp).toBe(999);expect(state.activeExam).toBeNull();expect(state.recoveredExam.id).toBe('broken');
  expect(window.location.hash).toBe('#/exam-center');
});
it('opens an in-page submission check without scoring or a browser confirm',async()=>{
  await boot();
  document.querySelector('[data-action="exam-answer"]').click();
  document.querySelector('[data-action="exam-uncertain"]').click();
  document.querySelector('[data-action="submit-exam"]').click();
  expect(window.location.hash).toBe('#/exam-check');
  expect(document.querySelector('[data-submit-summary]').textContent).toContain('未作答 9 題');
  expect(document.querySelector('[data-submit-summary]').textContent).toContain('不確定 1 題');
  expect(window.confirm).not.toHaveBeenCalled();
  expect(JSON.parse(localStorage.getItem(key)).activeExam).not.toBeNull();
  expect(JSON.parse(localStorage.getItem(key)).lastExamResult).toBeUndefined();
  expect(document.body.textContent).not.toContain('正確答案');
});
it('returns from the check to an unanswered question without losing answers',async()=>{
  await boot();document.querySelector('[data-choice="2"]').click();
  const before=JSON.parse(localStorage.getItem(key)).activeExam;
  document.querySelector('[data-action="submit-exam"]').click();
  document.querySelector('[data-action="check-question"][data-index="3"]').click();
  const after=JSON.parse(localStorage.getItem(key)).activeExam;
  expect(window.location.hash).toBe('#/exam');expect(after.index).toBe(3);
  expect(after.id).toBe(before.id);expect(after.startedAt).toBe(before.startedAt);expect(after.answers).toEqual(before.answers);
});
it('keeps counting and submits once when time expires on the submission check',async()=>{
  await boot();document.querySelector('[data-action="submit-exam"]').click();
  await vi.advanceTimersByTimeAsync(1);
  const panel=document.querySelector('[data-submit-summary]');expect(panel).not.toBeNull();
  await vi.advanceTimersByTimeAsync(1000);
  expect(document.querySelector('[data-submit-summary]')).toBe(panel);
  vi.setSystemTime(new Date('2026-09-17T01:20:00Z'));await vi.advanceTimersByTimeAsync(1000);
  expect(window.location.hash).toBe('#/exam-results');
  expect(JSON.parse(localStorage.getItem(key)).examReports).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(2000);
  expect(JSON.parse(localStorage.getItem(key)).examReports).toHaveLength(1);
});
it('restores a writing check after reload and returns to the same saved draft',async()=>{
  window.history.replaceState(null,'','#/paper/cap115-writing');await boot();
  document.querySelector('[data-action="start-paper"]').click();
  const input=document.querySelector('[data-exam-note="writing"]');input.value='保留的草稿';input.dispatchEvent(new Event('input',{bubbles:true}));
  document.querySelector('[data-action="submit-exam"]').click();await vi.advanceTimersByTimeAsync(1);
  const before=JSON.parse(localStorage.getItem(key)).activeExam;
  disconnect();document.body.innerHTML='<main id="app"></main>';vi.resetModules();
  vi.setSystemTime(new Date('2026-09-17T01:01:00Z'));await boot();
  expect(document.querySelector('[data-submit-summary]')).not.toBeNull();
  expect(document.querySelector('[data-exam-timer]').textContent).toContain('49:00');
  expect(document.body.textContent).toContain('已填寫 5 字元');
  document.querySelector('[data-action="return-exam"]').click();
  expect(document.querySelector('[data-exam-note="writing"]').value).toBe('保留的草稿');
  expect(JSON.parse(localStorage.getItem(key)).activeExam.id).toBe(before.id);
  expect(JSON.parse(localStorage.getItem(key)).examReports).toHaveLength(0);
});
it('does not start a new exam when an old check URL is opened after submission',async()=>{
  await boot();submitExam();await go('#/exam-check');
  expect(document.querySelector('[data-action="confirm-submit-exam"]')).toBeNull();
  expect(JSON.parse(localStorage.getItem(key)).activeExam).toBeNull();
  expect(document.body.textContent).toContain('會考與補強中心');
});
it('defaults short practice to explicitly reviewed CAP-oriented questions',async()=>{
  window.history.replaceState(null,'','#/exam-center');await boot();
  expect(document.querySelector('#practice-focus')?.value).toBe('aligned');
  expect(document.body.textContent).toContain('會考導向 30 題');
  expect(document.body.textContent).toContain('基礎補強 55 題');
  document.querySelector('[data-action="start-practice"]').click();
  const session=JSON.parse(localStorage.getItem(key)).activeExam;
  expect(session.questionIds).toHaveLength(10);
  expect(session.questionIds.every(id=>practice.some(q=>q.id===id))).toBe(true);
  expect(session.title).toContain('會考導向');
});
it('allows a separate basic practice without mixing reviewed contextual questions',async()=>{
  window.history.replaceState(null,'','#/exam-center');await boot();
  document.querySelector('#practice-focus').value='basic';
  document.querySelector('[data-action="start-practice"]').click();
  const session=JSON.parse(localStorage.getItem(key)).activeExam;
  expect(session.questionIds.every(id=>questions.some(q=>q.id===id))).toBe(true);
  expect(session.title).toContain('基礎補強');
});
it('updates the eligible count and blocks empty filter combinations without resetting filters',async()=>{
  window.history.replaceState(null,'','#/exam-center');await boot();
  document.querySelector('#practice-focus').value='basic';
  const type=document.querySelector('#practice-type');type.value='資料分析';type.dispatchEvent(new Event('change',{bubbles:true}));
  expect(document.querySelector('[data-practice-matches]').textContent).toContain('0 題');
  expect(document.querySelector('[data-action="start-practice"]').disabled).toBe(true);
  document.querySelector('#practice-focus').value='aligned';document.querySelector('#practice-focus').dispatchEvent(new Event('change',{bubbles:true}));
  expect(document.querySelector('[data-action="start-practice"]').disabled).toBe(false);
  expect(document.querySelector('#practice-type').value).toBe('資料分析');
});
it('can include all original questions with an accurate live count',async()=>{
  window.history.replaceState(null,'','#/exam-center');await boot();
  const focus=document.querySelector('#practice-focus');focus.value='all';focus.dispatchEvent(new Event('change',{bubbles:true}));
  expect(document.querySelector('[data-practice-matches]').textContent).toContain('85 題');
  document.querySelector('[data-action="start-practice"]').click();
  expect(JSON.parse(localStorage.getItem(key)).activeExam.title).toContain('全部原創');
});
