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
    adaptiveSkills: {},
    answerHistory: [],
    adaptiveSubjectWeights: null,
    generatedQuestions: [],
    aiUsage: { date: null, count: 0, limit: 12 },
    learningCycles: [],
    currentCycleStartedOn: null,
    attempts: [],
    examReports: [],
    diagnosticBaselines: [],
    mockExamRecords: [],
    admissionProfile: { source:'latest-mock', grades:{}, writing:4, gender:'all', targetSchoolId:'banqiao', preferencePoints:null, balancedPoints:null, servicePoints:null },
    settings: { sound: true, reducedMotion: false },
    activeRun: null,
    activeExam: null,
    examAttemptCounts: {}
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
    exportBackup(exportedAt = new Date().toISOString()) {
      const state=this.load();
      return {
        meta:{format:'jhsee-backup-v1',version:1,exportedAt},
        state
      };
    },
    importBackup(input) {
      try {
        const parsed=typeof input==='string'?JSON.parse(input):input;
        if(parsed?.meta?.format!=='jhsee-backup-v1'||parsed?.meta?.version!==1||parsed?.state?.version!==1){
          return {ok:false,error:'unsupported_backup'};
        }
        const next={...defaultState(),...parsed.state,player:{...createPlayer(),...parsed.state.player},version:1};
        storage.setItem(STORAGE_KEY,JSON.stringify(next));
        return {ok:true,state:next};
      } catch(error) {
        return {ok:false,error:error instanceof Error?error.message:String(error)};
      }
    },
    reset() {
      storage.removeItem(STORAGE_KEY);
      return defaultState();
    }
  };
}
