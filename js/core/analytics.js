export function updateSkillStats(stats, question, correct) {
  const next = structuredClone(stats);
  const subjectKey = `subject:${question.subject}`;
  const topicKey = `${question.subject}:${question.topic}`;
  for (const key of [subjectKey, topicKey]) {
    const item = next[key] ?? { attempts: 0, correct: 0 };
    next[key] = { attempts: item.attempts + 1, correct: item.correct + (correct ? 1 : 0) };
  }
  return next;
}

function summarize(item, minSamples) {
  const accuracy = item.attempts ? Math.round((item.correct / item.attempts) * 100) : 0;
  let status = 'on-track';
  if (item.attempts < minSamples) status = 'insufficient-data';
  else if (accuracy < 70) status = 'needs-work';
  return { ...item, accuracy, status };
}

export function summarizeSkills(stats, minSamples = 3) {
  const subjects = {};
  const topics = {};
  for (const [key, item] of Object.entries(stats)) {
    if (key.startsWith('subject:')) subjects[key.slice(8)] = summarize(item, minSamples);
    else topics[key] = summarize(item, minSamples);
  }
  return { subjects, topics };
}
