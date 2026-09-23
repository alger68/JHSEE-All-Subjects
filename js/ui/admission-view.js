import { SUBJECTS, SUBJECT_ORDER } from '../config/subjects.js';
import { KB_ADMISSION_RULE, KB_PLACEMENT_SOURCE } from '../config/admission-kb.js';

const html=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

const GRADE_LEVELS=['A++','A+','A','B++','B+','B','C'];
const BAND_LABELS={
  challenge:{title:'🔴 挑戰參考',desc:'目前分數略低於公開參考區間，適合放在進取目標。'},
  match:{title:'🟡 主要參考',desc:'目前分數接近公開參考區間，需搭配招生名額與超額比序一起看。'},
  safe:{title:'🟢 相對安全參考',desc:'目前分數高於公開參考區間一段距離，但仍不是錄取保證。'}
};

function scoreLine(school){
  return `${Number(school.low).toFixed(1)}${school.high!==school.low?`～${Number(school.high).toFixed(1)}`:''}`;
}

function schoolCards(items=[]){
  if(!items.length)return '<p class="muted">目前沒有落在這個區間的學校。</p>';
  return `<div class="placement-school-grid">${items.map(school=>`<article class="placement-school-card">
    <div><strong>${html(school.name)}</strong><span>${html(school.region)}</span></div>
    <b>${scoreLine(school)}</b>
    <small>115 公開參考區間</small>
  </article>`).join('')}</div>`;
}

export function renderAdmissionPlacement({model,latestMock=null}){
  const profile=model?.profile??{grades:{},writing:4,gender:'all',targetSchoolId:'banqiao',source:'latest-mock'};
  const score=model?.score;
  const complete=Boolean(score?.complete);
  const target=model?.target;
  return `<div class="app-shell placement-page">
    <header class="page-header"><a href="#/exam-center" aria-label="返回會考中心">←</a><div><span class="eyebrow">ADMISSION PLACEMENT</span><h1>🎯 基北區升學落點</h1></div><span></span></header>

    <section class="practice-panel placement-intro">
      <span class="eyebrow">116 PREP / 115 REFERENCE</span>
      <h2>先用最新模考看目前位置，再反推下一分。</h2>
      <p>目前使用 <strong>${html(KB_ADMISSION_RULE.label)}</strong> 與 <strong>${html(KB_PLACEMENT_SOURCE.label)}</strong>。116 正式簡章與當年度招生名額公布後，應更新資料版本再做正式志願判斷。</p>
      <div class="placement-source-links">
        <a class="text-link" href="${html(KB_ADMISSION_RULE.sourceUrl)}" target="_blank" rel="noopener noreferrer">官方基北區簡章來源 ↗</a>
        <a class="text-link" href="${html(KB_PLACEMENT_SOURCE.sourceUrl)}" target="_blank" rel="noopener noreferrer">公開落點資料來源 ↗</a>
      </div>
    </section>

    <section class="practice-panel">
      <div class="section-heading"><div><span class="eyebrow">SCORE INPUT</span><h2>會考成績情境</h2></div></div>
      <p class="muted">${profile.source==='latest-mock'&&latestMock?`目前帶入：${html(latestMock.title)}・${html(latestMock.date)}`:'目前使用手動情境。'} 可直接改任一科做「如果升一級」的試算。</p>
      <div class="placement-actions">
        ${latestMock?'<button class="secondary-button" data-action="placement-use-latest">重新帶入最新模考</button>':''}
      </div>
      <div class="practice-filters placement-filters">
        ${SUBJECT_ORDER.map(subject=>`<label>${SUBJECTS[subject].name}<select data-placement-grade="${subject}"><option value="">請選擇</option>${GRADE_LEVELS.map(level=>`<option value="${level}" ${profile.grades?.[subject]===level?'selected':''}>${level}</option>`).join('')}</select></label>`).join('')}
        <label>寫作級分<select id="placement-writing">${[6,5,4,3,2,1].map(value=>`<option value="${value}" ${Number(profile.writing)===value?'selected':''}>${value} 級</option>`).join('')}</select></label>
        <label>落點顯示<select id="placement-gender"><option value="all" ${profile.gender==='all'?'selected':''}>全部學校</option><option value="male" ${profile.gender==='male'?'selected':''}>男生可填</option><option value="female" ${profile.gender==='female'?'selected':''}>女生可填</option></select></label>
      </div>
    </section>

    <section class="placement-score-card">
      <span>會考積分參考</span>
      <strong>${complete?score.examScore.toFixed(1):'—'} <small>/ 36</small></strong>
      <p>${complete?`五科 ${score.subjectPoints} 分＋寫作 ${score.writingPoints.toFixed(1)} 分`:'請先完成五科等級。'}</p>
    </section>

    ${complete?`<section class="placement-bands">
      ${['challenge','match','safe'].map(key=>`<article class="placement-band placement-${key}">
        <div class="section-heading"><div><span class="eyebrow">${key.toUpperCase()}</span><h2>${BAND_LABELS[key].title}</h2></div></div>
        <p class="muted">${BAND_LABELS[key].desc}</p>
        ${schoolCards(model.bands?.[key]??[])}
      </article>`).join('')}
    </section>`:''}

    <section class="practice-panel target-school-panel">
      <span class="eyebrow">TARGET SCHOOL</span>
      <h2>目標高中反推</h2>
      <label>目標學校<select id="placement-target">${(model?.schools??[]).map(school=>`<option value="${html(school.id)}" ${profile.targetSchoolId===school.id?'selected':''}>${html(school.name)}｜${scoreLine(school)}</option>`).join('')}</select></label>
      ${target?`<div class="target-summary">
        <div><span>目前</span><strong>${target.score.toFixed(1)}</strong></div>
        <div><span>參考區</span><strong>${scoreLine(target.school)}</strong></div>
        <div><span>距區間下緣</span><strong>${target.gapToLow>0?`差 ${target.gapToLow.toFixed(1)}`:'已進入／高於'}</strong></div>
      </div>
      <h3>下一分可以從哪裡來？</h3>
      <div class="diagnostic-list">${target.upgrades.slice(0,5).map((item,index)=>`<article>
        <div><strong>#${index+1} ${SUBJECTS[item.subject].icon} ${SUBJECTS[item.subject].name}</strong><span>+${item.gain.toFixed(1)} 分</span></div>
        <b>${html(item.current)} → ${html(item.next)}</b>
        <p>排序依目前等級較低與自適應學習權重綜合安排；實際升級難度仍需用後續模考驗證。</p>
      </article>`).join('')}</div>`:'<p class="muted">完成五科成績後，就會顯示目標差距與升級路徑。</p>'}
    </section>

    <section class="practice-panel">
      <h2>怎麼解讀這個結果？</h2>
      <p class="notice">這是學習與志願規劃用的參考工具，不是錄取保證。正式填志願時仍要使用當年度基北區簡章、招生名額、個別序位與超額比序資料。</p>
      <p class="muted">目前落點區間採 115 公開資料；116 正式資料上線後，系統應切換成 116 版本並保留舊版供比較。</p>
    </section>
  </div>`;
}
