# JHSEE 全科會考模擬學習平台 V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立可直接部署到 GitHub Pages 的 116 年國中教育會考全科模擬平台，支援六科/寫作、單元練習、單科模擬、全真模擬、錯題複習與成績分析。

**Architecture:** 採純前端 HTML/CSS/ES Modules，題庫以 JSON 分離管理，考試引擎、計分、分析、儲存與科目 renderer 分層。所有核心邏輯以 Vitest 測試；使用 LocalStorage 保留進度與錯題，GitHub Actions 執行測試並部署 GitHub Pages。

**Tech Stack:** HTML5、CSS3、JavaScript ES Modules、JSON、Vitest、jsdom、GitHub Actions、GitHub Pages

**Spec:** `docs/superpowers/specs/2026-09-16-jhsee-all-subjects-v1-design.md`

## Global Constraints

- V1 必須是靜態網站，可由 GitHub Pages 直接部署。
- 官方歷屆試題與平台自製模擬題必須分庫、分標籤。
- V1 不導入登入、後端資料庫、OpenAI API、AI 作文正式級分判定。
- 學習紀錄預設保存於瀏覽器 LocalStorage。
- 手機優先，同時支援桌面瀏覽器。
- 題庫資料與考試引擎解耦，增加題目不應修改核心考試流程。
- 模擬成績不得宣稱為官方會考等級。

---

## File Map

```text
index.html                         首頁與 SPA root
package.json                       測試指令與開發依賴
vitest.config.js                   Vitest/jsdom 設定
css/base.css                       reset、字體、色彩、版面基礎
css/components.css                 卡片、按鈕、徽章、導航元件
css/exam.css                       考試頁、答案卡、結果頁樣式
js/app.js                          啟動、路由與頁面組裝
js/router.js                       hash router
js/config/exams.js                 模擬考設定
js/core/schema.js                  題目 schema 驗證
js/core/question-bank.js           題庫載入、來源隔離、篩選與抽題
js/core/storage.js                 LocalStorage 存取與 migration
js/core/exam-engine.js             試卷 session、作答、標記、計時、交卷
js/core/scoring.js                 客觀題計分
js/core/analytics.js               單元弱點、時間與趨勢統計
js/core/wrong-book.js              錯題新增、重做、移除
js/ui/home.js                      首頁
js/ui/practice.js                  單元練習選單
js/ui/exam-runner.js               考試畫面
js/ui/results.js                   成績、解析與錯題入口
js/ui/history.js                   歷史成績 Dashboard
js/ui/official.js                  官方歷屆題入口
js/ui/writing.js                   寫作作答與草稿
js/subjects/common.js              共用題型 renderer
js/subjects/english.js             聽力/閱讀 renderer
js/subjects/math.js                數學非選擇題 renderer
js/subjects/writing.js             寫作 renderer
js/subjects/registry.js            科目 renderer registry
data/mock/*.json                   自製題庫
data/official/115/*.json           經核對後才放入的官方題庫
assets/                            圖片與音訊
.github/workflows/pages.yml        測試與 GitHub Pages 部署

tests/schema.test.js
tests/question-bank.test.js
tests/storage.test.js
tests/exam-engine.test.js
tests/scoring.test.js
tests/analytics.test.js
tests/wrong-book.test.js
tests/router.test.js
tests/home.test.js
tests/exam-runner.test.js
tests/results.test.js
tests/writing.test.js
tests/official.test.js
```

---

### Task 1: 建立專案骨架與測試環境

**Files:**
- Create: `package.json`
- Create: `vitest.config.js`
- Create: `index.html`
- Create: `js/app.js`
- Create: `js/router.js`
- Create: `tests/router.test.js`
- Create: `css/base.css`
- Create: `css/components.css`
- Create: `css/exam.css`

**Interfaces:**
- Produces: `createRouter(routes)`, `startRouter()`，供 `app.js` 與後續頁面使用。

