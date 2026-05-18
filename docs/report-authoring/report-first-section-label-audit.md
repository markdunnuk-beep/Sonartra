# Report-First Section Label Audit

## 1. Purpose

This audit documents how report-first section labels are currently defined, transformed, persisted, and rendered in Sonartra. The goal is to verify whether future assessments (for example, Decision Style) can use assessment-specific public section labels without changing scoring, pattern resolution, or result readiness/runtime contracts.

## 2. Current Public Section Labels

| Section | Current public label |
| --- | --- |
| 04 | Key insight |
| 05 | Value |
| 06 | Others |
| 07 | Decisions |
| 08 | Communication |
| 09 | Pressure |
| 10 | Strengths |
| 11 | Tightening |
| 12 | People Expansion |
| 13 | Range |
| 14 | Development |
| 15 | Closing |

Notes:
- The current renderer shows `People expansion` as a special-case reader-facing label for one specific chapter title pattern, while also using `Range` for rank-3/rank-4 expansion rail labels from compiled template data.
- `Key insight` and `Closing synthesis` are rendered with fixed heading strings in the current report-first page implementation.

## 3. Data Flow Summary

Current observed flow:

authoring source markdown
→ compiler (`compile-report-first-template.ts`)
→ generated/import rows JSON (`report-first-template-import-rows.json`)
→ template storage row (`assessment_report_first_templates.report_template_json`)
→ completion pipeline (`report-first-result-assembly.ts`)
→ `canonical_result_payload` (`report` + `reportFirst.template`)
→ result read model route (`/app/results/single-domain/[resultId]`)
→ report-first renderer (`ReportFirstResultReport`)
→ in-page guide/rail/mobile nav generated in component

Label status by step:

1. **Authoring source markdown**
   - Section headings: **present** (e.g., `Chapter 1 — ...`, `Key insight`, `Closing synthesis`).
   - Rail labels (`Value`, `Others`, ...): **absent** as explicit fields; chapter title is present.

2. **Compiler**
   - Rail labels are **generated/transformed** via hard-coded chapter-key map.
   - Reader navigation labels are **generated** with fixed ids + fixed labels for overview/pattern/evidence/insight/closing.

3. **Generated/import rows JSON**
   - `report_template_json.report.chapters[].railLabel`: **present**.
   - `report_template_json.report.readerNavigation[].label`: **present**.

4. **Database template row**
   - `report_template_json` stored wholesale: label fields are **present** as compiled.

5. **Completion pipeline / canonical payload assembly**
   - Payload stores `report` and `reportFirst.template` blobs: labels are **present indirectly** via template JSON.
   - No explicit typed canonical `sections[]` contract at top level: **absent**.

6. **Result service and route**
   - Route chooses report-first renderer when result kind is report-first: labels are **not transformed** here.

7. **Renderer / reading rail / mobile nav**
   - Navigation and section cards are **inferred/generated** inside renderer from report + component rules.
   - Some labels/headings remain **hard-coded** (`Insight`, `Key insight`, `Closing`, `Closing synthesis`, special-case `People expansion`).

## 4. Source Storage Findings

- Section labels are present in source markdown as chapter and named section headings.
- Compiler creates additional reader-facing labels through constants and maps.
- Generated import rows contain persisted `railLabel` and `readerNavigation` labels.
- Labels are currently derived partly from fixed chapter keys and chapter-number mapping in compiler.
- Current mapping is not tied to legacy modular worksheet naming in runtime renderer, but compiler does enforce a fixed chapter contract (`Chapter 1..10` mapped to required keys).
- Assessment-specific label editing is possible at authoring/compiler layer only if compiler mapping logic is changed or made configurable; current map is fixed in code.

## 5. Canonical Payload Findings

- `ReportFirstCanonicalPayloadV1` includes `report: unknown` and `reportFirst.template: unknown`.
- The typed contract does **not** expose an explicit normalized `sections[]` with required `id/order/label/title` fields.
- Section ids used by renderer are currently generated in UI (`key-insight`, chapter keys, `closing`) rather than first-class typed canonical section objects.
- Section ordering is supported implicitly by chapter order and renderer composition order.
- Display titles are partially separate (chapter `title`) from rail labels (`railLabel`) in template JSON.
- Contract does not strictly assume Leadership labels at type level, but compiler/runtime path currently assumes fixed chapter structure and injects default/fixed labels in places.

## 6. Renderer Findings

- Result route renders `ReportFirstResultReport` when `resultKind === 'report_first'`.
- Renderer reads report data from payload but still hard-codes multiple reader labels/headings:
  - `Insight` nav label and `Key insight` heading.
  - `Closing` nav label and `Closing synthesis` heading.
  - Special-case relabeling to `People expansion` for a specific chapter title regex.
