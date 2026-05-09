import { RankedPatternImportPanel } from '@/components/admin/ranked-pattern-import-panel';
import {
  LabelPill,
  PageFrame,
  PageHeader,
  SecondaryText,
  SurfaceCard,
} from '@/components/shared/user-app-ui';

export default async function RankedPatternPackageWorkflowPage() {
  return (
    <PageFrame className="space-y-8">
      <PageHeader
        eyebrow="Ranked-pattern admin"
        title="Import ranked-pattern assessment"
        description="Upload a completed assessment workbook, check it, import it into a draft, then publish when ready."
      />

      <SurfaceCard accent className="space-y-4 p-5 lg:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <LabelPill>Workbook-first workflow</LabelPill>
          <LabelPill className="border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]">
            No assessment record required
          </LabelPill>
        </div>
        <SecondaryText>
          The workbook metadata supplies the assessment key, title, package version, and domain key.
          The workflow will create or resolve a compatible ranked-pattern shell and draft from that
          metadata before import or publish actions are enabled.
        </SecondaryText>
        <SecondaryText>
          If the package key already belongs to a legacy or incompatible builder record, the action
          returns a structured conflict instead of attaching the package silently.
        </SecondaryText>
      </SurfaceCard>

      <RankedPatternImportPanel latestDraftVersion={null} />
    </PageFrame>
  );
}
