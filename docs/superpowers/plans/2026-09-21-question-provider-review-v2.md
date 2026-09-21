# Question Provider + Review V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace scattered question selection with a scalable Question Provider, make question packs manifest-driven, and change wrong-answer review from repeated original questions to one-time Anchor plus cross-question skill transfer validation.

**Architecture:** Build-time/local question packs feed a runtime Question Registry. A Question Provider owns candidate search, deduplication, diversity, fallback, and optional AI generation; practice and review both call the Provider. Wrong-question state gains a review-stage lifecycle that is lazily migrated from existing `jhsee.adventure.v1` data without changing the storage key.

**Tech Stack:** Vanilla ES modules, Vitest 3, jsdom, Vite 7, browser LocalStorage, existing Vercel AI question endpoint, JSON question packs.

**Spec:** `docs/superpowers/specs/2026-09-21-question-provider-review-v2-design.md`

## Global Constraints

- Keep LocalStorage key exactly `jhsee.adventure.v1`.
- Keep backup format `jhsee-backup-v1` import-compatible.
- Anchor original question may be used exactly once per wrong-item review lifecycle; after that its ID and fingerprint are permanently excluded from that review item.
- Local question candidates are preferred; AI is used only after local same-skill and local near-skill candidates are exhausted.
- Official questions remain outside the general variant pool and must never be AI-rewritten.
- General question ID cooldown is the most recent 30 unique answered IDs.
- Runtime duplicate thresholds: similarity >= 0.85 blocks; 0.70–0.85 also blocks when competency and question type match.
- Recent three variation forms for the same competency must not all be identical when an alternative exists.
- Review stages are `anchor -> same-skill -> near-transfer -> delayed-transfer -> resolved`.
- A review item resolves only after at least three distinct passed fingerprints, at least two non-Anchor fingerprints, successful Same Skill and Near Transfer evidence, and a correct Delayed Transfer.
- Review scheduling uses +1, +3, +7, +14, +30 day semantics.
- Do not introduce embeddings, vector databases, accounts, server-side persistent warehouses, a CMS, or cross-project LocalStorage.
- Existing official-paper, AI, adaptive-learning, mock-exam, backup, and player progress behavior must remain compatible.
- Use TDD for each behavioral task and run the full `npm test` and `npm run build` before merge.

## File Structure

**New core modules**
- `js/core/question-pack-loader.js` — manifest validation and enabled-pack loading.
- `js/core/question-registry.js` — indexes local packs and runtime AI cache; exposes candidate lookups.
- `js/core/question-dedup.js` — normalization, fingerprinting, similarity, and duplicate policy.
- `js/core/question-provider.js` — single selection entry point for practice and review, including fallback ladder.
- `js/core/review-state.js` — wrong-item V2 enrichment, lazy migration, review evidence, and review-stage transitions.

**New data**
- `data/packs/manifest.json` — enabled pack registry; initially references existing `questions.json` and `cap-practice.json`.

**Existing modules modified**
- `js/core/mastery.js` — retain wrong reason/date helpers, delegate V2 review state transitions.
- `js/core/question-diversity.js` — retain recent-ID helpers and AI avoid examples; remove duplicated policy ownership from callers.
- `js/core/ai-question-client.js` — no transport redesign; Provider consumes existing request API.
- `js/core/storage.js` — preserve key/format; normalize wrong-item arrays on load/import only through pure migration helper.
- `js/app.js` — construct loader/registry/provider once, use Provider for practice/review, record review evidence after submit.
- `js/ui/views.js` — add review-stage copy only; no navigation redesign.

**Tests**
- `tests/question-pack-loader.test.js`
- `tests/question-registry.test.js`
- `tests/question-dedup.test.js`
- `tests/question-provider.test.js`
- `tests/review-state.test.js`
- Modify `tests/mastery.test.js`
- Modify `tests/storage.test.js`
- Modify `tests/app-integration.test.js`
- Modify `tests/data.test.js`
- Modify `tests/question-diversity.test.js`
- Add/modify release checks if pack files must be copied into `dist`.

## Review Focus

- **Legacy wrong item whose original question no longer exists:** preserve the item as unavailable; loading/importing must not delete it or mark it resolved. Task 5 adds the regression test.
- **Two AI questions with new IDs but nearly identical text to the Anchor:** both must fail runtime QA and never enter usable cache. Task 4 adds the regression test.
- **A competency has only the Anchor and no local variant while AI is unavailable/quota-exhausted:** Provider returns a structured no-candidate result and the review item stays scheduled. Task 4 adds the regression test.
- **Multiple review items request variants from the same small competency pool in one session:** session construction must exclude already chosen IDs/fingerprints so the same variant is not reused. Task 8 adds the regression test.
- **A 500+ question optional pack fails to load while core packs succeed:** boot must continue with core packs, expose a warning diagnostic, and still allow practice. Task 1 and Task 7 add the regression tests.

---

### Task 1: Manifest-Driven Question Pack Loading

**Files:**
- Create: `data/packs/manifest.json`
- Create: `js/core/question-pack-loader.js`
- Create: `tests/question-pack-loader.test.js`
- Modify: `tests/data.test.js`
- Modify: `scripts/verify-build.mjs`

