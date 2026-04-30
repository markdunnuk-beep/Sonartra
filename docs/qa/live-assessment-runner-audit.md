# Live Assessment Runner Audit

Audit date: 2026-04-30  
Primary route: `https://www.sonartra.com/app/assessments/sonartra-leadership-approach/attempts/2aeb545c-190a-4155-afd6-fe7981968334`  
Scope: live single-domain Assessment Runner only. Result pages, admin builder, scoring, persistence design, and result generation were not audited.

## 1. Executive Verdict

Score: **7.4 / 10**

Runner readiness: **NEARLY READY**

No-BS summary: the runner is technically solid and visually calmer than a basic form, but it is not yet a fully premium paid assessment experience. The interaction model works, autosave is reliable, mobile is usable, and the duplicated prompt issue is fixed live. The main blocker is the answer language: many options make the underlying dimensions too easy to infer. The runner still feels more like a structured product workflow than a high-trust behavioural instrument.

Suitable for internal QA: **Yes**  
Suitable for controlled beta: **Yes, with participant caveats**  
Suitable for paid public launch: **Not yet**

## 2. Scorecard

| Area | Score | Verdict |
| --- | ---: | --- |
| First impression | 7.2 | Calm and credible, but the opening copy is functional rather than confidence-building. |
| Layout and visual hierarchy | 7.8 | Strong structure and readable hierarchy. Some app-shell clutter weakens the assessment feel. |
| Question presentation | 8.1 | Prompt appears once, questions are readable, and hierarchy is clear. Helper copy is mechanical. |
| Response option quality | 6.3 | Biggest weakness. Options are balanced visually but too signal-obvious in language. |
| Interaction flow | 8.2 | Selection, next/back, navigator, and review state work cleanly. |
| Autosave and reliability | 8.5 | Autosave status is visible, response POSTs returned `200`, no save failures observed. |
| Mobile usability | 7.6 | Mobile is usable with clear touch targets and compact navigator. Still feels like app chrome plus form. |
| Accessibility basics | 8.0 | Native radios, live save region, button labels, neutral legend. Needs screen-reader verification beyond snapshots. |
| Trust and perceived validity | 6.8 | Credible shell, but the model is exposed through repetitive option patterns. |
| Overall runner readiness | 7.4 | Good controlled beta candidate, not ready for paid public launch. |

## 3. Chrome MCP Evidence

### Routes checked

- Primary live target loaded directly:
  - `https://www.sonartra.com/app/assessments/sonartra-leadership-approach/attempts/2aeb545c-190a-4155-afd6-fe7981968334`
- Final URL after load:
  - `https://www.sonartra.com/app/assessments/sonartra-leadership-approach/attempts/2aeb545c-190a-4155-afd6-fe7981968334`
- No redirect to result page occurred.
- No final completion was submitted.

### Auth state

- Authenticated user shown in shell: `mark.dunn.uk@gmail.com`.
- Visible state included workspace navigation and session identity.

### Viewport checks

| Viewport | State inspected | Result |
| --- | --- | --- |
| Desktop `1440x1000` | First question, selection, next/back, navigator, mid-runner question, review state | Passed core flow. |
| Tablet `768x1024` | Question screen and compact navigator | Passed. Compact navigator opened and exposed all 24 questions. |
| Mobile `390x844` | Question screen and compact navigator | Passed. Prompt count stayed at one, options/progress/autosave remained visible. |

### Visible states

- Initial state: `Question 1 of 24`, `0%`, `Responses saved`.
- After selecting Q1 option A:
  - Autosave moved from `Saving response` to `Responses saved`.
  - Response save request returned `200`.
  - Progress moved to `4%`.
- Mid-runner state checked at Q12:
  - Prompt: `When priorities compete, what matters most to you?`
  - Options visible and selectable.
- Review state reached after answering all 24 questions:
  - `Review Mode`
  - `100%`
  - `Ready to complete`
  - `All questions answered`
  - `Response set complete`
  - `Assessment ready to complete`
  - `Complete Assessment` buttons enabled.

### Console and network observations

- No hydration errors observed.
- No runtime crashes observed.
- No response-save failures observed.
- Response save requests observed:
  - Q1 save: `POST /api/assessments/attempts/2aeb545c-190a-4155-afd6-fe7981968334/responses [200]`
  - Bulk walkthrough saves: repeated `POST /api/assessments/attempts/2aeb545c-190a-4155-afd6-fe7981968334/responses [200]`
- A Clerk warning appeared early in the live console:
  - `Clerk has been loaded with development keys. Development instances have strict usage limits...`
- Clerk handshake redirects (`307`) were observed and resolved to `200`; these were not route failures.
- Chrome MCP snapshots were used as evidence. No screenshot files were saved.

## 4. Runner UI Audit

### Strengths

- The runner uses a clean, restrained dark interface with a clear central question surface.
- The main question heading has good weight and enough breathing room.
- Option cards are readable and comfortable to click.
- Progress, autosave, and current question position are always visible.
- The desktop navigator gives useful orientation without taking over the page.
- The review state is clear and prevents accidental final submission by keeping completion as an explicit action.

