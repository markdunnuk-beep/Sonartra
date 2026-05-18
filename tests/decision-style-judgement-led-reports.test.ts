import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const reportDir = path.join(
  process.cwd(),
  "content",
  "authoring",
  "decision-style",
  "report-first",
);

const expectedReports = [
  {
    file: "judgement_evidence_standards_practicality.md",
    patternKey: "judgement_evidence_standards_practicality",
    title: "The Experience-First Evidence Decider",
    ranks: ["judgement", "evidence", "standards", "practicality"],
  },
  {
    file: "judgement_evidence_practicality_standards.md",
    patternKey: "judgement_evidence_practicality_standards",
    title: "The Experience-Tested Decision Maker",
    ranks: ["judgement", "evidence", "practicality", "standards"],
  },
  {
    file: "judgement_standards_evidence_practicality.md",
    patternKey: "judgement_standards_evidence_practicality",
    title: "The Responsible Experience Decider",
    ranks: ["judgement", "standards", "evidence", "practicality"],
  },
  {
    file: "judgement_standards_practicality_evidence.md",
    patternKey: "judgement_standards_practicality_evidence",
    title: "The Experience-and-Responsibility Decider",
    ranks: ["judgement", "standards", "practicality", "evidence"],
  },
  {
    file: "judgement_practicality_evidence_standards.md",
    patternKey: "judgement_practicality_evidence_standards",
    title: "The Practical Experience Decision Maker",
    ranks: ["judgement", "practicality", "evidence", "standards"],
  },
  {
    file: "judgement_practicality_standards_evidence.md",
    patternKey: "judgement_practicality_standards_evidence",
    title: "The Experience-to-Action Decider",
    ranks: ["judgement", "practicality", "standards", "evidence"],
  },
] as const;

const requiredSections = [
  ["## 04 — Key insight", "<!-- section_id: key-insight -->"],
  ["## 05 — Decision value", "<!-- section_id: value -->"],
  ["## 06 — Others’ experience", "<!-- section_id: others -->"],
  ["## 07 — Decision mechanics", "<!-- section_id: decisions -->"],
  ["## 08 — Explaining the decision", "<!-- section_id: communication -->"],
  ["## 09 — Judgement under pressure", "<!-- section_id: pressure -->"],
  ["## 10 — Decision strengths", "<!-- section_id: strengths -->"],
  ["## 11 — Decision tightening", "<!-- section_id: tightening -->"],
  ["## 12 — Wider perspective", "<!-- section_id: rank-3-expansion -->"],
  ["## 13 — Decision range", "<!-- section_id: rank-4-expansion -->"],
  ["## 14 — Development", "<!-- section_id: development-focus -->"],
  ["## 15 — Closing", "<!-- section_id: closing -->"],
] as const;

function parseFrontmatter(markdown: string): Record<string, string> {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, "missing YAML frontmatter");

  return Object.fromEntries(
    match[1]
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf(":");
        assert.notEqual(separator, -1, `invalid frontmatter line: ${line}`);
        return [
          line.slice(0, separator).trim(),
          line.slice(separator + 1).trim(),
        ];
      }),
  );
}

function wordCount(markdown: string): number {
  return markdown.match(/\b[\w'-]+\b/g)?.length ?? 0;
}

test("judgement-led Decision Style reports exist and preserve contract", () => {
  assert.equal(expectedReports.length, 6);

  for (const report of expectedReports) {
    const reportPath = path.join(reportDir, report.file);
    assert.ok(existsSync(reportPath), `${report.file} should exist`);

    const markdown = readFileSync(reportPath, "utf8");
    const frontmatter = parseFrontmatter(markdown);

    assert.equal(frontmatter.assessment_title, "Decision Style");
    assert.equal(frontmatter.assessment_key, "decision-style");
    assert.equal(frontmatter.domain_key, "decision_style");
    assert.equal(frontmatter.pattern_key, report.patternKey);
    assert.equal(frontmatter.rank_1_signal_key, "judgement");
    assert.equal(frontmatter.rank_2_signal_key, report.ranks[1]);
    assert.equal(frontmatter.rank_3_signal_key, report.ranks[2]);
    assert.equal(frontmatter.rank_4_signal_key, report.ranks[3]);
    assert.equal(
      frontmatter.report_contract,
      "report_first_canonical_payload_v1",
    );
    assert.equal(frontmatter.status, "canonical_draft");
    assert.equal(frontmatter.working_title, report.title);
    assert.equal(frontmatter.editorial_version, "rfa-17b-judgement-led-draft");
    assert.match(markdown, new RegExp(`^# ${report.title}$`, "m"));

    for (const [heading, sectionId] of requiredSections) {
      assert.ok(markdown.includes(heading), `${report.file} missing ${heading}`);
      assert.ok(
        markdown.includes(sectionId),
        `${report.file} missing ${sectionId}`,
      );
    }

    assert.doesNotMatch(markdown, /score_shape/i);
    assert.doesNotMatch(markdown, /\b(instinct|principle|pragmatism)\b/i);
    assert.match(markdown, /\bFor example\b/);

    const count = wordCount(markdown);
    assert.ok(
      count >= 2000 && count <= 3200,
      `${report.file} word count ${count} outside broad expected range`,
    );
  }
});
