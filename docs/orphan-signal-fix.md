## Conflict accommodate orphan fix

- Omitted signal: `conflict_accommodate`
- Failure mode: runtime loader rejected the published WPLP-80 definition because the executable signal had no incoming `option_signal_weights`
- Root cause in repo source: the canonical seed file [`db/seed/wplp80/data/optionSignalWeights.json`](C:\Projects\sonartra-build\Sonartra\db\seed\wplp80\data\optionSignalWeights.json) contained zero mappings for `conflict_accommodate` even though the signal and sentence-library rows were present
- Fix location: canonical WPLP-80 seed data, not engine runtime code
- Regression protection:
  - seed integrity test now asserts every seeded signal has at least one incoming weight
  - focused seed test asserts `conflict_accommodate` has six canonical mappings
  - runtime-loader test still proves executable orphan signals fail validation

Reseed the canonical WPLP-80 assessment after this change so the database receives the six missing rows.
