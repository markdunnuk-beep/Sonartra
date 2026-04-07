import test from 'node:test';
import assert from 'node:assert/strict';

import { createAssessmentDefinitionRepository } from '@/lib/engine/repository';
import { isCanonicalResultPayload } from '@/lib/engine/result-contract';
import { createAssessmentAttemptLifecycleService } from '@/lib/server/assessment-attempt-lifecycle';
import { createAssessmentCompletionService } from '@/lib/server/assessment-completion-service';
import { createAssessmentRunnerService } from '@/lib/server/assessment-runner-service';
import {
  buildAssessmentWorkspaceViewModel,
  buildDashboardViewModel,
} from '@/lib/server/dashboard-workspace-view-model';
import { createResultReadModelService } from '@/lib/server/result-read-model';
import {
  createQaMiniPublishedAssessmentFixture,
  getQaMiniExpectedOutcome,
  getQaMiniPatternLabels,
} from '@/tests/fixtures/qa-mini-fixture';

test('qa-mini fixture runs through the canonical published runtime path deterministically', async () => {
  const fixture = createQaMiniPublishedAssessmentFixture();
  const repository = createAssessmentDefinitionRepository({ db: fixture.db });
  const lifecycleService = createAssessmentAttemptLifecycleService({ db: fixture.db });
  const completionService = createAssessmentCompletionService({ db: fixture.db, repository });
  const runnerService = createAssessmentRunnerService({
    db: fixture.db,
    lifecycleService,
    completionService,
  });
  const resultReadModel = createResultReadModelService({ db: fixture.db });
  const userId = 'qa-mini-user';
  const pattern = 'all_a';
  const expected = getQaMiniExpectedOutcome(pattern);
  const labels = getQaMiniPatternLabels(pattern);

  const started = await lifecycleService.startAssessmentAttempt({
    userId,
    assessmentKey: 'qa-mini',
  });

  assert.ok(started.attemptId);
  assert.equal(started.status, 'in_progress');
  assert.equal(started.assessmentVersionId, fixture.publishedVersion.id);
  assert.equal(started.totalQuestions, fixture.questionCount);

  const runner = await runnerService.getAssessmentRunnerViewModel({
    userId,
    assessmentKey: 'qa-mini',
    attemptId: started.attemptId!,
  });

  assert.equal(runner.assessmentVersionId, fixture.publishedVersion.id);
  assert.equal(runner.questions.length, fixture.questionCount);
  assert.deepEqual(runner.questions.map((question) => question.orderIndex), [1, 2, 3, 4]);
  for (const question of runner.questions) {
    assert.deepEqual(question.options.map((option) => option.label), ['A', 'B', 'C', 'D']);
  }

  for (const [index, question] of runner.questions.entries()) {
    const selectedOption = question.options.find((option) => option.label === labels[index]);
    assert.ok(selectedOption);
    await runnerService.saveAssessmentResponse({
      userId,
      assessmentKey: 'qa-mini',
      attemptId: started.attemptId!,
      questionId: question.questionId,
      selectedOptionId: selectedOption!.optionId,
    });
  }

  assert.equal(fixture.responses.length, fixture.questionCount);

  const submitted = await runnerService.completeAssessmentAttempt({
    userId,
    assessmentKey: 'qa-mini',
    attemptId: started.attemptId!,
  });

  assert.equal(submitted.kind, 'ready');
  assert.equal(submitted.completion.resultStatus, 'ready');
  assert.ok(submitted.completion.resultId);

  const persisted = fixture.results.find((result) => result.resultId === submitted.completion.resultId);
  assert.ok(persisted);
  assert.equal(persisted?.readinessStatus, 'READY');
  assert.equal(persisted?.assessmentVersionId, fixture.publishedVersion.id);
  assert.ok(isCanonicalResultPayload(persisted?.canonicalResultPayload));

  const payload = persisted!.canonicalResultPayload;
  assert.equal(payload.metadata.assessmentKey, 'qa-mini');
  assert.equal(payload.metadata.version, fixture.publishedVersion.version);
  assert.equal(payload.metadata.attemptId, started.attemptId);
  assert.equal(payload.hero.primaryPattern?.signalKey, expected.topSignalKey);
  assert.deepEqual(
    payload.domains
      .flatMap((domain) => domain.signalBalance.items)
      .sort((left, right) => left.rank - right.rank)
      .map((signal) => signal.signalKey),
    expected.rankedSignalKeys,
  );

  const list = await resultReadModel.listAssessmentResults({ userId });
  const detail = await resultReadModel.getAssessmentResultDetail({
    userId,
    resultId: persisted!.resultId,
  });
  const workspace = await buildAssessmentWorkspaceViewModel({
    db: fixture.db,
    userId,
  });
  const dashboard = await buildDashboardViewModel({
    db: fixture.db,
    userId,
  });

  assert.equal(list.length, 1);
  assert.equal(list[0]?.resultId, persisted?.resultId);
  assert.equal(list[0]?.topSignal?.signalKey, expected.topSignalKey);

  assert.equal(detail.resultId, persisted!.resultId);
  assert.equal(detail.topSignal?.signalKey, expected.topSignalKey);
  assert.deepEqual(
    detail.rankedSignals.map((signal) => signal.signalKey),
    expected.rankedSignalKeys,
  );

  assert.equal(workspace.assessments.length, 1);
  assert.equal(workspace.assessments[0]?.assessmentKey, 'qa-mini');
  assert.equal(workspace.assessments[0]?.status, 'ready');
  assert.equal(workspace.assessments[0]?.latestReadyResultId, persisted?.resultId);

  assert.equal(dashboard.readyResultCount, 1);
  assert.equal(dashboard.latestReadyResult?.resultId, persisted?.resultId);
  assert.equal(dashboard.latestReadyResult?.topSignalTitle, payload.hero.primaryPattern?.signalLabel ?? null);

  const detailRepeat = await resultReadModel.getAssessmentResultDetail({
    userId,
    resultId: persisted!.resultId,
  });
  assert.equal(JSON.stringify(detailRepeat), JSON.stringify(detail));
});
