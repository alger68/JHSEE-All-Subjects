# All Subjects 可擴充題庫＋錯題變形複習 V2 設計規格

- 日期：2026-09-21
- 專案：`alger68/JHSEE-All-Subjects`
- 狀態：已完成對話設計，待書面規格確認
- 目標版本：Question Provider / Review V2
- 基礎版本：JHSEE Unified UI 已部署至 `main`

## 1. 背景與問題

目前 All Subjects 已具備：

- 本地題庫 `data/questions.json` 與 `data/cap-practice.json`
- AI generated question cache
- Adaptive Learning 與 skill identity
- 最近題目 ID 去重
- 錯題間隔複習
- 官方歷屆題獨立流程

但目前有兩個結構性問題：

1. 題庫載入來源仍硬編碼在 `boot()`，新增大量題庫時需修改程式。
2. 錯題複習核心仍以原 `questionId` 為中心，因此學生容易反覆看到同一題，而不是驗證同一核心能力是否真正掌握。

本設計將題庫抽取從「題目 ID 導向」升級成「能力導向」，同時建立可擴充 Question Provider 架構。

---

## 2. 已確認產品決策

### 2.1 錯題原題規則

採用方案 A：

- 原錯題只允許作為第一次複習 Anchor 題再出一次。
- 第二次複習開始，優先使用同能力的新題。
- 不允許透過反覆原題作答來快速提升 mastery。

### 2.2 題目來源順序

採用：

1. 本地同能力新題
2. 本地近能力題
3. 已驗證 AI cache
4. 即時 AI 生成
5. 冷卻期已結束的較舊題

本地題庫優先；AI 僅在本地候選不足時補充。

### 2.3 官方題隔離

官方歷屆題：

- 保持原題作答與報告功能。
- 不放入一般變形題池。
- 不作為 AI 改寫來源。
- 可貢獻 mastery / error history，但不進 Question Pack variant pool。

---

## 3. 設計目標

### 3.1 題庫可擴充

未來新增 500、1000、5000 題時：

- 不需要修改 `app.js` 題庫 URL 列表。
- 不需要重寫抽題邏輯。
- 新題庫只需新增 pack file 並登錄 manifest。
- CI 自動驗證格式、ID、metadata、重複度與基本分布。

### 3.2 錯題不再原題循環

錯題流程從：

`原題 → 原題 → 原題`

改為：

`原題 Anchor → Same Skill → Near Transfer → Delayed Transfer`

### 3.3 防止假熟練

「背答案」不得被視為 mastery。

Resolved 必須有跨題驗證證據，而不是只在同一 `questionId` 上答對多次。

### 3.4 保持既有資料

不得破壞：

- 玩家 EXP / 金幣 / streak
- 模考紀錄
- 官方試卷報告
- Adaptive skill history
- AI cache
- 現有 wrongQuestions

---

## 4. 架構概觀

新的題目供應架構：

```
Question Packs
     ↓
Question Registry
     ↓
Question Provider
     ↓
Selection / Diversity Policy
     ↓
Practice / Review / AI Remediation
```

核心模組：

- `js/core/question-bank.js`
  - 保留單題驗證與基本 bank 建立。
- `js/core/question-registry.js`
  - 管理所有非官方可抽題來源與 metadata。
- `js/core/question-provider.js`
  - 統一所有取題入口。
- `js/core/question-dedup.js`
  - 處理 fingerprint 與 similarity。
- `js/core/mastery.js`
  - 升級 review stage 與 resolved 規則。
- `js/core/question-diversity.js`
  - 保留既有 recent ID / reservoir 能力；部分邏輯將轉由 provider 呼叫。
- `js/app.js`
  - 不再自行拼 local + AI pools；改呼叫 provider。

---

## 5. Question Pack

### 5.1 Manifest

新增：

`data/packs/manifest.json`

格式：

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

未來可加入：

- `english-reading-v1`
- `math-geometry-v1`
- `science-experiment-v1`
- `social-data-v1`

### 5.2 Pack metadata

每個 pack manifest entry 支援：

- `id`
- `version`
- `file`
- `enabled`
- `kind`
- `subject`（optional）
- `questionCount`（optional build-time assertion）

### 5.3 題目 metadata