**Interfaces:**
- Consumes: existing JSON question arrays accepted by `createQuestionBank(input)`.
- Produces:
  - `validatePackManifest(input) -> { ok:boolean, errors:string[], packs:PackDescriptor[] }`
  - `loadQuestionPacks({ manifestUrl, fetchImpl }) -> Promise<{ questions:object[], packs:LoadedPack[], warnings:string[] }>`
  - `PackDescriptor = { id:string, version:number, file:string, enabled:boolean, kind:'local-core'|'local-pack', subject?:string, questionCount?:number }`
  - Each loaded question is cloned with `packId`, `packVersion`, and `sourceKind`.

- [ ] **Step 1: Write the failing manifest validation tests**

Create `tests/question-pack-loader.test.js`:

```js
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
```

- [ ] **Step 2: Run the new tests and verify RED**

Run:
```bash
npx vitest run tests/question-pack-loader.test.js
```

Expected: FAIL because `js/core/question-pack-loader.js` does not exist.

- [ ] **Step 3: Add the initial manifest**

Create `data/packs/manifest.json`:

```json
{
  "version": 1,
  "packs": [
    {
      "id": "core-v1",
      "version": 1,
      "file": "../questions.json",
      "enabled": true,
      "kind": "local-core"
    },
    {
      "id": "cap-practice-v1",
      "version": 1,
      "file": "../cap-practice.json",
      "enabled": true,
      "kind": "local-core"
    }
  ]
}
```

- [ ] **Step 4: Implement loader validation and failure semantics**

Create `js/core/question-pack-loader.js` with:
- manifest version exactly `1`;
- unique non-empty pack IDs;
- integer version >= 1;
- non-empty file;
- `kind` exactly `local-core` or `local-pack`;
- disabled packs skipped;
- URLs resolved with `new URL(pack.file, manifestUrl)`;
- core-pack HTTP/JSON errors throw;
- optional-pack HTTP/JSON errors append a warning;
- loaded questions cloned with pack metadata.

Core return shape:

```js
return {
  questions,
  packs: loadedPacks,
  warnings
};
```

- [ ] **Step 5: Add scale and manifest-data tests**

Extend `tests/data.test.js` to read `data/packs/manifest.json` and assert:
- both current files are represented;
- pack IDs are unique;
- every enabled local-core file exists;
- a synthetic 600-question optional pack passed to loader preserves all 600 items.

Use an in-memory synthetic array; do not add 600 production questions.

- [ ] **Step 6: Verify production build contains pack manifest**

Modify `scripts/verify-build.mjs` to assert:
- `dist/data/packs/manifest.json` exists;
- referenced `../questions.json` and `../cap-practice.json` resolve under `dist/data`.

Run:
```bash
npx vitest run tests/question-pack-loader.test.js tests/data.test.js
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add data/packs/manifest.json js/core/question-pack-loader.js tests/question-pack-loader.test.js tests/data.test.js scripts/verify-build.mjs
git commit -m "feat: add manifest-driven question packs"
```

---

### Task 2: Question Fingerprints and Similarity Policy

**Files:**
- Create: `js/core/question-dedup.js`
- Create: `tests/question-dedup.test.js`
- Modify: `js/core/question-diversity.js`
- Modify: `tests/question-diversity.test.js`

**Interfaces:**
- Consumes: question objects with optional `question`, `passage`, `table`, `competency`, `questionType`, and `examProfile`.
- Produces:
  - `normalizeQuestionText(value:string) -> string`
  - `questionFingerprint(question) -> string`
  - `questionSimilarity(a,b) -> number` in [0,1]
  - `isNearDuplicate(candidate, reference, { hardThreshold=0.85, conditionalThreshold=0.70 }) -> boolean`
  - `dedupeQuestions(questions, references, policy) -> { accepted:object[], rejected:{question,reason,similarity}[] }`

- [ ] **Step 1: Write failing normalization/fingerprint tests**

Create `tests/question-dedup.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  normalizeQuestionText,
  questionFingerprint,
  questionSimilarity,
  isNearDuplicate,
  dedupeQuestions
} from '../js/core/question-dedup.js';

const q = (id, question, extra={}) => ({
  id, subject:'english', question, passage:'Tom missed the bus because he woke up late.',
  questionType:'推論', competency:'閱讀推論', ...extra
});

describe('question dedup', () => {
  it('normalizes whitespace, case, full-width punctuation, and non-semantic punctuation', () => {
    expect(normalizeQuestionText('  TOM，  woke up! ')).toBe(normalizeQuestionText('tom woke up'));
  });

  it('gives equivalent formatting the same fingerprint', () => {
    expect(questionFingerprint(q('a','Why was TOM late?')))
      .toBe(questionFingerprint(q('b',' why was tom late ')));
  });

  it('flags name-swapped near copies as highly similar', () => {
    const a=q('a','Why did Tom miss the bus?');
    const b=q('b','Why did Kevin miss the train?',{passage:'Kevin missed the train because he woke up late.'});
    expect(questionSimilarity(a,b)).toBeGreaterThanOrEqual(0.70);
    expect(isNearDuplicate(b,a)).toBe(true);
  });

  it('keeps genuinely different contexts below the blocking threshold', () => {
    const a=q('a','Why did Tom miss the bus?');
    const b=q('b','What can readers infer about the store policy?',{
      passage:'The notice says returns require a receipt within seven days.',
      questionType:'公告推論'
    });
    expect(questionSimilarity(a,b)).toBeLessThan(0.70);
  });
});
```

