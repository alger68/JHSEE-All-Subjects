// 會考導向分類：題目使用自製原創內容，與歷屆原題分開管理。
export const EXAM_BLUEPRINT = {
  chinese: { label: '國文', domains: ['字音字形與詞語', '語文常識', '文言文閱讀', '白話文閱讀', '跨文本與論證'], types: ['字詞辨識', '語句判讀', '文意理解', '主旨推論', '觀點分析'] },
  english: { label: '英文', domains: ['字彙與片語', '基本文法', '克漏字', '閱讀理解', '圖表與生活情境', '聽力理解'], types: ['字彙題', '文法題', '克漏字', '細節理解', '推論題'] },
  math: { label: '數學', domains: ['數與數線', '代數與方程式', '函數', '幾何與圖形', '統計與機率', '生活應用與非選'], types: ['概念題', '計算題', '圖表判讀', '情境應用', '推理題'] },
  science: { label: '自然', domains: ['生物', '物理', '化學', '地球科學', '科學探究與資料判讀'], types: ['概念理解', '實驗判讀', '資料分析', '因果推理', '跨科整合'] },
  social: { label: '社會', domains: ['臺灣與世界歷史', '地理環境與區域', '公民與社會', '圖表與資料判讀', '公共議題思辨'], types: ['史料判讀', '地圖判讀', '制度理解', '資料分析', '情境思辨'] }
};

const UNCLASSIFIED_PROFILE = Object.freeze({ domain: '未分類', type: '未分類', competency: '未分類' });

export function classifyQuestion(question) {
  const hasReviewedMetadata = question?.examAligned === true
    && Boolean(EXAM_BLUEPRINT[question.subject])
    && [question.domain, question.questionType, question.competency, question.alignmentBasis]
      .every((value) => typeof value === 'string' && value.trim().length > 0)
    && question.reviewStatus === 'reviewed';
  if (!hasReviewedMetadata) {
    return { ...question, examAligned: false, examProfile: { ...UNCLASSIFIED_PROFILE } };
  }
  return {
    ...question,
    examAligned: true,
    examProfile: {
      domain: question.domain,
      type: question.questionType,
      competency: question.competency
    }
  };
}
