# Blueprint Leadership Pre-Publish Builder QA

Live route checked: `https://www.sonartra.com/admin/assessments/single-domain/blueprint-understand-how-you-lead/language`

Date checked: 2026-04-25

Admin session observed: `mark.dunn.uk@gmail.com`

Scope: validation-only live QA. No code, database records, builder content, imports, publish actions, or persisted builder state were modified.

## Sections Reviewed

- Domain
- Signals
- Questions
- Responses
- Weightings
- Language
- Review

## Assessment Structure

- Assessment title: `Blueprint - Understand how you lead`
- Assessment key shown in builder chrome: `BLUEPRINT-UNDERSTAND-HOW-YOU-LEAD`
- Mode: `SINGLE-DOMAIN`
- Draft state: `EDITABLE DRAFT 1.0.0`
- Domain: `leadership-approach`
- Signal count: 4
- Signals present: `process`, `results`, `vision`, `people`
- Derived pair count on Review: 6
- No duplicate or malformed signal keys were visible on the Signals page.

## Questions And Responses

- Questions: 24
- Question prompts inspected through the Questions page form values.
- Blank question prompts: 0
- Duplicate question prompts: 0
- Responses: 96
- Each inspected question has 4 A-D response slots.
- Blank response texts: 0
- Duplicate responses within a question: 0
- Repeated response text across different questions was present, for example `Supporting people` and `Lack of direction`, but not duplicated within the same question.

## Weightings

- Review reports 96 weighting rows.
- Weightings page reports:
  - Signals: 4
  - Options: 96
  - Weighted options: 96
  - Mappings: 96
- The visible weighting grid uses signal columns in this order: `process`, `results`, `vision`, `people`.
- The inspected question grids showed one non-empty mapping per response option, with the populated weight value as `1.0000`.
- Example inspected mapping:
  - Q01 A `Achieving clear outcomes and targets` -> `results` weight `1.0000`
  - Q01 B `Setting direction and future priorities` -> `vision` weight `1.0000`
  - Q01 C `Supporting and developing people` -> `people` weight `1.0000`
  - Q01 D `Creating structure and clear ways of working` -> `process` weight `1.0000`
- Q19 was also inspected and followed the same one-hot mapping pattern.

## Language Completeness

Review page reports language as ready:

- Domain Framing: `1/1+`
- Hero Pairs: `6/6`
- Signal Chapters: `4/4`
- Balancing Sections: `6/6`
- Pair Summaries: `6/6`
- Application Statements: `4/4`

Language page section cards show:

- Intro: `1/1`, complete
- Hero: `6/6`, complete
- Drivers: `4/4`, complete
- Pair: `6/6`, complete
- Limitation: `6/6`, complete
- Application: `4/4`, complete

Composer provenance for the selected draft preview showed:

- Intro source rows: 1
- Hero source rows: 1 for `process_people`
- Drivers source rows: 24
- Pair source rows: 1 for `process_people`
- Limitation source rows: 1 for `process_people`
- Application source rows: 24

## Pair Coverage

Review confirms 6 derived pairs from the 4 current signals. Pair-owned dataset counts on Review all match the derived pair count:

- Hero Pairs: `6/6`
- Pair Summaries: `6/6`
- Balancing Sections: `6/6`

The visible draft preview was for `PROCESS_PEOPLE`. The page did not expose all six pair keys simultaneously in the reviewed preview state, so individual pair text quality for all six pairs was not fully inspectable from this single preview state.

## Missing Or Invalid Items

Final recommendation is blocked by language diagnostics and visible raw-key/provenance leakage in the preview surface.

1. The language composer preview shows blocking diagnostics:
   - `WEAKER_SIGNAL_PROPAGATION_GAP`: material range limitation `people` does not clearly propagate through limitation and application.
   - `WEAKER_SIGNAL_PROPAGATION_GAP`: material range limitation `process` does not clearly propagate through limitation and application.
   - `WEAKER_SIGNAL_PROPAGATION_GAP`: material range limitation `results` does not clearly propagate through limitation and application.

2. The language composer preview shows warnings:
   - repeated phrase reuse across Hero, Drivers, and Limitation, including repeated forms of `process is the main`, `is the main driver`, and `driver of this pattern`.
   - `SECTION_ROLE_COLLISION`: intro text drifts into application guidance ownership.

3. The preview/provenance area exposes raw keys and internal labels:
   - `PAIR PROCESS_PEOPLE`
   - `leadership-approach`
   - `process_people`
   - import contracts and provenance expose raw field and dataset-style keys.

4. There is a readiness mismatch:
   - Review says `READY TO PUBLISH`.
   - Language page top-level readiness shows `VALIDATION WARNINGS 0`.
   - Composer preview simultaneously shows warning and blocking diagnostics.

5. Section-native import state is confusing:
   - Each language section action area showed `Imported rows 0`, `Existing stored rows 0`, and `Waiting for section rows`.
   - Review still reports language storage coverage as complete through the legacy-backed datasets.
   - This may be an expected adapter-state display, but it is not a clean pre-publish builder signal.

## Console And Network Findings

- Initial language-page load console: one Clerk warning that development keys are loaded on production.
- Subsequent page checks did not show page-specific console errors.
- Network checks during the inspected pages showed successful `200` responses for the relevant Sonartra admin routes and assets.
- No failed network requests relevant to assessment or language loading were observed.

## Screenshots

Captured under `.codex-artifacts/`:

- `.codex-artifacts/blueprint-leadership-prepublish-language-overview.png`
- `.codex-artifacts/blueprint-leadership-prepublish-review.png`
- `.codex-artifacts/blueprint-leadership-prepublish-hero-section.png`
- `.codex-artifacts/blueprint-leadership-prepublish-drivers-section.png`
- `.codex-artifacts/blueprint-leadership-prepublish-pair-section.png`
- `.codex-artifacts/blueprint-leadership-prepublish-limitation-section.png`
- `.codex-artifacts/blueprint-leadership-prepublish-application-section.png`

## Final Recommendation

BLOCKED.

The structural builder state is close to publish-ready and the Review page reports `READY TO PUBLISH`, but the language preview currently shows blocking diagnostics for weaker-signal propagation, repeated-language warnings, visible raw keys, and a mismatch between Review readiness and composer diagnostics. Resolve or intentionally downgrade those language diagnostics before publishing.