- [ ] **Step 2: Run and verify RED**

Run:
```bash
npx vitest run tests/question-dedup.test.js
```

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement deterministic normalization and token similarity**

Implement without external dependencies:
- Unicode NFKC normalization.
- lowercase Latin text.
- punctuation -> spaces.
- collapse whitespace.
- token sets from words/CJK bigrams.
- passage/question/material token union.
- Jaccard token score.
- 3-gram overlap score.
- metadata score for competency + type.
- weighted similarity bounded 0..1.

`questionFingerprint()` must be deterministic and may use a compact FNV-1a-style hash of normalized semantic text plus competency/type; do not use Web Crypto so tests remain synchronous.

- [ ] **Step 4: Implement blocking thresholds**

`isNearDuplicate()`:
- score >= 0.85 -> true.
- 0.70 <= score < 0.85 -> true only if normalized competency and normalized question type match.
- otherwise false.

`dedupeQuestions()` compares candidate against supplied references and questions already accepted in this call.

- [ ] **Step 5: Add recent fingerprint helpers to diversity module**

Modify `js/core/question-diversity.js`:

```js
export function recentQuestionFingerprints(history=[], questionLookup=new Map(), limit=30) {
  // newest unique fingerprints, using history fingerprint when present,
  // otherwise derive from questionLookup.
}
```

Add a test proving two different IDs with the same fingerprint produce one recent fingerprint.

- [ ] **Step 6: Run focused tests**

```bash
npx vitest run tests/question-dedup.test.js tests/question-diversity.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add js/core/question-dedup.js js/core/question-diversity.js tests/question-dedup.test.js tests/question-diversity.test.js
git commit -m "feat: add content-aware question dedup"
```

---

### Task 3: Runtime Question Registry and Indexes

**Files:**
- Create: `js/core/question-registry.js`
- Create: `tests/question-registry.test.js`

**Interfaces:**
- Consumes:
  - loaded local questions from Task 1;
  - AI cache questions from state;
  - `skillIdentity(question)` from adaptive learning;
  - `questionFingerprint(question)` from Task 2.
- Produces:
  - `createQuestionRegistry(localQuestions=[]) -> registry`
  - `registry.registerQuestions(questions,{sourceKind,packId?,packVersion?}) -> {accepted,rejected}`
  - `registry.getById(id) -> question|null`
  - `registry.all() -> question[]` for variant-eligible local/AI questions
  - `registry.allLookupQuestions() -> question[]` including lookup-only official questions
  - `registry.clearSource(sourceKind) -> void`
  - `registry.bySkillKey(skillKey) -> question[]`
  - `registry.byCompetency(subject,competency) -> question[]`
  - `registry.byDomain(subject,domain) -> question[]`
  - `registry.query(criteria) -> question[]`
  - `registry.stats() -> object`

- [ ] **Step 1: Write failing registry tests**

Create tests covering:
- pack metadata retained;
- indexes by skill/competency/domain;
- duplicate IDs rejected;
- `official` source registrations visible through `getById` only if explicitly registered as lookup-only and excluded from `query({variantEligible:true})`;
- AI cache registers as `ai-cache`;
- stats count per source and competency.

Representative assertion:

```js
const registry=createQuestionRegistry([local]);
registry.registerQuestions([ai],{sourceKind:'ai-cache'});
expect(registry.bySkillKey(skillIdentity(local).key).map(q=>q.id))
  .toEqual(expect.arrayContaining([local.id, ai.id]));
expect(registry.stats().sourceKinds['ai-cache']).toBe(1);
```

- [ ] **Step 2: Run RED**

