# Admin Users Row-State Visual Language

## What Changed

The admin user detail page now gives assignment rows a stronger visual state system across both the controls surface and the timeline.

The row presentation now distinguishes:

- editable queued rows
- fixed historical rows
- started historical rows
- completed historical rows
- completed rows with a canonical result link
- safe-removal vs removal-locked rows

## State Differences

Editable rows now use a clearer queued treatment and an explicit `Editable queue` label so they read as still in play.

Fixed and historical rows now use separate visual tones plus state labels such as:

- `Fixed history`
- `Started history`
- `Completed history`
- `Result ready`

Rows with canonical result links also surface a stronger result-ready chip and grouped result affordance without changing the underlying assignment -> attempt -> result path.

## Removal Safety

Removal safety is now surfaced through both row structure and a dedicated removal cue:

- `Safe removal`
- `Removal locked`

The action rail also changes tone so removable queued rows feel distinct from locked historical rows before an admin reads the helper copy.

## Fixture Validation

The completed-result fixture at `qa-completed-user@sonartra.local` was used to validate the result-ready branch against a real persisted completed row with a canonical result link.

Focused tests also keep the completed/result-ready fixture path covered in the admin users list and detail projections.

## Left For Task C

This task does not redesign the list page, change mutation rules, or add broader workflow polish such as richer audit metadata, larger-sequence visualisation, or shell-level interaction refinements.
