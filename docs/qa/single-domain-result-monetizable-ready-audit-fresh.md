# Single-Domain Result Monetizable-Ready Audit Fresh

Date: 26 April 2026

Route audited:

```text
https://www.sonartra.com/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48
```

Method:

- Chrome MCP DevTools against live production
- authenticated session as `mark.dunn.uk@gmail.com`
- desktop viewport: `1440 x 1000`
- mobile viewport: `430 x 900`
- DOM snapshots, console inspection, network inspection, scroll/navigation checks, screenshots

## 1. Executive Verdict

This is closer to monetizable than the previous result page, but it is not yet a paid-grade behavioural intelligence product.

The result now has a coherent semantic spine. The pair-aware driver copy is visibly better: Results is correctly framed as the main cause, Process as the reinforcing cause, People as supporting context, and Vision as the missing range. The earlier contradiction problem is gone in the visible report.

The commercial problem is perceived value. The page still spends too much of the first experience acting like an internal app report rather than a premium insight product. A paying user has to read too far before the strongest "this is me" moment lands. The content is intelligent in places, but the presentation and narrative rhythm make it feel assembled, long, and under-edited.

Bluntly: this is now a credible pilot result, not a monetizable product experience. It would impress someone who already knows the work behind it. It would not reliably convince a cold paid user or B2B buyer that the product is worth paying for.

## 2. Monetizable Readiness Score

Score: **6.5 / 10**

Rationale:

- Content correctness and semantic coherence are now strong enough for pilot use.
- The page has premium visual ingredients.
- The first impression, proof of insight, navigation confidence, and editorial compression are not yet strong enough for charging.

## 3. What Is Currently Working

- The Drivers section now has real role-specific intelligence. "Results is the main cause..." and "Vision is the weaker range..." feel much more accurate and valuable than the earlier fallback copy.
- The Limitation section is coherent. "When structure outruns commitment" is the best commercial insight on the page.
- The report has a clear sequence: Intro, Hero, Drivers, Pair, Limitation, Application.
- The dark visual system is premium-adjacent. It has a serious, enterprise feel.
- The generic result route redirects correctly to the canonical single-domain result route.
- No render errors, hydration errors, or failed result/RSC requests were observed.

## 4. What Is Not Currently Working

- Above the fold does not sell the value quickly enough. The first screen is dominated by metadata, app chrome, and explanatory framing.
- The intro is too generic and too long. It explains what leadership is instead of immediately telling the user what their result means.
- The page does not show enough evidence. It makes claims, but does not show why the system reached them.
- The narrative repeats "results, process, progress, structure, people" across sections. The story is coherent, but it is not edited tightly enough.
- The Application section is the weakest commercial section. It reads like reasonable advice, not a premium interpretation.
- Desktop reading rail did not behave as a sticky active navigation during scroll testing. It looked premium at the top, but did not stay useful through the report.
- Mobile progress lagged at section boundaries during programmatic scroll checks.

## 5. First Impression Assessment

What works:

- The product shell looks serious.
- The title "Understand how you lead" is clear.
- The leading pair metadata, "Process and Results", gives a useful first orientation.
- The first Hero card contains a useful personal statement once reached.

What fails:

- The strongest behavioural insight is not visible quickly enough. The user first sees app navigation, date/time/version metadata, then three explanatory paragraphs.
- The metadata row feels like an internal completion receipt. A paid report should lead with insight, not administrative state.
- The first visible body text is generic category framing: "Leadership, in this report, describes..." That is not a premium "this is about me" moment.
- The hero label is lower-case "results and process", which weakens editorial polish.

Severity: **P0 for monetization**

Recommended fix direction:

- Rework the opening into an insight-first result summary.
- Move completion metadata below the primary insight or collapse it into a quieter details row.
- Put the strongest diagnosis in the first viewport: "You tend to turn pressure into visible progress before purpose and human readiness are fully established."
- Make the H1/result identity more specific than "Understand how you lead".

## 6. Perceived Intelligence Assessment

Strongest perceived-intelligence moments:

- "Results is the main cause of this pattern..." is specific and role-accurate.
- "Vision is the weaker range..." is now coherent and commercially useful.
- "When structure outruns commitment" is the strongest section title on the page.
- "The limitation appears when the situation needs more patience, more listening..." feels like real behavioural interpretation.

Weakest perceived-intelligence moments:

- The intro says what the report measures, not what the system learned.
- Application advice is plausible but generic: "Check understanding more directly", "Be more explicit about how the work will be delivered", "Notice when the same issues repeat."
- Several sections reuse the same conceptual ingredients without raising the level of interpretation.
- There is no visible "evidence trail" showing which response pattern, signal rank, or contrast supports the claim.

Examples that weaken trust:

