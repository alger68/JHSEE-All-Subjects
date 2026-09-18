import { describe, expect, it } from 'vitest';
import {
  buildGenerationPrompt,
  extractResponseJson,
  generatedQuestionSchema,
  qaGeneratedQuestions,
  validateGenerateRequest
} from '../api/lib/question-service.js';
import vercelHandler from '../api/generate-question.js';
import { createGenerateQuestionHandler } from '../api/lib/generate-handler.js';

const brief = {
  subject: 'english',
  domain: '閱讀理解',
  coreSkill: '上下文推論',
  subSkill: '推論題',
  mastery: 34,
  priority: 87,
  consecutiveWrong: 3,
  practiceMode: 'remediation',
  targetDifficulty: 2,
  requirements: ['保持相同核心能力，但改用不同情境']
};

const generated = (id='ai-1',variant='rain') => ({
  id,
  subject: 'english',
  domain: '閱讀理解',
  questionType: '推論題',
  competency: '上下文推論',
  difficulty: 2,
  passage: variant==='rain'
    ? 'Mia planned to walk home, but dark clouds gathered. Her teacher offered her an umbrella. Mia thanked her and waited by the school gate until the rain became lighter.'
    : 'Leo checked the library notice before school. The new schedule showed that Friday closing time had moved from 5 p.m. to 7 p.m. He decided to finish his group project there after basketball practice.',
  question: variant==='rain'
    ? `Why did Mia probably wait by the school gate? ${id}`
    : `Why did Leo decide to work at the library after practice? ${id}`,
  choices: variant==='rain' ? [
    'She wanted the rain to become weaker.',
    'She forgot where her home was.',
    'She needed to return the umbrella immediately.',
    'She was waiting for another class to begin.'
  ] : [
    'The library would stay open later on Friday.',
    'Basketball practice had been cancelled.',
    'His group had moved the project to Saturday.',
    'The library no longer allowed group work.'
  ],
  answer: 0,
  explanation: variant==='rain'
    ? 'The passage says she waited until the rain became lighter, so the best inference is that she wanted safer or easier conditions before walking home.'
    : 'The later Friday closing time gives Leo enough time to work there after basketball practice.',
  hint1: 'Compare the reason she waited with what changed afterward.',
  hint2: 'Use information from more than one sentence.',
  errorTags: ['single_sentence_bias', 'keyword_matching', 'over_inference', 'irrelevant_detail']
});

describe('AI question service contracts', () => {
  it('rejects a generation request without a valid adaptive brief', () => {
    const result = validateGenerateRequest({ count: 3 });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('brief');
  });

  it('accepts a bounded request and clamps question count', () => {
    const result = validateGenerateRequest({
      brief,
      count:9,
      sourceQuestion:{question:'old'},
      avoidQuestions:[{question:'recent one',passage:'recent passage'}]
    });
    expect(result.ok).toBe(true);
    expect(result.value.count).toBe(5);
    expect(result.value.avoidQuestions).toEqual([{question:'recent one',passage:'recent passage'}]);
  });


  it('preserves zero mastery and zero priority instead of replacing them with defaults', () => {
    const result=validateGenerateRequest({
      brief:{...brief,mastery:0,priority:0},
      count:1
    });
    expect(result.ok).toBe(true);
    expect(result.value.brief.mastery).toBe(0);
    expect(result.value.brief.priority).toBe(0);
  });

  it('builds a prompt that preserves the target skill while forbidding superficial copies', () => {
    const prompt = buildGenerationPrompt(
      brief,
      { question: 'Why did Ben leave?', passage: 'Old source text' },
      3,
      [{question:'A recent question',passage:'A recent passage'}]
    );
    expect(prompt).toContain('上下文推論');
    expect(prompt).toContain('remediation');
    expect(prompt).toContain('不得只替換');
    expect(prompt).toContain('3');
    expect(prompt).toContain('最近已做過');
    expect(prompt).toContain('同一批題目彼此也必須明顯不同');
  });

  it('defines a strict schema for four-choice questions', () => {
    expect(generatedQuestionSchema.properties.questions.items.properties.choices.minItems).toBe(4);
    expect(generatedQuestionSchema.properties.questions.items.properties.choices.maxItems).toBe(4);
    expect(generatedQuestionSchema.properties.questions.items.properties.answer.maximum).toBe(3);
  });

  it('extracts structured JSON from a Responses API message', () => {
    const apiResponse = {
      output: [{
        type: 'message',
        content: [{ type: 'output_text', text: JSON.stringify({ questions: [generated()] }) }]
      }]
    };
    expect(extractResponseJson(apiResponse).questions[0].id).toBe('ai-1');
  });

  it('rejects duplicate, off-skill, or malformed generated questions', () => {
    const duplicate = generated('same');
    const result = qaGeneratedQuestions({ questions: [duplicate, duplicate] }, brief, 2);
    expect(result.ok).toBe(false);
  });

  it('accepts a unique set aligned to the requested core skill', () => {
    const result = qaGeneratedQuestions({ questions: [generated('a','rain'), generated('b','library')] }, brief, 2);
    expect(result.ok).toBe(true);
    expect(result.questions).toHaveLength(2);
  });

  it('rejects a question that is too similar to recent history',()=>{
    const old=generated('old','rain');
    const fresh={...generated('new','rain'),question:'Why did Mia wait at the school gate until the rain got lighter?'};
    const result=qaGeneratedQuestions(
      {questions:[fresh]},
      brief,
      1,
      null,
      [{question:old.question,passage:old.passage}]
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/recent history|similar/);
  });

  it('rejects an AI batch whose passages are effectively the same template',()=>{
    const a=generated('a','rain');
    const b={...generated('b','rain'),question:'What most likely explains Mia staying at school for a while? b'};
    const result=qaGeneratedQuestions({questions:[a,b]},brief,2);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('passages within batch');
  });
});


