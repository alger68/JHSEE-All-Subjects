const SUBJECTS=['chinese','english','math','science','social'];

function normalized(value){
  return String(value??'').normalize('NFKC').toLowerCase().replace(/\s+/g,'').trim();
}
function questionTerms(question){
  return new Set([
    question?.domain,
    question?.examProfile?.domain,
    question?.chapter,
    question?.topic,
    question?.questionType,
    question?.competency,
    ...(question?.tags??[])
  ].map(normalized).filter(Boolean));
}
function overlap(question,skill){
  if(question?.curriculumSkillId===skill.id)return 100;
  if(question?.subject!==skill.subject||Number(question?.grade)!==Number(skill.grade))return -1;
  const terms=questionTerms(question);
  let score=0;
  for(const value of skill.aliases?.domains??[])if(terms.has(normalized(value)))score+=4;
  for(const value of skill.aliases?.topics??[])if(terms.has(normalized(value)))score+=3;
  for(const value of skill.aliases?.tags??[])if(terms.has(normalized(value)))score+=2;
  return score;
}
export function mapQuestionToBlueprintSkill(question,blueprint){
  const candidates=(blueprint?.skills??[])
    .map(skill=>({skill,score:overlap(question,skill)}))
    .filter(row=>row.score>0)
    .sort((a,b)=>b.score-a.score||a.skill.id.localeCompare(b.skill.id));
  return candidates[0]?.skill??null;
}
export function auditBlueprintCoverage(questions=[],blueprint={skills:[]}){
  const counts=Object.fromEntries((blueprint.skills??[]).map(skill=>[skill.id,0]));
  let unmapped=0;
  for(const question of questions??[]){
    const skill=mapQuestionToBlueprintSkill(question,blueprint);
    if(skill)counts[skill.id]+=1;else unmapped+=1;
  }
  const bySubject={};
  for(const subject of SUBJECTS){
    const qs=(questions??[]).filter(q=>q.subject===subject);
    const skills=(blueprint.skills??[]).filter(skill=>skill.subject===subject);
    const rows=skills.map(skill=>({
      ...skill,
      count:counts[skill.id]??0,
      gap:Math.max(0,Number(skill.targetQuestions??0)-(counts[skill.id]??0))
    }));
    bySubject[subject]={
      total:qs.length,
      byGrade:Object.fromEntries([7,8,9].map(grade=>[grade,qs.filter(q=>Number(q.grade)===grade).length])),
      coveredSkills:rows.filter(row=>row.count>0).length,
      totalSkills:rows.length,
      gap:rows.reduce((sum,row)=>sum+row.gap,0),
      skills:rows
    };
  }
  return {
    totalQuestions:(questions??[]).length,
    mappedQuestions:(questions??[]).length-unmapped,
    unmappedQuestions:unmapped,
    totalGap:Object.values(bySubject).reduce((sum,row)=>sum+row.gap,0),
    bySubject
  };
}
