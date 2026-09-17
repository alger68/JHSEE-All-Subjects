import { summarizeSkills, updateSkillStats } from './core/analytics.js';
import { daysUntil, makeBossQuestions, pickQuickExam, taipeiDate } from './core/app-model.js';
import { PERSONAL_DIAGNOSTIC } from './core/personalization.js';
import { adaptiveDashboard, buildAdaptivePractice, calculateSubjectWeights, recordAdaptiveAttempt, refreshPriorities } from './core/adaptive-learning.js';
import { answerBattle, createBattle, finishBattle } from './core/battle.js';
import { createSession, answerSession, remainingSeconds, finishSession, validateSession } from './core/exam-session.js';
import { OFFICIAL_PAPERS, getOfficialQuestions } from './config/official-papers.js';
import { clock, renderExamCenter, renderPaperSetup, renderSession, renderSessionResults } from './ui/exam-views.js';
import { renderExamCheck } from './ui/exam-check.js';
import { officialLayout, renderOfficialAudio, renderOfficialQuestion } from './ui/official-reader.js';
import { rewardPlayer } from './core/game-state.js';
import { recordWrong, recordUncertain, reviewWrong, dueWrongQuestions, setWrongReason } from './core/mastery.js';
import { createQuestionBank } from './core/question-bank.js';
import { claimDailyChest, createDailyQuest, questProgress, updateDailyQuest } from './core/quests.js';
import { createStore } from './core/storage.js';
import { createRouter } from './router.js';
import { SUBJECTS } from './config/subjects.js';
import {
  renderAnalysis, renderBattle, renderLobby,
  renderProfile, renderResults, renderRevenge, renderWorld
} from './ui/views.js';

const app = document.querySelector('#app');
const store = createStore();
let state = store.load();
let bank;
let router;
let feedback = null;
let questionMap = new Map();
let toastTimer;

function showToast(message) {
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.append(toast);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.remove(), 2600);
}

function save() {
  const result = store.save(state);
  if (!result.ok) showToast('這次進度暫時無法儲存，請保持頁面開啟。');
}

function ensureDailyQuest() {
  const date = taipeiDate();
  if (!state.dailyQuest || state.dailyQuest.date !== date) {
    state.dailyQuest = createDailyQuest(date, state.dailyQuest ?? {});
    save();
  }
}

function ensureBattle(subject, levelId, mode) {
  const active = state.activeRun;
  if (active?.subject === subject && active?.levelId === levelId && active?.battle?.status === 'active') return active.battle;
  const questions = mode === 'boss' ? makeBossQuestions(bank, subject, 10) : bank.pick({ subject }, 5);
  const battle = createBattle(questions, mode);
  state.activeRun = { kind: mode, subject, levelId, battle };
  feedback = null;
  save();
  return battle;
}

function ensureExam() {
  if (!state.activeExam) {
    state.activeExam = createSession(pickQuickExam(bank, 2), { title:'五科基礎短練習',kind:'quick-exam',durationMinutes:20,attemptNumber:1+(state.examAttemptCounts?.['五科基礎短練習']??0) });
    save();
  }
  return state.activeExam;
}

const sessionQuestions = (session) => (session?.questionIds??[]).map(id=>questionMap.get(id)).filter(Boolean);
const paperFor = (session) => OFFICIAL_PAPERS.find(p=>p.id===session?.paperId);
const reviewEntries = () => state.wrongQuestions
  .map((entry) => ({ ...entry, ...questionMap.get(entry.questionId), available: questionMap.has(entry.questionId) }))
  .sort((a,b)=>String(a.nextReview??'').localeCompare(String(b.nextReview??'')));
const renderReport = (result) => result
  ? renderSessionResults({result,questions:result.items.map(x=>questionMap.get(x.id)).filter(Boolean),paper:paperFor(result),wrongQuestions:state.wrongQuestions})
  : '<div class="app-shell"><h1>此份完整報告已不在最近 10 份紀錄中</h1><a href="#/exam-center">返回會考中心</a></div>';

