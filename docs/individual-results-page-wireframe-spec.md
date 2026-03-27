# Sonartra MVP — Individual Results Page (Production Wireframe Spec)

## 1) PAGE STRUCTURE OVERVIEW

**Page container**
- Max width: `1200px`
- Horizontal padding: `32px` (desktop), `24px` (tablet), `16px` (mobile)
- Vertical page padding: `24px` top, `40px` bottom
- Background: neutral-dark canvas (`#0B0F14` equivalent)

**Exact section order (top to bottom)**
1. Header / Context Bar
2. Hero — Core Insight (critical)
3. Signal Hierarchy
4. Domain Summaries
5. Action Block — Practical Outputs
6. Optional Overview Summary

**Vertical spacing between sections**
- Header → Hero: `20px`
- Hero → Signal Hierarchy: `24px`
- Signal Hierarchy → Domain Summaries: `24px`
- Domain Summaries → Action Block: `24px`
- Action Block → Overview Summary: `20px`

**Grid rule**
- Base layout: 12-column grid on desktop, 8-column on tablet, single column on mobile.

---

## 2) SECTION-BY-SECTION WIREFRAME

### 2.1 Header / Context Bar

**Purpose**: establish context only.

**Layout**
- Single horizontal bar card, height `56px`
- Left group:
  - `Assessment name` (semibold, 16px)
  - small separator dot
  - `Completion date` (13px muted text)
- Right group:
  - Status pill (`Ready`) if status is present

**Visual treatment**
- Card background: `#111827`
- Border: `1px solid #1F2937`
- Radius: `12px`
- Internal padding: `0 16px`

**Content mapping**
- assessment name ← payload metadata context
- completion date ← stored completion timestamp
- status ← result status only (no derived states)

### 2.2 Hero — Core Insight (Critical)

**Purpose**: make top signal obvious in under 5 seconds.

**Layout**
- Full-width dominant card, min height `220px`
- Two-column split (desktop `8/4`):
  - Left (`8` cols): insight text stack
  - Right (`4` cols): dominant top signal visual block

**Left stack (top to bottom)**
1. Label: `Top Signal` (12px uppercase tracking)
2. Top signal title (36px, bold)
3. Core one-line insight (18px, medium)
4. Optional supporting sentence (14px muted), max 140 characters, single paragraph

**Right visual block**
- Large score chip: normalized score for top signal (e.g., `86%`)
- Thin progress bar under score (purely representational from existing normalized value)
- Optional rank badge `#1`

**Visual treatment**
- Background: elevated dark (`#0F172A`)
- Border: subtle (`#243244`)
- Radius: `16px`
- Padding: `24px`

**Always visible**
- top signal name
- core insight sentence
- top score

### 2.3 Signal Hierarchy Section

**Purpose**: show full ranking with clear emphasis bands.

**Layout**
- Section title row + signal content block.
- Content split into 2 tiers:

**Tier A — Prominent secondary (Top 2–5)**
- 4 equal cards in a 2x2 grid (desktop), stacked on smaller screens.
- Each card includes:
  - rank label (`#2` to `#5`)
  - signal name
  - normalized score percentage
  - horizontal score bar

**Tier B — Remaining signals (de-emphasized)**
- Collapsible list card below Tier A.
- Default state: collapsed.
- Collapsed preview shows first 3 remaining signals as muted rows.
- Expanded state shows all remaining ranked signals in order.

**Scoring display rule**
- Use percentage values exactly as provided in `ranked_signals` / normalized scores.
- No recalculation in UI.

### 2.4 Domain Summaries

**Purpose**: grouped interpretation without dense prose.

**Layout**
- Section title + card grid.
- Desktop: 2-column cards; Tablet/Mobile: single column.

**Domain card structure**
1. Domain name (16px semibold)
2. One concise summary sentence from `domain_summaries`
3. Optional micro-list (max 2 bullets) only if already present in payload text; do not generate new bullets

**Expand/collapse behavior**
- Show first **4 domains** by default.
- If more than 4 domains exist, remainder are inside `Show all domains` collapsible container.
- Expanded preserves original payload order.

### 2.5 Action Block — Practical Outputs

**Purpose**: highest business value after hero.

**Layout**
- One parent container with three child cards in fixed order:
  1. Strengths
  2. Watchouts
  3. Development Focus
- Desktop: 3-column layout
- Tablet: 2 columns (`Strengths` and `Watchouts` top, `Development Focus` full-width below)
- Mobile: single-column stack

**Each child card**
- Title row
- Bullet list from payload array
- Max visible bullets before scroll: 6 (internal scroll if longer)

**Tone controls in UI**
- Neutral labels only; no decorative adjectives.
- No icons that imply severity scoring.

### 2.6 Optional Overview Summary

**Inclusion rule**
- Render only if `overview_summary` is present and non-empty.

