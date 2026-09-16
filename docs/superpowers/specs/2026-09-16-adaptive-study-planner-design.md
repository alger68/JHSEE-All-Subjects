# Adaptive Study Planner 自適應讀書計畫 V1 設計規格

日期：2026-09-16
專案：JHSEE-All-Subjects
父規格：`docs/superpowers/specs/2026-09-16-jhsee-all-subjects-v1-design.md`

## 1. 目的

在既有全科會考模擬平台上加入「模考診斷 → 每日任務 → 錯題間隔複習 → 每週 Mini Mock → 趨勢分析 → 下一輪調整」的學習閉環，使平台不只是考試工具，而是每天可執行的備考系統。

第一版以 115 學年度第一次模擬考成績作為可輸入的診斷資料範例，但所有規則都必須泛化到任意學生、任意模考與任意科目組合，不把單一學生資料硬編碼在程式中。

## 2. 核心原則

1. 模考成績只作為起始診斷，不直接等同正式會考落點。
2. 系統以弱點優先，但不允許其他科目完全停止複習。
3. 每日任務必須可在 60～90 分鐘內完成，預設可由使用者調整可用時間。
4. 學習控制指標使用正確率、錯題率、熟練度與趨勢，不把平台估值冒充官方 A/B 等級。
5. 間隔複習必須依實際答題結果動態更新，不只做靜態收藏。
6. 所有規則要透明、可解釋、可測試，避免黑箱式「AI 建議」。
7. V1 不需要雲端帳號；資料沿用 LocalStorage。

## 3. 新首頁優先順序

首頁主入口改為：

1. 今日學習
2. 全真模擬
3. 單科模擬
4. 單元練習
5. 錯題複習
6. 成績與趨勢
7. 歷屆官方題

首頁至少顯示：
- 今日預估學習時間
- 今日任務完成度
- 到期錯題數
- 目前主要弱點 1～3 項
- 最近四週 Mini Mock 趨勢
- 下一次模考日期（若使用者有設定）

## 4. 診斷資料輸入

V1 支援手動輸入一次或多次模考結果。

每次紀錄：

```json
{
  "id": "mock-2026-09-01",
  "date": "2026-09-01",
  "label": "第一次模擬考",
  "scope": "1-2冊為主",
  "subjects": {
    "chinese": { "grade": "A" },
    "english": { "grade": "B" },
    "math": { "grade": "A" },
    "social": { "grade": "A" },
    "science": { "grade": "A" }
  }
}
```

若只有 A/B 等級而沒有原始答題明細，系統只能用它決定「科目優先級」，不能細分到文法、閱讀、代數等子領域。子領域弱點必須由平台實際作答紀錄累積。

## 5. 科目優先級模型

V1 採規則式權重，不使用 AI。

### 5.1 初始權重

若使用者只提供模考等級：
- C：高優先
- B：中高優先
- A：維持優先

預設時間分配上限：
- 最弱科：35～45%
- 次弱科：20～30%
- 其他科：各至少 8～12%

任何一科連續兩週沒有練習時，系統必須強制加入維持任務。

### 5.2 動態調整

平台有實際答題資料後，每科 priority score 由下列因素組成：

```text
priority = 0.40 * weakness + 0.25 * overdue + 0.20 * recentTrend + 0.15 * examWeight
```

其中：
- `weakness`：近 30 天正確率反向值，資料不足時回退到模考等級權重。
- `overdue`：到期錯題與久未複習單元比例。
- `recentTrend`：近四次練習是否惡化；改善中的科目不完全移除。
- `examWeight`：使用者可標記近期考試範圍，近期範圍提高權重。

所有值正規化至 0～1。

## 6. 今日任務產生器

輸入：
- 可用時間（預設 75 分鐘）
- 各科 priority score
- 到期錯題
- 近期學校進度
- 近 7 天已完成任務
- 題庫可用量

輸出：一組有明確時間預算的 task list。

### 6.1 任務類型

- `review-due`：到期錯題
- `weakness-drill`：弱點專項
- `maintenance`：強科維持
- `current-school`：目前學校進度
- `mini-reading` / `mini-listening`：英語固定小任務
- `mini-mock`：週測

### 6.2 預設每日結構

以 75 分鐘為例：
- 15 分鐘：到期錯題
- 25～30 分鐘：最弱科
- 15 分鐘：次弱/輪替科
- 15～20 分鐘：目前學校進度

若當天到期錯題很多，可暫時提高錯題比重，但不得吃掉全部維持任務。

## 7. 題目抽取比例

一般弱點練習預設：
- 60% 弱點題
- 30% 正常範圍題
- 10% 挑戰題

若題庫不足，依序回退到同科同年級其他題目，不跨科補題。

抽題不得只根據單次錯誤；子領域至少累積 5 題作答後才可正式標記為「弱點」，否則顯示「資料不足」。

## 8. 英文專項升級路線

英文支援以下子領域：
- vocabulary
- grammar
- cloze
- reading
- listening

熟練度階段：

1. Diagnose：至少完成各子領域基準題
2. Stabilize：弱項近 20 題正確率 ≥ 75%
3. Mixed：混合題近 30 題正確率 ≥ 80%
4. Timed：限時題近 30 題正確率 ≥ 80%
5. Mock-ready：連續 3 次 Mini Mock 英文部分達目標區間

