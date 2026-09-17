// Official source and final answer ruling verified 2026-09-17. Original-page images and question regions are available in the in-site reader.
const drive = (id) => `https://drive.google.com/file/d/${id}/view`;
export const OFFICIAL_SOURCE = 'https://cap.rcpet.edu.tw/exam/115/115exam.html';
export const OFFICIAL_ANSWER = drive('1fxfOLQPMdCEMSuziD1qsQZg3vVOGt8df');
const entries = [
  ['chinese','國文',42,70,4,'1FQtq4_a4GTsTKURdzPhDkKmONKRXtTJ9','BADADDCCCDBDABAADDABDCBBABBADDCACBCCCACCBB'],
  ['english','英語閱讀',43,60,4,'1pzRZpkZEBg4x7GNTAIrdfGJCxNSKgok-','BABCCDCACACADDAADBDCDDBDDCDCAABDCAABBCBBBBC'],
  ['listening','英語聽力',21,25,3,'1zRjsoyQhLRJfmmHtBJfi5qJa6ND1uVJ6','CCCBBCAAABBAABACBAABA'],
  ['math','數學',25,80,4,'1G-grfVw1NldMD3TRG-7Lco-yOuaoTKoK','CDCBCBACBDABDBCAABDCDCBBD'],
  ['social','社會',54,70,4,'1ITxBlFhNSIbg1u1C7FrU2ODk951wt-RT','ADCAADDBACCDCACABBABDCBBABAABABDACCCDDBABDBDCACBDACBBD'],
  ['science','自然',50,70,4,'1ZJNPG9Wz3zuI8UkPGUY50URejxxZYmQ8','ACBBCDBCCACDBCBAAADCDDCDBAACCABBBDCDBCDABDBCDCADDA'],
  ['writing','寫作測驗',0,50,0,'1NceEHPUXT0fZo6UgdCuSdGApQ4embM0t','']
];
export const OFFICIAL_PAPERS = entries.map(([key,title,count,durationMinutes,choiceCount,fileId,answerText]) => ({
  id: `cap115-${key}`, year:115, subject:key==='listening'?'english':key, section:key,
  title:`115 年會考・${title}`, count,durationMinutes,choiceCount,
  paperUrl:drive(fileId),answerUrl:OFFICIAL_ANSWER,sourceUrl:OFFICIAL_SOURCE,
  answers:[...answerText].map(a=>'ABCD'.indexOf(a)),manualCount:key==='math'?2:key==='writing'?1:0,
  reviewUrls:key==='math' ? [
    {label:'非選第 1 題評分指引與樣卷',url:drive('1_Zwk8LMTF5_KLubGcUm5YkK_5NJFSETk')},
    {label:'非選第 2 題評分指引與樣卷',url:drive('1pYr0Q3k9ESvqoQCiy0sHjHL4u_508eQO')}
  ] : key==='writing' ? [
    ['六','1MSG0LyS7baOyiQljRUhAnav11YCl81AB'],['五','1ouJumyoxquh1ATPkquwmK0xfeeJGyW28'],
    ['四','1Yf5EmXto6V2K--jZ4tfR8-hYzRMIQ3I9'],['三','1_GJZMfcChtvM_DQIXOPTb5f82ruEKTWn'],
    ['二','1mS81C5952AMQQOb3dr07YheaOJXdNQ6e'],['一','13GtEq6MJQantl8i8JeogplVjD6y67if9']
  ].map(([grade,id])=>({label:`${grade}級分官方樣卷`,url:drive(id)})) : []
}));
export function getOfficialQuestions(paper) {
  if (!paper) return [];
  return paper.answers.map((answer,index)=>({
    id:`${paper.id}-${index+1}`,subject:paper.subject,source:'official',paperId:paper.id,
    number:index+1,paperUrl:paper.paperUrl,question:`${paper.title} 第 ${index+1} 題`,
    choices:Array.from({length:paper.choiceCount},(_,i)=>String.fromCharCode(65+i)),
    answer,explanation:'依官方參考答案核對。請搭配原題本檢討；此處不提供未經核對的自動解析。',
    topic:`${paper.title}・第 ${index+1} 題`
  }));
}

