import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { orderPracticeChoices } from '../js/core/choice-order.js';

const read=path=>JSON.parse(readFileSync(path,'utf8'));
const manifest=read('public/question-packs/manifest.json');
const questions=[...read('data/questions.json'),...read('data/cap-practice.json'),
  ...manifest.packs.filter(pack=>pack.enabled!==false).flatMap(pack=>read(`public/question-packs/${pack.file}`))];

describe('original question option order',()=>{
  it('preserves the correct choice text and keeps each subject close to a balanced A–D key',()=>{
    for(const subject of ['chinese','english','math','science','social']){
      const subjectQuestions=questions.filter(q=>q.subject===subject);
      const positions=[0,0,0,0];
      for(const q of subjectQuestions){
        const displayed=orderPracticeChoices(q);
        expect(displayed.choices[displayed.answer],q.id).toBe(q.choices[q.answer]);
        expect([...displayed.choices].sort(),q.id).toEqual([...q.choices].sort());
        expect(q.choices[q.answer],q.id).toBe(questions.find(item=>item.id===q.id).choices[q.answer]);
        positions[displayed.answer]+=1;
      }
      expect(Math.max(...positions)-Math.min(...positions),subject).toBeLessThanOrEqual(8);
    }
  });

  it('leaves official paper positions unchanged and remaps option-specific error tags',()=>{
    const official={id:'cap115-listening-1',source:'official',choices:['A','B','C'],answer:2};
    expect(orderPracticeChoices(official)).toBe(official);
    const original={id:'sample-1',source:'original',choices:['one','two','three','four'],answer:0,errorTags:{1:'reading'}};
    const ordered=orderPracticeChoices(original);
    const position=ordered.choices.indexOf('two');
    expect(ordered.errorTags[position]).toBe('reading');
    expect(orderPracticeChoices(original)).toEqual(ordered);
  });

  it('has no fixed option letters in explanations or hints that could contradict rotated choices',()=>{
    const fixedLetter=/(?:選項\s*[A-DＡ-Ｄ]|[A-DＡ-Ｄ]\s*選項|(?:故選|應選|答案為)\s*[A-DＡ-Ｄ])/i;
    for(const q of questions){
      for(const field of ['explanation','hint1','hint2']){
        expect(fixedLetter.test(q[field]??''),`${q.id} ${field}`).toBe(false);
      }
    }
  });
});
