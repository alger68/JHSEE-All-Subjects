# AI 素養冒險 V1.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `alger68/JHSEE-All-Subjects` 中加入 12 週、國一程度、手機優先的「AI 素養冒險」獨立課程。

**Architecture:** AI 素養不加入既有五科 `SUBJECTS`，避免干擾會考題庫、自適應權重、模考與歷屆題。內容由靜態 JSON 驅動；進度集中在獨立 core；畫面集中在獨立 UI；只在 storage、app 與 app-shell 做最小整合。

**Tech Stack:** Vite 7、原生 ES Modules、Vitest 3、jsdom、localStorage。

**Spec:** `docs/superpowers/specs/2026-10-20-ai-literacy-adventure-v1-design.md`

## Global Constraints

- 12 週；每週 30–45 分鐘。
- 手機優先，360px 寬度可完整操作。
- 每課六區：概念、親子共讀、AI Challenge、5 題 Quiz、Boss、學習紀錄。
- 核心流程：問 AI → 看答案 → 找證據 → 比較 → 判斷 → 修正。
- 不新增 runtime dependency。
- 不把 AI 素養資料混入五科自適應權重。
- 進度需跟現有 backup/export/import 一起保存。
- 首次完成獎勵不可重複刷 EXP。

## Review Focus

1. 舊 localStorage 沒有 `aiLiteracy` 時要自動 migration 且不破壞既有資料。
2. 同一活動重做不得重複取得首次通關 EXP。
3. Streak 同日不重複增加、隔日 +1、漏一天重設 1。
4. 某週教材資料不完整時只降級該區，不可讓整站 crash。
5. AI 素養不可進入 SUBJECTS、模考權重或五科 adaptive data。

---

### Task 1: 課程資料模型與 12 週教材

**Files:**
- Create: `data/ai-literacy-course.json`
- Create: `js/config/ai-literacy.js`
- Create: `tests/ai-literacy-progress.test.js`

**Interfaces:**
- `AI_LITERACY_EXP`
- `AI_LITERACY_LEVELS`
- `normalizeWeekId(value)`
- JSON root `{ version, courseId, title, weeks[] }`

- [ ] 寫失敗測試：必須恰好 12 週、id 為 `week-01`…`week-12` 且唯一。
- [ ] 寫失敗測試：每週都有 `title/objectives/concept/parentReading/aiChallenge/quiz/boss/sources`。
- [ ] 建立 config：Quiz 80 分及格、每次 5 題；EXP 共讀 +10、Quiz +20、Challenge +20、Boss +30、查證 +20。
- [ ] 建立 12 週完整 JSON，每週 quiz 至少 10 題，支援 `single/multiple/true-false`。
- [ ] Run: `npm test -- tests/ai-literacy-progress.test.js`
- [ ] Commit: `feat: add AI literacy course schema and curriculum`

### Task 2: AI 素養進度引擎

**Files:**
- Create: `js/core/ai-literacy-progress.js`
- Modify: `tests/ai-literacy-progress.test.js`

**Produces:**
- `createAiLiteracyState()`
- `restoreAiLiteracyState(value)`
- `recordAiLiteracyQuiz(state, weekId, result, date)`
- `completeAiLiteracyActivity(state, weekId, activity, date)`
- `saveVerificationCard(state, weekId, card, date)`
- `aiLiteracyLevel(state)`
- `aiLiteracyWeekStatus(state, weekId)`
- `aiLiteracySummary(state, today)`

- [ ] 測試預設 state：exp 0、streak 0、weeks `{}`、verificationCards `[]`。
- [ ] 測試首次完成 EXP 只發一次。
- [ ] 測試 Streak 同日、隔日、中斷規則。
- [ ] 測試 Level 不因重做倒退。
- [ ] 實作 pure immutable functions。
- [ ] Run: `npm test -- tests/ai-literacy-progress.test.js`
- [ ] Commit: `feat: add AI literacy progress engine`

### Task 3: 接入現有 storage

**Files:**
- Modify: `js/core/storage.js`
- Modify: `tests/storage.test.js`

- [ ] 測試 `defaultState().aiLiteracy` 存在。
- [ ] 測試舊 version 1 state 沒有 aiLiteracy 時，load 後自動補上且 player/wrongQuestions/answerHistory 不變。
- [ ] 測試 export → import round-trip 保留 AI 素養資料。
- [ ] 不升整站 state version；用 nested restore 維持 backward compatibility。
- [ ] Run: `npm test -- tests/storage.test.js`
- [ ] Commit: `feat: persist AI literacy progress`

### Task 4: AI 素養 UI renderer

**Files:**
- Create: `js/ui/ai-literacy-view.js`
- Create: `tests/ai-literacy-ui.test.js`

**Produces:**
- `renderAiLiteracyHome({course, summary})`
- `renderAiLiteracyMap({course, progress})`
- `renderAiLiteracyWeek({week, status, quizSession})`
- `renderAiLiteracyVerification({week, card})`

- [ ] 首頁測試：Level、EXP、Streak、繼續學習、課程地圖。
- [ ] 單週測試：六區全部存在。
- [ ] 導航測試：上一課／地圖／下一課／AI 素養首頁。
- [ ] 缺 quiz 或 sources 時顯示「此區內容正在補充」，不得 throw。
- [ ] 使用者輸入輸出前 HTML escape。
- [ ] Run: `npm test -- tests/ai-literacy-ui.test.js`
- [ ] Commit: `feat: add AI literacy course views`

### Task 5: 路由與主站入口