Provider 標準 metadata：

- `subject`
- `grade`
- `domain`
- `competency`
- `subSkill`
- `difficulty`
- `questionType`
- `sourceKind`
- `packId`
- `packVersion`
- `variationForm`
- `fingerprint`

舊題若沒有完整欄位，可由既有 `classifyQuestion()` / `skillIdentity()` 推導。

---

## 6. Question Registry

### 6.1 責任

Registry 負責：

- 註冊 pack 題目。
- 註冊通過 QA 的 AI cache。
- 建立 `id -> question` index。
- 建立 `skillKey -> questions` index。
- 建立 competency / domain / subject index。
- 提供來源統計。
- 不負責抽題權重。

### 6.2 來源分類

Provider 可使用：

- `local-core`
- `local-pack`
- `ai-cache`

Registry 可看見官方題，但官方題必須標為不可進 variant pool。

---

## 7. Question Provider API

建議介面：

```js
createQuestionProvider({ registry, aiGenerator, similarityPolicy })
```

公開方法：

### 7.1 getPracticeSet

```js
getPracticeSet(criteria, context)
```

負責一般短練習。

### 7.2 getReviewQuestion

```js
getReviewQuestion(reviewItem, context)
```

依 review stage 決定：

- Anchor 原題
- Same Skill
- Near Transfer
- Delayed Transfer

### 7.3 getReviewSession

```js
getReviewSession(reviewItems, context)
```

建立一批錯題複習，避免同一 session 內 variant 重複。

### 7.4 getCandidates

```js
getCandidates(skillTarget, context)
```

供 provider 內部或 diagnostics 使用。

### 7.5 registerGeneratedQuestions

```js
registerGeneratedQuestions(questions)
```

AI 通過 QA 後寫入 runtime registry 與 existing cache。

### 7.6 getStats

提供：

- pack count
- local question count
- AI cache count
- per subject count
- per competency count
- rejected duplicate count

---

## 8. Selection Context

Provider 每次抽題都接收 context：

- `today`
- `recentIds`
- `recentFingerprints`
- `recentVariationForms`
- `answerHistory`
- `skills`
- `subjectWeights`
- `difficultyWindow`
- `excludeIds`
- `excludeFingerprints`
- `allowAi`
- `aiAllowance`

抽題防重複規則不得分散在 `app.js`。

---

## 9. 防重複策略

### 9.1 ID 冷卻

一般題：

- 最近 30 個 unique question IDs 禁止重出。

錯題原題：

- 第一次 Anchor review 例外。
- Anchor 完成後，原題進冷卻。
- 原錯題至少 14 天不得作為自動 review 題再次出現。

### 9.2 Fingerprint

新增純前端、可測試 fingerprint。

Fingerprint 基礎輸入：

- normalized question text
- passage
- table/material textual projection
- competency
- questionType

Normalization：

- lowercase（英文）
- 移除多餘空白
- 正規化全半形符號
- 移除非語義標點
- tokenization
- n-gram token set

### 9.3 Similarity

初版不使用 embedding。

使用：

- token Jaccard
- n-gram overlap
- metadata similarity

規則：

- similarity >= 0.85：禁止。
- 0.70 <= similarity < 0.85：
  - 如果 competency 相同且 questionType 相同，禁止。
- similarity < 0.70：可用。

這些門檻需集中在 `question-dedup.js` 常數，不可散落。

### 9.4 Variation Form 冷卻

同一 competency：

- 最近 3 題不得全部使用同一 `variationForm`。
- Provider 優先挑不同形式。

已有 Adaptive Learning 的 variation forms 可沿用：

英文：
- short article
- notice/email
- dialogue
- schedule/table
- chart with text
- real-life message

其他科依既有 `VARIATION_FORMS` 延伸。

---

## 10. 候選放寬順序

Review / practice 若候選不足，依固定順序：

1. 同 `skillKey`、難度 ±1、新 ID、新 fingerprint。
2. 同 `competency`、不同 `subSkill`。
3. 同 domain 的相鄰能力。
4. 通過 QA 的 AI cache。
5. 即時 AI 生成。
6. 冷卻已結束的舊題。

不得直接從 1 跳回原錯題。

---

