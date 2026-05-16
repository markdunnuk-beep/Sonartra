# Legacy Leadership Archive/Unpublish Runbook

## Purpose

Remove the legacy published `Leadership Approach (Single-Domain)` path from live user/admin surfaces without deleting historical data and without publishing the new ranked-pattern draft.

This runbook is intentionally archive-first. Do not hard-delete production assessment, version, attempt, result, response, or assignment rows.

## Safety Rules

- Do not run production SQL until the exact candidate row has been reviewed and approved.
- Do not target any row where `assessment_versions.result_model_key = 'ranked_pattern'`.
- Do not publish the ranked-pattern draft as part of this operation.
- Preserve historical `attempts`, `responses`, `results`, and `user_assessment_assignments`.
- Capture rollback values before any update.

## Deployment Pre-Check

Before any data change, confirm the P15F code is deployed:

1. Admin assessment dashboard has no active legacy builder links.
2. Deprecated builder routes redirect or show the retired state:
   - `/admin/assessments/create`
   - `/admin/assessments/single-domain/new`
   - `/admin/assessments/single-domain`
   - `/admin/assessments/single-domain/leadership-approach/review`
3. Ranked-pattern workflow remains available:
   - `/admin/assessments/ranked-pattern/leadership-approach/workflow`
4. Report-first QA remains available:
   - `/admin/qa/report-first`
5. User assessment inventory is backed by `listPublishedAssessmentInventory`, which filters to `lifecycle_status = 'PUBLISHED'`, `result_model_key = 'ranked_pattern'`, and active assessments.

## Production Pre-Check SQL

Run these read-only queries first.

### 1. Find Leadership Assessment/Version Candidates

```sql
select
  a.id as assessment_id,
  a.assessment_key,
  a.title as assessment_title,
  a.is_active as assessment_is_active,
  a.created_at as assessment_created_at,
  a.updated_at as assessment_updated_at,
  av.id as assessment_version_id,
  av.version,
  av.mode,
  av.result_model_key,
  av.lifecycle_status,
  av.published_at,
  av.created_at as version_created_at,
  av.updated_at as version_updated_at
from assessments a
join assessment_versions av on av.assessment_id = a.id
where a.assessment_key ilike '%leadership%'
   or a.title ilike '%Leadership%'
order by av.created_at desc;
```

Candidate legacy rows normally have:

- `assessment_key = 'leadership-approach'`
- `mode = 'single_domain'`
- `result_model_key is null` or any value other than `ranked_pattern`
- `lifecycle_status = 'PUBLISHED'`
- `published_at is not null`

Do not archive a row where `result_model_key = 'ranked_pattern'`.

### 2. Count Attempts, Responses, And Results

Replace `<LEGACY_ASSESSMENT_VERSION_ID>` after review.

```sql
select
  av.id as assessment_version_id,
  av.version,
  av.mode,
  av.result_model_key,
  av.lifecycle_status,
  av.published_at,
  count(distinct at.id) as attempt_count,
  count(distinct rs.id) as response_count,
  count(distinct r.id) as result_count
from assessment_versions av
left join attempts at on at.assessment_version_id = av.id
left join responses rs on rs.attempt_id = at.id
left join results r on r.attempt_id = at.id
where av.id = '<LEGACY_ASSESSMENT_VERSION_ID>'
group by
  av.id,
  av.version,
  av.mode,
  av.result_model_key,
  av.lifecycle_status,
  av.published_at;
```

### 3. Check User-Visible Assignments

```sql
select
  ua.id,
  ua.user_id,
  ua.assessment_id,
  ua.assessment_version_id,
  ua.status,
  ua.order_index,
  ua.assigned_at,
  ua.started_at,
  ua.completed_at,
  ua.attempt_id,
  ua.created_at,
  ua.updated_at
from user_assessment_assignments ua
where ua.assessment_version_id = '<LEGACY_ASSESSMENT_VERSION_ID>'
order by ua.created_at desc
limit 100;
```

If active assignments exist, decide separately whether to leave them as historical records or close them with a dedicated assignment transition plan. Do not change assignment status in the same transaction unless that plan is approved.

### 4. Confirm Ranked-Pattern Candidate Is Separate

```sql
select
  a.id as assessment_id,
  a.assessment_key,
  av.id as assessment_version_id,
  av.version,
  av.mode,
  av.result_model_key,
  av.lifecycle_status,
  av.published_at,
  count(distinct arp.pattern_key) as ranked_pattern_count,
  count(distinct arft.pattern_key) filter (
    where arft.is_active = true
      and arft.is_publishable = true
  ) as active_report_first_template_count
from assessments a
join assessment_versions av on av.assessment_id = a.id
left join assessment_ranked_patterns arp
  on arp.assessment_version_id = av.id
  and arp.lifecycle_status = 'ACTIVE'
left join assessment_report_first_templates arft
  on arft.assessment_version_id = av.id
where a.assessment_key = 'leadership-approach'
group by
  a.id,
  a.assessment_key,
  av.id,
  av.version,
  av.mode,
  av.result_model_key,
  av.lifecycle_status,
  av.published_at
order by av.created_at desc;
```

Expected ranked-pattern publish candidate remains `DRAFT`, not `PUBLISHED`.

## Archive/Unpublish SQL

Do not run until reviewed and explicitly approved.

This transaction archives exactly one reviewed legacy single-domain row and preserves history.

