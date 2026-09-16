import { summarizeSkills, updateSkillStats } from './core/analytics.js';
import { daysUntil, makeBossQuestions, pickQuickExam, taipeiDate } from './core/app-model.js';
import { answerBattle, createBattle, finishBattle } from './core/battle.js';
import { createExam, submitExam } from './core/exam.js';
import { rewardPlayer } from './core/game-state.js';
import { recordWrong, reviewWrong } from './core/mastery.js';
import { createQuestionBank } from './core/question-bank.js';
import { claimDailyChest, createDailyQuest, questProgress, updateDailyQuest } from './core/quests.js';
import { createStore } from './core/storage.js';
import { createRouter } from './router.js';
import { SUBJECTS } from './config/subjects.js';
import {
  renderAnalysis, renderBattle, renderExam, renderExamResults, renderLobby,
  renderProfile, renderResults, renderRevenge, renderWorld
} from './ui/views.js';

const app = document.querySelector('#app');
const store = createStore();
let state = store.load();
let bank;
let router;
let feedback = null;
let currentExam = null;
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

function remainingTime(exam) {
  const seconds = Math.max(0, Math.ceil((exam.startedAt + exam.durationMinutes * 60_000 - Date.now()) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function ensureExam() {
  if (!currentExam) currentExam = { exam: createExam(pickQuickExam(bank, 2), { durationMinutes: 20 }), index: 0, answers: {} };
  return currentExam;
}

function renderRoute() {
  try {
    const match = router.resolve(window.location.hash || '#/');
    app.innerHTML = match.handler(match.params);
    window.scrollTo({ top: 0, behavior: 'instant' });
  } catch (error) {
    console.error(error);
    app.innerHTML = '<section class="fatal-state"><span>🛠️</span><h1>冒險暫時中斷</h1><p>請重新整理頁面。如果問題持續發生，可先重設瀏覽器中的本站資料。</p><a href="#/">返回首頁</a></section>';
  }
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
    '#/revenge': () => renderRevenge({ items: state.wrongQuestions.filter((entry) => !entry.resolved).map((entry) => ({ ...entry, ...bank.getById(entry.questionId) })) }),
    '#/analysis': () => renderAnalysis(summarizeSkills(state.skillStats, 3)),
    '#/profile': () => renderProfile({ player: state.player }),
    '#/exam': () => {
      const session = ensureExam();
      return renderExam({ ...session, remaining: remainingTime(session.exam) });
    },
    '#/exam-results': () => state.lastExamResult ? renderExamResults(state.lastExamResult) : renderAnalysis(summarizeSkills(state.skillStats, 3))
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
  const question = bank.getById(questionId);
  if (!question) return;
  const levelId = `revenge-${question.id}`;
  state.activeRun = { kind: 'revenge', subject: question.subject, levelId, battle: createBattle([question], 'normal') };
  feedback = null;
  save();
  window.location.hash = `#/battle/${question.subject}/${levelId}`;
}

function completeExam() {
  if (!currentExam) return;
  const result = submitExam(currentExam.exam, currentExam.answers);
  for (const item of result.items) {
    const question = bank.getById(item.id);
    if (!question) continue;
    state.skillStats = updateSkillStats(state.skillStats, question, item.correct);
    state.dailyQuest = updateDailyQuest(state.dailyQuest, { type: 'answered', subject: question.subject }, taipeiDate());
    if (!item.correct) state.wrongQuestions = recordWrong(state.wrongQuestions, item.id, taipeiDate());
  }
  state.player.totalAnswered += result.total;
  state.player = rewardPlayer(state.player, { exp: result.correct * 20 + (result.total - result.correct) * 5, coins: result.correct * 5 });
  state.attempts = [...state.attempts, { subject: 'all', mode: 'quick-exam', accuracy: result.accuracy, at: new Date().toISOString() }].slice(-50);
  state.lastExamResult = result;
  currentExam = null;
  save();
  window.location.hash = '#/exam-results';
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
  if (action === 'claim-chest') {
    const claimed = claimDailyChest(state.dailyQuest, taipeiDate());
    state.dailyQuest = claimed.quest;
    state.player = rewardPlayer(state.player, claimed.reward);
    save(); renderRoute(); showToast('寶箱開啟：+150 EXP、+100 金幣！');
  }
  if (action === 'reset-progress' && window.confirm('確定重設全部學習進度嗎？此動作無法復原。')) {
    state = store.reset(); ensureDailyQuest(); renderRoute(); showToast('進度已重設。');
  }
  if (action === 'exam-answer') {
    const session = ensureExam();
    session.answers[session.exam.questions[session.index].id] = Number(control.dataset.choice);
    renderRoute();
  }
  if (action === 'exam-prev') { ensureExam().index = Math.max(0, ensureExam().index - 1); renderRoute(); }
  if (action === 'exam-next') { ensureExam().index = Math.min(ensureExam().exam.questions.length - 1, ensureExam().index + 1); renderRoute(); }
  if (action === 'exam-go') { ensureExam().index = Number(control.dataset.index); renderRoute(); }
  if (action === 'submit-exam') {
    const unanswered = currentExam?.exam.questions.filter((question) => currentExam.answers[question.id] === undefined).length ?? 0;
    const note = unanswered ? `目前還有 ${unanswered} 題未作答，` : '';
    if (window.confirm(`${note}確定交卷嗎？交卷後才會顯示答案與解析。`)) completeExam();
  }
});

async function boot() {
  app.innerHTML = '<section class="loading-state"><span>✦</span><h1>正在展開冒險地圖…</h1></section>';
  try {
    const response = await fetch(new URL('../data/questions.json', import.meta.url));
    if (!response.ok) throw new Error(`Question bank request failed: ${response.status}`);
    bank = createQuestionBank(await response.json());
    if (bank.diagnostics.length) console.warn('Question bank diagnostics', bank.diagnostics);
    ensureDailyQuest();
    router = createRouter(routes());
    window.addEventListener('hashchange', renderRoute);
    setInterval(() => {
      if (window.location.hash === '#/exam' && currentExam) {
        if (remainingTime(currentExam.exam) === '00:00') completeExam();
        else renderRoute();
      }
    }, 1000);
    renderRoute();
  } catch (error) {
    console.error(error);
    app.innerHTML = '<section class="fatal-state"><span>⚠️</span><h1>題庫載入失敗</h1><p>請檢查網路後重新整理頁面。</p><button onclick="location.reload()">重新載入</button></section>';
  }
}

boot();
