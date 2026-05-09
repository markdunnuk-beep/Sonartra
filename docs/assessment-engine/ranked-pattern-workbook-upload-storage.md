# Ranked-Pattern Workbook Upload Storage

Ranked-pattern workbook uploads are admin/import artifacts only. They are stored in a private Supabase Storage bucket, resolved server-side through a signed storage reference, and converted into database rows by the import workflow. Runtime assessment completion and result rendering do not read workbook files.

## Current Retention Behaviour

- Uploading a replacement workbook selects the new uploaded source for the form.
- Clearing an uploaded workbook removes it from the active form state.
- Clearing does not currently delete the private storage object.
- Uploaded objects must not be deleted if they are tied to an import batch or audit trail.

## Cleanup Plan

Add a guarded cleanup job or admin-only cleanup action before relying on automatic deletion:

- delete only explicit abandoned uploads that are not referenced by import batches;
- keep source name, source hash, bucket, and object path available in audit records;
- never expose public URLs;
- never delete package files associated with published or draft imports unless explicitly requested.