- [ ] **Step 1: 寫 router 的 failing test**

```js
import { describe, expect, it } from 'vitest';
import { createRouter } from '../js/router.js';

describe('router', () => {
  it('resolves an existing hash route', () => {
    const router = createRouter({ '#/': () => 'home', '#/exam': () => 'exam' });
    expect(router.resolve('#/exam')()).toBe('exam');
  });

  it('falls back to home', () => {
    const router = createRouter({ '#/': () => 'home' });
    expect(router.resolve('#/missing')()).toBe('home');
  });
});
```

- [ ] **Step 2: 建立 `package.json` 與 Vitest config，確認測試先失敗**

```json
{
  "name": "jhsee-all-subjects",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "jsdom": "^26.0.0",
    "vitest": "^3.2.0"
  }
}
```

```js
// vitest.config.js
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'jsdom' } });
```

Run: `npm install && npm test`
Expected: FAIL，因為 `js/router.js` 尚不存在。

- [ ] **Step 3: 實作最小 router**

```js
export function createRouter(routes) {
  return {
    resolve(hash) {
      return routes[hash] ?? routes['#/'];
    }
  };
}

export function startRouter(router, render) {
  const run = () => render(router.resolve(location.hash || '#/')());
  window.addEventListener('hashchange', run);
  run();
}
```

- [ ] **Step 4: 建立最小首頁 shell**

`index.html` 必須包含 `<main id="app"></main>`，並以 `<script type="module" src="./js/app.js"></script>` 啟動；CSS 先提供可讀的手機優先排版與 `--bg`, `--surface`, `--text`, `--accent` CSS variables。

- [ ] **Step 5: 執行測試**

Run: `npm test`
Expected: router tests PASS。

- [ ] **Step 6: Commit**

```bash
git add package.json vitest.config.js index.html js css tests/router.test.js
git commit -m "feat: bootstrap static app and router"
```

---

### Task 2: 題目 Schema 驗證與來源模型

**Files:**
- Create: `js/core/schema.js`
- Create: `tests/schema.test.js`

**Interfaces:**
- Produces: `validateQuestion(question): { ok: boolean, errors: string[] }`
- Produces: `SOURCE_TYPES = { MOCK: 'mock', OFFICIAL: 'official', AI: 'ai-generated' }`

- [ ] **Step 1: 寫 failing tests**

```js
import { describe, expect, it } from 'vitest';
import { validateQuestion } from '../js/core/schema.js';

const valid = {
  id: 'mock-math-001', subject: 'math', domain: 'algebra', grade: [7,8,9],
  type: 'single-choice', difficulty: 2, sourceType: 'mock',
  sourceLabel: '平台自製模擬題', stem: '1+1=?',
  choices: ['1','2','3','4'], answer: 1, explanation: '1+1=2', tags: ['整數']
};

it('accepts a valid mock question', () => {
  expect(validateQuestion(valid)).toEqual({ ok: true, errors: [] });
});

it('rejects an official question without provenance', () => {
  const result = validateQuestion({ ...valid, sourceType: 'official' });
  expect(result.ok).toBe(false);
  expect(result.errors).toContain('official question requires year and sourceNote');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/schema.test.js`
Expected: FAIL，module not found。

- [ ] **Step 3: 實作 validator**

Validator 必須檢查 `id/subject/domain/grade/type/difficulty/sourceType/sourceLabel/stem/explanation/tags`；`single-choice` 額外要求 `choices` 與整數 `answer`；`official` 額外要求 `year` 與 `sourceNote`。

- [ ] **Step 4: 加入錯誤案例測試**

加入空 `stem`、choice index 超出範圍、未知 `sourceType` 與空 `id` 的單題驗證案例；重複 ID 由 Task 3 的 question bank 建構階段檢查。

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/schema.test.js`
Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add js/core/schema.js tests/schema.test.js
git commit -m "feat: validate question schema and provenance"
```

