# Question Provider + Transfer Review V2 Verification

- Date: 2026-09-29
- Repository: `alger68/JHSEE-All-Subjects`
- Branch: `feat/question-provider-review-v2-current`
- Verified head: `75b463d4b8285882557dfd2846145d53afc60c69`
- Pre-V2 production rollback reference: `9c75dc140aaa33bb981f57ecbaa0a4016a94b277`
- Production content baseline: 355 original questions + 115-year official paper reader

## Acceptance results

### Automated tests

- Test files: **37 / 37 passed**
- Tests: **268 / 268 passed**
- Production Vite build: **PASS**
- GitHub Pages artifact build: **PASS**
- Content audit: **PASS**
- Original question bank: **355**
- Supplemental questions: **150**
- Curriculum skills covered: **60 / 60**
- Official reader verification: **84 pages / 235 question regions + listening audio**

Verified in GitHub Actions run `36490600919`.

## Functional verification

### Question Provider

- General practice uses one Provider selection path.
- Target-school practice uses the same Provider selection path.
- Recent **30 unique question IDs** are cooled down.
- Recent content fingerprints are excluded where fresh alternatives exist.
- When fresh candidates are insufficient, older cooled questions may fill the session rather than producing an empty practice.
- Local questions are preferred.
- AI is requested only when the selected local/cache practice set is insufficient.
- A full local 10-question practice produces **zero AI requests**.

### Content deduplication

- Deterministic fingerprinting uses normalized stem, passage/material and ability metadata.
- Similarity uses token overlap, n-gram overlap and competency/type metadata.
- Similarity >= 0.85 is blocked.
- 0.70–0.85 is blocked when competency and question type also match.
- Different IDs cannot bypass duplicate protection when content is effectively the same.

### Wrong-answer review

Review lifecycle is:

`Anchor → Same Skill → Near Transfer → Delayed Transfer → Resolved`

- The original wrong question is used once as the Anchor.
- After that first review, the Anchor ID/fingerprint is excluded from that review lifecycle even when the Anchor answer was wrong.
- Continuous review does not reuse one variant for two wrong items in the same session.
- Correct-but-uncertain / hinted answers do not count as passing transfer evidence.
- Repeating the original question can no longer resolve a wrong item through the legacy mastery path.
- True resolution requires distinct transfer-question evidence.

### AI quality and quota

- Generated questions are schema/answer validated before registration.
- AI variants are fingerprint/similarity checked against the source, recent history and current session.
- Only accepted AI questions enter `generatedQuestions`.
- Only accepted AI questions count against daily AI usage.
- Rejected/malformed generated questions do not consume quota.
- Adaptive reset clears both persisted and runtime AI cache.

### Official paper isolation

- Official questions remain available for lookup, reports and one-time Anchor review.
- Official questions are not eligible as generic variant candidates.
- Provider cannot casually reuse official questions as generated practice variants.

### Storage and backup compatibility

No migration key/version break was introduced.

- LocalStorage remains `jhsee.adventure.v1`.
- Backup format remains `jhsee-backup-v1`.
- Legacy wrong items are lazily enriched after question runtime is available.
- Review V2 fields survive save/load and backup round-trip.
- Missing legacy question IDs remain preserved as unavailable items rather than being deleted.

### UX regressions preserved

The V2 integration preserves the recent production fixes:

- selected answers remain visibly selected;
- review answers no longer auto-jump immediately;
- malformed peer questions do not lock a valid current question;
- malformed AI questions cannot poison an active session;
- AI weakness-validation repeat clicks remain locked while generation is in flight;
- existing official-paper navigation/listening/writing flows remain green.

## Release decision

The V2 branch satisfies the approved specification and implementation plan and is ready to merge into `main`.
