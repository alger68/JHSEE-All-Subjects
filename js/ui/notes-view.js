import { STUDY_NOTES, getStudyNote } from '../config/study-notes.js';
import { SUBJECTS } from '../config/subjects.js';
import { nav } from './views.js';

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function formatMathExpr(expr) {
  let s = String(expr ?? '').trim();
  s = s.replace(/\\text\{([^}]*)\}/g, '$1');
  s = s.replace(/\\mathbf\{([^}]*)\}/g, '$1');
  s = s.replace(/\\overline\{([^}]*)\}/g, '$1̅');
  s = s.replace(/\\sqrt\{([^}]*)\}/g, '√($1)');
  s = s.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1) / ($2)');
  s = s.replace(/\\lfloor\s*([^\\]*?)\\rfloor/g, '⌊$1⌋');
  s = s
    .replaceAll('\\times', '×')
    .replaceAll('\\div', '÷')
    .replaceAll('\\pm', '±')
    .replaceAll('\\le', '≤')
    .replaceAll('\\ge', '≥')
    .replaceAll('\\neq', '≠')
    .replaceAll('\\implies', '⇒')
    .replaceAll('\\to', '→')
    .replaceAll('\\triangle', '△')
    .replaceAll('\\angle', '∠')
    .replaceAll('^\\circ', '°')
    .replaceAll('\\circ', '°')
    .replaceAll('\\cap', '∩')
    .replaceAll('\\cup', '∪')
    .replaceAll('\\lambda', 'λ')
    .replaceAll('\\Delta', 'Δ')
    .replaceAll('\\dots', '…');
  s = s.replace(/\^\{([^}]*)\}/g, '^($1)');
  s = s.replace(/_\{([^}]*)\}/g, '_($1)');
  return `<code class="math-inline">${escapeHtml(s)}</code>`;
}

function formatInline(text) {
  let safe = escapeHtml(text);
  // Restore safe inline HTML tags used inside markdown table cells (<li>, </li>, <br>)
  safe = safe
    .replace(/&lt;br\s*\/?&gt;/gi, '<br>')
    .replace(/&lt;li&gt;([\s\S]*?)&lt;\/li&gt;/gi, '<span class="table-bullet">• $1</span><br>');
  // Block math $$...$$ and inline math $...$
  safe = safe.replace(/\$\$([^$]+)\$\$/g, (_, m) => formatMathExpr(m));
  safe = safe.replace(/\$([^$\n]+)\$/g, (_, m) => formatMathExpr(m));
  // Inline code `...`
  safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold **...**
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Markdown links to internal note files
  safe = safe.replace(/\[([^\]]+)\]\(\.\/01_[^)]+\)/g, '<a class="text-link" href="#/notes/chinese">$1</a>');
  safe = safe.replace(/\[([^\]]+)\]\(\.\/02_[^)]+\)/g, '<a class="text-link" href="#/notes/english">$1</a>');
  safe = safe.replace(/\[([^\]]+)\]\(\.\/03_[^)]+\)/g, '<a class="text-link" href="#/notes/math">$1</a>');
  safe = safe.replace(/\[([^\]]+)\]\(\.\/04_[^)]+\)/g, '<a class="text-link" href="#/notes/science">$1</a>');
  safe = safe.replace(/\[([^\]]+)\]\(\.\/05_[^)]+\)/g, '<a class="text-link" href="#/notes/social">$1</a>');
  return safe;
}

