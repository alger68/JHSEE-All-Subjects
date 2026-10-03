import { describe, expect, it } from 'vitest';
import { renderAnalysis, renderBattle, renderExam, renderLobby, renderRevenge, renderWorld } from '../js/ui/views.js';
import { createPlayer } from '../js/core/game-state.js';

describe('adventure views', () => {
  it('renders player state and all five subject worlds in the lobby', () => {
    const html = renderLobby({
      player: createPlayer({ level: 4, streak: 3 }),
      countdown: 240,
      quest: { complete: 2, total: 5 },
      wrongCount: 3,
      subjectProgress: {}
    });
    expect(html).toContain('LV.4');
    expect(html).toContain('國文王國');
    expect(html).toContain('English World');
    expect(html).toContain('數學之塔');
    expect(html).toContain('科學實驗島');
    expect(html).toContain('時空大陸');
    expect(html).toContain('完成 10 題');
    expect(html).toContain('完成一輪練習');
    expect(html).toContain('答對 5 題');
    expect(html).not.toContain('錯題復仇 3 題');
  });

  it('gives the student one actionable daily recommendation next to exam and review entrances', () => {
    const container = document.createElement('div');
    container.innerHTML = renderLobby({
      player: createPlayer(), countdown: 200,
      quest: { complete: 0, total: 5 }, wrongCount: 2, subjectProgress: {},
      todayAction: {
        kind: 'practice', label: '先練數學 10 題', reason: '數學資料分析已到複習日',
        action: 'start-today-practice'
      }
    });
    const daily = container.querySelector('.today-study-main');
    expect(daily.textContent).toContain('數學資料分析已到複習日');
    expect(daily.querySelector('[data-action="start-today-practice"]').textContent).toContain('先練數學 10 題');
    expect(container.querySelector('.today-study-exam[href="#/exam-center"]')).not.toBeNull();
    expect(container.querySelector('.today-study-review[href="#/revenge"]')).not.toBeNull();
    expect(container.querySelectorAll('.world-card')).toHaveLength(5);
    expect(container.querySelector('.quest-card')).not.toBeNull();
  });

  it('links directly to the active exam when the daily recommendation supplies a route', () => {
    const container = document.createElement('div');
    container.innerHTML = renderLobby({
      player: createPlayer(), countdown: 200,
      quest: { complete: 0, total: 5 }, wrongCount: 0, subjectProgress: {},
      todayAction: { kind: 'practice', label: '繼續作答', reason: '尚有進行中的限時試卷', href: '#/exam' }
    });
    expect(container.querySelector('.today-study-main a[href="#/exam"]').textContent).toContain('繼續作答');
    expect(container.querySelector('.today-study-main [data-action]')).toBeNull();
  });

  it('provides a working daily-practice route before personalization is available', () => {
    const container = document.createElement('div');
    container.innerHTML = renderLobby({
      player: createPlayer(), countdown: 200,
      quest: { complete: 0, total: 5 }, wrongCount: 0, subjectProgress: {}
    });
    expect(container.querySelector('.today-study-main a[href="#/exam-center"]')).not.toBeNull();
  });

  it('renders a world path and boss gate', () => {
    const html = renderWorld({ subject: 'math', levelProgress: {}, levelPoolSizes: [17, 33, 49] });
    expect(html).toContain('數學之塔');
    expect(html).toContain('基礎森林');
    expect(html).toContain('數學魔王');
    expect(html).toContain('題庫 17 題');
    expect(html).toContain('題庫 33 題');
  });

  it('unlocks each subject level after clearing its preceding level', () => {
    for (const subject of ['chinese', 'english', 'math', 'science', 'social']) {
      const path = (progress) => {
        const container = document.createElement('div');
        container.innerHTML = renderWorld({ subject, levelProgress: progress });
        return container.querySelectorAll('.level-node');
      };
      const fresh = path({});
      expect(fresh[0].querySelector('a').getAttribute('href')).toBe(`#/battle/${subject}/${subject}-1`);
      expect(fresh[1].querySelector('a').hasAttribute('href')).toBe(false);
      expect(fresh[2].querySelector('a').hasAttribute('href')).toBe(false);

      const afterOne = path({ [`${subject}-1`]: { cleared: true, stars: 1 } });
      expect(afterOne[1].querySelector('a').getAttribute('href')).toBe(`#/battle/${subject}/${subject}-2`);
      expect(afterOne[2].querySelector('a').hasAttribute('href')).toBe(false);

      const afterTwo = path({
        [`${subject}-1`]: { cleared: true, stars: 1 },
        [`${subject}-2`]: { cleared: true, stars: 2 }
      });
      expect(afterTwo[2].querySelector('a').getAttribute('href')).toBe(`#/battle/${subject}/${subject}-3`);
    }
  });

  it('renders a battle question with accessible choices', () => {
    const html = renderBattle({
      subject: 'math', battle: { index: 0, playerHp: 5, enemyHp: 100, combo: 0, mode: 'normal', questions: [{}] },
      question: { question: '1 + 1 = ?', choices: ['1', '2', '3', '4'] }, feedback: null
    });
    expect(html).toContain('問題 1 / 1');
    expect(html).toContain('aria-label="選項 A：1"');
  });

  it('renders an honest insufficient-data analysis state', () => {
    expect(renderAnalysis({ subjects: {}, topics: {} })).toContain('還沒有足夠資料');
  });

  it('describes only the diagnosed learner’s actual focus areas', () => {
    const html = renderAnalysis({ subjects: {}, topics: {} }, {
      diagnostic: {
        student: '小華', source: '最新模考', subjectWeights: {},
        focuses: [
          { label: '社會圖表判讀', result: '6 / 12', priority: '高', recommendation: '練習資料判讀。' },
          { label: '國文跨文本', result: '7 / 12', priority: '高', recommendation: '比對兩篇文章。' }
        ]
      }
    });
    expect(html).toContain('小華・最新模考診斷');
    expect(html).toContain('社會圖表判讀 → 國文跨文本');
    expect(html).toContain('練習資料判讀。');
    expect(html).not.toContain('英文閱讀 → 自然理化');
  });

  it('offers mock input and the 25-question diagnostic without guessing a new learner’s weaknesses', () => {
    const container = document.createElement('div');
    container.innerHTML = renderAnalysis({ subjects: {}, topics: {} }, {
      diagnostic: { student: '學生', source: '初始', subjectWeights: {}, focuses: [] }
    });
    const panel = container.querySelector('.diagnostic-panel');
    expect(panel.textContent).toContain('尚無個人弱點資料');
    expect(panel.querySelector('a[href="#/exam-center"]')).not.toBeNull();
    expect(panel.querySelector('button[data-action="start-diagnostic"]')).not.toBeNull();
    expect(panel.textContent).not.toContain('英文閱讀');
  });

  it('counts only available and unresolved wrong questions as due for review', () => {
    const html = renderRevenge({
      date: '2026-09-30',
      items: [
        { questionId: 'ready', topic: '資料判讀', nextReview: '2026-09-29', mastery: 1, wrongCount: 1, available: true, resolved: false },
        { questionId: 'mastered', topic: '方程式', nextReview: '2026-09-29', mastery: 3, wrongCount: 1, available: true, resolved: true },
        { questionId: 'missing', topic: '歷史', nextReview: '2026-09-29', mastery: 0, wrongCount: 1, available: false, resolved: false }
      ]
    });
    expect(html).toContain('今天到期 1 題');
    expect(html).toContain('1 筆題目資料目前無法載入');
    expect(html.match(/今天到期/g)).toHaveLength(2);
  });

  it('acknowledges an entered mock without inventing topic weaknesses when it has no focus areas', () => {
    const container = document.createElement('div');
    container.innerHTML = renderAnalysis({ subjects: {}, topics: {} }, {
      diagnostic: {
        student: '新同學', source: '第二次模考',
        subjectWeights: { chinese: 18, english: 22, math: 20, science: 20, social: 20 },
        focuses: []
      }
    });
    const panel = container.querySelector('.diagnostic-panel');
    expect(panel.textContent).toContain('已依模考五科等級調整練習比例');
    expect(panel.textContent).toContain('題型弱點');
    expect(panel.textContent).not.toContain('輸入自己的模考等級');
    expect(panel.textContent).not.toContain('英文閱讀 → 自然理化');
    expect(panel.querySelector('button[data-action="start-diagnostic"]')).not.toBeNull();
  });

  it('renders a quick exam without revealing answers', () => {
    const html = renderExam({
      exam: { questions: [{ id: 'Q1', subject: 'math', question: '1+1?', choices: ['1', '2'] }] },
      index: 0,
      answers: {},
      remaining: '20:00'
    });
    expect(html).toContain('快速模考');
    expect(html).toContain('20:00');
    expect(html).toContain('交卷');
    expect(html).not.toContain('正確答案');
  });

  it('shows submit instead of a disabled next button on the final question', () => {
    const html = renderExam({
      exam: { questions: [{ id: 'Q1', subject: 'math', question: '1+1?', choices: ['1', '2'] }] },
      index: 0,
      answers: { Q1: 1 },
      remaining: '18:00'
    });
    expect(html).toContain('data-action="submit-exam"');
    expect(html).not.toContain('data-action="exam-next"');
  });
  it('labels a battle with the chapter-specific level name', () => {
    const html = renderBattle({
      subject: 'english', battle: { index: 0, playerHp: 5, enemyHp: 100, combo: 0, mode: 'normal', questions: [{}] },
      levelNumber: 2,
      question: { chapter: '基本文法', question: 'Choose the correct form.', choices: ['A', 'B'] }, feedback: null
    });
    expect(html).toContain('Grammar Ridge怪物');
  });
});