### Weaknesses

| Severity | Issue | Evidence |
| --- | --- | --- |
| P1 | The app shell competes with the assessment experience. | Persistent sidebar includes Workspace, Assessments, Voice Assessment, Results, Settings, and Admin for this audit identity. This reads like a product dashboard, not a focused paid assessment room. |
| P1 | The opening copy is too operational. | `Work through each question in order. Responses save automatically as you go.` is useful, but it does not build trust, confidentiality, or behavioural assessment seriousness. |
| P2 | Repeated operational labels make the page feel system-generated. | `ASSESSMENT RUNNER`, `SONARTRA LEADERSHIP APPROACH`, `In Progress`, `Question 1 of 24`, `LEADERSHIP APPROACH`, `QUESTION 1 OF 24` appear in close proximity. |
| P2 | The navigator legend is useful but visually technical. | `CURRENT / COMPLETE / INCOMPLETE` and 24 numbered buttons are practical, but they reinforce workflow mechanics more than assessment immersion. |

## 5. Runner UX Audit

### Selection flow

- Selecting an option immediately marks it selected.
- Native radio state is preserved when moving back and forward.
- Option cards have adequate hit areas.
- The selected state is visually obvious.

### Autosave

- Autosave text is visible in the status row.
- It changed from `Saving response` to `Responses saved` after selection.
- Save requests returned `200`.
- No `Needs attention` state appeared during the audit.

### Progress

- Progress moved from `0%` to `4%` after the first answered question.
- Review state reached `100%`.
- Desktop navigator also changed from `0/24` to `24/24`.

### Navigator

- Desktop navigator worked for direct jumps.
- Tablet/mobile compact navigator opened correctly and exposed question buttons.
- Labels distinguish current, answered, and unanswered questions.

### Review and completion state

- Review state is functional and commercially important.
- It says review remains available before completion.
- Complete action is explicit and not accidentally triggered during normal navigation.
- Final completion was not submitted in this audit.

## 6. Question and Response Language Audit

### Strongest examples

- Q4: `In meetings, how do you tend to lead?`
  - Good behavioural context.
  - Options are plausible and not obviously negative.
- Q16: `When your plan is challenged, what is your instinct?`
  - Good situational framing.
  - Forces a realistic leadership trade-off.
- Q23: `When something goes wrong, what do you focus on first?`
  - Concrete and easy to answer.
  - Strong fit for a behavioural assessment.

### Weakest examples

- Q2: `How do you define success for your team?`
  - Options expose the model too directly:
    - `Work runs in a consistent way`
    - `Effort leads to clear outcomes`
    - `People grow and stay engaged`
    - `Work moves in the right direction`
- Q6: `What do you tend to emphasise with your team?`
  - Options are almost direct signal labels:
    - `Where the work is heading`
    - `How the work should run`
    - `What needs to be delivered`
    - `What people need to contribute`
- Q10: `How would others describe your leadership style?`
  - The response set again exposes the dimensions:
    - `Clear about how work should run`
    - `Focused on what needs to be delivered`
    - `Attentive to what people need`
    - `Focused on where things are heading`
- Q17: `When time is tight, what do you adjust first?`
  - The options are more revealing and less attractive:
    - `Spend less time checking in with people`
    - `Reduce detail around how the work runs`
    - `Limit discussion and move the work forward`
    - `Spend less time on the wider direction`
  - This is probably the least premium item. It risks making users feel judged or pushed into an obviously bad answer.

### Signal obviousness

This is the largest monetisation problem. Across the set, the user can infer the four dimensions quickly:

- people/support/contribution
- process/organisation/ways of working
- results/outcomes/delivery/progress
- direction/purpose/bigger picture

That pattern repeats often enough that the assessment becomes visibly scoreable. A paid behavioural product needs users to feel they are making meaningful situational choices, not selecting a trait bucket.

### Option balance

- Visually, option cards are balanced.
- Linguistically, many options are too symmetric. They sound like the same four levers rewritten repeatedly.
- Some options are obviously more desirable than others. Example: `People grow and stay engaged` sounds warmer and more mature than `Work runs in a consistent way`.
- Q17 contains several options that sound like compromises or deficiencies, not equally valid leadership instincts.

### Recommendations

- Rewrite option sets as situational behaviours, not dimension labels.
- Avoid repeated stems like `what people need`, `how the work should run`, `what needs to be delivered`, `where the work is heading`.
- Make every option feel professionally defensible.
- Hide the scoring model inside realistic trade-offs.
- Keep the questions that are situational and concrete; rewrite the options first.

## 7. Accessibility Audit

### What passes

