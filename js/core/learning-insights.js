import { REVIEW_REASONS } from './mastery.js';
import { aiBudgetStatus } from './ai-budget.js';

const SUBJECTS=['chinese','english','math','science','social'];

function addDays(date,days){
  const value=new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate()+days);
  return value.toISOString().slice(0,10);
}

export function adaptiveSnapshot(skills={},date){
  const subjects={};
  for(const subject of SUBJECTS){
    const list=Object.values(skills).filter(item=>item.subject===subject);
    if(list.length){
      subjects[subject]=Math.round(list.reduce((sum,item)=>sum+(item.mastery??60),0)/list.length);
    }
  }
  const values=Object.values(subjects);
  return {
    date,
    overall:values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):60,
    subjects,
    weakCount:Object.values(skills).filter(item=>(item.priorityScore??0)>=70).length
  };
}

export function upsertAdaptiveSnapshot(list=[],snapshot,max=30){
  const filtered=list.filter(item=>item.date!==snapshot.date);
  return [...filtered,snapshot].sort((a,b)=>a.date.localeCompare(b.date)).slice(-max);
}

export function errorReasonStats(history=[],wrongQuestions=[]){
  const counts=new Map();
  for(const item of history){
    if(item.correct||!item.errorReason)continue;
    counts.set(item.errorReason,(counts.get(item.errorReason)??0)+1);
  }
  for(const item of wrongQuestions){
    if(!item.reason)continue;
    const label=REVIEW_REASONS[item.reason]??item.reason;
    counts.set(label,(counts.get(label)??0)+1);
  }
  return [...counts.entries()]
    .map(([label,count])=>({label,count}))
    .sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label))
    .slice(0,8);
}

export function buildParentSummary(state,today){
  const todayHistory=(state.answerHistory??[]).filter(item=>item.date===today);
  const answered=todayHistory.length;
  const correct=todayHistory.filter(item=>item.correct).length;
  const ranked=Object.values(state.adaptiveSkills??{})
    .sort((a,b)=>(b.priorityScore??0)-(a.priorityScore??0));
  const tomorrow=addDays(today,1);
  const dueTomorrow=ranked.filter(item=>item.nextReviewDate&&item.nextReviewDate<=tomorrow).slice(0,5);
  const fallback=ranked.slice(0,3);
  return {
    cycle:state.currentLearningCycle??1,
    today:{
      answered,
      correct,
      accuracy:answered?Math.round(correct/answered*100):0
    },
    topWeaknesses:ranked.slice(0,5),
    tomorrowPlan:(dueTomorrow.length?dueTomorrow:fallback).map(item=>({
      subject:item.subject,
      competency:item.competency,
      mastery:item.mastery,
      priorityScore:item.priorityScore,
      nextReviewDate:item.nextReviewDate
    })),
    errorReasons:errorReasonStats(state.answerHistory,state.wrongQuestions),
    ai:aiBudgetStatus(state.aiUsage,today),
    openWrong:(state.wrongQuestions??[]).filter(item=>!item.resolved).length
  };
}
