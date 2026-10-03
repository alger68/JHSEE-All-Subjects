import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { skillIdentity } from '../js/core/adaptive-learning.js';
import { createSession } from '../js/core/exam-session.js';
import { questionFingerprint } from '../js/core/question-dedup.js';
import { createQuestionBank } from '../js/core/question-bank.js';
import { levelQuestionPool } from '../js/core/app-model.js';
import { createBattle, answerBattle } from '../js/core/battle.js';
import { orderPracticeChoices } from '../js/core/choice-order.js';

const questions = JSON.parse(readFileSync('data/questions.json','utf8'));
const practice = JSON.parse(readFileSync('data/cap-practice.json','utf8'));
const packManifest = JSON.parse(readFileSync('public/question-packs/manifest.json','utf8'));
const allOriginal=[...questions,...practice,...packManifest.packs.filter(pack=>pack.enabled!==false)
  .flatMap(pack=>JSON.parse(readFileSync(`public/question-packs/${pack.file}`,'utf8')))];
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
function questionMapForTest(id){return [...questions,...practice].find(question=>question.id===id);}
function clickWrongExamChoice(question){
  const correctText=String(question.choices[question.answer]);
  const button=[...document.querySelectorAll('[data-action="exam-answer"]')]
    .find(option=>option.querySelector('span')?.textContent!==correctText);
  expect(button).toBeDefined();button.click();
}
function submitExam(){document.querySelector('[data-action="submit-exam"]').click();document.querySelector('[data-action="confirm-submit-exam"]').click();}
async function go(hash){window.location.hash=hash;await vi.advanceTimersByTimeAsync(1);}
function useFullQuestionBank(){
  vi.stubGlobal('fetch',vi.fn(async url=>({ok:true,json:async()=>{
    const path=String(url);
    if(path.endsWith('/question-packs/manifest.json'))return packManifest;
    if(path.includes('/question-packs/'))return JSON.parse(readFileSync(`public/question-packs/${path.split('/').pop()}`,'utf8'));
    return path.includes('cap-practice')?practice:questions;
  }})));
}

function captureEnglishSpeech(){
  const spoken=[],utterances=[];
  const voices=[{lang:'en-US',name:'Google US English',voiceURI:'google-us'},
    {lang:'en-GB',name:'Google UK English',voiceURI:'google-uk'}];
  vi.stubGlobal('speechSynthesis',{
    getVoices:()=>voices,cancel:()=>{},speak:utterance=>{spoken.push(utterance.text);utterances.push(utterance);},
    addEventListener:()=>{}
  });
  vi.stubGlobal('SpeechSynthesisUtterance',class {constructor(text){this.text=text;}});
  return {spoken,utterances};
}

it('reads the displayed A–D order in an English world battle after choice rotation',async()=>{
  const q=allOriginal.find(q=>q.id==='HP5-EN-012');
  const {spoken,utterances}=captureEnglishSpeech();
  useFullQuestionBank();
  localStorage.setItem(key,JSON.stringify({version:1,activeRun:{kind:'normal',subject:'english',levelId:'english-1',battle:createBattle([orderPracticeChoices(q)])}}));
  window.history.replaceState(null,'','#/battle/english/english-1');
  await boot();
  expect([...document.querySelectorAll('[data-action="answer"] span')].map(x=>x.textContent)).toEqual(['very long','very bright','not wide','very noisy']);
  document.querySelector('[data-action="tts-choices"]').click();
  expect(spoken).toEqual(['Option A. very long Option B. very bright Option C. not wide Option D. very noisy']);
  document.querySelector('[data-action="tts-question"]').click();
  expect(spoken.at(-1)).toBe('What does narrow most likely mean?');
  document.querySelector('[data-action="tts-full"]').click();
  expect(spoken.at(-1)).toBe('The path was narrow, so only one person could walk through at a time. Question. What does narrow most likely mean? Choices. Option A. very long Option B. very bright Option C. not wide Option D. very noisy');
  expect(utterances.at(-1)).toMatchObject({lang:'en-US',rate:1,voice:{name:'Google US English'}});
  const rate=document.querySelector('[data-english-tts-rate]');
  rate.value='0.75';rate.dispatchEvent(new Event('change',{bubbles:true}));
  const voice=document.querySelector('[data-english-tts-voice]');
  voice.value=[...voice.options].find(option=>option.textContent.includes('Google UK English')).value;
  voice.dispatchEvent(new Event('change',{bubbles:true}));
  document.querySelector('[data-action="tts-choices"]').click();
  expect(utterances.at(-1)).toMatchObject({lang:'en-GB',rate:0.75,voice:{name:'Google UK English'}});
  document.querySelector('[data-action="tts-stop"]').click();
});

it('reads the displayed order in an English practice session after choice rotation',async()=>{
  const q=allOriginal.find(q=>q.id==='HP5-EN-012');
  const {spoken}=captureEnglishSpeech();
  useFullQuestionBank();
  localStorage.setItem(key,JSON.stringify({version:1,activeExam:createSession([q],{title:'英文練習',kind:'practice',durationMinutes:20,choiceOrderVersion:2})}));
  await boot();
  expect([...document.querySelectorAll('[data-action="exam-answer"] span')].map(x=>x.textContent)).toEqual(['very long','very bright','not wide','very noisy']);
  document.querySelector('[data-action="tts-choices"]').click();
  expect(spoken).toEqual(['Option A. very long Option B. very bright Option C. not wide Option D. very noisy']);
});

it('keeps an older English practice session in its saved A–D order when reading',async()=>{
  const q=allOriginal.find(q=>q.id==='HP5-EN-012');
  const {spoken}=captureEnglishSpeech();
  useFullQuestionBank();
  localStorage.setItem(key,JSON.stringify({version:1,activeExam:createSession([q],{title:'舊版英文練習',kind:'practice',durationMinutes:20})}));
  await boot();
  expect([...document.querySelectorAll('[data-action="exam-answer"] span')].map(x=>x.textContent)).toEqual(['not wide','very noisy','very long','very bright']);
  document.querySelector('[data-action="tts-choices"]').click();
  expect(spoken).toEqual(['Option A. not wide Option B. very noisy Option C. very long Option D. very bright']);
});

it('offers a neutral first step on the lobby and starts a five-subject diagnosis',async()=>{
  window.history.replaceState(null,'','#/');await boot();
  expect(document.body.textContent).not.toContain('宥廷');
  expect(document.querySelector('[data-action="start-diagnostic"]')).not.toBeNull();
  document.querySelector('[data-action="start-diagnostic"]').click();
  await vi.advanceTimersByTimeAsync(1);
  const session=JSON.parse(localStorage.getItem(key)).activeExam;
  expect(session.kind).toBe('diagnostic');
  expect(session.questionIds).toHaveLength(25);
});

it('loads the full production bundle in three requests and resumes an existing supplemental question',async()=>{
  const packedQuestion=allOriginal.find(q=>q.id==='HP6-CH-001');
  expect(packedQuestion).toBeDefined();
  const session=createSession([packedQuestion],{title:'已保存的補充題練習',kind:'practice',durationMinutes:20,choiceOrderVersion:2});
  localStorage.setItem(key,JSON.stringify({version:1,activeExam:session}));
  vi.stubEnv('VITE_SUPPLEMENTAL_BUNDLE_URL','bundle-test.json');
  const packs=packManifest.packs.filter(pack=>pack.enabled!==false);
  const bundled={version:1,packs,questions:packs.flatMap(pack=>
    JSON.parse(readFileSync(`public/question-packs/${pack.file}`,'utf8')).map(q=>({
      ...q,packId:pack.id,packVersion:pack.version,sourceKind:'local-pack'
    })))};
  const requests=[];
  vi.stubGlobal('fetch',async url=>{
    requests.push(String(url));
    return {ok:true,json:async()=>String(url).includes('bundle-test')?bundled:
      String(url).includes('cap-practice')?practice:questions};
  });
  try{
    await boot();
    expect(document.body.textContent).toContain(packedQuestion.question);
    const saved=JSON.parse(localStorage.getItem(key));
    expect(saved.activeExam.questionIds).toEqual([packedQuestion.id]);
    expect(saved.recoveredExam).toBeUndefined();
    expect(requests).toHaveLength(3);
    expect(requests.some(url=>url.endsWith('/question-packs/bundle-test.json'))).toBe(true);
    await go('#/exam-center');
    expect(document.body.textContent).toContain('692 題原創練習');
  }finally{vi.unstubAllEnvs();}
});

