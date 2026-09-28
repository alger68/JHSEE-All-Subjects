# Final Verification — Question Provider V2 + Curriculum Depth Completion

Date: 2026-09-29  
Production baseline: `8589ad263c3e572a1183cafdbbbff4dea7cf67a2`

## Scope completed

This verification records the completed implementation of:

- Question Provider V2
- content-aware fingerprint / near-duplicate filtering
- runtime Question Registry
- one-time wrong-answer Anchor review
- Same Skill → Near Transfer → Delayed Transfer review progression
- local-first question selection with AI fallback
- recent-ID and recent-fingerprint cooldown
- variation-form rotation
- three-year, five-subject curriculum blueprint
- manifest-driven supplemental question packs
- Packs 001–006
- final curriculum depth audit

## Production question-bank status

Core original questions: **205**  
Supplemental original questions: **450**  
Total original questions: **655**

| Subject | Total | Grade 7 | Grade 8 | Grade 9 | Blueprint skills | Depth gap |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Chinese | 134 | 44 | 40 | 50 | 12 / 12 | 0 |
| English | 129 | 40 | 41 | 48 | 12 / 12 | 0 |
| Math | 125 | 38 | 41 | 46 | 12 / 12 | 0 |
| Science | 136 | 42 | 49 | 45 | 12 / 12 | 0 |
| Social | 131 | 40 | 41 | 50 | 12 / 12 | 0 |
| **Total** | **655** |  |  |  | **60 / 60** | **0** |

The `depth gap` is an internal project target based on 8–12 questions per defined skill. It is not an official CAP requirement.

## Review V2 behavior verified

- Original wrong question is allowed once as the Anchor.
- After that first review, the Anchor is excluded from the same wrong-item review lifecycle whether it was answered correctly or incorrectly.
- Later review uses different question IDs/fingerprints.
- Same-skill local questions are preferred.
- Near-transfer local questions are used before AI when appropriate.
- AI is used only when local/cache candidates are insufficient and allowed by quota.
- Generated questions pass QA before entering usable cache.
- Correct-but-uncertain review answers do not count as full transfer evidence.
- One variant is not reused for multiple wrong items in the same continuous review session.
- Official questions remain lookup/review anchors but are not used as general variant candidates.

## Diversity behavior verified

Provider/Registry now support:

- recent 30-question ID cooldown
- recent fingerprint cooldown
- semantic near-duplicate rejection
- inferred variation forms for legacy/local content
- explicit variation forms on new packs

Variation forms include:

- table
- dialogue
- notice
- email
- chart
- experiment
- passage
- standalone

## Compatibility retained

- LocalStorage key remains `jhsee.adventure.v1`.
- Existing backup flow remains compatible.
- Official 115 papers remain separate from the 655 original-question bank.
- Answer-selection robustness fixes remain active.
- AI weakness-validation repeat-click protection remains active.
- Existing mock, placement, adaptive-learning, TTS and official-reader flows remain available.

## Final CI / build evidence

Production workflow for `8589ad2`:

- **37 / 37 test files passed**
- **270 / 270 tests passed**
- content audit: **655 questions, 60 / 60 skills, target gap 0**
- production Vite build: **success**
- question-bank artifact verification: **success**
- official reader verification: **84 pages, 235 question regions, listening audio**
- GitHub Pages deploy: **success**

## Release conclusion

The original target problem — insufficient question depth causing repeated wrong-answer practice — is addressed by both sides of the system:

1. **content supply**: 655 original questions across all 60 defined three-year skills;
2. **selection architecture**: Provider V2 prevents repeated Anchor dependence and rotates fresh/transfer candidates.

Future question growth should be driven by real student error rates, repeat pressure and uncovered variation forms rather than a fixed total-question target.