---

### Task 3: 題庫載入、篩選與官方/模擬來源隔離

**Files:**
- Create: `js/core/question-bank.js`
- Create: `tests/question-bank.test.js`
- Create: `data/mock/math.json`
- Create: `data/mock/chinese.json`
- Create: `data/mock/english.json`
- Create: `data/mock/social.json`
- Create: `data/mock/science.json`
- Create: `data/mock/writing.json`

**Interfaces:**
- Consumes: `validateQuestion()`
- Produces: `createQuestionBank(questions)`
- Produces methods: `filter(criteria)`, `pick(criteria, count, rng)`, `getById(id)`

- [ ] **Step 1: 寫 failing tests**

```js
import { createQuestionBank } from '../js/core/question-bank.js';

const base = {
  domain:'algebra', grade:[7,8,9], type:'single-choice', difficulty:2,
  sourceLabel:'平台自製模擬題', stem:'1+1=?', choices:['1','2','3','4'],
  answer:1, explanation:'1+1=2', tags:['整數']
};
const bank = createQuestionBank([
  { ...base, id:'m1', subject:'math', sourceType:'mock', difficulty:1 },
  { ...base, id:'m2', subject:'math', sourceType:'mock', difficulty:3 },
  { ...base, id:'o1', subject:'math', sourceType:'official', sourceLabel:'官方歷屆試題', year:115, sourceNote:'官方公布資料' }
]);
expect(bank.filter({ subject:'math', sourceType:'mock' }).map(q => q.id)).toEqual(['m1','m2']);
expect(bank.filter({ sourceType:'official' }).map(q => q.id)).toEqual(['o1']);
```

- [ ] **Step 2: Run failing test**

Run: `npx vitest run tests/question-bank.test.js`
Expected: FAIL。

- [ ] **Step 3: 實作 bank**

`createQuestionBank` 建構時驗證全部題目並檢查重複 ID；不合法題目存入 `diagnostics` 並排除，不讓整個 bank crash。`pick()` 必須接受 injected `rng`，確保測試可重現。

- [ ] **Step 4: 建立每科 3–5 題示範 mock JSON**

所有示範題必須標記 `sourceType: "mock"` 與 `sourceLabel: "平台自製模擬題"`。此階段不匯入任何未核對的官方題目。

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/question-bank.test.js tests/schema.test.js`
Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add js/core/question-bank.js tests/question-bank.test.js data/mock
git commit -m "feat: add source-safe question bank"
```

---

### Task 4: LocalStorage、版本化與測驗恢復資料

**Files:**
- Create: `js/core/storage.js`
- Create: `tests/storage.test.js`

**Interfaces:**
- Produces: `createStorage(storage = window.localStorage)`
- Methods: `getSettings()`, `saveSettings()`, `getActiveExam()`, `saveActiveExam()`, `clearActiveExam()`, `listAttempts()`, `saveAttempt()`, `getWrongBook()`, `saveWrongBook()`, `getWritingDraft()`, `saveWritingDraft()`

- [ ] **Step 1: 寫 failing test**

```js
const memory = new Map();
const fake = { getItem:k => memory.get(k) ?? null, setItem:(k,v)=>memory.set(k,v), removeItem:k=>memory.delete(k) };
const store = createStorage(fake);
store.saveActiveExam({ id:'exam-1', answers:{ q1:1 } });
expect(store.getActiveExam().id).toBe('exam-1');
expect([...memory.keys()].every(k => k.startsWith('jhsee.v1.'))).toBe(true);
```

- [ ] **Step 2: Run failing test**

Run: `npx vitest run tests/storage.test.js`
Expected: FAIL。

- [ ] **Step 3: 實作 namespaced storage**

JSON parse 失敗時回傳安全預設值；quota 或 storage exception 時回傳 `{ ok:false, error }` 給 caller，不直接 throw 到 UI。