it('starts the current mock repair task from the seven-day plan and records it only on submission',async()=>{
  localStorage.setItem(key,JSON.stringify({version:1,mockExamRecords:[{
    id:'student-mock',date:'2026-09-17',title:'我的模考',
    grades:{chinese:'A',english:'C',math:'A',science:'A',social:'A'},
    errors:{english:{wrong:8,topics:['閱讀理解']}}
  }],repairPlan:{mockId:'student-mock',startedOn:'2026-09-17',progress:{}}}));
  window.history.replaceState(null,'','#/exam-center');await boot();
  const task=document.querySelector('[data-action="start-repair-task"][data-day="0"][data-task="0"]');
  expect(task).not.toBeNull();
  task.click();
  const started=JSON.parse(localStorage.getItem(key));
  expect(started.repairPlan.progress).toEqual({});
  expect(started.activeExam.repairTask).toMatchObject({mockId:'student-mock',subject:'english',date:'2026-09-17'});
  expect(started.activeExam.questionIds).toHaveLength(10);
  expect(started.activeExam.questionIds.some(id=>{
    const q=practice.find(question=>question.id===id);
    return q?.chapter==='閱讀理解'||q?.domain==='閱讀理解';
  })).toBe(true);
  document.querySelector('[data-action="exam-answer"]').click();
  submitExam();
  const after=JSON.parse(localStorage.getItem(key));
  expect(after.repairPlan.progress['2026-09-17:english']).toBe(1);
  await go('#/exam-center');
  expect(document.querySelector('[data-action="start-repair-task"][data-day="0"][data-task="0"]').textContent).toContain('1 / 10');
  disconnect();document.body.innerHTML='<main id="app"></main>';vi.resetModules();await boot();
  expect(document.body.textContent).toContain('1 / 10');
});

it('uses an honest same-subject fallback when a mock topic has no mapped questions',async()=>{
  localStorage.setItem(key,JSON.stringify({version:1,mockExamRecords:[{
    id:'unknown-topic',date:'2026-09-17',title:'模考',
    grades:{chinese:'A',english:'C',math:'A',science:'A',social:'A'},
    errors:{english:{wrong:8,topics:['不存在的星球語法']}}
  }],repairPlan:{mockId:'unknown-topic',startedOn:'2026-09-17',progress:{}}}));
  window.history.replaceState(null,'','#/exam-center');await boot();
  expect(document.querySelector('.repair-plan').textContent).toContain('同科題');
  document.querySelector('[data-action="start-repair-task"][data-day="0"][data-task="0"]').click();
  const ids=JSON.parse(localStorage.getItem(key)).activeExam.questionIds;
  expect(ids).toHaveLength(10);
  expect(ids.every(id=>practice.find(q=>q.id===id)?.subject==='english')).toBe(true);
});

it('keeps a saved repair plan date and allows a fresh week after it expires',async()=>{
  localStorage.setItem(key,JSON.stringify({version:1,mockExamRecords:[{
    id:'old-mock',date:'2026-09-01',title:'舊模考',
    grades:{chinese:'A',english:'C',math:'A',science:'A',social:'A'},errors:{}
  }],repairPlan:{mockId:'old-mock',startedOn:'2026-09-01',progress:{'2026-09-01:english':5}}}));
  window.history.replaceState(null,'','#/exam-center');await boot();
  expect(document.querySelector('.repair-plan').textContent).toContain('2026-09-01');
  document.querySelector('[data-action="restart-repair-plan"]').click();
  const saved=JSON.parse(localStorage.getItem(key));
  expect(saved.repairPlan.startedOn).toBe('2026-09-17');
  expect(saved.repairPlan.progress).toEqual({});
  expect(document.querySelector('.repair-plan').textContent).toContain('2026-09-17');
});

it('keeps completed repair work when the learner cancels a plan restart',async()=>{
  localStorage.setItem(key,JSON.stringify({version:1,mockExamRecords:[{
    id:'m1',date:'2026-09-01',title:'模考',
    grades:{chinese:'A',english:'C',math:'A',science:'A',social:'A'},errors:{}
  }],repairPlan:{mockId:'m1',startedOn:'2026-09-01',progress:{'2026-09-01:english':5}}}));
  window.history.replaceState(null,'','#/exam-center');await boot();
  window.confirm.mockReturnValueOnce(false);
  document.querySelector('[data-action="restart-repair-plan"]').click();
  expect(JSON.parse(localStorage.getItem(key)).repairPlan).toMatchObject({
    startedOn:'2026-09-01',progress:{'2026-09-01:english':5}
  });
});

it('uses only the learner mock for study weighting and returns to a neutral start after deleting it',async()=>{
  localStorage.setItem(key,JSON.stringify({version:1,levelProgress:{'social-1':{cleared:true}},mockExamRecords:[{
    id:'own-mock',date:'2026-09-17',title:'我的模考',
    grades:{chinese:'A',english:'A',math:'A',science:'A',social:'C'},errors:{}
  }]}));
  window.history.replaceState(null,'','#/exam-center');await boot();
  let state=JSON.parse(localStorage.getItem(key));
  expect(state.adaptiveSubjectWeights.social).toBeGreaterThan(state.adaptiveSubjectWeights.english);
  expect(document.body.textContent).not.toContain('宥廷');
  document.querySelector('[data-action="delete-mock-exam"]').click();
  state=JSON.parse(localStorage.getItem(key));
  expect(state.adaptiveSubjectWeights).toMatchObject({chinese:20,english:20,math:20,science:20,social:20});
  expect(state.levelProgress['social-1'].cleared).toBe(true);
});

it('starts a current seven-day plan for a pre-upgrade mock without one',async()=>{
  localStorage.setItem(key,JSON.stringify({version:1,mockExamRecords:[{
    id:'legacy-mock',date:'2026-09-01',title:'以前的模考',
    grades:{chinese:'A',english:'C',math:'A',science:'A',social:'A'},errors:{}
  }]}));
  window.history.replaceState(null,'','#/');await boot();
  expect(JSON.parse(localStorage.getItem(key)).repairPlan).toMatchObject({
    mockId:'legacy-mock',startedOn:'2026-09-17',progress:{}
  });
  expect(document.querySelector('[data-action="start-today-practice"]')).not.toBeNull();
  await go('#/exam-center');
  expect(document.querySelector('.repair-plan').textContent).toContain('Day 1・2026-09-17');
});

it('persists a migrated repair plan after importing an older learner backup',async()=>{
  window.history.replaceState(null,'','#/profile');await boot();
  const backup={meta:{format:'jhsee-backup-v1',version:1,exportedAt:'2026-09-01T00:00:00Z'},state:{
    version:1,mockExamRecords:[{
      id:'imported-mock',date:'2026-09-01',title:'以前的模考',
      grades:{chinese:'A',english:'C',math:'A',science:'A',social:'A'},errors:{}
    }]
  }};
  const input=document.querySelector('#backup-file-input');
  Object.defineProperty(input,'files',{configurable:true,value:[{text:async()=>JSON.stringify(backup)}]});
  input.dispatchEvent(new Event('change',{bubbles:true}));
  await vi.advanceTimersByTimeAsync(1);
  expect(JSON.parse(localStorage.getItem(key)).repairPlan).toMatchObject({
    mockId:'imported-mock',startedOn:'2026-09-17'
  });
});

it('keeps seven-day answers when editing the current mock title',async()=>{
  localStorage.setItem(key,JSON.stringify({version:1,mockExamRecords:[{
    id:'edited-mock',date:'2026-09-17',title:'模考',
    grades:{chinese:'A',english:'C',math:'A',science:'A',social:'A'},errors:{}
  }],repairPlan:{mockId:'edited-mock',startedOn:'2026-09-17',progress:{'2026-09-17:english':5}}}));
  window.history.replaceState(null,'','#/exam-center');await boot();
  document.querySelector('#mock-title').value='更正後的模考';
  document.querySelector('[data-action="save-mock-exam"]').click();
  expect(JSON.parse(localStorage.getItem(key)).repairPlan).toMatchObject({
    mockId:'edited-mock',startedOn:'2026-09-17',progress:{'2026-09-17:english':5}
  });
});

it('does not recommend resolved or unavailable old wrong answers as todays next step',async()=>{
  localStorage.setItem(key,JSON.stringify({version:1,wrongQuestions:[
    {questionId:'CHI-WORD-001',mastery:2,wrongCount:1,nextReview:'2026-09-01',resolved:true},
    {questionId:'missing-old-id',mastery:0,wrongCount:1,nextReview:'2026-09-01',resolved:false}
  ]}));
  window.history.replaceState(null,'','#/');await boot();
  expect(document.querySelector('[data-action="start-diagnostic"]')).not.toBeNull();
  expect(document.querySelector('.today-study-main').textContent).not.toContain('到期錯題');
});

