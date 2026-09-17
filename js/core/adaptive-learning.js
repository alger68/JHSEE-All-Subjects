import { PERSONAL_DIAGNOSTIC, personalizedQuestionScore } from './personalization.js';

export const ADAPTIVE_VERSION = 1;
export const REVIEW_STEPS = [1, 3, 7, 14, 30];

export const SUBJECT_LIMITS = Object.freeze({
  english: { min: 15, max: 45 },
  science: { min: 10, max: 35 },
  math: { min: 10, max: 35 },
  social: { min: 5, max: 25 },
  chinese: { min: 5, max: 20 }
});

const SUBJECTS = ['chinese', 'english', 'math', 'science', 'social'];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function addDays(date, days) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function skillIdentity(question) {
  const domain = question?.examProfile?.domain && question.examProfile.domain !== '未分類'
    ? question.examProfile.domain
    : question?.domain || question?.chapter || '一般';
  const competency = question?.examProfile?.competency && question.examProfile.competency !== '未分類'
    ? question.examProfile.competency
    : question?.competency || question?.questionType || question?.topic || '核心概念';
  const subSkill = question?.questionType || question?.examProfile?.type || question?.topic || competency;
  return {
    subject: question?.subject || 'unknown',
    domain,
    competency,
    subSkill,
    key: [question?.subject || 'unknown', domain, competency].join('::')
  };
}

export function defaultSkillProfile(question) {
  const skill = skillIdentity(question);
  return {
    ...skill,
    mastery: 60,
    attempts: 0,
    correct: 0,
    wrong: 0,
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
    wrongLast7Days: 0,
    attemptsLast7Days: 0,
    wrongInMockExam: 0,
    lastPracticeDate: null,
    lastWrongDate: null,
    nextReviewDate: null,
    reviewStage: 0,
    priorityScore: 40,
    status: 'learning',
    diagnosticRequired: false,
    lastMode: 'normal'
  };
}

export function practiceMode(profile) {
  if ((profile?.consecutiveWrong ?? 0) >= 4 || profile?.diagnosticRequired) return 'diagnostic';
  if ((profile?.consecutiveWrong ?? 0) === 3) return 'remediation';
  if ((profile?.consecutiveWrong ?? 0) === 2) return 'near-transfer';
  if ((profile?.consecutiveWrong ?? 0) === 1) return 'confirmation';
  if ((profile?.mastery ?? 0) >= 90) return 'maintenance';
  return 'normal';
}

export function skillStatus(mastery) {
  if (mastery < 40) return 'weak';
  if (mastery < 60) return 'learning';
  if (mastery < 80) return 'stable';
  if (mastery < 90) return 'strong';
  return 'mastered';
}

function difficultyMultiplier(difficulty = 3) {
  return ({ 1: 0.7, 2: 0.85, 3: 1, 4: 1.2, 5: 1.4 })[clamp(Number(difficulty) || 3, 1, 5)];
}

function sourceMultiplier(sourceKind = 'practice') {
  if (sourceKind === 'mock') return 1.4;
  if (sourceKind === 'official') return 1.25;
  if (sourceKind === 'review') return 1.05;
  return 1;
}

export function masteryDelta(profile, { correct, difficulty = 3, hinted = false, uncertain = false, sourceKind = 'practice' }) {
  const diff = difficultyMultiplier(difficulty);
  const source = sourceMultiplier(sourceKind);
  if (correct) {
    let delta = 8 * diff * source;
    if (hinted) delta *= 0.5;
    if (uncertain) delta *= 0.75;
    return Math.max(2, Math.round(delta));
  }
  const streak = profile?.consecutiveWrong ?? 0;
  const base = streak >= 3 ? 8 : 10 + Math.min(streak, 2) * 3;
  return -Math.max(6, Math.round(base * diff * source));
}

function priorityScore(profile, today) {
  const mastery = profile?.mastery ?? 60;
  const attempts = profile?.attempts ?? 0;
  const wrong = profile?.wrong ?? 0;
  const recentErrorRate = profile?.attemptsLast7Days
    ? profile.wrongLast7Days / profile.attemptsLast7Days
    : attempts ? wrong / attempts : 0;
  const weaknessScore = 100 - mastery;
  const recentErrorScore = Math.round(recentErrorRate * 100);
  const repeatErrorScore = clamp((profile?.consecutiveWrong ?? 0) * 35, 0, 100);
  const reviewDueScore = profile?.nextReviewDate && profile.nextReviewDate <= today ? 100 : 0;
  const mockExamScore = clamp((profile?.wrongInMockExam ?? 0) * 35, 0, 100);
  return clamp(Math.round(
    weaknessScore * 0.30 +
    recentErrorScore * 0.20 +
    repeatErrorScore * 0.20 +
    80 * 0.15 +
    reviewDueScore * 0.10 +
    mockExamScore * 0.05
  ), 0, 100);
}

