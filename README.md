# JHSEE Adventure｜116 會考大冒險

手機優先的全科 RPG 會考學習平台，整合五科關卡、戰鬥答題、Boss、EXP、Combo、每日任務、錯題復仇、能力分析與快速模考。

## V1 功能

- 國文、英文、數學、自然、社會五個世界
- 5 題普通關卡與 10 題 Boss 挑戰
- HP、Combo、EXP、等級、金幣與星級
- 每日任務、10 題 Streak 門檻及每日寶箱
- 錯題熟練度與間隔複習日期
- 跨科快速模考；交卷前不顯示答案
- LocalStorage 自動存檔，無須登入

所有 V1 題目均標示為平台原創模擬題，模擬結果不是官方會考等級。

## 本機執行

```bash
npm install
npm run serve
```

## 驗證與建置

```bash
npm test
npm run build
```

推送到 `main` 後，GitHub Actions 會先執行測試與建置，再部署 GitHub Pages。
