# Official CAP and review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver official-paper timed answer cards and honest, scheduled learning practice.
**Architecture:** Keep the vanilla JS router and existing state. Serializable exam sessions rebuild answer keys from trusted local catalogs after reload. Official catalog, session engine and views are separate modules; app.js owns persistence and reward settlement.
**Tech Stack:** Vanilla JavaScript, Vite, Vitest/jsdom, LocalStorage, GitHub Pages.
**Spec:** docs/superpowers/specs/2026-09-17-cap-official-design.md

## Global Constraints
- Preserve LocalStorage version 1 and existing player data.
- No official grade estimates. Official question text stays on its source site.
- No answer/hint display while timed exams are active.
- Timer must not replace question DOM or scroll the page.
- Other repository JHSEE-English-Adventure must not be touched.

### Task 1: Core sessions and learning rules
**Files:** js/core/exam-session.js, js/core/mastery.js, js/core/exam-blueprint.js, tests/exam-session.test.js, tests/mastery.test.js, tests/data.test.js
**Interfaces:** createSession(questions, {id?, title, kind, paperId?, durationMinutes, startedAt?, attemptNumber?}) -> serializable {id,title,kind,paperId,durationMinutes,startedAt,questionIds,index,answers,uncertain,hinted,notes,attemptNumber,status}. questions use {id, choices, answer}. answerSession(session, questions, questionId, choice, now) returns copy, rejects unknown/out of bounds/expired/finished; remainingSeconds(session, now), finishSession(session, questions, now) -> result with title/kind/paperId/attemptNumber,total,correct,accuracy,elapsedSeconds,items including choice,answer,correct,uncertain,hinted, explanation. validateSession(session, questions) validates saved session or returns false. recordUncertain(list,id,date), setWrongReason(list,id,reason), existing recordWrong/reviewWrong/dueWrongQuestions stay compatible.
- [x] Add tests: answered question survives JSON roundtrip; 3-choice rejects D; expired choices rejected; wrong IDs rejected; unresolved choice scores false; repeated same-day review earns no extra mastery; mastered entry remains due after nextReview.
```js
const s = createSession([{id:'a',choices:['A','B','C'],answer:1}], {title:'聽力',kind:'official',durationMinutes:25,startedAt:1000});
expect(answerSession(s,[{id:'a',choices:['A','B','C'],answer:1}],'a',3,2000).answers).toEqual({});
expect(remainingSeconds(s,1501000)).toBe(0);
```
- [x] Run `npm test -- tests/exam-session.test.js tests/mastery.test.js tests/data.test.js`, confirm regression failures before implementation.
- [x] Implement immutable core operations, stop claiming alignment based on subject/tags alone. Require explicit domain/questionType/competency/alignmentBasis/reviewStatus='reviewed' and examAligned=true.
- [x] Rerun targeted tests and commit only owned files.

### Task 2: Source catalog and question content
**Files:** js/config/official-papers.js, data/cap-practice.json, tests/official-papers.test.js, docs/official-sources.md
**Interfaces:** OFFICIAL_PAPERS array; getOfficialQuestions(paper) returns original-paper placeholders {id:`${paper.id}-${n}`,subject,question,choices,answer,explanation,source:'official',paperId,number,paperUrl}. Each paper: id,year,subject,title,count,durationMinutes,choiceCount,paperUrl,answerUrl,sourceUrl,answers[],manualCount,reviewUrls.
- [x] Verify 115 answer PDF text columns, counts and boundary answers; check official final ruling. Original PDF image download unavailable, so visual page check is explicitly uncompleted in docs/official-sources.md.
- [x] Add tests for exact counts 42/43/21/25/54/50 and unique question IDs. Compare known first/last/boundary answers to official page.
```js
expect(getOfficialQuestions(OFFICIAL_PAPERS.find(p=>p.subject==='math'))).toHaveLength(25);
```
- [x] Add 30 original contextual questions across five subjects with explanations, optional passage/data table, explicit reviewed metadata and source distinction; avoid answer ambiguity.
- [x] Validate question schema and commit files.

### Task 3: UI and integration
**Files:** js/app.js, js/ui/exam-views.js, js/ui/views.js, css/app.css, js/core/storage.js, tests/app-integration.test.js, tests/ui.test.js, README.md
**Interfaces:** renderExamCenter({papers,activeSession,attempts}), renderSession({session,questions,paper,remaining}), renderSessionResults({result,questions,paper,wrongQuestions}); central click/change delegation. activeExam in state, questions reconstructed from questionIds across official/original catalogs.
- [x] Before timer fix reproduce current bug with jsdom retaining a question DOM reference across 1000ms. UI must keep reference and scroll unchanged.
```js
const card=document.querySelector('.question-card');
await vi.advanceTimersByTimeAsync(1000);
expect(document.querySelector('.question-card')).toBe(card);
```
- [x] Replace quick exam route with persistent session and center route. Fixed visible submit control, final question submit, unanswered confirm. Refresh and route changes preserve startedAt, answers and notes.
- [x] Implement official links setup, paper answer grid, writing notes, result-only answer links. Add original short-practice selector for subject and max grade; no replacement sampling.
- [x] Add review reason selectors, unsure tracking, due counts and individual official re-review action; display first/repeat/with-hint distinctions and study resource links.
- [x] Run integration tests: last question submit, deadline enforced even before timer tick, reload resume, prevent double rewards, no hints/answers in active DOM, original subject/grade/type filter, stale sessions recovered safely.

### Task 4: Verification and release
**Files:** docs/verification-2026-09-17.md
- [x] `npm test` and `npm run build`; inspect submission in supported browser when available. Local browser preview is blocked; mobile-device visual verification remains uncompleted, while viewport rules and jsdom behavior are checked.
- [x] Independent whole-change review; resolve correctness findings and rerun covering tests.
- [ ] Upload changed files atomically using GitHub tree/commit/update-ref with force false against freshly verified main. Leave existing unrelated files intact.
- [ ] Check GitHub Actions and deployed artifact. Record concrete test evidence and remaining limitations.
