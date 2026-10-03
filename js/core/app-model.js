import { SUBJECT_ORDER } from '../config/subjects.js';

const LEVEL_CHAPTERS = {
  chinese: ['字詞森林', '文言古城', '閱讀聖殿'],
  english: ['Vocabulary Bay', 'Grammar Ridge', 'Reading Sky'],
  math: ['基礎森林', '代數城', '幾何山'],
  science: ['生命雨林', '理化工坊', '地科觀測站'],
  social: ['歷史古道', '地理航線', '公民議會']
};

// Reviewed original CAP-style units available to each adventure stage.
const LEVEL_REVIEWED_CHAPTERS = {
  chinese: [
    ['字音字形與詞語', '語文運用'],
    ['文言文閱讀'],
    ['白話文閱讀', '跨文本與論證', '資料閱讀', '生活文本', '文學閱讀']
  ],
  english: [
    ['字彙與片語'],
    ['基本文法', '克漏字'],
    ['閱讀理解', '圖表與生活情境']
  ],
  math: [
    ['數與數線', '數與比例', '統計與機率'],
    ['代數與方程式', '函數'],
    ['幾何與圖形']
  ],
  science: [
    ['生物', '科學探究與資料判讀'],
    ['化學', '物理'],
    ['地球科學']
  ],
  social: [
    ['臺灣與世界歷史'],
    ['地理環境與區域'],
    ['公民與社會', '公共議題思辨', '圖表與資料判讀']
  ]
};

export function taipeiDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now);
}

export function daysUntil(targetDate, now = new Date()) {
  const current = taipeiDate(now);
  const start = Date.parse(`${current}T00:00:00Z`);
  const target = Date.parse(`${targetDate}T00:00:00Z`);
  return Math.max(0, Math.ceil((target - start) / 86_400_000));
}

function pickFreshAdventureQuestions(pool,count,rng,history){
  const shuffled=[...new Map(pool.map(q=>[q.id,q])).values()];
  for(let index=shuffled.length-1;index>0;index--){
    const swap=Math.floor(rng()*(index+1));
    [shuffled[index],shuffled[swap]]=[shuffled[swap],shuffled[index]];
  }
  const lastSeen=new Map();
  history.forEach((entry,index)=>{if(entry.questionId)lastSeen.set(entry.questionId,index);});
  const fresh=shuffled.filter(q=>!lastSeen.has(q.id));
  const seen=shuffled.filter(q=>lastSeen.has(q.id)).sort((a,b)=>lastSeen.get(a.id)-lastSeen.get(b.id));
  return [...fresh,...seen].slice(0,count);
}

export function makeBossQuestions(bank, subject, count = 10, rng = Math.random, history = []) {
  const pool=bank.all?bank.all().filter(q=>q.subject===subject):bank.pick({subject},count,rng);
  return pickFreshAdventureQuestions(pool,count,rng,history);
}

export function levelQuestionPool(bank, subject, levelNumber) {
  const index = Number(levelNumber) - 1;
  const chapter = LEVEL_CHAPTERS[subject]?.[index];
  const reviewedLevels=LEVEL_REVIEWED_CHAPTERS[subject]??[];
  return (bank.all?.() ?? []).filter(question=>{
    if(question.subject!==subject)return false;
    if(!chapter)return true;
    const legacyLevel=LEVEL_CHAPTERS[subject].indexOf(question.chapter);
    if(legacyLevel>=0)return legacyLevel===index;
    if(question.examAligned!==true||question.reviewStatus!=='reviewed')return false;
    const chapterLevel=reviewedLevels.findIndex(units=>units.includes(question.chapter));
    return chapterLevel>=0?chapterLevel===index:(reviewedLevels[index]??[]).includes(question.domain);
  });
}

export function pickLevelQuestions(bank, subject, levelNumber, count = 5, rng = Math.random, history = []) {
  const pool = levelQuestionPool(bank, subject, levelNumber);
  return pickFreshAdventureQuestions(pool.length?pool:bank.pick({subject},count,rng),count,rng,history);
}

export function pickQuickExam(bank, perSubject = 2, rng = Math.random) {
  return SUBJECT_ORDER.flatMap((subject) => bank.pick({ subject }, perSubject, rng));
}
