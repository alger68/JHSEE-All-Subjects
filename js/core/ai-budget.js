export const DEFAULT_DAILY_AI_LIMIT=15;

const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

export function normalizeAiUsage(usage,today,limit=DEFAULT_DAILY_AI_LIMIT){
  const nextLimit=Number(usage?.limit)||limit;
  if(!usage||usage.date!==today){
    return {date:today,questions:0,requests:0,limit:nextLimit};
  }
  return {
    date:today,
    questions:clamp(Number(usage.questions)||0,0,nextLimit),
    requests:Math.max(0,Number(usage.requests)||0),
    limit:nextLimit
  };
}

export function aiBudgetStatus(usage,today,limit=DEFAULT_DAILY_AI_LIMIT){
  const current=normalizeAiUsage(usage,today,limit);
  return {
    ...current,
    used:current.questions,
    remaining:Math.max(0,current.limit-current.questions)
  };
}

export function recordAiUsage(usage,today,{questions=0,requests=0}={}){
  const current=normalizeAiUsage(usage,today);
  return {
    ...current,
    questions:clamp(current.questions+Math.max(0,Number(questions)||0),0,current.limit),
    requests:current.requests+Math.max(0,Number(requests)||0)
  };
}
