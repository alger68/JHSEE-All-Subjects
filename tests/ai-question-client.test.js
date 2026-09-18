import { describe, expect, it } from 'vitest';
import {
  mergeAiWithFallback,
  normalizeAiEndpoint,
  requestAiQuestions
} from '../js/core/ai-question-client.js';

const brief={subject:'english',domain:'閱讀理解',coreSkill:'上下文推論',practiceMode:'remediation',targetDifficulty:2};

const q=(id)=>({
  id,subject:'english',domain:'閱讀理解',questionType:'推論題',competency:'上下文推論',
  difficulty:2,question:'Q',choices:['A','B','C','D'],answer:0,explanation:'E',hint1:'H1',hint2:'H2',
  errorTags:['a','b','c','d'],examProfile:{domain:'閱讀理解',type:'推論題',competency:'上下文推論'}
});

describe('AI question client',()=>{
  it('normalizes a Vercel base URL to the generate-question endpoint',()=>{
    expect(normalizeAiEndpoint('https://jhsee-ai.vercel.app/')).toBe('https://jhsee-ai.vercel.app/api/generate-question');
    expect(normalizeAiEndpoint('https://jhsee-ai.vercel.app/api/generate-question')).toBe('https://jhsee-ai.vercel.app/api/generate-question');
  });

  it('returns null when no endpoint is configured',async()=>{
    expect(await requestAiQuestions({endpoint:'',brief,count:2,fetchImpl:async()=>{throw new Error('no');}})).toBeNull();
  });

  it('returns null on backend failure so the caller can use the local bank',async()=>{
    const result=await requestAiQuestions({
      endpoint:'https://example.test',
      brief,
      count:2,
      fetchImpl:async()=>new Response(JSON.stringify({error:'unavailable'}),{status:503,headers:{'content-type':'application/json'}})
    });
    expect(result).toBeNull();
  });

  it('returns generated questions on success',async()=>{
    const result=await requestAiQuestions({
      endpoint:'https://example.test',
      brief,
      avoidQuestions:[{question:'old q',passage:'old p'}],
      count:2,
      fetchImpl:async(_url,options)=>{
        const body=JSON.parse(options.body);
        expect(body.count).toBe(2);
        expect(body.brief.coreSkill).toBe('上下文推論');
        expect(body.avoidQuestions).toEqual([{question:'old q',passage:'old p'}]);
        return new Response(JSON.stringify({questions:[q('ai1'),q('ai2')]}),{status:200,headers:{'content-type':'application/json'}});
      }
    });
    expect(result).toHaveLength(2);
  });

  it('merges AI questions with fallback without duplicate IDs',()=>{
    const merged=mergeAiWithFallback([q('ai1'),q('shared')],[q('shared'),q('local2'),q('local3')],4);
    expect(merged.map(x=>x.id)).toEqual(['ai1','shared','local2','local3']);
  });
});