function renderTable(lines) {
  const rows = lines
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && line.endsWith('|'))
    .map((line) => line.slice(1, -1).split('|').map((cell) => cell.trim()));
  if (rows.length < 2) return '';
  const headers = rows[0];
  const bodyRows = rows.slice(1).filter((row) => !row.every((cell) => /^:?-{2,}:?$/.test(cell)));
  return `<div class="table-scroll note-table-wrap"><table>
    <thead><tr>${headers.map((h) => `<th scope="col">${formatInline(h)}</th>`).join('')}</tr></thead>
    <tbody>${bodyRows.map((row) => `<tr>${row.map((cell) => `<td>${formatInline(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

export function renderMarkdownBody(markdown = '') {
  const lines = String(markdown ?? '').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // Fenced code block
    if (trimmed.startsWith('```')) {
      const codeLines = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push(`<pre class="note-code"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    // Display math block $$...$$
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
      blocks.push(`<div class="note-formula">${formatMathExpr(trimmed.slice(2, -2))}</div>`);
      i += 1;
      continue;
    }

    // Subheading ###
    if (trimmed.startsWith('### ')) {
      blocks.push(`<h3>${formatInline(trimmed.slice(4))}</h3>`);
      i += 1;
      continue;
    }

    // Blockquote >
    if (trimmed.startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push(`<blockquote class="notice note-quote">${quoteLines.map(formatInline).join('<br>')}</blockquote>`);
      continue;
    }

    // Markdown table
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i += 1;
      }
      blocks.push(renderTable(tableLines));
      continue;
    }

    // List items (- or 1.)
    if (/^(?:[-*]|\d+\.)\s+/.test(trimmed)) {
      const listItems = [];
      while (i < lines.length) {
        const line = lines[i];
        const t = line.trim();
        if (!t) break;
        if (t.startsWith('### ') || t.startsWith('```') || (t.startsWith('|') && t.endsWith('|'))) break;
        if (/^(?:[-*]|\d+\.)\s+/.test(t)) {
          const isSub = /^\s{2,}(?:[-*]|\d+\.)\s+/.test(line);
          const content = t.replace(/^(?:[-*]|\d+\.)\s+/, '');
          listItems.push({ isSub, content });
          i += 1;
        } else if (t.startsWith('>') && listItems.length) {
          listItems[listItems.length - 1].content += `<div class="note-inline-tip">${formatInline(t.replace(/^>\s?/, ''))}</div>`;
          i += 1;
        } else if (/^\s{2,}/.test(line) && listItems.length) {
          if (t.startsWith('$$') && t.endsWith('$$')) {
            listItems[listItems.length - 1].content += `<div class="note-formula">${formatMathExpr(t.slice(2, -2))}</div>`;
          } else {
            listItems[listItems.length - 1].content += `<br>${t}`;
          }
          i += 1;
        } else {
          break;
        }
      }
      blocks.push(`<ul class="note-list">${listItems.map((item) =>
        `<li class="${item.isSub ? 'note-subitem' : ''}">${formatInline(item.content)}</li>`
      ).join('')}</ul>`);
      continue;
    }

    // Paragraph
    blocks.push(`<p>${formatInline(trimmed)}</p>`);
    i += 1;
  }

  return blocks.join('\n');
}

export function searchStudyNotes(query = '') {
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) return [];
  const matches = [];
  for (const note of STUDY_NOTES) {
    for (const section of note.sections) {
      if (
        section.title.toLowerCase().includes(q) ||
        section.body.toLowerCase().includes(q) ||
        note.title.toLowerCase().includes(q)
      ) {
        matches.push({ note, section });
      }
    }
  }
  return matches;
}

