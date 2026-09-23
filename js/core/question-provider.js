import { validateQuestion } from './question-bank.js';
import { buildAdaptivePractice, skillIdentity } from './adaptive-learning.js';
import { isNearDuplicate, questionFingerprint } from './question-dedup.js';

const LOCAL_KINDS=new Set(['local-core','local-pack']);
const NO_CANDIDATE='這個能力目前沒有足夠的新題，先練習其他弱點；系統會保留這筆複習。';

const asSet=(value)=>value instanceof Set?new Set(value):new Set(value??[]);
const targetKey=(item)=>item?.skillKey??item?.key??[item?.subject,item?.domain,item?.competency].join('::');

function difficultyOk(question,target,window=1){
  const q=Number(question?.difficulty??3),t=Number(target??3);
  return Math.abs(q-t)<=window;
}

function isLocal(question){return LOCAL_KINDS.has(question?.sourceKind);}
function recentFormBlocked(question,forms=[]){
  const last=(forms??[]).slice(-3).filter(Boolean);
  return last.length===3&&new Set(last).size===1&&question?.variationForm===last[0];
}

function orderByVariation(candidates,forms=[]){
  return [...candidates].sort((a,b)=>Number(recentFormBlocked(a,forms))-Number(recentFormBlocked(b,forms)));
}

function hardExcluded(question,item,context,relaxRecent=false){
  const excludeIds=asSet(context.excludeIds);
  const excludeFingerprints=asSet(context.excludeFingerprints);
  const recentIds=asSet(context.recentIds);
  const recentFingerprints=asSet(context.recentFingerprints);
  const anchorId=item?.questionId;
  const anchorFingerprint=item?.anchorFingerprint;

  if(excludeIds.has(question.id)||excludeFingerprints.has(question.fingerprint))return true;
  if((item?.originalReviewCount??0)>=1&&(question.id===anchorId||question.fingerprint===anchorFingerprint))return true;
  if(!relaxRecent&&(recentIds.has(question.id)||recentFingerprints.has(question.fingerprint)))return true;
  return false;
}

function selectCandidate(candidates,item,context,{differentSubSkill=false,relaxRecent=false}={}){
  const filtered=candidates.filter(question=>
    question?.variantEligible!==false &&
    isLocal(question) &&
    difficultyOk(question,item?.difficulty,context.difficultyWindow??1) &&
    (!differentSubSkill||question.subSkill!==item?.subSkill) &&
    !hardExcluded(question,item,context,relaxRecent)
  );
  return orderByVariation(filtered,context.recentVariationForms)[0]??null;
}

