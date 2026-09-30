/** Neutral starting point until a student enters their own mock exam results. */
export const PERSONAL_DIAGNOSTIC = Object.freeze({
  student: '新同學',
  source: '尚未輸入模考',
  subjectWeights: Object.freeze({ english: 20, science: 20, math: 20, social: 20, chinese: 20 }),
  focuses: Object.freeze([])
});

const focusMatch = (question, focus) => {
  if (question?.subject !== focus.subject) return false;
  return focus.match.test([
    question.chapter,
    question.domain,
    question.topic,
    question.questionType,
    question.competency
  ].filter(Boolean).join(' '));
};

export function personalizedQuestionScore(question, diagnostic = PERSONAL_DIAGNOSTIC) {
  const subjectWeight = diagnostic.subjectWeights?.[question?.subject] ?? 0;
  const focusBoost = diagnostic.focuses
    .filter((focus) => focusMatch(question, focus))
    .reduce((sum, focus) => sum + (focus.priority === '最高' ? 24 : 16), 0);
  const examBoost = question?.examAligned ? 2 : 0;
  return subjectWeight + focusBoost + examBoost;
}

export function prioritizeQuestions(questions, diagnostic = PERSONAL_DIAGNOSTIC) {
  return questions
    .map((question, index) => ({ question, index }))
    .sort((a, b) => personalizedQuestionScore(b.question, diagnostic) - personalizedQuestionScore(a.question, diagnostic) || a.index - b.index)
    .map(({ question }) => question);
}

export function diagnosticCards(diagnostic = PERSONAL_DIAGNOSTIC) {
  return diagnostic.focuses.map(({ label, result, priority, recommendation }) => ({ label, result, priority, recommendation }));
}


const STARTER_SUBJECTS=['english','science','math','social','chinese'];

function weightedPick(items,count,scoreFn,rng=Math.random){
  const pool=[...items],picked=[];
  while(pool.length&&picked.length<count){
    const weights=pool.map(item=>Math.max(1,Number(scoreFn(item))||1));
    const total=weights.reduce((sum,value)=>sum+value,0);
    let ticket=rng()*total,index=0;
    for(;index<pool.length-1;index+=1){
      ticket-=weights[index];
      if(ticket<=0)break;
    }
    picked.push(pool.splice(index,1)[0]);
  }
  return picked;
}

function subjectQuotas(count,diagnostic){
  const weights=STARTER_SUBJECTS.map(subject=>({
    subject,
    weight:Math.max(0,Number(diagnostic?.subjectWeights?.[subject]??1))
  }));
  const total=weights.reduce((sum,item)=>sum+item.weight,0)||weights.length;
  const raw=weights.map(item=>({...item,exact:item.weight/total*count}));
  const quotas=Object.fromEntries(raw.map(item=>[item.subject,Math.floor(item.exact)]));
  if(count>=STARTER_SUBJECTS.length){
    for(const subject of STARTER_SUBJECTS)quotas[subject]=Math.max(1,quotas[subject]);
  }
  let assigned=Object.values(quotas).reduce((sum,value)=>sum+value,0);
  if(assigned>count){
    for(const item of [...raw].sort((a,b)=>a.exact-b.exact)){
      while(assigned>count&&quotas[item.subject]>1){quotas[item.subject]-=1;assigned-=1;}
    }
  } else if(assigned<count){
    for(const item of [...raw].sort((a,b)=>(b.exact-Math.floor(b.exact))-(a.exact-Math.floor(a.exact)))){
      if(assigned>=count)break;
      quotas[item.subject]+=1;assigned+=1;
    }
  }
  return quotas;
}

export function buildStarterPractice(questions,count,{
  diagnostic=PERSONAL_DIAGNOSTIC,
  rng=Math.random,
  ensureFiveSubjectMix=true
}={}){
  const valid=(questions??[]).filter(question=>question?.id&&question?.subject);
  if(!valid.length||count<=0)return [];
  if(!ensureFiveSubjectMix){
    return weightedPick(valid,Math.min(count,valid.length),q=>personalizedQuestionScore(q,diagnostic),rng);
  }
  const quotas=subjectQuotas(Math.min(count,valid.length),diagnostic);
  const result=[],used=new Set();
  for(const subject of STARTER_SUBJECTS){
    const pool=valid.filter(q=>q.subject===subject&&!used.has(q.id));
    for(const q of weightedPick(pool,quotas[subject]??0,q=>personalizedQuestionScore(q,diagnostic),rng)){
      result.push(q);used.add(q.id);
    }
  }
  if(result.length<count){
    const remaining=valid.filter(q=>!used.has(q.id));
    for(const q of weightedPick(remaining,count-result.length,q=>personalizedQuestionScore(q,diagnostic),rng)){
      result.push(q);used.add(q.id);
    }
  }
  return result.slice(0,count);
}
