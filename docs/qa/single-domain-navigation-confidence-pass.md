# Single-Domain Navigation Confidence Pass

Date: 26 April 2026

Scope:

- UI/UX navigation behaviour only.
- No report language, opening summary, evidence panel, scoring, payload, builder, or route changes.

Target production route for post-deploy check:

```text
https://www.sonartra.com/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48
```

Local validation route used for patched browser QA:

```text
http://localhost:3000/app/results/single-domain/f0df7bf7-4f14-4cb1-9f90-7cb6fa640001
```

The target production result id was not present in the local result dataset, so the patched browser pass used the existing local single-domain QA result. The exact production route should be rechecked after deployment.

## 1. Issues found

- Desktop reading rail could be inspected as effectively static when the outer `nav` scrolled away, because the sticky behaviour lived on the inner panel rather than the rail grid item itself.
- Active-section logic was too conservative near section boundaries. The previous section could remain active until the next section had a large visibility lead.
- Rail active state used `aria-current="location"`; the required confidence pass asked for explicit `aria-current="true"`.
- Anchor clicks relied on default browser hash scrolling and CSS scroll margin. It worked, but section landing was not precise enough to feel deliberate.
- Mobile progress could lag one section behind around `Drivers`, `Pair`, and later boundaries because the old hysteresis preferred the still-visible previous section.

## 2. Fixes applied

- Moved sticky responsibility onto the reading rail `nav` itself:
  - `xl:sticky`
  - `xl:top-[5.7rem]`
  - `xl:self-start`
- Removed the nested sticky wrapper inside the rail panel so sticky behaviour is not constrained by a short inner containing block.
- Changed active rail anchors to use `aria-current="true"`.
- Added explicit anchor click handling through `scrollToResultSection(sectionId)`.
- Anchor clicks now scroll to the target element with a 96px offset for sticky app/header chrome.
- Tuned the active-section hook:
  - denser observer thresholds
  - viewport reading line at 36% height
  - weighted score using visibility, reading-line proximity, and centre proximity
  - smaller hysteresis buffer
  - reading-line pass bonus so the next section becomes active when it is actually reached
  - resize recalculation remains wired through the existing listener

## 3. Before vs after behaviour

Before:

- Rail looked correct at the top but did not reliably remain useful through the report.
- Active state could feel approximate or lagging.
- Mobile progress could report the previous chapter after the next chapter had been reached.
- Anchor clicks worked but were not confidence-building at every section boundary.

After:

- Desktop rail remains visible while scrolling.
- Exactly one active rail anchor is marked with `aria-current="true"`.
- Active state advances in the locked order: Intro, Hero, Drivers, Pair, Limitation, Application.
- Anchor clicks land each section around the intended sticky-header offset.
- Mobile progress updates to the reached section instead of holding the previous section at boundaries.

## 4. Desktop validation

Chrome MCP DevTools local patched route:

- Viewport: approximately `1286 x 736`.
- `data-result-reading-rail="true"` displayed as `block`.
- Rail computed position: `sticky`.
- Rail computed top offset: `91.2px`.
- Mobile progress hidden on desktop.

Anchor-click validation:

| Anchor | Section top after click | Active rail item | Active count |
| --- | ---: | --- | ---: |
| `#intro` | `60.8px` | `#intro` | 1 |
| `#hero` | `95.9px` | `#hero` | 1 |
| `#drivers` | `96.1px` | `#drivers` | 1 |
| `#pair` | `96.0px` | `#pair` | 1 |
| `#limitation` | `96.2px` | `#limitation` | 1 |
| `#application` | `96.4px` | `#application` | 1 |

Scroll checkpoints:

- Active sequence progressed as `Intro -> Hero -> Drivers -> Pair -> Limitation -> Application`.
- No checkpoint produced multiple active rail anchors.
- Rail top remained stable at the sticky offset through anchor and scroll checks.

## 5. Mobile validation

Chrome MCP DevTools local patched route:

- Mobile-sized page: approximately `500 x 736`.
- Desktop rail hidden.
- Mobile progress displayed.
- Mobile progress inner surface rendered.

Section checks:

| Target | Mobile progress after reaching target |
| --- | --- |
| `intro` | `Intro`, up next `Hero` |
| `hero` | `Hero`, up next `Drivers` |
| `drivers` | `Drivers`, up next `Pair` |
| `pair` | `Pair`, up next `Limitation` |
| `limitation` | `Limitation`, up next `Application` |
| `application` | `Application` |

Scroll checkpoints:

- Mobile progress advanced in order: `Intro -> Hero -> Drivers -> Pair -> Limitation -> Application`.
- The previous-section lag observed in the monetizable-ready audit was not reproduced on the patched local route.

## 6. Remaining edge cases

- The exact target production route needs post-deploy confirmation because local validation used the seeded local QA result id.
- Programmatic scroll and click checks were validated; manual touch inertia on a physical mobile device remains a useful final QA step.
- The mobile progress surface is rendered after the opening/hero sequence in the single-domain report flow. This task did not change layout placement, only active-state accuracy.

## Validation commands

- `cmd /c node --test -r tsx tests/use-active-result-section.test.ts`
- `cmd /c node --test -r tsx tests/result-reading-rail.test.tsx`
- `cmd /c node --test -r tsx tests/result-reading-progress.test.tsx`
- `cmd /c node --test -r tsx tests/single-domain-results-report.test.tsx`
- `cmd /c node --test -r tsx tests/result-detail-layout.test.ts`
- `cmd /c npm run lint`
- `cmd /c npm run build`

Notes:

- Initial sandboxed runs for three Node tests hit `spawn EPERM`; reruns with approved execution passed.
- No Chrome console messages were reported during the local patched browser pass.
- Network list showed the local result document request returned `200`.

## Screenshots captured

- `docs/qa/screenshots/single-domain-navigation-confidence-desktop.png`
- `docs/qa/screenshots/single-domain-navigation-confidence-mobile.png`
