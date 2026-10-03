// @vitest-environment node
import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import * as loader from '../js/core/question-pack-loader.js';
import viteConfig from '../vite.config.js';

const read=path=>JSON.parse(readFileSync(path,'utf8'));
const manifest=read('public/question-packs/manifest.json');
const packs=manifest.packs.filter(pack=>pack.enabled!==false);
const questions=packs.flatMap(pack=>read(`public/question-packs/${pack.file}`).map(q=>({
  ...q,packId:pack.id,packVersion:pack.version,sourceKind:'local-pack'
})));
const bundled={version:1,packs,questions};
const manifestUrl='https://example.test/question-packs/manifest.json';
const bundleUrl='https://example.test/question-packs/bundle-test.json';
const response=value=>({ok:true,json:async()=>value});
const packResponse=url=>response(String(url)===manifestUrl?manifest:
  read(`public/question-packs/${String(url).split('/').pop()}`));
afterEach(()=>vi.useRealTimers());

it('loads all supplemental questions with one bundled request',async()=>{
  const fetchImpl=vi.fn(async url=>String(url)===bundleUrl?response(bundled):{ok:false});
  const loaded=await loader.loadSupplementalQuestionPacks({manifestUrl,bundleUrl,fetchImpl});
  expect(loaded.questions).toEqual(questions);
  expect(loaded.packs.map(pack=>pack.id)).toEqual(packs.map(pack=>pack.id));
  expect(loaded.warnings).toEqual([]);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(fetchImpl).toHaveBeenCalledWith(bundleUrl);
});

it('resolves the actual production bundle URL under the GitHub Pages subdirectory',async()=>{
  const config=viteConfig({command:'build'});
  const productionUrl=JSON.parse(config.define['import.meta.env.VITE_SUPPLEMENTAL_BUNDLE_URL']);
  let emitted;
  config.plugins[0].generateBundle.call({emitFile:file=>{emitted=file;}});
  const root='https://example.test/JHSEE-All-Subjects/';
  const fetchImpl=async url=>String(url)===root+emitted.fileName?response(JSON.parse(emitted.source)):{ok:false};
  const loaded=await loader.loadSupplementalQuestionPacks({
    manifestUrl:root+'question-packs/manifest.json',bundleUrl:productionUrl,fetchImpl
  });
  expect(loaded.questions.length).toBe(questions.length);
  expect(loaded.warnings).toEqual([]);
});

it('falls back to individual packs if a bundle silently loses a question',async()=>{
  const fetchImpl=async url=>String(url)===bundleUrl
    ?response({...bundled,questions:questions.slice(1)}):packResponse(url);
  const loaded=await loader.loadSupplementalQuestionPacks({manifestUrl,bundleUrl,fetchImpl});
  expect(loaded.questions).toEqual(questions);
  expect(loaded.warnings.join(' ')).toContain('bundle');
});

it('finishes fallback loading in two network rounds rather than one serial round per pack',async()=>{
  vi.useFakeTimers();
  const fetchImpl=url=>new Promise(resolve=>setTimeout(()=>resolve(packResponse(url)),10));
  let loaded;
  const pending=loader.loadSupplementalQuestionPacks({manifestUrl,fetchImpl}).then(value=>{loaded=value;});
  try{
    await vi.advanceTimersByTimeAsync(20);
    expect(loaded?.questions).toHaveLength(questions.length);
    expect(loaded?.questions.map(q=>q.id)).toEqual(questions.map(q=>q.id));
  }finally{
    await vi.runAllTimersAsync();await pending;
  }
});

it('builds a complete bundle from the manifest and rejects stale pack counts',()=>{
  expect(typeof loader.assembleSupplementalQuestionBundle).toBe('function');
  const assembled=loader.assembleSupplementalQuestionBundle(manifest,pack=>read(`public/question-packs/${pack.file}`));
  expect(assembled).toEqual(bundled);
  expect(()=>loader.assembleSupplementalQuestionBundle(manifest,()=>[])).toThrow('questionCount');
});
