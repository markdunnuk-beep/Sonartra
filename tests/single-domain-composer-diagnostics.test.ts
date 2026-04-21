import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSingleDomainComposerDiagnostics } from '@/lib/assessment-language/single-domain-composer-diagnostics';
import { SINGLE_DOMAIN_PREVIEW_FIXTURES } from '@/lib/assessment-language/single-domain-preview-fixtures';

test('composer diagnostics flag hero and pair overlap when the two sections materially restate each other', () => {
  const fixture = structuredClone(SINGLE_DOMAIN_PREVIEW_FIXTURES[0]!.input);

  fixture.sections.pair.interaction_claim = fixture.sections.hero.hero_statement;
  fixture.sections.pair.synergy_claim = fixture.sections.hero.hero_expansion;
  fixture.sections.pair.tension_claim = fixture.sections.hero.hero_strength;
  fixture.sections.pair.pair_outcome = fixture.sections.hero.hero_expansion;

  const diagnostics = buildSingleDomainComposerDiagnostics(fixture);

  assert.match(
    diagnostics.issues.map((issue) => issue.code).join('\n'),
    /hero_pair_overlap/,
  );
});

test('composer diagnostics flag repeated four-word phrases across authored sections', () => {
  const fixture = structuredClone(SINGLE_DOMAIN_PREVIEW_FIXTURES[0]!.input);
  const repeatedPhrase = 'the defining pattern is';

  fixture.sections.hero.hero_statement = `${repeatedPhrase} a fast, structured style.`;
  fixture.sections.pair.interaction_claim = `${repeatedPhrase} a fast, structured style.`;

  const diagnostics = buildSingleDomainComposerDiagnostics(fixture);

  assert.match(
    diagnostics.issues.map((issue) => issue.code).join('\n'),
    /repeated_phrase_reuse/,
  );
});

test('composer diagnostics flag weaker-signal propagation gaps when application does not carry the underplayed signal forward', () => {
  const fixture = structuredClone(SINGLE_DOMAIN_PREVIEW_FIXTURES[0]!.input);

  fixture.sections.application = fixture.sections.application.filter((row) => row.signal_key !== 'reflective');

  const diagnostics = buildSingleDomainComposerDiagnostics(fixture);

  assert.match(
    diagnostics.issues.map((issue) => issue.code).join('\n'),
    /weaker_signal_propagation_gap/,
  );
  assert.equal(diagnostics.hasBlockingIssues, true);
});
