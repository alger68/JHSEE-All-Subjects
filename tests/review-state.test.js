import { describe, expect, it } from 'vitest';
import {
  REVIEW_STAGES,
  enrichWrongItem,
  migrateWrongQuestions,
  recordReviewEvidence,
  canResolveReview
} from '../js/core/review-state.js';
import { questionFingerprint } from '../js/core/question-dedup.js';

const q=(id,extra={})=>({
  id,
  subject:'english',
  chapter:'Reading Sky',
  topic:'Inference',
  grade:9,
  difficulty:3,
  question:`Question ${id}`,
  passage:`Passage ${id}`,
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
  variationForm:'notice',
  ...extra
});

describe('review state v2',()=>{
  it('migrates a legacy wrong item from its original question',()=>{
    const original=q('Q1');
    const result=enrichWrongItem({
      questionId:'Q1',mastery:0,wrongCount:1,resolved:false,nextReview:'2026-09-25',lastReviewed:'2026-09-24'
    },original);
    expect(result).toMatchObject({
      questionId:'Q1',
      subject:'english',
      domain:'閱讀',
      competency:'閱讀推論',
      difficulty:3,
      originalReviewCount:0,
      reviewStage:'anchor',
      variantHistory:[],
      passedFingerprints:[],
      available:true
    });
    expect(result.anchorFingerprint).toBe(questionFingerprint(original));
  });

  it('preserves a legacy item when the original question is missing',()=>{
    const result=migrateWrongQuestions([
      {questionId:'missing',wrongCount:1,resolved:false,nextReview:'2026-09-25'}
    ],new Map());
    expect(result[0]).toMatchObject({
      questionId:'missing',
      available:false,
      resolved:false,
      originalReviewCount:0,
      reviewStage:'anchor'
    });
  });

  it('is idempotent for an already enriched item',()=>{
    const original=q('Q1');
    const enriched=enrichWrongItem({questionId:'Q1',wrongCount:1,resolved:false},original);
    expect(enrichWrongItem(enriched,original)).toEqual(enriched);
  });

  it('allows the anchor exactly once, then moves to same-skill whether correct or wrong',()=>{
    const original=q('Q1');
    const base=enrichWrongItem({questionId:'Q1',wrongCount:1,resolved:false},original);
    const correct=recordReviewEvidence(base,{question:original,correct:true,date:'2026-09-17',evidenceKind:'anchor'});
    expect(correct).toMatchObject({
      originalReviewCount:1,
      reviewStage:'same-skill',
      nextReview:'2026-09-20',
      resolved:false
    });

    const wrong=recordReviewEvidence(base,{question:original,correct:false,date:'2026-09-17',evidenceKind:'anchor'});
    expect(wrong).toMatchObject({
      originalReviewCount:1,
      reviewStage:'same-skill',
      nextReview:'2026-09-18',
      wrongCount:2,
      resolved:false
    });
  });

  it('advances through same-skill and near-transfer but resets a miss to same-skill',()=>{
    const original=q('Q1');
    let item=enrichWrongItem({questionId:'Q1',wrongCount:1,resolved:false},original);
    item=recordReviewEvidence(item,{question:original,correct:true,date:'2026-09-17',evidenceKind:'anchor'});
    const same=q('Q2',{variationForm:'email'});
    item=recordReviewEvidence(item,{question:same,correct:true,date:'2026-09-20',evidenceKind:'same-skill'});
    expect(item).toMatchObject({reviewStage:'near-transfer',nextReview:'2026-09-27'});
    const near=q('Q3',{questionType:'公告推論',variationForm:'dialogue'});
    item=recordReviewEvidence(item,{question:near,correct:true,date:'2026-09-27',evidenceKind:'near-transfer'});
    expect(item).toMatchObject({reviewStage:'delayed-transfer',nextReview:'2026-10-11'});
    const missed=q('Q4',{variationForm:'short article'});
    item=recordReviewEvidence(item,{question:missed,correct:false,date:'2026-10-11',evidenceKind:'delayed-transfer'});
    expect(item).toMatchObject({reviewStage:'same-skill',nextReview:'2026-10-12',resolved:false});
  });

  it('resolves only with distinct transfer fingerprints and delayed-transfer evidence',()=>{
    const original=q('Q1');
    let item=enrichWrongItem({questionId:'Q1',wrongCount:1,resolved:false},original);
    item=recordReviewEvidence(item,{question:original,correct:true,date:'2026-09-17',evidenceKind:'anchor'});
    const same=q('Q2',{variationForm:'email'});
    item=recordReviewEvidence(item,{question:same,correct:true,date:'2026-09-20',evidenceKind:'same-skill'});
    const near=q('Q3',{questionType:'公告推論',variationForm:'dialogue'});
    item=recordReviewEvidence(item,{question:near,correct:true,date:'2026-09-27',evidenceKind:'near-transfer'});
    expect(canResolveReview(item)).toBe(false);
    const delayed=q('Q4',{variationForm:'short article'});
    item=recordReviewEvidence(item,{question:delayed,correct:true,date:'2026-10-11',evidenceKind:'delayed-transfer'});
    expect(item).toMatchObject({reviewStage:'resolved',resolved:true,nextReview:'2026-11-10'});
    expect(canResolveReview(item)).toBe(true);
  });

  it('cannot resolve by answering aliases with the same fingerprint',()=>{
    const original=q('Q1');
    const sameContent={...q('Q2'),question:original.question,passage:original.passage};
    let item=enrichWrongItem({questionId:'Q1',wrongCount:1,resolved:false},original);
    item=recordReviewEvidence(item,{question:original,correct:true,date:'2026-09-17',evidenceKind:'anchor'});
    item=recordReviewEvidence(item,{question:sameContent,correct:true,date:'2026-09-20',evidenceKind:'same-skill'});
    item=recordReviewEvidence(item,{question:{...sameContent,id:'Q3'},correct:true,date:'2026-09-27',evidenceKind:'near-transfer'});
    item=recordReviewEvidence(item,{question:{...sameContent,id:'Q4'},correct:true,date:'2026-10-11',evidenceKind:'delayed-transfer'});
    expect(item.resolved).toBe(false);
    expect(canResolveReview(item)).toBe(false);
  });

  it('can eventually resolve even if the one-time anchor was wrong',()=>{
    const original=q('Q1');
    let item=enrichWrongItem({questionId:'Q1',wrongCount:1,resolved:false},original);
    item=recordReviewEvidence(item,{question:original,correct:false,date:'2026-09-17',evidenceKind:'anchor'});
    item=recordReviewEvidence(item,{question:q('Q2',{variationForm:'email'}),correct:true,date:'2026-09-18',evidenceKind:'same-skill'});
    item=recordReviewEvidence(item,{question:q('Q3',{questionType:'公告推論',variationForm:'dialogue'}),correct:true,date:'2026-09-25',evidenceKind:'near-transfer'});
    item=recordReviewEvidence(item,{question:q('Q4',{variationForm:'short article'}),correct:true,date:'2026-10-09',evidenceKind:'delayed-transfer'});
    expect(item.resolved).toBe(true);
  });

  it('does not treat a correct-but-uncertain transfer as passing evidence',()=>{
    const original=q('Q1');
    let item=enrichWrongItem({questionId:'Q1',wrongCount:1,resolved:false},original);
    item=recordReviewEvidence(item,{question:original,correct:true,date:'2026-09-17',evidenceKind:'anchor'});
    item=recordReviewEvidence(item,{question:q('Q2'),correct:true,uncertain:true,date:'2026-09-20',evidenceKind:'same-skill'});
    expect(item.reviewStage).toBe('same-skill');
    expect(item.passedFingerprints).toHaveLength(1);
  });

  it('exports the expected stage names',()=>{
    expect(REVIEW_STAGES).toEqual(['anchor','same-skill','near-transfer','delayed-transfer','resolved']);
  });
});
