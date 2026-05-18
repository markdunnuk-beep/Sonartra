import { readdirSync, readFileSync } from "node:fs";
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

function parseFrontmatter(markdown: string): Record<string, string> {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, "missing YAML frontmatter");

  return Object.fromEntries(
    match[1]
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const separatorIndex = line.indexOf(":");
        assert.ok(separatorIndex > 0, `invalid frontmatter line: ${line}`);

        return [
          line.slice(0, separatorIndex).trim(),
          line.slice(separatorIndex + 1).trim(),
        ];
      }),
  );
}

test("decision style report titles are normalised", () => {
  const reportFiles = readdirSync(reportDir)
    .filter((file) => file.endsWith(".md"))
    .sort();

  assert.equal(reportFiles.length, 24);

  const titles = new Map<string, string>();
  const deprecatedTitlePhrases = [
    "Evidence-and-Read",
    "Experience-and-Responsibility Decider",
    "Experience-to-Action Decider",
    "Responsible Practical Judgement Maker",
    "Practical Standards Decision Maker",
  ];

  for (const file of reportFiles) {
    const markdown = readFileSync(path.join(reportDir, file), "utf8");
    const frontmatter = parseFrontmatter(markdown);
    const titleMatch = markdown.match(/^# (.+)$/m);

    assert.ok(titleMatch, `${file} missing top-level title`);
    assert.ok(frontmatter.working_title, `${file} missing working_title`);
    assert.equal(titleMatch[1], frontmatter.working_title, file);
    assert.ok(
      frontmatter.working_title.endsWith("Decision Maker"),
      `${file} title should use Decision Maker convention`,
    );
    assert.ok(!frontmatter.working_title.includes("Decider"), file);

    for (const phrase of deprecatedTitlePhrases) {
      assert.ok(
        !frontmatter.working_title.includes(phrase),
        `${file} still includes deprecated title phrase: ${phrase}`,
      );
    }

    assert.equal(
      titles.has(frontmatter.working_title),
      false,
      `duplicate title: ${frontmatter.working_title}`,
    );
    titles.set(frontmatter.working_title, file);

    if (frontmatter.pattern_key === "evidence_practicality_standards_judgement") {
      assert.equal(frontmatter.working_title, "The Evidence-First Decision Maker");
    }
  }
});
