# Single-Domain Navigation Production Verification

Date: 26 April 2026

Production route:

```text
https://www.sonartra.com/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48
```

Reference:

- `docs/qa/single-domain-navigation-confidence-pass.md`

Verification method:

- Chrome MCP DevTools against live production.
- Authenticated session: `mark.dunn.uk@gmail.com`.
- Desktop viewport requested: `1440 x 1000` (reported viewport approximately `1442 x 736`).
- Mobile viewport requested: `430 x 900` (reported viewport approximately `500 x 736`).
- Checked computed styles, rail/progress visibility, active-section state, anchor landing offsets, console, and network.

## 1. Production route verified

Yes.

The route loaded successfully and rendered the expected single-domain result:

- H1: `Results-led pattern, reinforced by Process`
- Document request: `GET /app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48` -> `200`

## 2. Desktop rail behaviour

Desktop passed.

Initial desktop computed state:

| Check | Result |
| --- | --- |
| Rail exists | Yes |
| Rail display | `block` |
| Rail position | `sticky` |
| Rail top offset | `91.2px` |
| Mobile progress display | `none` |
| Initial active item | `#intro` |
| Initial `aria-current` value | `true` |

Anchor-click validation:

| Anchor | Section top after click | Active rail item | Active count | Rail position |
| --- | ---: | --- | ---: | --- |
| `#intro` | `60.8px` | `#intro` | 1 | `sticky` |
| `#hero` | `95.9px` | `#hero` | 1 | `sticky` |
| `#drivers` | `96.4px` | `#drivers` | 1 | `sticky` |
| `#pair` | `96.2px` | `#pair` | 1 | `sticky` |
| `#limitation` | `95.7px` | `#limitation` | 1 | `sticky` |
| `#application` | `95.8px` | `#application` | 1 | `sticky` |

Full-scroll checkpoint sequence:

```text
Intro -> Hero -> Drivers -> Pair -> Limitation -> Application
```

At every desktop checkpoint:

- exactly one `a[aria-current="true"]` was present
- exactly one `data-reading-state="current"` item was present
- rail top stayed at the sticky offset
- no flicker or multiple-active state was observed in the programmatic checks

## 3. Mobile progress behaviour

Mobile passed.

Initial mobile computed state:

| Check | Result |
| --- | --- |
| Desktop rail display | `none` |
| Mobile progress display | `block` |
| Progress inner position | `sticky` |
| Initial progress label | `Intro` |
| Initial next label | `Hero` |

Section reach validation:

| Target | Mobile progress after reaching target |
| --- | --- |
| `intro` | `Intro`, up next `Hero` |
| `hero` | `Hero`, up next `Drivers` |
| `drivers` | `Drivers`, up next `Pair` |
| `pair` | `Pair`, up next `Limitation` |
| `limitation` | `Limitation`, up next `Application` |
| `application` | `Application` |

Full-scroll checkpoint sequence:

```text
Intro -> Hero -> Drivers -> Pair -> Limitation -> Application
```

No previous-section lag was observed during the production mobile checks.

## 4. Console and network

Console:

- No console messages were reported by Chrome MCP during this verification pass.
- No hydration errors.
- No render errors.

Network:

- Production result document request returned `200`.
- Result/app RSC requests observed during navigation/prefetch returned `200`.
- No failed result/RSC requests were observed.
- Clerk CDN version redirects returned `307` followed by `200`, which is expected third-party asset/version resolution rather than a result-page failure.

## 5. Screenshots captured

- `docs/qa/screenshots/single-domain-navigation-production-desktop.png`
- `docs/qa/screenshots/single-domain-navigation-production-mobile.png`

## 6. Remaining issues

No navigation-confidence blocker remains from this verification pass.

Residual non-navigation notes:

- Browser title still reports `Sonartra MVP`; this was outside the navigation task.
- The production app still loads Clerk assets from the development Clerk domain. No console warning was emitted in this pass, but production Clerk configuration remains a separate maturity concern from earlier audits.
