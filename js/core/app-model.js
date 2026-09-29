import { SUBJECT_ORDER } from '../config/subjects.js';

const LEVEL_CHAPTERS = {
  chinese: ['字詞森林', '文言古城', '閱讀聖殿'],
  english: ['Vocabulary Bay', 'Grammar Ridge', 'Reading Sky'],
  math: ['基礎森林', '代數城', '幾何山'],
  science: ['生命雨林', '理化工坊', '地科觀測站'],
  social: ['歷史古道', '地理航線', '公民議會']
};

// Reviewed original CAP-style units available to each adventure stage.
const LEVEL_REVIEWED_CHAPTERS = {
  chinese: [
    ['字音字形與詞語', '語文運用'],
    ['文言文閱讀'],
    ['白話文閱讀', '跨文本與論證', '資料閱讀']
  ],
  english: [
    ['字彙與片語'],
    ['基本文法', '克漏字'],
    ['閱讀理解', '圖表與生活情境']
  ],
  math: [
    ['數與數線', '數與比例', '統計與機率'],
    ['代數與方程式', '函數'],
    ['幾何與圖形']
  ],
  science: [
    ['生物'],
    ['化學', '物理'],
    ['地球科學']
  ],
  social: [
    ['臺灣與世界歷史'],
    ['地理環境與區域'],
    ['公民與社會', '公共議題思辨']
  ]
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

export function levelQuestionPool(bank, subject, levelNumber) {
  const index = Number(levelNumber) - 1;
  const chapter = LEVEL_CHAPTERS[subject]?.[index];
  const reviewedChapters = LEVEL_REVIEWED_CHAPTERS[subject]?.[index] ?? [];
  return (bank.all?.() ?? []).filter((question) => question.subject === subject && (
    !chapter || question.chapter === chapter ||
    (question.examAligned === true && question.reviewStatus === 'reviewed' && reviewedChapters.includes(question.chapter))
  ));
}

export function pickLevelQuestions(bank, subject, levelNumber, count = 5, rng = Math.random) {
  const pool = levelQuestionPool(bank, subject, levelNumber);
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
