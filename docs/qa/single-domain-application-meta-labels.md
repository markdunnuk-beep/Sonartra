# Single-Domain Application Meta Labels

## What changed

- Updated the Application panel headers in the UI layer only.
- Replaced the visible labels with:
  - `Where to Lean In`
  - `Where to Stay Alert`
  - `Where to Grow`
- Added UI-only micro-subtitles under each title:
  - `The strengths you can rely on most when it matters.`
  - `Early signs to watch so performance doesn't drift.`
  - `The next areas to focus on to strengthen your effectiveness.`
- Kept the persisted Application body content rendering exactly as before.

## What was preserved

Confirmed unchanged:

- scoring
- normalization
- result payload shape
- authored language content
- section ownership
- section order
- anchors
- routes
- evidence logic
- reading rail logic
- persisted result content

No UI-side recomputation was introduced.

## Number badge styling retained

The existing circular `01` / `02` / `03` number badge system was preserved.

Retained:

- circular badge shape
- existing border/background treatment
- existing colour treatment
- existing number rendering path
- existing badge positioning with only minor adjacent heading layout support

## Before vs after observations

Before:

- Panel headers relied on the plain labels `Rely on`, `Notice`, and `Develop`.
- The panels were structurally stronger than the previous flat prose treatment, but the header language still read like internal guidance labels.

After:

- Panel headers now read like practical report guidance rather than internal system labels.
- The subtitle line improves orientation without changing the underlying advice.
- The existing numbered badges still carry the panel sequence and visual anchor.

## Mobile observations

Verified at `390px` and `430px`.

- Number badge remains aligned with the title/subtitle block.
- Titles wrap cleanly when needed.
- Subtitles wrap cleanly and remain secondary.
- No horizontal overflow.
- No clipping or cramped panel behaviour.
- Application body text remains unchanged and readable.
- Mobile progress still updates correctly through the final section.

## Desktop observations

Verified at `1280px` and `1440px`.

- Badge treatment remains unchanged.
- Title/subtitle hierarchy is clear without becoming louder than the report opening.
- Application section still reads as a restrained closing section.
- Reading rail remains aligned and unaffected.

## Validation results

Passed:

- `cmd /c node --test -r tsx tests/single-domain-results-report.test.tsx tests/single-domain-reading-sections-contract.test.ts tests/single-domain-results-view-model.test.ts`
- `cmd /c npm run lint`
- `cmd /c npm run build`

Browser QA on local result:

- URL: `http://localhost:3000/app/results/single-domain/f0df7bf7-4f14-4cb1-9f90-7cb6fa640001`
- No console errors
- No runtime errors
- No failed result-page requests
- No overflow
- No clipping
- Reading rail still works
- Mobile progress still works

## Screenshots

Before:

- `docs/qa/screenshots/single-domain-application-meta-before-desktop.png`
- `docs/qa/screenshots/single-domain-application-meta-before-mobile.png`

After:

- `docs/qa/screenshots/single-domain-application-meta-after-desktop.png`
- `docs/qa/screenshots/single-domain-application-meta-after-mobile.png`

## Remaining issues

- None found in this pass.