這些門檻是平台學習控制指標，不對外標示為官方 A/B 等級換算。

## 9. 錯題間隔複習

V1 使用固定階段排程，加上答題結果回退機制。

初次答錯後：
- 第 0 天：看解析並標記原因
- +1 天：第一次重做
- +3 天：第二次重做
- +7 天：第三次重做
- +14 天：第四次重做

答對：進入下一階段。
答錯：回到 +1 天階段，`lapseCount += 1`。
連續完成最後階段後標記 `mastered`，但 30 天後可再進入抽樣維持題。

錯題紀錄：

```json
{
  "questionId": "mock-eng-001",
  "firstWrongAt": "2026-09-16",
  "stage": 2,
  "nextReviewAt": "2026-09-19",
  "lapseCount": 1,
  "lastResult": "correct",
  "mastered": false
}
```

## 10. Mini Mock

每週預設一次，使用者可選週六或自訂。

建議 V1 預設 30 題：
- 國文 5
- 英文 10
- 數學 5
- 社會 5
- 自然 5

目標時間 30～45 分鐘。

Mini Mock 不取代正式單科模擬；用途是追蹤趨勢與重新估算 priority score。

## 11. 趨勢分析

Dashboard 顯示：
- 各科近 4 週正確率
- 子領域正確率
- 到期錯題完成率
- mastered 錯題數
- 平均每日完成分鐘
- 每週 Mini Mock 變化
- 最弱 3 個單元
- 改善最快 3 個單元

只有至少 2 次可比較紀錄時才顯示趨勢箭頭；資料不足時明確顯示「資料不足」。

## 12. 學校進度與模考範圍

使用者可設定：
- 目前學期
- 目前各科進度標籤
- 下一次模考日期
- 下一次模考範圍

近期考試範圍只提高任務權重，不覆蓋長期弱點複習。

## 13. LocalStorage 擴充

沿用 `jhsee.v1.*` namespace，新增：

```text
jhsee.v1.diagnostics
jhsee.v1.studySettings
jhsee.v1.dailyTasks
jhsee.v1.reviewSchedule
jhsee.v1.miniMocks
jhsee.v1.subjectMastery
```

`studySettings` 至少包含：
- dailyMinutes
- miniMockDay
- currentScopes
- nextMockDate
- nextMockScopes

## 14. 新增模組

建議新增：

```text
js/core/study-planner.js
js/core/mastery.js
js/core/spaced-review.js
js/core/diagnostics.js
js/ui/today.js
js/ui/study-settings.js
js/ui/progress.js
tests/study-planner.test.js
tests/mastery.test.js
tests/spaced-review.test.js
tests/diagnostics.test.js
```

責任：
- `diagnostics.js`：保存/解析模考診斷，只產出科目優先級基線。
- `mastery.js`：由作答紀錄計算科目與子領域熟練度。
- `spaced-review.js`：管理錯題 stage 與 nextReviewAt。
- `study-planner.js`：依時間預算、priority 與到期項目生成每日任務。
- `today.js`：今日任務 UI、完成狀態與開始按鈕。
- `study-settings.js`：讀書時間、模考日、範圍設定。
- `progress.js`：週趨勢與學習指標。

## 15. 錯誤與邊界條件

- 無診斷資料：以平均科目分配＋平台作答資料啟動。
- 無足夠子領域樣本：不標記弱點，只排一般練習。
- 當日時間少於 20 分鐘：優先到期錯題＋最弱科，其他維持延後至下一日。
- 題庫不足：降低任務題數並提示，不重複塞入相同題目。
- 使用者漏做一天：不把全部未完成任務無限累積，只保留到期錯題與高優先任務重新排程。
- LocalStorage 損壞：回退安全預設，不刪除可解析的其他 key。

## 16. 測試要求

至少覆蓋：
- A/B/C 模考等級轉初始 priority
- priority 正規化與最低維持比重
- 75 分鐘任務分配總時數不超標
- 20 分鐘短時段降級策略
- 60/30/10 抽題規則
- 子領域未滿 5 題不得標弱點
- +1/+3/+7/+14 錯題排程
- 答錯後 stage 回退
- mastered 後 30 天抽樣
- Mini Mock 結果更新趨勢
- 資料不足顯示規則

## 17. 驗收條件

1. 首頁第一入口為「今日學習」。
2. 能輸入模考五科等級並產生初始學習優先級。
3. 能依每日可用時間產生不超時的任務清單。
4. 弱科獲得較高比重，但其他科仍有維持任務。
5. 錯題可依 +1/+3/+7/+14 日排程自動再次出現。
6. 每週可執行一次 Mini Mock 並累積趨勢。
7. Dashboard 能顯示弱點、改善與資料不足狀態。
8. 所有學習指標明確標示為平台學習分析，不冒充官方會考等級或落點。

## 18. V1 不納入

- AI 自動決策或 AI 家教對話
- 自動讀取學校成績系統
- 推播通知服務
- 跨裝置同步
- 官方會考等級機率預測
- 自動高中落點推薦

這些功能可在後續版本評估，但不得阻礙 V1 每日學習閉環完成。