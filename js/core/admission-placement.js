import { SUBJECT_ORDER } from '../config/subjects.js';
import { KB_ADMISSION_RULE, KB_SCHOOLS } from '../config/admission-kb.js';

const LEVELS=['C','B','B+','B++','A','A+','A++'];
const cleanGender=value=>['all','male','female'].includes(value)?value:'all';

export function normalizeAdmissionGrades(grades={}){
  const result={};
  for(const subject of SUBJECT_ORDER){
    const level=String(grades?.[subject]??'').trim();
    result[subject]=KB_ADMISSION_RULE.subjectPoints[level]!==undefined?level:'';
  }
  return result;
}

export function calculateExamPlacementScore(grades={},writing=4){
  const normalized=normalizeAdmissionGrades(grades);
  const subjects=SUBJECT_ORDER.map(subject=>KB_ADMISSION_RULE.subjectPoints[normalized[subject]]??0);
  const complete=SUBJECT_ORDER.every(subject=>Boolean(normalized[subject]));
  const writingGrade=Math.max(1,Math.min(6,Math.round(Number(writing)||4)));
  const writingPoints=KB_ADMISSION_RULE.writingPoints[writingGrade]??0;
  const subjectPoints=subjects.reduce((sum,value)=>sum+value,0);
  return {
    complete,
    grades:normalized,
    writingGrade,
    subjectPoints,
    writingPoints,
    examScore:Math.round((subjectPoints+writingPoints)*10)/10,
    max:KB_ADMISSION_RULE.examMax
  };
}

const pickAllowed=(value,allowed)=>{
  if(value===null||value===undefined||value==='')return null;
  const n=Number(value);
  return allowed.includes(n)?n:null;
};

export function calculateTotalAdmissionScore(examResult={},profile={}){
  const preferencePoints=pickAllowed(profile.preferencePoints,[36,35,34,33,32]);
  const balancedPoints=pickAllowed(profile.balancedPoints,[0,6,12,18,24]);
  const servicePoints=pickAllowed(profile.servicePoints,[0,4,8,12]);
  const complete=Boolean(examResult?.complete)&&preferencePoints!==null&&balancedPoints!==null&&servicePoints!==null;
  const total=complete
    ? Math.round((examResult.examScore+preferencePoints+balancedPoints+servicePoints)*10)/10
    : null;
  return {
    complete,
    preferencePoints,
    balancedPoints,
    servicePoints,
    total,
    max:KB_ADMISSION_RULE.totalMax
  };
}

export function visibleSchools(gender='all',schools=KB_SCHOOLS){
  const selected=cleanGender(gender);
  if(selected==='all')return [...schools];
  return schools.filter(school=>school.gender==='all'||school.gender===selected);
}

export function placementBand(score,school){
  if(!Number.isFinite(score)||!school)return 'unknown';
  if(score>=school.high+0.8)return 'safe';
  if(score>=school.low-0.3)return 'match';
  if(score>=school.low-1.5)return 'challenge';
  return 'reach';
}

export function buildPlacementBands(score,gender='all',schools=KB_SCHOOLS){
  const groups={challenge:[],match:[],safe:[]};
  for(const school of visibleSchools(gender,schools)){
    const band=placementBand(score,school);
    if(groups[band])groups[band].push({
      ...school,
      band,
      midpoint:Math.round(((school.low+school.high)/2)*10)/10,
      gapToLow:Math.round((school.low-score)*10)/10
    });
  }
  const distance=(school)=>Math.abs(((school.low+school.high)/2)-score);
  for(const key of Object.keys(groups)){
    groups[key].sort((a,b)=>distance(a)-distance(b)||b.high-a.high);
    groups[key]=groups[key].slice(0,8);
  }
  return groups;
}

export function nextGrade(level){
  const index=LEVELS.indexOf(level);
  if(index<0||index===LEVELS.length-1)return null;
  return LEVELS[index+1];
}

export function subjectUpgradePlan(grades={},adaptiveWeights={}){
  const normalized=normalizeAdmissionGrades(grades);
  return SUBJECT_ORDER.map(subject=>{
    const current=normalized[subject];
    const next=nextGrade(current);
    if(!current||!next)return null;
    const gain=(KB_ADMISSION_RULE.subjectPoints[next]??0)-(KB_ADMISSION_RULE.subjectPoints[current]??0);
    return {
      subject,
      current,
      next,
      gain,
      adaptiveWeight:Number(adaptiveWeights?.[subject]??0),
      priority:(8-(KB_ADMISSION_RULE.subjectPoints[current]??0))*10+Number(adaptiveWeights?.[subject]??0)
    };
  }).filter(Boolean).sort((a,b)=>b.priority-a.priority||b.gain-a.gain);
}

