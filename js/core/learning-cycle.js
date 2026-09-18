const SUBJECTS=['chinese','english','math','science','social'];

const dateAt=(date)=>new Date(`${date}T00:00:00Z`);
const addDays=(date,days)=>{
  const d=dateAt(date);
  d.setUTCDate(d.getUTCDate()+days);
  return d.toISOString().slice(0,10);
};

export function applyResetMode(state={},mode='adaptive',today=''){
  const base={...state};
  if(mode==='adaptive'){
    return {
      ...base,
      adaptiveSkills:{},
      answerHistory:[],
      adaptiveSubjectWeights:null,
      generatedQuestions:[],
      aiUsage:{date:today,count:0,limit:base.aiUsage?.limit??12}
    };
  }
  if(mode==='new-cycle'){
    const archive={
      startedOn:base.currentCycleStartedOn??null,
      endedOn:today,
      adaptiveSkills:base.adaptiveSkills??{},
      answerHistory:base.answerHistory??[],
      adaptiveSubjectWeights:base.adaptiveSubjectWeights??null,
      wrongQuestions:base.wrongQuestions??[]
    };
    return {
      ...base,
      learningCycles:[...(base.learningCycles??[]),archive].slice(-12),
      currentCycleStartedOn:today,
      adaptiveSkills:{},
      answerHistory:[],
      adaptiveSubjectWeights:null,
      generatedQuestions:[],
      wrongQuestions:[],
      aiUsage:{date:today,count:0,limit:base.aiUsage?.limit??12}
    };
  }
  return base;
}

export function aiAllowance(usage={},today,requested=1){
  const limit=Math.max(0,Number(usage?.limit??12));
  const used=usage?.date===today?Math.max(0,Number(usage?.count??0)):0;
  return Math.max(0,Math.min(Math.max(0,requested),limit-used));
}

export function recordAiUsage(usage={},today,generatedCount=0){
  const limit=Math.max(0,Number(usage?.limit??12));
  const current=usage?.date===today?Math.max(0,Number(usage?.count??0)):0;
  return {date:today,count:Math.min(limit,current+Math.max(0,generatedCount)),limit};
}

export function buildSevenDayTrend(history=[],today){
  const cutoff=addDays(today,-6);
  const recent=history.filter(item=>item?.date>=cutoff&&item?.date<=today&&SUBJECTS.includes(item?.subject));
  const result={};
  for(const subject of SUBJECTS){
    const rows=recent.filter(item=>item.subject===subject).sort((a,b)=>
      String(a.date).localeCompare(String(b.date))||String(a.at??'').localeCompare(String(b.at??''))
    );
    if(!rows.length) continue;
    const first=Number(rows[0].masteryAfter??rows[0].masteryBefore??60);
    const latest=Number(rows.at(-1).masteryAfter??first);
    const daily={};
    for(const row of rows) daily[row.date]=Number(row.masteryAfter??latest);
    result[subject]={
      first,
      latest,
      delta:latest-first,
      points:Object.entries(daily).map(([date,value])=>({date,value}))
    };
  }
  return result;
}

export function buildParentSummary({history=[],skills={},today,aiUsage={}}={}){
  const answeredToday=history.filter(item=>item?.date===today).length;
  const ranked=Object.values(skills??{}).sort((a,b)=>(b.priorityScore??0)-(a.priorityScore??0));
  const topWeak=ranked.filter(item=>(item.priorityScore??0)>=50).slice(0,3);
  const dueCount=ranked.filter(item=>item.nextReviewDate&&item.nextReviewDate<=today).length;
  const remaining=aiAllowance(aiUsage,today,Number(aiUsage?.limit??12));
  const nextAction=topWeak[0]
    ? `優先補強「${topWeak[0].competency}」，熟練度 ${topWeak[0].mastery}/100。`
    : answeredToday
      ? '目前沒有明顯高優先弱點，可進行混合維持練習。'
      : '今天尚未作答，建議先完成一回 10 題短練習。';
  return {answeredToday,topWeak,dueCount,aiRemaining:remaining,nextAction};
}

export function pickDiagnosticQuestions(questions=[],count=25){
  const perSubject=Math.max(1,Math.floor(count/SUBJECTS.length));
  const picked=[];
  const used=new Set();
  for(const subject of SUBJECTS){
    const candidates=questions
      .filter(q=>q?.subject===subject)
      .sort((a,b)=>Number(Boolean(b.examAligned))-Number(Boolean(a.examAligned))||(b.difficulty??0)-(a.difficulty??0)||String(a.id).localeCompare(String(b.id)));
    for(const q of candidates.slice(0,perSubject)){
      if(!used.has(q.id)){used.add(q.id);picked.push(q);}
    }
  }
  if(picked.length<count){
    for(const q of questions){
      if(picked.length>=count)break;
      if(!used.has(q.id)){used.add(q.id);picked.push(q);}
    }
  }
  return picked.slice(0,count);
}
