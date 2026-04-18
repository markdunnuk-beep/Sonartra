# Admin Mobile Shell Hardening

This pass fixed the remaining mobile shell weaknesses in the shared admin drawer: the drawer now opens as a fully expanded mobile navigation surface, exposes clearer overlay semantics, provides an in-drawer close control, and closes cleanly on route changes or `Escape`.

Scroll locking uses a small shell-local effect. When the mobile drawer opens, the shell applies `overflow: hidden` to both `html` and `body`, disables touch scrolling on the body, preserves scrollbar spacing when needed, and removes those changes on close.

Structural and accessibility improvements added:
- explicit mobile drawer open/closed markers
- mobile dialog semantics with labeling and descriptive copy
- a clear close affordance inside the drawer plus the existing overlay close path
- subordinate-state marking for the page content while the drawer is open

Browser verification covered narrow-width local admin inspection with the dev admin bypass enabled:
- open drawer on mobile width
- close via overlay and close button
- confirm background scroll is locked while open
- confirm normal interaction returns on close
- confirm no horizontal overflow returned

Remaining limitations:
- this does not add full focus trapping
- desktop shell structure and page-specific layouts were intentionally left unchanged
