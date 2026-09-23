import { describe, expect, it, vi } from 'vitest';
import { createQuestionRegistry } from '../js/core/question-registry.js';
import { createQuestionProvider } from '../js/core/question-provider.js';
import { skillIdentity } from '../js/core/adaptive-learning.js';

const makeQuestion=(id,extra={})=>({
  id,
  subject:'english',
  chapter:'Reading Sky',
  topic:'Inference',
  grade:9,
  difficulty:3,
  question:`Question ${id}: what can the reader infer?`,
  passage:`Passage ${id}: a student reads a different notice and draws a conclusion.`,
  choices:['A','B','C','D'],
  answer:0,
  explanation:'Because the passage supports A.',
  hint1:'Look for evidence.',
  hint2:'Compare the choices.',
  source:'original',
  tags:['reading'],
  domain:'閱讀',
  competency:'閱讀推論',
  questionType:'推論',
  variationForm:'notice',
  examAligned:true,
  reviewStatus:'reviewed',
  alignmentBasis:'reviewed',
  ...extra
});

const context=(extra={})=>({
  today:'2026-09-24',
  recentIds:new Set(),
  recentFingerprints:new Set(),
  recentVariationForms:[],
  excludeIds:new Set(),
  excludeFingerprints:new Set(),
  skills:{},
  subjectWeights:null,
  allowAi:true,
  aiAllowance:3,
  ...extra
});

