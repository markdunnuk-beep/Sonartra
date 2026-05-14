# Report-First Canonical Payload v1

## 1. Purpose

This payload proposal defines how a completed single-domain ranked-pattern result could persist and render a fully authored report-first result while preserving the existing engine boundaries.

This is a proposal only. No runtime implementation has been approved. The runner and scoring remain unchanged. Result retrieval must still read the persisted `canonical_result_payload` only. Report-first content is selected by `pattern_key` after deterministic scoring has produced ranked signals and normalized scores.

`score_shape` may be retained as metadata or diagnostic context, but it should not force reader-facing report variation unless product evidence proves that score-shape-specific language improves quality.

## 2. Design goals

- Preserve premium editorial report quality.
- Avoid raw Markdown as the production payload.
- Support web and PDF rendering from the same structured payload.
- Keep reader-facing and admin-only content separate.
- Preserve scoring evidence without making scores dominate the report.
- Support 24 canonical reports per assessment.
- Allow future assessments to define their own report structure.
- Prevent Editorial QA Notes from rendering to users.
- Preserve deterministic `pattern_key` selection.

## 3. Top-level payload shape

```ts
type ReportFirstCanonicalPayloadV1 = {
  metadata: ReportFirstPayloadMetadata;
  assessment: ReportFirstAssessmentSummary;
  attempt: ReportFirstAttemptSummary;
  scoring: ReportFirstScoringEvidence;
  report: ReportFirstReport;
  evidence: ReportFirstEvidencePanel;
  diagnostics: ReportFirstDiagnostics;
};

type ReportFirstPayloadMetadata = {
  payloadVersion: 1;
  contractName: "report_first_canonical_payload_v1";
  generatedAt: string;
  assessmentVersionId: string;
  mode: "single_domain_ranked_pattern";
  reportModel: "report_first_canonical";
};

type ReportFirstAssessmentSummary = {
  key: string;
  title: string;
  version: string;
  description?: string;
};

type ReportFirstAttemptSummary = {
  attemptId: string;
  submittedAt?: string;
  completedAt: string;
  answeredQuestionCount: number;
  totalQuestionCount: number;
};

type ReportFirstScoringEvidence = {
  patternKey: string;
  scoreShape?: string;
  rankedSignals: RankedSignal[];
  normalizedScores: ScoreRow[];
  rawScores?: ScoreRow[];
  scoreShapeCapturedButNotLanguageDriving: boolean;
  scoringMethod: "option_signal_weights";
  normalizationMethod: string;
};

type ReportFirstReport = {
  reportKey: string;
  patternKey: string;
  reportTitle: string;
  hero: ReportHero;
  opening: StructuredContentBlock[];
  keyInsight: StructuredContentBlock;
  chapters: ReportChapter[];
  closing: ReportClosing;
  pdf: ReportPdfCta;
  readerNavigation: ReaderNavigationItem[];
};

type ReportFirstEvidencePanel = {
  title: string;
  rankedSignalEvidence: RankedSignal[];
  scoreRows: ScoreRow[];
  explanatoryNote: string;
};

type ReportFirstDiagnostics = {
  sourceReportKey: string;
  sourceAssessmentVersionId: string;
  sourceContentHash?: string;
  authoringStatus?: "draft" | "review" | "approved" | "published";
  adminNotesExcluded: boolean;
  warningList: string[];
  generatedFrom: "compiled_report_first_template";
};
```

Supporting types:

```ts
type RankedSignal = {
  rank: 1 | 2 | 3 | 4;
  signalKey: string;
  signalLabel: string;
  roleLabel?: string;
  roleSummary?: string;
};

type ScoreRow = {
  signalKey: string;
  signalLabel: string;
  normalizedPercent: number;
  rawScore?: number;
};

type ReportHero = {
  title: string;
  subtitle?: string;
  resultStatement?: string;
};

type ReportClosing = {
  synthesis: StructuredContentBlock[];
  finalLine: string;
};

type ReportPdfCta = {
  title: string;
  body: string;
  buttonLabel?: string;
};

type ReaderNavigationItem = {
  id: string;
  label: string;
  targetChapterKey?: string;
};
```

## 4. Structured content block model

The production payload should use structured blocks rather than raw Markdown.

Supported block types:

- `paragraph`
- `quote`
- `pull_quote`
- `table`
- `ordered_list`
- `unordered_list`
- `prompt_group`
- `insight_card`
- `strength_card`
- `tightening_card`
- `development_action`
- `evidence_panel`
- `signal_stack`
- `callout`
- `divider`

