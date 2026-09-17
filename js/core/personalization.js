/**
 * Fixed diagnostic imported from 宥廷's first mock-exam result.  This is kept
 * separate from answer statistics so a fresh browser can still make a useful
 * recommendation before enough local attempts have accumulated.
 */
export const PERSONAL_DIAGNOSTIC = Object.freeze({
  student: '宥廷',
  source: '第一次模考',
  subjectWeights: Object.freeze({ english: 30, science: 20, math: 20, social: 15, chinese: 10 }),
  focuses: Object.freeze([
    Object.freeze({ id: 'english-reading', label: '英文閱讀', subject: 'english', result: '31 / 43', priority: '最高', recommendation: '每天 1 篇會考式閱讀，標記主旨、細節、推論與圖表題。', match: /reading|閱讀|圖表/i }),
    Object.freeze({ id: 'science-physics-chemistry', label: '自然理化', subject: 'science', result: '20 / 25', priority: '最高', recommendation: '優先練習物理、化學、資料分析與情境應用。', match: /理化|物理|化學|電學|力與運動|酸鹼/i }),
    Object.freeze({ id: 'math-nonselective', label: '數學非選', subject: 'math', result: '4 / 6', priority: '高', recommendation: '練習列式、計算過程、單位與最後答案；選擇題維持少錯。', match: /資料分析|情境應用|推論|非選/i }),
    Object.freeze({ id: 'social-history-civics', label: '歷史／公民', subject: 'social', result: '30 / 36', priority: '高', recommendation: '歷史與公民輪替，地理以維持題為主。', match: /歷史|公民|臺灣與世界歷史|公民與社會|公共議題/i })
  ])
});

const focusMatch = (question, focus) => {
  if (question?.subject !== focus.subject) return false;
  return focus.match.test([
    question.chapter,
    question.domain,
    question.topic,
    question.questionType,
    question.competency
  ].filter(Boolean).join(' '));
};

export function personalizedQuestionScore(question, diagnostic = PERSONAL_DIAGNOSTIC) {
  const subjectWeight = diagnostic.subjectWeights?.[question?.subject] ?? 0;
  const focusBoost = diagnostic.focuses
    .filter((focus) => focusMatch(question, focus))
    .reduce((sum, focus) => sum + (focus.priority === '最高' ? 24 : 16), 0);
  const examBoost = question?.examAligned ? 2 : 0;
  return subjectWeight + focusBoost + examBoost;
}

export function prioritizeQuestions(questions, diagnostic = PERSONAL_DIAGNOSTIC) {
  return questions
    .map((question, index) => ({ question, index }))
    .sort((a, b) => personalizedQuestionScore(b.question, diagnostic) - personalizedQuestionScore(a.question, diagnostic) || a.index - b.index)
    .map(({ question }) => question);
}

export function diagnosticCards(diagnostic = PERSONAL_DIAGNOSTIC) {
  return diagnostic.focuses.map(({ label, result, priority, recommendation }) => ({ label, result, priority, recommendation }));
}