describe('question provider',()=>{
  it('uses a fresh local same-skill variant before AI',async()=>{
    const anchor=makeQuestion('anchor');
    const local=makeQuestion('local-variant',{variationForm:'email'});
    const registry=createQuestionRegistry([anchor,local]);
    const generateAi=vi.fn();
    const provider=createQuestionProvider({registry,generateAi});
    const item={
      questionId:'anchor',
      originalReviewCount:1,
      reviewStage:'same-skill',
      ...skillIdentity(anchor),
      difficulty:3,
      anchorFingerprint:registry.getById('anchor').fingerprint
    };
    const result=await provider.getReviewQuestion(item,context());
    expect(result.question.id).toBe('local-variant');
    expect(result.evidenceKind).toBe('same-skill');
    expect(generateAi).not.toHaveBeenCalled();
  });

  it('uses a local same-competency near-transfer candidate before AI',async()=>{
    const anchor=makeQuestion('anchor');
    const near=makeQuestion('near',{questionType:'公告推論',topic:'Notice inference',variationForm:'dialogue'});
    const registry=createQuestionRegistry([anchor,near]);
    const generateAi=vi.fn();
    const provider=createQuestionProvider({registry,generateAi});
    const item={
      questionId:'anchor',
      originalReviewCount:1,
      reviewStage:'near-transfer',
      ...skillIdentity(anchor),
      difficulty:3,
      anchorFingerprint:registry.getById('anchor').fingerprint
    };
    const result=await provider.getReviewQuestion(item,context());
    expect(result.question.id).toBe('near');
    expect(result.evidenceKind).toBe('near-transfer');
    expect(generateAi).not.toHaveBeenCalled();
  });

  it('never returns the anchor after its one-time review and excludes recent ids',async()=>{
    const anchor=makeQuestion('anchor');
    const recent=makeQuestion('recent',{variationForm:'email'});
    const fresh=makeQuestion('fresh',{variationForm:'dialogue'});
    const registry=createQuestionRegistry([anchor,recent,fresh]);
    const provider=createQuestionProvider({registry,generateAi:vi.fn()});
    const item={
      questionId:'anchor',originalReviewCount:1,reviewStage:'same-skill',
      ...skillIdentity(anchor),difficulty:3,anchorFingerprint:registry.getById('anchor').fingerprint
    };
    const result=await provider.getReviewQuestion(item,context({recentIds:new Set(['recent'])}));
    expect(result.question.id).toBe('fresh');
    expect(result.question.id).not.toBe('anchor');
  });

  it('uses AI only after local candidates are exhausted and accepts a valid new variant',async()=>{
    const anchor=makeQuestion('anchor');
    const registry=createQuestionRegistry([anchor]);
    const generated=makeQuestion('ai-new',{
      question:'What can readers infer about a library return policy?',
      passage:'A library email explains that borrowed devices must be returned before Friday.',
      variationForm:'email'
    });
    const generateAi=vi.fn(async()=>[generated]);
    const provider=createQuestionProvider({registry,generateAi});
    const item={
      questionId:'anchor',originalReviewCount:1,reviewStage:'same-skill',
      ...skillIdentity(anchor),difficulty:3,anchorFingerprint:registry.getById('anchor').fingerprint
    };
    const result=await provider.getReviewQuestion(item,context());
    expect(generateAi).toHaveBeenCalledOnce();
    expect(result.question.id).toBe('ai-new');
    expect(registry.getById('ai-new')).toMatchObject({sourceKind:'ai-cache',aiGenerated:true,qaVersion:2});
  });

  it('rejects AI near-duplicates of the anchor and returns no candidate instead of repeating anchor',async()=>{
    const anchor=makeQuestion('anchor');
    const registry=createQuestionRegistry([anchor]);
    const generated={...anchor,id:'ai-copy'};
    const provider=createQuestionProvider({registry,generateAi:vi.fn(async()=>[generated])});
    const item={
      questionId:'anchor',originalReviewCount:1,reviewStage:'same-skill',
      ...skillIdentity(anchor),difficulty:3,anchorFingerprint:registry.getById('anchor').fingerprint
    };
    const result=await provider.getReviewQuestion(item,context());
    expect(result.question).toBeNull();
    expect(result.warning).toMatch(/沒有足夠的新題/);
    expect(registry.getById('ai-copy')).toBeNull();
  });

  it('does not call AI when disabled or quota is exhausted',async()=>{
    const anchor=makeQuestion('anchor');
    const generateAi=vi.fn();
    const provider=createQuestionProvider({registry:createQuestionRegistry([anchor]),generateAi});
    const item={questionId:'anchor',originalReviewCount:1,reviewStage:'same-skill',...skillIdentity(anchor),difficulty:3};
    expect((await provider.getReviewQuestion(item,context({allowAi:false}))).question).toBeNull();
    expect((await provider.getReviewQuestion(item,context({aiAllowance:0}))).question).toBeNull();
    expect(generateAi).not.toHaveBeenCalled();
  });

  it('does not reuse one variant for two review items in the same review session',async()=>{
    const anchor1=makeQuestion('anchor-1');
    const anchor2=makeQuestion('anchor-2',{question:'Another anchor prompt',passage:'Another anchor passage'});
    const onlyVariant=makeQuestion('variant',{variationForm:'email'});
    const registry=createQuestionRegistry([anchor1,anchor2,onlyVariant]);
    const provider=createQuestionProvider({registry,generateAi:vi.fn()});
    const items=[anchor1,anchor2].map(anchor=>({
      questionId:anchor.id,originalReviewCount:1,reviewStage:'same-skill',
      ...skillIdentity(anchor),difficulty:3,anchorFingerprint:registry.getById(anchor.id).fingerprint
    }));
    const result=await provider.getReviewSession(items,context({allowAi:false}));
    expect(result.questions.map(q=>q.id)).toEqual(['variant']);
    expect(result.skippedReviewIds).toHaveLength(1);
  });

  it('counts practice candidates without calling AI',()=>{
    const local=[makeQuestion('a'),makeQuestion('b',{subject:'math',domain:'代數',competency:'代數推理'})];
    const generateAi=vi.fn();
    const provider=createQuestionProvider({registry:createQuestionRegistry(local),generateAi});
    expect(provider.countPracticeCandidates({subject:'english'},context())).toBe(1);
    expect(generateAi).not.toHaveBeenCalled();
  });
});
