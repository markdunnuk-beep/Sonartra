# Admin Assignment Controls Hardening Notes

1. Visibility and hardening changes added
- assignment control rows now show explicit eligibility, execution, attempt, and result visibility
- the controls header now explains both the overall mutation rule and where the editable queue begins
- successful mutations now return a restrained confirmation message after the canonical redirect and re-read

2. How mutation eligibility is surfaced
- each assignment row now shows an eligibility label:
- `Editable`
- `Fixed sequence`
- `History locked`
- move and remove controls remain disabled where the rule set blocks them

3. How blocked-state reasons are shown
- non-editable rows now surface concise reasons derived from canonical persisted state, including:
- `Started - cannot reorder or remove.`
- `Completed - history locked.`
- `Result exists - history locked.`
- `Historical row - fixed in sequence.`

4. How result and attempt QA visibility is exposed
- each assignment row now shows:
- execution state
- whether an attempt is linked
- whether a result is linked
- a canonical result link chip when the persisted result is available

5. Post-mutation feedback pattern chosen
- create, reorder, and remove actions redirect back to the admin user detail page with a small success marker in the query string
- the page then re-renders from canonical persisted state and shows a restrained success notice:
- `Assignment added.`
- `Sequence updated.`
- `Assignment removed.`
- blocked and invalid actions continue to return inline server-action error messaging without mutating state

6. Intentionally deferred to Task 8
- full audit logging
- broader admin QA inspection tooling beyond assignment, attempt, and result linkage visibility
- any additional mutation capabilities beyond the existing safe assignment controls
