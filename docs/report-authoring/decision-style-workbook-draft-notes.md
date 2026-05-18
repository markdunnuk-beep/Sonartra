# Decision Style Workbook Draft Notes

The Decision Style workbook draft is generated from the source PSV package in:

`content/assessment-packages/decision-style/`

The generated `.xlsx` is a reproducible local artifact, not source. It should not be committed through Codex Cloud.

Generate it locally with:

```bash
npx tsx scripts/authoring/generate-decision-style-clean-workbook.ts
```

Generated workbook path:

`content/assessment-packages/decision-style/sonartra_report_first_fully_authored_DECISION_STYLE_DRAFT.xlsx`

The workbook follows the clean RFA sheet model and preserves the final Decision Style signal model:

- `evidence`
- `judgement`
- `standards`
- `practicality`

The workbook is not production import-ready yet. `06_Report_Templates` contains structurally valid placeholder `report_body_json` rows only, with draft placeholder section metadata and Decision Style section labels.

Next task remains:

**RFA-11 - Create Decision Style benchmark report brief**
