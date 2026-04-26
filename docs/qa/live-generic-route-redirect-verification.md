# Live Generic Route Redirect Verification

Date: 26 April 2026

Target result ID: `7caefdbf-ee98-47c7-bd21-33484e1cec48`

Generic URL checked:
`https://www.sonartra.com/app/results/7caefdbf-ee98-47c7-bd21-33484e1cec48`

Canonical URL checked:
`https://www.sonartra.com/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48`

## 1. Redirect Result

Pass.

The generic route did not render the legacy generic result page directly. Browser navigation produced a document request to:

`GET /app/results/7caefdbf-ee98-47c7-bd21-33484e1cec48`

The response was `307` with:

`location: /app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48`

This confirms a server-side redirect rather than a client-only content swap.

## 2. Final URL Landed On

Pass.

Final browser URL:

`https://www.sonartra.com/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48`

The canonical route returned `200`.

## 3. Canonical Render Status

Pass.

The canonical single-domain report rendered correctly for the authenticated production session.

Observed report state:

- Report title: `Understand how you lead`
- Assessment: `Blueprint - Understand how you lead`
- Leading pair: `Process and Results`
- Six-section report order present: Intro, Hero, Drivers, Pair, Limitation, Application
- Drivers section rendered as its own vertical report section
- Application section rendered as its own vertical report section
- Limitation prefix remained correct: `People: The People signal is therefore the missing range to develop around this result.`

No regression was observed in the previously fixed Drivers, Application, or Limitation presentation.

## 4. Legacy Content Check

Pass.

The following legacy generic-route strings were not present in the rendered page:

- `Domain chapters`
- `No persisted domain summaries are available for this result`
- `Start here`
- `Read this first`

## 5. Interaction Checks

Pass.

Desktop check:

- Reading rail rendered as a sticky desktop rail.
- Rail remained sticky while scrolling.
- Active rail state updated during scrolling.
- At the top of the report, the active item was `01 Intro`.
- Near the bottom of the report, the active item updated to `06 Application`.

Disclosure check:

- Supporting disclosure controls were present:
  - `Read supporting context`
  - `Read more about primary driver`
  - `Read more about supporting context`
  - `Read more about range limitation`
- Opening `Read supporting context` toggled the disclosure from closed to open.

Mobile check at emulated `430px` viewport:

- Desktop rail was hidden.
- Mobile progress rendered.
- At the top, mobile progress showed `Currently reading step 1 of 6: Intro. Up next: Hero.`
- At the bottom, mobile progress updated to `Currently reading step 6 of 6: Application.`

## 6. Console And Network Findings

Pass.

Console:

- No render errors were observed.
- Only Clerk development-key warnings were present:
  - `Clerk has been loaded with development keys. Development instances have strict usage limits...`

Network:

- Generic result document request returned `307`.
- Canonical single-domain document request returned `200`.
- No failed result or RSC requests were observed.
- Clerk script version redirects returned `307` before resolving to `200`; these were not result-route failures.

## 7. Regressions

No regressions found.

## 8. Final Status

Complete.

The deployed generic result route now server-redirects to the canonical single-domain report and no longer renders the legacy generic view for this result.
