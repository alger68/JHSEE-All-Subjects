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

  it('exports and restores a validated learning backup', async () => {
    const memory=fakeStorage();
    const store=createStore(memory);
    const original={version:1,player:{exp:321},adaptiveSkills:{x:{mastery:72}},examReports:[{sessionId:'r1'}]};
    store.save(original);
    const backup=store.exportBackup('2026-09-18T06:00:00.000Z');
    expect(backup.meta.format).toBe('jhsee-backup-v1');
    expect(backup.state.player.exp).toBe(321);

    const restored=createStore(fakeStorage());
    const result=restored.importBackup(JSON.stringify(backup));
    expect(result.ok).toBe(true);
    expect(restored.load().player.exp).toBe(321);
    expect(restored.load().adaptiveSkills.x.mastery).toBe(72);
  });

  it('rejects malformed or unsupported backups without overwriting storage', () => {
    const memory=fakeStorage();
    const store=createStore(memory);
    store.save({player:{exp:55}});
    expect(store.importBackup('{"bad":true}').ok).toBe(false);
    expect(store.load().player.exp).toBe(55);
  });

});