export function renderStudyNotes({ activeNoteId = 'overview', searchQuery = '' } = {}) {
  const activeNote = getStudyNote(activeNoteId);
  const query = String(searchQuery ?? '').trim();
  const searchResults = query ? searchStudyNotes(query) : [];
  const subjectInfo = activeNote.subject ? SUBJECTS[activeNote.subject] : null;

  return `<div class="app-shell notes-page" ${subjectInfo ? `style="--subject:${subjectInfo.color}"` : ''}>
    <header class="page-header">
      <a href="#/exam-center" aria-label="返回會考中心">←</a>
      <div>
        <span class="eyebrow">5A++ SPRINT NOTES</span>
        <h1>📘 五科 A++ 衝刺重點筆記</h1>
      </div>
      <span></span>
    </header>

    <section class="practice-panel notes-toolbar">
      <div class="notes-tabs" role="tablist" aria-label="選擇筆記科目">
        ${STUDY_NOTES.map((note) => `<a
          href="#/notes/${escapeHtml(note.id)}"
          class="note-tab ${note.id === activeNote.id && !query ? 'active' : ''}"
          role="tab"
          aria-selected="${note.id === activeNote.id && !query ? 'true' : 'false'}"
        ><span>${note.icon}</span><strong>${escapeHtml(note.id === 'overview' ? '總覽與計畫' : SUBJECTS[note.subject]?.name + ' A++')}</strong></a>`).join('')}
      </div>
      <div class="notes-search-row">
        <label for="notes-search">搜尋五科考點關鍵字（例如：三心、浮力、虛詞、關代、台灣史、匯率）</label>
        <input id="notes-search" type="search" value="${escapeHtml(query)}" placeholder="輸入考點關鍵字跨科搜尋…" autocomplete="off">
      </div>
    </section>

    ${query ? `<section class="practice-panel">
      <div class="section-heading">
        <div>
          <span class="eyebrow">SEARCH RESULTS</span>
          <h2>「${escapeHtml(query)}」搜尋結果（共 ${searchResults.length} 個主題段落）</h2>
        </div>
        <button type="button" class="secondary-button" data-action="clear-notes-search">清除搜尋</button>
      </div>
      ${searchResults.length ? searchResults.map(({ note, section }) => `<article class="note-section-card jh-card">
        <header class="note-section-header">
          <span class="status-chip">${note.icon} ${escapeHtml(note.shortTitle)}</span>
          <h3>${escapeHtml(section.title)}</h3>
        </header>
        <div class="note-markdown-body">${renderMarkdownBody(section.body)}</div>
      </article>`).join('') : '<p class="muted">找不到符合此關鍵字的段落，請換個詞（如：圓周角、光合作用、文言文、完成式、氣候）。</p>'}
    </section>` : `
    <section class="practice-panel note-hero-panel jh-card">
      <div class="section-heading">
        <div>
          <span class="eyebrow">${activeNote.subject ? `${activeNote.subject.toUpperCase()} A++ GUIDE` : 'ALL SUBJECTS 5A++'}</span>
          <h2>${activeNote.icon} ${escapeHtml(activeNote.title)}</h2>
        </div>
        <a class="text-link" href="#/placement">🎯 師大附中落點反推 →</a>
      </div>
      <div class="note-intro">${renderMarkdownBody(activeNote.intro)}</div>
      ${activeNote.subject ? `<div class="note-practice-actions">
        <button type="button" class="primary-button" data-action="start-aplus-practice" data-subject="${escapeHtml(activeNote.subject)}">🔥 立即練 ${escapeHtml(subjectInfo?.name)} A++ 決勝難題（10 題）→</button>
        <button type="button" class="secondary-button" data-action="start-placement-practice" data-subject="${escapeHtml(activeNote.subject)}" data-count="10">▶ 練 ${escapeHtml(subjectInfo?.name)}會考導向題（10 題）</button>
        <a class="secondary-button" href="#/world/${escapeHtml(activeNote.subject)}">🗺️ 進入${escapeHtml(subjectInfo?.world)}</a>
      </div>` : `<div class="note-practice-actions">
        <button type="button" class="primary-button" data-action="start-aplus-practice" data-subject="all">🔥 立即挑戰五科 A++ 決勝難題（10 題）→</button>
        <a class="secondary-button" href="#/placement">🎯 查看師大附中（男）落點與單科比序</a>
      </div>`}
    </section>

    <div class="note-sections-stack">
      ${activeNote.sections.map((section) => `<section class="practice-panel note-section-card jh-card">
        <h2>${escapeHtml(section.title)}</h2>
        <div class="note-markdown-body">${renderMarkdownBody(section.body)}</div>
      </section>`).join('')}
    </div>`}

    ${nav('profile')}
  </div>`;
}
