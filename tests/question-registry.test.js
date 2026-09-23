import { describe, expect, it } from 'vitest';
import { createQuestionRegistry } from '../js/core/question-registry.js';
import { skillIdentity } from '../js/core/adaptive-learning.js';

const makeQuestion=(id,extra={})=>({
  id,
  subject:'english',
  chapter:'Reading Sky',
  topic:'Inference',
  grade:9,
  difficulty:3,
  question:'What can the reader infer?',
  choices:['A','B','C','D'],
  answer:0,
  explanation:'Because.',
  hint1:'h1',
  hint2:'h2',
  source:'original',
  tags:['reading'],
  domain:'閱讀',
  competency:'閱讀推論',
  questionType:'推論',
  examAligned:true,
  reviewStatus:'reviewed',
  alignmentBasis:'reviewed',
  ...extra
});

describe('question registry',()=>{
  it('indexes local and AI questions by skill, competency, domain and source',()=>{
    const local=makeQuestion('local-1',{packId:'core-v1',packVersion:1,sourceKind:'local-core'});
    const ai=makeQuestion('ai-1',{aiGenerated:true,question:'Different inference question'});
    const registry=createQuestionRegistry([local]);
    const result=registry.registerQuestions([ai],{sourceKind:'ai-cache'});
    const key=skillIdentity(local).key;

    expect(result.accepted).toHaveLength(1);
    expect(registry.bySkillKey(key).map(q=>q.id)).toEqual(expect.arrayContaining(['local-1','ai-1']));
    expect(registry.byCompetency('english','閱讀推論').map(q=>q.id)).toEqual(expect.arrayContaining(['local-1','ai-1']));
    expect(registry.byDomain('english','閱讀').map(q=>q.id)).toEqual(expect.arrayContaining(['local-1','ai-1']));
    expect(registry.stats().sourceKinds).toMatchObject({'local-core':1,'ai-cache':1});
  });

  it('rejects duplicate ids and keeps official lookup-only questions out of variant queries',()=>{
    const local=makeQuestion('same',{sourceKind:'local-core'});
    const registry=createQuestionRegistry([local]);
    expect(registry.registerQuestions([makeQuestion('same')],{sourceKind:'ai-cache'}).rejected).toHaveLength(1);

    registry.registerQuestions([
      makeQuestion('official-1',{source:'official'})
    ],{sourceKind:'official',variantEligible:false,lookupOnly:true});

    expect(registry.getById('official-1')?.id).toBe('official-1');
    expect(registry.allLookupQuestions().map(q=>q.id)).toContain('official-1');
    expect(registry.query({variantEligible:true}).map(q=>q.id)).not.toContain('official-1');
    expect(registry.all().map(q=>q.id)).not.toContain('official-1');
  });

  it('clears a source kind from every index',()=>{
    const registry=createQuestionRegistry([makeQuestion('local',{sourceKind:'local-core'})]);
    registry.registerQuestions([makeQuestion('ai',{question:'AI variant'})],{sourceKind:'ai-cache'});
    registry.clearSource('ai-cache');
    expect(registry.getById('ai')).toBeNull();
    expect(registry.all().map(q=>q.id)).toEqual(['local']);
    expect(registry.byCompetency('english','閱讀推論').map(q=>q.id)).toEqual(['local']);
  });

  it('indexes 5000 questions without losing bucket isolation',()=>{
    const questions=Array.from({length:5000},(_,i)=>makeQuestion(`q-${i}`,{
      competency:i%2===0?'閱讀推論':'主旨理解',
      question:`Question ${i}`,
      sourceKind:'local-pack',
      packId:'bulk'
    }));
    const registry=createQuestionRegistry(questions);
    expect(registry.all()).toHaveLength(5000);
    expect(registry.byCompetency('english','閱讀推論')).toHaveLength(2500);
    expect(registry.byCompetency('english','主旨理解')).toHaveLength(2500);
  });
});
