const SUBJECTS=new Set(['chinese','english','math','science','social']);
const MODES=new Set(['normal','confirmation','near-transfer','remediation','diagnostic','maintenance']);

const clean=(value,max=4000)=>typeof value==='string'?value.trim().slice(0,max):'';
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));

export const generatedQuestionSchema={
  type:'object',
  additionalProperties:false,
  required:['questions'],
  properties:{
    questions:{
      type:'array',
      minItems:1,
      maxItems:5,
      items:{
        type:'object',
        additionalProperties:false,
        required:[
          'id','subject','domain','questionType','competency','difficulty','passage','question',
          'choices','answer','explanation','hint1','hint2','errorTags'
        ],
        properties:{
          id:{type:'string',minLength:1,maxLength:80},
          subject:{type:'string',enum:['chinese','english','math','science','social']},
          domain:{type:'string',minLength:1,maxLength:80},
          questionType:{type:'string',minLength:1,maxLength:80},
          competency:{type:'string',minLength:1,maxLength:120},
          difficulty:{type:'integer',minimum:1,maximum:5},
          passage:{type:'string',maxLength:5000},
          question:{type:'string',minLength:1,maxLength:1500},
          choices:{
            type:'array',minItems:4,maxItems:4,
            items:{type:'string',minLength:1,maxLength:600}
          },
          answer:{type:'integer',minimum:0,maximum:3},
          explanation:{type:'string',minLength:1,maxLength:2500},
          hint1:{type:'string',minLength:1,maxLength:800},
          hint2:{type:'string',minLength:1,maxLength:800},
          errorTags:{
            type:'array',minItems:4,maxItems:4,
            items:{type:'string',minLength:1,maxLength:80}
          }
        }
      }
    }
  }
};

function normalizeBrief(brief){
  if(!brief||typeof brief!=='object')return null;
  const subject=clean(brief.subject,30);
  const domain=clean(brief.domain,120);
  const coreSkill=clean(brief.coreSkill,160);
  const subSkill=clean(brief.subSkill,160)||coreSkill;
  const practiceMode=clean(brief.practiceMode,40);
  if(!SUBJECTS.has(subject)||!domain||!coreSkill||!MODES.has(practiceMode))return null;
  const mastery=Number(brief.mastery);
  const priority=Number(brief.priority);
  const consecutiveWrong=Number(brief.consecutiveWrong);
  const targetDifficulty=Number(brief.targetDifficulty);
  return {
    subject,domain,coreSkill,subSkill,
    mastery:clamp(Number.isFinite(mastery)?mastery:60,0,100),
    priority:clamp(Number.isFinite(priority)?priority:40,0,100),
    consecutiveWrong:clamp(Number.isFinite(consecutiveWrong)?consecutiveWrong:0,0,20),
    practiceMode,
    targetDifficulty:clamp(Number.isFinite(targetDifficulty)?targetDifficulty:3,1,5),
    requirements:Array.isArray(brief.requirements)?brief.requirements.map(x=>clean(x,240)).filter(Boolean).slice(0,8):[]
  };
}

export function validateGenerateRequest(body){
  const brief=normalizeBrief(body?.brief);
  if(!brief)return {ok:false,error:'brief is required and must contain a valid subject, domain, coreSkill, and practiceMode'};
  const count=clamp(Math.round(Number(body?.count)||3),1,5);
  const sourceQuestion=body?.sourceQuestion&&typeof body.sourceQuestion==='object'?{
    question:clean(body.sourceQuestion.question,1500),
    passage:clean(body.sourceQuestion.passage,5000),
    choices:Array.isArray(body.sourceQuestion.choices)?body.sourceQuestion.choices.map(x=>clean(x,600)).slice(0,4):[]
  }:null;
  const avoidQuestions=Array.isArray(body?.avoidQuestions)
    ? body.avoidQuestions.slice(-8).map(item=>({
        question:clean(item?.question,800),
        passage:clean(item?.passage,1800)
      })).filter(item=>item.question||item.passage)
    :[];
  return {ok:true,value:{brief,count,sourceQuestion,avoidQuestions}};
}

export function buildGenerationPrompt(brief,sourceQuestion,count,avoidQuestions=[]){
  const source=sourceQuestion
    ? `\n原始題僅用來辨識能力，不可改寫或近似複製：\n題幹：${sourceQuestion.question||'(無)'}\n文章：${sourceQuestion.passage||'(無)'}`
    :'';
  const avoid=(avoidQuestions??[]).length
    ? `\n最近已做過的題目，禁止重複其情境、敘事骨架或核心表面形式：\n${avoidQuestions.map((item,index)=>`${index+1}. 題幹：${item.question||'(無)'}｜材料：${item.passage||'(無)'}`).join('\n')}`
    :'';
  return [
    '請產生台灣國中教育會考風格的原創練習題。',
    `科目：${brief.subject}`,
    `領域：${brief.domain}`,
    `核心能力：${brief.coreSkill}`,
    `子能力：${brief.subSkill}`,
    `學生熟練度：${brief.mastery}/100；Priority：${brief.priority}/100；連錯：${brief.consecutiveWrong} 次`,
    `訓練模式：${brief.practiceMode}；目標難度：${brief.targetDifficulty}/5`,
    `請產生 ${count} 題。`,
    '每題四個選項且只有一個最佳答案。錯誤選項需各自代表合理迷思，errorTags 依 A/B/C/D 順序對應。',
    '不得只替換人名、數字、地點或關鍵名詞；必須更換情境、資訊表面與敘事。',
    '同一批題目彼此也必須明顯不同：盡量輪替短文、公告、對話、表格、圖表、實驗紀錄、生活情境、史料或資料判讀等刺激形式；不可全部使用同一敘事模板。',
    '不得複製歷屆官方題目文字。解析要說明為何正解成立，提示不得直接洩漏答案。',
    brief.requirements.length?`其他要求：${brief.requirements.join('；')}`:'',
    source,
    avoid
  ].filter(Boolean).join('\n');
}

