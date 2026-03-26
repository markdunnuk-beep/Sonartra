# WPLP-80 Excel → MVP Seed Mapping

## Scope and intent
This conversion treats `/mnt/data/Sonartra_WPLP80_Full_Report_Model.xlsx` as a **source-only artifact** and outputs deterministic, engine-ready seed data under `db/seed/wplp80/data`.

## Authoritative sheets used
- **Questions**: authoritative for all 80 question prompts, sections, and A/B/C/D option text.
- **Weights**: authoritative for option-to-signal scoring matrix and reverse flag.
- **Thresholds**: authoritative for band and narrative thresholds.
- **Archetypes**: authoritative for primary/secondary style pairing and identity sentence.
- **Sentence Library**: authoritative for narrative sentence rows by category/signal/band.
- **Rule Engine**: authoritative for deterministic rule rows (condition → output text).

Reference-only sheets not seeded as runtime data:
- **Read Me**, **Responses**, **Results**, **Output**.

## Entity mapping

### Assessment
- `assessment.key`: `wplp80`
- `assessment.title`: from Read Me title row
- `assessment.description`: from Read Me purpose row
- `estimatedTimeMinutes`: `29` (from Output sheet headings)

### Domains
Because workbook semantics include both question sections and scoring signal groups, domains are split into two sources:
1. `source=question_section`: 11 sections from Questions sheet (used by `questions.domainKey`)
2. `source=signal_group`: 8 scoring groups inferred from Weights column prefixes (used by `signals.domainKey`)

This keeps question categorization and scoring taxonomy both preserved without lossy merging.

### Signals
Signals come from all weighted columns in **Weights** matching prefixes:
- Style, Mot, Lead, Conflict, Culture, Stress, Decision, Role

Decision and Role are preserved as first-class overlay signal groups (not discarded).

### Questions and Options
- Question keys: `wplp80_q01` … `wplp80_q80`
- Option keys: `wplp80_q01_a` … `wplp80_q80_d`
- Order preserved exactly from workbook question number and option label A/B/C/D.

### OptionSignalWeights
Each Weights sheet row (`Question`, `Answer`) resolves to one option key and emits one row per non-zero signal weight.
- `weight`: numeric value copied exactly
- `reverseFlag`: from `Reverse_Flag` (boolean)
- `sourceWeightKey`: workbook `Key` (e.g., `1|A`) for traceability

### Thresholds
Rows mapped directly to:
- `measureKey` (slugified)
- `lowMax`, `mediumMax`, `highMax`
- `notes`

### Archetypes
Archetype rows mapped as style-style pairings:
- `primarySignalKey`: `style_<primary>`
- `secondarySignalKey`: `style_<secondary>`
- `archetypeName`, `identitySentence`

### Sentence Library
Rows mapped with signal name normalization to canonical signal keys. Signal resolution attempts exact signal title, then prefixed forms (`style_`, `mot_`, `lead_`, `conflict_`, `culture_`, `stress_`).

### Rule Engine
Rules are preserved verbatim as deterministic rows:
- `ruleType`
- `condition`
- `output`
- `sourceSheetRow`

## Deterministic key rules
- Lowercase snake_case slugification.
- Question and option IDs zero-padded for stable sorting.
- Workbook trace fields retained (`sourceWeightKey`, `sourceSheetRow`, `sourceColumn`).

## Known ambiguities and decisions
1. **Domain ambiguity**: workbook has question sections and scoring signal groups that are not 1:1. Decision: persist both domain sets with a `source` discriminator.
2. **Overlay dimensions (Decision/Role)**: these are included as scoring signal groups for MVP seeds and can be activated or ignored in runtime policy later.
3. **Estimated duration**: inferred as `29` from Output sheet category rows; workbook does not provide a dedicated metadata cell for duration.

## Reproducible workflow
1. Run conversion:
   - `npx tsx scripts/convert-wplp80-excel-to-seeds.ts`
2. Run integrity verification:
   - `npx tsx scripts/verify-wplp80-seeds.ts`

## Output files
- `db/seed/wplp80/data/assessment.json`
- `db/seed/wplp80/data/domains.json`
- `db/seed/wplp80/data/signals.json`
- `db/seed/wplp80/data/questions.json`
- `db/seed/wplp80/data/options.json`
- `db/seed/wplp80/data/optionSignalWeights.json`
- `db/seed/wplp80/data/thresholds.json`
- `db/seed/wplp80/data/archetypes.json`
- `db/seed/wplp80/data/sentenceLibrary.json`
- `db/seed/wplp80/data/ruleEngine.json`
