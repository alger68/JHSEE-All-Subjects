import layouts from '../../data/official-115-layout.json';

const escape = (v) => String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const asset = (src) => `${import.meta.env.BASE_URL}${src}`;
export const officialLayout = (paper) => paper?.year===115 ? layouts[paper.section] : null;

export function renderRegion(paper,region,label) {
  const page=officialLayout(paper)?.pages[region?.page-1];
  if(!page) return '<p>這個題目影像目前無法顯示，請切換整份題本或開啟官方原檔。</p>';
  const [x,y,w,h]=region.box;
  return `<div class="original-region"><svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" role="img" aria-label="${escape(label)}" style="aspect-ratio:${w}/${h}"><title>${escape(label)}</title><image href="${escape(asset(page.src))}" width="${page.width}" height="${page.height}" />${(region.masks??[]).map(([mx,my,mw,mh])=>`<rect x="${mx}" y="${my}" width="${mw}" height="${mh}" fill="white" />`).join('')}</svg></div>`;
}

export function renderOfficialQuestion(paper,question) {
  const q=officialLayout(paper)?.questions[question?.number-1];
  if(!q) return '<p>請使用整份題本查看這題。</p>';
  const groupStart=Number(String(q.group??'').split('–')[0])||q.number;
  const sharedOpen=!q.group||q.number===groupStart;
  const groupLabel=q.group?`題組 ${q.group}・目前第 ${q.number} 題`:`第 ${q.number} 題`;
  return `<section class="official-question-material" data-official-question="${q.number}" data-preserve="question-${paper.id}-${q.number}"><div class="reader-tools"><span class="muted">${escape(groupLabel)}・官方原題</span><button type="button" data-action="paper-zoom" aria-pressed="false">放大閱讀</button></div><div class="paper-image-scroll" tabindex="0" aria-label="題目影像，可放大並左右捲動"><div class="paper-image-content">${q.shared.length?`<details class="official-shared" ${sharedOpen?'open':''}><summary>共用文章與圖表（題組 ${q.group}）${sharedOpen?'':'・需要時點此展開'}</summary>${q.shared.map(r=>renderRegion(paper,r,`${paper.title} 第 ${q.group} 題共用材料`)).join('')}</details>`:''}<div class="official-current-question"><strong>${escape(groupLabel)}</strong>${renderRegion(paper,q.region,`${paper.title} 第 ${q.number} 題，含全部選項`)}</div></div></div></section>`;
}

export function renderPaperReader(paper,session={}) {
  const layout=officialLayout(paper);if(!layout)return '';
  const pageNumber=Math.max(1,Math.min(layout.pages.length,Number(session.paperPage)||1));
  const page=layout.pages[pageNumber-1];
  return `<section class="whole-paper-reader" data-preserve="paper-${paper.id}-${pageNumber}"><div class="reader-tools"><button data-action="paper-page-prev" ${pageNumber===1?'disabled':''}>← 前頁</button><label>題本頁 <select data-paper-page-select aria-label="選擇題本頁碼">${layout.pages.map((_,i)=>`<option value="${i+1}" ${i+1===pageNumber?'selected':''}>${i+1}</option>`).join('')}</select></label><span data-paper-page>${pageNumber} / ${layout.pages.length}</span><button data-action="paper-page-next" ${pageNumber===layout.pages.length?'disabled':''}>後頁 →</button><button data-action="paper-zoom" aria-pressed="false">放大閱讀</button></div><p class="muted">此為 PDF 頁序（含封面）；翻頁不會更動正在填答的題號。</p><div class="paper-image-scroll" tabindex="0" aria-label="整份官方題本，可放大並左右捲動"><div class="paper-image-content"><img src="${escape(asset(page.src))}" width="${page.width}" height="${page.height}" alt="${escape(paper.title)}，PDF 第 ${pageNumber} 頁" /></div></div></section>`;
}

export function renderOfficialMode(paper,session) {
  return `<div class="official-view-controls" role="group" aria-label="題目顯示方式"><button data-action="paper-mode" data-mode="question" aria-pressed="${session.paperMode!=='whole'}">逐題作答</button><button data-action="paper-mode" data-mode="whole" aria-pressed="${session.paperMode==='whole'}">整份題本</button></div>`;
}

export function renderOfficialManual(paper,index) {
  const region=officialLayout(paper)?.manual[index];
  if(!region)return '';
  return `<details class="official-manual" ${paper.section==='writing'?'open':''}><summary>${paper.section==='writing'?'官方寫作題目':`查看官方非選第 ${index+1} 題`}</summary>${renderRegion(paper,region,`${paper.title} ${paper.section==='writing'?'寫作題目':`非選第 ${index+1} 題`}`)}</details>`;
}

export function renderOfficialFormula(paper) {
  const region=officialLayout(paper)?.formula;
  return region?`<details class="official-formula"><summary>數學官方參考公式</summary>${renderRegion(paper,region,'官方數學參考公式')}</details>`:'';
}

export function renderOfficialAudio(paper,session) {
  if(paper.section!=='listening')return '';
  return `<section class="official-audio" data-preserve="audio-${escape(session.id)}"><h2>官方聽力音檔</h2><p class="muted">按播放，依序聆聽全部題目與說明。自主練習可暫停或重聽，考試倒數仍持續。</p><audio controls preload="none" src="${escape(asset('official/115/listening/full-exam.mp3'))}" aria-label="115 年官方英語聽力完整音檔"></audio></section>`;
}