function renderRoute(scroll = true) {
  try {
    const match = router.resolve(window.location.hash || '#/');
    const preserved = new Map([...app.querySelectorAll('[data-preserve]')].map(node=>[node.dataset.preserve,node]));
    app.innerHTML = match.handler(match.params);
    for (const replacement of app.querySelectorAll('[data-preserve]')) {
      const previous=preserved.get(replacement.dataset.preserve);
      if(previous) replacement.replaceWith(previous);
    }
    syncOfficialAudio();
    if (scroll === true) window.scrollTo({ top: 0, behavior: 'instant' });
    if (match.route === '#/exam-check') app.querySelector('h1')?.focus({ preventScroll: true });
  } catch (error) {
    console.error(error);
    app.innerHTML = '<section class="fatal-state"><span>🛠️</span><h1>冒險暫時中斷</h1><p>請重新整理頁面或返回首頁。原有學習紀錄仍保存在這台裝置。</p><a href="#/">返回首頁</a></section>';
  }
}

// The audio player lives outside the re-rendered application. Answering,
// jumping questions and the submission check never detach or restart it.
function syncOfficialAudio() {
  const session=state.activeExam,paper=paperFor(session);
  let dock=document.getElementById('official-listening-player');
  if(paper?.section!=='listening') {
    const audio=dock?.querySelector('audio');if(audio&&!audio.paused)audio.pause();
    dock?.remove();return;
  }
  if(dock?.dataset.sessionId===session.id)return;
  const previousAudio=dock?.querySelector('audio');if(previousAudio&&!previousAudio.paused)previousAudio.pause();
  dock?.remove();dock=document.createElement('aside');
  dock.id='official-listening-player';dock.dataset.sessionId=session.id;
  dock.innerHTML=renderOfficialAudio(paper,session);app.before(dock);
}

function routes() {
  return {
    '#/': () => {
      ensureDailyQuest();
      const quest = { ...questProgress(state.dailyQuest), chestClaimed: state.dailyQuest.chestClaimed };
      return renderLobby({ player: state.player, countdown: daysUntil('2027-05-15'), quest, wrongCount: state.wrongQuestions.filter((item) => !item.resolved).length, subjectProgress: state.subjectProgress });
    },
    '#/world/:subject': ({ subject }) => renderWorld({ subject: SUBJECTS[subject] ? subject : 'math', levelProgress: state.levelProgress }),
    '#/battle/:subject/:levelId': ({ subject, levelId }) => {
      const battle = ensureBattle(subject, levelId, 'normal');
      const question = battle.questions[Math.min(battle.index, battle.questions.length - 1)];
      return renderBattle({ subject, battle, question, feedback });
    },
    '#/boss/:subject': ({ subject }) => {
      const battle = ensureBattle(subject, `${subject}-boss`, 'boss');
      const question = battle.questions[Math.min(battle.index, battle.questions.length - 1)];
      return renderBattle({ subject, battle, question, feedback });
    },
    '#/results': () => state.lastResult ? renderResults(state.lastResult) : '<p>尚無挑戰結果。</p>',
    '#/revenge': () => renderRevenge({ date:taipeiDate(), items: reviewEntries() }),
    '#/analysis': () => renderAnalysis(summarizeSkills(state.skillStats, 3), { diagnostic: PERSONAL_DIAGNOSTIC, adaptive: adaptiveDashboard(state.adaptiveSkills, state.adaptiveSubjectWeights, taipeiDate()) }),
    '#/profile': () => renderProfile({ player: state.player }),
    '#/exam': () => {
      const session = ensureExam();
      return renderSession({session,questions:sessionQuestions(session),paper:paperFor(session),remaining:remainingSeconds(session,Date.now())});
    },
    '#/exam-check': () => state.activeExam
      ? renderExamCheck({session:state.activeExam,questions:sessionQuestions(state.activeExam),paper:paperFor(state.activeExam),remaining:remainingSeconds(state.activeExam,Date.now())})
      : renderExamCenter({papers:OFFICIAL_PAPERS,alignedCount:bank.filter({examAligned:true}).length,practiceCount:bank.all().length,reports:state.examReports}),
    '#/exam-center': () => renderExamCenter({papers:OFFICIAL_PAPERS,activeSession:state.activeExam,attempts:state.attempts.filter(a=>a.title),reports:state.examReports,dueCount:dueWrongQuestions(state.wrongQuestions,taipeiDate()).length,alignedCount:bank.filter({examAligned:true}).length,practiceCount:bank.all().length,diagnostic:PERSONAL_DIAGNOSTIC,adaptive:adaptiveDashboard(state.adaptiveSkills,state.adaptiveSubjectWeights,taipeiDate())}),
    '#/paper/:paperId': ({paperId}) => renderPaperSetup(OFFICIAL_PAPERS.find(p=>p.id===paperId)),
    '#/exam-results': () => renderReport(state.lastExamResult),
    '#/exam-results/:reportId': ({reportId}) => renderReport(state.examReports.find(r=>r.sessionId===reportId))
  };
}