Block definitions:

```ts
type StructuredContentBlock =
  | ParagraphBlock
  | QuoteBlock
  | PullQuoteBlock
  | TableBlock
  | OrderedListBlock
  | UnorderedListBlock
  | PromptGroupBlock
  | InsightCardBlock
  | StrengthCardBlock
  | TighteningCardBlock
  | DevelopmentActionBlock
  | EvidencePanelBlock
  | SignalStackBlock
  | CalloutBlock
  | DividerBlock;

type ParagraphBlock = {
  type: "paragraph";
  text: string;
};

type QuoteBlock = {
  type: "quote";
  text: string;
  attribution?: string;
};

type PullQuoteBlock = {
  type: "pull_quote";
  text: string;
  attribution?: string;
};

type TableBlock = {
  type: "table";
  columns: TableColumn[];
  rows: TableCell[][];
};

type TableColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
};

type TableCell = {
  text: string;
};

type OrderedListBlock = {
  type: "ordered_list";
  items: string[];
};

type UnorderedListBlock = {
  type: "unordered_list";
  items: string[];
};

type PromptGroupBlock = {
  type: "prompt_group";
  title?: string;
  prompts: string[];
};

type InsightCardBlock = {
  type: "insight_card";
  title?: string;
  text: string;
};

type StrengthCardBlock = {
  type: "strength_card";
  title: string;
  text: string;
  linkedSignals?: string[];
};

type TighteningCardBlock = {
  type: "tightening_card";
  title: string;
  text: string;
  whyItMatters: string;
  rangeToAdd: string;
  linkedSignals?: string[];
};

type DevelopmentActionBlock = {
  type: "development_action";
  title: string;
  text: string;
  useCases: string[];
  whyItMatters: string;
  linkedSignals?: string[];
};

type EvidencePanelBlock = {
  type: "evidence_panel";
  evidence: ReportFirstEvidencePanel;
};

type SignalStackBlock = {
  type: "signal_stack";
  signals: RankedSignal[];
};

type CalloutBlock = {
  type: "callout";
  title?: string;
  text: string;
  tone?: "neutral" | "insight" | "development" | "evidence";
};

type DividerBlock = {
  type: "divider";
};
```

## 5. Chapter model

```ts
type ReportChapter = {
  chapterKey: string;
  chapterNumber: number;
  title: string;
  railLabel: string;
  summary?: string;
  blocks: StructuredContentBlock[];
  readerFacing: boolean;
};
```

Required Leadership Approach chapter keys:

- `value_creation`
- `others_experience`
- `decision_behaviour`
- `communication_behaviour`
- `pressure_behaviour`
- `strengths`
- `tightening`
- `rank_3_expansion`
- `rank_4_expansion`
- `development_focus`

Future assessments may define different chapter keys. The payload contract should support assessment-specific report structures as long as the required renderer surfaces are present: hero, opening, evidence, key insight, chapters, closing, final line, and PDF CTA.

## 6. Evidence model

Evidence fields:

```ts
type ReportFirstEvidencePanel = {
  title: string;
  rankedSignalEvidence: RankedSignal[];
  scoreRows: ScoreRow[];
  scoreShapeBadge?: {
    label: string;
    readerFacing: boolean;
  };
  explanatoryNote: string;
};
```

Rules:

- Evidence is injected from scoring output at completion.
- Evidence must not be hand-authored incorrectly.
- No retrieval layer may recompute scores.
- Evidence should support the report but not dominate it.
- `score_shape` can be captured as metadata or diagnostic context, but it should not drive reader-facing report variation unless later product evidence supports it.

## 7. Reader-facing vs admin-only separation

The payload must separate:

- reader-facing report content
- diagnostics/admin-only notes
- Editorial QA Notes from authoring files

Rules:

- Editorial QA Notes must not be part of `report.chapters`.
- Admin notes may be stored under `diagnostics` only if useful.
- Reader-facing output must not expose source file paths, authoring status, internal notes, implementation language, or diagnostic language.
- The renderer should only read `diagnostics` for explicitly admin-only or QA-only preview surfaces.

## 8. Authoring source to payload mapping

Markdown is useful for authoring and editorial review. It is not robust enough as the production payload.

Proposed mapping:

