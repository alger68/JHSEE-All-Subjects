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
    errors:normalizeMockErrorImport(input.errors),
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


export function normalizeMockErrorImport(input={}){
  const result={};
  for(const subject of SUBJECT_ORDER){
    const row=input?.[subject]??{};
    result[subject]={
      wrong:Math.max(0,Math.min(99,Math.round(Number(row.wrong)||0))),
      topics:Array.isArray(row.topics)
        ? [...new Set(row.topics.map(value=>clean(value,80)).filter(Boolean))].slice(0,8)
        : []
    };
  }
  return result;
}

export function buildSevenDayRepairPlan(room,startDate){
  const date=normalizeDate(startDate);
  if(!date||!room?.latest)return [];
  const priorities=(room.prioritySubjects??[]).slice(0,5);
  const tasks=[];
  for(let day=0;day<7;day+=1){
    const d=new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate()+day);
    const iso=d.toISOString().slice(0,10);
    const daily=[];
    const primary=priorities[day%Math.max(1,Math.min(3,priorities.length))];
    const secondary=priorities[(day+1)%Math.max(1,priorities.length)];
    for(const target of [primary,secondary]){
      if(!target)continue;
      const errorInfo=room.latest.errors?.[target.subject]??{wrong:0,topics:[]};
      daily.push({
        subject:target.subject,
        level:target.level,
        wrong:errorInfo.wrong,
        topic:errorInfo.topics[day%Math.max(1,errorInfo.topics.length)]??null,
        questionTarget:target===primary?10:5,
        mode:target.weakness>=5?'repair':'maintain'
      });
    }
    tasks.push({date:iso,tasks:daily});
  }
  return tasks;
}

export function buildCoverageReport(questions=[],history=[]){
  const coverage={};
  for(const subject of SUBJECT_ORDER){
    const required=[...new Set(
      questions
        .filter(q=>q?.subject===subject&&q?.examAligned)
        .map(q=>q?.examProfile?.competency||q?.competency||q?.topic)
        .filter(Boolean)
    )].sort();
    const practiced=new Set(
      history
        .filter(item=>item?.subject===subject)
        .map(item=>item?.competency)
        .filter(Boolean)
    );
    const covered=required.filter(item=>practiced.has(item));
    const missing=required.filter(item=>!practiced.has(item));
    coverage[subject]={
      total:required.length,
      covered:covered.length,
      percent:required.length?Math.round(covered.length/required.length*100):0,
      coveredSkills:covered,
      missingSkills:missing
    };
  }
  return coverage;
}