function settleBattle() {
  const active = state.activeRun;
  const result = finishBattle(active.battle);
  state.player = rewardPlayer(state.player, { exp: result.expGained, coins: result.coinsGained });
  if (active.kind === 'boss' && result.cleared) state.player.bossesDefeated += 1;
  const levelRecord = state.levelProgress[active.levelId] ?? {};
  state.levelProgress[active.levelId] = { cleared: result.cleared, stars: Math.max(levelRecord.stars ?? 0, result.stars) };
  const subjectRecord = state.subjectProgress[active.subject] ?? {};
  state.subjectProgress[active.subject] = { ...subjectRecord, stars: Math.max(subjectRecord.stars ?? 0, result.stars) };
  if (active.kind === 'boss') state.dailyQuest = updateDailyQuest(state.dailyQuest, { type: 'boss' }, taipeiDate());
  state.attempts = [...state.attempts, { subject: active.subject, mode: active.kind, accuracy: result.accuracy, at: new Date().toISOString() }].slice(-50);
  state.lastResult = { subject: active.subject, result };
  state.activeRun = null;
  feedback = null;
  save();
  window.location.hash = '#/results';
}

function handleBattleAnswer(choice) {
  const active = state.activeRun;
  if (!active || feedback) return;
  const question = active.battle.questions[active.battle.index];
  if (!question) return;
  const updated = answerBattle(active.battle, question, choice);
  const answer = updated.answers.at(-1);
  state.activeRun = { ...active, battle: updated };
  state.player.totalAnswered += 1;
  state.dailyQuest = updateDailyQuest(state.dailyQuest, { type: 'answered', subject: question.subject }, taipeiDate());
  state.skillStats = updateSkillStats(state.skillStats, question, answer.correct);
  {
    const adaptive = recordAdaptiveAttempt(state.adaptiveSkills, state.answerHistory, question, {
      correct: answer.correct,
      selectedChoice: choice,
      sourceKind: active.kind === 'revenge' ? 'review' : 'practice',
      date: taipeiDate()
    });
    state.adaptiveSkills = adaptive.skills;
    state.answerHistory = adaptive.history;
    state.adaptiveSubjectWeights = calculateSubjectWeights(state.adaptiveSkills, state.adaptiveSubjectWeights, PERSONAL_DIAGNOSTIC);
  }
  if (active.kind === 'revenge') {
    state.wrongQuestions = reviewWrong(state.wrongQuestions, question.id, answer.correct, taipeiDate());
    state.dailyQuest = updateDailyQuest(state.dailyQuest, { type: 'revenge' }, taipeiDate());
  } else if (!answer.correct) {
    state.wrongQuestions = recordWrong(state.wrongQuestions, question.id, taipeiDate());
  }
  feedback = { correct: answer.correct, explanation: question.explanation };
  save();
  renderRoute();
}

function startRevenge(questionId) {
  const question = questionMap.get(questionId);
  if (!question) { showToast('這題資料目前無法載入，請重新整理後再試。'); return; }
  startSession([question],{title:'單題複習',kind:'review',paperId:question.paperId,durationMinutes:10});
}

function startRevengeSession() {
  const entries=reviewEntries().filter(item=>item.available);
  const questions=entries.map(item=>questionMap.get(item.questionId)).filter(Boolean);
  if (!questions.length) { showToast('目前沒有可作答的錯題。'); return; }
  startSession(questions,{title:`錯題復仇・${questions.length} 題`,kind:'review',durationMinutes:Math.min(180,Math.max(10,questions.length*10))});
}