export function extractResponseJson(apiResponse){
  const direct=clean(apiResponse?.output_text,20000);
  if(direct){
    try{return JSON.parse(direct);}catch{}
  }
  for(const item of apiResponse?.output??[]){
    if(item?.type!=='message')continue;
    for(const content of item.content??[]){
      if(content?.type==='output_text'&&typeof content.text==='string'){
        try{return JSON.parse(content.text);}catch{}
      }
    }
  }
  throw new Error('OpenAI response did not contain parseable structured output');
}

const norm=(s)=>clean(s,6000).toLowerCase().replace(/\s+/g,' ').replace(/[\p{P}\p{S}]/gu,'').trim();

function shingles(value,size=3){
  const text=norm(value).replace(/\s+/g,'');
  if(text.length<size)return new Set(text?[text]:[]);
  const set=new Set();
  for(let i=0;i<=text.length-size;i+=1)set.add(text.slice(i,i+size));
  return set;
}
function similarity(a,b){
  const left=shingles(a),right=shingles(b);
  if(!left.size||!right.size)return 0;
  let intersection=0;
  for(const token of left)if(right.has(token))intersection+=1;
  return intersection/(left.size+right.size-intersection);
}

export function qaGeneratedQuestions(payload,brief,count,sourceQuestion=null,avoidQuestions=[]){
  if(!payload||!Array.isArray(payload.questions)||payload.questions.length!==count){
    return {ok:false,error:'question count mismatch'};
  }
  const ids=new Set();
  const texts=new Set();
  const priorQuestions=[];
  const priorPassages=[];
  const sourceQ=norm(sourceQuestion?.question||'');
  const sourceP=norm(sourceQuestion?.passage||'');
  for(const q of payload.questions){
    if(!q||typeof q!=='object')return {ok:false,error:'invalid question object'};
    if(!clean(q.id,80)||ids.has(q.id))return {ok:false,error:'duplicate or missing id'};
    ids.add(q.id);
    const qt=norm(q.question);
    if(!qt||texts.has(qt))return {ok:false,error:'duplicate or missing question'};
    if(priorQuestions.some(old=>similarity(q.question,old)>0.80))return {ok:false,error:'questions within batch are too similar'};
    if(q.passage&&priorPassages.some(old=>old&&similarity(q.passage,old)>0.84))return {ok:false,error:'passages within batch are too similar'};
    texts.add(qt);
    priorQuestions.push(q.question);
    if(q.passage)priorPassages.push(q.passage);
    if(sourceQ&&(qt===sourceQ||similarity(q.question,sourceQuestion?.question)>0.82))return {ok:false,error:'question too similar to source'};
    if(sourceP&&(norm(q.passage)===sourceP||similarity(q.passage,sourceQuestion?.passage)>0.86))return {ok:false,error:'passage too similar to source'};
    for(const old of avoidQuestions??[]){
      if(old?.question&&similarity(q.question,old.question)>0.78)return {ok:false,error:'question too similar to recent history'};
      if(q.passage&&old?.passage&&similarity(q.passage,old.passage)>0.82)return {ok:false,error:'passage too similar to recent history'};
    }
    if(q.subject!==brief.subject)return {ok:false,error:'subject mismatch'};
    if(clean(q.domain,120)!==brief.domain)return {ok:false,error:'domain mismatch'};
    if(clean(q.competency,160)!==brief.coreSkill)return {ok:false,error:'core skill mismatch'};
    if(Number(q.difficulty)!==Number(brief.targetDifficulty))return {ok:false,error:'difficulty mismatch'};
    if(!Array.isArray(q.choices)||q.choices.length!==4||new Set(q.choices.map(norm)).size!==4)return {ok:false,error:'invalid choices'};
    if(!Number.isInteger(q.answer)||q.answer<0||q.answer>3)return {ok:false,error:'invalid answer'};
    if(!clean(q.explanation,2500)||!clean(q.hint1,800)||!clean(q.hint2,800))return {ok:false,error:'missing explanation or hints'};
    if(!Array.isArray(q.errorTags)||q.errorTags.length!==4||q.errorTags.some(x=>!clean(x,80)))return {ok:false,error:'invalid error tags'};
  }
  const questions=payload.questions.map((q,index)=>({
    ...q,
    id:`ai-${Date.now()}-${index}-${q.id}`,
    source:'ai_generated',
    chapter:q.domain,
    topic:q.competency,
    grade:9,
    tags:['ai-generated',brief.practiceMode,brief.coreSkill],
    examAligned:true,
    examProfile:{domain:q.domain,type:q.questionType,competency:q.competency},
    alignmentBasis:`Adaptive AI practice: ${brief.coreSkill}`,
    aiGenerated:true,
    aiPracticeMode:brief.practiceMode
  }));
  return {ok:true,questions};
}
