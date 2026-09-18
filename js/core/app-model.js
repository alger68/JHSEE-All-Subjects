import { SUBJECT_ORDER } from '../config/subjects.js';

const LEVEL_CHAPTERS = {
  chinese: ['字詞森林', '文言古城', '閱讀聖殿'],
  english: ['Vocabulary Bay', 'Grammar Ridge', 'Reading Sky'],
  math: ['基礎森林', '代數城', '幾何山'],
  science: ['生命雨林', '理化工坊', '地科觀測站'],
  social: ['歷史古道', '地理航線', '公民議會']
};

export function taipeiDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now);
}

export function daysUntil(targetDate, now = new Date()) {
  const current = taipeiDate(now);
  const start = Date.parse(`${current}T00:00:00Z`);
  const target = Date.parse(`${targetDate}T00:00:00Z`);
  return Math.max(0, Math.ceil((target - start) / 86_400_000));
}

export function makeBossQuestions(bank, subject, count = 10, rng = Math.random) {
  const pool = bank.pick({ subject }, count, rng);
  if (!pool.length) return [];
  return Array.from({ length: count }, (_, index) => pool[index % pool.length]);
}

export function pickLevelQuestions(bank, subject, levelNumber, count = 5, rng = Math.random) {
  const chapter = LEVEL_CHAPTERS[subject]?.[Number(levelNumber) - 1];
  const pool = (bank.all?.() ?? []).filter((question) =>
    question.subject === subject && (!chapter || question.chapter === chapter)
  );
  if (!pool.length) return bank.pick({ subject }, count, rng);

  const shuffled = [...pool];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  return Array.from({ length: count }, (_, index) => shuffled[index % shuffled.length]);
}

export function pickQuickExam(bank, perSubject = 2, rng = Math.random) {
  return SUBJECT_ORDER.flatMap((subject) => bank.pick({ subject }, perSubject, rng));
}