```bash
npx vitest run tests/question-registry.test.js
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement registry with precomputed indexes**

On registration:
- validate non-empty ID;
- reject duplicate ID;
- derive and attach `skillKey`, normalized metadata, fingerprint;
- index by subject, skillKey, `subject::competency`, `subject::domain`, difficulty, sourceKind;
- preserve immutable question payload semantics by storing frozen enriched objects.

Do not scan `all()` for every query when an index is available. `clearSource('ai-cache')` must remove those questions from every index, while `allLookupQuestions()` must include lookup-only official entries for existing UI/report lookup.

- [ ] **Step 4: Add 5000-question performance-shape test**

Generate 5000 synthetic questions and assert:
- registration count 5000;
- bySkillKey returns only target bucket;
- duplicate registration is rejected;
- test does not assert wall-clock milliseconds; it asserts indexed data structures and result sizes to avoid flaky CI.

- [ ] **Step 5: Run focused tests**

```bash
npx vitest run tests/question-registry.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add js/core/question-registry.js tests/question-registry.test.js
git commit -m "feat: add indexed question registry"
```

---

### Task 4: Question Provider Selection, Fallback, and AI QA

**Files:**
- Create: `js/core/question-provider.js`
- Create: `tests/question-provider.test.js`
- Read-only dependency: `js/core/ai-question-client.js`; do not alter its endpoint contract in this task.

**Interfaces:**
- Consumes:
  - registry from Task 3;
  - dedup policy from Task 2;
  - `buildAdaptivePractice()`;
  - optional `generateAi({ target, sourceQuestion, avoidQuestions, count }) -> Promise<question[]|null>`.
- Produces:
  - `createQuestionProvider({ registry, generateAi }) -> provider`
  - `provider.getPracticeSet(criteria, context) -> Promise<{questions,sourceSummary,warnings}>`
  - `provider.getReviewQuestion(reviewItem, context) -> Promise<{question,evidenceKind,warning?}|{question:null,evidenceKind:null,warning:string}>`
  - `provider.getReviewSession(reviewItems, context) -> Promise<{questions,evidenceByQuestionId,warnings,skippedReviewIds}>`
  - `provider.registerGeneratedQuestions(questions, context) -> {accepted,rejected}`
  - `provider.getStats() -> registry.stats()`
  - `provider.countPracticeCandidates(criteria, context) -> number` and this preview path never calls AI

- [ ] **Step 1: Write failing local-first tests**

Create tests proving:
- same-skill local unused candidate wins;
- near-skill local candidate wins before any AI call;
- `generateAi` spy remains uncalled whenever local candidate is sufficient;
- original Anchor ID/fingerprint excluded when `originalReviewCount >= 1`;
- recent 30 IDs excluded;
- same session `excludeIds` and `excludeFingerprints` honored.

- [ ] **Step 2: Run RED**

```bash
npx vitest run tests/question-provider.test.js
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement candidate ladder without AI first**

Implement internal tiers:
1. exact skillKey, difficulty within target ±1;
2. same subject + competency, different subSkill preferred;
3. same subject + domain;
4. AI cache candidates already in registry;
5. generated AI;
6. cooled old non-Anchor variants.

Within a tier:
- exclude Anchor after first review;
- exclude recent IDs/fingerprints;
- prefer different recent variation form;
- use adaptive score only after hard diversity filters;
- return structured warning instead of falling back to Anchor.

- [ ] **Step 4: Add AI generation and QA tests**

Tests:
- local exhausted + valid generated AI -> accepted;
- generated AI similarity >= .85 to Anchor -> rejected and not registered;
- generated AI duplicate ID -> rejected;
- generated AI wrong subject/competency for target -> rejected;
- generated AI transport failure -> fallback to cooled local variant;
- quota/allowAi false -> never call generator;
- no candidate -> `question:null` and warning, review item untouched.

- [ ] **Step 5: Implement AI QA gate**

For each generated question:
- call existing `validateQuestion()`;
- require target subject;
- require target competency/skill consistency after classification;
- reject near duplicates vs Anchor/recent/session references;
- reject duplicate ID;
- attach `aiGenerated:true`, `derivedSkillKey`, `generatedAt`, `qaVersion:2`;
- register only accepted questions as `ai-cache`.

Do not count rejected generated questions as usable cache.

- [ ] **Step 6: Add multi-item review-session diversity test**

For two review items sharing a small competency pool:
- Provider must not return the same question ID or fingerprint twice in the same session.
- If only one variant exists, second review item appears in `skippedReviewIds`, not duplicated.

- [ ] **Step 7: Run focused tests**

```bash
npx vitest run tests/question-provider.test.js
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add js/core/question-provider.js tests/question-provider.test.js
git commit -m "feat: add local-first question provider"
```

---

### Task 5: Review V2 State, One-Time Anchor, and Lazy Migration

**Files:**
- Create: `js/core/review-state.js`
- Create: `tests/review-state.test.js`
- Modify: `js/core/mastery.js`
- Modify: `tests/mastery.test.js`

**Interfaces:**
- Consumes:
  - legacy wrong item;
  - original question when available;
  - `skillIdentity()`;
  - `questionFingerprint()`.
- Produces:
  - `REVIEW_STAGES = ['anchor','same-skill','near-transfer','delayed-transfer','resolved']`
  - `enrichWrongItem(item, originalQuestion) -> ReviewItemV2`
  - `migrateWrongQuestions(items, questionLookup) -> ReviewItemV2[]`
  - `recordReviewEvidence(item, {question,correct,date,evidenceKind}) -> ReviewItemV2`
  - `canResolveReview(item) -> boolean`
  - `reviewTarget(item) -> {stage,skillKey,subject,domain,competency,subSkill,difficulty,anchorId,anchorFingerprint}`

- [ ] **Step 1: Write failing legacy migration tests**

Create tests:
- legacy item + original question gains skill metadata, `originalReviewCount:0`, `reviewStage:'anchor'`, empty histories;
- missing original question remains `available:false`, not deleted, not resolved;
- already-V2 item is idempotent through migration.

- [ ] **Step 2: Run RED**

