export const KB_ADMISSION_RULE={
  version:'115-reference',
  label:'115 學年度基北區免試入學參考規則',
  status:'reference-for-116',
  examMax:36,
  totalMax:108,
  subjectPoints:{'A++':7,'A+':6,'A':5,'B++':4,'B+':3,'B':2,'C':1},
  writingPoints:{6:1,5:0.8,4:0.6,3:0.4,2:0.2,1:0.1},
  tieBreakSubjectOrder:['chinese','math','english','social','science'],
  sourceUrl:'https://ttk.entry.edu.tw/NoExamImitate_TP/NoExamImitate/Apps/Page/Public/News.aspx?SEQNO=9',
  note:'116 學年度正式簡章尚需以當年度公告為準；本頁先使用 115 基北區規則作規劃參考。'
};

export const KB_PLACEMENT_SOURCE={
  version:'115-public-reference',
  label:'115 公開落點參考區間',
  sourceUrl:'https://blog.ehanlin.com.tw/score-of-junior-high-school-students-exam',
  note:'落點區間為公開整理資料，不是官方錄取保證；每年會受題目難度、招生名額、志願分布與超額比序影響。'
};

export const SUBJECT_ERROR_TOLERANCE={
  chinese:{
    total:'42 題單選',
    A:'錯 6～7 題內',
    'A+':'錯 4～5 題內',
    'A++':'錯 0～2 題內',
    keyPoint:'單科比序第 1 順位；文言文斷句主詞切換、白話雙文本細節比對'
  },
  math:{
    total:'選擇 25 題 (85%)＋非選 2 題 (15%)',
    A:'選擇錯 4 題內＋非選 4 分（加權約 76+）',
    'A+':'選擇錯 2 題內＋非選 5 分（加權約 85+）',
    'A++':'選擇錯 0～1 題＋非選 5～6 分（加權約 93+）',
    keyPoint:'單科比序第 2 順位；幾何三心與相似形複合題、非選第 2 題證明'
  },
  english:{
    total:'閱讀 43 題 (80%)＋聽力 21 題 (20%)',
    A:'聽力錯 2 題內、閱讀錯 4～5 題內（加權約 90+）',
    'A+':'聽力全對、閱讀錯 2～3 題內（加權約 95+）',
    'A++':'聽力全對、閱讀錯 0～1 題內（加權約 98+）',
    keyPoint:'單科比序第 3 順位；題組後段長文推論、時態與子句混合題'
  },
  social:{
    total:'54 題單選',
    A:'錯 6～8 題內',
    'A+':'錯 4～5 題內',
    'A++':'錯 0～3 題內',
    keyPoint:'單科比序第 4 順位；跨歷地公題組、陌生史料與氣候統計圖表轉譯'
  },
  science:{
    total:'50 題單選',
    A:'錯 6～7 題內',
    'A+':'錯 4～5 題內',
    'A++':'錯 0～2 題內',
    keyPoint:'單科比序第 5 順位；實驗變因設計、理化浮力電功率與地科立體空間'
  }
};

export const HSNU_MALE_STRATEGIES=[
  {
    id:'safe-336',
    title:'穩取安全線（33.6 分｜5A8+）',
    badge:'免比單科順位',
    combo:'3 科 A++ ＋ 2 科 A+ ＋ 寫作 4 級分（0.6 分）',
    desc:'即使寫作維持 4 級分，只要五科拿到 5A 且累積 8 個「+」（33 分），總分 33.6 分即可穩取師大附中男生名額。'
  },
  {
    id:'match-328',
    title:'常態錄取線（32.8 分｜5A7+）',
    badge:'主力達標配方',
    combo:'2 科 A++ ＋ 3 科 A+（或 3A++ 1A+ 1A）＋ 寫作 5 級分（0.8 分）',
    desc:'五科拿 32 分（5A7+）搭配寫作 5 級分（0.8 分）達 32.8 分，直接跨過 32.6 分同分比序群。'
  },
  {
    id:'tiebreak-326',
    title:'壓線決戰線（32.6 分｜5A7+ 同分比序）',
    badge:'國數 A++ 決勝',
    combo:'5A7+（32 分）＋ 寫作 4 級分（0.6 分）',
    desc:'32.6 分常進入附中男生最後名額同分超額比序，依序比「國文 → 數學 → 英語 → 社會 → 自然」，國文與數學衝上 A++ 最具優勢。'
  }
];