- "This result shows the leadership signals that are most available to you..." reads like product explanation, not insight.
- "What is creating that pattern, including any missing range that matters" feels like placeholder taxonomy.
- "The defining pattern that stands out most clearly in this domain" is accurate but procedural.

Recommended fix direction:

- Add a concise "Why this result was generated" explanation from persisted payload facts: rank order, top pair, and missing range.
- Sharpen Application into situation-specific action: what to do in meetings, planning, pressure moments, delegation, and team alignment.
- Reduce repeated statements and make each section add a new layer: identity, cause, team effect, cost, behavioural practice.

## 7. Narrative Synthesis Assessment

Narrative flow score: **7 / 10**

What works:

- The sections now build in a mostly logical order.
- Hero and Drivers agree.
- Pair and Limitation are coherent with the same Results/Process pattern.
- The People limitation thread is readable and no longer contradicts the visible ranking.

Specific repetition or fragmentation issues:

- Hero and Drivers repeat the same driver claims too closely. The Hero card includes the same Results/Process driver text that appears immediately again in Drivers.
- The Pair section restates "progress and structure" rather than adding enough new synthesis.
- Application repeats general advice about purpose, clarity, and understanding without a strong connection back to the exact limitation.
- The report reads as six stacked modules. It is coherent, but it still feels assembled from blocks.

Sections needing consolidation:

- Intro should be shorter and merged into an opening "How to read this" note below the insight.
- Hero should become the headline diagnosis, not a repeat of Drivers.
- Application needs fewer, sharper actions tied to the limitation.

Recommended fix direction:

- Rewrite the report opening as a single narrative arc.
- Make Hero answer "What is my pattern?"
- Make Drivers answer "Why does it happen?"
- Make Pair answer "What does it create for others?"
- Make Limitation answer "Where does it cost me?"
- Make Application answer "What do I do differently this week?"

## 8. Trust And Credibility Assessment

Trust builders:

- Route returns `200`.
- Generic route redirects with `307` to the canonical single-domain route.
- No failed result/RSC requests observed.
- No render or hydration errors observed.
- The result is internally coherent after the driver-claims regeneration.
- The visual system is serious enough to support trust.

Trust breakers:

- Clerk development-key warning appears in production console. Users do not see it, but it is a real product maturity smell.
- The browser title still says "Sonartra MVP". That weakens product maturity.
- The page shows "Version 1.0.0" and completion metadata prominently, but does not show confidence, evidence, or methodology in a polished way.
- The report has no clear buyer-facing credibility layer: no model explanation, no "based on your response pattern", no signal distribution, no confidence framing.

Console/runtime issues:

- Console warnings only:
  - Clerk development-key warning, twice.
- No console errors.
- No failed document/RSC result requests observed.

Recommended fix direction:

- Remove development Clerk keys from production.
- Replace "Sonartra MVP" title metadata.
- Add a short, premium evidence panel that explains the result basis without exposing internals or recalculating in the UI.

## 9. UX And Navigation Assessment

Desktop findings:

- The reading rail looks premium in the first viewport.
- During scroll checks, the desktop rail did not remain sticky. DOM inspection reported the rail as `position: static`, and its bounding box scrolled out of view.
- No active rail state was detected through accessible attributes during section scroll checks.
- Anchor scroll worked, but section offsets were not perfectly confidence-building: some targets landed low enough that the user may not feel anchored precisely.

Mobile findings:

- Mobile progress is visually useful and present.
- Programmatic scroll checks showed progress lag at section boundaries:
  - scrolling to `drivers` still reported "Hero"
  - scrolling to `pair` still reported "Drivers"
- The mobile first screen is too administrative. It stacks metadata before insight.
- Mobile reading is long but usable. The content is dense, and the user has to commit before the value is obvious.

Boundary/scroll issues:

- Desktop rail currently adds visual polish but not enough navigational confidence.
- Mobile progress is directionally useful, but the active-section threshold needs tuning.

Recommended fix direction:

- Make the desktop rail genuinely sticky and accessible with `aria-current`.
- Tune IntersectionObserver thresholds or section offset logic for mobile.
- Treat navigation as a trust feature: it should tell the user exactly where they are, not approximately.

## 10. Visual And Editorial Polish Assessment

What looks premium:

- Dark canvas, restrained borders, and type scale create a serious tone.
- The reading rail card is visually polished.
- The Limitation card has good visual emphasis.
- The section spacing is calm and not cluttered.

What looks unfinished:

- The first screen feels like an app record, not a premium report.
- The hero pair title "results and process" is lower-case and visually under-edited.
- Several headings are descriptive rather than compelling.
- The report is too card-heavy in places and too linear in others. It lacks a strong summary treatment.
- Application is visually and editorially plain compared with the importance of the section.

