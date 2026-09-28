import { readFileSync } from 'node:fs';
import { auditBlueprintCoverage } from '../js/core/coverage-audit.js';

const readJson=path=>JSON.parse(readFileSync(path,'utf8'));
const blueprint=readJson('data/curriculum-blueprint.json');
const manifest=readJson('public/question-packs/manifest.json');
const core=[...readJson('data/questions.json'),...readJson('data/cap-practice.json')];
const supplemental=manifest.packs
  .filter(pack=>pack.enabled!==false)
  .flatMap(pack=>readJson('public/question-packs/'+pack.file));

const before=auditBlueprintCoverage(core,blueprint);
const after=auditBlueprintCoverage([...core,...supplemental],blueprint);

console.log('JHSEE content coverage audit');
console.log(`Core: ${before.totalQuestions} questions, ${Object.values(before.bySubject).reduce((sum,row)=>sum+row.coveredSkills,0)}/${blueprint.skills.length} skills covered, target gap ${before.totalGap}`);
console.log(`Expanded: ${after.totalQuestions} questions, ${Object.values(after.bySubject).reduce((sum,row)=>sum+row.coveredSkills,0)}/${blueprint.skills.length} skills covered, target gap ${after.totalGap}`);
for(const [subject,row] of Object.entries(after.bySubject)){
  console.log(`${subject}: ${row.total} questions | G7 ${row.byGrade[7]} / G8 ${row.byGrade[8]} / G9 ${row.byGrade[9]} | ${row.coveredSkills}/${row.totalSkills} skills | gap ${row.gap}`);
}
const missing=Object.values(after.bySubject).flatMap(row=>row.skills.filter(skill=>skill.count===0));
if(missing.length){
  console.error('Uncovered blueprint skills:',missing.map(skill=>skill.id).join(', '));
  process.exitCode=1;
}
