import test from 'node:test';
import assert from 'node:assert/strict';

import { initialAdminAssessmentDeleteActionState } from '@/lib/admin/admin-assessment-delete';
import {
  deleteAssessmentActionWithDependencies,
  deleteAssessmentRecords,
} from '@/lib/server/admin-assessment-delete';

type StoredAssessment = {
  id: string;
  assessmentKey: string;
};

type StoredVersion = {
  id: string;
  assessmentId: string;
};

type StoredDomain = {
  id: string;
  assessmentVersionId: string;
};

type StoredSignal = {
  id: string;
  assessmentVersionId: string;
};

type StoredQuestion = {
  id: string;
  assessmentVersionId: string;
};

type StoredOption = {
  id: string;
  questionId: string;
};

type StoredWeight = {
  id: string;
  optionId: string;
  signalId: string;
};

type StoredAttempt = {
  id: string;
  assessmentId: string;
  assessmentVersionId: string;
};

type StoredResult = {
  id: string;
  assessmentId: string;
  assessmentVersionId: string;
};

function createFakeDb(seed?: {
  assessments?: StoredAssessment[];
  versions?: StoredVersion[];
  domains?: StoredDomain[];
  signals?: StoredSignal[];
  questions?: StoredQuestion[];
  options?: StoredOption[];
  weights?: StoredWeight[];
  attempts?: StoredAttempt[];
  results?: StoredResult[];
}) {
  const state = {
    assessments: [...(seed?.assessments ?? [])],
    versions: [...(seed?.versions ?? [])],
    domains: [...(seed?.domains ?? [])],
    signals: [...(seed?.signals ?? [])],
    questions: [...(seed?.questions ?? [])],
    options: [...(seed?.options ?? [])],
    weights: [...(seed?.weights ?? [])],
    attempts: [...(seed?.attempts ?? [])],
    results: [...(seed?.results ?? [])],
  };

  return {
    db: {
      async query<T>(text: string, params?: readonly unknown[]) {
        if (text.includes('FROM assessments') && text.includes('assessment_key = $1')) {
          const assessmentKey = params?.[0] as string;
          const assessment = state.assessments.find((entry) => entry.assessmentKey === assessmentKey);

          return {
            rows: assessment
              ? ([{ assessment_id: assessment.id, assessment_key: assessment.assessmentKey }] as unknown as T[])
              : ([] as T[]),
          };
        }

        if (text.includes('SELECT') && text.includes('AS attempt_count') && text.includes('AS result_count')) {
          const assessmentId = params?.[0] as string;
          const versionIds = new Set(
            state.versions
              .filter((version) => version.assessmentId === assessmentId)
              .map((version) => version.id),
          );

          return {
            rows: [
              {
                attempt_count: String(
                  state.attempts.filter(
                    (attempt) =>
                      attempt.assessmentId === assessmentId ||
                      versionIds.has(attempt.assessmentVersionId),
                  ).length,
                ),
                result_count: String(
                  state.results.filter(
                    (result) =>
                      result.assessmentId === assessmentId ||
                      versionIds.has(result.assessmentVersionId),
                  ).length,
                ),
              },
            ] as T[],
          };
        }

        if (text.includes('DELETE FROM option_signal_weights')) {
          const assessmentId = params?.[0] as string;
          const versionIds = new Set(
            state.versions.filter((version) => version.assessmentId === assessmentId).map((version) => version.id),
          );
          const questionIds = new Set(
            state.questions
              .filter((question) => versionIds.has(question.assessmentVersionId))
              .map((question) => question.id),
          );
          const optionIds = new Set(
            state.options.filter((option) => questionIds.has(option.questionId)).map((option) => option.id),
          );
          const signalIds = new Set(
            state.signals
              .filter((signal) => versionIds.has(signal.assessmentVersionId))
              .map((signal) => signal.id),
          );
          state.weights = state.weights.filter(
            (weight) => !optionIds.has(weight.optionId) && !signalIds.has(weight.signalId),
          );
          return { rows: [] as T[] };
        }

        if (text.includes('DELETE FROM options')) {
          const assessmentId = params?.[0] as string;
          const versionIds = new Set(
            state.versions.filter((version) => version.assessmentId === assessmentId).map((version) => version.id),
          );
          const questionIds = new Set(
            state.questions
              .filter((question) => versionIds.has(question.assessmentVersionId))
              .map((question) => question.id),
          );
          state.options = state.options.filter((option) => !questionIds.has(option.questionId));
          return { rows: [] as T[] };
        }

        if (text.includes('DELETE FROM questions')) {
          const assessmentId = params?.[0] as string;
          const versionIds = new Set(
            state.versions.filter((version) => version.assessmentId === assessmentId).map((version) => version.id),
          );
          state.questions = state.questions.filter(
            (question) => !versionIds.has(question.assessmentVersionId),
          );
          return { rows: [] as T[] };
        }

        if (text.includes('DELETE FROM signals')) {
          const assessmentId = params?.[0] as string;
          const versionIds = new Set(
            state.versions.filter((version) => version.assessmentId === assessmentId).map((version) => version.id),
          );
          state.signals = state.signals.filter((signal) => !versionIds.has(signal.assessmentVersionId));
          return { rows: [] as T[] };
        }

        if (text.includes('DELETE FROM domains')) {
          const assessmentId = params?.[0] as string;
          const versionIds = new Set(
            state.versions.filter((version) => version.assessmentId === assessmentId).map((version) => version.id),
          );
          state.domains = state.domains.filter((domain) => !versionIds.has(domain.assessmentVersionId));
          return { rows: [] as T[] };
        }

        if (text.includes('DELETE FROM assessment_versions')) {
          const assessmentId = params?.[0] as string;
          state.versions = state.versions.filter((version) => version.assessmentId !== assessmentId);
          return { rows: [] as T[] };
        }

        if (text.includes('DELETE FROM assessments')) {
          const [assessmentId, assessmentKey] = params as [string, string];
          const match = state.assessments.find(
            (assessment) => assessment.id === assessmentId && assessment.assessmentKey === assessmentKey,
          );
          state.assessments = state.assessments.filter((assessment) => assessment !== match);
          return {
            rows: match ? ([{ id: match.id }] as unknown as T[]) : ([] as T[]),
          };
        }

        return { rows: [] as T[] };
      },
    },
    state,
  };
}

