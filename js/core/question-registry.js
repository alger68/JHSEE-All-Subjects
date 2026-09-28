import { skillIdentity } from './adaptive-learning.js';
import { questionFingerprint } from './question-dedup.js';

const key2=(a,b)=>`${a ?? ''}::${b ?? ''}`;

export function createQuestionRegistry(localQuestions=[]) {
  const entries=new Map();
  const indexes={
    subject:new Map(),
    skillKey:new Map(),
    competency:new Map(),
    domain:new Map(),
    difficulty:new Map(),
    sourceKind:new Map()
  };

  const addIndex=(map,key,id)=>{
    if(key===undefined||key===null||key==='')return;
    const bucket=map.get(key)??new Set();
    bucket.add(id);
    map.set(key,bucket);
  };

  const removeIndex=(map,key,id)=>{
    const bucket=map.get(key);
    if(!bucket)return;
    bucket.delete(id);
    if(!bucket.size)map.delete(key);
  };

  const indexQuestion=(q)=>{
    addIndex(indexes.subject,q.subject,q.id);
    addIndex(indexes.skillKey,q.skillKey,q.id);
    addIndex(indexes.competency,key2(q.subject,q.competency),q.id);
    addIndex(indexes.domain,key2(q.subject,q.domain),q.id);
    addIndex(indexes.difficulty,q.difficulty,q.id);
    addIndex(indexes.sourceKind,q.sourceKind,q.id);
  };

  const unindexQuestion=(q)=>{
    removeIndex(indexes.subject,q.subject,q.id);
    removeIndex(indexes.skillKey,q.skillKey,q.id);
    removeIndex(indexes.competency,key2(q.subject,q.competency),q.id);
    removeIndex(indexes.domain,key2(q.subject,q.domain),q.id);
    removeIndex(indexes.difficulty,q.difficulty,q.id);
    removeIndex(indexes.sourceKind,q.sourceKind,q.id);
  };

  const enrich=(question,meta={})=>{
    const skill=skillIdentity(question);
    const sourceKind=meta.sourceKind??question.sourceKind??'local-core';
    const lookupOnly=Boolean(meta.lookupOnly??question.lookupOnly??false);
    const variantEligible=meta.variantEligible ?? question.variantEligible ?? (!lookupOnly && sourceKind!=='official');
    return Object.freeze({
      ...question,
      packId:meta.packId??question.packId,
      packVersion:meta.packVersion??question.packVersion,
      sourceKind,
      lookupOnly,
      variantEligible:Boolean(variantEligible),
      skillKey:skill.key,
      domain:skill.domain,
      competency:skill.competency,
      subSkill:skill.subSkill,
      fingerprint:question.fingerprint??questionFingerprint(question)
    });
  };

  const registerQuestions=(questions=[],meta={})=>{
    const accepted=[],rejected=[];
    for(const raw of questions??[]){
      if(!raw?.id){
        rejected.push({question:raw,reason:'missing-id'});
        continue;
      }
      if(entries.has(raw.id)){
        rejected.push({question:raw,reason:'duplicate-id'});
        continue;
      }
      const question=enrich(raw,meta);
      entries.set(question.id,question);
      indexQuestion(question);
      accepted.push(question);
    }
    return {accepted,rejected};
  };

  const idsToQuestions=(ids)=>[...(ids??[])].map(id=>entries.get(id)).filter(Boolean);
  const variantOnly=(list)=>list.filter(question=>question.variantEligible);

  const registry={
    registerQuestions,
    getById(id){ return entries.get(id)??null; },
    all(){ return variantOnly([...entries.values()]); },
    allLookupQuestions(){ return [...entries.values()]; },
    bySkillKey(skillKey){ return variantOnly(idsToQuestions(indexes.skillKey.get(skillKey))); },
    byCompetency(subject,competency){ return variantOnly(idsToQuestions(indexes.competency.get(key2(subject,competency)))); },
    byDomain(subject,domain){ return variantOnly(idsToQuestions(indexes.domain.get(key2(subject,domain)))); },
    query(criteria={}){
      let list;
      if(criteria.skillKey)list=idsToQuestions(indexes.skillKey.get(criteria.skillKey));
      else if(criteria.subject&&criteria.competency)list=idsToQuestions(indexes.competency.get(key2(criteria.subject,criteria.competency)));
      else if(criteria.subject&&criteria.domain)list=idsToQuestions(indexes.domain.get(key2(criteria.subject,criteria.domain)));
      else if(criteria.subject)list=idsToQuestions(indexes.subject.get(criteria.subject));
      else if(criteria.sourceKind)list=idsToQuestions(indexes.sourceKind.get(criteria.sourceKind));
      else list=[...entries.values()];

      return list.filter(question=>Object.entries(criteria).every(([key,value])=>{
        if(value===undefined||value===null||value==='')return true;
        if(key==='variantEligible')return question.variantEligible===Boolean(value);
        if(key==='skillKey')return question.skillKey===value;
        if(key==='competency')return question.competency===value;
        if(key==='domain')return question.domain===value;
        return question[key]===value;
      }));
    },
    clearSource(sourceKind){
      const ids=[...(indexes.sourceKind.get(sourceKind)??[])];
      for(const id of ids){
        const question=entries.get(id);
        if(!question)continue;
        unindexQuestion(question);
        entries.delete(id);
      }
    },
    stats(){
      const sourceKinds=Object.fromEntries([...indexes.sourceKind.entries()].map(([key,set])=>[key,set.size]));
      const competencies={};
      for(const [key,set] of indexes.competency)competencies[key]=variantOnly(idsToQuestions(set)).length;
      return {
        total:entries.size,
        variantEligible:registry.all().length,
        sourceKinds,
        competencies
      };
    }
  };

  registerQuestions(localQuestions);
  return registry;
}