it('starts each world level with its matching adventure and CAP-oriented units',async()=>{
  useFullQuestionBank();
  window.history.replaceState(null,'','#/battle/english/english-2');await boot();
  let run=JSON.parse(localStorage.getItem(key)).activeRun;
  expect(run.battle.questions).toHaveLength(10);
  expect(run.battle.questions.every(question=>['Grammar Ridge','基本文法','克漏字'].includes(question.chapter))).toBe(true);
  expect(document.querySelector('.enemy-name').textContent).toContain('Grammar Ridge怪物');
  await go('#/battle/english/english-3');
  run=JSON.parse(localStorage.getItem(key)).activeRun;
  expect(run.battle.questions.every(question=>['Reading Sky','閱讀理解','圖表與生活情境'].includes(question.chapter))).toBe(true);
  expect(document.querySelector('.enemy-name').textContent).toContain('Reading Sky怪物');
});
it('keeps a cleared level unlocked after an unsuccessful replay',async()=>{
  window.history.replaceState(null,'','#/battle/english/english-1');
  localStorage.setItem(key,JSON.stringify({version:1,levelProgress:{'english-1':{cleared:true,stars:2}}}));
  await boot();
  for(let index=0;index<5;index++){
    const run=JSON.parse(localStorage.getItem(key)).activeRun;
    const question=run.battle.questions[run.battle.index];
    document.querySelector(`[data-action="answer"][data-choice="${(question.answer+1)%question.choices.length}"]`).click();
    document.querySelector('[data-action="next"]').click();
  }
  const saved=JSON.parse(localStorage.getItem(key));
  expect(saved.levelProgress['english-1']).toMatchObject({cleared:true,stars:2});
  await go('#/world/english');
  expect(document.querySelector('a[href="#/battle/english/english-2"]')).not.toBeNull();
});
it('unlocks level 2 after a level 1 win in each subject and preserves it after reload',async()=>{
  useFullQuestionBank();
  window.history.replaceState(null,'','#/world/chinese');await boot();
  for(const subject of ['chinese','english','math','science','social']){
    await go(`#/battle/${subject}/${subject}-1`);
    const total=JSON.parse(localStorage.getItem(key)).activeRun.battle.questions.length;
    for(let index=0;index<total;index++){
      const run=JSON.parse(localStorage.getItem(key)).activeRun;
      const answer=run.battle.questions[run.battle.index].answer;
      document.querySelector(`[data-action="answer"][data-choice="${answer}"]`).click();
      document.querySelector('[data-action="next"]').click();
    }
    expect(JSON.parse(localStorage.getItem(key)).levelProgress[`${subject}-1`].cleared).toBe(true);
    await go(`#/world/${subject}`);
    expect(document.querySelector(`a[href="#/battle/${subject}/${subject}-2"]`)).not.toBeNull();
  }
  disconnect();document.body.innerHTML='<main id="app"></main>';vi.resetModules();await boot();
  for(const subject of ['chinese','english','math','science','social']){
    await go(`#/world/${subject}`);
    expect(document.querySelector(`a[href="#/battle/${subject}/${subject}-2"]`)).not.toBeNull();
  }
});
it('uses ten fresh world questions, updates visible progress and offers another fresh replay',async()=>{
  useFullQuestionBank();
  const pool=levelQuestionPool(createQuestionBank(allOriginal),'english',1);
  const previouslyAnswered=pool.slice(0,10).map(q=>({questionId:q.id}));
  localStorage.setItem(key,JSON.stringify({version:1,answerHistory:previouslyAnswered}));
  window.history.replaceState(null,'','#/world/english');await boot();
  expect(document.querySelector('#adventure-round-size').value).toBe('10');
  expect(document.querySelector('a[href="#/battle/english/english-1"]').textContent).toContain('題庫 33 題・已練 10 題');
  await go('#/battle/english/english-1');
  const first=JSON.parse(localStorage.getItem(key)).activeRun.battle.questions;
  expect(first).toHaveLength(10);
  expect(first.every(q=>!previouslyAnswered.some(row=>row.questionId===q.id))).toBe(true);
  for(let i=0;i<first.length;i++){
    const run=JSON.parse(localStorage.getItem(key)).activeRun;
    document.querySelector(`[data-action="answer"][data-choice="${run.battle.questions[run.battle.index].answer}"]`).click();
    document.querySelector('[data-action="next"]').click();
  }
  await go('#/world/english');
  expect(document.querySelector('a[href="#/battle/english/english-1"]').textContent).toContain('已練 20 題');
  expect(document.querySelector('a[href="#/battle/english/english-2"]')).not.toBeNull();
  await go('#/battle/english/english-1');
  const second=JSON.parse(localStorage.getItem(key)).activeRun.battle.questions;
  expect(second).toHaveLength(10);
  expect(second.every(q=>!first.some(old=>old.id===q.id))).toBe(true);
});

