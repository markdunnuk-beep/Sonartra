# Live Single-Domain Limitation Prefix Verification

Date: 25 April 2026

Target route:

```text
https://www.sonartra.com/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48
```

## Deployment Status

The deployed environment appears to include the limitation prefix fix.

Evidence:

- The live result route rendered the Limitation chapter with `People: The People signal is therefore...`.
- The previous bad rendered string `Vision: The People signal...` was not present in the live page text.
- No result regeneration was required for this verification, which matches the render-time nature of the fix.

This verifies the deployed behaviour from the browser route. It does not independently identify the deployed git SHA.

## Route Status

Live route status:

| Check | Result |
| --- | --- |
| Document request | `200` |
| Page rendered | Yes |
| Result page 500 | No |
| Relevant result/RSC failures | None observed |
| Authenticated session | `mark.dunn.uk@gmail.com` |

## Limitation Prefix Result

Observed Limitation text on desktop and mobile:

```text
People: The People signal is therefore the missing range to develop around this result...
```

Previous bad output:

```text
Vision: The People signal is therefore...
```

Result:

- `Vision: The People signal...`: not present.
- `People: The People signal...`: present.
- Prefix and paragraph now agree.

## Contradiction Checks

Browser text checks on the live page:

| Pattern | Present? |
| --- | --- |
| `Process is the main driver` | No |
| `People is the main driver` | No |
| `Vision is the main driver` | No |
| `Results is the weaker range` | No |
| `Results is underplayed` | No |

The original contradiction patterns remain clear.

## Reading Rail And Disclosure Checks

Desktop:

- Reading rail was present as `nav[aria-label="Report reading navigation"]`.
- Sticky rail child remained visible while scrolling.
- Rail active state updated while scrolling through the report.
- Rail anchor links were present for `Intro`, `Hero`, `Drivers`, `Pair`, `Limitation`, and `Application`.

Disclosure:

- A report disclosure control was found.
- Clicking it changed the disclosure state from closed to open.
- Supporting prose became visible after interaction.

Layout:

- Drivers rendered as a vertical section.
- Application rendered as a vertical section.
- No horizontal overflow observed.

Mobile:

- Mobile reading progress rendered.
- At the Limitation section, progress showed `Now reading: Limitation` and `Up next: Application`.
- No horizontal overflow observed.

## Console And Network Findings

Console:

- One known Clerk development-key warning:

```text
Clerk has been loaded with development keys...
```

- No render errors observed.

Network:

- Result route document request returned `200`.
- Relevant RSC/navigation requests returned `200`.
- No failed result/RSC requests were observed.

## Viewports Checked

Required:

- Desktop: `1440 x 1100` browser window.
- Mobile: `430 x 932` emulated mobile viewport.

Additional observation:

- The browser chrome/tooling reported a smaller inner viewport after desktop resizing, but the live desktop layout and rail behaviour were still inspected at the requested browser window size.

## Remaining Issues

No remaining issue with the Limitation prefix mismatch was observed.

One content-quality note remains outside this task scope: the source driver language matrix still has missing role-specific cells, so the earlier semantic fallback hardening remains important until language coverage is complete.

## Recommended Next Task

Run a short post-deploy smoke audit after this verification is committed:

- result route
- workspace card
- generic result route redirect/compatibility path
- mobile progress
- reading rail anchor navigation

No result regeneration is needed for the limitation prefix fix.