- canonical report Markdown becomes a structured JSON report template during compile/import
- Markdown paragraphs become `paragraph` blocks
- Markdown tables become `table` blocks
- numbered development actions become `development_action` blocks
- tightening risks become `tightening_card` blocks
- strengths become `strength_card` blocks
- prompts/questions become `prompt_group` blocks
- key insight becomes `pull_quote` or `insight_card`
- evidence panel placeholders become injected scoring evidence at completion
- Editorial QA Notes are stripped or stored only in `diagnostics`

RF9 lesson: raw Markdown alone is not reliable enough for production. The Process-led static preview exposed that tab-separated table-like content can render incorrectly as paragraphs. Production should not depend on loose Markdown interpretation for evidence tables, signal stacks, prompt groups, cards, or development actions.

## 9. Completion-time assembly proposal

Proposed completion flow:

```text
selected responses
-> existing scoring pipeline
-> normalized scores
-> ranked signals
-> pattern_key
-> score_shape captured as metadata
-> lookup report-first canonical report by assessment_version_id + pattern_key
-> inject scoring evidence
-> assemble report_first_canonical_payload_v1
-> persist in results.canonical_result_payload
```

Rules:

- No result rendering lookup at retrieval time.
- No UI-side report assembly.
- No score recomputation.
- Missing report-first canonical content must fail result readiness or use an explicit fallback policy.
- Fallback policy must be product-approved, not silent.
- The current ranked-pattern scoring and result persistence boundaries remain intact.

## 10. Storage/import proposal

This section is conceptual only. No database change is proposed in this task.

Potential storage options:

### A. Normalized report-first tables

Pros:

- Strong validation and queryability.
- Easier to enforce chapter/block completeness.
- Cleaner admin review and diffing.

Cons:

- Higher schema and importer complexity.
- More migration work.
- Slower authoring iteration if admin tools are not ready.

### B. JSON report content per pattern

Pros:

- Flexible and close to the required renderer payload.
- Fast to compile from Markdown.
- Easy to store one report template per `assessment_version_id + pattern_key`.

Cons:

- Needs strong JSON validation.
- Harder to query individual content blocks.
- Admin editing may be less ergonomic unless dedicated tooling is built.

### C. Compiled report payload templates stored per assessment version

Pros:

- Best bridge from Markdown authoring to deterministic runtime assembly.
- Keeps runtime away from Markdown parsing.
- Allows validation before publish.

Cons:

- Requires a compile/import step.
- Template versioning and content hash rules need definition.

Recommended initial implementation direction:

- keep authoring as Markdown for editorial workflow
- compile/import to structured JSON report templates per `assessment_version_id + pattern_key`
- persist assembled final payload at completion
- do not read Markdown at runtime

## 11. Web rendering implications

The web renderer needs:

- `report.hero`
- `evidence`
- `readerNavigation`
- `chapters`
- a block renderer
- `closing`
- `pdf` CTA

Production result pages should render structured payload, not parse Markdown. The reading rail should use `chapter.railLabel` and stable anchors. Block types allow cards, tables, lists, prompts, and evidence panels to render consistently.

Mobile and accessibility QA are required later. This proposal does not approve production result rendering.

## 12. PDF rendering implications

PDF output can render from the same structured payload.

Static or pre-generated PDFs remain possible later. Light personalization may include:

- `readerName`
- `completionDate`
- `rankedSignals`
- `normalizedScores`
- `reportTitle`

PDF needs a separate design pass. No PDF implementation is included in this task.

## 13. Validation requirements

Future validator rules should require:

- exactly 24 report templates per assessment version
- each report `pattern_key` resolves to one ranked pattern
- each report has required hero, opening, evidence, keyInsight, chapters, closing, and pdf fields
- required Leadership Approach chapters exist
- no Editorial QA Notes in reader-facing content
- no forbidden internal terms
- all table/list/prompt/action/card blocks are structurally valid
- cross-pattern similarity warnings
- quality score metadata present but admin-only
- report status must be approved before publish

## 14. Example payload

Shortened example for `process_results_people_vision`:

