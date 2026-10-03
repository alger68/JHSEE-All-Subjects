// A stable order keeps resumed sessions and saved answer letters meaningful.
// Official choices must always match the printed paper.
export function orderPracticeChoices(question) {
  if (question?.source !== 'original' || question.choices?.length !== 4) return question;
  let hash = 0x811c9dc5;
  for (const char of question.id) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193);
  const target = (hash >>> 0) % 4;
  const shift = (target - question.answer + 4) % 4;
  const oldIndex = index => (index - shift + 4) % 4;
  const errorTags = question.errorTags;
  return {
    ...question,
    choices: question.choices.map((_, index) => question.choices[oldIndex(index)]),
    answer: target,
    ...(errorTags ? { errorTags: Array.isArray(errorTags)
      ? errorTags.map((_, index) => errorTags[oldIndex(index)])
      : Object.fromEntries([0,1,2,3].filter(index=>errorTags[oldIndex(index)] !== undefined)
        .map(index=>[index,errorTags[oldIndex(index)]])) } : {})
  };
}
