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

  it('preserves review-v2 fields through save and load without changing the storage key',()=>{
    const memory=fakeStorage();
    const store=createStore(memory);
    const wrong={
      questionId:'Q1',
      reviewStage:'near-transfer',
      originalReviewCount:1,
      anchorFingerprint:'fp-anchor',
      variantHistory:[{questionId:'Q2',fingerprint:'fp2',correct:true,date:'2026-09-29',evidenceKind:'same-skill'}],
      passedFingerprints:['fp-anchor','fp2'],
      wrongCount:1,
      mastery:1,
      resolved:false,
      nextReview:'2026-10-06'
    };
    store.save({version:1,wrongQuestions:[wrong]});
    expect([...memory.values.keys()]).toEqual(['jhsee.adventure.v1']);
    expect(store.load().wrongQuestions[0]).toMatchObject(wrong);
  });

  it('round-trips review-v2 wrong items through the existing jhsee-backup-v1 format',()=>{
    const memory=fakeStorage();
    const store=createStore(memory);
    const wrong={
      questionId:'Q1',
      reviewStage:'delayed-transfer',
      originalReviewCount:1,
      variantHistory:[{questionId:'Q3',fingerprint:'fp3',correct:true,date:'2026-09-29',evidenceKind:'near-transfer'}],
      passedFingerprints:['fp1','fp2','fp3'],
      wrongCount:1,
      mastery:2,
      resolved:false
    };
    store.save({version:1,wrongQuestions:[wrong]});
    const backup=store.exportBackup('2026-09-29T00:00:00.000Z');
    expect(backup.meta).toMatchObject({format:'jhsee-backup-v1',version:1});
    const restored=createStore(fakeStorage());
    expect(restored.importBackup(backup).ok).toBe(true);
    expect(restored.load().wrongQuestions[0]).toMatchObject(wrong);
  });

  it('clears old fixed-student subject weights while keeping study history and stages',()=>{
    const memory=fakeStorage();
    const history=[{questionId:'EN-1',subject:'english',correct:false}];
    memory.values.set('jhsee.adventure.v1',JSON.stringify({
      version:1,adaptiveSubjectWeights:{english:30,science:20,math:20,social:15,chinese:10},
      answerHistory:history,levelProgress:{'english-1':{cleared:true}}
    }));
    const restored=createStore(memory).load();
    expect(restored.adaptiveSubjectWeights).toBeNull();
    expect(restored.answerHistory).toEqual(history);
    expect(restored.levelProgress['english-1'].cleared).toBe(true);
  });

  it('keeps current personalized weights and seven-day task progress after backup restore',()=>{
    const original=createStore(fakeStorage());
    original.save({
      adaptiveSubjectWeights:{english:25,science:15,math:20,social:25,chinese:15},
      repairPlan:{mockId:'m1',startedOn:'2026-09-17',progress:{'2026-09-17:english':4}}
    });
    const restored=createStore(fakeStorage());
    expect(restored.importBackup(original.exportBackup()).ok).toBe(true);
    expect(restored.load().adaptiveSubjectWeights.english).toBe(25);
    expect(restored.load().repairPlan.progress['2026-09-17:english']).toBe(4);
  });
});