export function recordAdaptiveAttempt(skills = {}, history = [], question, attempt) {
  const today = attempt.date;
  const identity = skillIdentity(question);
  const previous = skills[identity.key] ?? defaultSkillProfile(question);
  const correct = Boolean(attempt.correct);
  const delta = masteryDelta(previous, {
    correct,
    difficulty: question?.difficulty ?? 3,
    hinted: Boolean(attempt.hinted),
    uncertain: Boolean(attempt.uncertain),
    sourceKind: attempt.sourceKind
  });
  const mastery = clamp((previous.mastery ?? 60) + delta, 0, 100);
  const consecutiveCorrect = correct ? (previous.consecutiveCorrect ?? 0) + 1 : 0;
  const consecutiveWrong = correct ? 0 : (previous.consecutiveWrong ?? 0) + 1;
  let reviewStage = previous.reviewStage ?? 0;
  if (correct) reviewStage = clamp(reviewStage + 1, 0, REVIEW_STEPS.length - 1);
  else reviewStage = 0;
  const nextReviewDate = addDays(today, correct ? REVIEW_STEPS[reviewStage] : 1);

  const sevenDayCutoff = addDays(today, -6);
  const recent = history.filter((item) =>
    item.skillKey === identity.key &&
    item.date >= sevenDayCutoff &&
    item.date <= today
  );
  const attemptsLast7Days = recent.length + 1;
  const wrongLast7Days = recent.filter((item) => !item.correct).length + (correct ? 0 : 1);

  const next = {
    ...previous,
    ...identity,
    mastery,
    attempts: (previous.attempts ?? 0) + 1,
    correct: (previous.correct ?? 0) + (correct ? 1 : 0),
    wrong: (previous.wrong ?? 0) + (correct ? 0 : 1),
    consecutiveCorrect,
    consecutiveWrong,
    attemptsLast7Days,
    wrongLast7Days,
    wrongInMockExam: (previous.wrongInMockExam ?? 0) + (!correct && attempt.sourceKind === 'mock' ? 1 : 0),
    lastPracticeDate: today,
    lastWrongDate: correct ? previous.lastWrongDate : today,
    nextReviewDate,
    reviewStage,
    status: skillStatus(mastery),
    diagnosticRequired: consecutiveWrong >= 4,
    lastMode: practiceMode({ ...previous, mastery, consecutiveCorrect, consecutiveWrong, diagnosticRequired: consecutiveWrong >= 4 })
  };
  next.priorityScore = priorityScore(next, today);

  const entry = {
    questionId: question?.id,
    subject: identity.subject,
    skillKey: identity.key,
    domain: identity.domain,
    competency: identity.competency,
    subSkill: identity.subSkill,
    correct,
    hinted: Boolean(attempt.hinted),
    uncertain: Boolean(attempt.uncertain),
    selectedChoice: attempt.selectedChoice,
    errorReason: attempt.errorReason ?? null,
    difficulty: question?.difficulty ?? 3,
    sourceKind: attempt.sourceKind ?? 'practice',
    date: today,
    at: attempt.at ?? new Date().toISOString(),
    masteryBefore: previous.mastery ?? 60,
    masteryAfter: mastery,
    priorityAfter: next.priorityScore
  };

  return {
    skills: { ...skills, [identity.key]: next },
    history: [...history, entry].slice(-1000),
    profile: next,
    entry
  };
}

export function refreshPriorities(skills = {}, today) {
  return Object.fromEntries(Object.entries(skills).map(([key, profile]) => [
    key,
    { ...profile, priorityScore: priorityScore(profile, today), status: skillStatus(profile.mastery ?? 60) }
  ]));
}

function subjectWeakness(skills, subject) {
  const list = Object.values(skills)
    .filter((profile) => profile.subject === subject)
    .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0))
    .slice(0, 3);
  if (!list.length) return 50;
  return Math.round(list.reduce((sum, item) => sum + (item.priorityScore ?? 0), 0) / list.length);
}

