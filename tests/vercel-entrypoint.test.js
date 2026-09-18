import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

it('loads the Vercel entrypoint without requiring fetch during module initialization', async () => {
  vi.stubGlobal('fetch', undefined);
  const mod=await import('../api/generate-question.js');
  expect(typeof mod.default?.fetch).toBe('function');
});

it('serves GET without requiring the AI handler module to initialize', async () => {
  vi.stubGlobal('fetch', undefined);
  const mod=await import('../api/generate-question.js');
  const response=await mod.default.fetch(new Request('https://example.test/api/generate-question',{method:'GET'}));
  expect(response.status).toBe(405);
  expect(await response.json()).toEqual({error:'method_not_allowed'});
});
