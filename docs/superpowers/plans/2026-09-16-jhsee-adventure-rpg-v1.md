# JHSEE Adventure RPG V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立可部署至 GitHub Pages、手機優先、具五科關卡、戰鬥、Boss、錯題復仇與學習分析的 116 會考 RPG V1。

**Architecture:** 純前端 HTML/CSS/ES Modules；題庫、遊戲規則、存檔與 DOM UI 分層。核心狀態使用純函式，瀏覽器只負責渲染與 LocalStorage，讓 Vitest 可直接驗證規則。

**Tech Stack:** HTML5、CSS3、JavaScript ES Modules、JSON、Vitest、jsdom、GitHub Actions、GitHub Pages

**Spec:** `docs/superpowers/specs/2026-09-16-jhsee-adventure-rpg-v1-design.md`

## Global Constraints

- 不修改或覆蓋 `JHSEE-English-Adventure`。
- 使用 `JHSEE-All-Subjects`，目標為 116 年會考。
- V1 僅使用平台原創模擬題；官方題與模擬題保持隔離。
- V1 無登入、後端、AI API 或雲端同步。
- 主要功能必須可於 GitHub Pages 子路徑執行。
- 每個遊戲核心行為都先寫失敗測試，再實作最小通過版本。

---

### Task 1: 專案骨架與路由

**Files:** `package.json`, `vitest.config.js`, `index.html`, `css/app.css`, `js/app.js`, `js/router.js`, `tests/router.test.js`

**Interfaces:** `createRouter(routes)`, `matchRoute(hash)`, `navigate(hash)`。

- [ ] 寫路由解析與 fallback 的失敗測試。
- [ ] 執行 `npm test -- tests/router.test.js`，確認因模組不存在而失敗。
- [ ] 建立最小 router、HTML shell、CSS tokens 與 App 啟動器。
- [ ] 再跑測試至通過，提交 `feat: bootstrap adventure app`。

### Task 2: 題目 Schema 與題庫

**Files:** `js/core/schema.js`, `js/core/question-bank.js`, `data/questions.json`, `tests/question-bank.test.js`

**Interfaces:** `validateQuestion(question)`, `createQuestionBank(questions)`, `filter(criteria)`, `pick(criteria,count,rng)`。

- [ ] 先測合法題、答案越界、重複 ID、subject/topic 篩選及 injected RNG 抽題。
- [ ] 實作驗證器與題庫。
- [ ] 建立五科各 6 題、共 30 題原創模擬題。
- [ ] 執行測試與 JSON parse 檢查，提交 `feat: add five-subject question bank`。

### Task 3: 玩家、戰鬥與獎勵規則

**Files:** `js/core/game-state.js`, `js/core/battle.js`, `tests/game-state.test.js`, `tests/battle.test.js`

**Interfaces:** `createPlayer()`, `levelFromExp(exp)`, `createBattle(questions,mode)`, `answerBattle(state,question,choice)`、`finishBattle(state)`。

- [ ] 先測 HP、Combo 傷害、答錯歸零、EXP、金幣、星級、Boss 80% 門檻與升級公式。
- [ ] 實作 immutable state transitions。
- [ ] 跑核心測試，提交 `feat: add battle and progression rules`。

### Task 4: 存檔、每日任務與錯題復仇

**Files:** `js/core/storage.js`, `js/core/quests.js`, `js/core/mastery.js`, `tests/storage.test.js`, `tests/quests.test.js`, `tests/mastery.test.js`

**Interfaces:** `createStore(storage)`, `updateDailyQuest(state,event,date)`, `claimDailyChest(state,date)`, `recordWrong(list,id,date)`, `reviewWrong(list,id,correct,date)`。

- [ ] 先測 namespace、損壞 JSON fallback、10 題 Streak、寶箱防重複、熟練度升降與複習日期。
- [ ] 實作存檔、每日任務與 mastery。
- [ ] 跑測試，提交 `feat: persist quests and revenge mastery`。

### Task 5: 分析與快速模考

**Files:** `js/core/analytics.js`, `js/core/exam.js`, `tests/analytics.test.js`, `tests/exam.test.js`

**Interfaces:** `updateSkillStats(stats,question,correct)`, `summarizeSkills(stats,minSamples)`, `createExam(questions)`, `submitExam(exam,answers)`。

- [ ] 先測 subject/topic 正確率、資料不足、跨科試卷與交卷前不暴露答案。
- [ ] 實作分析與模考純函式。
- [ ] 跑測試，提交 `feat: add analytics and quick exam`。

### Task 6: 完整遊戲 UI

**Files:** `js/ui/views.js`, `js/ui/components.js`, `js/app.js`, `css/app.css`, `tests/ui.test.js`, `public/favicon.svg`

**Interfaces:** `renderLobby(model)`, `renderWorld(model)`, `renderBattle(model)`, `renderResults(model)`, `renderRevenge(model)`, `renderAnalysis(model)`。

- [ ] 先測 Lobby 五科、玩家狀態、關卡、戰鬥按鈕、Boss、錯題與分析空狀態。
- [ ] 實作所有 routes 與 event delegation。
- [ ] 套用夜色冒險地圖視覺、RWD、keyboard focus 與 reduced-motion。
- [ ] 跑完整測試，提交 `feat: build playable adventure interface`。

### Task 7: 文件、GitHub Pages 與驗證

**Files:** `README.md`, `.github/workflows/pages.yml`

- [ ] 更新操作說明、資料保存限制與題庫來源說明。
- [ ] Workflow 在 push main 時執行 `npm ci`, `npm test`, 並部署 repository root。
- [ ] 執行 `npm test`、本機靜態伺服器 smoke test、手機與桌面截圖檢查。
- [ ] 修正阻斷問題後再次跑完整驗證。
- [ ] 提交 `chore: deploy JHSEE Adventure to GitHub Pages` 並推送。