- Question title is a semantic heading.
- The question region uses `aria-labelledby="runner-question-title"`.
- Options are native radio inputs, not hand-rolled role controls.
- Fieldset legend no longer repeats the full prompt; it reads `Response options`.
- Autosave status is in a polite live region.
- Navigator buttons have descriptive labels such as `Jump to question 12, current, unanswered`.
- Complete action has an explicit aria label: `Complete the assessment and submit your responses`.
- Mobile touch targets are large enough in observed snapshots.

### What needs checking or fixing

- Run a real screen-reader pass. Chrome snapshots prove structure, not full assistive technology behaviour.
- The visible page contains two `h2` headings in review state: `Ready to complete` and the active question. This is not wrong, but review mode should be checked for heading navigation clarity.
- Focus order starts in the global shell. For a focused assessment experience, consider a skip/focus strategy that lands users closer to the runner content.
- The compact navigator exposes many numbered controls; it is accessible, but potentially noisy.

## 8. Technical Reliability Audit

### Console

- No hydration/runtime errors observed.
- No route crash observed.
- Early live console warning: Clerk development keys are loaded. This is not visible to normal users, but it is commercially concerning on `www.sonartra.com`.

### Network

- Primary document route returned `200`.
- Clerk handshake redirects resolved.
- Response autosave POSTs returned `200`.
- No failed save request observed.

### Autosave requests

- Selection writes to:
  - `/api/assessments/attempts/2aeb545c-190a-4155-afd6-fe7981968334/responses`
- Observed response status:
  - `200`
- UI status:
  - `Saving response` then `Responses saved`.

### Route stability

- The route remained stable across desktop, tablet, and mobile viewport changes.
- Direct navigator jumps did not crash or redirect.
- Review state did not auto-submit or redirect.

### Tests and build

- `cmd /c node --import tsx --test tests\assessment-runner-ux.test.ts`
  - Passed: 18/18.
- `cmd /c node --import tsx --test tests\single-domain-completion.test.ts tests\assessment-completion-error-copy.test.ts`
  - Passed: 20/20.
- `cmd /c npm run build`
  - Passed.
- `cmd /c npm run lint`
  - Failed only on known unrelated blockers:
    - `app/(admin)/admin/diagnostics/single-domain-language/[assessmentKey]/page.tsx`: JSX inside try/catch.
    - `scripts/audit-single-domain-pair-coverage.ts:204`: unused eslint-disable warning.

## 9. Monetisation Blockers

### P0

None observed. The runner can be completed, autosave works, and the review state is reachable.

### P1

1. **Options are too signal-obvious.**  
   Users can infer the scoring dimensions. This materially weakens trust in the assessment.

2. **Opening/context copy is not strong enough for a paid behavioural product.**  
   It explains mechanics, but not confidentiality, how to answer, or why the choices are meaningful.

3. **Production appears to load Clerk development keys.**  
   Console warning observed on `www.sonartra.com`. Even if not user-visible, this is not acceptable for paid launch.

4. **The runner still feels like an app workflow in places.**  
   Sidebar, repeated operational labels, and dense navigator mechanics reduce the premium assessment feel.

### P2

1. Helper text is generic:
   - `Answer the current question to keep moving through the assessment.`
2. Review state copy is clear but slightly repetitive:
   - `All responses are in place`
   - `All questions answered`
   - `Response set complete`
   - `Assessment ready to complete`
3. Navigator labels are useful but visually procedural.
4. The page repeats `Assessment runner` and assessment title in several nearby locations.

### P3

1. Consider a subtle confidentiality or response-quality cue.
2. Consider richer transition copy after completing a section.
3. Consider a less app-like focused runner mode for paid users.

## 10. Priority Fix Plan

### Immediate fixes

1. Replace Clerk development keys in production, or verify the warning is expected in this environment and not present in paid deployment.
2. Rewrite the weakest option sets, especially Q2, Q6, Q10, and Q17.
3. Replace generic helper text with a calmer instruction:
   - Example: `Choose the response that best reflects your usual pattern, not the answer you think is ideal.`

### Before paid beta

1. Rewrite all options that directly expose the four dimensions.
2. Add a concise trust cue near the start:
   - Confidentiality.
   - No right answer.
   - Answer for usual behaviour, not aspiration.
3. Reduce repeated operational labels in the main runner panel.
4. Verify normal non-admin user shell does not show admin navigation.
5. Run a screen-reader pass through first question, navigator, autosave, and review mode.

### Before public launch

1. Create a focused paid-runner shell that reduces dashboard navigation during the assessment.
2. Add editorial QA for every option set to ensure all options are equally defensible.
3. Add analytics or audit logging for save failures and abandon points.
4. Run real-device mobile QA, not just browser emulation.

## 11. Final Recommendation

Internal QA: **Suitable now.**

Controlled beta: **Suitable after the production Clerk warning is resolved or explained, and with the understanding that option language still needs refinement.**

Paid public launch: **Not suitable yet.**

The product mechanics are close. The commercial gap is not the React runner or autosave path; it is the perceived validity of the assessment language and the amount of dashboard machinery around the assessment. Fix the signal-obvious option writing and strengthen trust framing before asking customers to pay for this experience.
