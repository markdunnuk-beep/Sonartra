# Sonartra MVP — Individual Results Page (Production Wireframe Spec v2)

## RESULT PAGE PURPOSE

The Individual Results page is the **summary intelligence layer** of the Sonartra experience.

It is designed to:
- deliver the core behavioural insight quickly
- highlight the most important signals
- provide a small number of actionable outputs
- feel accurate and immediately relatable

It is NOT designed to:
- present full analytical depth
- expose every signal or diagnostic
- replicate a full assessment report

The full detailed output will be delivered via a separate PDF report.

Design principle:
**"Enough to understand. Not everything to analyse."**

---

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
  - separator dot
  - `Completion date` (13px muted)
- Right group:
  - Status pill (`Ready`) if present

**Visual treatment**
- Background: `#111827`
- Border: `1px solid #1F2937`
- Radius: `12px`
- Padding: `0 16px`

---

### 2.2 Hero — Core Insight (Critical)

**Purpose**: make the top signal immediately clear and meaningful.

**Layout**
- Full-width dominant card, min height `220px`
- Desktop split: `8 / 4`

**Left (8 cols)**
1. Label: `Top Signal` (12px uppercase)
2. Signal name (36px bold)
3. Core insight (18px)
4. Supporting / impact sentence (14px muted, max 140 chars)

**Right (4 cols)**
- Large score chip (e.g. `86%`)
- Thin progress bar
- Rank badge `#1`

**Visual treatment**
- Background: `#0F172A`
- Border: `#243244`
- Radius: `16px`
- Padding: `24px`

**Always visible**
- Signal name
- Core insight
- Score

---

### 2.3 Signal Hierarchy

**Purpose**: show ranking with clear emphasis bands.

**Tier A — Top 2–5**
- 2x2 grid (desktop)
- Each card:
  - rank label
  - signal name
  - score %
  - bar

**Tier B — Remaining**
- Collapsible list
- Default: collapsed
- Preview: first 3 muted rows
- Expand: full ranked list

**Rules**
- No recalculation
- Use payload scores directly

---

### 2.4 Domain Summaries

**Purpose**: provide grouped interpretation without density.

**Layout**
- 2-column grid (desktop)

**Card**
- Domain name
- 1 concise summary sentence
- Optional micro-list (max 2 bullets if already present)

**Visibility rules**
- Show first **2 domains** by default
- Remaining domains inside `Show all domains` collapsible
- Preserve original order

---

### 2.5 Action Block — Practical Outputs

**Purpose**: deliver operational value.

**Layout**
- 3 cards:
  - Strengths
  - Watchouts
  - Development Focus

**Responsive**
- Desktop: 3 columns
- Tablet: 2 + 1 layout
- Mobile: stacked

**Content rules**
- Bullet list from payload
- Max visible bullets: **3–4**
- Additional items behind `Show more`
- Avoid internal scroll where possible

**Tone**
- Neutral
- Action-oriented
- No decorative UI

---

### 2.6 Optional Overview Summary

**Render only if present**

**Suppression rule**
- If it duplicates the hero insight → omit entirely

**Layout**
- Small card at bottom
- Max 3 lines visible
- `Read more` expands

**Visual**
- Lower contrast than hero
- De-emphasised

---

## 3) COMPONENT DEFINITIONS

- `ContextBar`
- `CoreInsightHero`
- `SignalCard`
- `SignalRemainderList`
- `DomainSummaryCard`
- `ActionColumnCard`
- `OverviewSummaryCard`

(All props unchanged from v1 spec)

---

## 4) HIERARCHY & VISUAL PRIORITY

**Priority 1**
- Top signal
- Core insight
- Score

**Priority 2**
- Top 2–5 signals
- Action headings

**Priority 3**
- Domains
- Context bar

**Priority 4**
- Overview
- Collapsed signals

---

## 5) CONTENT RULES

**Always shown**
- Hero
- Top signals
- Action block

**Conditionally shown**
- Status pill
- Supporting sentence
- Overview
- Extra domains/signals

**Never shown**
- diagnostics
- raw scoring
- derived narratives

---

## 6) INTERACTION PATTERNS

- Toggle signals
- Toggle domains
- Show more (actions)
- Read more (overview)

No reordering. No editing.

---

## 7) RESPONSIVE BEHAVIOUR

Unchanged from v1 (desktop / tablet / mobile rules preserved)

---

## 8) IMPLEMENTATION NOTES

- No UI-side computation
- Fixed section order
- Omit empty sections
- Accessible toggles
- CSS-based bars
- Optional telemetry

---

## FINAL RULE

This page is a **summary layer**.

The **PDF report is the full analysis layer**.

Do not expand this page into a full report.

---

**This is the single approved layout for Sonartra MVP Individual Results.**