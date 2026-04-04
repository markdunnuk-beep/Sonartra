'use server';

import { revalidatePath } from 'next/cache';

import type {
  AdminAssessmentIntroFormState,
  AdminAssessmentIntroFormValues,
} from '@/lib/admin/admin-assessment-intro';
import { emptyAdminAssessmentIntroFormValues } from '@/lib/admin/admin-assessment-intro';
import { getDbPool } from '@/lib/server/db';
import { upsertAssessmentVersionIntro } from '@/lib/server/assessment-version-intro-repository';

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type AssessmentIntroDependencies = {
  db: Queryable;
  revalidatePath(path: string): void;
};

type AssessmentVersionRow = {
  assessment_key: string;
  lifecycle_status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
};

function authoringPath(assessmentKey: string): string {
  return `/admin/assessments/${assessmentKey}/assessment-intro`;
}

function normalizeTextInput(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOptionalTextInput(value: FormDataEntryValue | null): string | null {
  const normalized = normalizeTextInput(value);
  return normalized ? normalized : null;
}

function getValuesFromFormData(formData: FormData): AdminAssessmentIntroFormValues {
  return {
    introTitle: normalizeTextInput(formData.get('introTitle')),
    introSummary: normalizeTextInput(formData.get('introSummary')),
    introHowItWorks: normalizeTextInput(formData.get('introHowItWorks')),
    estimatedTimeOverride: normalizeTextInput(formData.get('estimatedTimeOverride')),
    instructions: normalizeTextInput(formData.get('instructions')),
    confidentialityNote: normalizeTextInput(formData.get('confidentialityNote')),
  };
}

async function loadAssessmentVersion(
  db: Queryable,
  assessmentVersionId: string,
): Promise<AssessmentVersionRow | null> {
  const result = await db.query<AssessmentVersionRow>(
    `
    SELECT
      a.assessment_key,
      av.lifecycle_status
    FROM assessment_versions av
    INNER JOIN assessments a ON a.id = av.assessment_id
    WHERE av.id = $1
    `,
    [assessmentVersionId],
  );

  return result.rows[0] ?? null;
}

export async function saveAssessmentIntroAction(
  context: {
    assessmentKey: string;
    assessmentVersionId: string;
  },
  previousState: AdminAssessmentIntroFormState,
  formData: FormData,
): Promise<AdminAssessmentIntroFormState> {
  return saveAssessmentIntroActionWithDependencies(context, previousState, formData, {
    db: getDbPool(),
    revalidatePath,
  });
}

export async function saveAssessmentIntroActionWithDependencies(
  context: {
    assessmentKey: string;
    assessmentVersionId: string;
  },
  _previousState: AdminAssessmentIntroFormState,
  formData: FormData,
  dependencies: AssessmentIntroDependencies,
): Promise<AdminAssessmentIntroFormState> {
  const values = getValuesFromFormData(formData);
  const assessmentVersion = await loadAssessmentVersion(dependencies.db, context.assessmentVersionId);

  if (!assessmentVersion) {
    return {
      formError: 'Assessment intro could not be saved because the draft version was not found.',
      formSuccess: null,
      values,
    };
  }

  if (assessmentVersion.lifecycle_status !== 'DRAFT') {
    return {
      formError: 'Assessment intro can be edited only for draft assessment versions.',
      formSuccess: null,
      values,
    };
  }

  try {
    await upsertAssessmentVersionIntro(dependencies.db, {
      assessmentVersionId: context.assessmentVersionId,
      values: {
        introTitle: values.introTitle,
        introSummary: values.introSummary,
        introHowItWorks: values.introHowItWorks,
        estimatedTimeOverride: normalizeOptionalTextInput(formData.get('estimatedTimeOverride')),
        instructions: normalizeOptionalTextInput(formData.get('instructions')),
        confidentialityNote: normalizeOptionalTextInput(formData.get('confidentialityNote')),
      },
    });

    dependencies.revalidatePath('/admin/assessments');
    dependencies.revalidatePath(authoringPath(assessmentVersion.assessment_key));

    return {
      formError: null,
      formSuccess: 'Assessment intro saved.',
      values,
    };
  } catch {
    return {
      formError: 'Assessment intro could not be saved. Try again.',
      formSuccess: null,
      values,
    };
  }
}

export function createEmptyAssessmentIntroState(): AdminAssessmentIntroFormState {
  return {
    formError: null,
    formSuccess: null,
    values: emptyAdminAssessmentIntroFormValues,
  };
}
