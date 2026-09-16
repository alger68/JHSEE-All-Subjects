import { SUBJECT_ORDER } from '../config/subjects.js';

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

export function pickQuickExam(bank, perSubject = 2, rng = Math.random) {
  return SUBJECT_ORDER.flatMap((subject) => bank.pick({ subject }, perSubject, rng));
}
