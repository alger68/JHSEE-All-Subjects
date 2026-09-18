import { describe, expect, it } from 'vitest';
import { renderAnalysis, renderBattle, renderExam, renderLobby, renderWorld } from '../js/ui/views.js';
import { createPlayer } from '../js/core/game-state.js';
import { PERSONAL_DIAGNOSTIC } from '../js/core/personalization.js';

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
    expect(html).toContain('挑戰 Boss');
  });

  it('renders a world path and boss gate', () => {
    const html = renderWorld({ subject: 'math', levelProgress: {} });
    expect(html).toContain('數學之塔');
    expect(html).toContain('基礎森林');
    expect(html).toContain('數學魔王');
  });

  it('renders a battle question with accessible choices', () => {
    const html = renderBattle({
      subject: 'math', battle: { index: 0, playerHp: 5, enemyHp: 100, combo: 0, mode: 'normal', questions: [{}] },
      question: { question: '1 + 1 = ?', choices: ['1', '2', '3', '4'] }, feedback: null
    });
    expect(html).toContain('問題 1 / 1');
    expect(html).toContain('aria-label="選項 A：1"');
  });

  it('labels a battle with the chapter-specific level name', () => {
    const html = renderBattle({
      subject: 'english', battle: { index: 0, playerHp: 5, enemyHp: 100, combo: 0, mode: 'normal', questions: [{}] },
      question: { chapter: 'Grammar Ridge', question: 'Choose the correct form.', choices: ['A', 'B'] }, feedback: null
    });
    expect(html).toContain('Grammar Ridge怪物');
  });

  it('renders an honest insufficient-data analysis state', () => {
    expect(renderAnalysis({ subjects: {}, topics: {} })).toContain('還沒有足夠資料');
  });

  it('renders the diagnosed weak-point plan even before local answer data exists', () => {
    const html = renderAnalysis({ subjects: {}, topics: {} }, { diagnostic: PERSONAL_DIAGNOSTIC });
    expect(html).toContain('宥廷・第一次模考診斷');
    expect(html).toContain('英文閱讀');
    expect(html).toContain('自然理化');
    expect(html).toContain('每天 1 篇會考式閱讀');
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
});