```bash
npx vitest run tests/review-state.test.js
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement one-time Anchor transition**

Test and implementation rules:

Anchor review, correct:
```js
expect(next).toMatchObject({
  originalReviewCount:1,
  reviewStage:'same-skill',
  nextReview:'2026-09-20',
  resolved:false
});
```

Anchor review, wrong:
```js
expect(next).toMatchObject({
  originalReviewCount:1,
  reviewStage:'same-skill',
  nextReview:'2026-09-18',
  resolved:false
});
```

Both cases must permanently set Anchor ID/fingerprint exclusion metadata for this review item.

- [ ] **Step 4: Implement transfer stages**

Rules:
- same-skill correct -> near-transfer, +7 days;
- same-skill wrong -> same-skill, +1 day;
- near-transfer correct -> delayed-transfer, +14 days;
- near-transfer wrong -> same-skill, +1 day;
- delayed-transfer correct -> resolved only if gate passes, otherwise delayed-transfer +14 days;
- delayed-transfer wrong -> same-skill, +1 day.

Store `variantHistory` capped at 20.

- [ ] **Step 5: Implement resolved gate tests**

Required evidence:
- three distinct passed fingerprints;
- at least two non-Anchor;
- same-skill pass;
- near-transfer pass;
- current delayed-transfer correct.

Prove:
- same original ID with three aliases/fake IDs but same fingerprint cannot resolve;
- three distinct transfer fingerprints can resolve;
- Anchor may have been wrong and item can still eventually resolve.

- [ ] **Step 6: Adapt mastery compatibility layer**

Keep public `recordWrong`, `recordUncertain`, `dueWrongQuestions`, `setWrongReason`.

Modify `recordWrong` to preserve existing V2 fields when incrementing.

Deprecate old `reviewWrong(list, questionId, correct, date)` behavior for app integration; either:
- keep it as a compatibility wrapper that records legacy evidence only for tests/old callers, or
- replace its app use in Task 8.

Update `tests/mastery.test.js` so old mastery assertions no longer claim three repeats of Q1 resolve the item.

- [ ] **Step 7: Run focused tests**

```bash
npx vitest run tests/review-state.test.js tests/mastery.test.js
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add js/core/review-state.js js/core/mastery.js tests/review-state.test.js tests/mastery.test.js
git commit -m "feat: add transfer-based review mastery"
```

---

### Task 6: Storage and Backup Compatibility

**Files:**
- Test: `tests/storage.test.js`
- Read-only dependency: `js/core/storage.js`

**Interfaces:**
- Consumes: `migrateWrongQuestions(items, questionLookup)` is not called inside storage because storage does not own the question lookup.
- Produces:
  - Storage continues returning raw compatible state.
  - New pure helper `normalizeStoredStateShape(state)` may fill only safe structural defaults without question-derived fields.
  - App boot performs question-derived migration after registry exists.

- [ ] **Step 1: Add compatibility tests**

Tests must prove:
- storage key remains only `jhsee.adventure.v1`;
- old state with legacy wrong item loads unchanged enough to migrate later;
- V2 wrong fields survive save/load;
- old `jhsee-backup-v1` import succeeds;
- V2 backup round-trip preserves `reviewStage`, `variantHistory`, and `passedFingerprints`.

Representative V2 round-trip:

```js
const wrong={
  questionId:'Q1',
  reviewStage:'near-transfer',
  originalReviewCount:1,
  variantHistory:[{questionId:'Q2',fingerprint:'fp2',correct:true,date:'2026-09-21'}],
  passedFingerprints:['fp2']
};
store.save({version:1,wrongQuestions:[wrong]});
expect(store.load().wrongQuestions[0]).toMatchObject(wrong);
```

- [ ] **Step 2: Run tests before changes**

```bash
npx vitest run tests/storage.test.js
```

Expected: existing tests PASS; new compatibility tests should expose any normalization gap.

- [ ] **Step 3: Confirm no storage implementation change is required**

The existing store serializes nested wrong-item fields without stripping them and merges top-level defaults without rewriting each wrong item. Keep `js/core/storage.js` unchanged as long as the new tests pass. Do not add a new storage key, state version, or backup version.

- [ ] **Step 4: Run storage tests**

```bash
npx vitest run tests/storage.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/storage.test.js
git commit -m "test: preserve review v2 storage compatibility"
```

---

### Task 7: Boot Registry/Provider Construction and Pack Failure Handling

**Files:**
- Modify: `js/app.js`
- Modify: `tests/app-integration.test.js`
- Modify: `tests/release-readiness.test.js` if build URL assumptions need updating.

**Interfaces:**
- Consumes:
  - `loadQuestionPacks()`
  - `createQuestionRegistry()`
  - `createQuestionProvider()`
  - `migrateWrongQuestions()`
- Produces runtime singletons:
  - `registry`
  - `provider`
  - existing `bank` retained for legacy battle/world APIs in this release;
  - `questionMap` rebuilt from registry + official lookup questions.

- [ ] **Step 1: Change app-integration fetch stub to understand manifest and pack URLs**

In test setup, return:
- manifest for URLs ending `/packs/manifest.json`;
- `questions` for `questions.json`;
- `practice` for `cap-practice.json`.

Add a test that optional pack fetch failure:
- does not render fatal state;
- still renders exam/practice center using core questions;
- records or logs a warning.

- [ ] **Step 2: Verify RED before app boot change**

Run:
```bash
npx vitest run tests/app-integration.test.js
```

Expected: FAIL because current boot still fetches two hard-coded files and does not request manifest.

- [ ] **Step 3: Refactor boot**

Replace hard-coded URLs with:
```js
const loaded = await loadQuestionPacks({
  manifestUrl:new URL('../data/packs/manifest.json', import.meta.url),
  fetchImpl:fetch
});
bank=createQuestionBank(loaded.questions);
registry=createQuestionRegistry(bank.all());
registry.registerQuestions(state.generatedQuestions??[],{sourceKind:'ai-cache'});
registry.registerQuestions(
  OFFICIAL_PAPERS.flatMap(getOfficialQuestions),
  {sourceKind:'official',variantEligible:false,lookupOnly:true}
);
provider=createQuestionProvider({registry,generateAi:generateProviderAi});
questionMap=new Map(registry.allLookupQuestions().map(q=>[q.id,q]));
state.wrongQuestions=migrateWrongQuestions(state.wrongQuestions,questionMap);
```

Use the Task 3 interface exactly: `registry.allLookupQuestions()` builds `questionMap`, including official lookup-only questions.

- [ ] **Step 4: Add core pack failure test**

Stub manifest successfully but make `questions.json` fail.

Expect:
- fatal state contains `題庫載入失敗`;
- no router session starts.

- [ ] **Step 5: Verify boot and existing integration**

```bash
npx vitest run tests/app-integration.test.js tests/release-readiness.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add js/app.js tests/app-integration.test.js tests/release-readiness.test.js
git commit -m "refactor: boot question provider from pack manifest"
```

---

### Task 8: Route General Practice Through Question Provider

**Files:**
- Modify: `js/app.js`
- Modify: `tests/app-integration.test.js`
- Modify: `tests/question-provider.test.js`

**Interfaces:**
- Consumes: `provider.getPracticeSet(criteria, context)`.
- Produces app helper:
  - `practiceContext() -> {today,recentIds,recentFingerprints,recentVariationForms,answerHistory,skills,subjectWeights,difficultyWindow,excludeIds,excludeFingerprints,allowAi,aiAllowance}`
  - `practiceSelection(shuffle=false) -> Promise<{subject,grade,type,focus,pool,matchCount,warnings}>`

- [ ] **Step 1: Add integration test for no repeat in recent history**

Seed state with recent answerHistory containing a known local question ID.

Start practice with enough alternatives.

Assert the resulting `activeExam.questionIds` excludes that recent ID.

- [ ] **Step 2: Add integration test for local-first AI behavior**

Stub the AI endpoint/global fetch separately from pack fetch.

Seed a high-priority adaptive profile where local same-skill candidates exist.

Start practice.

Assert:
- practice starts immediately;
- AI generation request is not made solely to replace available local same-skill capacity.

Preserve instant-start behavior with this exact rule: when Provider returns the full requested local/cache set, do not call AI. When Provider returns a non-empty but undersized set and AI is allowed, start immediately with those questions and generate only enough AI questions to fill future unanswered slots.

- [ ] **Step 3: Refactor `practiceSelection()`**

Move:
- local/AI reservoir merge;
- recent ID exclusion;
- adaptive candidate selection;
- fallback

behind Provider.

UI filter extraction stays in `app.js`.

The button status count uses the Task 4 preview interface exactly:
```js
provider.countPracticeCandidates(criteria, context) -> number
```
This method reads registry candidates only and never calls AI.

- [ ] **Step 4: Preserve instant-start behavior**

Do not reintroduce the previous AI loading wait.

If Provider must generate AI because local candidates are insufficient:
- start with available local/cache candidates if minimum viable set > 0;
- generate only future unanswered slots asynchronously using the existing safe injection behavior;
- never replace answered/current question.

Add regression test that clicking practice renders a question before the AI promise resolves.

- [ ] **Step 5: Run relevant tests**

```bash
npx vitest run tests/question-provider.test.js tests/app-integration.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add js/app.js tests/app-integration.test.js tests/question-provider.test.js
git commit -m "refactor: select practice through question provider"
```

---

### Task 9: Route Wrong-Answer Review Through Review V2 Provider

**Files:**
- Modify: `js/app.js`
- Modify: `js/ui/views.js`
- Modify: `tests/app-integration.test.js`
- Modify: `tests/ui.test.js`

**Interfaces:**
- Consumes:
  - `provider.getReviewQuestion(reviewItem, context)`
  - `provider.getReviewSession(reviewItems, context)`
  - `recordReviewEvidence(reviewItem, evidence)`
- Produces:
  - review session metadata stored on `activeExam`:
    - `reviewEvidenceByQuestionId: { [questionId]: { reviewQuestionId, evidenceKind, fingerprint } }`
  - session options may include `reviewItemIds`.

- [ ] **Step 1: Add first-review Anchor integration test**

Seed legacy wrong item Q1.

Boot revenge page.

Start single review.

Assert active session question ID is Q1.

Submit answer.

Assert:
- `originalReviewCount === 1`;
- `reviewStage === 'same-skill'`.

- [ ] **Step 2: Add second-review variant integration test**

Seed V2 item with:
- Anchor Q1;
- `originalReviewCount:1`;
- stage `same-skill`;
- due today.

Ensure registry has Q2 with same skillKey but different fingerprint.

Start review.

Assert active session uses Q2 and not Q1.

Run the same test with Anchor answered wrong previously; Q1 must still never return.

- [ ] **Step 3: Add official Anchor transition test**

Seed official wrong item, first review returns official Anchor.

After first review, second review must select a non-official local or AI same-competency variant.

Assert no `sourceKind:'official'` candidate is used as a variant.

- [ ] **Step 4: Refactor `startRevenge()`**

Change input from raw question ID lookup to review item lookup.

Pseudocode:

```js
async function startRevenge(reviewQuestionId) {
  const item=state.wrongQuestions.find(x=>x.questionId===reviewQuestionId);
  const selection=await provider.getReviewQuestion(item,reviewContext(item));
  if(!selection.question){
    showToast(selection.warning);
    return;
  }
  startSession([selection.question],{
    title:'單題複習',
    kind:'review',
    durationMinutes:10,
    reviewItemIds:[item.questionId],
    reviewEvidenceByQuestionId:{
      [selection.question.id]:{
        reviewQuestionId:item.questionId,
        evidenceKind:selection.evidenceKind,
        fingerprint:selection.question.fingerprint
      }
    }
  });
}
```

- [ ] **Step 5: Refactor continuous review**

Use `provider.getReviewSession()`.

Store one evidence mapping per selected question.

If an item is skipped due no candidate:
- do not delete it;
- do not mark it reviewed;
- show count in toast or review page warning.

Add test with two review items sharing one variant; only one gets the variant and the other remains due.

- [ ] **Step 6: Update `completeExam()` review branch**

For `session.kind==='review'`:
- resolve review item by `reviewEvidenceByQuestionId[item.id].reviewQuestionId`;
- call `recordReviewEvidence()` with actual selected question object, correctness, date, evidenceKind;
- still call `recordAdaptiveAttempt(...,{sourceKind:'review'})`;
- preserve uncertain semantics: correct-but-uncertain must not count as a full passing transfer fingerprint; treat it as non-passing review evidence and keep/reduce stage rather than resolving.

Add test pinning correct-but-uncertain variant does not advance resolved gate.

- [ ] **Step 7: Update review UI copy**

In `renderRevenge()`, map:
- anchor -> `原題確認`
- same-skill -> `同能力新題`
- near-transfer -> `近遷移`
- delayed-transfer -> `延遲驗證`
- resolved -> `已掌握`

Add text:
`這次可能改用同能力新題，確認是真的掌握，不是記住答案。`

Do not expose technical fingerprint terms.

- [ ] **Step 8: Run review tests**

```bash
npx vitest run tests/review-state.test.js tests/mastery.test.js tests/ui.test.js tests/app-integration.test.js
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add js/app.js js/ui/views.js tests/app-integration.test.js tests/ui.test.js
git commit -m "feat: review wrong answers with transfer variants"
```

---

### Task 10: AI Cache Registration, Quota Accounting, and Reset Compatibility

**Files:**
- Modify: `js/app.js`
- Read-only dependency: `js/core/learning-cycle.js`
- Modify: `tests/learning-cycle.test.js`
- Modify: `tests/app-integration.test.js`
- Modify: `tests/question-provider.test.js`

**Interfaces:**
- Consumes: Provider `registerGeneratedQuestions()`.
- Produces:
  - accepted AI cache questions in `state.generatedQuestions`;
  - rejected AI candidates excluded from cache and quota accounting policy explicitly tested.

- [ ] **Step 1: Decide and test quota accounting at acceptance boundary**

Use this rule:

**Only AI questions that pass Provider QA and are accepted into cache count against `aiUsage.count`.**

Add tests:
- service returns 3 questions, 2 near-duplicates rejected -> usage increments by 1;
- all rejected -> usage unchanged;
- transport failure -> unchanged.

- [ ] **Step 2: Centralize AI registration in app helper**

Create app-local helper or core helper:

```js
function acceptGeneratedQuestions(rawQuestions, context) {
  const result=provider.registerGeneratedQuestions(rawQuestions,context);
  if(result.accepted.length){
    state.aiUsage=recordAiUsage(state.aiUsage,taipeiDate(),result.accepted.length);
    state.generatedQuestions=mergeAcceptedCache(state.generatedQuestions,result.accepted,200);
  }
  return result.accepted;
}
```

Replace direct `questionMap.set` / cache merge in:
- background practice generation;
- AI remediation;
- diagnostic AI generation where appropriate.

- [ ] **Step 3: Keep reset modes compatible**

Existing adaptive reset clears `generatedQuestions`.

After adaptive reset or new-cycle reset, call `registry.clearSource('ai-cache')`; because the persisted `generatedQuestions` array is also cleared by existing reset logic, stale AI-cache entries are no longer selectable.

Add a test proving reset + re-render cannot select a cleared AI cached question.

- [ ] **Step 4: Run focused tests**

```bash
npx vitest run tests/question-provider.test.js tests/learning-cycle.test.js tests/app-integration.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/app.js tests/learning-cycle.test.js tests/app-integration.test.js tests/question-provider.test.js
git commit -m "fix: register only validated AI question variants"
```

---

### Task 11: Build-Time Pack Quality Checks and Release Regression

**Files:**
- Create: `scripts/verify-question-packs.mjs`
- Create: `tests/question-pack-quality.test.js`
- Modify: `package.json`
- Modify: `scripts/verify-build.mjs`
- Modify: `tests/release-readiness.test.js`
- Modify: `README.md` with a short pack-authoring section.

**Interfaces:**
- Consumes: manifest and all enabled local packs.
- Produces:
  - CLI exit 0 when packs valid;
  - CLI nonzero on duplicate IDs, invalid question shape, missing core pack, or hard similarity >= 0.95;
  - warnings printed for similarity 0.85–0.95.

- [ ] **Step 1: Write pack-quality tests**

Create tests with temporary/in-memory fixtures proving:
- duplicate ID across packs fails;
- invalid question fails;
- hard near duplicate >= .95 fails;
- warning near duplicate .85–.95 does not fail;
- 600 valid synthetic questions pass.

If script internals need testability, export `verifyQuestionPacks({manifest,loadFile})` from a small core helper and have the CLI call it.

- [ ] **Step 2: Add CLI script**

`scripts/verify-question-packs.mjs` loads production manifest and pack files and prints:
- total pack count;
- total question count;
- per-subject counts;
- duplicate warnings;
- hard failures.

- [ ] **Step 3: Wire into npm build/test gate**

Modify `package.json`:

```json
{
  "scripts": {
    "verify:packs": "node scripts/verify-question-packs.mjs",
    "test": "vitest run",
    "build": "npm run verify:packs && vite build && node scripts/verify-build.mjs"
  }
}
```

Preserve existing scripts not shown here.

- [ ] **Step 4: Document how to add a pack**

README section must say:
1. add JSON file under `data/packs/` or approved data path;
2. add manifest entry;
3. run `npm run verify:packs`;
4. run `npm test`;
5. do not use official copyrighted question data as a general variant pack.

- [ ] **Step 5: Run release checks**

```bash
npm run verify:packs
npm test
npm run build
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/verify-question-packs.mjs tests/question-pack-quality.test.js package.json scripts/verify-build.mjs tests/release-readiness.test.js README.md
git commit -m "chore: verify scalable question packs in CI"
```

---

### Task 12: Whole-Branch Acceptance and Production Safety Review

**Files:**
- Modify tests only if final acceptance exposes a real gap; do not add feature scope here.
- Optionally add: `docs/verification-2026-09-21-question-provider-v2.md`

**Interfaces:**
- Consumes all previous tasks.
- Produces a release-ready branch with green CI and a concise verification record.

- [ ] **Step 1: Run targeted new suite**

```bash
npx vitest run   tests/question-pack-loader.test.js   tests/question-dedup.test.js   tests/question-registry.test.js   tests/question-provider.test.js   tests/review-state.test.js   tests/mastery.test.js   tests/storage.test.js   tests/app-integration.test.js   tests/question-pack-quality.test.js
```

Expected: PASS.

- [ ] **Step 2: Run complete suite**

```bash
npm test
```

Expected: all current legacy tests plus all V2 tests PASS.

- [ ] **Step 3: Build production artifact**

```bash
npm run build
```

Expected:
- pack verification passes;
- Vite build succeeds;
- `verify-build.mjs` succeeds;
- manifest and all enabled pack assets exist in `dist`.

- [ ] **Step 4: Manual code review checklist**

Confirm by diff:
- no LocalStorage key change;
- no backup format change;
- official paper files untouched;
- no official question is marked variantEligible;
- no Anchor fallback path exists after `originalReviewCount >= 1`;
- no direct local+AI candidate concatenation remains in practice/review app flow;
- no generated question bypasses Provider QA registration;
- Provider has structured no-candidate behavior;
- app still starts practice without waiting when local questions are available.

- [ ] **Step 5: Record verification**

Create `docs/verification-2026-09-21-question-provider-v2.md` containing:
- branch/head SHA;
- test file/test counts from CI;
- pack counts;
- production build result;
- known non-goals;
- rollback reference to pre-V2 `main` merge SHA `1295165d0e435493dc3d6498b298b19ee5c7b0b8`.

- [ ] **Step 6: Commit verification record**

```bash
git add docs/verification-2026-09-21-question-provider-v2.md
git commit -m "docs: verify question provider review v2"
```

- [ ] **Step 7: Open pull request without auto-merge**

PR title:
`feat: scalable question provider and transfer review v2`

PR body must summarize:
- manifest packs;
- local-first Provider;
- content-aware dedup;
- one-time Anchor;
- transfer-based resolved gate;
- compatibility;
- exact test/build results.

Do not merge until branch CI is green and final review is complete.
