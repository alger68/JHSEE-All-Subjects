import { REVIEW_REASONS } from './mastery.js';

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
      aiUsage:base.aiUsage??{date:today,count:0,limit:12}
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
      aiUsage:base.aiUsage??{date:today,count:0,limit:12}
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

export function buildErrorReasonStats(history=[],wrongQuestions=[]){
  const counts=new Map();
  for(const item of history){
    if(item?.correct||!item?.errorReason)continue;
    const label=String(item.errorReason);
    counts.set(label,(counts.get(label)??0)+1);
  }
  for(const item of wrongQuestions){
    if(!item?.reason)continue;
    const label=REVIEW_REASONS[item.reason]??String(item.reason);
    counts.set(label,(counts.get(label)??0)+1);
  }
  return [...counts.entries()]
    .map(([label,count])=>({label,count}))
    .sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label))
    .slice(0,8);
}

export function buildParentSummary({history=[],skills={},today,aiUsage={},wrongQuestions=[]}={}){
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
  return {answeredToday,topWeak,dueCount,aiRemaining:remaining,nextAction,errorReasons:buildErrorReasonStats(history,wrongQuestions)};
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


export function buildDiagnosticBaseline(result={},questionLookup=new Map(),date=''){
  const subjects={};
  let total=0,correct=0;
  for(const item of result?.items??[]){
    if(item?.choice===undefined)continue;
    const question=questionLookup.get(item.id);
    const subject=question?.subject;
    if(!SUBJECTS.includes(subject))continue;
    const row=subjects[subject]??{correct:0,total:0,accuracy:0};
    row.total+=1;
    if(item.correct){row.correct+=1;correct+=1;}
    row.accuracy=row.total?Math.round(row.correct/row.total*100):0;
    subjects[subject]=row;
    total+=1;
  }
  return {
    date,
    total,
    correct,
    accuracy:total?Math.round(correct/total*100):0,
    subjects
  };
}

function averageMastery(skills={},subject){
  const values=Object.values(skills??{})
    .filter(item=>item?.subject===subject&&Number.isFinite(Number(item?.mastery)))
    .map(item=>Number(item.mastery));
  if(!values.length)return null;
  return Math.round(values.reduce((a,b)=>a+b,0)/values.length);
}

export function compareLearningCycles(cycles=[],currentSkills={}){
  const previous=cycles?.length?cycles.at(-1)?.adaptiveSkills??{}:{};
  const result={};
  for(const subject of SUBJECTS){
    const before=averageMastery(previous,subject);
    const after=averageMastery(currentSkills,subject);
    if(before===null&&after===null)continue;
    result[subject]={
      before:before??60,
      after:after??60,
      delta:(after??60)-(before??60)
    };
  }
  return result;
}
