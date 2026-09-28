import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateQuestion } from '../js/core/question-bank.js';
import { loadSupplementalQuestionPacks } from '../js/core/question-pack-loader.js';
import { auditBlueprintCoverage } from '../js/core/coverage-audit.js';

const readJson=(path)=>JSON.parse(readFileSync(join(process.cwd(),path),'utf8'));
const subjects=['chinese','english','math','science','social'];

describe('three-year curriculum blueprint',()=>{
  const blueprint=readJson('data/curriculum-blueprint.json');

  it('defines 60 unique high-value skills balanced across five subjects',()=>{
    expect(blueprint.version).toBe(1);
    expect(blueprint.skills).toHaveLength(60);
    expect(new Set(blueprint.skills.map(skill=>skill.id)).size).toBe(60);
    for(const subject of subjects){
      const rows=blueprint.skills.filter(skill=>skill.subject===subject);
      expect(rows).toHaveLength(12);
      expect(new Set(rows.map(skill=>skill.grade))).toEqual(new Set([7,8,9]));
      expect(rows.every(skill=>skill.targetQuestions>=8)).toBe(true);
    }
  });

  it('keeps official curriculum and CAP source references in the blueprint metadata',()=>{
    expect(blueprint.sources.some(source=>source.url.includes('cap.rcpet.edu.tw'))).toBe(true);
    expect(blueprint.sources.some(source=>source.url.includes('naer.edu.tw'))).toBe(true);
  });
});

describe('supplemental question packs',()=>{
  const manifest=readJson('public/question-packs/manifest.json');

  it('ships ten enabled subject packs with 150 high-priority questions',()=>{
    const enabled=manifest.packs.filter(pack=>pack.enabled!==false);
    expect(enabled).toHaveLength(10);
    const all=enabled.flatMap(pack=>readJson('public/question-packs/'+pack.file));
    expect(all).toHaveLength(150);
    for(const subject of subjects){
      expect(all.filter(q=>q.subject===subject)).toHaveLength(30);
    }
  });

  it('keeps pack questions valid, reviewed, aligned, tagged to the blueprint and globally unique',()=>{
    const core=[
      ...readJson('data/questions.json'),
      ...readJson('data/cap-practice.json')
    ];
    const packed=manifest.packs.filter(pack=>pack.enabled!==false)
      .flatMap(pack=>readJson('public/question-packs/'+pack.file));
    const all=[...core,...packed];
    const blueprint=readJson('data/curriculum-blueprint.json');
    const blueprintIds=new Set(blueprint.skills.map(skill=>skill.id));
    expect(new Set(all.map(q=>q.id)).size).toBe(all.length);
    const signatures=all.map(q=>[q.passage??'',q.question??'']
      .join('|').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim());
    expect(new Set(signatures).size).toBe(signatures.length);
    for(const q of packed){
      expect(validateQuestion(q).ok).toBe(true);
      expect(q.examAligned).toBe(true);
      expect(q.reviewStatus).toBe('reviewed');
      expect(q.curriculumSkillId).toMatch(/^jhsee-/);
      expect(blueprintIds.has(q.curriculumSkillId)).toBe(true);
      expect(q.alignmentBasis).toContain('cap.rcpet.edu.tw');
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
    }
  });

  it('loads enabled packs by manifest without requiring app code changes',async()=>{
    const files=new Map();
    files.set('https://example.test/question-packs/manifest.json',manifest);
    for(const pack of manifest.packs){
      files.set('https://example.test/question-packs/'+pack.file,readJson('public/question-packs/'+pack.file));
    }
    const fetchImpl=async url=>{
      const value=files.get(String(url));
      return value
        ? {ok:true,json:async()=>value}
        : {ok:false,json:async()=>null};
    };
    const loaded=await loadSupplementalQuestionPacks({
      manifestUrl:'https://example.test/question-packs/manifest.json',
      fetchImpl
    });
    expect(loaded.questions).toHaveLength(150);
    expect(loaded.warnings).toEqual([]);
    expect(new Set(loaded.questions.map(q=>q.packId)).size).toBe(10);
  });
});

describe('coverage audit',()=>{
  it('quantifies current and expanded coverage by subject and grade',()=>{
    const blueprint=readJson('data/curriculum-blueprint.json');
    const core=[...readJson('data/questions.json'),...readJson('data/cap-practice.json')];
    const manifest=readJson('public/question-packs/manifest.json');
    const packed=manifest.packs.flatMap(pack=>readJson('public/question-packs/'+pack.file));
    const before=auditBlueprintCoverage(core,blueprint);
    const after=auditBlueprintCoverage([...core,...packed],blueprint);
    expect(before.totalQuestions).toBe(205);
    expect(after.totalQuestions).toBe(355);
    for(const subject of subjects){
      expect(after.bySubject[subject].total).toBe(before.bySubject[subject].total+30);
      expect(after.bySubject[subject].coveredSkills).toBe(12);
      expect(after.bySubject[subject].coveredSkills).toBeGreaterThanOrEqual(before.bySubject[subject].coveredSkills);
    }
    expect(Object.values(after.bySubject).reduce((sum,row)=>sum+row.coveredSkills,0)).toBe(60);
    expect(after.totalGap).toBeLessThan(before.totalGap);
  });
});
