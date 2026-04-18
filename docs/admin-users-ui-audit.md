# Admin Users UI Audit

## Executive Verdict

The current admin Users UI needs meaningful refinement before Task 6 adds assignment mutation controls.

The pages are directionally strong on desktop styling, labeling, and basic accessibility structure, but they are not yet safe enough for control-heavy use because:

- the list page remains a wide data table at tablet and narrow widths and forces horizontal overflow
- the detail page primary identity block breaks on long email-only identities and can visibly overflow its hero card
- the detail page repeats state information while placing the future controls section too late in the reading order

Desktop presentation is close. Responsive operational clarity is not.

## Findings By Page

### `/admin/users`

What works:

- Desktop visual language matches the existing admin shell well: dark panels, clear section headers, restrained badges, and a sober control-surface tone.
- The page title and supporting copy are concise and operational.
- Search and select inputs are labeled correctly and easy to understand.
- Status and progress badges are easy to parse on desktop.
- The view stays on persisted internal data and does not feel like a consumer CRM.

What breaks or weakens the page:

- The page relies on a full-width table even at tablet and narrow mobile widths. In live inspection the page overflowed horizontally at both roughly `822px` and `500px` viewport widths, with document width expanding to roughly `1338px` and the table to roughly `1495px`.
- On narrow widths, the right side of the table is clipped and the action area is no longer safely scannable without horizontal scrolling.
- The filter form and the filter chips duplicate the same controls. On mobile this adds visual weight before the user reaches the actual registry.
- The current hierarchy puts a large page hero, then a second large registry block, then a wide table. It reads well on desktop, but it becomes long and noisy on smaller widths before the primary data appears.
- The long placeholder email row demonstrates that the first column can become visually muddy. The duplicated email line dominates the row while the meaningful status and next-step fields recede.
- The action label `View user` is understandable, but in a future control-oriented flow it is too soft to carry primary operational meaning from the list.

### `/admin/users/[userId]`

What works:

- The page clearly presents itself as an internal operational record rather than a dashboard.
- The empty-state copy for timeline and deferred controls is factual and appropriately constrained.
- The current, next, and last-activity concepts are easy to understand.
- The vertical section order is logical at a high level: identity, state, timeline, controls.
- The back link is clear and appropriately placed.

What breaks or weakens the page:

- The primary identity card does not handle long email-only records safely. In live desktop and narrow-width inspection, the `h1` string visibly overflowed the hero card and overwhelmed the rest of the card content.
- The page duplicates state information across the hero metrics row and the separate `Current and next state` section. That repetition consumes space that Task 6 will need.
- The controls placeholder sits too low in the page. Mutation controls should appear before the timeline they affect, not after the user has already scrolled through read-only history.
- The hero card mixes identity, status chips, explanatory copy, and four summary metrics, but the long identifier can dominate all of it. The card needs stronger constraint rules and clearer separation between primary identity and supporting metadata.
- The timeline section is structurally fine for an empty state, but it is visually too passive for future editable sequencing. It does not yet establish a strong “ordered records” pattern that can absorb drag, reorder, assign, or result actions later.
- On narrow widths the page remains readable, but the long identity string still produces obvious overflow pressure and reduces confidence in the layout.

### Shared Admin Shell

What works:

- The shell has a strong, consistent enterprise-admin tone.
- Active nav state is obvious.
- The shell heading strip is consistent across list and detail pages.
- The mobile shell exposes an explicit sidebar toggle and keeps the page title area visible.

What breaks or weakens the shell:

- The shell contributes to page-level horizontal overflow at narrow widths. During inspection, the document stayed wider than the viewport even when the mobile navigation pattern was active.
- The mobile drawer overlay looked visually consistent, but the page still exposed horizontal scroll beneath it, which makes the shell feel less controlled than it should.
- The shell top bar consumes meaningful vertical space on mobile before the actual page content begins.
- Sidebar item secondary descriptions truncate aggressively. That is acceptable visually, but it means the shell should not carry too much explanatory burden.

## Prioritised Issues

### Critical Before Task 6

- Fix the list page responsive table failure. The current registry is not operationally safe on tablet or narrow mobile widths because key columns and actions are pushed off-screen.
- Fix long-identity overflow on the detail page hero. If an admin cannot reliably read the target user identity at the moment they are about to mutate assignment state, the page is not ready for controls.
- Remove page-level horizontal overflow in the shared shell and admin users pages. Control UIs should not launch into layouts that already require lateral scrolling to stay oriented.

### Recommended Before Task 6

- Move the controls section higher on the detail page so actions sit before the timeline.
- Reduce duplicated state presentation on the detail page so the future controls block has room without creating a long, repetitive page.
- Simplify list-page filters on narrow widths by reducing duplication between the form controls and chip links.
- Strengthen the list page first column so identity is easier to scan when names are missing and only long emails are available.
- Strengthen the future timeline pattern before it becomes editable by giving ordered records more explicit row framing and state emphasis.

### Nice-To-Have Later

