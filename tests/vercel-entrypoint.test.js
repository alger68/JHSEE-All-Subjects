import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

it('loads the Vercel entrypoint without requiring fetch during module initialization', async () => {
  vi.stubGlobal('fetch', undefined);
  const mod=await import(`../api/generate-question.js?lazy-init=${Date.now()}`);
  expect(typeof mod.default?.fetch).toBe('function');
});