describe('generate-question HTTP handler', () => {

  it('exports the Vercel Web Standard fetch handler shape', () => {
    expect(typeof vercelHandler).toBe('object');
    expect(typeof vercelHandler.fetch).toBe('function');
  });


  it('returns 405 for non-POST methods', async () => {
    const handler=createGenerateQuestionHandler({fetchImpl:async()=>{ throw new Error('should not call'); },env:{OPENAI_API_KEY:'x'}});
    const response=await handler(new Request('https://example.test/api/generate-question',{method:'GET'}));
    expect(response.status).toBe(405);
  });

  it('returns 503 when the OpenAI key is not configured', async () => {
    const handler=createGenerateQuestionHandler({fetchImpl:async()=>{ throw new Error('should not call'); },env:{}});
    const response=await handler(new Request('https://example.test/api/generate-question',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({brief,count:2})
    }));
    expect(response.status).toBe(503);
  });

  it('returns QA-approved questions from a structured Responses API payload', async () => {
    const fetchImpl=async (_url,options) => {
      const body=JSON.parse(options.body);
      expect(body.model).toBeTruthy();
      expect(body.text.format.type).toBe('json_schema');
      return new Response(JSON.stringify({
        output:[{
          type:'message',
          content:[{type:'output_text',text:JSON.stringify({questions:[generated('x','rain'),generated('y','library')]})}]
        }],
        usage:{input_tokens:123,output_tokens:456}
      }),{status:200,headers:{'content-type':'application/json'}});
    };
    const handler=createGenerateQuestionHandler({fetchImpl,env:{OPENAI_API_KEY:'test-key',AI_QUESTION_MODEL:'gpt-5.6-luna'}});
    const response=await handler(new Request('https://example.test/api/generate-question',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({brief,count:2})
    }));
    expect(response.status).toBe(200);
    const payload=await response.json();
    expect(payload.questions).toHaveLength(2);
    expect(payload.meta.model).toBe('gpt-5.6-luna');
  });
  it('retries once when model output fails QA', async () => {
    let calls=0;
    const fetchImpl=async()=>{
      calls+=1;
      const questions=calls===1
        ? [{...generated('bad'),competency:'錯誤能力'},generated('bad2')]
        : [generated('good1','rain'),generated('good2','library')];
      return new Response(JSON.stringify({
        output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({questions})}]}]
      }),{status:200,headers:{'content-type':'application/json'}});
    };
    const handler=createGenerateQuestionHandler({fetchImpl,env:{OPENAI_API_KEY:'test-key'}});
    const response=await handler(new Request('https://example.test/api/generate-question',{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({brief,count:2})
    }));
    expect(response.status).toBe(200);
    expect(calls).toBe(2);
  });

  it('rate limits repeated generation requests from the same client', async () => {
    const fetchImpl=async()=>new Response(JSON.stringify({
      output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({questions:[generated('limited')]})}]}]
    }),{status:200,headers:{'content-type':'application/json'}});
    const handler=createGenerateQuestionHandler({
      fetchImpl,
      env:{OPENAI_API_KEY:'test-key',AI_RATE_LIMIT_PER_MINUTE:'2'}
    });
    const makeRequest=()=>new Request('https://example.test/api/generate-question',{
      method:'POST',
      headers:{'content-type':'application/json','x-forwarded-for':'203.0.113.10'},
      body:JSON.stringify({brief,count:1})
    });
    expect((await handler(makeRequest())).status).toBe(200);
    expect((await handler(makeRequest())).status).toBe(200);
    expect((await handler(makeRequest())).status).toBe(429);
  });

});
