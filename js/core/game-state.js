export function levelFromExp(exp) {
  let level = 1;
  while (exp >= Math.floor(100 * level ** 1.5)) level += 1;
  return level;
}

export function createPlayer(overrides = {}) {
  return {
    name: '會考冒險者',
    level: 1,
    exp: 0,
    coins: 0,
    streak: 0,
    totalAnswered: 0,
    bossesDefeated: 0,
    ...overrides
  };
}

export function rewardPlayer(player, reward) {
  const exp = player.exp + (reward.exp ?? 0);
  return {
    ...player,
    exp,
    level: levelFromExp(exp),
    coins: player.coins + (reward.coins ?? 0)
  };
}

export function levelProgress(player) {
  const start = player.level === 1 ? 0 : Math.floor(100 * (player.level - 1) ** 1.5);
  const end = Math.floor(100 * player.level ** 1.5);
  return { current: Math.max(0, player.exp - start), required: end - start, percent: Math.max(0, Math.min(100, Math.round(((player.exp - start) / (end - start)) * 100))) };
}
