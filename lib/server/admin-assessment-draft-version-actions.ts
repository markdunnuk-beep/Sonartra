import { redirect } from 'next/navigation';

import {
  createDraftVersionFromLatestPublishedAssessment,
  type DraftVersionCreationResult,
} from '@/lib/server/admin-assessment-draft-version-service';

export type AdminAssessmentVersionRouteMode = 'multi_domain' | 'single_domain';

type CreateDraftVersionActionDependencies = {
  createDraftVersion(assessmentKey: string): Promise<DraftVersionCreationResult>;
};

type CreateDraftVersionRedirect = {
  href: string;
};

export function getAdminAssessmentBuilderBasePath(
  mode: AdminAssessmentVersionRouteMode,
  assessmentKey: string,
): string {
  return mode === 'single_domain'
    ? `/admin/assessments/single-domain/${assessmentKey}`
    : `/admin/assessments/${assessmentKey}`;
}

export async function resolveCreateDraftVersionRedirect(
  params: {
    assessmentKey: string;
    mode: AdminAssessmentVersionRouteMode;
  },
  dependencies: CreateDraftVersionActionDependencies = {
    createDraftVersion: createDraftVersionFromLatestPublishedAssessment,
  },
): Promise<CreateDraftVersionRedirect> {
  const builderBasePath = getAdminAssessmentBuilderBasePath(params.mode, params.assessmentKey);
  const createVersionPath = `${builderBasePath}/versions/new`;
  const result = await dependencies.createDraftVersion(params.assessmentKey);

  switch (result.status) {
    case 'created':
      return {
        href: `${builderBasePath}/review?draftVersionCreated=${encodeURIComponent(result.draftVersionTag)}`,
      };
    case 'draft_exists':
      return {
        href: `${createVersionPath}?status=draft_exists&draftVersion=${encodeURIComponent(result.draftVersionTag)}`,
      };
    case 'assessment_not_found':
      return {
        href: `${createVersionPath}?status=assessment_not_found`,
      };
    case 'published_source_not_found':
      return {
        href: `${createVersionPath}?status=published_source_not_found`,
      };
    case 'persistence_error':
      return {
        href: `${createVersionPath}?status=persistence_error`,
      };
  }
}

export async function createDraftVersionAction(
  mode: AdminAssessmentVersionRouteMode,
  assessmentKey: string,
): Promise<void> {
  'use server';

  const target = await resolveCreateDraftVersionRedirect({
    assessmentKey,
    mode,
  });

  redirect(target.href);
}