## 11. 錯題資料模型 V2

現有：

```js
{
  questionId,
  mastery,
  wrongCount,
  resolved,
  nextReview,
  lastReviewed
}
```

升級後增加：

```js
{
  skillKey,
  subject,
  domain,
  competency,
  subSkill,
  difficulty,
  originalReviewCount,
  reviewStage,
  variantHistory,
  passedFingerprints
}
```

其中：

### originalReviewCount

- 初始 0。
- 第一次 Anchor review 完成後變 1。
- 自動 review 不再增加。

### reviewStage

- `anchor`
- `same-skill`
- `near-transfer`
- `delayed-transfer`
- `resolved`

### variantHistory

每次複習記錄：

```js
{
  questionId,
  fingerprint,
  variationForm,
  correct,
  date,
  sourceKind
}
```

保留合理上限，例如最近 20 筆。

### passedFingerprints

只記通過驗證的新 fingerprint；避免同題不同 ID 被計算成不同 mastery 證據。

---

## 12. Review Stage 規則

### Stage 0: Anchor

條件：

- `originalReviewCount === 0`

題目：

- 原 questionId。

不論答對或答錯：

- `originalReviewCount = 1`
- 原題自此不得再作為自動 review 題。
- stage -> `same-skill`

若答對：

- nextReview -> +3 days
- 不可直接 resolved。

若答錯：

- nextReview -> +1 day
- 提高 adaptive priority。
- 下一次仍必須使用 Same Skill 新題，不可再次出原題。

### Stage 1: Same Skill

題目：

- 同 skillKey
- 不同 questionId
- 不同 fingerprint

答對：

- 記入 passed fingerprint
- stage -> `near-transfer`
- nextReview -> +7 days

答錯：

- stage 保持 `same-skill`
- nextReview -> +1 day
- 提高 adaptive priority

### Stage 2: Near Transfer

題目：

- 同 competency
- 不同 subSkill 或 variation form

答對：

- stage -> `delayed-transfer`
- nextReview -> +14 days

答錯：

- stage -> `same-skill`
- nextReview -> +1 day

### Stage 3: Delayed Transfer

題目：

- 再次不同 fingerprint
- 可難度 ±1
- 優先不同 variation form

答對且滿足 resolved gate：

- stage -> `resolved`
- nextReview -> +30 days（可作 maintenance reference）
- resolved = true

答錯：

- stage -> `same-skill`
- nextReview -> +1 day

---

## 13. Resolved Gate

錯題 resolved 必須同時滿足：

1. Anchor 已作答一次，不要求 Anchor 本身一定答對。
2. 至少 3 個不同 fingerprint 答對。
3. 至少 2 個答對 fingerprint 非原題。
4. 至少通過 Same Skill 與 Near Transfer。
5. 最後一次 Delayed Transfer 正確。

同一原題答對多次不得滿足 Gate。

---

## 14. 與 Adaptive Mastery 的關係

錯題 review 與 Adaptive Learning 保持一致，但概念分開：

- `wrongQuestions.reviewStage`：控制錯題複習內容與間隔。
- `adaptiveSkills.mastery`：表示核心能力長期熟練度。

變形題作答必須照常呼叫 `recordAdaptiveAttempt()`。

Review 題：

- `sourceKind = review`
- 仍更新 mastery
- 仍更新 answerHistory
- 仍影響 skill priority

原 Anchor 答對的 mastery 增益應低於不同 fingerprint 的 transfer 題，避免背題造成過度提升。

實作時可在 `masteryDelta()` 新增 review evidence multiplier，或透過 attempt metadata 傳入 `reviewEvidenceKind`。

---

## 15. AI 變形題生成規則

AI prompt / brief 必須包含：

- subject
- domain
- competency
- subSkill
- target difficulty
- target variation form
- 最近 variation forms
- 最近 avoid questions
- original skill summary
- student error reason（如有）

不得要求「把這一題換個名字」。

要求：

- 新素材
- 新數字／人物／情境
- 新問法
- 同核心能力
- 不洩漏答案
- 保持會考式題型

---

## 16. AI QA Gate

AI generated question 只有全部通過才能進 cache：