it('saves the five-question preference while preserving an old in-progress round',async()=>{
  const deck=questions.filter(q=>q.subject==='english').slice(0,5);
  const battle=answerBattle(createBattle(deck),deck[0],deck[0].answer);
  localStorage.setItem(key,JSON.stringify({version:1,activeRun:{kind:'normal',subject:'english',levelId:'english-1',battle}}));
  window.history.replaceState(null,'','#/world/english');await boot();
  expect(document.body.textContent).toContain('尚未完成的回合有 5 題');
  const select=document.querySelector('#adventure-round-size');select.value='5';
  select.dispatchEvent(new Event('change',{bubbles:true}));
  disconnect();document.body.innerHTML='<main id="app"></main>';vi.resetModules();await boot();
  expect(document.querySelector('#adventure-round-size').value).toBe('5');
  await go('#/battle/english/english-1');
  const resumed=JSON.parse(localStorage.getItem(key)).activeRun.battle;
  expect(resumed.questions).toEqual(deck);
  expect(resumed.index).toBe(1);
  expect(resumed.answers).toHaveLength(1);
  await go('#/battle/math/math-1');
  expect(JSON.parse(localStorage.getItem(key)).activeRun.battle.questions).toHaveLength(5);
});
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
it('puts official review needs first and starts an honest same-subject five-question repair',async()=>{
  window.history.replaceState(null,'','#/paper/cap115-listening');await boot();
  document.querySelector('[data-action="start-paper"]').click();
  document.querySelector('[data-choice="2"]').click();
  submitExam();await vi.advanceTimersByTimeAsync(1);
  const report=document.querySelector('.review-list');
  expect(report.firstElementChild.textContent).toContain('第 2 題');
  expect(report.textContent).toContain('本站尚未提供逐題解析');
  expect(report.textContent).toContain('先在原題找出判斷依據');
  const original=report.firstElementChild.querySelector('.report-original');
  original.open=true;original.dispatchEvent(new Event('toggle',{bubbles:true}));
  expect(original.querySelector('[data-official-question="2"]')).not.toBeNull();
  const repair=report.querySelector('[data-action="start-official-repair"]');
  expect(repair.dataset.subject).toBe('english');
  repair.click();
  const session=JSON.parse(localStorage.getItem(key)).activeExam;
  expect(session.kind).toBe('practice');
  expect(session.questionIds).toHaveLength(5);
  expect(session.questionIds.every(id=>practice.find(q=>q.id===id)?.subject==='english')).toBe(true);
});
it('earns the daily chest after an ordinary practice round without review backlog or boss',async()=>{
  localStorage.setItem(key,JSON.stringify({version:1,dailyQuest:{schemaVersion:2,date:'2026-09-17',answered:10,correct:5,rounds:0,reviewTarget:0,subjectCounts:{math:5,english:3,science:2},revenge:0,boss:0,streak:1,lastQualifiedDate:'2026-09-17',chestClaimed:false}}));
  window.history.replaceState(null,'','#/exam-center');await boot();
  document.querySelector('[data-action="start-practice"]').click();
  document.querySelector('[data-action="exam-answer"]').click();
  submitExam();await go('#/');
  expect(document.querySelector('.quest-card').textContent).toContain('4 / 5');
  await go('#/exam-center');
  document.querySelector('[data-action="start-practice"]').click();
  for(let index=0;index<5;index++){
    document.querySelector('[data-action="exam-answer"]').click();
    if(index<4)document.querySelector('[data-action="exam-next"]').click();
  }
  submitExam();await go('#/');
  expect(document.querySelector('.quest-card').textContent).toContain('5 / 5');
  document.querySelector('[data-action="claim-chest"]').click();
  const saved=JSON.parse(localStorage.getItem(key));
  expect(saved.dailyQuest.chestClaimed).toBe(true);
  expect(saved.player.exp).toBeGreaterThanOrEqual(150);
});
it('keeps a legacy in-progress original exam in its original answer order after an upgrade',async()=>{
  const q=practice.find(item=>item.subject==='math');
  const session=createSession([q],{title:'舊測驗',kind:'practice',durationMinutes:20,startedAt:Date.now()});
  localStorage.setItem(key,JSON.stringify({version:1,activeExam:session}));
  await boot();
  const originalChoice=q.choices[q.answer];
  expect(document.querySelector(`[data-action="exam-answer"][data-choice="${q.answer}"]`).textContent).toContain(originalChoice);
  document.querySelector(`[data-action="exam-answer"][data-choice="${q.answer}"]`).click();
  submitExam();
  expect(JSON.parse(localStorage.getItem(key)).lastExamResult.correct).toBe(1);
});
it('uses a stable balanced option order in new original practice and preserves it after reload',async()=>{
  window.history.replaceState(null,'','#/exam-center');await boot();
  document.querySelector('#practice-subject').value='math';
  document.querySelector('[data-action="start-practice"]').click();
  const before=JSON.parse(localStorage.getItem(key)).activeExam;
  expect(before.choiceOrderVersion).toBe(2);
  const q=allOriginal.find(item=>item.id===before.questionIds[0]);
  const first=document.querySelectorAll('[data-action="exam-answer"]');
  const answerIndex=[...first].findIndex(button=>button.textContent.includes(q.choices[q.answer]));
  expect(answerIndex).toBeGreaterThanOrEqual(0);
  disconnect();vi.setSystemTime(before.startedAt+1000);document.body.innerHTML='<main id="app"></main>';vi.resetModules();await boot();
  expect(document.querySelectorAll('[data-action="exam-answer"]')[answerIndex].textContent).toContain(q.choices[q.answer]);
  document.querySelectorAll('[data-action="exam-answer"]')[answerIndex].click();
  submitExam();
  const after=JSON.parse(localStorage.getItem(key)).lastExamResult;
  expect(after.correct).toBe(1);
  expect(after.items[0].answer).toBe(answerIndex);
  expect(document.querySelector('.review-list').textContent).toContain(q.choices[q.answer]);
});
it('does not add untouched official questions to the wrong-question queue',async()=>{
  window.history.replaceState(null,'','#/paper/cap115-listening');await boot();
  document.querySelector('[data-action="start-paper"]').click();
  document.querySelector('[data-choice="2"]').click();
  submitExam();
  const saved=JSON.parse(localStorage.getItem(key));
  expect(saved.lastExamResult.items.filter(item=>item.choice===undefined)).toHaveLength(20);
  expect(saved.wrongQuestions).toHaveLength(0);
  expect(saved.dailyQuest.rounds).toBe(0);
  expect(document.body.textContent).toContain('20 題未作答');
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
  const expected=practice.filter(q=>q.subject==='math'&&q.grade<=7&&q.questionType==='情境應用').map(q=>q.id);
  expect(session.questionIds).toHaveLength(expected.length);
  expect(session.questionIds.every(id=>expected.includes(id))).toBe(true);
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
  expect(document.body.textContent).toContain('會考導向 150 題');
  expect(document.body.textContent).toContain('基礎補強 72 題');
  document.querySelector('[data-action="start-practice"]').click();
  const session=JSON.parse(localStorage.getItem(key)).activeExam;
  expect(session.questionIds).toHaveLength(10);
  expect(session.questionIds.every(id=>practice.some(q=>q.id===id))).toBe(true);
  expect(session.title).toContain('會考導向');
});
it('starts the default practice with weak-point weighting but keeps all five subjects represented',async()=>{
  window.history.replaceState(null,'','#/exam-center');await boot();
  document.querySelector('[data-action="start-practice"]').click();
  const ids=JSON.parse(localStorage.getItem(key)).activeExam.questionIds;
  const all=[...questions,...practice];
  const subjects=ids.map(id=>all.find(q=>q.id===id)?.subject);
  const counts=Object.fromEntries(['english','science','math','social','chinese'].map(subject=>[
    subject,subjects.filter(value=>value===subject).length
  ]));
  expect(ids).toHaveLength(10);
  expect(new Set(ids).size).toBe(10);
  expect(counts).toEqual({english:2,science:2,math:2,social:2,chinese:2});
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

it('starts one continuous revenge session for all wrong questions',async()=>{
  localStorage.setItem(key,JSON.stringify({version:1,wrongQuestions:[
    {questionId:'CHI-WORD-001',mastery:0,wrongCount:1,nextReview:'2026-09-17',resolved:false},
    {questionId:'CHI-WORD-002',mastery:1,wrongCount:2,nextReview:'2026-09-18',resolved:false}
  ]}));
  window.history.replaceState(null,'','#/revenge');await boot();
  const start=document.querySelector('[data-action="start-revenge-session"]');
  expect(start).not.toBeNull();expect(start.textContent).toContain('2');
  start.click();
  const session=JSON.parse(localStorage.getItem(key)).activeExam;
  expect(session.kind).toBe('review');expect(session.questionIds).toEqual(['CHI-WORD-001','CHI-WORD-002']);
  expect(document.querySelectorAll('[data-action="exam-go"]')).toHaveLength(2);
  expect(document.querySelector('[data-exam-progress]').textContent).toContain('0 / 2');
});

it('keeps a selected revenge answer visible until the learner chooses next',async()=>{
  localStorage.setItem(key,JSON.stringify({version:1,wrongQuestions:[
    {questionId:'CHI-WORD-001',mastery:0,wrongCount:1,nextReview:'2026-09-17',resolved:false},
    {questionId:'CHI-WORD-002',mastery:1,wrongCount:2,nextReview:'2026-09-18',resolved:false}
  ]}));
  window.history.replaceState(null,'','#/revenge');await boot();
  document.querySelector('[data-action="start-revenge-session"]').click();
  document.querySelector('[data-action="exam-answer"][data-choice="0"]').click();
  const session=JSON.parse(localStorage.getItem(key)).activeExam;
  expect(session.index).toBe(0);
  expect(session.answers['CHI-WORD-001']).toBe(0);
  expect(document.querySelector('[data-choice="0"]').getAttribute('aria-pressed')).toBe('true');
  expect(document.querySelector('[data-exam-progress]').textContent).toContain('1 / 2');
  document.querySelector('[data-action="exam-next"]').click();
  expect(JSON.parse(localStorage.getItem(key)).activeExam.index).toBe(1);
});

it('does not create blank or unclickable revenge entries for stale question ids',async()=>{
  localStorage.setItem(key,JSON.stringify({version:1,wrongQuestions:[
    {questionId:'CHI-WORD-001',mastery:0,wrongCount:1,nextReview:'2026-09-17',resolved:false},
    {questionId:'old-question-2',mastery:0,wrongCount:1,nextReview:'2026-09-17',resolved:false},
    {questionId:'old-question-3',mastery:0,wrongCount:1,nextReview:'2026-09-17',resolved:false}
  ]}));
  window.history.replaceState(null,'','#/revenge');await boot();
  expect(document.querySelector('[data-action="start-revenge-session"]').textContent).toContain('1');
  expect(document.querySelectorAll('[data-action="start-revenge"]')).toHaveLength(1);
  expect(document.body.textContent).toContain('2 筆題目資料目前無法載入');
  expect(document.querySelectorAll('.review-list article h3')).toHaveLength(3);
  expect([...document.querySelectorAll('.review-list article h3')].slice(1).every(node=>node.textContent.trim())).toBe(true);
});
it('can include all original questions with an accurate live count',async()=>{
  window.history.replaceState(null,'','#/exam-center');await boot();
  const focus=document.querySelector('#practice-focus');focus.value='all';focus.dispatchEvent(new Event('change',{bubbles:true}));
  expect(document.querySelector('[data-practice-matches]').textContent).toContain('222 題');
  document.querySelector('[data-action="start-practice"]').click();
  expect(JSON.parse(localStorage.getItem(key)).activeExam.title).toContain('全部原創');
});



function reviewVariantPair(){
  const groups=new Map();
  for(const question of practice){
    const key=skillIdentity(question).key;
    const list=groups.get(key)??[];
    list.push(question);groups.set(key,list);
  }
  const group=[...groups.values()].find(list=>list.length>=3);
  if(!group)throw new Error('test fixture needs a skill with at least 3 local questions');
  return group.slice(0,3);
}

it('uses the original wrong question exactly once, then switches to a same-skill variant',async()=>{
  const [anchor,variant]=reviewVariantPair();
  localStorage.setItem(key,JSON.stringify({
    version:1,
    wrongQuestions:[{questionId:anchor.id,mastery:0,wrongCount:1,nextReview:'2026-09-17',resolved:false}]
  }));
  window.history.replaceState(null,'','#/revenge');await boot();

  document.querySelector(`[data-action="start-revenge"][data-id="${anchor.id}"]`).click();
  await vi.advanceTimersByTimeAsync(1);
  let session=JSON.parse(localStorage.getItem(key)).activeExam;
  expect(session.questionIds).toEqual([anchor.id]);
  document.querySelector(`[data-action="exam-answer"][data-choice="${anchor.answer}"]`).click();
  submitExam();

  let saved=JSON.parse(localStorage.getItem(key)).wrongQuestions.find(item=>item.questionId===anchor.id);
  expect(saved).toMatchObject({originalReviewCount:1,reviewStage:'same-skill',resolved:false});

  await go('#/revenge');
  document.querySelector(`[data-action="start-revenge"][data-id="${anchor.id}"]`).click();
  await vi.advanceTimersByTimeAsync(1);
  session=JSON.parse(localStorage.getItem(key)).activeExam;
  expect(session.questionIds).toHaveLength(1);
  expect(session.questionIds[0]).not.toBe(anchor.id);
  expect(skillIdentity(questionMapForTest(session.questionIds[0])).key).toBe(skillIdentity(anchor).key);
  expect(session.questionIds).toContain(variant.id);
});

it('switches away from the anchor after one review even when the anchor answer was wrong',async()=>{
  const [anchor]=reviewVariantPair();
  localStorage.setItem(key,JSON.stringify({
    version:1,
    wrongQuestions:[{questionId:anchor.id,mastery:0,wrongCount:1,nextReview:'2026-09-17',resolved:false}]
  }));
  window.history.replaceState(null,'','#/revenge');await boot();

  document.querySelector(`[data-action="start-revenge"][data-id="${anchor.id}"]`).click();
  await vi.advanceTimersByTimeAsync(1);
  clickWrongExamChoice(anchor);
  submitExam();

  const saved=JSON.parse(localStorage.getItem(key)).wrongQuestions.find(item=>item.questionId===anchor.id);
  expect(saved).toMatchObject({originalReviewCount:1,reviewStage:'same-skill',wrongCount:2});

  await go('#/revenge');
  document.querySelector(`[data-action="start-revenge"][data-id="${anchor.id}"]`).click();
  await vi.advanceTimersByTimeAsync(1);
  expect(JSON.parse(localStorage.getItem(key)).activeExam.questionIds).not.toContain(anchor.id);
});

it('does not reuse one variant for multiple review items in a continuous review session',async()=>{
  const [anchor1,anchor2,onlyVariant]=reviewVariantPair();
  const first={questionId:anchor1.id,mastery:0,wrongCount:1,nextReview:'2026-09-17',resolved:false,originalReviewCount:1,reviewStage:'same-skill',...skillIdentity(anchor1),difficulty:anchor1.difficulty,anchorFingerprint:questionFingerprint(anchor1),variantHistory:[],passedFingerprints:[]};
  const second={questionId:anchor2.id,mastery:0,wrongCount:1,nextReview:'2026-09-17',resolved:false,originalReviewCount:1,reviewStage:'same-skill',...skillIdentity(anchor2),difficulty:anchor2.difficulty,anchorFingerprint:questionFingerprint(anchor2),variantHistory:[],passedFingerprints:[]};
  localStorage.setItem(key,JSON.stringify({version:1,wrongQuestions:[first,second]}));
  window.history.replaceState(null,'','#/revenge');await boot();
  document.querySelector('[data-action="start-revenge-session"]').click();
  await vi.advanceTimersByTimeAsync(1);
  const session=JSON.parse(localStorage.getItem(key)).activeExam;
  expect(new Set(session.questionIds).size).toBe(session.questionIds.length);
  expect(session.questionIds).not.toContain(anchor1.id);
  expect(session.questionIds).not.toContain(anchor2.id);
  expect(session.questionIds.filter(id=>id===onlyVariant.id)).toHaveLength(1);
});

it('does not advance transfer evidence for a correct but uncertain review answer',async()=>{
  const [anchor]=reviewVariantPair();
  const identity=skillIdentity(anchor);
  localStorage.setItem(key,JSON.stringify({version:1,wrongQuestions:[{
    questionId:anchor.id,mastery:0,wrongCount:1,nextReview:'2026-09-17',resolved:false,
    originalReviewCount:1,reviewStage:'same-skill',...identity,difficulty:anchor.difficulty,
    anchorFingerprint:questionFingerprint(anchor),variantHistory:[],passedFingerprints:[questionFingerprint(anchor)]
  }]}));
  window.history.replaceState(null,'','#/revenge');await boot();
  document.querySelector(`[data-action="start-revenge"][data-id="${anchor.id}"]`).click();
  await vi.advanceTimersByTimeAsync(1);
  const session=JSON.parse(localStorage.getItem(key)).activeExam;
  const selected=questionMapForTest(session.questionIds[0]);
  document.querySelector(`[data-action="exam-answer"][data-choice="${selected.answer}"]`).click();
  document.querySelector('[data-action="exam-uncertain"]').click();
  submitExam();
  const saved=JSON.parse(localStorage.getItem(key)).wrongQuestions.find(item=>item.questionId===anchor.id);
  expect(saved.reviewStage).toBe('same-skill');
  expect(saved.passedFingerprints).toEqual([questionFingerprint(anchor)]);
});

it('starts AI weakness validation from a completed report and stores generated questions',async()=>{
  window.history.replaceState(null,'','#/exam-center');
  fetch.mockImplementation(async (url,options={})=>{
    if(String(url).includes('/api/generate-question')){
      const {brief}=JSON.parse(options.body);
      const generated={
        id:'ai-remediation-1',
        subject:brief.subject,
        domain:brief.domain,
        questionType:brief.subSkill||'推論題',
        competency:brief.coreSkill,
        difficulty:brief.targetDifficulty,
        passage:'新的驗收情境。',
        question:'這是一題新的弱點驗收題？',
        choices:['A','B','C','D'],
        answer:1,
        explanation:'驗收解析',
        hint1:'提示一',
        hint2:'提示二',
        errorTags:['錯因A','錯因B','錯因C','錯因D'],
        source:'ai_generated',
        chapter:brief.domain,
        topic:brief.coreSkill,
        grade:9,
        tags:['ai-generated','remediation'],
        examAligned:true,
        examProfile:{domain:brief.domain,type:brief.subSkill||'推論題',competency:brief.coreSkill},
        aiGenerated:true,
        aiPracticeMode:brief.practiceMode
      };
      return new Response(JSON.stringify({questions:[generated]}),{status:200,headers:{'content-type':'application/json'}});
    }
    return {ok:true,json:async()=>String(url).includes('cap-practice')?practice:questions};
  });
  await boot();
  document.querySelector('[data-action="start-practice"]').click();
  const session=JSON.parse(localStorage.getItem(key)).activeExam;
  const first=[...questions,...practice].find(q=>q.id===session.questionIds[0]);
  clickWrongExamChoice(first);
  submitExam();
  expect(document.querySelector('[data-action="start-ai-remediation"]')).not.toBeNull();
  document.querySelector('[data-action="start-ai-remediation"]').click();
  await vi.advanceTimersByTimeAsync(1);
  const state=JSON.parse(localStorage.getItem(key));
  expect(state.generatedQuestions.some(q=>q.id==='ai-remediation-1')).toBe(true);
  expect(state.activeExam.kind).toBe('review');
  expect(state.activeExam.title).toContain('AI 弱點驗收');
  expect(state.activeExam.questionIds).toContain('ai-remediation-1');
});



it('locks AI weakness validation while its first request is still in flight',async()=>{
  window.history.replaceState(null,'','#/exam-center');
  const pending=[];
  let aiRequests=0;
  fetch.mockImplementation((url,options={})=>{
    if(String(url).includes('/api/generate-question')){
      aiRequests+=1;
      const {brief}=JSON.parse(options.body);
      const generated={
        id:'ai-remediation-race-1',
        subject:brief.subject,
        domain:brief.domain,
        questionType:brief.subSkill||'推論題',
        competency:brief.coreSkill,
        difficulty:brief.targetDifficulty,
        passage:'新的競態驗收情境。',
        question:'哪一個推論最合理？',
        choices:['A','B','C','D'],
        answer:1,
        explanation:'驗收解析',
        hint1:'提示一',
        hint2:'提示二',
        errorTags:['錯因A','錯因B','錯因C','錯因D'],
        source:'ai_generated',
        chapter:brief.domain,
        topic:brief.coreSkill,
        grade:9,
        tags:['ai-generated','remediation'],
        examAligned:true,
        examProfile:{domain:brief.domain,type:brief.subSkill||'推論題',competency:brief.coreSkill},
        aiGenerated:true,
        aiPracticeMode:brief.practiceMode
      };
      return new Promise(resolve=>pending.push(()=>resolve(
        new Response(JSON.stringify({questions:[generated]}),{status:200,headers:{'content-type':'application/json'}})
      )));
    }
    return Promise.resolve({ok:true,json:async()=>String(url).includes('cap-practice')?practice:questions});
  });

  await boot();
  document.querySelector('[data-action="start-practice"]').click();
  const session=JSON.parse(localStorage.getItem(key)).activeExam;
  const first=[...questions,...practice].find(q=>q.id===session.questionIds[0]);
  clickWrongExamChoice(first);
  submitExam();

  const button=document.querySelector('[data-action="start-ai-remediation"]');
  expect(button).not.toBeNull();
  button.click();
  button.click();
  await vi.advanceTimersByTimeAsync(0);

  expect(aiRequests).toBe(1);
  expect(button.disabled).toBe(true);
  expect(button.textContent).toContain('正在準備');

  pending[0]();
  await vi.advanceTimersByTimeAsync(1);

  const saved=JSON.parse(localStorage.getItem(key));
  expect(saved.activeExam?.kind).toBe('review');
  expect(saved.activeExam?.questionIds).toContain('ai-remediation-race-1');
  expect(window.confirm).not.toHaveBeenCalled();
});

it('mixes up to five AI questions into the 25-question re-diagnosis and records quota',async()=>{
  window.history.replaceState(null,'','#/profile');
  fetch.mockImplementation(async (url,options={})=>{
    const target=String(url);
    if(target.includes('/api/generate-question')){
      const {brief}=JSON.parse(options.body);
      const generated={
        id:`diag-ai-${brief.subject}`,
        subject:brief.subject,
        domain:brief.domain,
        questionType:brief.subSkill||'診斷題',
        competency:brief.coreSkill,
        difficulty:brief.targetDifficulty,
        passage:'重新診斷 AI 情境。',
        question:`${brief.subject} AI 診斷題？`,
        choices:['A','B','C','D'],
        answer:1,
        explanation:'診斷解析',
        hint1:'提示一',
        hint2:'提示二',
        errorTags:['錯因A','錯因B','錯因C','錯因D'],
        source:'ai_generated',
        chapter:brief.domain,
        topic:brief.coreSkill,
        grade:9,
        tags:['ai-generated','diagnostic'],
        examAligned:true,
        examProfile:{domain:brief.domain,type:brief.subSkill||'診斷題',competency:brief.coreSkill},
        aiGenerated:true,
        aiPracticeMode:'diagnostic'
      };
      return new Response(JSON.stringify({questions:[generated]}),{status:200,headers:{'content-type':'application/json'}});
    }
    return {ok:true,json:async()=>target.includes('cap-practice')?practice:questions};
  });
  await boot();
  document.querySelector('[data-action="start-diagnostic"]').click();
  await vi.advanceTimersByTimeAsync(1);
  const state=JSON.parse(localStorage.getItem(key));
  expect(state.activeExam.kind).toBe('diagnostic');
  expect(state.activeExam.questionIds).toHaveLength(25);
  expect(state.activeExam.questionIds.filter(id=>id.startsWith('diag-ai-'))).toHaveLength(5);
  expect(state.generatedQuestions.filter(q=>q.id.startsWith('diag-ai-'))).toHaveLength(5);
  expect(state.aiUsage.count).toBe(5);
  expect(state.activeExam.title).toContain('AI＋本地');
});


it('stores a mock exam in the CAP war room and updates adaptive study weights',async()=>{
  window.history.replaceState(null,'','#/exam-center');
  await boot();
  expect(document.body.textContent).toContain('會考戰情中心');
  document.querySelector('#mock-title').value='第二次模考';
  document.querySelector('#mock-date').value='2026-09-18';
  const grades={chinese:'A',english:'B',math:'A+',science:'A',social:'B++'};
  for(const [subject,level] of Object.entries(grades)){
    document.querySelector(`[data-mock-grade="${subject}"]`).value=level;
  }
  document.querySelector('[data-action="save-mock-exam"]').click();
  const state=JSON.parse(localStorage.getItem(key));
  expect(state.mockExamRecords).toHaveLength(1);
  expect(state.mockExamRecords[0].grades.english).toBe('B');
  expect(state.adaptiveSubjectWeights.english).toBeGreaterThan(state.adaptiveSubjectWeights.chinese);
  expect(document.body.textContent).toContain('下一週讀書比例');
});


it('navigates English official reading groups without making later questions look duplicated',async()=>{
  window.history.replaceState(null,'','#/paper/cap115-english');await boot();
  document.querySelector('[data-action="start-paper"]').click();
  expect(document.querySelector('[data-official-question="1"]')).not.toBeNull();

  document.querySelector('[data-action="exam-go"][data-index="19"]').click();
  let current=document.querySelector('[data-official-question="20"]');
  expect(current).not.toBeNull();
  expect(current.querySelector('.official-shared')?.hasAttribute('open')).toBe(true);
  const q20=current.querySelector('.official-current-question svg')?.getAttribute('viewBox');

  document.querySelector('[data-action="exam-next"]').click();
  current=document.querySelector('[data-official-question="21"]');
  expect(current).not.toBeNull();
  expect(current.textContent).toContain('題組 20–21・目前第 21 題');
  expect(current.querySelector('.official-shared')?.hasAttribute('open')).toBe(false);
  const q21=current.querySelector('.official-current-question svg')?.getAttribute('viewBox');
  expect(q21).not.toBe(q20);
  expect(document.querySelectorAll('[data-action="exam-answer"]')).toHaveLength(4);

  document.querySelector('[data-action="exam-go"][data-index="42"]').click();
  current=document.querySelector('[data-official-question="43"]');
  expect(current).not.toBeNull();
  expect(current.textContent).toContain('題組 40–43・目前第 43 題');
  expect(document.querySelectorAll('[data-action="exam-answer"]')).toHaveLength(4);
});


it('fresh user five-subject practice is mixed and contains no duplicate questions',async()=>{
  window.history.replaceState(null,'','#/exam-center');await boot();
  document.querySelector('[data-action="start-practice"]').click();
  const state=JSON.parse(localStorage.getItem(key));
  expect(state.activeExam.questionIds).toHaveLength(10);
  expect(new Set(state.activeExam.questionIds).size).toBe(10);
  const all=[...questions,...practice];
  const subjects=state.activeExam.questionIds.map(id=>all.find(q=>q.id===id)?.subject);
  const counts=Object.fromEntries(['english','science','math','social','chinese'].map(subject=>[
    subject,subjects.filter(value=>value===subject).length
  ]));
  expect(counts).toEqual({english:2,science:2,math:2,social:2,chinese:2});
});

for(const [paperId,count] of [
  ['cap115-chinese',42],
  ['cap115-english',43],
  ['cap115-listening',21],
  ['cap115-math',25],
  ['cap115-social',54],
  ['cap115-science',50]
]){
  it(`fresh user can open the full official paper ${paperId} through its final question`,async()=>{
    window.history.replaceState(null,'',`#/paper/${paperId}`);await boot();
    document.querySelector('[data-action="start-paper"]').click();
    const state=JSON.parse(localStorage.getItem(key));
    expect(state.activeExam.questionIds).toHaveLength(count);
    expect(new Set(state.activeExam.questionIds).size).toBe(count);
    const last=[...document.querySelectorAll('[data-action="exam-go"]')].at(-1);
    expect(last).not.toBeUndefined();
    last.click();
    expect(document.querySelector(`[data-official-question="${count}"]`)).not.toBeNull();
  });
}

it('fresh user can open the official writing paper and save a draft',async()=>{
  window.history.replaceState(null,'','#/paper/cap115-writing');await boot();
  document.querySelector('[data-action="start-paper"]').click();
  expect(document.querySelector('[data-exam-note="writing"]')).not.toBeNull();
  expect(document.querySelector('.official-manual[open] svg')).not.toBeNull();
});


it('keeps saved mock grades visible and updates the latest record instead of resetting to A++',async()=>{
  window.history.replaceState(null,'','#/exam-center');await boot();
  const grades={chinese:'A',english:'B',math:'A+',science:'A',social:'B++'};
  document.querySelector('#mock-date').value='2026-09-18';
  document.querySelector('#mock-title').value='第一次模考';
  for(const [subject,level] of Object.entries(grades)) {
    document.querySelector(`[data-mock-grade="${subject}"]`).value=level;
  }
  document.querySelector('[data-action="save-mock-exam"]').click();

  let saved=JSON.parse(localStorage.getItem(key)).mockExamRecords;
  expect(saved).toHaveLength(1);
  expect(saved[0].grades).toEqual(grades);
  expect(document.querySelector('[data-mock-grade="english"]').value).toBe('B');
  expect(document.querySelector('[data-mock-grade="math"]').value).toBe('A+');
  expect(document.querySelector('#mock-title').value).toBe('第一次模考');
  expect(document.querySelector('#mock-record-id').value).toBe(saved[0].id);

  document.querySelector('[data-mock-grade="english"]').value='A';
  document.querySelector('[data-action="save-mock-exam"]').click();
  saved=JSON.parse(localStorage.getItem(key)).mockExamRecords;
  expect(saved).toHaveLength(1);
  expect(saved[0].grades.english).toBe('A');
  expect(document.querySelector('[data-mock-grade="english"]').value).toBe('A');

  document.querySelector('[data-action="new-mock-exam"]').click();
  expect(document.querySelector('#mock-record-id').value).toBe('');
  expect(document.querySelector('[data-mock-grade="english"]').value).toBe('');
  expect(document.querySelector('[data-action="save-mock-exam"]').textContent).toContain('儲存這次模考');
});


it('deletes only the selected mock exam record and falls back to the newest remaining record',async()=>{
  window.history.replaceState(null,'','#/exam-center');await boot();
  const setGrades=(english)=>{
    const values={chinese:'A',english,math:'A+',science:'A',social:'B++'};
    for(const [subject,level] of Object.entries(values)) document.querySelector(`[data-mock-grade="${subject}"]`).value=level;
  };

  document.querySelector('#mock-date').value='2026-09-10';
  document.querySelector('#mock-title').value='第一次模考';
  setGrades('B');
  document.querySelector('[data-action="save-mock-exam"]').click();

  document.querySelector('[data-action="new-mock-exam"]').click();
  document.querySelector('#mock-date').value='2026-09-18';
  document.querySelector('#mock-title').value='第二次模考';
  setGrades('A');
  document.querySelector('[data-action="save-mock-exam"]').click();

  let saved=JSON.parse(localStorage.getItem(key)).mockExamRecords;
  expect(saved).toHaveLength(2);
  const second=saved.find(item=>item.title==='第二次模考');
  expect(second).toBeTruthy();

  document.querySelector(`[data-action="delete-mock-exam"][data-id="${second.id}"]`).click();

  saved=JSON.parse(localStorage.getItem(key)).mockExamRecords;
  expect(saved).toHaveLength(1);
  expect(saved[0].title).toBe('第一次模考');
  expect(saved[0].grades.english).toBe('B');
  expect(document.querySelector('#mock-title').value).toBe('第一次模考');
  expect(document.querySelector('[data-mock-grade="english"]').value).toBe('B');
});


it('does not call AI when a full local practice set is available',async()=>{
  const source=practice.find(q=>q.subject==='english'&&q.examAligned);
  const domain=source.examProfile?.domain??source.domain??source.chapter;
  const competency=source.examProfile?.competency??source.competency??source.questionType;
  const skillKey=`english::${domain}::${competency}`;
  localStorage.setItem(key,JSON.stringify({
    version:1,
    adaptiveSkills:{
      [skillKey]:{
        subject:'english',domain,competency,subSkill:source.questionType??competency,
        mastery:10,attempts:2,correct:0,wrong:2,consecutiveCorrect:0,consecutiveWrong:2,
        attemptsLast7Days:2,wrongLast7Days:2,wrongInMockExam:0,nextReviewDate:'2026-09-17',
        diagnosticRequired:false,reviewStage:0
      }
    },
    answerHistory:[],
    aiUsage:{date:'2026-09-17',count:0,limit:12}
  }));
  let aiRequests=0;
  vi.stubGlobal('fetch',vi.fn(async url=>{
    const value=String(url);
    if(value.includes('/api/generate-question')) {
      aiRequests+=1;
      return new Response(JSON.stringify({questions:[]}),{status:200,headers:{'content-type':'application/json'}});
    }
    return {ok:true,json:async()=>value.includes('cap-practice')?practice:questions};
  }));

  window.history.replaceState(null,'','#/exam-center');
  await boot();
  document.querySelector('#practice-subject').value='english';
  document.querySelector('[data-action="start-practice"]').click();
  await vi.advanceTimersByTimeAsync(1);

  const session=JSON.parse(localStorage.getItem(key)).activeExam;
  expect(session).not.toBeNull();
  expect(session.questionIds).toHaveLength(10);
  expect(aiRequests).toBe(0);
});

it('starts adaptive practice immediately while AI questions load in the background',async()=>{
  const source=practice.find(q=>q.subject==='english'&&q.examAligned);
  const domain=source.examProfile?.domain??source.domain??source.chapter;
  const competency=source.examProfile?.competency??source.competency??source.questionType;
  const skillKey=`english::${domain}::${competency}`;
  localStorage.setItem(key,JSON.stringify({
    version:1,
    adaptiveSkills:{
      [skillKey]:{
        subject:'english',domain,competency,
        subSkill:source.questionType??competency,
        mastery:10,attempts:2,correct:0,wrong:2,
        consecutiveCorrect:0,consecutiveWrong:2,
        attemptsLast7Days:2,wrongLast7Days:2,
        wrongInMockExam:0,nextReviewDate:'2026-09-17',
        diagnosticRequired:false,reviewStage:0
      }
    },
    answerHistory:[],
    aiUsage:{date:'2026-09-17',count:0,limit:12}
  }));

  let resolveAi;
  vi.stubGlobal('fetch',vi.fn((url)=>{
    const value=String(url);
    if(value.includes('/api/generate-question')) {
      return new Promise(resolve=>{
        resolveAi=()=>resolve(new Response(JSON.stringify({
          questions:[{
            id:'ai-fast-background-1',
            subject:'english',
            domain,
            questionType:source.questionType??'推論',
            competency,
            difficulty:source.difficulty??3,
            passage:'A fresh background-generated passage.',
            question:'What is the best inference?',
            choices:['A new reason','A wrong detail','Another wrong detail','An unrelated detail'],
            answer:0,
            explanation:'The first choice follows the passage.',
            hint1:'Use the passage.',
            hint2:'Choose the supported inference.',
            errorTags:['correct','detail','over inference','irrelevant'],
            source:'ai_generated',
            chapter:domain,
            topic:competency,
            grade:9,
            tags:['ai-generated','near-transfer',competency],
            examAligned:true,
            examProfile:{domain,type:source.questionType??'推論',competency},
            aiGenerated:true,
            aiPracticeMode:'near-transfer'
          }]
        }),{status:200,headers:{'content-type':'application/json'}}));
      });
    }
    return Promise.resolve({
      ok:true,
      json:async()=>value.includes('cap-practice')?practice:questions
    });
  }));

  window.history.replaceState(null,'','#/exam-center');
  await boot();
  document.querySelector('#practice-subject').value='english';
  document.querySelector('#practice-grade').value=String(source.grade);
  document.querySelector('#practice-type').value=source.questionType;
  document.querySelector('[data-action="start-practice"]').click();

  const immediate=JSON.parse(localStorage.getItem(key)).activeExam;
  expect(immediate).not.toBeNull();
  expect(window.location.hash).toBe('#/exam');
  expect(typeof resolveAi).toBe('function');
  expect(immediate.questionIds).not.toContain('ai-fast-background-1');

  resolveAi();
  await vi.advanceTimersByTimeAsync(1);
  const after=JSON.parse(localStorage.getItem(key));
  expect(after.generatedQuestions.some(q=>q.id==='ai-fast-background-1')).toBe(true);
  expect(after.aiUsage.count).toBe(1);
  expect(after.activeExam.questionIds).toContain('ai-fast-background-1');
});



it('rejects a malformed background AI question before it can poison answer selection',async()=>{
  const source=practice.find(q=>q.subject==='english'&&q.examAligned);
  const domain=source.examProfile?.domain??source.domain??source.chapter;
  const competency=source.examProfile?.competency??source.competency??source.questionType;
  const skillKey=`english::${domain}::${competency}`;
  localStorage.setItem(key,JSON.stringify({
    version:1,
    adaptiveSkills:{
      [skillKey]:{
        subject:'english',domain,competency,
        subSkill:source.questionType??competency,
        mastery:10,attempts:2,correct:0,wrong:2,
        consecutiveCorrect:0,consecutiveWrong:2,
        attemptsLast7Days:2,wrongLast7Days:2,
        wrongInMockExam:0,nextReviewDate:'2026-09-17',
        diagnosticRequired:false,reviewStage:0
      }
    },
    answerHistory:[],
    aiUsage:{date:'2026-09-17',count:0,limit:12}
  }));

  vi.stubGlobal('fetch',vi.fn(async(url)=>{
    const value=String(url);
    if(value.includes('/api/generate-question')) {
      return new Response(JSON.stringify({
        questions:[{
          id:'ai-malformed-answer',
          subject:'english',
          domain,
          questionType:source.questionType??'推論',
          competency,
          difficulty:source.difficulty??3,
          passage:'A malformed generated passage.',
          question:'What is the answer?',
          choices:['A','B','C','D'],
          answer:99,
          explanation:'Invalid generated answer index.',
          hint1:'h1',hint2:'h2',
          errorTags:['a','b','c','d'],
          source:'ai_generated',
          chapter:domain,
          topic:competency,
          grade:9,
          examAligned:true,
          examProfile:{domain,type:source.questionType??'推論',competency},
          aiGenerated:true,
          aiPracticeMode:'near-transfer'
        }]
      }),{status:200,headers:{'content-type':'application/json'}});
    }
    return {ok:true,json:async()=>value.includes('cap-practice')?practice:questions};
  }));

  window.history.replaceState(null,'','#/exam-center');
  await boot();
  document.querySelector('#practice-subject').value='english';
  document.querySelector('#practice-grade').value=String(source.grade);
  document.querySelector('#practice-type').value=source.questionType;
  document.querySelector('[data-action="start-practice"]').click();
  await vi.advanceTimersByTimeAsync(1);

  const saved=JSON.parse(localStorage.getItem(key));
  expect(saved.generatedQuestions.some(q=>q.id==='ai-malformed-answer')).toBe(false);
  expect(saved.aiUsage.count).toBe(0);
  expect(saved.activeExam.questionIds).not.toContain('ai-malformed-answer');

  document.querySelector('[data-action="exam-answer"][data-choice="0"]').click();
  const after=JSON.parse(localStorage.getItem(key)).activeExam;
  expect(Object.keys(after.answers)).toHaveLength(1);
});

it('clears runtime AI cache when adaptive memory is reset',async()=>{
  const cached={
    id:'ai-cache-reset-1',
    subject:'english',
    domain:'閱讀理解',
    questionType:'推論',
    competency:'上下文推論',
    difficulty:3,
    passage:'A cached passage that must disappear after reset.',
    question:'What can the reader infer?',
    choices:['A','B','C','D'],
    answer:0,
    explanation:'A is supported.',
    hint1:'Read the passage.',
    hint2:'Use evidence.',
    errorTags:['correct','b','c','d'],
    source:'ai_generated',
    chapter:'閱讀理解',
    topic:'上下文推論',
    grade:9,
    tags:['ai-generated','near-transfer','上下文推論'],
    examAligned:true,
    examProfile:{domain:'閱讀理解',type:'推論',competency:'上下文推論'},
    aiGenerated:true,
    aiPracticeMode:'near-transfer'
  };
  localStorage.setItem(key,JSON.stringify({
    version:1,
    generatedQuestions:[cached],
    adaptiveSkills:{'english::閱讀理解::上下文推論':{
      subject:'english',domain:'閱讀理解',competency:'上下文推論',subSkill:'推論',
      mastery:40,priorityScore:80
    }}
  }));
  window.history.replaceState(null,'','#/profile');
  await boot();
  document.querySelector('[data-action="reset-adaptive"]').click();
  await vi.advanceTimersByTimeAsync(1);

  let saved=JSON.parse(localStorage.getItem(key));
  expect(saved.generatedQuestions).toEqual([]);

  await go('#/exam-center');
  document.querySelector('#practice-subject').value='english';
  document.querySelector('[data-action="start-practice"]').click();
  saved=JSON.parse(localStorage.getItem(key));
  expect(saved.activeExam.questionIds).not.toContain('ai-cache-reset-1');
});

it('opens admission placement from the latest mock and supports a manual what-if grade change',async()=>{
  localStorage.setItem(key,JSON.stringify({
    version:1,
    mockExamRecords:[{
      id:'mock-placement-1',
      date:'2026-09-10',
      title:'第一次模考',
      grades:{chinese:'B++',english:'B+',math:'A',science:'B++',social:'B++'},
      errors:{}
    }],
    admissionProfile:{source:'latest-mock',grades:{},writing:4,gender:'all',targetSchoolId:'banqiao'}
  }));
  window.history.replaceState(null,'','#/placement');
  await boot();

  expect(document.body.textContent).toContain('基北區升學落點');
  expect(document.body.textContent).toContain('第一次模考');
  expect(document.querySelector('[data-placement-grade="english"]').value).toBe('B+');
  expect(document.body.textContent).toContain('20.6');

  let field=document.querySelector('#placement-preference-points');
  field.value='36';field.dispatchEvent(new Event('change',{bubbles:true}));
  await vi.advanceTimersByTimeAsync(1);
  field=document.querySelector('#placement-balanced-points');
  field.value='24';field.dispatchEvent(new Event('change',{bubbles:true}));
  await vi.advanceTimersByTimeAsync(1);
  field=document.querySelector('#placement-service-points');
  field.value='12';field.dispatchEvent(new Event('change',{bubbles:true}));
  await vi.advanceTimersByTimeAsync(1);
  expect(document.body.textContent).toContain('92.6');

  const english=document.querySelector('[data-placement-grade="english"]');
  english.value='B++';
  english.dispatchEvent(new Event('change',{bubbles:true}));
  await vi.advanceTimersByTimeAsync(1);

  const saved=JSON.parse(localStorage.getItem(key));
  expect(saved.admissionProfile.source).toBe('manual');
  expect(saved.admissionProfile.grades.english).toBe('B++');
  expect(document.body.textContent).toContain('21.6');

  document.querySelector('[data-action="placement-use-latest"]').click();
  await vi.advanceTimersByTimeAsync(1);
  expect(JSON.parse(localStorage.getItem(key)).admissionProfile.source).toBe('latest-mock');
  expect(document.querySelector('[data-placement-grade="english"]').value).toBe('B+');
});

it('turns the target-school seven-day plan into one-click subject practice',async()=>{
  localStorage.setItem(key,JSON.stringify({
    version:1,
    mockExamRecords:[{
      id:'mock-target-plan',
      date:'2026-09-20',
      title:'第二次模考',
      grades:{chinese:'B++',english:'B+',math:'A',science:'B++',social:'B++'},
      errors:{}
    }],
    adaptiveSkills:{
      'english::閱讀理解::上下文推論':{
        subject:'english',domain:'閱讀理解',competency:'上下文推論',subSkill:'推論',
        mastery:42,attempts:5,correct:2,wrong:3,consecutiveWrong:2,
        attemptsLast7Days:5,wrongLast7Days:3,priorityScore:88,nextReviewDate:'2026-09-24'
      }
    },
    admissionProfile:{source:'latest-mock',grades:{},writing:4,gender:'all',targetSchoolId:'banqiao'}
  }));
  window.history.replaceState(null,'','#/placement');
  await boot();

  expect(document.body.textContent).toContain('7 天補強計畫');
  expect(document.body.textContent).toContain('上下文推論');
  const start=document.querySelector('.target-today-button');
  expect(start).not.toBeNull();
  expect(start.dataset.subject).toBe('english');
  start.click();

  const session=JSON.parse(localStorage.getItem(key)).activeExam;
  expect(window.location.hash).toBe('#/exam');
  expect(session.title).toContain('板橋高中目標');
  expect(session.title).toContain('英文補強');
  expect(session.questionIds.length).toBeGreaterThan(0);
  const all=[...questions,...practice];
  expect(session.questionIds.every(id=>{
    const question=all.find(item=>item.id===id);
    return question?.subject==='english';
  })).toBe(true);
});

it('shows placement as a primary suite navigation destination',async()=>{
  window.history.replaceState(null,'','#/');
  await boot();
  expect(document.querySelector('.jh-section-nav a[href="#/placement"]')).not.toBeNull();
  expect(document.querySelector('a[href="#/placement"]')?.textContent).toBeTruthy();
});
