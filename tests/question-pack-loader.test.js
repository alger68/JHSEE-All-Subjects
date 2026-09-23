import { describe, expect, it, vi } from 'vitest';
import { validatePackManifest, loadQuestionPacks } from '../js/core/question-pack-loader.js';

describe('question pack loader', () => {
  it('accepts unique enabled core and optional packs', () => {
    const result = validatePackManifest({
      version:1,
      packs:[
        {id:'core-v1',version:1,file:'../questions.json',enabled:true,kind:'local-core'},
        {id:'english-reading-v1',version:1,file:'./english-reading-v1.json',enabled:true,kind:'local-pack',subject:'english'}
      ]
    });
    expect(result.ok).toBe(true);
    expect(result.packs).toHaveLength(2);
  });

  it('rejects duplicate pack ids and invalid kinds', () => {
    const result = validatePackManifest({
      version:1,
      packs:[
        {id:'dup',version:1,file:'a.json',enabled:true,kind:'local-core'},
        {id:'dup',version:1,file:'b.json',enabled:true,kind:'remote'}
      ]
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/duplicate pack id|invalid kind/);
  });

  it('continues when an optional pack fails but fails when a core pack fails', async () => {
    const manifest = {
      version:1,
      packs:[
        {id:'core-v1',version:1,file:'core.json',enabled:true,kind:'local-core'},
        {id:'extra-v1',version:1,file:'extra.json',enabled:true,kind:'local-pack'}
      ]
    };
    const okCore = vi.fn(async url => {
      if (String(url).endsWith('manifest.json')) return {ok:true,json:async()=>manifest};
      if (String(url).endsWith('core.json')) return {ok:true,json:async()=>[{id:'q1'}]};
      return {ok:false,json:async()=>null};
    });
    const loaded = await loadQuestionPacks({manifestUrl:'https://example.test/packs/manifest.json',fetchImpl:okCore});
    expect(loaded.questions).toHaveLength(1);
    expect(loaded.warnings[0]).toMatch(/extra-v1/);

    const brokenCore = vi.fn(async url => String(url).endsWith('manifest.json')
      ? {ok:true,json:async()=>manifest}
      : {ok:false,json:async()=>null});
    await expect(loadQuestionPacks({manifestUrl:'https://example.test/packs/manifest.json',fetchImpl:brokenCore}))
      .rejects.toThrow(/core-v1/);
  });
});
