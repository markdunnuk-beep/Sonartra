# Premium Generated Preview

This directory contains staged preview PSV files generated from reviewed, approved, or active premium Field Mapping Matrix rows.

These files are authoring QA artifacts only. They must not be treated as production package rows, promoted into package sources, or compiled into the workbook without a separate promotion task.

Generate the preview with:

```powershell
npm run authoring:generate-premium-result-psv -- --input content/authoring/leadership-approach/premium-authoring/field-maps/process_results_people_vision.paired.psv --out content/authoring/leadership-approach/premium-authoring/generated-preview --include-review
```

The preview uses existing reader-first package headers from `content/authoring/reader-first-schema-manifest.ts`. `lookup_key` values are generated as `leadership_approach::pattern::score_shape` for score-shape sections and `leadership_approach::pattern::item_key` for list sections.

TODO: `11_Strengths`, `12_Narrowing`, and `13_Application` currently derive item identity from `quality_notes` markers such as `strength_1`, `narrowing_1`, and `application_1`. Explicit `item_key` and `priority` columns may be introduced later if production generation requires them.
