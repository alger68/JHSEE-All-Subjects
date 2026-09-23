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

  it('preserves review v2 fields through save and load without changing the storage key', () => {
    const memory=fakeStorage();
    const store=createStore(memory);
    const wrong={
      questionId:'Q1',
      reviewStage:'near-transfer',
      originalReviewCount:1,
      variantHistory:[{questionId:'Q2',fingerprint:'fp2',correct:true,date:'2026-09-21'}],
      passedFingerprints:['fp2']
    };
    store.save({version:1,wrongQuestions:[wrong]});
    expect([...memory.values.keys()]).toEqual(['jhsee.adventure.v1']);
    expect(store.load().wrongQuestions[0]).toMatchObject(wrong);
  });

  it('imports an old v1 backup and keeps it available for later lazy migration', () => {
    const memory=fakeStorage();
    const store=createStore(memory);
    const backup={
      meta:{format:'jhsee-backup-v1',version:1,exportedAt:'2026-09-18T00:00:00.000Z'},
      state:{
        version:1,
        wrongQuestions:[{questionId:'Q1',mastery:0,wrongCount:1,resolved:false,nextReview:'2026-09-19'}]
      }
    };
    const result=store.importBackup(JSON.stringify(backup));
    expect(result.ok).toBe(true);
    expect(store.load().wrongQuestions[0]).toMatchObject({questionId:'Q1',wrongCount:1});
  });

  it('round-trips review v2 fields through the existing backup format', () => {
    const memory=fakeStorage();
    const store=createStore(memory);
    const wrong={
      questionId:'Q1',
      reviewStage:'delayed-transfer',
      originalReviewCount:1,
      variantHistory:[{questionId:'Q2',fingerprint:'fp2',correct:true,date:'2026-09-21'}],
      passedFingerprints:['fp1','fp2']
    };
    store.save({version:1,wrongQuestions:[wrong]});
    const backup=store.exportBackup('2026-09-24T00:00:00.000Z');
    expect(backup.meta).toMatchObject({format:'jhsee-backup-v1',version:1});

    const restored=createStore(fakeStorage());
    expect(restored.importBackup(backup).ok).toBe(true);
    expect(restored.load().wrongQuestions[0]).toMatchObject(wrong);
  });
});
