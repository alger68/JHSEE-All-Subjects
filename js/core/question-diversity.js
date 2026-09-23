import { questionFingerprint } from './question-dedup.js';
import { skillIdentity } from './adaptive-learning.js';

export function recentQuestionIds(history=[],limit=30){
  const ids=[];
  const seen=new Set();
  for(let i=(history?.length??0)-1;i>=0&&ids.length<limit;i-=1){
    const id=history[i]?.questionId;
    if(!id||seen.has(id))continue;
    seen.add(id);ids.push(id);
  }
  return new Set(ids);
}

export function buildPracticeReservoir(localQuestions=[],generatedQuestions=[]){
  const result=[],seen=new Set();
  for(const q of [...(localQuestions??[]),...(generatedQuestions??[])]){
    if(!q?.id||seen.has(q.id))continue;
    seen.add(q.id);result.push(q);
  }
  return result;
}

export function preferFreshQuestions(questions=[],recentIds=new Set(),skills={},today='',count=10){
  const due=[],fresh=[],recent=[];
  for(const q of questions){
    const profile=skills?.[skillIdentity(q).key];
    const isDue=Boolean(profile?.nextReviewDate&&profile.nextReviewDate<=today);
    if(isDue)due.push(q);
    else if(!recentIds.has(q.id))fresh.push(q);
    else recent.push(q);
  }
  const primary=[...due,...fresh];
  if(primary.length>=Math.min(count,questions.length))return primary;
  const result=[...primary],seen=new Set(primary.map(q=>q.id));
  for(const q of recent){
    if(result.length>=Math.min(count,questions.length))break;
    if(!q?.id||seen.has(q.id))continue;
    seen.add(q.id);result.push(q);
  }
  return result;
}

export function recentAvoidQuestions(questions=[],limit=8){
  return (questions??[]).slice(-limit).map(q=>({
    question:String(q?.question??'').slice(0,800),
    passage:String(q?.passage??'').slice(0,1800)
  })).filter(item=>item.question||item.passage);
}


export function recentQuestionFingerprints(history=[],questionLookup=new Map(),limit=30){
  const values=[];
  const seen=new Set();
  for(let i=(history?.length??0)-1;i>=0&&values.length<limit;i-=1){
    const row=history[i];
    const fingerprint=row?.fingerprint || (row?.questionId ? questionLookup.get(row.questionId)?.fingerprint : null) || (row?.questionId&&questionLookup.get(row.questionId) ? questionFingerprint(questionLookup.get(row.questionId)) : null);
    if(!fingerprint||seen.has(fingerprint))continue;
    seen.add(fingerprint);
    values.push(fingerprint);
  }
  return new Set(values);
}
