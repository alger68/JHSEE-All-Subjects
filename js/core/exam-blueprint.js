// 會考導向分類：題目使用自製原創內容，與歷屆原題分開管理。
export const EXAM_BLUEPRINT = {
  chinese: { label: '國文', domains: ['字音字形與詞語', '語文常識', '文言文閱讀', '白話文閱讀', '跨文本與論證'], types: ['字詞辨識', '語句判讀', '文意理解', '主旨推論', '觀點分析'] },
  english: { label: '英文', domains: ['字彙與片語', '基本文法', '克漏字', '閱讀理解', '圖表與生活情境', '聽力理解'], types: ['字彙題', '文法題', '克漏字', '細節理解', '推論題'] },
  math: { label: '數學', domains: ['數與數線', '代數與方程式', '函數', '幾何與圖形', '統計與機率', '生活應用與非選'], types: ['概念題', '計算題', '圖表判讀', '情境應用', '推理題'] },
  science: { label: '自然', domains: ['生物', '物理', '化學', '地球科學', '科學探究與資料判讀'], types: ['概念理解', '實驗判讀', '資料分析', '因果推理', '跨科整合'] },
  social: { label: '社會', domains: ['臺灣與世界歷史', '地理環境與區域', '公民與社會', '圖表與資料判讀', '公共議題思辨'], types: ['史料判讀', '地圖判讀', '制度理解', '資料分析', '情境思辨'] }
};

export function classifyQuestion(question) {
  if (!EXAM_BLUEPRINT[question.subject]) return { ...question, examAligned: false };
  const tags = question.tags ?? [];
  const type = question.questionType ?? (tags.some((tag) => ['閱讀', '推論', '主旨', '文意理解'].includes(tag)) ? '閱讀理解' : tags.some((tag) => ['生活應用', '統計', '比例', '函數'].includes(tag)) ? '情境應用' : '概念理解');
  const competency = question.competency ?? (tags.some((tag) => ['閱讀', '推論', '主旨', '文意理解', '論證'].includes(tag)) ? '閱讀理解與推論' : tags.some((tag) => ['生活應用', '統計', '比例', '函數'].includes(tag)) ? '情境轉化與解題' : '核心概念理解');
  return { ...question, examAligned: true, examProfile: { domain: question.domain ?? question.chapter, type, competency } };
}
