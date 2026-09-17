import { describe, expect, it } from 'vitest';
import {
  buildGenerationPrompt,
  extractResponseJson,
  generatedQuestionSchema,
  qaGeneratedQuestions,
  validateGenerateRequest
} from '../api/lib/question-service.js';
import { createGenerateQuestionHandler } from '../api/generate-question.js';

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

const generated = (id='ai-1') => ({
  id,
  subject: 'english',
  domain: '閱讀理解',
  questionType: '推論題',
  competency: '上下文推論',
  difficulty: 2,
  passage: 'Mia planned to walk home, but dark clouds gathered. Her teacher offered her an umbrella. Mia thanked her and waited by the school gate until the rain became lighter.',
  question: `Why did Mia probably wait by the school gate? ${id}`,
  choices: [
    'She wanted the rain to become weaker.',
    'She forgot where her home was.',
    'She needed to return the umbrella immediately.',
    'She was waiting for another class to begin.'
  ],
  answer: 0,
  explanation: 'The passage says she waited until the rain became lighter, so the best inference is that she wanted safer or easier conditions before walking home.',
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
    const result = validateGenerateRequest({ brief, count: 9, sourceQuestion: { question: 'old' } });
    expect(result.ok).toBe(true);
    expect(result.value.count).toBe(5);
  });

  it('builds a prompt that preserves the target skill while forbidding superficial copies', () => {
    const prompt = buildGenerationPrompt(brief, { question: 'Why did Ben leave?', passage: 'Old source text' }, 3);
    expect(prompt).toContain('上下文推論');
    expect(prompt).toContain('remediation');
    expect(prompt).toContain('不得只替換');
    expect(prompt).toContain('3');
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
    const result = qaGeneratedQuestions({ questions: [generated('a'), generated('b')] }, brief, 2);
    expect(result.ok).toBe(true);
    expect(result.questions).toHaveLength(2);
  });
});


describe('generate-question HTTP handler', () => {
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
          content:[{type:'output_text',text:JSON.stringify({questions:[generated('x'),generated('y')]})}]
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
        : [generated('good1'),generated('good2')];
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

});
