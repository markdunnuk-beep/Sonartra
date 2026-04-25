# Generic Result Route Single-Domain Compatibility

Date: 25 April 2026

Target result:

- `result_id`: `7caefdbf-ee98-47c7-bd21-33484e1cec48`

Routes:

- Generic route: `https://www.sonartra.com/app/results/7caefdbf-ee98-47c7-bd21-33484e1cec48`
- Canonical single-domain route: `https://www.sonartra.com/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48`

## Root Cause

The generic result route loaded the persisted result through the shared result read model, but it always continued into the older generic report renderer.

The result read model already detects single-domain payloads and exposes:

- `detail.mode === 'single_domain'`
- `detail.singleDomainResult`

However, `app/(user)/app/results/[resultId]/page.tsx` did not branch on that mode before constructing the generic report view. As a result, single-domain results rendered through the compatibility projection and showed older generic sections such as `Domain chapters`, `No persisted domain summaries are available for this result`, `Start here`, and `Read this first`.

## Chosen Approach

Chosen approach: **server-side redirect**.

When the generic route loads a result whose read model mode is `single_domain` and whose `singleDomainResult` payload is present, it now redirects to:

```text
/app/results/single-domain/${resultId}
```

This keeps one single-domain rendering contract: the existing canonical single-domain report route.

## Files Changed

- `app/(user)/app/results/[resultId]/page.tsx`
- `tests/single-domain-result-route-auth.test.ts`
- `docs/qa/generic-result-route-single-domain-compatibility.md`

## Tests Added

Added a route source regression in `tests/single-domain-result-route-auth.test.ts`.

The test asserts that:

- the generic route imports `redirect`
- the route still loads persisted result detail through `getAssessmentResultDetail`
- single-domain read-model results redirect to `/app/results/single-domain/${resultId}`
- the older generic renderer remains present for non-single-domain results

Existing result URL helper coverage in `tests/assessment-mode.test.ts` already asserts:

```text
getAssessmentResultHref('result-1', 'single_domain') === '/app/results/single-domain/result-1'
```

## Generic Route Result

Expected behaviour after deployment:

- `/app/results/7caefdbf-ee98-47c7-bd21-33484e1cec48` redirects to `/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48`.
- The older generic result view should no longer render for this single-domain result.
- The generic renderer remains available for non-single-domain results.

Pre-deploy browser note:

- The patch has not been deployed from this workspace during this task.
- A local browser check against `localhost:3000` for the live target result returned a local `404`, so it could not prove the post-fix route behaviour for the production record in the local browser session.
- The previous live smoke audit remains the baseline for deployed behaviour before this fix: production generic route returned `200` and rendered the older generic result view.

## Canonical Route Result

The canonical single-domain route code was not changed.

The canonical route continues to be the only single-domain report renderer:

```text
/app/results/single-domain/${resultId}
```

Targeted report tests still pass, including:

- six-section single-domain report rendering
- vertical Drivers layout
- vertical Application layout
- Limitation prefix regression
- single-domain smoke detail rendering

## Workspace Status

Workspace links were not changed.

The previous smoke audit confirmed the workspace target card and latest result already point to:

```text
/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48
```

No workspace code changes were required.

## Validation

Passed:

```text
cmd /c node --test -r tsx tests/single-domain-result-route-auth.test.ts
cmd /c node --test -r tsx tests/single-domain-results-report.test.tsx
cmd /c node --test -r tsx tests/single-domain-results-smoke.test.tsx
cmd /c node --test -r tsx tests/result-read-model.test.ts
cmd /c npm run lint
cmd /c npm run build
```

Notes:

- `tests/single-domain-result-route-auth.test.ts` and `tests/result-read-model.test.ts` initially hit the known sandbox `spawn EPERM` issue and passed when rerun outside the sandbox.
- `next-env.d.ts` was restored after `next build` updated its generated route type reference.

## Remaining Issues

- Live production still needs deployment of this patch before the generic route behaviour can be verified in the browser.
- After deployment, rerun the generic URL directly and confirm it redirects to the canonical single-domain URL.

## Recommended Next Task

Deploy this route compatibility fix, then run a focused live verification:

1. Open `/app/results/7caefdbf-ee98-47c7-bd21-33484e1cec48`.
2. Confirm the browser lands on `/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48`.
3. Confirm the page renders the canonical single-domain report.
4. Confirm the old generic strings `Domain chapters`, `No persisted domain summaries are available for this result`, `Start here`, and `Read this first` are absent.
