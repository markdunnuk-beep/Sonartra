# Premium Result Previews

This directory contains markdown-only authoring previews rendered from staged premium preview PSV rows.

These reports are local reading artifacts. They are not production package rows, runtime payloads, or result-page UI output.

Generate the current paired benchmark preview with:

```powershell
npm run authoring:render-premium-result-preview -- --generated-dir content/authoring/leadership-approach/premium-authoring/generated-preview --pattern-key process_results_people_vision --score-shape paired --out content/authoring/leadership-approach/premium-authoring/previews/process_results_people_vision.paired.preview.md
```
