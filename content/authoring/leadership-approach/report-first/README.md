# Leadership Approach Report-First Track

This folder is a report-first proof-of-concept track for Leadership Approach authoring.

It does not replace the existing ranked-pattern engine in this task. The runner, scoring, normalized ranked signal percentages, and `pattern_key` generation remain unchanged. The existing single-domain ranked-pattern engine still produces one persisted canonical result payload at completion, and result pages, workspace surfaces, and results lists continue to read persisted payloads only.

The report-first model being tested here selects one fully authored premium editorial report by `pattern_key`. For Leadership Approach, the target is 24 canonical premium reports: one report for each ranked signal pattern.

`score_shape` may remain useful metadata or diagnostic context, but it should not drive reader-facing report variation unless future product evidence proves that it adds clear value. This track prioritises report quality, reader usefulness, web readability, and PDF suitability over score-shape complexity.

The first benchmark report is:

```text
process_results_people_vision
```

QA comparison:

- `content/authoring/leadership-approach/report-first/qa/process_results_people_vision-report-first-comparison.md`

No runtime implementation has been changed yet. This track does not add a renderer, schema, import logic, scoring change, admin workflow, result-page behavior, PDF export, workbook compilation, or package PSV change.

The `incoming/` folder is local-only source material for this task. Do not commit `incoming/` or any files under it.