function buildDeleteFormData(confirmed = true): FormData {
  const formData = new FormData();
  if (confirmed) {
    formData.set('confirmDelete', 'on');
  }
  return formData;
}

test('deletes an assessment and its canonical authoring records when no runtime data exists', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80' }],
    versions: [{ id: 'version-1', assessmentId: 'assessment-1' }],
    domains: [{ id: 'domain-1', assessmentVersionId: 'version-1' }],
    signals: [{ id: 'signal-1', assessmentVersionId: 'version-1' }],
    questions: [{ id: 'question-1', assessmentVersionId: 'version-1' }],
    options: [{ id: 'option-1', questionId: 'question-1' }],
    weights: [{ id: 'weight-1', optionId: 'option-1', signalId: 'signal-1' }],
  });

  await deleteAssessmentRecords({
    db: fake.db,
    assessmentKey: 'wplp80',
  });

  assert.equal(fake.state.assessments.length, 0);
  assert.equal(fake.state.versions.length, 0);
  assert.equal(fake.state.domains.length, 0);
  assert.equal(fake.state.signals.length, 0);
  assert.equal(fake.state.questions.length, 0);
  assert.equal(fake.state.options.length, 0);
  assert.equal(fake.state.weights.length, 0);
});

test('delete action blocks permanent delete when runtime data exists', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80' }],
    versions: [{ id: 'version-1', assessmentId: 'assessment-1' }],
    attempts: [{ id: 'attempt-1', assessmentId: 'assessment-1', assessmentVersionId: 'version-1' }],
  });

  const result = await deleteAssessmentActionWithDependencies(
    'wplp80',
    initialAdminAssessmentDeleteActionState,
    buildDeleteFormData(true),
    {
      getDbPool: () => ({
        async connect() {
          return {
            async query<T>(text: string, params?: readonly unknown[]) {
              if (text.trim() === 'BEGIN' || text.trim() === 'ROLLBACK') {
                return { rows: [] as T[] };
              }
              return fake.db.query<T>(text, params);
            },
            release() {},
          };
        },
      }),
      redirect(path: string): never {
        throw new Error(`unexpected redirect to ${path}`);
      },
      revalidatePath(): void {},
    },
  );

  assert.equal(
    result.formError,
    'This assessment cannot be permanently deleted because runtime user data already exists for it.',
  );
  assert.equal(fake.state.assessments.length, 1);
});

test('delete action redirects to the assessments dashboard after success', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80' }],
    versions: [{ id: 'version-1', assessmentId: 'assessment-1' }],
  });
  const revalidatedPaths: string[] = [];

  await assert.rejects(
    () =>
      deleteAssessmentActionWithDependencies(
        'wplp80',
        initialAdminAssessmentDeleteActionState,
        buildDeleteFormData(true),
        {
          getDbPool: () => ({
            async connect() {
              return {
                async query<T>(text: string, params?: readonly unknown[]) {
                  if (text.trim() === 'BEGIN' || text.trim() === 'COMMIT') {
                    return { rows: [] as T[] };
                  }
                  return fake.db.query<T>(text, params);
                },
                release() {},
              };
            },
          }),
          redirect(path: string): never {
            throw new Error(`REDIRECT:${path}`);
          },
          revalidatePath(path: string): void {
            revalidatedPaths.push(path);
          },
        },
      ),
    /REDIRECT:\/admin\/assessments/,
  );

  assert.equal(fake.state.assessments.length, 0);
  assert.deepEqual(revalidatedPaths, ['/admin/assessments', '/admin/assessments/wplp80']);
});

test('delete action requires explicit confirmation before deleting', async () => {
  let connectCalls = 0;

  const result = await deleteAssessmentActionWithDependencies(
    'wplp80',
    initialAdminAssessmentDeleteActionState,
    buildDeleteFormData(false),
    {
      getDbPool: () => ({
        async connect() {
          connectCalls += 1;
          throw new Error('connect should not be called when confirmation is missing');
        },
      }),
      redirect(path: string): never {
        throw new Error(`unexpected redirect to ${path}`);
      },
      revalidatePath(): void {},
    },
  );

  assert.equal(connectCalls, 0);
  assert.equal(
    result.formError,
    'Confirm permanent deletion before continuing. This action cannot be undone.',
  );
});
