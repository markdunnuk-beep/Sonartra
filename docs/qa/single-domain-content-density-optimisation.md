# Single-Domain Content Density Optimisation

## 1. Summary of changes

This pass reduces perceived density in the single-domain report renderer without changing persisted result text, scoring, rankings, payload shape, or the canonical result contract.

The UI now detects long persisted prose blocks and renders the first meaningful sentences directly, with the remaining persisted text available in native expandable detail blocks. The exact stored text remains present in the HTML output; it is only progressively disclosed to reduce reading fatigue.

## 2. Repetition patterns identified

- Hero support paragraphs can repeat the same signal interpretation later in Drivers.
- Drivers can contain dense signal prose where multiple authored variants are concatenated into one paragraph.
- Pair and Limitation can restate themes that have already appeared in Hero and Drivers.
- Application is usually shorter, but can still inherit dense authored statements if language rows are expanded later.

The most visible live issue remains the Blueprint Leadership production payload, where several paragraphs repeat the same signal lead-in and risk framing multiple times.

## 3. Techniques applied

- **Progressive disclosure:** long prose blocks render their leading sentences first and place the remaining persisted text inside accessible `<details>/<summary>` blocks.
- **Chunking:** disclosure content is split into smaller sentence groups so expanded text does not become a single wall of prose.
- **Subtle hierarchy:** disclosure links are visually quiet and secondary, using the existing report tone rather than card-style treatment.
- **Non-destructive preservation:** no sentence is rewritten, deleted, recomputed, or moved into a new payload field.

## 4. Sections affected

- Hero: long supporting paragraphs now show the lead and collapse supporting context.
- Drivers: long driver entries now show the lead and collapse additional driver detail.
- Pair: long pair paragraphs can collapse secondary detail.
- Limitation: long limitation paragraphs can collapse range detail.
- Application: prepared for long statements using the same mechanism, but short action statements remain fully visible.

The reading rail, mobile progress component, section IDs, and six-section order are unchanged.

## 5. Before and after observations

Before this pass, repeated authored variants could appear as dense full-length paragraphs, especially where a signal was described in both Hero and Drivers. This made the page feel longer than the report structure required.

After this pass, readers see the strongest sentence group first and can choose to expand supporting detail. The report still reads as a continuous narrative, but repeated or secondary explanation has less immediate visual weight.

## 6. Accessibility notes

- Disclosure uses native `<details>` and `<summary>`, so it is keyboard accessible without client-side state.
- Hidden supporting content remains reachable and present in the document.
- Focus styling uses the existing Sonartra focus ring.
- Heading hierarchy, landmarks, rail anchors, and mobile progress semantics were not changed.

## 7. Validation results

- Targeted tests passed:
  - `node --test -r tsx tests/single-domain-results-report.test.tsx tests/single-domain-results-smoke.test.tsx tests/single-domain-reading-sections-contract.test.ts tests/result-reading-rail.test.tsx tests/result-reading-progress.test.tsx`
- `npm run lint` passed.
- `npm run build` passed.
- `git diff --check` passed.

Browser validation:

- Local QA route: `http://localhost:3000/app/results/single-domain/f0df7bf7-4f14-4cb1-9f90-7cb6fa640001`
- Exact live target route: `https://www.sonartra.com/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48`

Viewports checked on the local QA route:

- 1440 x 1100
- 1280 x 1000
- 1024 x 1000
- 768 x 1024
- 430 x 932
- 390 x 844

No horizontal overflow was detected. The local QA route returned 200 and rendered disclosure content. The live target route returned 200 at 1440 x 1100, with no horizontal overflow; production will need a post-deploy check to confirm the new disclosure behaviour on the exact target payload.

Console/network:

- Local route showed expected development console messages: React DevTools/HMR and Clerk development-key warnings.
- No render errors were observed.
- Live target route remained healthy.

## 8. Remaining content issues

- The production Blueprint Leadership payload still contains repeated authored prose. This pass makes it less fatiguing to read, but it does not correct the underlying language-row repetition.
- A future content/data task could de-duplicate authored language at the source, but that should be handled separately from this presentation-layer refinement.
- A post-deploy visual QA pass should verify the exact live target route once the commit is deployed.
