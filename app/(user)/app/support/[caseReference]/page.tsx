import { notFound } from 'next/navigation';

import {
  ButtonLink,
  LabelPill,
  MetaItem,
  PageFrame,
  SurfaceCard,
} from '@/components/shared/user-app-ui';
import { getCurrentUserSupportCase, SupportValidationError } from '@/lib/server/support-service';
import {
  formatSupportAuthorType,
  formatSupportCategory,
  formatSupportDate,
  formatSupportDateTime,
  formatSupportPriority,
  formatSupportStatus,
} from '@/lib/support/support-display';

type SupportCaseDetailPageProps = {
  params: Promise<{
    caseReference: string;
  }>;
};

export default async function SupportCaseDetailPage({ params }: SupportCaseDetailPageProps) {
  const { caseReference } = await params;
  let supportCase;

  try {
    supportCase = await getCurrentUserSupportCase(caseReference);
  } catch (error) {
    if (error instanceof SupportValidationError) {
      notFound();
    }

    throw error;
  }

  if (!supportCase) {
    notFound();
  }

  return (
    <PageFrame>
      <div className="mb-6">
        <ButtonLink href="/app/support" variant="secondary">
          Back to support
        </ButtonLink>
      </div>

      <SurfaceCard accent className="overflow-hidden p-0">
        <header className="space-y-6 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <LabelPill>{supportCase.publicReference}</LabelPill>
            <span className="rounded-full border border-[#32D6B0]/20 bg-[#32D6B0]/[0.08] px-3 py-1 text-xs font-semibold text-[#DFFCF4]">
              {formatSupportStatus(supportCase.status)}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-[#D8D0C3]/78">
              {formatSupportPriority(supportCase.priority)}
            </span>
          </div>

          <div className="space-y-4">
            <p className="sonartra-page-eyebrow">Support case</p>
            <h1 className="sonartra-page-title">{supportCase.subject}</h1>
            <p className="max-w-3xl text-base leading-8 text-[#D8D0C3]/76">
              This case detail view shows the public support thread. Replies will be added in
              the next support task.
            </p>
          </div>
        </header>
      </SurfaceCard>

      <section className="sonartra-section">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetaItem label="Reference" value={supportCase.publicReference} />
          <MetaItem label="Category" value={formatSupportCategory(supportCase.category)} />
          <MetaItem label="Status" value={formatSupportStatus(supportCase.status)} />
          <MetaItem label="Priority" value={formatSupportPriority(supportCase.priority)} />
          <MetaItem label="Created" value={formatSupportDate(supportCase.createdAt)} />
          <MetaItem label="Updated" value={formatSupportDate(supportCase.updatedAt)} />
          <MetaItem label="Resolved" value={formatSupportDate(supportCase.resolvedAt)} />
          <MetaItem label="Closed" value={formatSupportDate(supportCase.closedAt)} />
        </div>
      </section>

      <section className="sonartra-section">
        <div className="sonartra-section-header sonartra-motion-reveal-soft">
          <p className="sonartra-page-eyebrow">Message thread</p>
          <h2 className="sonartra-section-title">Public messages</h2>
          <p className="sonartra-section-description">
            Internal notes are not shown in the user support case view.
          </p>
        </div>

        <SurfaceCard className="p-0">
          {supportCase.messages.length > 0 ? (
            <ol className="divide-y divide-white/10" aria-label="Support case public message thread">
              {supportCase.messages.map((message) => (
                <li className="p-5 sm:p-6" key={message.id}>
                  <article className="space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-semibold text-[#F5F1EA]">
                        {formatSupportAuthorType(message.authorType)}
                      </p>
                      <time
                        className="text-xs font-medium uppercase tracking-[0.12em] text-[#9A9185]/76"
                        dateTime={message.createdAt}
                      >
                        {formatSupportDateTime(message.createdAt)}
                      </time>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-[#D8D0C3]/78">
                      {message.body}
                    </p>
                  </article>
                </li>
              ))}
            </ol>
          ) : (
            <div className="p-5 sm:p-6" role="status">
              <h2 className="text-xl font-semibold text-[#F5F1EA]">No public messages yet</h2>
              <p className="mt-2 text-sm leading-7 text-[#D8D0C3]/72">
                Public replies and message history will appear here as this case progresses.
              </p>
            </div>
          )}
        </SurfaceCard>
      </section>
    </PageFrame>
  );
}
