# Ranked-Pattern Workbook Upload Storage

Ranked-pattern workbook uploads are private admin/import artifacts. They allow production admins to upload a completed `.xlsx` package, audit it, preview it, import it into a draft, and publish the draft without making the workbook public or making runtime depend on workbook files.

Runtime assessment completion and result rendering use database rows and persisted `canonical_result_payload` only.

## Storage Model

Production upload storage uses Supabase Storage with a private bucket:

```text
assessment-import-packages
```

The bucket must be private:

- `public: false`
- no public object URLs
- no anonymous read policy
- server-side service-role access only

The UI may show a safe bucket/object reference for operator confidence, but it must not show a public URL or signed download URL.

## Required Environment

Production requires:

```text
NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
RANKED_PATTERN_WORKBOOK_STORAGE_BUCKET
RANKED_PATTERN_WORKBOOK_MAX_BYTES
RANKED_PATTERN_WORKBOOK_STORAGE_TIMEOUT_MS
```

Recommended values:

```text
RANKED_PATTERN_WORKBOOK_STORAGE_BUCKET=assessment-import-packages
RANKED_PATTERN_WORKBOOK_MAX_BYTES=10485760
RANKED_PATTERN_WORKBOOK_STORAGE_TIMEOUT_MS=15000
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Do not expose it to client components, browser payloads, public logs, screenshots, or committed files.

Redeploy production after changing Vercel environment variables.

## Upload Validation

Server-side upload validation must reject:

- missing file
- non-`.xlsx` file
- empty file
- oversized file
- missing storage configuration

The upload helper computes the SHA-256 source hash from workbook bytes. The client must not be trusted for `sourceHash`, bucket, object path, file size, or content type.

## Source Resolution

The admin workflow resolves workbook sources through the package source resolver:

```text
source reference -> resolved workbook bytes -> sourceName -> sourceHash -> audit/import workflow
```

Supported source kinds:

- constrained package/local reference for development/admin fallback
- private `storage_object` reference for production uploads

Storage object references are signed before form submission and verified by server actions before the resolver reads private bytes. Tampered or expired references must fail with structured inline errors.

## Operator Flow

The production path is:

1. Upload assessment workbook.
2. Confirm file name, file size, and file fingerprint.
3. Check workbook.
4. Preview import.
5. Create draft only when ready to write draft data.
6. Import to draft.
7. Check publish readiness.
8. Publish assessment.

Checking and previewing do not publish. Preview import is non-mutating. Import writes to a draft version only.

## Current Retention Behaviour

- Uploading a replacement workbook selects the new uploaded source for the form.
- Clearing an uploaded workbook removes it from active form state.
- Clearing does not currently delete the private storage object.
- Uploaded objects must not be deleted if they are tied to an import batch, audit trail, draft import, or published package history.

## Cleanup Plan

Before relying on automatic deletion, add a guarded cleanup job or admin-only cleanup action that:

- deletes only explicit abandoned uploads;
- checks that the object is not referenced by import batches or audit records;
- keeps source name, source hash, bucket, and object path available in audit records;
- never exposes public URLs;
- never deletes package files associated with draft or published imports unless explicitly requested.

## Troubleshooting

- Error: `Private workbook storage is not configured for this environment.` Confirm `SUPABASE_SERVICE_ROLE_KEY`, Supabase URL, and bucket env vars are present in production, then redeploy.
- Valid `.xlsx` upload fails. Confirm the bucket exists, is private, and allows the expected MIME type and file size.
- Upload succeeds but audit fails to resolve the source. Confirm the signed storage reference is still valid and the server can read the private object.
- A public URL appears. Treat this as a security defect; remove it from the UI/state immediately.
