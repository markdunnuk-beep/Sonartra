import type { Queryable } from '@/lib/engine/repository-sql';
import { getAdminAssessmentDetailByKey } from '@/lib/server/admin-assessment-detail';
import { getAssessmentVersionIntro } from '@/lib/server/assessment-version-intro-repository';

export type AdminAssessmentIntroStepViewModel = {
  assessmentId: string;
  assessmentKey: string;
  assessmentTitle: string;
  assessmentDescription: string | null;
  draftVersion: {
    assessmentVersionId: string;
    versionTag: string;
  } | null;
  intro: {
    introTitle: string;
    introSummary: string;
    introHowItWorks: string;
    estimatedTimeOverride: string;
    instructions: string;
    confidentialityNote: string;
  };
};

function createEmptyIntro() {
  return {
    introTitle: '',
    introSummary: '',
    introHowItWorks: '',
    estimatedTimeOverride: '',
    instructions: '',
    confidentialityNote: '',
  };
}

export async function getAdminAssessmentIntroStepViewModel(
  db: Queryable,
  assessmentKey: string,
): Promise<AdminAssessmentIntroStepViewModel | null> {
  const assessment = await getAdminAssessmentDetailByKey(db, assessmentKey);

  if (!assessment) {
    return null;
  }

  if (!assessment.latestDraftVersion) {
    return {
      assessmentId: assessment.assessmentId,
      assessmentKey: assessment.assessmentKey,
      assessmentTitle: assessment.title,
      assessmentDescription: assessment.description,
      draftVersion: null,
      intro: createEmptyIntro(),
    };
  }

  const intro = await getAssessmentVersionIntro(
    assessment.latestDraftVersion.assessmentVersionId,
    db,
  );

  return {
    assessmentId: assessment.assessmentId,
    assessmentKey: assessment.assessmentKey,
    assessmentTitle: assessment.title,
    assessmentDescription: assessment.description,
    draftVersion: {
      assessmentVersionId: assessment.latestDraftVersion.assessmentVersionId,
      versionTag: assessment.latestDraftVersion.versionTag,
    },
    intro: intro
      ? {
          introTitle: intro.introTitle,
          introSummary: intro.introSummary,
          introHowItWorks: intro.introHowItWorks,
          estimatedTimeOverride: intro.estimatedTimeOverride ?? '',
          instructions: intro.instructions ?? '',
          confidentialityNote: intro.confidentialityNote ?? '',
        }
      : createEmptyIntro(),
  };
}
