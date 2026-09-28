import { skillIdentity } from './adaptive-learning.js';
import { questionFingerprint } from './question-dedup.js';

export const REVIEW_STAGES=Object.freeze(['anchor','same-skill','near-transfer','delayed-transfer','resolved']);

function addDays(date,days){
  const value=new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate()+days);
  return value.toISOString().slice(0,10);
}

function unique(values=[]){return [...new Set(values.filter(Boolean))];}

export function enrichWrongItem(item={},originalQuestion=null){
  const identity=originalQuestion?skillIdentity(originalQuestion):null;
  const alreadyV2=REVIEW_STAGES.includes(item.reviewStage);
  const resolved=Boolean(item.resolved);
  const reviewStage=alreadyV2
    ? item.reviewStage
    : resolved ? 'resolved' : 'anchor';
  const originalReviewCount=Number.isInteger(item.originalReviewCount)
    ? item.originalReviewCount
    : resolved ? 1 : 0;
  const anchorFingerprint=item.anchorFingerprint
    ?? originalQuestion?.fingerprint
    ?? (originalQuestion?questionFingerprint(originalQuestion):null);

  return {
    ...item,
    skillKey:item.skillKey??identity?.key??null,
    subject:item.subject??identity?.subject??originalQuestion?.subject??null,
    domain:item.domain??identity?.domain??null,
    competency:item.competency??identity?.competency??null,
    subSkill:item.subSkill??identity?.subSkill??null,
    difficulty:Number(item.difficulty??originalQuestion?.difficulty??3),
    anchorFingerprint,
    originalReviewCount,
    reviewStage,
    variantHistory:Array.isArray(item.variantHistory)?[...item.variantHistory]:[],
    passedFingerprints:Array.isArray(item.passedFingerprints)?unique(item.passedFingerprints):[],
    available:originalQuestion?true:(item.available??false),
    resolved:reviewStage==='resolved'||resolved
  };
}

export function migrateWrongQuestions(items=[],questionLookup=new Map()){
  return (items??[]).map(item=>enrichWrongItem(item,questionLookup.get(item.questionId)??null));
}

export function canResolveReview(item={}){
  const passed=unique(item.passedFingerprints??[]);
  const nonAnchor=passed.filter(fp=>fp!==item.anchorFingerprint);
  const history=item.variantHistory??[];
  const sameSkill=history.some(row=>row.correct&&!row.uncertain&&row.evidenceKind==='same-skill');
  const nearTransfer=history.some(row=>row.correct&&!row.uncertain&&row.evidenceKind==='near-transfer');
  const delayedTransfer=history.some(row=>row.correct&&!row.uncertain&&row.evidenceKind==='delayed-transfer');
  return passed.length>=3&&nonAnchor.length>=2&&sameSkill&&nearTransfer&&delayedTransfer;
}

export function recordReviewEvidence(item,input={}){
  const base={...item};
  const fingerprint=input.question?.fingerprint??questionFingerprint(input.question??{});
  const correct=Boolean(input.correct);
  const uncertain=Boolean(input.uncertain);
  const passed=correct&&!uncertain;
  const evidenceKind=input.evidenceKind??base.reviewStage??'same-skill';
  const history=[...(base.variantHistory??[]),{
    questionId:input.question?.id??null,
    fingerprint,
    variationForm:input.question?.variationForm??null,
    correct,
    uncertain,
    date:input.date,
    sourceKind:input.question?.sourceKind??input.question?.source??null,
    evidenceKind
  }].slice(-20);
  const passedFingerprints=passed
    ? unique([...(base.passedFingerprints??[]),fingerprint])
    : unique(base.passedFingerprints??[]);

  let stage=base.reviewStage??'anchor';
  let nextDays=1;
  let originalReviewCount=base.originalReviewCount??0;

  if(evidenceKind==='anchor'){
    originalReviewCount=1;
    stage='same-skill';
    nextDays=passed?3:1;
  }else if(evidenceKind==='same-skill'){
    stage=passed?'near-transfer':'same-skill';
    nextDays=passed?7:1;
  }else if(evidenceKind==='near-transfer'){
    stage=passed?'delayed-transfer':'same-skill';
    nextDays=passed?14:1;
  }else if(evidenceKind==='delayed-transfer'){
    stage=passed?'delayed-transfer':'same-skill';
    nextDays=passed?14:1;
  }else if(evidenceKind==='resolved'){
    stage=passed?'resolved':'same-skill';
    nextDays=passed?30:1;
  }

  let mastery=Number(base.mastery??0);
  if(!correct)mastery=Math.max(0,mastery-1);
  else if(passed)mastery=Math.min(2,mastery+1);

  let next={
    ...base,
    originalReviewCount,
    reviewStage:stage,
    variantHistory:history,
    passedFingerprints,
    lastReviewed:input.date,
    nextReview:addDays(input.date,nextDays),
    wrongCount:Number(base.wrongCount??0)+(correct?0:1),
    uncertainCount:Number(base.uncertainCount??0)+(uncertain?1:0),
    mastery,
    resolved:false
  };

  if(evidenceKind==='delayed-transfer'&&passed&&canResolveReview(next)){
    next={...next,reviewStage:'resolved',resolved:true,mastery:3,nextReview:addDays(input.date,30)};
  }
  return next;
}

export function reviewTarget(item={}){
  return {
    stage:item.reviewStage??'anchor',
    skillKey:item.skillKey??null,
    subject:item.subject??null,
    domain:item.domain??null,
    competency:item.competency??null,
    subSkill:item.subSkill??null,
    difficulty:Number(item.difficulty??3),
    anchorId:item.questionId??null,
    anchorFingerprint:item.anchorFingerprint??null
  };
}
