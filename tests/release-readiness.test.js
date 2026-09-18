import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { OFFICIAL_PAPERS, getOfficialQuestions } from '../js/config/official-papers.js';

const layouts=JSON.parse(readFileSync('data/official-115-layout.json','utf8'));

describe('release readiness: official 115 assets',()=>{
  it('has a complete sequential layout for every scored official paper',()=>{
    for(const paper of OFFICIAL_PAPERS.filter(p=>p.count>0)){
      const layout=layouts[paper.section];
      expect(layout, paper.id).toBeTruthy();
      expect(layout.questions, paper.id).toHaveLength(paper.count);
      expect(getOfficialQuestions(paper), paper.id).toHaveLength(paper.count);
      expect(layout.questions.map(q=>q.number), paper.id)
        .toEqual(Array.from({length:paper.count},(_,i)=>i+1));
      expect(new Set(getOfficialQuestions(paper).map(q=>q.id)).size, paper.id).toBe(paper.count);
      for(const q of layout.questions){
        expect(q.region?.page, `${paper.id} q${q.number}`).toBeGreaterThanOrEqual(1);
        expect(q.region?.page, `${paper.id} q${q.number}`).toBeLessThanOrEqual(layout.pages.length);
        expect(q.region?.box, `${paper.id} q${q.number}`).toHaveLength(4);
      }
    }
  });

  it('ships every referenced official page and the listening audio',()=>{
    for(const [section,layout] of Object.entries(layouts)){
      const refs=new Set(layout.pages.map(page=>page.src));
      expect(refs.size, section).toBe(layout.pages.length);
      for(const src of refs){
        expect(existsSync(`public/${src}`), src).toBe(true);
        expect(readFileSync(`public/${src}`).length, src).toBeGreaterThan(1000);
      }
    }
    expect(existsSync('public/official/115/listening/full-exam.mp3')).toBe(true);
    expect(readFileSync('public/official/115/listening/full-exam.mp3').length).toBeGreaterThan(1000);
  });

  it('has all 43 English reading questions across the full paper, not only section one',()=>{
    const english=layouts.english;
    expect(english.questions).toHaveLength(43);
    expect(english.pages).toHaveLength(15);
    expect(english.questions[0].number).toBe(1);
    expect(english.questions[19].number).toBe(20);
    expect(english.questions[42].number).toBe(43);
    expect(english.questions[19].region.page).toBeGreaterThan(3);
    expect(english.questions[42].region.page).toBe(15);
    expect(english.questions[42].group).toBe('40–43');
  });
});
