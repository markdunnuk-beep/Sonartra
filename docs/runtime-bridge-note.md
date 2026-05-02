# Runtime Bridge Note

The live runtime is bridged from admin authoring into user execution through the published assessment version stored in the database.

Bridge points:

1. Published version resolution
   - `lib/server/assessment-attempt-lifecycle-queries.ts`
   - `getPublishedAssessmentSummaryByKey` resolves the current published version for an assessment key.

2. Attempt linkage
   - `lib/server/assessment-attempt-lifecycle.ts`
   - new attempts persist both `assessment_id` and the resolved published `assessment_version_id`.
   - existing attempts keep using their persisted `assessment_version_id` after newer versions are published.

3. Question delivery and response capture
   - `lib/server/assessment-runner-service.ts`
   - `lib/server/assessment-runner-queries.ts`
   - runner questions, response validation, and response persistence all scope through the attempt's linked `assessment_version_id`.

4. Completion
   - `lib/server/assessment-completion-service.ts`
   - completion loads persisted responses for the attempt and executes the shared engine against the attempt's concrete `assessmentVersionId`.

5. Retrieval
   - `lib/server/result-read-model.ts`
   - `lib/server/result-read-model-queries.ts`
   - `lib/server/dashboard-workspace-view-model.ts`
   - result list, detail, dashboard, and workspace read persisted result payloads only; they do not recompute scoring.
   - historical results stay linked to the completed version and are not recalculated when publication changes.
