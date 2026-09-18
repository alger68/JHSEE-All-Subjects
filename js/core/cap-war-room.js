import { SUBJECT_ORDER } from '../config/subjects.js';

export const CAP_MOCK_LEVELS=Object.freeze(['A++','A+','A','B++','B+','B','C']);
const POINTS=Object.freeze({'A++':7,'A+':6,'A':5,'B++':4,'B+':3,'B':2,'C':1});

const clean=(value,max=80)=>String(value??'').trim().slice(0,max);
const normalizeDate=(value)=>/^\d{4}-\d{2}-\d{2}$/.test(String(value??''))?String(value):null;

export function normalizeMockExamRecord(input={}){
  const date=normalizeDate(input.date);
  const grades={};
  for(const subject of SUBJECT_ORDER){
    const level=clean(input.grades?.[subject],4);
    if(!CAP_MOCK_LEVELS.includes(level))return null;
    grades[subject]=level;
  }
  if(!date)return null;
  return {
    id:clean(input.id)||`mock-${date}-${Date.now()}`,
    date,
    title:clean(input.title)||'模擬考',
    grades,
    note:clean(input.note,500)
  };
}

const score=(level)=>POINTS[level]??0;

function normalizedWeights(raw){
  const total=Object.values(raw).reduce((sum,value)=>sum+value,0)||1;
  const entries=Object.entries(raw).map(([key,value])=>[key,Math.round(value/total*1000)/10]);
  const roundedTotal=entries.reduce((sum,[,value])=>sum+value,0);
  if(entries.length&&roundedTotal!==100){
    const [key,value]=entries[0];
    entries[0]=[key,Math.round((value+(100-roundedTotal))*10)/10];
  }
  return Object.fromEntries(entries);
}

export function buildMockWarRoom(records=[],fallbackWeights={}){
  const list=(records??[]).filter(Boolean).slice().sort((a,b)=>a.date.localeCompare(b.date));
  const latest=list.at(-1)??null;
  const previous=list.at(-2)??null;
  const trend={};
  const prioritySubjects=[];
  if(latest){
    for(const subject of SUBJECT_ORDER){
      const current=score(latest.grades[subject]);
      const before=previous?score(previous.grades[subject]):current;
      trend[subject]={
        level:latest.grades[subject],
        previous:previous?.grades?.[subject]??null,
        delta:current-before
      };
      prioritySubjects.push({
        subject,
        level:latest.grades[subject],
        score:current,
        weakness:8-current
      });
    }
    prioritySubjects.sort((a,b)=>b.weakness-a.weakness||(fallbackWeights[b.subject]??0)-(fallbackWeights[a.subject]??0));
  }

  const raw={};
  for(const subject of SUBJECT_ORDER){
    const base=Number(fallbackWeights?.[subject]??20);
    const level=latest?.grades?.[subject];
    const weakness=level?8-score(level):3;
    raw[subject]=base*0.45+weakness*8.5;
  }

  return {
    records:list,
    latest,
    previous,
    trend,
    prioritySubjects,
    studyWeights:normalizedWeights(raw)
  };
}

export function buildMockAdjustedDiagnostic(baseDiagnostic,records=[]){
  const room=buildMockWarRoom(records,baseDiagnostic?.subjectWeights??{});
  if(!room.latest)return baseDiagnostic;
  return {
    ...(baseDiagnostic??{}),
    source:`${baseDiagnostic?.source??'初始'}＋最新模考`,
    subjectWeights:room.studyWeights
  };
}