- [ ] **Step 4: 加入 persistence tests**

測試 active exam、attempt history、wrong-book、writing draft 及 corrupt JSON fallback。

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/storage.test.js`
Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add js/core/storage.js tests/storage.test.js
git commit -m "feat: add versioned local storage layer"
```

---

### Task 5: 試卷設定、抽題與 Exam Session Engine

**Files:**
- Create: `js/config/exams.js`
- Create: `js/core/exam-engine.js`
- Create: `tests/exam-engine.test.js`

**Interfaces:**
- Consumes: question bank、storage
- Produces: `buildExam(config, bank, rng)`
- Produces: `createExamSession(exam, { now, onPersist })`
- Session methods: `answer(questionId, value)`, `toggleFlag(questionId)`, `goTo(index)`, `snapshot()`, `isExpired()`, `submit(reason)`

- [ ] **Step 1: 寫 failing test**

```js
const session = createExamSession({ id:'x', durationMinutes:30, questions:[{id:'q1'},{id:'q2'}] }, { now:() => 1000, onPersist:() => {} });
session.answer('q1', 2);
session.toggleFlag('q2');
expect(session.snapshot().answers.q1).toBe(2);
expect(session.snapshot().flagged).toEqual(['q2']);
```

- [ ] **Step 2: Run failing test**

Run: `npx vitest run tests/exam-engine.test.js`
Expected: FAIL。

- [ ] **Step 3: 實作 `buildExam()`**

`exams.js` 使用設定物件，不把正式規格硬寫在 UI。V1 先定義 `practice`, `subject-mock`, `full-mock` 三種 mode；每個 config 含 `durationMinutes`, `questionRules`, `shuffleQuestions`, `showAnswerDuringExam`。

- [ ] **Step 4: 實作 session engine**

每次 `answer/toggleFlag/goTo` 後呼叫 `onPersist(snapshot)`；`submit()` 回傳 immutable submission object；exam mode 未 submit 前不能取得 answer key。

- [ ] **Step 5: 加入 expiry/recovery test**

用 injected `now()` 測試剩餘時間、時間到 `submit('timeout')`、由 saved snapshot 恢復 current index、answers 與 flags。

- [ ] **Step 6: Run tests**

