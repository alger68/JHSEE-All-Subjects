const punctuation = /[\p{P}\p{S}]+/gu;

export function normalizeQuestionText(value='') {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(punctuation, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function materialText(question={}) {
  const table = question?.table
    ? [
        ...(question.table.headers ?? []),
        ...(question.table.rows ?? []).flat()
      ].join(' ')
    : '';
  return [
    question?.question,
    question?.passage,
    table
  ].map(normalizeQuestionText).filter(Boolean).join(' ');
}

function metadata(question={}) {
  return {
    competency: normalizeQuestionText(question?.examProfile?.competency ?? question?.competency ?? ''),
    type: normalizeQuestionText(question?.questionType ?? question?.examProfile?.type ?? '')
  };
}

function tokenize(text='') {
  const normalized=normalizeQuestionText(text);
  const words=normalized.match(/[a-z0-9]+|[\p{Script=Han}]/gu) ?? [];
  const tokens=[];
  let hanRun='';
  const flushHan=()=>{
    if(!hanRun)return;
    if(hanRun.length===1)tokens.push(hanRun);
    else for(let i=0;i<hanRun.length-1;i+=1)tokens.push(hanRun.slice(i,i+2));
    hanRun='';
  };
  for(const token of words){
    if(/^\p{Script=Han}$/u.test(token)) hanRun+=token;
    else { flushHan(); tokens.push(token); }
  }
  flushHan();
  return new Set(tokens);
}

function ngrams(text='',size=3) {
  const normalized=normalizeQuestionText(text).replace(/\s+/g,' ');
  const set=new Set();
  if(normalized.length<size){ if(normalized)set.add(normalized); return set; }
  for(let i=0;i<=normalized.length-size;i+=1)set.add(normalized.slice(i,i+size));
  return set;
}

function jaccard(a,b) {
  if(!a.size&&!b.size)return 1;
  let intersection=0;
  for(const value of a)if(b.has(value))intersection+=1;
  const union=a.size+b.size-intersection;
  return union ? intersection/union : 0;
}

function fnv1a(value='') {
  let hash=0x811c9dc5;
  for(let i=0;i<value.length;i+=1){
    hash^=value.charCodeAt(i);
    hash=Math.imul(hash,0x01000193);
  }
  return (hash>>>0).toString(16).padStart(8,'0');
}

export function questionFingerprint(question={}) {
  const meta=metadata(question);
  return fnv1a([materialText(question),meta.competency,meta.type].join('|'));
}

export function questionSimilarity(a={},b={}) {
  const textA=materialText(a),textB=materialText(b);
  const tokenScore=jaccard(tokenize(textA),tokenize(textB));
  const gramScore=jaccard(ngrams(textA),ngrams(textB));
  const metaA=metadata(a),metaB=metadata(b);
  const competencyScore=metaA.competency&&metaA.competency===metaB.competency ? 1 : 0;
  const typeScore=metaA.type&&metaA.type===metaB.type ? 1 : 0;
  return Math.max(0,Math.min(1,
    tokenScore*0.55+
    gramScore*0.20+
    competencyScore*0.15+
    typeScore*0.10
  ));
}

export function isNearDuplicate(candidate,reference,{hardThreshold=0.85,conditionalThreshold=0.70}={}) {
  if(questionFingerprint(candidate)===questionFingerprint(reference))return true;
  const similarity=questionSimilarity(candidate,reference);
  if(similarity>=hardThreshold)return true;
  if(similarity<conditionalThreshold)return false;
  const a=metadata(candidate),b=metadata(reference);
  return Boolean(a.competency&&a.competency===b.competency&&a.type&&a.type===b.type);
}

export function dedupeQuestions(questions=[],references=[],policy={}) {
  const accepted=[],rejected=[];
  for(const question of questions??[]){
    let duplicate=null;
    for(const reference of [...references,...accepted]){
      if(isNearDuplicate(question,reference,policy)){
        duplicate={reference,similarity:questionSimilarity(question,reference)};
        break;
      }
    }
    if(duplicate)rejected.push({question,reason:'near-duplicate',similarity:duplicate.similarity});
    else accepted.push(question);
  }
  return {accepted,rejected};
}