- Chapter labels otherwise come from `chapter.railLabel` (payload/template-derived) with fallback to `Chapter N`.
- Reading-rail/mobile section navigation inside report-first renderer uses generated local `sections` state, not global single-domain constants.
- Anchor ids are stable semantic ids (`overview`, `pattern`, `evidence`, `key-insight`, `chapterKey`, `closing`) and are not slugified from visible labels.
- Accessibility strings include fixed labels like `aria-label="Result sections"` and related nav labels, but these are container labels, not per-section content labels.

## 7. Test Findings

- `tests/report-first-result-renderer.test.tsx` asserts specific headings/labels such as `Key insight`, chapter titles, `Closing synthesis`, and `People expansion` behavior.
- Tests assert navigation/section ordering and presence of fixed section markers (`data-report-first-section="..."`).
- These tests currently assume Leadership-oriented section naming and fixed chapter semantics in key places.
- `tests/result-reading-rail.test.tsx` covers generic rail component labels (for non-report-first default rail), asserting fixed top-level labels from constants.
- `tests/ranked-pattern-result-renderer.test.tsx` focuses on ranked-pattern renderer contract; less direct coupling to report-first labels, but asserts nav/aria structures.
- If Decision Style introduced distinct report-first section labels, report-first renderer tests would require fixture + expectation updates, especially where exact strings are asserted.

## 8. Compatibility Findings

- Making labels payload-driven can be backward compatible if fallbacks preserve current Leadership defaults.
- Existing persisted Leadership payloads likely already include compiler-produced `railLabel`/`readerNavigation` in template JSON, but renderer still uses some hard-coded labels for insight/closing and a special-case chapter rename.
- Old payloads missing any future explicit `sectionLabel` field would need fallback behavior.
- Stable anchor ids appear independent of label text, reducing URL fragment breakage risk if labels change.
- Compatibility risk mainly sits in:
  - report-first renderer string assumptions,
  - tests asserting exact labels,
  - any user expectation around visible chapter wording.

## 9. Implementation Options

### Option A — No change

- **Benefit:** zero delivery risk; no renderer/test contract churn.
- **Drawback:** Decision Style cannot express assessment-specific labels cleanly without code changes.
- **Suitability for Decision Style:** poor.

### Option B — Renderer-only dynamic labels with fallback

- **Benefit:** minimal, safe incremental change; keep existing Leadership output while allowing payload labels where provided.
- **Drawback:** section-label contract remains partly implicit; compiler/template inconsistency risk remains.
- **Estimated effort:** low-to-medium.
- **Risk:** low if fallbacks are exact current Leadership labels.

### Option C — Full payload-driven section contract

- **Benefit:** clean long-term architecture; renderer reads explicit canonical ordered sections (`id/order/label/title/blocks`), assessment-specific labels first-class.
- **Drawback:** broader change touching compiler/import/payload typing/fixtures/tests.
- **Estimated effort:** medium-to-high.
- **Risk:** medium unless phased with strong backward-compatible fallback logic.

### Option D — Assessment-specific label map

- **Benefit:** stable section ids retained while allowing per-assessment label overrides.
- **Drawback:** can become a second label system if per-report nuance is needed.
- **Preferable vs per-report labels?:** useful if labels are domain-wide/assessment-wide; less flexible than per-report section labels.

## 10. Recommended Approach

Recommend **Option B** as the safest immediate step, followed by **Option C** once Decision Style report-first compiler/package work begins.

Why:
- preserves live Leadership output,
- avoids scoring/runtime recomputation changes,
- keeps persisted canonical payload rendering model,
- can preserve current anchor ids,
- introduces payload label usage incrementally with exact fallback strings.

## 11. Proposed Follow-Up Task

**RFA-07B — Make report-first section labels payload-driven with Leadership fallbacks**

Scope should:
- preserve current Leadership labels,
- allow payload-provided section labels,
- keep stable section ids and order,
- update report-first reading rail + mobile nav to use payload labels,
- add a Decision Style-oriented fixture proving alternate labels can render,
- avoid scoring/runtime/import scope creep.

## 12. Open Questions

- Should labels live per report section block, or as an assessment-level section label map keyed by stable ids?
- Should public display label and internal authoring label be separate fields?
- Should section ids remain semantic keys (current) plus optional numeric ordering metadata?
- Should old persisted payloads be migrated, or handled permanently with fallback logic?
- Should admin preview render payload labels exactly to catch divergence earlier?
- For Decision Style, should public labels change immediately, or first stage internal reframing with unchanged public labels?
