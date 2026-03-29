# Clean-Room QA Fixture

`qa-mini` is a small published assessment fixture used for fast smoke tests, compact regressions, and local debugging of the canonical Sonartra runtime flow.

It exists to exercise the same shared path as live assessments:

- published-version resolution
- attempt creation
- ordered question delivery
- response persistence
- completion
- scoring and normalization
- canonical payload persistence
- result retrieval

The fixture is intentionally small:

- 1 assessment
- 1 published version
- 2 signal-group domains
- 4 signals
- 4 questions with A-D options

Its weight mappings are designed so stable answer patterns are easy to reason about during QA.

WPLP-80 remains the flagship acceptance assessment and the primary end-to-end proof path. `qa-mini` is a secondary clean-room fixture for faster regression and debugging loops, not a replacement for WPLP-80.
