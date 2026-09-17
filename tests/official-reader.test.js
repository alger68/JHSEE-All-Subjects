import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import layouts from '../data/official-115-layout.json';
import { OFFICIAL_PAPERS, getOfficialQuestions } from '../js/config/official-papers.js';
import { renderOfficialQuestion, renderPaperReader } from '../js/ui/official-reader.js';

it('provides locally hosted, bounded original images for all 235 official choices', () => {
  let total=0;
  for(const paper of OFFICIAL_PAPERS) {
    const layout=layouts[paper.section];
    expect(layout.questions).toHaveLength(paper.count);
    expect(layout.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
    for(const page of layout.pages) {
      const bytes=readFileSync(`public/${page.src}`);
      expect(bytes.length).toBeGreaterThan(1000);
      expect(bytes.subarray(0,4).toString()).toBe('RIFF');
      expect(bytes.subarray(8,12).toString()).toBe('WEBP');
    }
    for(const [index,q] of layout.questions.entries()) {
      expect(q.number).toBe(index+1);total++;
      for(const region of [q.region,...q.shared]) {
        const page=layout.pages[region.page-1];
        const [x,y,w,h]=region.box;
        expect(x).toBeGreaterThanOrEqual(0);expect(y).toBeGreaterThanOrEqual(0);
        expect(w).toBeGreaterThan(0);expect(h).toBeGreaterThan(0);
        expect(x+w).toBeLessThanOrEqual(page.width+0.1);
        expect(y+h).toBeLessThanOrEqual(page.height+0.1);
      }
    }
  }
  expect(total).toBe(235);
});
it('retains the map above social question 40 and full bottom-row answer choices',()=>{
  const social=layouts.social.questions;
  expect(social[39].region.box[1]).toBeLessThan(149);
  expect(social[40].region.box[1]).toBeLessThan(474);
  expect(social[42].region.box[1]+social[42].region.box[3]).toBeGreaterThan(448);
  for(const n of [4,17,22,25,32,36]) {
    const [x,y,w,h]=layouts.chinese.questions[n-1].region.box;
    expect(y+h).toBeGreaterThan(755);
  }
});
it('keeps overhanging figures intact without masking their content',()=>{
  const figures=[
    ['social',3,[302.9,333.1,530.1,482]],['social',5,[349.1,593.1,529.1,724.5]],
    ['social',7,[345.4,181.6,530.1,333.6]],['social',9,[403.3,504.1,529.8,680.5]],
    ['social',21,[376.6,353.3,529,413]],['social',24,[388.5,190.6,528,221]],
    ['social',34,[412.8,575.7,530.4,746.7]],['social',40,[309,149,529,449]],
    ['science',4,[332.9,422.2,533.2,533.3]]
  ];
  for(const [subject,n,[left,top,right,bottom]] of figures){
    const region=layouts[subject].questions[n-1].region;
    const [x,y,w,h]=region.box;
    expect(x).toBeLessThanOrEqual(left);expect(y).toBeLessThanOrEqual(top);
    expect(x+w).toBeGreaterThanOrEqual(right);expect(y+h).toBeGreaterThanOrEqual(bottom);
    for(const [mx,my,mw,mh] of region.masks??[])
      expect(mx+mw<=left||mx>=right||my+mh<=top||my>=bottom).toBe(true);
  }
});
it('keeps cross-page passages and diagrams available on every question in the group', () => {
  for(const [subject,start,end,page] of [['chinese',26,29,8],['english',35,39,12],['math',23,25,10]]) {
    const questions=layouts[subject].questions.slice(start-1,end);
    expect(questions.every(q=>q.shared.some(r=>r.page===page))).toBe(true);
    expect(questions.every(q=>JSON.stringify(q.shared)===JSON.stringify(questions[0].shared))).toBe(true);
  }
});
it('renders a single official question plus its shared material without an iframe or external navigation', () => {
  const paper=OFFICIAL_PAPERS.find(p=>p.section==='english');
  const q=getOfficialQuestions(paper)[34];
  document.body.innerHTML=renderOfficialQuestion(paper,q);
  expect(document.querySelector('[data-official-question="35"]')).not.toBeNull();
  expect(document.querySelectorAll('.official-shared svg')).toHaveLength(1);
  expect(document.querySelector('iframe')).toBeNull();
  expect(document.querySelector('a[target="_blank"]')).toBeNull();
});
it('offers whole-paper navigation and includes manual and formula pages', () => {
  const paper=OFFICIAL_PAPERS.find(p=>p.section==='math');
  document.body.innerHTML=renderPaperReader(paper,{paperPage:14});
  expect(document.querySelector('[data-action="paper-page-next"]').disabled).toBe(true);
  expect(document.querySelector('[data-paper-page]').textContent).toContain('14 / 14');
  expect(layouts.math.manual).toHaveLength(2);
  expect(layouts.math.formula.page).toBe(14);
  expect(layouts.writing.manual[0].page).toBe(3);
});
