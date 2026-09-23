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
    targetSchoolId:String(profile?.targetSchoolId||'banqiao')
  };
}

export function buildPlacementModel({profile={},latestMock=null,adaptiveWeights={},schools=KB_SCHOOLS}={}){
  const resolved=resolvePlacementProfile(profile,latestMock);
  const availableSchools=visibleSchools(resolved.gender,schools);
  if(!availableSchools.some(school=>school.id===resolved.targetSchoolId)){
    resolved.targetSchoolId=availableSchools[0]?.id??'';
  }
  const score=calculateExamPlacementScore(resolved.grades,resolved.writing);
  return {
    profile:resolved,
    score,
    bands:score.complete?buildPlacementBands(score.examScore,resolved.gender,schools):{challenge:[],match:[],safe:[]},
    target:score.complete?targetSchoolAnalysis(score.examScore,resolved.grades,resolved.targetSchoolId,adaptiveWeights,schools):null,
    schools:availableSchools
  };
}
