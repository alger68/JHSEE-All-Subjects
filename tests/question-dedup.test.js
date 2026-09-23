import { describe, expect, it } from 'vitest';
import {
  normalizeQuestionText,
  questionFingerprint,
  questionSimilarity,
  isNearDuplicate,
  dedupeQuestions
} from '../js/core/question-dedup.js';

const q = (id, question, extra={}) => ({
  id,
  subject:'english',
  question,
  passage:'Tom missed the bus because he woke up late.',
  questionType:'推論',
  competency:'閱讀推論',
  ...extra
});

describe('question dedup', () => {
  it('normalizes whitespace, case, full-width punctuation, and non-semantic punctuation', () => {
    expect(normalizeQuestionText('  TOM，  woke up! ')).toBe(normalizeQuestionText('tom woke up'));
  });

  it('gives equivalent formatting the same fingerprint', () => {
    expect(questionFingerprint(q('a','Why was TOM late?')))
      .toBe(questionFingerprint(q('b',' why was tom late ')));
  });

  it('flags name-swapped near copies as highly similar', () => {
    const a=q('a','Why did Tom miss the bus?');
    const b=q('b','Why did Kevin miss the train?',{
      passage:'Kevin missed the train because he woke up late.'
    });
    expect(questionSimilarity(a,b)).toBeGreaterThanOrEqual(0.70);
    expect(isNearDuplicate(b,a)).toBe(true);
  });

  it('keeps genuinely different contexts below the blocking threshold', () => {
    const a=q('a','Why did Tom miss the bus?');
    const b=q('b','What can readers infer about the store policy?',{
      passage:'The notice says returns require a receipt within seven days.',
      questionType:'公告推論'
    });
    expect(questionSimilarity(a,b)).toBeLessThan(0.70);
  });

  it('dedupes against references and items accepted in the same batch', () => {
    const base=q('a','Why did Tom miss the bus?');
    const near=q('b','Why did Kevin miss the train?',{passage:'Kevin missed the train because he woke up late.'});
    const fresh=q('c','What can readers infer about the store policy?',{passage:'Returns require a receipt within seven days.',questionType:'公告推論'});
    const duplicateFresh={...fresh,id:'d'};
    const result=dedupeQuestions([near,fresh,duplicateFresh],[base]);
    expect(result.accepted.map(item=>item.id)).toEqual(['c']);
    expect(result.rejected).toHaveLength(2);
  });
});