function completeExam() {
  const session=state.activeExam;
  if (!session || session.status !== 'active') return;
  const result = {...finishSession(session,sessionQuestions(session),Date.now()),notes:{...session.notes},sessionId:session.id};
  state.activeExam=null;
  ensureDailyQuest();
  for (const item of result.items) {
    const question = questionMap.get(item.id);
    if (!question) continue;
    if (question.source!=='official') state.skillStats = updateSkillStats(state.skillStats, question, item.correct);
    if (item.choice!==undefined) {
      const adaptive = recordAdaptiveAttempt(state.adaptiveSkills, state.answerHistory, question, {
        correct: item.correct,
        selectedChoice: item.choice,
        hinted: Boolean(item.hinted),
        uncertain: Boolean(item.uncertain),
        sourceKind: session.kind === 'review' ? 'review' : question.source === 'official' ? 'official' : 'practice',
        date: taipeiDate()
      });
      state.adaptiveSkills = adaptive.skills;
      state.answerHistory = adaptive.history;
      state.adaptiveSubjectWeights = calculateSubjectWeights(state.adaptiveSkills, state.adaptiveSubjectWeights, PERSONAL_DIAGNOSTIC);
      state.dailyQuest = updateDailyQuest(state.dailyQuest, { type: 'answered', subject: question.subject }, taipeiDate());
    }
    if (session.kind==='review') {
      state.wrongQuestions=item.correct&&(item.uncertain||item.hinted)
        ? recordUncertain(state.wrongQuestions,item.id,taipeiDate())
        : reviewWrong(state.wrongQuestions,item.id,item.correct,taipeiDate());
      state.dailyQuest=updateDailyQuest(state.dailyQuest,{type:'revenge'},taipeiDate());
    } else if (!item.correct) state.wrongQuestions = recordWrong(state.wrongQuestions, item.id, taipeiDate());
    else if (item.uncertain||item.hinted) state.wrongQuestions=recordUncertain(state.wrongQuestions,item.id,taipeiDate());
  }
  state.player.totalAnswered += result.items.filter(i=>i.choice!==undefined).length;
  const answeredWrong=result.items.filter(item=>item.choice!==undefined&&!item.correct).length;
  state.player = rewardPlayer(state.player, { exp: result.correct * 20 + answeredWrong * 5, coins: result.correct * 5 });
  state.examAttemptCounts ??= {};
  const attemptKey=session.paperId??session.title;
  if(session.kind!=='review') state.examAttemptCounts[attemptKey]=(state.examAttemptCounts[attemptKey]??0)+1;
  state.attempts = [...state.attempts, { title:session.title, subject:paperFor(session)?.subject??'all',kind:session.kind,paperId:session.paperId,attemptNumber:session.attemptNumber,hintCount:result.items.filter(i=>i.hinted).length, accuracy: result.accuracy, at: new Date().toISOString() }].slice(-50);
  state.lastExamResult = result;
  state.examReports = [...state.examReports,result].slice(-10);
  save();
  window.location.hash = '#/exam-results';
  renderRoute();
}

function startSession(questions,options) {
  if (state.activeExam&&!window.confirm('已有尚未交卷的測驗。確定放棄它並開始新的練習嗎？')) return;
  state.activeExam=createSession(questions,{...options,attemptNumber:1+(state.examAttemptCounts?.[options.paperId??options.title]??0)});
  if(options.paperId) {
    state.activeExam.paperMode=options.paperMode==='whole'?'whole':'question';
    state.activeExam.paperPage=1;
  }
  save(); window.location.hash='#/exam'; renderRoute();
}

function guardSession() {
  if(!state.activeExam) return false;
  if(remainingSeconds(state.activeExam,Date.now())===0) { completeExam(); showToast('時間到，已自動交卷。'); return false; }
  return true;
}

function updateExamClock() {
  if(!state.activeExam) return;
  if(!guardSession()) return;
  const timer=document.querySelector('[data-exam-timer]');
  if(timer) timer.textContent=`⏱ ${clock(remainingSeconds(state.activeExam,Date.now()))}`;
}

function practiceSelection(shuffle=false) {
  const subject=document.querySelector('#practice-subject').value;
  const grade=Number(document.querySelector('#practice-grade').value);
  const type=document.querySelector('#practice-type').value;
  const focus=document.querySelector('#practice-focus').value;
  const criteria={};
  if(subject!=='all')criteria.subject=subject;
  if(focus!=='all')criteria.examAligned=focus!=='basic';
  const candidates=bank.filter(criteria)
    .filter(q=>q.grade<=grade&&(!type||q.questionType===type));
  state.adaptiveSkills=refreshPriorities(state.adaptiveSkills,taipeiDate());
  state.adaptiveSubjectWeights=calculateSubjectWeights(state.adaptiveSkills,state.adaptiveSubjectWeights,PERSONAL_DIAGNOSTIC);
  const pool=buildAdaptivePractice(candidates,Math.min(10,candidates.length),{
    skills:state.adaptiveSkills,
    subjectWeights:state.adaptiveSubjectWeights,
    today:taipeiDate(),
    diagnostic:PERSONAL_DIAGNOSTIC,
    rng:shuffle?Math.random:()=>0.5
  });
  return {subject,grade,type,focus,pool,matchCount:candidates.length};
}

