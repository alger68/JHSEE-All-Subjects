// 115學年度國三（2026–2027）；日期與範圍交叉核對江翠、樟樹及恆毅公告。
export const MOCK_CALENDAR = [
  {name:'第一次模考',start:'2026-09-08',end:'2026-09-09',dates:'2026/9/8（二）–9/9（三）',scope:'國英數社：第 1–2 冊；自然：第 1、3 冊'},
  {name:'第二次模考',start:'2026-12-23',end:'2026-12-24',dates:'2026/12/23（三）–12/24（四）',scope:'五科第 1–4 冊（國一、國二）'},
  {name:'第三次模考',start:'2027-02-18',end:'2027-02-19',dates:'2027/2/18（四）–2/19（五）',scope:'五科第 1–5 冊（含國三上）'},
  {name:'第四次模考',start:'2027-04-15',end:'2027-04-16',dates:'2027/4/15（四）–4/16（五）',scope:'五科第 1–6 冊（國中三年）'}
];

export function renderMockCalendar(today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())) {
  const next=MOCK_CALENDAR.find(exam=>exam.end>=today);
  const days=next?Math.round((Date.parse(next.start+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000):0;
  const upcoming=next?`${next.name}・${days>0?`還有 ${days} 天`:'考試期間'}`:'本學年度四次參考模考日期皆已過';
  return `<section class="practice-panel mock-calendar" id="mock-calendar" aria-label="國三模考時程"><span class="eyebrow">2026–2027・115 學年度國三</span><h2>國三模考時程</h2><p class="notice"><strong>${upcoming}</strong></p><p>新北學校公告參考時程。尚未核實永平國中部本屆校內公告，實際日期與範圍以就讀學校最新通知為準。</p><div class="table-scroll"><table><thead><tr><th scope="col">模考</th><th scope="col">日期（西元）</th><th scope="col">範圍</th><th scope="col">狀態</th></tr></thead><tbody>${MOCK_CALENDAR.map(exam=>`<tr><th scope="row">${exam.name}</th><td>${exam.dates}</td><td>${exam.scope}</td><td>${exam.end<today?'日期已過':exam.start<=today?'考試期間':exam===next?'下一次':'後續'}</td></tr>`).join('')}</tbody></table></div><p class="muted">資料核對：2026/10/3。民國 115 年＝2026 年；116 年＝2027 年。</p><p><a class="text-link" href="https://www.ctjh.ntpc.edu.tw/p/406-1000-11816,r27.php" target="_blank" rel="noopener noreferrer">江翠國中公告 ↗</a> · <a class="text-link" href="https://www.ctjhs.ntpc.edu.tw/p/406-1000-7249,r159.php" target="_blank" rel="noopener noreferrer">樟樹國中部公告 ↗</a> · <a class="text-link" href="https://www.hchs.ntpc.edu.tw/var/file/0/1000/img/20/860776754.pdf" target="_blank" rel="noopener noreferrer">恆毅國三日程表 ↗</a></p><a class="secondary-button" href="#/exam-center">模考後登錄成績與安排補強 →</a></section>`;
}
