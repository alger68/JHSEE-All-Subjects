/**
 * Fixed diagnostic imported from 宥廷's first mock-exam result.  This is kept
 * separate from answer statistics so a fresh browser can still make a useful
 * recommendation before enough local attempts have accumulated.
 */
export const PERSONAL_DIAGNOSTIC = Object.freeze({
  student: '宥廷',
  source: '第一次模考',
  subjectWeights: Object.freeze({ english: 30, science: 20, math: 20, social: 15, chinese: 10 }),
  focuses: Object.freeze([
    Object.freeze({ id: 'english-reading', label: '英文閱讀', subject: 'english', result: '31 / 43', priority: '最高', recommendation: '每天 1 篇會考式閱讀，標記主旨、細節、推論與圖表題。', match: /reading|閱讀|圖表/i }),
    Object.freeze({ id: 'science-physics-chemistry', label: '自然理化', subject: 'science', result: '20 / 25', priority: '最高', recommendation: '優先練習物理、化學、資料分析與情境應用。', match: /理化|物理|化學|電學|力與運動|酸鹼/i }),
    Object.freeze({ id: 'math-nonselective', label: '數學非選', subject: 'math', result: '4 / 6', priority: '高', recommendation: '練習列式、計算過程、單位與最後答案；選擇題維持少錯。', match: /資料分析|情境應用|推論|非選/i }),
    Object.freeze({ id: 'social-history-civics', label: '歷史／公民', subject: 'social', result: '30 / 36', priority: '高', recommendation: '歷史與公民輪替，地理以維持題為主。', match: /歷史|公民|臺灣與世界歷史|公民與社會|公共議題/i })
  ])
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