1. `validateQuestion()`
2. choices / answer validity
3. subject / competency metadata consistency
4. fingerprint duplicate gate
5. recent ID duplicate gate
6. recent variation diversity gate
7. obvious answer leakage check
8. generated ID unique

未通過：

- 丟棄。
- 不計入可用 cache。
- 不取代現有 session 題目。

---

## 17. AI Failure

若即時 AI：

- timeout
- API error
- schema invalid
- QA reject
- quota exhausted

Provider 必須：

1. 優先退回本地近能力題。
2. 再退到已驗證 AI cache。
3. 最後才用冷卻已過舊題。

不得：

- 顯示空白題。
- 無限重試 AI。
- 回到原錯題循環。

若完全沒有候選：

顯示：

「這個能力目前沒有足夠的新題，先練習其他弱點；系統會保留這筆複習。」

review item 不得被標 resolved。

---

## 18. 題庫載入

現有 `boot()`：

```js
const bankUrls = [
  questions.json,
  cap-practice.json
]
```

改為：

1. fetch `data/packs/manifest.json`
2. validate manifest
3. fetch enabled packs
4. inject pack metadata
5. create registry
6. create provider
7. register AI cache
8. 建立 questionMap 供現有 UI / official flows 使用

單一 pack 載入失敗：

- core pack 失敗：boot fail。
- optional pack 失敗：記 warning，其他 pack 繼續。
- manifest 無法載入：boot fail。

---

## 19. Storage 相容

維持：

`jhsee.adventure.v1`

不更換 key。

原因：

- 避免既有資料失聯。
- V2 review fields 可 lazy migrate。
- state version 暫不升級，除非實作時發現 backup schema 無法兼容。

### Lazy migration

若 wrong item 缺 V2 欄位：

使用 questionMap 補：

- skillKey
- subject
- domain
- competency
- subSkill
- difficulty

並設定：

- originalReviewCount = 0
- reviewStage = anchor
- variantHistory = []
- passedFingerprints = []

如果原題已不存在：

- 保留舊 item。
- 標記 unavailable。
- 不刪除紀錄。

---

## 20. Backup 相容

既有 `jhsee-backup-v1` 必須仍可匯入。

匯入後：

- lazy migrate wrongQuestions
- AI generated cache 重新註冊
- provider indexes 重建

匯出仍輸出完整 state。

---

## 21. app.js 責任收斂

下列邏輯應從 `app.js` 移出：

- local + AI pool 拼接
- review variant candidate selection
- recent duplicate filtering
- fallback ladder

`app.js` 只負責：

- 取得 UI filter
- 呼叫 provider
- 建立 session
- 儲存結果
- route / event wiring

---

## 22. 一般練習整合

目前 `practiceSelection()`：

- bank.filter
- generated cache filter
- reservoir
- recent IDs
- adaptive pick

V2 改成 provider：

```js
provider.getPracticeSet({
  subject,
  grade,
  questionType,
  examAligned
}, context)
```

Adaptive weighting 保留；Provider 可呼叫現有 `buildAdaptivePractice()`。

---

## 23. 錯題單題整合

目前：

```js
startRevenge(questionId)
```

V2：

```js
await startRevenge(reviewItemId)
```

流程：

1. 找 review item。
2. provider.getReviewQuestion(reviewItem, context)。
3. 如果需要 AI，await provider 產生。
4. startSession([question], { kind:'review', reviewItemId, ... })。
5. 交卷後依 review evidence 更新 review stage。

---

## 24. 錯題連續複習整合

目前：

- 全部 wrongItems 映回原 questionMap。

V2：

- 每個 item 各自向 Provider 取得對應 stage 題。
- 同 session 不可重複 fingerprint。
- 同一 competency 的 variation form 要輪替。
- 如果某 item 暫時找不到新題，可略過該 item，但保留 review schedule。

---

## 25. 官方題整合

官方題：

- 繼續存在 questionMap。
- 可被 `recordWrong()` 建立 review item。
- 第一次 Anchor 可以是官方原題。
- 第二次之後 Provider 不得以官方題作為 variant candidate。
- 必須改由 local/AI 同能力題驗證。

因此官方錯題也可以避免「一直做同一張歷屆題」。

---

## 26. 題庫管理與 CI

新增 pack validation script / tests：

