import {
  buildGenerationPrompt,
  extractResponseJson,
  generatedQuestionSchema,
  qaGeneratedQuestions,
  validateGenerateRequest
} from './lib/question-service.js';

const json=(body,status=200,headers={})=>Response.json(body,{
  status,
  headers:{'cache-control':'no-store','content-type':'application/json; charset=utf-8',...headers}
});

function corsHeaders(request,env){
  const configured=(env.AI_ALLOWED_ORIGINS||'https://alger68.github.io').split(',').map(x=>x.trim()).filter(Boolean);
  const origin=request.headers.get('origin')||'';
  const allowed=origin&&configured.includes(origin)?origin:'';
  return {
    ...(allowed?{'access-control-allow-origin':allowed}:{}),
    'access-control-allow-methods':'POST, OPTIONS',
    'access-control-allow-headers':'content-type',
    'vary':'Origin'
  };
}

function openAiBody({brief,count,sourceQuestion},env){
  const model=env.AI_QUESTION_MODEL||'gpt-5.6-luna';
  const maxOutput=Math.max(600,Math.min(5000,Number(env.AI_MAX_OUTPUT_TOKENS)||2400));
  return {
    model,
    input:[
      {
        role:'system',
        content:[
          '你是台灣國中教育會考練習題命題助手。',
          '只產生原創題，不宣稱題目是官方命題或官方審定。',
          '每題必須有唯一最佳答案，答案與解析需自行驗證。',
          '數學與理化計算必須先獨立解出正確答案再設計干擾選項。',
          '題目應符合國中程度，不要求高中以上知識。',
          '不要輸出 schema 之外的文字。'
        ].join('\n')
      },
      {role:'user',content:buildGenerationPrompt(brief,sourceQuestion,count)}
    ],
    max_output_tokens:maxOutput,
    text:{
      format:{
        type:'json_schema',
        name:'jhsee_adaptive_questions',
        strict:true,
        schema:generatedQuestionSchema
      }
    }
  };
}

async function callOpenAi(fetchImpl,env,value,request){
  const response=await fetchImpl('https://api.openai.com/v1/responses',{
    method:'POST',
    headers:{
      'authorization':`Bearer ${env.OPENAI_API_KEY}`,
      'content-type':'application/json'
    },
    body:JSON.stringify(openAiBody(value,env)),
    signal:request.signal
  });
  const payload=await response.json().catch(()=>null);
  if(!response.ok){
    const code=payload?.error?.code||payload?.error?.type||'openai_error';
    throw Object.assign(new Error(`OpenAI request failed: ${code}`),{status:502});
  }
  return {payload,model:env.AI_QUESTION_MODEL||'gpt-5.6-luna'};
}

export function createGenerateQuestionHandler({fetchImpl=fetch,env=process.env}={}){
  const rateBuckets=new Map();
  const rateLimit=Math.max(1,Math.min(60,Number(env.AI_RATE_LIMIT_PER_MINUTE)||6));
  return async function handler(request){
    const cors=corsHeaders(request,env);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
    if(request.method!=='POST')return json({error:'method_not_allowed'},405,{...cors,allow:'POST, OPTIONS'});
    if(!env.OPENAI_API_KEY)return json({error:'ai_service_not_configured'},503,cors);

    const forwarded=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const client=forwarded||request.headers.get('x-real-ip')||'unknown';
    const minute=Math.floor(Date.now()/60000);
    const bucketKey=`${client}:${minute}`;
    const used=(rateBuckets.get(bucketKey)??0)+1;
    rateBuckets.set(bucketKey,used);
    if(rateBuckets.size>1000){
      for(const key of rateBuckets.keys()){
        if(!key.endsWith(`:${minute}`))rateBuckets.delete(key);
      }
    }
    if(used>rateLimit){
      return json({error:'rate_limited'},429,{
        ...cors,
        'retry-after':'60',
        'x-ratelimit-limit':String(rateLimit),
        'x-ratelimit-remaining':'0'
      });
    }

    const length=Number(request.headers.get('content-length')||0);
    if(length>32768)return json({error:'request_too_large'},413,cors);

    let body;
    try{body=await request.json();}catch{return json({error:'invalid_json'},400,cors);}
    const checked=validateGenerateRequest(body);
    if(!checked.ok)return json({error:'invalid_request',detail:checked.error},400,cors);

    let lastError='generation_failed';
    let usage=null;
    let model=env.AI_QUESTION_MODEL||'gpt-5.6-luna';
    for(let attempt=1;attempt<=2;attempt+=1){
      try{
        const result=await callOpenAi(fetchImpl,env,checked.value,request);
        model=result.model;
        usage=result.payload?.usage??null;
        const structured=extractResponseJson(result.payload);
        const qa=qaGeneratedQuestions(structured,checked.value.brief,checked.value.count,checked.value.sourceQuestion);
        if(qa.ok){
          return json({
            questions:qa.questions,
            meta:{model,attempt,usage,generatedAt:new Date().toISOString()}
          },200,cors);
        }
        lastError=qa.error;
      }catch(error){
        if(request.signal?.aborted)return json({error:'request_cancelled'},499,cors);
        lastError=error instanceof Error?error.message:String(error);
      }
    }
    return json({error:'generation_failed',detail:lastError},502,cors);
  };
}

const liveHandler=createGenerateQuestionHandler();

export async function POST(request){
  return liveHandler(request);
}

export async function OPTIONS(request){
  return liveHandler(new Request(request.url,{method:'OPTIONS',headers:request.headers}));
}

export default { fetch: liveHandler };