```sql
begin;

-- Capture rollback values inside the transaction output.
select
  av.id as assessment_version_id,
  av.lifecycle_status as previous_lifecycle_status,
  av.published_at as previous_published_at,
  av.updated_at as previous_updated_at,
  av.mode,
  av.result_model_key
from assessment_versions av
where av.id = '<LEGACY_ASSESSMENT_VERSION_ID>'
for update;

update assessment_versions av
set
  lifecycle_status = 'ARCHIVED',
  published_at = null,
  updated_at = now()
where av.id = '<LEGACY_ASSESSMENT_VERSION_ID>'
  and av.lifecycle_status = 'PUBLISHED'
  and av.published_at is not null
  and av.mode = 'single_domain'
  and coalesce(av.result_model_key, '') <> 'ranked_pattern'
returning
  av.id as assessment_version_id,
  av.version,
  av.mode,
  av.result_model_key,
  av.lifecycle_status,
  av.published_at,
  av.updated_at;

commit;
```

If the `update ... returning` statement returns zero rows, rollback and re-check the candidate. A zero-row update means the guard prevented mutation.

## Optional Assignment Handling

Do not run by default.

If active user assignments must be hidden after separate review, use an approved assignment-specific plan. Current assignment statuses are constrained to:

- `not_assigned`
- `assigned`
- `in_progress`
- `completed`

There is no generic `ARCHIVED` assignment status in the current schema.

## Post-Check SQL

### 1. Legacy Version Is No Longer Published

```sql
select
  a.assessment_key,
  av.id as assessment_version_id,
  av.version,
  av.mode,
  av.result_model_key,
  av.lifecycle_status,
  av.published_at
from assessments a
join assessment_versions av on av.assessment_id = a.id
where av.id = '<LEGACY_ASSESSMENT_VERSION_ID>';
```

Expected:

- `lifecycle_status = 'ARCHIVED'`
- `published_at is null`
- historical rows still exist

### 2. Published User Inventory Does Not Expose Legacy Leadership

This mirrors the production inventory service.

```sql
select
  a.assessment_key,
  a.title,
  av.id as assessment_version_id,
  av.version,
  av.mode,
  av.result_model_key,
  av.lifecycle_status,
  av.published_at,
  count(q.id) as question_count
from assessments a
join assessment_versions av on av.assessment_id = a.id
left join questions q on q.assessment_version_id = av.id
where av.lifecycle_status = 'PUBLISHED'
  and av.result_model_key = 'ranked_pattern'
  and a.is_active = true
group by
  a.assessment_key,
  a.title,
  av.id,
  av.version,
  av.mode,
  av.result_model_key,
  av.lifecycle_status,
  av.published_at
order by a.title asc, a.assessment_key asc;
```

Expected:

- no legacy single-domain Leadership row
- ranked-pattern rows only

### 3. Historical Attempts And Results Remain

```sql
select
  count(distinct at.id) as attempt_count,
  count(distinct rs.id) as response_count,
  count(distinct r.id) as result_count
from attempts at
left join responses rs on rs.attempt_id = at.id
left join results r on r.attempt_id = at.id
where at.assessment_version_id = '<LEGACY_ASSESSMENT_VERSION_ID>';
```

Expected counts should match the pre-check counts.

### 4. Ranked-Pattern Draft Is Unaffected

```sql
select
  a.assessment_key,
  av.id as assessment_version_id,
  av.version,
  av.mode,
  av.result_model_key,
  av.lifecycle_status,
  av.published_at
from assessments a
join assessment_versions av on av.assessment_id = a.id
where a.assessment_key = 'leadership-approach'
  and av.result_model_key = 'ranked_pattern'
order by av.created_at desc;
```

Expected:

- ranked-pattern draft remains `DRAFT`
- no assessment is published by this operation

## Browser Post-Checks

After deployment and after any approved production archive/unpublish:

1. `/admin/assessments` has no active legacy builder CTA.
2. `/admin/assessments/new` shows ranked-pattern as the active path only.
3. `/admin/assessments/create` redirects to `/admin/assessments/ranked-pattern/workflow`.
4. `/admin/assessments/single-domain/new` redirects to `/admin/assessments/ranked-pattern/workflow`.
5. `/admin/assessments/single-domain` shows retired route copy.
6. `/admin/assessments/single-domain/leadership-approach/review` redirects to `/admin/assessments/ranked-pattern/leadership-approach/workflow`.
7. `/admin/assessments/ranked-pattern/leadership-approach/workflow` remains available.
8. `/admin/qa/report-first` remains available.
9. `/app/assessments` does not show the legacy Leadership single-domain start path.

## Rollback SQL

Only use if the archive/unpublish must be reversed.

Use the exact values captured before the update.

```sql
begin;

update assessment_versions av
set
  lifecycle_status = '<PREVIOUS_LIFECYCLE_STATUS>',
  published_at = '<PREVIOUS_PUBLISHED_AT>'::timestamptz,
  updated_at = now()
where av.id = '<LEGACY_ASSESSMENT_VERSION_ID>'
  and av.lifecycle_status = 'ARCHIVED'
  and av.mode = 'single_domain'
  and coalesce(av.result_model_key, '') <> 'ranked_pattern'
returning
  av.id as assessment_version_id,
  av.version,
  av.mode,
  av.result_model_key,
  av.lifecycle_status,
  av.published_at,
  av.updated_at;

commit;
```

Do not roll back P15F code-level builder deactivation unless a separate product decision explicitly reopens legacy builder access.

## Risks And Notes

- If production has active `assigned` or `in_progress` user assignments for the legacy version, archive/unpublish removes it from published inventory but may not automatically remove already-assigned user tasks. Review assignment rows before deciding whether a separate assignment transition is needed.
- Historical result routes may still render old persisted results for users who already completed them. That is expected and should be preserved.
- The ranked-pattern/report-first draft remains separate from this runbook and must not be published here.
- The default production action is archive/unpublish only, never hard delete.