export function targetSchoolAnalysis(score,grades,targetSchoolId,adaptiveWeights={},schools=KB_SCHOOLS){
  const school=schools.find(item=>item.id===targetSchoolId)??null;
  if(!school||!Number.isFinite(score))return null;
  const midpoint=Math.round(((school.low+school.high)/2)*10)/10;
  return {
    school,
    score,
    midpoint,
    gapToLow:Math.max(0,Math.round((school.low-score)*10)/10),
    gapToMid:Math.max(0,Math.round((midpoint-score)*10)/10),
    band:placementBand(score,school),
    upgrades:subjectUpgradePlan(grades,adaptiveWeights).slice(0,5)
  };
}

function isoAddDays(date,days){
  const base=/^\d{4}-\d{2}-\d{2}$/.test(String(date??''))?String(date):new Date().toISOString().slice(0,10);
  const value=new Date(`${base}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate()+days);
  return value.toISOString().slice(0,10);
}

function topAdaptiveSkill(adaptiveSkills={},subject){
  return Object.values(adaptiveSkills??{})
    .filter(item=>item?.subject===subject)
    .sort((a,b)=>(b.priorityScore??0)-(a.priorityScore??0)||(a.mastery??60)-(b.mastery??60))[0]??null;
}

const PLAN_PHASES=['弱點修復','近遷移','混合應用','弱點修復','近遷移','錯題回收','週末驗收'];

export function buildTargetSevenDayPlan(target,adaptiveSkills={},startDate=''){
  if(!target?.school||!Array.isArray(target.upgrades)||!target.upgrades.length)return [];
  const ranked=target.upgrades.slice(0,3);
  const gap=Math.max(0,Number(target.gapToLow)||0);
  const basePrimary=gap>=3?12:gap>=1?10:8;
  const baseSecondary=gap>=3?7:gap>=1?5:4;

  return Array.from({length:7},(_,dayIndex)=>{
    const phase=PLAN_PHASES[dayIndex];
    const selected=dayIndex===6
      ? ranked
      : [ranked[dayIndex%ranked.length],ranked[(dayIndex+1)%ranked.length]];
    const seen=new Set();
    const tasks=[];
    for(const [index,item] of selected.entries()){
      if(!item||seen.has(item.subject))continue;
      seen.add(item.subject);
      const skill=topAdaptiveSkill(adaptiveSkills,item.subject);
      const questionTarget=dayIndex===6
        ? Math.max(4,Math.round((basePrimary+baseSecondary)/Math.max(1,ranked.length)))
        : index===0?basePrimary:baseSecondary;
      tasks.push({
        subject:item.subject,
        current:item.current,
        next:item.next,
        scoreGain:item.gain,
        questionTarget,
        phase,
        competency:skill?.competency??null,
        domain:skill?.domain??null,
        mastery:Number.isFinite(Number(skill?.mastery))?Number(skill.mastery):null,
        priorityScore:Number.isFinite(Number(skill?.priorityScore))?Number(skill.priorityScore):null
      });
    }
    return {
      day:dayIndex+1,
      date:isoAddDays(startDate,dayIndex),
      phase,
      tasks,
      questionTarget:tasks.reduce((sum,item)=>sum+item.questionTarget,0)
    };
  });
}

export function resolvePlacementProfile(profile={},latestMock=null){
  const source=profile?.source==='manual'?'manual':'latest-mock';
  const manualGrades=normalizeAdmissionGrades(profile?.grades);
  const latestGrades=normalizeAdmissionGrades(latestMock?.grades);
  const hasManual=SUBJECT_ORDER.some(subject=>Boolean(manualGrades[subject]));
  return {
    source,
    grades:source==='manual'&&hasManual?manualGrades:latestGrades,
    writing:Math.max(1,Math.min(6,Math.round(Number(profile?.writing)||4))),
    gender:cleanGender(profile?.gender),
    targetSchoolId:String(profile?.targetSchoolId||'banqiao'),
    preferencePoints:pickAllowed(profile?.preferencePoints,[36,35,34,33,32]),
    balancedPoints:pickAllowed(profile?.balancedPoints,[0,6,12,18,24]),
    servicePoints:pickAllowed(profile?.servicePoints,[0,4,8,12])
  };
}

export function buildPlacementModel({
  profile={},
  latestMock=null,
  adaptiveWeights={},
  adaptiveSkills={},
  today='',
  schools=KB_SCHOOLS
}={}){
  const resolved=resolvePlacementProfile(profile,latestMock);
  const availableSchools=visibleSchools(resolved.gender,schools);
  if(!availableSchools.some(school=>school.id===resolved.targetSchoolId)){
    resolved.targetSchoolId=availableSchools[0]?.id??'';
  }
  const score=calculateExamPlacementScore(resolved.grades,resolved.writing);
  const totalScore=calculateTotalAdmissionScore(score,resolved);
  const target=score.complete
    ? targetSchoolAnalysis(score.examScore,resolved.grades,resolved.targetSchoolId,adaptiveWeights,schools)
    : null;
  return {
    profile:resolved,
    score,
    totalScore,
    bands:score.complete?buildPlacementBands(score.examScore,resolved.gender,schools):{challenge:[],match:[],safe:[]},
    target,
    sevenDayPlan:target?buildTargetSevenDayPlan(target,adaptiveSkills,today):[],
    schools:availableSchools
  };
}
