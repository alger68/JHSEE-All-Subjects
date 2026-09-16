function damageFor(combo, mode) {
  if (mode === 'boss') {
    if (combo >= 5) return 100;
    if (combo >= 3) return 75;
    return 50;
  }
  if (combo >= 5) return 40;
  if (combo >= 3) return 25;
  return 20;
}

export function createBattle(questions, mode = 'normal') {
  return {
    mode,
    questions: [...questions],
    index: 0,
    playerHp: 5,
    enemyHp: mode === 'boss' ? 500 : 100,
    combo: 0,
    maxCombo: 0,
    expGained: 0,
    coinsGained: 0,
    answers: [],
    status: 'active'
  };
}

export function answerBattle(state, question, choice) {
  if (state.status !== 'active') return state;
  const correct = choice === question.answer;
  const combo = correct ? state.combo + 1 : 0;
  const damage = correct ? damageFor(combo, state.mode) : 0;
  return {
    ...state,
    index: state.index + 1,
    playerHp: Math.max(0, state.playerHp - (correct ? 0 : 1)),
    enemyHp: Math.max(0, state.enemyHp - damage),
    combo,
    maxCombo: Math.max(state.maxCombo, combo),
    expGained: state.expGained + (correct ? 20 : 5),
    coinsGained: state.coinsGained + (correct ? 5 : 0),
    answers: [...state.answers, { questionId: question.id, choice, correct, damage }]
  };
}

export function finishBattle(state) {
  const total = state.questions.length;
  const correct = state.answers.filter((answer) => answer.correct).length;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  const cleared = state.mode === 'boss' ? accuracy >= 80 : accuracy >= 60;
  const stars = accuracy >= 90 ? 3 : accuracy >= 75 ? 2 : accuracy >= 60 ? 1 : 0;
  const bossBonus = state.mode === 'boss' && cleared;
  return {
    ...state,
    status: cleared ? 'cleared' : 'failed',
    enemyHp: cleared ? 0 : state.enemyHp,
    correct,
    total,
    accuracy,
    cleared,
    stars,
    expGained: state.expGained + (bossBonus ? 100 : 0),
    coinsGained: state.coinsGained + (bossBonus ? 80 : 0)
  };
}