app.addEventListener('click', (event) => {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const action = control.dataset.action;
  if (action === 'answer') handleBattleAnswer(Number(control.dataset.choice));
  if (action === 'next') {
    const battle = state.activeRun?.battle;
    feedback = null;
    if (battle && (battle.index >= battle.questions.length || battle.playerHp === 0)) settleBattle();
    else renderRoute();
  }
  if (action === 'start-revenge') startRevenge(control.dataset.id);
  if (action === 'start-revenge-session') startRevengeSession();
  if (action === 'claim-chest') {
    const claimed = claimDailyChest(state.dailyQuest, taipeiDate());
    state.dailyQuest = claimed.quest;
    state.player = rewardPlayer(state.player, claimed.reward);
    save(); renderRoute(); showToast('寶箱開啟：+150 EXP、+100 金幣！');
  }
  if (action === 'reset-progress' && window.confirm('確定重設全部學習進度嗎？此動作無法復原。')) {
    state = store.reset(); ensureDailyQuest(); renderRoute(); showToast('進度已重設。');
  }
  if(action==='start-paper') {
    const paper=OFFICIAL_PAPERS.find(p=>p.id===control.dataset.id);
    if(paper) startSession(getOfficialQuestions(paper),{title:paper.title,kind:paper.section==='writing'?'official-writing':'official',paperId:paper.id,durationMinutes:paper.durationMinutes,paperMode:document.querySelector('input[name="paper-mode"]:checked')?.value});
  }
  if(action==='paper-zoom') {
    const reader=control.closest('.official-question-material,.whole-paper-reader');
    const zoomed=reader?.classList.toggle('zoomed');
    control.setAttribute('aria-pressed',String(Boolean(zoomed)));
    control.textContent=zoomed?'縮回頁寬':'放大閱讀';return;
  }
  if(action==='paper-mode') {
    if(!guardSession())return;
    const s=state.activeExam,layout=officialLayout(paperFor(s));if(!layout)return;
    s.paperMode=control.dataset.mode==='whole'?'whole':'question';
    if(s.paperMode==='whole')s.paperPage=layout.questions[sessionQuestions(s)[s.index]?.number-1]?.region.page??layout.manual[0]?.page??1;
    save();renderRoute(false);
  }
  if(action==='paper-page-prev'||action==='paper-page-next') {
    changePaperPage((state.activeExam?.paperPage??1)+(action==='paper-page-next'?1:-1));
  }
  if(action==='start-practice') {
    const {subject,grade,type,focus,pool}=practiceSelection(true);
    save();
    if(!pool.length) {showToast('這個範圍目前沒有題目，請調整科目或題型。'); return;}
    const focusLabel=focus==='basic'?'基礎補強':focus==='all'?'全部原創':'會考導向';
    startSession(pool,{title:`${subject==='all'?'五科':SUBJECTS[subject].name}・${grade===7?'國一':grade===8?'國一至國二':'全範圍'}${type?`・${type}`:''}・${focusLabel}練習`,kind:'practice',durationMinutes:20});
  }
  if (action === 'exam-answer') {
    if(!guardSession()) return;
    const s=state.activeExam,qs=sessionQuestions(s);
    state.activeExam=answerSession(s,qs,qs[s.index].id,Number(control.dataset.choice),Date.now());
    if (state.activeExam.kind==='review' && state.activeExam.index < state.activeExam.questionIds.length-1) {
      state.activeExam.index += 1;
    }
    save(); renderRoute(false);
  }
  if(action==='exam-uncertain'||action==='practice-hint') {
    if(!guardSession()) return;
    const s=state.activeExam,q=sessionQuestions(s)[s.index]; if(!q)return;
    if(action==='exam-uncertain') s.uncertain[q.id]=!s.uncertain[q.id];
    else if(!paperFor(s)&&s.kind!=='quick-exam') s.hinted[q.id]=1;
    save(); renderRoute(false);
  }
  if (['exam-prev','exam-next','exam-go'].includes(action)) {
    if(!guardSession())return;
    const s=state.activeExam;
    const next=action==='exam-go'?Number(control.dataset.index):s.index+(action==='exam-next'?1:-1);
    s.index=Math.max(0,Math.min(s.questionIds.length-1,next)); save(); renderRoute();
  }
  if (action === 'submit-exam') {
    if(!guardSession())return;
    window.location.hash='#/exam-check'; renderRoute();
  }
  if (action === 'return-exam' || action === 'check-question') {
    if(!guardSession())return;
    if(action==='check-question') {
      const index=Number(control.dataset.index);
      if(!Number.isInteger(index)||index<0||index>=state.activeExam.questionIds.length)return;
      state.activeExam.index=index; save();
    }
    window.location.hash='#/exam'; renderRoute();
  }
  if (action === 'confirm-submit-exam') {
    if(!guardSession()||window.location.hash!=='#/exam-check'||control.dataset.sessionId!==state.activeExam.id)return;
    control.disabled=true;
    completeExam();
  }
});