Run: `npx vitest run tests/exam-engine.test.js`
Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add js/config/exams.js js/core/exam-engine.js tests/exam-engine.test.js
git commit -m "feat: add configurable exam session engine"
```

---

### Task 6: 計分、弱點分析與歷次趨勢

**Files:**
- Create: `js/core/scoring.js`
- Create: `js/core/analytics.js`
- Create: `tests/scoring.test.js`
- Create: `tests/analytics.test.js`

**Interfaces:**
- Produces: `scoreSubmission(questions, answers)`
- Produces: `analyzeAttempt(questions, scoreResult, timing)`
- Produces: `buildTrend(attempts)`

- [ ] **Step 1: 寫 scoring failing test**

```js
const result = scoreSubmission(
  [{ id:'q1', type:'single-choice', answer:1 }, { id:'q2', type:'single-choice', answer:0 }],
  { q1:1, q2:2 }
);
expect(result).toMatchObject({ total:2, correct:1, accuracy:50 });
```

- [ ] **Step 2: 寫 analytics failing test**

輸入三題分屬 `algebra` 與 `geometry`，確認輸出 `byDomain.algebra` 與 `byDomain.geometry`，樣本未達最低門檻時 `weaknessStatus: 'insufficient-data'`。

- [ ] **Step 3: Run tests to verify failure**

Run: `npx vitest run tests/scoring.test.js tests/analytics.test.js`
Expected: FAIL。

- [ ] **Step 4: 實作 scoring 與 analytics**

客觀題自動評分；文字/寫作題標示 `manual-review`，不得自行給官方級分。Analytics 至少輸出 subject/domain/difficulty accuracy、平均答題時間與弱點排序。

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/scoring.test.js tests/analytics.test.js`
Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add js/core/scoring.js js/core/analytics.js tests/scoring.test.js tests/analytics.test.js
git commit -m "feat: add scoring and learning analytics"
```

---

### Task 7: 錯題本與再挑戰流程

**Files:**
- Create: `js/core/wrong-book.js`
- Create: `tests/wrong-book.test.js`

**Interfaces:**
- Produces: `updateWrongBook(current, questions, scoreResult, attemptId)`
- Produces: `resolveWrongQuestion(current, questionId)`
- Produces: `selectWrongQuestions(current, bank, limit)`

- [ ] **Step 1: 寫 failing test**

```js
const updated = updateWrongBook([], [{id:'q1'}], { items:[{id:'q1', correct:false}] }, 'a1');
expect(updated[0]).toMatchObject({ questionId:'q1', wrongCount:1, resolved:false });
```

- [ ] **Step 2: Run failing test**

Run: `npx vitest run tests/wrong-book.test.js`
Expected: FAIL。

- [ ] **Step 3: 實作錯題狀態**

再次答錯 `wrongCount + 1`；答對後由 UI 呼叫 `resolveWrongQuestion` 標記 resolved，但保留歷史紀錄。

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/wrong-book.test.js`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add js/core/wrong-book.js tests/wrong-book.test.js
git commit -m "feat: add wrong-answer review model"
```

---

### Task 8: 首頁、六科入口與 CBT UI Shell

**Files:**
- Create: `js/ui/home.js`
- Create: `js/ui/practice.js`
- Create: `tests/home.test.js`
- Modify: `js/app.js`
- Modify: `css/base.css`
- Modify: `css/components.css`

**Interfaces:**
- Consumes: router、storage、analytics summary
- Produces: `renderHome(context)`, `renderPracticeSetup(context)`

- [ ] **Step 1: 建立 UI DOM test**

在 `tests/home.test.js` 驗證 `renderHome()` 輸出包含「開始全真模擬」、六個科目名稱、錯題數與 116 年會考倒數容器。

- [ ] **Step 2: Run failing UI test**

Run: `npx vitest run tests/home.test.js`
Expected: FAIL。

- [ ] **Step 3: 實作首頁卡片與 CTA**

首頁必須有國文、英語、數學、社會、自然、寫作六張科目卡；「開始全真模擬」連到 `#/exam/full`；歷屆題連到 `#/official`。

- [ ] **Step 4: 實作 responsive styles**

320px 寬度不應出現水平捲動；≥900px 使用多欄 dashboard；按鈕 touch target 至少 44px 高。

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add js/ui/home.js js/ui/practice.js js/app.js css tests/home.test.js
git commit -m "feat: add CBT dashboard and subject entry points"
```

---

### Task 9: 考試 Runner、答案卡、計時與交卷

**Files:**
- Create: `js/ui/exam-runner.js`
- Create: `js/subjects/common.js`
- Create: `js/subjects/english.js`
- Create: `js/subjects/math.js`
- Create: `js/subjects/registry.js`
- Create: `tests/exam-runner.test.js`
- Modify: `css/exam.css`

**Interfaces:**
- Consumes: exam session、subject registry
- Produces: `renderExamRunner({ session, questions, registry, onSubmit })`

- [ ] **Step 1: 寫 DOM failing test**

驗證兩題 exam 會顯示目前題號、倒數時間區、四個選項、答案卡按鈕、標記按鈕與交卷按鈕。

- [ ] **Step 2: Run failing test**

Run: `npx vitest run tests/exam-runner.test.js`
Expected: FAIL。

- [ ] **Step 3: 實作 common renderer 與 registry**

`registry.get(question)` 依 `subject/type` 選 renderer；不存在專屬 renderer 時回 common single-choice/text renderer。

- [ ] **Step 4: 實作 runner**

作答即寫入 session；答案卡顯示 `answered/unanswered/flagged/current`；考試模式不可顯示正確答案；submit 必須二次確認，timeout 除外。

- [ ] **Step 5: 實作英語/數學差異**

English 支援 `media.audio` 播放控制；Math text-response 顯示文字輸入框但 V1 只標 `manual-review`。

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add js/ui/exam-runner.js js/subjects css/exam.css tests/exam-runner.test.js
git commit -m "feat: add exam runner and answer sheet"
```

