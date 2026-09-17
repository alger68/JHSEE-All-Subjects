import { describe, expect, it } from 'vitest';
import { OFFICIAL_PAPERS, getOfficialQuestions } from '../js/config/official-papers.js';

describe('115 official source catalog', () => {
  it('builds complete objective papers, without counting manual answers', () => {
    for (const [id, count, first, last] of [
      ['cap115-chinese',42,1,1], ['cap115-english',43,1,2],
      ['cap115-listening',21,2,0], ['cap115-math',25,2,3],
      ['cap115-social',54,0,3], ['cap115-science',50,0,0]
    ]) {
      const questions = getOfficialQuestions(OFFICIAL_PAPERS.find(p => p.id === id));
      expect(questions).toHaveLength(count);
      expect(questions[0].answer).toBe(first);
      expect(questions.at(-1).answer).toBe(last);
      expect(new Set(questions.map(q=>q.id)).size).toBe(count);
      expect(questions.every(q=>q.answer >= 0 && q.answer < q.choices.length)).toBe(true);
    }
  });
  it('retains answer columns after shorter subjects end', () => {
    const answer = (s,n) => getOfficialQuestions(OFFICIAL_PAPERS.find(p=>p.id===`cap115-${s}`))[n-1].answer;
    expect(answer('math',22)).toBe(2);
    expect(answer('social',26)).toBe(1);
    expect(answer('english',43)).toBe(2);
    expect(answer('social',43)).toBe(1);
    expect(answer('science',43)).toBe(1);
    expect(answer('social',51)).toBe(2);
  });
  it('uses three options for listening and no automatic writing score', () => {
    expect(getOfficialQuestions(OFFICIAL_PAPERS.find(p=>p.id==='cap115-listening')).every(q=>q.choices.length===3)).toBe(true);
    expect(getOfficialQuestions(OFFICIAL_PAPERS.find(p=>p.id==='cap115-writing'))).toEqual([]);
  });
});