檢查：

- manifest schema
- pack id unique
- question id unique across packs
- required fields
- sourceKind valid
- pack metadata 注入
- subject coverage
- competency metadata
- fingerprint generation
- high-similarity duplicates report

高相似度可分：

- hard fail：>= 0.95
- warning：0.85–0.95

具體 fail threshold 可在 implementation plan 中依現有題庫實測後固定，但 runtime selection threshold 仍依第 9 節。

---

## 27. 大題庫效能

目標至少支援 5000 題，不需 O(n²) 每次抽題。

Registry 建立 index：

- subject
- skillKey
- competency
- domain
- difficulty
- sourceKind

Fingerprint duplicate comparison：

- runtime 只和最近 fingerprints + candidate shortlist 比。
- build-time 全題庫 duplicate scan 可使用 bucket / token signature，避免暴力全配對。

---

## 28. UI 變更

錯題頁可增加簡短標示：

- 原題確認
- 同能力新題
- 近遷移
- 延遲驗證

避免使用者覺得「怎麼錯題不是原本那題」。

例如：

「這次改用同能力新題，確認你是真的掌握，不是記住答案。」

不需要新增複雜設定。

---

## 29. 非目標

本版本不做：

- embedding / vector DB
- cloud user account
- server-side persistent question warehouse
- 自動下載網路第三方題庫
- 官方題 AI 改寫
- 大型後台 CMS
- 無限 AI 生成
- 跨三個 JHSEE 專案共享 LocalStorage

---

## 30. 測試需求

### 30.1 Question Pack

- manifest 載入。
- 多 pack 合併。
- 500+ 題載入。
- duplicate IDs reject。
- optional pack failure 不阻塞 core。

### 30.2 Fingerprint

- 相同題文同 fingerprint。
- 換空白／標點不應繞過 duplicate。
- 純換人名但句型高度相似需高 similarity。
- 完全不同情境需低 similarity。

### 30.3 Review

- 第一次複習允許原題且只能出現一次。
- Anchor 不論答對或答錯，第二次都不得出原 questionId。
- 第二次不得出相同 fingerprint。
- Same Skill 正確後進 Near Transfer。
- Near Transfer 正確後進 Delayed Transfer。
- Delayed Transfer 正確且通過 gate 才 resolved。
- variant 答錯回 Same Skill。
- 原題答對多次不能 resolved。

### 30.4 Provider Fallback

- local same skill 有題時不呼叫 AI。
- local near skill 足夠時不呼叫 AI。
- local 不足才用 AI cache。
- cache 不足且 quota 可用才即時 AI。
- AI failure fallback local old cooled question。
- 無候選不刪 review item。

### 30.5 Diversity

- 最近 30 IDs 不重出。
- similarity >= .85 blocked。
- same competency + same type 在 .70-.85 blocked。
- 最近 3 variation forms 不全相同。

### 30.6 Compatibility

- 舊 wrongQuestions lazy migrate。
- 舊 backup 可匯入。
- EXP / reports / mock records 不變。
- official report flows 不變。
- AI cache 可重新註冊。
- 現有全部 tests 維持通過。

---

## 31. Success Criteria

此版本完成後：

1. 使用者錯題第一次複習可看到原題一次。
2. 第二次開始不再一直看到同一題。
3. 錯題掌握必須經過不同 fingerprint 的能力驗證。
4. 一般練習的重複率顯著降低。
5. 題庫來源可以透過 manifest 擴充，不需修改 app.js。
6. AI 只在本地題不足時介入。
7. AI 近重複題無法進入可用 cache。
8. 既有使用者資料與官方題流程不受破壞。
9. 題庫可擴充至數千題而維持合理抽題效能。
10. 既有 CI 全綠並新增 Provider / Review V2 regression suite。

---

## 32. Review Focus

書面 review 請特別確認：

- 第一次 Anchor 原題、之後變形題的規則是否符合產品意圖。
- Resolved Gate 是否足以防止背答案假熟練。
- Provider fallback 順序是否正確。
- AI 是否確實為本地不足才補。
- 官方題是否正確隔離。
- LocalStorage / backup 相容性是否足夠保守。
- Manifest + Registry 是否能支援未來大量題庫。