function changePaperPage(page) {
  if(!guardSession())return;
  const s=state.activeExam,layout=officialLayout(paperFor(s));
  if(!layout||!Number.isInteger(page))return;
  s.paperPage=Math.max(1,Math.min(layout.pages.length,page));save();renderRoute(false);
}

app.addEventListener('toggle',(event)=>{
  const details=event.target;
  if(!details.matches('.report-original')||!details.open)return;
  const slot=details.querySelector('[data-original-slot]');if(!slot||slot.childElementCount)return;
  const paper=OFFICIAL_PAPERS.find(p=>p.id===details.dataset.originalPaper);
  const question=getOfficialQuestions(paper).find(q=>q.number===Number(details.dataset.originalNumber));
  if(question)slot.innerHTML=renderOfficialQuestion(paper,question);
},true);

app.addEventListener('input',(event)=>{
  const id=event.target.dataset.examNote;
  if(id&&guardSession()) {state.activeExam.notes[id]=event.target.value.slice(0,20000);save();}
});
app.addEventListener('change',(event)=>{
  if(event.target.matches('[data-paper-page-select]'))changePaperPage(Number(event.target.value));
  if(['practice-subject','practice-grade','practice-type','practice-focus'].includes(event.target.id)) {
    const selection=practiceSelection();
    const count=selection.matchCount;
    document.querySelector('[data-practice-matches]').textContent=count?`符合條件 ${count} 題・本次 ${selection.pool.length} 題`:'符合條件 0 題，請調整篩選條件。';
    document.querySelector('[data-action="start-practice"]').disabled=count===0;
  }
  const id=event.target.dataset.wrongReason;
  if(id) {state.wrongQuestions=setWrongReason(state.wrongQuestions,id,event.target.value);save();}
});

async function boot() {
  app.innerHTML = '<section class="loading-state"><span>✦</span><h1>正在展開冒險地圖…</h1></section>';
  try {
    const bankUrls = [new URL('../data/questions.json',import.meta.url), new URL('../data/cap-practice.json',import.meta.url)];
    const responses = await Promise.all(bankUrls.map(url=>fetch(url)));
    if(responses.some(r=>!r.ok))throw new Error('Question bank request failed');
    bank = createQuestionBank((await Promise.all(responses.map(r=>r.json()))).flat());
    questionMap=new Map([...bank.all(),...OFFICIAL_PAPERS.flatMap(getOfficialQuestions)].map(q=>[q.id,q]));
    if (bank.diagnostics.length) console.warn('Question bank diagnostics', bank.diagnostics);
    ensureDailyQuest();
    state.adaptiveSkills=refreshPriorities(state.adaptiveSkills,taipeiDate());
    state.adaptiveSubjectWeights=calculateSubjectWeights(state.adaptiveSkills,state.adaptiveSubjectWeights,PERSONAL_DIAGNOSTIC);
    save();
    router = createRouter(routes());
    if(state.activeExam&&!validateSession(state.activeExam,sessionQuestions(state.activeExam))) {
      state.recoveredExam=state.activeExam;state.activeExam=null;save();showToast('上一份測驗資料不完整，已保留備份。請重新選卷。');
      if(window.location.hash==='#/exam')window.location.hash='#/exam-center';
    }
    window.addEventListener('hashchange', () => {updateExamClock();renderRoute();});
    window.addEventListener('visibilitychange',updateExamClock);
    setInterval(updateExamClock,1000);
    updateExamClock();
    renderRoute();
  } catch (error) {
    console.error(error);
    app.innerHTML = '<section class="fatal-state"><span>⚠️</span><h1>題庫載入失敗</h1><p>請檢查網路後重新整理頁面。</p><button onclick="location.reload()">重新載入</button></section>';
  }
}

boot();