---

### Task 10: 成績頁、詳解、錯題複習與歷史 Dashboard

**Files:**
- Create: `js/ui/results.js`
- Create: `js/ui/history.js`
- Create: `tests/results.test.js`
- Modify: `js/app.js`

**Interfaces:**
- Consumes: scoring、analytics、wrong-book、storage
- Produces: `renderResults(attempt)`, `renderHistory(attempts)`

- [ ] **Step 1: 寫 results failing test**

結果頁需顯示答對數、總題數、正確率、各 domain 統計、每題作答/正解/解析，以及「再練錯題」按鈕。

- [ ] **Step 2: Run failing test**

Run: `npx vitest run tests/results.test.js`
Expected: FAIL。

- [ ] **Step 3: 實作結果頁**

明確顯示「模擬分析，非官方會考等級」；官方題與 mock 題以來源 badge 區分。

- [ ] **Step 4: 實作歷史 Dashboard**

顯示最近測驗、accuracy trend、弱點 domain、平均答題時間與錯題改善數。無足夠樣本時顯示「資料不足」。

- [ ] **Step 5: 串接錯題重做**

「再練錯題」建立 practice mode exam，只取 unresolved wrong-book 題目。

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add js/ui/results.js js/ui/history.js js/app.js tests/results.test.js
git commit -m "feat: add results review and progress dashboard"
```

---

### Task 11: 寫作模組與草稿保存

**Files:**
- Create: `js/ui/writing.js`
- Create: `js/subjects/writing.js`
- Create: `tests/writing.test.js`
- Modify: `js/subjects/registry.js`

**Interfaces:**
- Consumes: storage
- Produces: `renderWritingTask(question, draft)`
- Produces: `countWritingChars(text)`

- [ ] **Step 1: 寫 failing test**

驗證輸入文字後字數更新，並且 `saveWritingDraft(questionId, text)` 可由 storage 還原。

- [ ] **Step 2: Run failing test**

Run: `npx vitest run tests/writing.test.js`
Expected: FAIL。

- [ ] **Step 3: 實作寫作畫面**

顯示題目、引導材料、textarea、字數、儲存狀態與評分規準說明；不顯示「AI 官方級分」。

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add js/ui/writing.js js/subjects/writing.js js/subjects/registry.js tests/writing.test.js
git commit -m "feat: add writing practice with draft recovery"
```

---

### Task 12: 官方歷屆試題專區與 provenance gate

**Files:**
- Create: `js/ui/official.js`
- Create: `data/official/115/.gitkeep`
- Create: `tests/official.test.js`
- Modify: `js/app.js`

**Interfaces:**
- Consumes: question bank、schema
- Produces: `renderOfficialArchive(years)`

- [ ] **Step 1: 寫 failing test**

官方頁在無已核對資料時必須顯示「官方題庫尚未匯入」而非 fallback 到 mock 題；mock 題絕不可出現在 official route。

- [ ] **Step 2: Run failing test**

Run: `npx vitest run tests/official.test.js`
Expected: FAIL。

- [ ] **Step 3: 實作 official archive route**