export const KB_SCHOOLS=[
  {id:'jianguo',name:'建國中學',region:'臺北市',gender:'male',low:34.6,high:34.8},
  {id:'beiyi',name:'北一女中',region:'臺北市',gender:'female',low:33.8,high:33.8},
  {id:'hsnu-m',name:'師大附中（男）',region:'臺北市',gender:'male',low:32.8,high:33.8},
  {id:'hsnu-f',name:'師大附中（女）',region:'臺北市',gender:'female',low:32.8,high:33.6},
  {id:'chenggong',name:'成功高中',region:'臺北市',gender:'male',low:31.6,high:32.6},
  {id:'zhongshan',name:'中山女中',region:'臺北市',gender:'female',low:30.8,high:31.8},
  {id:'songshan-m',name:'松山高中（男）',region:'臺北市',gender:'male',low:30.6,high:31.6},
  {id:'songshan-f',name:'松山高中（女）',region:'臺北市',gender:'female',low:29.8,high:30.6},
  {id:'datong',name:'大同高中',region:'臺北市',gender:'all',low:29.6,high:30.6},
  {id:'zhonglun',name:'中崙高中',region:'臺北市',gender:'all',low:28.8,high:29.6},
  {id:'nccu',name:'政大附中',region:'臺北市',gender:'all',low:27.8,high:28.8},
  {id:'banqiao',name:'板橋高中',region:'新北市',gender:'all',low:27.8,high:28.8},
  {id:'lishan',name:'麗山高中',region:'臺北市',gender:'all',low:27.8,high:28.6},
  {id:'chengyuan',name:'成淵高中',region:'臺北市',gender:'all',low:26.8,high:28.6},
  {id:'dazhi',name:'大直高中',region:'臺北市',gender:'all',low:26.8,high:27.8},
  {id:'heping',name:'和平高中',region:'臺北市',gender:'all',low:26.6,high:27.6},
  {id:'haishan',name:'海山高中',region:'新北市',gender:'all',low:26.6,high:26.8},
  {id:'xixong',name:'西松高中',region:'臺北市',gender:'all',low:25.6,high:26.6},
  {id:'beida',name:'北大高中',region:'新北市',gender:'all',low:24.8,high:25.8},
  {id:'minglun',name:'明倫高中',region:'臺北市',gender:'all',low:24.8,high:25.6},
  {id:'neihu-m',name:'內湖高中（男）',region:'臺北市',gender:'male',low:24.6,high:25.6},
  {id:'neihu-f',name:'內湖高中（女）',region:'臺北市',gender:'female',low:24.6,high:24.8},
  {id:'zhongzheng',name:'中正高中',region:'臺北市',gender:'all',low:23.6,high:24.6},
  {id:'bailing',name:'百齡高中',region:'臺北市',gender:'all',low:23.6,high:24.6},
  {id:'jingmei',name:'景美女中',region:'臺北市',gender:'female',low:22.6,high:22.8},
  {id:'zhonghe',name:'中和高中',region:'新北市',gender:'all',low:22.4,high:22.6},
  {id:'nanhu',name:'南湖高中',region:'臺北市',gender:'all',low:21.8,high:22.6},
  {id:'xinzhuang',name:'新莊高中',region:'新北市',gender:'all',low:21.6,high:21.8},
  {id:'yongping',name:'永平高中',region:'新北市',gender:'all',low:20.6,high:21.6},
  {id:'nangang',name:'南港高中',region:'臺北市',gender:'all',low:20.6,high:20.8},
  {id:'huajiang',name:'華江高中',region:'臺北市',gender:'all',low:19.6,high:20.8},
  {id:'danfeng',name:'丹鳳高中',region:'新北市',gender:'all',low:19.6,high:20.4},
  {id:'yongchun',name:'永春高中',region:'臺北市',gender:'all',low:19.6,high:19.8},
  {id:'newtaipei',name:'新北高中',region:'新北市',gender:'all',low:18.6,high:19.6},
  {id:'huaqiao',name:'華僑高中',region:'新北市',gender:'all',low:17.8,high:19.6},
  {id:'xindian',name:'新店高中',region:'新北市',gender:'all',low:17.8,high:18.8},
  {id:'jinhe',name:'錦和高中',region:'新北市',gender:'all',low:17.6,high:18.6},
  {id:'sanmin',name:'三民高中',region:'新北市',gender:'all',low:17.6,high:18.6},
  {id:'wanfang',name:'萬芳高中',region:'臺北市',gender:'all',low:16.8,high:17.8},
  {id:'guangfu',name:'光復高中',region:'臺北市',gender:'all',low:16.6,high:17.6},
  {id:'sanchong',name:'三重高中',region:'新北市',gender:'all',low:16.6,high:17.6},
  {id:'dali',name:'大理高中',region:'臺北市',gender:'all',low:16.8,high:17.6},
  {id:'yucheng',name:'育成高中',region:'臺北市',gender:'all',low:15.6,high:16.6},
  {id:'qingshui',name:'清水高中',region:'新北市',gender:'all',low:13.6,high:16.6},
  {id:'linkou',name:'林口高中',region:'新北市',gender:'all',low:14.6,high:14.6},
  {id:'shulin',name:'樹林高中',region:'新北市',gender:'all',low:13.6,high:15.4},
  {id:'ankang',name:'安康高中',region:'新北市',gender:'all',low:13.6,high:15.6},
  {id:'taishan',name:'泰山高中',region:'新北市',gender:'all',low:12.6,high:13.6},
  {id:'xiufeng',name:'秀峰高中',region:'新北市',gender:'all',low:11.6,high:13.6},
  {id:'mingde',name:'明德高中',region:'新北市',gender:'all',low:11.6,high:13.6},
  {id:'shiding',name:'石碇高中',region:'新北市',gender:'all',low:10.4,high:13.6}
];
