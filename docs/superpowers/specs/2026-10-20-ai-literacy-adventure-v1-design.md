# 妹妹教學｜AI 素養冒險 V1.0 Design

## Goal

在既有 JHSEE-All-Subjects／知識小站加入一個獨立的「AI 素養冒險」課程，面向國一學生與親子共讀。課程共 12 週，每週 30–45 分鐘，重點不是教學生用 AI 抄答案，而是訓練理解、提問、判斷、查證與負責任使用 AI。

## Product principles

- 手機優先，單欄、大按鈕、主要文字至少 16px。
- 不把 AI 素養加入五科 SUBJECTS、模考權重、自適應診斷或正式歷屆題庫。
- 每課固定六區：5 分鐘懂概念、親子共讀、AI 對話闖關、5 題小測驗、Boss 任務、學習紀錄。
- 核心流程：問 AI → 看答案 → 找證據 → 比較 → 判斷 → 修正。
- AI 回答視為候選答案，不視為權威答案。
- 個資、著作權、偏見、公平、Deepfake 與學術誠信納入必修。
- 學生任何頁面最多兩次操作可切換到其他課程。

## 12-week curriculum

1. AI 到底是什麼：分辨 AI、一般程式與搜尋。
2. AI 怎麼學習：資料、訓練、模型、預測。
3. AI 為什麼會答錯：幻覺與不確定性。
4. AI 偵探：至少兩個來源交叉查證。
5. 怎麼問 AI：任務、對象、背景、限制、輸出格式。
6. AI 幫我讀書，不是幫我作弊：自己先想 → AI 提示 → 自己再答 → AI 檢查。
7. 個資與隱私：敏感資料與匿名化。
8. AI 偏見與公平：資料偏差如何影響模型。
9. AI 圖片、Deepfake 與假訊息：來源、日期、原始內容與交叉查證。
10. AI、著作權與引用：AI 產生不等於自己原創。
11. AI 創作實驗室：AI 做草稿，人做決策。
12. AI 終極任務：用 AI 解決真實問題並完整說明查證與修正。

## Game system

### EXP

- 完成親子共讀：+10
- Quiz 達 80 分：+20
- 完成 AI Challenge：+20
- 完成 Boss：+30
- 完成有效查證卡：+20

同一活動的首次通關獎勵只能領一次，重做可更新最高分但不能重複刷 EXP。

### Levels

Lv.1 AI 新手、Lv.2 AI 探索者、Lv.3 Prompt 練習生、Lv.4 AI 偵探、Lv.5 查證高手、Lv.6 AI 學習助手、Lv.7 隱私守門員、Lv.8 公平觀察員、Lv.9 假訊息獵人、Lv.10 數位公民、Lv.11 AI 創作者、Lv.12 AI 小偵探。

## Verification card

每張查證卡包含：問題、AI 回答、來源 1、來源 2、兩來源一致性、自己的判斷、最後答案、信心等級。不得要求真實姓名、地址、電話、帳密、驗證碼或其他敏感個資。

## Architecture

AI 素養採獨立模組，不塞入五科 SUBJECTS：

- `data/ai-literacy-course.json`：12 週教材與題庫。
- `js/config/ai-literacy.js`：EXP、Level、課程常數。
- `js/core/ai-literacy-progress.js`：進度、Quiz、Streak、Level、查證卡。
- `js/ui/ai-literacy-view.js`：AI 素養首頁、地圖、單週、Quiz、查證頁。
- `js/core/storage.js`：新增 nested `aiLiteracy` 狀態，維持現有 state version 相容。
- `js/app.js`：載入教材、註冊路由、事件整合。
- `js/ui/app-shell.js`：加入 AI 素養入口。
- `css/app.css`：`.ai-literacy-*` scoped styles。

Routes:

- `#/ai-literacy`
- `#/ai-literacy/map`
- `#/ai-literacy/week/:weekId`
- `#/ai-literacy/verify/:weekId`

## Data and migration

既有 localStorage 沒有 `aiLiteracy` 時，load 必須自動補預設 state，且不得破壞 player、wrongQuestions、answerHistory、模考紀錄或五科自適應資料。備份／還原必須一併包含 AI 素養資料。

## Quiz rules

- 每週至少 10 題題庫，每次抽 5 題。
- 支援 single、multiple、true-false。
- 80 分通關。
- 未交卷前不得揭露正解；交卷後每題顯示 explanation。
- 題庫至少包含兩題情境題。

## UX acceptance

- 首頁只顯示目前 Level、EXP、Streak、最近成績、下一步與繼續學習，不一次攤開全部 12 週。
- 單週頁固定提供上一課、課程地圖、下一課、AI 素養首頁。
- 360px 寬度不得出現水平捲動。
- touch target min-height 44px。
- 狀態不能只靠顏色表示，需文字或 icon。

## Definition of Done

- 12 週完整、每週六區齊全。
- 每週題庫至少 10 題，每次抽 5 題。
- EXP／Level／Streak 可跨重整保存且不可重複刷獎。
- 查證卡可新增、保存與復原。
- 備份／還原包含 AI 素養。
- AI 素養完全不影響五科自適應權重。
- `npm test`、`npm run audit:content`、`npm run build` 全部通過。
- 360×800、390×844、430×932 手機 smoke test 通過。
- 五科、會考中心、錯題、英文 TTS、模考／落點、AI 題目服務回歸通過。