**Files:**
- Modify: `js/app.js`
- Modify: `js/ui/app-shell.js`
- Modify: `tests/router.test.js`
- Modify: `tests/app-shell.test.js`
- Create: `tests/ai-literacy-integration.test.js`

**Routes:**
- `#/ai-literacy`
- `#/ai-literacy/map`
- `#/ai-literacy/week/:weekId`
- `#/ai-literacy/verify/:weekId`

- [ ] 測試動態 week route 解析。
- [ ] app shell 出現「AI 素養冒險」入口。
- [ ] `week-99` 不 crash。
- [ ] boot 載入 `data/ai-literacy-course.json`；若失敗，五科仍正常啟動，只停用 AI 素養。
- [ ] AI 素養 routes 不經 SUBJECTS。
- [ ] Run: `npm test -- tests/router.test.js tests/app-shell.test.js tests/ai-literacy-integration.test.js`
- [ ] Commit: `feat: route AI literacy adventure into learning hub`

### Task 6: Quiz 互動

**Files:**
- Modify: `js/core/ai-literacy-progress.js`
- Modify: `js/ui/ai-literacy-view.js`
- Modify: `js/app.js`
- Modify: `tests/ai-literacy-progress.test.js`
- Modify: `tests/ai-literacy-integration.test.js`

**Produces:**
- `createAiLiteracyQuizSession(week, rng)`
- `answerAiLiteracyQuestion(session, questionId, answer)`
- `finishAiLiteracyQuiz(session)`

- [ ] 每次恰好抽 5 題、不重複、可注入 rng。
- [ ] 單選／複選／是非都能正確計分。
- [ ] 未交卷不揭露正解，交卷後每題顯示 explanation。
- [ ] runtime session 不立即寫正式進度，完成才記錄最高分與通關。
- [ ] Events: `ai-quiz-start/answer/submit/retry`。
- [ ] Commit: `feat: add AI literacy quizzes`

### Task 7: 共讀、AI Challenge、Boss

**Files:**
- Modify: `js/app.js`
- Modify: `js/ui/ai-literacy-view.js`
- Modify: `tests/ai-literacy-integration.test.js`

- [ ] Events: `ai-parent-reading-complete`, `ai-challenge-complete`, `ai-boss-complete`。
- [ ] 首次完成更新 status/EXP/date/streak；重複點擊不重複發 EXP。
- [ ] Boss 完成前自我檢核：有自己判斷、有查證、未輸入敏感個資。
- [ ] Commit: `feat: track AI literacy weekly activities`

### Task 8: AI 查證卡

**Files:**
- Modify: `js/core/ai-literacy-progress.js`
- Modify: `js/ui/ai-literacy-view.js`
- Modify: `js/app.js`
- Modify: relevant tests

**Card fields:** `id/weekId/question/aiAnswer/source1/source2/agreement/judgement/finalAnswer/confidence/createdAt`

- [ ] 驗證必要欄位與 confidence=`low|medium|high`。
- [ ] UI 不要求真實姓名、地址、電話、帳密、驗證碼。
- [ ] 支援新增、更新未完成卡、保存與最近紀錄。
- [ ] 首次有效查證 +20 EXP，同卡重存不重複發獎。
- [ ] Commit: `feat: add AI verification cards`

### Task 9: 手機 UX

**Files:**
- Modify: `css/app.css`
- Modify: `tests/ai-literacy-ui.test.js`
- Modify: `tests/ui-theme-contract.test.js`

- [ ] CSS scope `.ai-literacy-*`。
- [ ] 主要文字 >=16px；touch target >=44px；360px 無水平捲動。
- [ ] bottom nav 不遮內容。
- [ ] 未開始／進行中／已完成／Quiz 通過／Boss 完成不能只靠顏色區分。
- [ ] Commit: `style: add mobile AI literacy learning experience`

### Task 10: 完整驗證與回歸

**Files:**
- Modify: `scripts/verify-build.mjs`
- Modify: `tests/release-readiness.test.js`
- Create: `docs/verification-2026-10-20-ai-literacy-v1.md`

- [ ] 驗證 12 週、每週 quiz >=10、sources >=1、quiz id 全域唯一、每週 Boss 存在。
- [ ] Run: `npm test`
- [ ] Run: `npm run audit:content`
- [ ] Run: `npm run build`
- [ ] 手機 smoke：360×800、390×844、430×932。
- [ ] 流程 smoke：首页 → Week 1 → 共讀 → Quiz → 查證卡 → Boss → 地圖 → reload → backup → reset → import。
- [ ] 五科回歸：五科世界、會考中心、錯題、英文 TTS、模考／落點、AI 題目服務。
- [ ] 確認 AI 素養資料未進入五科 adaptive weights。
- [ ] Commit: `test: verify AI literacy adventure v1`

---

## Definition of Done

- [ ] 12 週完整教材與六區齊全。
- [ ] 每週至少 10 題，每次抽 5 題，80 分通關。
- [ ] EXP 不可重複刷；Level／Streak 可跨重整保存。
- [ ] 查證卡可新增、保存、備份與還原。
- [ ] AI 素養不影響五科 adaptive data。
- [ ] 360px 手機完整可用。
- [ ] `npm test`、`npm run audit:content`、`npm run build` 全綠。
- [ ] 五科既有功能回歸通過。

## V1.1 Backlog

能力雷達圖、每月 AI Challenge、國二／國三教材、AI 對話自動評分、雲端同步、家長後台、排行榜、多人體驗。以上不進 V1.0，避免 scope 膨脹。