```json
{
  "metadata": {
    "payloadVersion": 1,
    "contractName": "report_first_canonical_payload_v1",
    "generatedAt": "2026-05-14T00:00:00.000Z",
    "assessmentVersionId": "assessment-version-id",
    "mode": "single_domain_ranked_pattern",
    "reportModel": "report_first_canonical"
  },
  "assessment": {
    "key": "leadership-approach",
    "title": "Leadership Approach",
    "version": "v1"
  },
  "attempt": {
    "attemptId": "attempt-id",
    "completedAt": "2026-05-14T00:00:00.000Z",
    "answeredQuestionCount": 24,
    "totalQuestionCount": 24
  },
  "scoring": {
    "patternKey": "process_results_people_vision",
    "scoreShape": "paired",
    "rankedSignals": [
      { "rank": 1, "signalKey": "process", "signalLabel": "Process" },
      { "rank": 2, "signalKey": "results", "signalLabel": "Results" },
      { "rank": 3, "signalKey": "people", "signalLabel": "People" },
      { "rank": 4, "signalKey": "vision", "signalLabel": "Vision" }
    ],
    "normalizedScores": [
      { "signalKey": "process", "signalLabel": "Process", "normalizedPercent": 42 },
      { "signalKey": "results", "signalLabel": "Results", "normalizedPercent": 33 },
      { "signalKey": "people", "signalLabel": "People", "normalizedPercent": 17 },
      { "signalKey": "vision", "signalLabel": "Vision", "normalizedPercent": 8 }
    ],
    "scoreShapeCapturedButNotLanguageDriving": true,
    "scoringMethod": "option_signal_weights",
    "normalizationMethod": "ranked_signal_percentages"
  },
  "report": {
    "reportKey": "process_results_people_vision",
    "patternKey": "process_results_people_vision",
    "reportTitle": "Leadership Approach — Process, Results, People, Vision",
    "hero": {
      "title": "You lead by turning complexity into structured progress"
    },
    "opening": [
      {
        "type": "paragraph",
        "text": "You create confidence by giving work a clearer way forward, then making sure it produces practical movement."
      }
    ],
    "keyInsight": {
      "type": "pull_quote",
      "text": "Your leadership creates confidence by making work feel more manageable."
    },
    "chapters": [
      {
        "chapterKey": "value_creation",
        "chapterNumber": 1,
        "title": "How your leadership creates value",
        "railLabel": "Value",
        "readerFacing": true,
        "blocks": [
          {
            "type": "paragraph",
            "text": "Your leadership creates value by making progress repeatable."
          },
          {
            "type": "prompt_group",
            "title": "Useful activation questions",
            "prompts": [
              "Who owns the next step?",
              "What standard matters?",
              "When will progress be reviewed?"
            ]
          }
        ]
      }
    ],
    "closing": {
      "synthesis": [
        {
          "type": "paragraph",
          "text": "Your leadership is valuable because it makes work hold together."
        }
      ],
      "finalLine": "Your leadership turns complexity into structured, consistent progress."
    },
    "pdf": {
      "title": "Download your Leadership Approach report as a PDF.",
      "body": "This report is designed as a reference document."
    },
    "readerNavigation": [
      { "id": "overview", "label": "Overview" },
      { "id": "value_creation", "label": "Value", "targetChapterKey": "value_creation" }
    ]
  },
  "evidence": {
    "title": "Evidence behind your result",
    "rankedSignalEvidence": [
      { "rank": 1, "signalKey": "process", "signalLabel": "Process" },
      { "rank": 2, "signalKey": "results", "signalLabel": "Results" }
    ],
    "scoreRows": [
      { "signalKey": "process", "signalLabel": "Process", "normalizedPercent": 42 },
      { "signalKey": "results", "signalLabel": "Results", "normalizedPercent": 33 }
    ],
    "explanatoryNote": "These scores provide evidence for the ranked pattern; the report explains what that pattern means in practice."
  },
  "diagnostics": {
    "sourceReportKey": "process_results_people_vision",
    "sourceAssessmentVersionId": "assessment-version-id",
    "adminNotesExcluded": true,
    "warningList": [],
    "generatedFrom": "compiled_report_first_template"
  }
}
```

## 15. Open questions

- Does `score_shape` remain purely metadata?
- Is duplicated report content across `score_shape` rows needed for compatibility, or can one canonical report per `pattern_key` be enough?
- Do report templates live in the existing import package or a new report-first package?
- How should the existing result page UI migrate without creating a second scoring/result path?
- How should historical modular results be handled?
- Are PDFs generated dynamically or prebuilt/static?
- How should report edits after publication be versioned?
- Does reader name/personalization belong in the persisted payload or the render layer?

## 16. Decision status

`REPORT_FIRST_CANONICAL_PAYLOAD_PROPOSAL_READY_FOR_REVIEW`
