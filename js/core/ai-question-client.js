const trimSlash=(value)=>String(value??'').trim().replace(/\/+$/,'');

export function normalizeAiEndpoint(value){
  const base=trimSlash(value);
  if(!base)return '';
  if(base.endsWith('/api/generate-question'))return base;
  return `${base}/api/generate-question`;
}

export async function requestAiQuestions({
  endpoint,
  brief,
  sourceQuestion=null,
  avoidQuestions=[],
  count=3,
  fetchImpl=fetch,
  timeoutMs=12000
}){
  const url=normalizeAiEndpoint(endpoint);
  if(!url||!brief)return null;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetchImpl(url,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({brief,sourceQuestion,avoidQuestions,count}),
      signal:controller.signal
    });
    if(!response.ok)return null;
    const payload=await response.json();
    if(!Array.isArray(payload?.questions)||!payload.questions.length)return null;
    return payload.questions;
  }catch{
    return null;
  }finally{
    clearTimeout(timer);
  }
}

export function mergeAiWithFallback(aiQuestions=[],fallbackQuestions=[],count=10){
  const result=[];
  const ids=new Set();
  for(const question of [...(aiQuestions??[]),...(fallbackQuestions??[])]){
    if(!question?.id||ids.has(question.id))continue;
    ids.add(question.id);
    result.push(question);
    if(result.length>=count)break;
  }
  return result;
}
