import { describe, expect, it } from 'vitest';
import { answerBattle, createBattle, finishBattle } from '../js/core/battle.js';

const questions = Array.from({ length: 5 }, (_, index) => ({
  id: `Q${index + 1}`, answer: 1, subject: 'math', topic: '代數'
}));

describe('battle rules', () => {
  it('builds combo damage and grants answer rewards', () => {
    let battle = createBattle(questions, 'normal');
    battle = answerBattle(battle, questions[0], 1);
    battle = answerBattle(battle, questions[1], 1);
    battle = answerBattle(battle, questions[2], 1);
    expect(battle).toMatchObject({ combo: 3, enemyHp: 35, expGained: 60, coinsGained: 15 });
  });

  it('loses one heart and resets combo after a wrong answer', () => {
    let battle = createBattle(questions, 'normal');
    battle = answerBattle(battle, questions[0], 1);
    battle = answerBattle(battle, questions[1], 0);
    expect(battle).toMatchObject({ playerHp: 4, combo: 0, expGained: 25 });
  });

  it('awards stars from accuracy', () => {
    let battle = createBattle(questions, 'normal');
    for (const question of questions) battle = answerBattle(battle, question, question.answer);
    expect(finishBattle(battle)).toMatchObject({ cleared: true, stars: 3, accuracy: 100 });
  });

  it('clears a boss at eighty percent and adds the boss bonus', () => {
    const bossQuestions = Array.from({ length: 10 }, (_, index) => ({ id: `B${index}`, answer: 0 }));
    let battle = createBattle(bossQuestions, 'boss');
    bossQuestions.forEach((question, index) => {
      battle = answerBattle(battle, question, index < 8 ? 0 : 1);
    });
    expect(finishBattle(battle)).toMatchObject({ cleared: true, accuracy: 80, expGained: 270, coinsGained: 120 });
  });
});
