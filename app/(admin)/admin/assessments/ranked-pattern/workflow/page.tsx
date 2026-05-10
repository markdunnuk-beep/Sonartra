import { RankedPatternImportPanel } from '@/components/admin/ranked-pattern-import-panel';
import { PageFrame, PageHeader } from '@/components/shared/user-app-ui';

export default async function RankedPatternPackageWorkflowPage() {
  return (
    <PageFrame className="space-y-8">
      <PageHeader
        eyebrow="Ranked-pattern admin"
        title="Import ranked-pattern assessment"
        description="Upload a ranked-pattern workbook, check it, then follow the recommended action panel. Nothing is imported or published until you choose those later steps."
      />

      <RankedPatternImportPanel latestDraftVersion={null} />
    </PageFrame>
  );
}