**Layout**
- Compact single card at bottom.
- Title: `Overview`
- Body text max 3 lines by default, with `Read more` expand for longer content.

**De-emphasis rules**
- Smaller than hero/action typography.
- Muted background and text contrast lower than hero.

---

## 3) COMPONENT DEFINITIONS

### A. `ContextBar`
- Props: `assessmentName`, `completedAt`, `status?`
- Height: `56px`
- No expand behavior

### B. `CoreInsightHero`
- Props: `topSignal`, `coreInsightLine`, `supportingSentence?`, `topSignalScore`
- Min height: `220px`
- Mandatory data guard: do not render placeholders like `N/A`; hide optional sentence if missing

### C. `SignalCard`
- Props: `rank`, `signalName`, `score`
- Used for Top 2–5 only

### D. `SignalRemainderList`
- Props: `signals[]` (rank > 5)
- Default collapsed
- Toggle label: `Show all signals` / `Hide signals`

### E. `DomainSummaryCard`
- Props: `domainName`, `summaryText`
- Optional expand if summary exceeds 220 chars

### F. `ActionColumnCard`
- Props: `title`, `items[]`
- Titles locked to exact payload sections

### G. `OverviewSummaryCard`
- Props: `overviewSummary`
- Optional render only

---

## 4) HIERARCHY & VISUAL PRIORITY

**Priority 1 (largest / highest contrast)**
- Top signal name
- Core insight sentence
- Top signal score

**Priority 2**
- Top 2–5 signal cards
- Action block section headings

**Priority 3**
- Domain summaries
- Header context metadata

**Priority 4 (lowest emphasis)**
- Overview summary
- Collapsed remainder signals

**Typography scale**
- Hero title: `36px`
- Section headings: `20px`
- Card headings: `16px`
- Body: `14px`
- Meta/captions: `12px`

---

## 5) CONTENT RULES (WHAT IS SHOWN / HIDDEN)

**Always shown**
- Header context fields (if present)
- Hero top signal block
- Top 2–5 signals
- Action block (Strengths, Watchouts, Development Focus)

**Conditionally shown**
- Status pill: only if status exists
- Supporting sentence in hero: only if present
- Overview summary section: only if present
- Extra domains/signals: behind collapsible controls when count exceeds defaults

**Never shown on this page**
- `diagnostics`
- raw scoring internals
- computed/derived narratives not present in payload

**Formatting constraints**
- Preserve payload wording; no rewriting in UI layer.
- Truncate only for layout, with explicit expand interactions.

---

## 6) INTERACTION PATTERNS

1. **Show/Hide remaining signals**
   - Default: collapsed
   - Click toggles full ranked remainder list
   - State persists during page session

2. **Show all domains**
   - Default: first 4 visible
   - Toggle reveals remaining domain cards

3. **Read more / less (Overview only)**
   - Trigger only when text exceeds 3 lines
   - Smooth height transition (`150–200ms`)

4. **No sortable/reorder interactions**
   - Ranking order is fixed from payload

5. **No edit mode / personalization controls**
   - Results are read-only

---

## 7) RESPONSIVE BEHAVIOUR

### Desktop (`>=1200px`)
- 12-column grid
- Hero split 8/4
- Signal Top 2–5 in 2x2 grid
- Action block in 3 columns

### Tablet (`768px–1199px`)
- 8-column grid
- Hero stacked (text first, score block second)
- Signal Top 2–5 in 2 columns
- Action block in 2-row hybrid layout

### Mobile (`<768px`)
- Single column
- Hero text and score stacked
- All cards full-width
- Collapse controls remain available to reduce vertical overload

**Minimum tap target**
- 40px for all interactive toggles

---

## 8) IMPLEMENTATION NOTES (FOR FRONTEND DEV)

1. **Data contract usage**
   - Consume canonical result payload directly.
   - Do not compute ranking, score normalization, or inferred commentary in the client.

2. **Section rendering sequence**
   - Render sections in fixed order exactly as specified.

3. **Loading and empty states**
   - Loading: skeleton placeholders matching final card dimensions.
   - Empty/missing optional blocks: omit section, do not render empty cards.

4. **Accessibility**
   - Minimum text contrast ratio 4.5:1 for body text.
   - Toggle controls use `button` semantics with `aria-expanded`.
   - Section headings follow descending semantic order (`h1` hero signal, `h2` sections).

5. **Performance**
   - No heavy charting library required for MVP.
   - Use lightweight CSS bars for score visualization.

6. **Telemetry (optional but recommended)**
   - Track expand/collapse interactions for:
     - remaining signals
     - extra domains
     - overview read-more

7. **Visual density controls**
   - Keep max line length to ~80 chars in summary text blocks.
   - Enforce consistent card padding (`16px` standard, `24px` hero).

This is the single approved layout for Sonartra MVP Individual Results.