export function createQuestionProvider({registry,generateAi=null}={}){
  if(!registry)throw new Error('question registry is required');

  function countPracticeCandidates(criteria={},context={}){
    const recentIds=asSet(context.recentIds),recentFingerprints=asSet(context.recentFingerprints);
    return registry.query({...criteria,variantEligible:true}).filter(question=>
      isLocal(question)&&
      !recentIds.has(question.id)&&
      !recentFingerprints.has(question.fingerprint)
    ).length;
  }

  async function getPracticeSet(criteria={},context={}){
    const recentIds=asSet(context.recentIds),recentFingerprints=asSet(context.recentFingerprints);
    const requested=Math.max(1,Number(context.count??10));
    const local=registry.query({...criteria,variantEligible:true}).filter(question=>
      isLocal(question)&&
      !recentIds.has(question.id)&&
      !recentFingerprints.has(question.fingerprint)
    );
    let questions=context.skills
      ? buildAdaptivePractice(local,Math.min(requested,local.length),{
          skills:context.skills,
          subjectWeights:context.subjectWeights,
          today:context.today,
          rng:context.rng??Math.random
        })
      : local.slice(0,requested);
    const warnings=[];
    if(questions.length<requested){
      const cache=registry.query({sourceKind:'ai-cache',variantEligible:true}).filter(question=>
        (!criteria.subject||question.subject===criteria.subject)&&
        !recentIds.has(question.id)&&!recentFingerprints.has(question.fingerprint)&&
        !questions.some(item=>item.id===question.id)
      );
      questions=[...questions,...cache.slice(0,requested-questions.length)];
    }
    return {questions:questions.slice(0,requested),sourceSummary:{local:questions.filter(isLocal).length},warnings};
  }

  function reviewTiers(item,context={}){
    const key=targetKey(item);
    const exact=registry.bySkillKey(key);
    const sameCompetency=registry.byCompetency(item.subject,item.competency);
    const sameDomain=registry.byDomain(item.subject,item.domain);
    const stage=item.reviewStage??((item.originalReviewCount??0)===0?'anchor':'same-skill');

    if(stage==='near-transfer'){
      return [
        {pool:sameCompetency,options:{differentSubSkill:true},kind:'near-transfer'},
        {pool:sameDomain,options:{differentSubSkill:true},kind:'near-transfer'}
      ];
    }
    if(stage==='delayed-transfer'){
      return [
        {pool:exact,options:{},kind:'delayed-transfer'},
        {pool:sameCompetency,options:{differentSubSkill:true},kind:'delayed-transfer'},
        {pool:sameDomain,options:{differentSubSkill:true},kind:'delayed-transfer'}
      ];
    }
    return [
      {pool:exact,options:{},kind:'same-skill'},
      {pool:sameCompetency,options:{differentSubSkill:true},kind:'same-skill'},
      {pool:sameDomain,options:{differentSubSkill:true},kind:'same-skill'}
    ];
  }

  function registerGeneratedQuestions(questions=[],context={}){
    const accepted=[],rejected=[];
    const target=context.target??{};
    const references=[...(context.references??[])];
    for(const raw of questions??[]){
      const validation=validateQuestion(raw);
      if(!validation.ok){
        rejected.push({question:raw,reason:'invalid-question',errors:validation.errors});
        continue;
      }
      const identity=skillIdentity(raw);
      if(target.subject&&identity.subject!==target.subject){
        rejected.push({question:raw,reason:'wrong-subject'});
        continue;
      }
      if(target.competency&&identity.competency!==target.competency){
        rejected.push({question:raw,reason:'wrong-competency'});
        continue;
      }
      const fingerprint=questionFingerprint(raw);
      if(asSet(context.excludeFingerprints).has(fingerprint)){
        rejected.push({question:raw,reason:'excluded-fingerprint'});
        continue;
      }
      let duplicate=false;
      for(const reference of [...references,...accepted]){
        if(isNearDuplicate(raw,reference)){
          rejected.push({question:raw,reason:'near-duplicate'});
          duplicate=true;
          break;
        }
      }
      if(duplicate)continue;
      if(registry.getById(raw.id)){
        rejected.push({question:raw,reason:'duplicate-id'});
        continue;
      }
      const prepared={
        ...raw,
        aiGenerated:true,
        derivedSkillKey:target.skillKey??target.key??identity.key,
        generatedAt:context.generatedAt??new Date().toISOString(),
        qaVersion:2,
        fingerprint
      };
      const registered=registry.registerQuestions([prepared],{sourceKind:'ai-cache'});
      if(registered.accepted.length){
        accepted.push(registered.accepted[0]);
        references.push(registered.accepted[0]);
      }else rejected.push(...registered.rejected);
    }
    return {accepted,rejected};
  }

  async function getReviewQuestion(item,context={}){
    const stage=item?.reviewStage??((item?.originalReviewCount??0)===0?'anchor':'same-skill');
    if(stage==='anchor'&&(item?.originalReviewCount??0)===0){
      const anchor=registry.getById(item.questionId);
      if(anchor)return {question:anchor,evidenceKind:'anchor'};
      return {question:null,evidenceKind:null,warning:NO_CANDIDATE};
    }

    for(const tier of reviewTiers(item,context)){
      const candidate=selectCandidate(tier.pool,item,context,tier.options);
      if(candidate)return {question:candidate,evidenceKind:tier.kind};
    }

    const cached=orderByVariation(
      registry.query({sourceKind:'ai-cache',variantEligible:true}).filter(question=>
        question.subject===item.subject&&
        question.competency===item.competency&&
        difficultyOk(question,item.difficulty,context.difficultyWindow??1)&&
        !hardExcluded(question,item,context)
      ),
      context.recentVariationForms
    )[0];
    if(cached)return {question:cached,evidenceKind:stage};

    if(context.allowAi!==false&&Number(context.aiAllowance??0)>0&&typeof generateAi==='function'){
      const anchor=registry.getById(item.questionId);
      const raw=await generateAi({
        target:{
          subject:item.subject,
          domain:item.domain,
          competency:item.competency,
          subSkill:item.subSkill,
          skillKey:targetKey(item),
          difficulty:item.difficulty,
          reviewStage:stage
        },
        sourceQuestion:anchor,
        avoidQuestions:context.avoidQuestions??[],
        count:Math.max(1,Math.min(Number(context.aiAllowance),Number(context.aiCount??1)))
      });
      const qa=registerGeneratedQuestions(raw??[],{
        target:{
          subject:item.subject,
          competency:item.competency,
          skillKey:targetKey(item)
        },
        references:[anchor,...(context.referenceQuestions??[])].filter(Boolean),
        excludeFingerprints:new Set([...(context.excludeFingerprints??[]),...(context.recentFingerprints??[]),item.anchorFingerprint].filter(Boolean)),
        generatedAt:context.generatedAt
      });
      const candidate=qa.accepted.find(question=>!hardExcluded(question,item,context));
      if(candidate)return {question:candidate,evidenceKind:stage,rejected:qa.rejected};
    }

    for(const tier of reviewTiers(item,context)){
      const candidate=selectCandidate(tier.pool,item,context,{...tier.options,relaxRecent:true});
      if(candidate)return {question:candidate,evidenceKind:tier.kind,warning:'使用已冷卻的舊變形題'};
    }

    return {question:null,evidenceKind:null,warning:NO_CANDIDATE};
  }

  async function getReviewSession(reviewItems=[],context={}){
    const questions=[],warnings=[],skippedReviewIds=[],evidenceByQuestionId={};
    const allAnchorIds=new Set(reviewItems.map(item=>item.questionId).filter(Boolean));
    const allAnchorFingerprints=new Set(reviewItems.map(item=>item.anchorFingerprint).filter(Boolean));
    const chosenIds=asSet(context.excludeIds);
    const chosenFingerprints=asSet(context.excludeFingerprints);

    for(const item of reviewItems){
      const result=await getReviewQuestion(item,{
        ...context,
        excludeIds:new Set([...chosenIds,...allAnchorIds]),
        excludeFingerprints:new Set([...chosenFingerprints,...allAnchorFingerprints])
      });
      if(!result.question){
        skippedReviewIds.push(item.questionId);
        if(result.warning)warnings.push(result.warning);
        continue;
      }
      questions.push(result.question);
      chosenIds.add(result.question.id);
      chosenFingerprints.add(result.question.fingerprint);
      evidenceByQuestionId[result.question.id]={
        reviewQuestionId:item.questionId,
        evidenceKind:result.evidenceKind,
        fingerprint:result.question.fingerprint
      };
    }
    return {questions,evidenceByQuestionId,warnings,skippedReviewIds};
  }

  return {
    countPracticeCandidates,
    getPracticeSet,
    getReviewQuestion,
    getReviewSession,
    registerGeneratedQuestions,
    getStats:()=>registry.stats()
  };
}
