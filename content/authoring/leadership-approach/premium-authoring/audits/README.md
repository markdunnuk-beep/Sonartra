# Premium Language Drift Audits

This directory contains deterministic, local-only editorial drift audit reports for premium Leadership Approach authoring outputs.

Run the current paired benchmark audit with:

```powershell
npm run authoring:audit-premium-language-drift -- --dossier content/authoring/leadership-approach/premium-authoring/pattern-dossiers/process_results_people_vision.md --field-map content/authoring/leadership-approach/premium-authoring/field-maps/process_results_people_vision.paired.psv --generated-dir content/authoring/leadership-approach/premium-authoring/generated-preview --out content/authoring/leadership-approach/premium-authoring/audits/process_results_people_vision.paired.audit.md
```

Warnings do not block authoring QA. Errors must be fixed before generated preview output is used for promotion work.