Design polish blockers:

- No immediate premium diagnosis module.
- No visual signal/rank summary.
- No strong "takeaway" treatment.
- Repeated paragraph blocks create text fatigue.

Recommended fix direction:

- Add a compact, premium "Your leadership pattern" opening module.
- Add a simple persisted-payload visual: rank order, leading pair, missing range.
- Give Application stronger formatting: three concrete behaviours with context, trigger, and practice.

## 11. Commercial Readiness Assessment

Would this support a paid individual assessment?

Not yet. It would support a controlled pilot where the user already expects rough edges. It does not yet create enough immediate perceived value for a cold paid user.

Would this support B2B buyer confidence?

Partially. The seriousness of the visual system helps. The report logic now makes sense. But buyers will ask: "Why should I trust this interpretation?" The page does not yet answer that strongly enough.

What would make a user say "this is accurate":

- A sharper first-page diagnosis.
- Evidence from their rank pattern.
- More situation-specific examples.
- Application guidance that maps to recognisable workplace moments.

What would make a user say "this feels generic":

- The generic intro.
- Repeated progress/structure phrasing.
- Application advice that could apply to many leaders.
- No visible basis for the claims.

Minimum fix set before monetization:

- Insight-first opening.
- Evidence/trust panel.
- Sharper Application section.
- Sticky/active navigation fix.
- Production maturity cleanup: Clerk key warning and "MVP" title.

Nice-to-have after monetization:

- Export/shareable report.
- Stronger visual signal map.
- Manager/team interpretation layer.
- Optional deeper examples by workplace scenario.

## 12. Ranked P0/P1/P2 Action List

### P0

| Issue | Why it matters commercially | Fix direction | Type |
| --- | --- | --- | --- |
| Above-the-fold is procedural, not insight-first | Paid users decide value in seconds; this delays the payoff | Replace opening with a concise personalised diagnosis and move metadata down | Content / UX |
| No visible evidence basis | Claims feel authored but not proven; buyers need trust | Add a persisted-payload evidence panel: rank order, leading pair, missing range, answered-question basis | Product positioning / UX |
| Application is too generic | Paid value depends on actionable behavioural change | Rewrite Application into concrete workplace behaviours tied to the limitation | Content |
| Production maturity leaks | Clerk dev-key warning and "MVP" title weaken trust | Fix production config/title metadata | Technical / product positioning |

### P1

| Issue | Why it matters commercially | Fix direction | Type |
| --- | --- | --- | --- |
| Desktop rail is not sticky/active during scroll | Navigation should increase confidence, not decorate the page | Make rail sticky, accessible, and section-aware | UX / technical |
| Mobile progress lags section boundaries | Users may not trust where they are in the report | Tune active-section thresholds and offsets | UX / technical |
| Hero repeats Drivers | Repetition makes the report feel assembled | Make Hero a summary diagnosis; leave causality detail to Drivers | Content |
| Pair section does not add enough new insight | The section restates progress/structure | Focus Pair on team impact and relational consequences | Content |
| Lower-case hero pair title weakens polish | It reads under-edited | Use approved display casing consistently | Editorial / design |

### P2

| Issue | Why it matters commercially | Fix direction | Type |
| --- | --- | --- | --- |
| No visual signal summary | Visual proof improves comprehension | Add a compact rank/pair/missing-range visual | Design / UX |
| Long paragraphs create fatigue | Premium reports need scan and depth | Add pull quotes, takeaways, and tighter paragraph rhythm | Editorial / design |
| No export/share path | B2B value often depends on sharing | Add print/PDF/share after core value is fixed | Product |

## 13. Recommended Next Codex Tasks

1. Redesign the single-domain result opening into an insight-first summary without changing payload shape or scoring.
2. Add a persisted-payload evidence panel using existing result fields only.
3. Rewrite Application copy structure so each item has trigger, behaviour, and intended effect.
4. Fix reading rail sticky/active behaviour and mobile progress thresholds.
5. Remove production maturity leaks: Clerk development-key warning and `Sonartra MVP` browser title.

## 14. Screenshots Captured

Captured:

- `docs/qa/screenshots/single-domain-result-audit-desktop.png`
- `docs/qa/screenshots/single-domain-result-audit-mobile.png`

## 15. Console And Runtime Findings

Live route opened:

- canonical route opened directly
- desktop checked at `1440 x 1000`
- mobile checked at `430 x 900`
- console checked
- network checked
- reading rail and mobile progress checked

Runtime findings:

- canonical route returned `200`
- generic route redirect had already been verified in the same live session as `307` to canonical
- no render errors
- no hydration errors
- no failed result/RSC requests observed
- Clerk development-key warning appears in console

Final audit status:

- audit complete
- no code, data, scoring, or payload changes made
