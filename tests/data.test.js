import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateQuestion } from '../js/core/question-bank.js';
import { classifyQuestion } from '../js/core/exam-blueprint.js';
import { loadQuestionPacks, validatePackManifest } from '../js/core/question-pack-loader.js';

const questions = JSON.parse(readFileSync(join(process.cwd(), 'data/questions.json'), 'utf8'));

describe('V1 question content', () => {
  it('contains at least six valid original questions per subject', () => {
    for (const subject of ['chinese', 'english', 'math', 'science', 'social']) {
      const items = questions.filter((question) => question.subject === subject);
      expect(items.length).toBeGreaterThanOrEqual(10);
      expect(items.every((question) => validateQuestion(question).ok)).toBe(true);
    }
  });

  it('has globally unique ids', () => {
    expect(new Set(questions.map((question) => question.id)).size).toBe(questions.length);
  });

  it('does not infer reviewed exam alignment or a domain from legacy tags and RPG chapters', () => {
    const classified = classifyQuestion(questions[0]);
    expect(classified.examAligned).toBe(false);
    expect(classified.examProfile).toEqual({ domain: '未分類', type: '未分類', competency: '未分類' });
    expect(classified.examProfile.domain).not.toBe(questions[0].chapter);
  });

  it('requires explicit reviewed alignment metadata', () => {
    const base = {
      ...questions[0],
      examAligned: true,
      domain: '白話文閱讀',
      questionType: '主旨推論',
      competency: '閱讀理解與推論',
      alignmentBasis: '依官方命題原則檢核',
      reviewStatus: 'reviewed'
    };

    expect(classifyQuestion(base)).toMatchObject({
      examAligned: true,
      examProfile: { domain: '白話文閱讀', type: '主旨推論', competency: '閱讀理解與推論' }
    });
    expect(classifyQuestion({ ...base, reviewStatus: 'draft' })).toMatchObject({
      examAligned: false,
      examProfile: { domain: '未分類', type: '未分類', competency: '未分類' }
    });
  });
});


describe('question pack manifest', () => {
  const manifest = JSON.parse(readFileSync(join(process.cwd(), 'data/packs/manifest.json'), 'utf8'));

  it('registers both current core banks with unique pack ids', () => {
    const validated = validatePackManifest(manifest);
    expect(validated.ok).toBe(true);
    expect(validated.packs.map(pack => pack.id)).toEqual(['core-v1','cap-practice-v1']);
    expect(new Set(validated.packs.map(pack => pack.id)).size).toBe(validated.packs.length);
    for (const pack of validated.packs.filter(pack => pack.enabled && pack.kind === 'local-core')) {
      const path = join(process.cwd(), 'data/packs', pack.file);
      expect(() => readFileSync(path, 'utf8')).not.toThrow();
    }
  });

  it('preserves a synthetic 600-question optional pack', async () => {
    const synthetic = Array.from({length:600},(_,index)=>({id:`bulk-${index+1}`}));
    const bulkManifest = {
      version:1,
      packs:[{id:'bulk-v1',version:1,file:'bulk.json',enabled:true,kind:'local-pack',questionCount:600}]
    };
    const loaded = await loadQuestionPacks({
      manifestUrl:'https://example.test/packs/manifest.json',
      fetchImpl:async url => String(url).endsWith('manifest.json')
        ? {ok:true,json:async()=>bulkManifest}
        : {ok:true,json:async()=>synthetic}
    });
    expect(loaded.questions).toHaveLength(600);
    expect(loaded.questions[599]).toMatchObject({id:'bulk-600',packId:'bulk-v1',packVersion:1,sourceKind:'local-pack'});
  });
});