export function calculateSubjectWeights(skills = {}, previousWeights = null, diagnostic = PERSONAL_DIAGNOSTIC) {
  const raw = {};
  for (const subject of SUBJECTS) {
    const base = diagnostic.subjectWeights?.[subject] ?? 10;
    const weakness = subjectWeakness(skills, subject);
    raw[subject] = base * (0.7 + weakness / 100);
  }
  const rawTotal = Object.values(raw).reduce((sum, value) => sum + value, 0) || 1;
  const normalized = Object.fromEntries(SUBJECTS.map((subject) => [subject, raw[subject] / rawTotal * 100]));

  const smoothed = {};
  for (const subject of SUBJECTS) {
    const previous = previousWeights?.[subject] ?? normalized[subject];
    const target = previous * 0.7 + normalized[subject] * 0.3;
    const limits = SUBJECT_LIMITS[subject];
    smoothed[subject] = clamp(target, limits.min, limits.max);
  }
  const total = Object.values(smoothed).reduce((sum, value) => sum + value, 0) || 1;
  return Object.fromEntries(SUBJECTS.map((subject) => [subject, Math.round(smoothed[subject] / total * 1000) / 10]));
}

export function questionAdaptiveScore(question, skills = {}, subjectWeights = null, today = '', diagnostic = PERSONAL_DIAGNOSTIC) {
  const identity = skillIdentity(question);
  const profile = skills[identity.key];
  const subjectWeight = subjectWeights?.[question.subject] ?? diagnostic.subjectWeights?.[question.subject] ?? 10;
  const skillPriority = profile?.priorityScore ?? 40;
  const dueBoost = profile?.nextReviewDate && profile.nextReviewDate <= today ? 24 : 0;
  const repeatBoost = clamp((profile?.consecutiveWrong ?? 0) * 12, 0, 48);
  const diagnosticBoost = profile?.diagnosticRequired ? 26 : 0;
  const alignedBoost = question?.examAligned ? 6 : 0;
  const seedBoost = personalizedQuestionScore(question, diagnostic) * 0.25;
  return subjectWeight * 1.2 + skillPriority * 1.4 + dueBoost + repeatBoost + diagnosticBoost + alignedBoost + seedBoost;
}

function weightedPickWithoutReplacement(items, count, scoreFn, rng = Math.random) {
  const pool = [...items];
  const picked = [];
  while (pool.length && picked.length < count) {
    const scored = pool.map((item) => Math.max(0.001, scoreFn(item)));
    const total = scored.reduce((sum, value) => sum + value, 0);
    let ticket = rng() * total;
    let index = 0;
    for (; index < pool.length - 1; index += 1) {
      ticket -= scored[index];
      if (ticket <= 0) break;
    }
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}

export function adaptiveRankQuestions(questions, {
  skills = {},
  subjectWeights = null,
  today = '',
  diagnostic = PERSONAL_DIAGNOSTIC
} = {}) {
  return [...questions].sort((a, b) =>
    questionAdaptiveScore(b, skills, subjectWeights, today, diagnostic) -
    questionAdaptiveScore(a, skills, subjectWeights, today, diagnostic)
  );
}

export function buildAdaptivePractice(questions, count, {
  skills = {},
  subjectWeights = null,
  today = '',
  diagnostic = PERSONAL_DIAGNOSTIC,
  rng = Math.random
} = {}) {
  if (!questions.length || count <= 0) return [];
  const due = questions.filter((q) => {
    const p = skills[skillIdentity(q).key];
    return p?.nextReviewDate && p.nextReviewDate <= today;
  });
  const weak = questions.filter((q) => {
    const p = skills[skillIdentity(q).key];
    return (p?.priorityScore ?? 0) >= 70 || (p?.mastery ?? 100) < 60;
  });
  const strong = questions.filter((q) => {
    const p = skills[skillIdentity(q).key];
    return (p?.mastery ?? 0) >= 80;
  });

  const targets = {
    weak: Math.round(count * 0.45),
    due: Math.round(count * 0.25),
    mixed: Math.round(count * 0.20)
  };
  targets.challenge = Math.max(0, count - targets.weak - targets.due - targets.mixed);

  const chosen = [];
  const used = new Set();
  const add = (pool, n) => {
    const available = pool.filter((q) => !used.has(q.id));
    for (const q of weightedPickWithoutReplacement(
      available,
      n,
      (item) => questionAdaptiveScore(item, skills, subjectWeights, today, diagnostic) ** 1.15,
      rng
    )) {
      chosen.push(q);
      used.add(q.id);
    }
  };

  add(weak, targets.weak);
  add(due, targets.due);
  add(questions, targets.mixed);
  add(strong, targets.challenge);
  add(questions, count - chosen.length);
  return chosen.slice(0, count);
}

export function adaptiveDashboard(skills = {}, subjectWeights = null, today = '') {
  const ranked = Object.values(refreshPriorities(skills, today))
    .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));
  return {
    topSkills: ranked.slice(0, 8),
    subjectWeights,
    weakCount: ranked.filter((item) => (item.priorityScore ?? 0) >= 70).length,
    diagnosticCount: ranked.filter((item) => item.diagnosticRequired).length,
    dueCount: ranked.filter((item) => item.nextReviewDate && item.nextReviewDate <= today).length
  };
}
