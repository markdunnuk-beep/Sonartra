import { ButtonLink, LabelPill, SectionHeader, SurfaceCard } from '@/components/shared/user-app-ui';
import {
  createDraftVersionAction,
  type AdminAssessmentVersionRouteMode,
} from '@/lib/server/admin-assessment-draft-version-actions';

type CreateVersionStatus =
  | 'draft_exists'
  | 'assessment_not_found'
  | 'published_source_not_found'
  | 'persistence_error';

function getStatusCopy(status: CreateVersionStatus | null, draftVersionTag: string | null) {
  switch (status) {
    case 'draft_exists':
      return {
        tone: 'Draft already exists',
        title: 'A draft version already exists for this assessment.',
        description: draftVersionTag
          ? `Draft ${draftVersionTag} is already available in the builder.`
          : 'The existing draft is already available in the builder.',
      };
    case 'assessment_not_found':
      return {
        tone: 'Not found',
        title: 'Assessment not found.',
        description: 'The assessment could not be found. Return to the assessment library and choose an existing record.',
      };
    case 'published_source_not_found':
      return {
        tone: 'Published source required',
        title: 'A new version can only be created from a published source version.',
        description: 'Publish the current assessment before creating the next draft version.',
      };
    case 'persistence_error':
      return {
        tone: 'Could not create draft',
        title: 'The draft version could not be created.',
        description: 'Something went wrong while creating the draft version. Try again, or review the assessment setup before retrying.',
      };
    default:
      return null;
  }
}

export function AdminAssessmentVersionPlaceholder({
  assessmentKey,
  backHref,
  mode,
  status = null,
  draftVersionTag = null,
}: Readonly<{
  assessmentKey: string;
  backHref: string;
  mode: AdminAssessmentVersionRouteMode;
  status?: CreateVersionStatus | null;
  draftVersionTag?: string | null;
}>) {
  const statusCopy = getStatusCopy(status, draftVersionTag);
  const createAction = createDraftVersionAction.bind(null, mode, assessmentKey);

  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow="Versioning"
        title="Create new version"
        description="Start a new version of an existing assessment family."
      />

      <SurfaceCard className="space-y-5 p-5 lg:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <LabelPill>{assessmentKey}</LabelPill>
          <LabelPill className="border-white/10 bg-white/[0.04] text-white/68">
            {statusCopy?.tone ?? 'Draft creation'}
          </LabelPill>
        </div>

        <div className="space-y-2">
          <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-white">
            {statusCopy?.title ?? 'Create a new draft version from the published assessment.'}
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            {statusCopy?.description
              ?? 'This will keep the same assessment family and create the next editable draft version. Existing attempts, responses, and results stay linked to their original published version.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {status === 'assessment_not_found' ? (
            <ButtonLink href="/admin/assessments">Back to assessment library</ButtonLink>
          ) : (
            <ButtonLink href={backHref}>Back to assessment</ButtonLink>
          )}
          {status === 'draft_exists' ? (
            <ButtonLink href={`${backHref}/review`} variant="primary">
              Open existing draft
            </ButtonLink>
          ) : null}
          {status !== 'draft_exists' && status !== 'assessment_not_found' ? (
            <form action={createAction}>
              <button
                type="submit"
                className="sonartra-button sonartra-button-primary sonartra-focus-ring"
              >
                Create draft version
              </button>
            </form>
          ) : null}
        </div>
      </SurfaceCard>
    </section>
  );
}