- Tighten page-copy labels so the list page feels more explicitly like assignment operations rather than a general user registry.
- Revisit whether `Current assessment position` is the best heading once mutation controls exist; `Assignment state` may be clearer.
- Add stronger empty-state guidance after Task 6 lands so no-assignment records point directly to the new action surface.

## Specific Recommendations

### `/admin/users`

- Convert the registry into a responsive admin list pattern instead of a single persistent wide table.
Why: the current seven-column table does not survive tablet or narrow mobile widths.

- Keep desktop as a table, but introduce a narrower breakpoint layout that collapses each user into a stacked record card.
Where: the users registry section.
Why: status, progress, current assessment, and next assessment remain readable without horizontal scrolling.

- If the table must remain at intermediate widths, place it inside an explicit horizontal-scroll container with a visible affordance and keep the primary action pinned or repeated.
Where: users table wrapper.
Why: hidden right-edge actions are risky once controls exist.

- Remove one layer of filter duplication on small screens.
Where: registry filters and quick chips.
Why: the page currently spends too much vertical space on repeated filter choices before showing user rows.

- Rework the first user column to separate primary identity from secondary identity.
Where: first column row cell.
Why: two identical long email lines create noise. A primary line plus smaller metadata or a fallback label would scan better.

- Prepare the row action language for a control surface.
Where: action column.
Why: `View user` is fine today, but future flows may need a stronger destination cue such as `Open record`.

### `/admin/users/[userId]`

- Constrain the hero `h1` with wrapping or line-clamp behavior and treat the email as metadata, not as the dominant visual headline when it is extremely long.
Where: identity hero card.
Why: the current overflow is the clearest readiness failure on the page.

- Prefer a stable title pattern:
Where: hero card.
Suggested structure: display name or fallback short identifier as `h1`, full email below, status chips above.
Why: assignment controls will depend on high-confidence target identity.

- Remove duplicated state cards from either the hero or the `Current and next state` section.
Where: detail page upper half.
Why: the page currently repeats the same facts instead of reserving room for the next action surface.

- Move the controls block above the timeline.
Where: detail page middle section.
Why: controls should precede the historical consequence view they modify.

- Keep the timeline below controls as a read model.
Where: detail page lower section.
Why: after a mutation, admins should verify ordering and result linkage in the timeline immediately below the action area.

- Strengthen the future timeline item design before adding editing.
Where: timeline section.
Why: ordered assignment rows will need stronger item boundaries, clearer order markers, state badges, and result-link positions to stay understandable once records appear.

### Shared Admin Shell

- Remove page-level horizontal overflow at narrow widths and ensure the content column shrinks cleanly beside or beneath the shell.
Why: control interfaces should not inherit lateral scroll from the shell.

- Lock background horizontal movement when the mobile drawer is open.
Why: the open drawer currently sits over a page that still presents overflow pressure.

- Consider trimming the mobile top-band height slightly once Task 6 adds more interaction density below.
Why: the shell already uses a meaningful amount of vertical space before content.

## Task 6 Placement Guidance

### Recommended Placement For Assignment Controls

Place assignment controls on the detail page immediately below the identity hero and before the timeline.

Recommended desktop order:

1. Identity hero
2. Assignment controls
3. Current and next state summary
4. Timeline / result linkage

Recommended narrow-width order:

1. Back link
2. Identity hero
3. Assignment controls
4. Current and next state summary
5. Timeline

Why this order works:

- the admin confirms identity first
- the admin sees and executes the mutation surface next
- the admin then verifies current/next state
- the timeline remains the read-only audit trail beneath the action area

### Is The Current Placeholder In The Right Place?

Not quite.

It is conceptually correct to keep controls on the detail page, but the current placeholder sits too low. It should move upward so the page reads as:

- who this user is
- what I can do
- what state that produces
- what history exists

### Does The Timeline Need Strengthening Before It Becomes Editable?

Yes.

Before editing lands, the timeline needs a stronger item pattern so each future assignment row can communicate:

- sequence position
- assessment title
- assignment state
- last activity
- result link status

Without that strengthening, editable controls above it will make the page feel heavier while the timeline still looks like a soft informational block.

### Does The List Page Need Hierarchy Cleanup Before Adding Control-Oriented Navigation?

Yes.

The list page should remain a high-scan registry, not a place where many mutations happen directly. Before Task 6:

- make the registry responsive
- reduce filter duplication
- improve first-column identity handling
- ensure the primary record-open action remains obvious at all widths

That will let the list page act as a reliable launch surface into the detail-page controls instead of competing with them.

## Inspection Notes

Inspection was performed against the local development app with the dev-only admin bypass active:

- `NODE_ENV=development`
- `DEV_ADMIN_BYPASS=true`

Inspected routes:

- `http://localhost:3000/admin/users`
- `http://localhost:3000/admin/users/3da9122a-9954-473c-908a-c43f7e9674cd`

Widths reviewed:

- desktop
- tablet-width
- narrow mobile-width

Obvious accessibility/structure checks were positive:

- heading order remained coherent
- form fields were labeled
- links and buttons had clear names
- Lighthouse snapshot audits on both pages reported no obvious accessibility failures during this sweep

The main issues are not semantic-accessibility failures. They are layout resilience, hierarchy, and control-readiness problems.