只讀取 `data/official/<year>/`，不自動合併 `data/mock/`。每份官方題資料必須通過 `sourceType=official`、`year`、`sourceNote` 驗證後才顯示。

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add js/ui/official.js data/official tests/official.test.js js/app.js
git commit -m "feat: isolate official exam archive"
```

---

### Task 13: GitHub Pages CI/CD 與部署安全性

**Files:**
- Create: `.github/workflows/pages.yml`
- Create: `404.html`
- Modify: `README.md`

**Interfaces:**
- Produces: GitHub Actions workflow，push 到 `main` 時先 `npm ci && npm test`，通過後只打包網站必要檔案到 `_site/` 再部署。

- [ ] **Step 1: 建立 workflow**

Workflow permissions 使用 `contents: read`, `pages: write`, `id-token: write`；步驟為 checkout → setup-node → `npm ci` → `npm test` → 建立 `_site` → configure-pages → upload-pages-artifact → deploy-pages。

- [ ] **Step 2: 建立乾淨的 Pages artifact**

Workflow 內使用：

```bash
mkdir -p _site/assets
cp index.html 404.html _site/
cp -R css js data _site/
if [ -d assets ]; then cp -R assets/. _site/assets/; fi
```

`actions/upload-pages-artifact` 的 `path` 必須指定 `_site`，不得上傳 repository root 或 `node_modules`。

- [ ] **Step 3: 建立 `404.html`**

因網站採 hash routing，`404.html` 導回 GitHub Pages repository base path；正常 SPA route 一律使用 hash，不依賴 server rewrite。

- [ ] **Step 4: README 補上本機測試與部署說明**

包含 `npm install`, `npm test`，以及 GitHub Settings → Pages → Source 設為 GitHub Actions 的必要操作。

- [ ] **Step 5: 執行完整測試**

Run: `npm test`
Expected: 全部 PASS。

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/pages.yml 404.html README.md
git commit -m "ci: test and deploy site to GitHub Pages"
```

---

### Task 14: V1 整合 QA 與驗收

**Files:**
- Modify only when defects are found in files introduced by Tasks 1–13.
- Create: `docs/qa/v1-checklist.md`

**Interfaces:**
- Produces: V1 驗收記錄。

- [ ] **Step 1: 跑完整 automated test suite**

Run: `npm test`
Expected: 0 failures。

- [ ] **Step 2: 用本機 HTTP server 驗證靜態載入**

Run: `python3 -m http.server 8080`
Open: `http://localhost:8080/`
Expected: 首頁、六科、practice、subject mock、full mock、results、history、official、writing routes 均可開啟，console 無 blocking error。

- [ ] **Step 3: 驗證恢復流程**

開始一份測驗 → 作答兩題 → refresh → 必須回到同一份 active exam，答案與 flag 保留。

- [ ] **Step 4: 驗證來源隔離**

Official route 不得看到 `sourceType=mock`；results 中每題必須有 mock/official badge；官方題缺 provenance 必須被 diagnostics 排除。

- [ ] **Step 5: 驗證手機版**

以 320×568、390×844 viewport 檢查：無水平捲動、按鈕可點、題幹不被固定列遮住、答案卡可操作、長題幹可滾動。

- [ ] **Step 6: 建立 QA checklist**

`docs/qa/v1-checklist.md` 記錄每項 PASS/FAIL、瀏覽器、日期與 commit SHA；不得留下未記錄的阻斷性錯誤。

- [ ] **Step 7: 最後 commit**

```bash
git add docs/qa/v1-checklist.md
git commit -m "test: complete V1 acceptance checklist"
```

---

## Definition of Done

- GitHub Pages 可正常開啟，手機/桌面都能使用。
- 六科與寫作入口存在。
- 單元練習、單科模擬、全真模擬至少有示範題可完成全流程。
- 考試中重新整理可恢復進度。
- 客觀題可自動計分，文字/寫作題不偽裝成官方自動評分。
- 錯題可累積、重做、標記 resolved。
- Dashboard 顯示歷次成績、domain 弱點、作答時間與樣本不足提示。
- 官方與 mock 題庫在資料、路由與 UI 三層都隔離。
- `npm test` 0 failures。
- GitHub Actions 先測試後部署。
