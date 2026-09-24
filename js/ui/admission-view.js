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
  const profile=model?.profile??{grades:{},writing:4,gender:'all',targetSchoolId:'banqiao',source:'latest-mock',preferencePoints:null,balancedPoints:null,servicePoints:null};
  const score=model?.score;
  const totalScore=model?.totalScore;
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

    <section class="placement-score-grid">
      <article class="placement-score-card">
        <span>會考積分參考</span>
        <strong>${complete?score.examScore.toFixed(1):'—'} <small>/ 36</small></strong>
        <p>${complete?`五科 ${score.subjectPoints} 分＋寫作 ${score.writingPoints.toFixed(1)} 分`:'請先完成五科等級。'}</p>
      </article>
      <article class="placement-score-card placement-total-card">
        <span>基北區免試總積分</span>
        <strong>${totalScore?.complete?totalScore.total.toFixed(1):'—'} <small>/ 108</small></strong>
        <p>${totalScore?.complete?`志願序 ${totalScore.preferencePoints}＋均衡 ${totalScore.balancedPoints}＋服務 ${totalScore.servicePoints}＋會考 ${score.examScore.toFixed(1)}`:'填入下方多元學習與志願序後試算。'}</p>
      </article>
    </section>

    <section class="practice-panel">
      <span class="eyebrow">OFFICIAL SCORE</span>
      <h2>108 分免試總積分（選填）</h2>
      <p class="muted">公開學校落點區間仍以會考 36 分制呈現；這裡另外依 115 基北區正式比序規則試算總積分。請依自己的實際多元學習分數填寫。</p>
      <div class="practice-filters placement-filters">
        <label>志願序積分<select id="placement-preference-points"><option value="">未填</option>${[36,35,34,33,32].map(value=>`<option value="${value}" ${Number(profile.preferencePoints)===value?'selected':''}>${value} 分</option>`).join('')}</select></label>
        <label>均衡學習<select id="placement-balanced-points"><option value="">未填</option>${[24,18,12,6,0].map(value=>`<option value="${value}" ${Number(profile.balancedPoints)===value&&profile.balancedPoints!==null?'selected':''}>${value} 分</option>`).join('')}</select></label>
        <label>服務學習<select id="placement-service-points"><option value="">未填</option>${[12,8,4,0].map(value=>`<option value="${value}" ${Number(profile.servicePoints)===value&&profile.servicePoints!==null?'selected':''}>${value} 分</option>`).join('')}</select></label>
      </div>
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

    ${target&&model?.sevenDayPlan?.length?`<section class="practice-panel target-plan-panel">
      <div class="section-heading"><div><span class="eyebrow">7 DAY TARGET PLAN</span><h2>${html(target.school.name)}・7 天補強計畫</h2></div><span class="status-chip">${target.gapToLow>0?`距下緣 ${target.gapToLow.toFixed(1)} 分`:'維持／拉開安全距離'}</span></div>
      <p class="muted">依目標差距、目前會考等級與 Adaptive 弱點排序。這是讀書配置，不代表 7 天內一定能提升級別；每次練習完成後，系統會用新作答紀錄重新調整。</p>
      ${model.sevenDayPlan[0]?.tasks?.[0]?`<button class="primary-button target-today-button" data-action="start-placement-practice" data-subject="${html(model.sevenDayPlan[0].tasks[0].subject)}" data-count="${model.sevenDayPlan[0].tasks[0].questionTarget}">▶ 今天先攻 ${SUBJECTS[model.sevenDayPlan[0].tasks[0].subject].name}・${model.sevenDayPlan[0].tasks[0].questionTarget} 題</button>`:''}
      <div class="target-plan-grid">
        ${model.sevenDayPlan.map(day=>`<article class="target-plan-day">
          <header><div><span>Day ${day.day}</span><strong>${html(day.date)}</strong></div><b>${html(day.phase)}</b></header>
          <p>今日共 ${day.questionTarget} 題</p>
          <div class="target-plan-tasks">
            ${day.tasks.map(task=>`<div class="target-plan-task">
              <div><strong>${SUBJECTS[task.subject].icon} ${SUBJECTS[task.subject].name}</strong><span>${html(task.current)} → ${html(task.next)}・${task.questionTarget} 題</span></div>
              <small>${task.competency?`${html(task.domain??'')}・${html(task.competency)}${task.mastery!==null?`・熟練 ${task.mastery}`:''}`:'依該科最新弱點動態選題'}</small>
              <button type="button" class="secondary-button" data-action="start-placement-practice" data-subject="${html(task.subject)}" data-count="${task.questionTarget}">開始這組 →</button>
            </div>`).join('')}
          </div>
        </article>`).join('')}
      </div>
    </section>`:''}

    <section class="practice-panel">
      <h2>怎麼解讀這個結果？</h2>
      <p class="notice">這是學習與志願規劃用的參考工具，不是錄取保證。正式填志願時仍要使用當年度基北區簡章、招生名額、個別序位與超額比序資料。</p>
      <p class="muted">目前落點區間採 115 公開資料；116 正式資料上線後，系統應切換成 116 版本並保留舊版供比較。</p>
    </section>
  </div>`;
}
