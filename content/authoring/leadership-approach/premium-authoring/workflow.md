# Premium Authoring Workflow

This workflow governs how Leadership Approach Pattern Dossiers become reviewed PSV rows. It is documentation and authoring process only; it does not change runtime behaviour.

## Required Sequence

1. Create or approve Pattern Dossier.
2. Score Pattern Dossier against the quality rubric.
3. Create score-shape interpretation notes where relevant.
4. Create Field Mapping Matrix.
5. Validate every mapped field has:
   - `source_anchor`
   - `source_excerpt`
   - `transformation_rule`
   - `drift_check`
   - `final_text`
   - `status`
6. Generate staged PSV rows only from approved or reviewed field maps.
7. Render authoring preview report.
8. Run editorial drift audit.
9. Promote approved rows into package source files.
10. Compile workbook.
11. Run package/import validation.
12. Review end-to-end result output before publication.

## Workflow Rules

- No direct editing of production PSV result rows without a corresponding Field Mapping Matrix.
- No active runtime rows should be produced from unsupported or unreviewed field maps.
- No audit/source fields should leak into runtime PSV rows, workbook rows, result payloads, or user-facing result pages.
- Preview reports should be read as end-to-end reader experiences, not just field checks.
- Pattern Dossiers remain the editorial source of truth. PSV fields are derived artifacts.
- The Field Mapping Matrix is the required bridge between dossier interpretation and staged rows.
- Score-shape language may change interpretation, emphasis, and wording, but it must not change scoring, normalized rankings, rank order, or `pattern_key`.
- Runtime result pages, workspace cards, and results lists continue to read persisted payload data only.

## Field Mapping Matrix Requirements

Every matrix row must include:

| field | purpose |
| --- | --- |
| `section_key` | PSV section being mapped. |
| `field_key` | PSV field being authored. |
| `pattern_key` | Ranked signal pattern in rank order. |
| `score_shape` | Shape variant when the section is score-shape-dependent. |
| `source_anchor` | Dossier anchor used as the source. |
| `source_excerpt` | Short excerpt or paraphrased evidence from the dossier. |
| `transformation_rule` | How the source becomes this field. |
| `drift_check` | The semantic drift risk checked for this field. |
| `final_text` | Reviewed field copy. |
| `status` | Draft, reviewed, approved, rejected, or needs_revision. |

Authoring audit fields are not PSV runtime fields. They must be stripped before workbook compilation or package import.

## Stage Boundaries

### Dossier Stage

The dossier must be judged as a complete reader interpretation before field mapping begins. A weak dossier should not be patched through isolated fields.

### Mapping Stage

Each field must retain a visible line back to the dossier. If a field cannot be sourced from the dossier, either update the dossier through review or mark the field as unsupported. Do not invent unsupported active-row copy.

### PSV Staging Stage

Staged PSV rows may be generated only from reviewed or approved maps. Direct production row edits are not allowed because they break lineage and make semantic drift hard to audit.

### Preview Stage

Preview output must be reviewed as a full reader experience. Check whether the result feels coherent from Orientation through Closing Integration, not only whether individual fields validate.

### Promotion Stage

Only approved rows should be promoted into package source files. Promotion is followed by workbook compilation, package/import validation, and end-to-end result review before publication.

## Browser QA Note

Chrome DevTools and/or Playwright are not required for this documentation-only task.

They become relevant later when:

- preview output is rendered in the browser
- package rows are promoted and result pages need visual QA
- full end-to-end result-page checks are performed after workbook import and publish validation

