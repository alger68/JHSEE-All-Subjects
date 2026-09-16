import { createPlayer } from './game-state.js';

const STORAGE_KEY = 'jhsee.adventure.v1';

export function defaultState() {
  return {
    version: 1,
    player: createPlayer(),
    subjectProgress: {},
    levelProgress: {},
    dailyQuest: null,
    wrongQuestions: [],
    skillStats: {},
    attempts: [],
    settings: { sound: true, reducedMotion: false },
    activeRun: null
  };
}

export function createStore(storage = window.localStorage) {
  return {
    load() {
      try {
        const parsed = JSON.parse(storage.getItem(STORAGE_KEY));
        if (!parsed || parsed.version !== 1) return defaultState();
        return { ...defaultState(), ...parsed, player: { ...createPlayer(), ...parsed.player } };
      } catch {
        return defaultState();
      }
    },
    save(state) {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify({ ...defaultState(), ...state, version: 1 }));
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
    reset() {
      storage.removeItem(STORAGE_KEY);
      return defaultState();
    }
  };
}
