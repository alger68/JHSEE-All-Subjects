import { describe, expect, it } from 'vitest';
import { createStore } from '../js/core/storage.js';

function fakeStorage() {
  const values = new Map();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
}

describe('adventure storage', () => {
  it('saves all state in one namespaced record', () => {
    const memory = fakeStorage();
    const store = createStore(memory);
    store.save({ player: { exp: 20 } });
    expect([...memory.values.keys()]).toEqual(['jhsee.adventure.v1']);
    expect(store.load().player.exp).toBe(20);
  });

  it('returns safe defaults for corrupt json', () => {
    const memory = fakeStorage();
    memory.values.set('jhsee.adventure.v1', '{bad json');
    expect(createStore(memory).load()).toMatchObject({ version: 1, player: { level: 1 } });
  });
});
