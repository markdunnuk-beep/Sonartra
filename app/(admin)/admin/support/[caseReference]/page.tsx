import { notFound } from 'next/navigation';

import {
  AdminSupportInternalNoteForm,
  AdminSupportPriorityForm,
  AdminSupportReplyForm,
  AdminSupportStatusForm,
} from '@/components/admin/support-case-action-forms';
import {
  ButtonLink,
  LabelPill,
  MetaItem,
  PageFrame,
  PageHeader,
  SectionHeader,
  SurfaceCard,
  cn,
} from '@/components/shared/user-app-ui';
import {
  getAdminSupportCase,
  SupportValidationError,
  type AdminSupportCaseDetail,
  type SupportCaseMessage,
} from '@/lib/server/support-service';
import {
  formatAdminSupportStatus,
  formatSupportAuthorType,
  formatSupportCategory,
  formatSupportDate,
  formatSupportDateTime,
  formatSupportPriority,
} from '@/lib/support/support-display';

type AdminSupportCaseDetailPageProps = {
  params: Promise<{
    caseReference: string;
  }>;
};

function getMessageAuthorLabel(message: SupportCaseMessage): string {
  if (message.isInternalNote) {
    return 'Internal note';
  }

  return formatSupportAuthorType(message.authorType);
}

function MessageThread({
  supportCase,
}: Readonly<{
  supportCase: AdminSupportCaseDetail;
}>) {
  return (
    <SurfaceCard className="p-0">
      {supportCase.messages.length > 0 ? (
        <ol className="divide-y divide-white/10" aria-label="Admin support case message thread">
          {supportCase.messages.map((message) => (
            <li
              className={cn(
                'p-5 sm:p-6',
                message.isInternalNote ? 'bg-[rgba(255,184,107,0.06)]' : '',
              )}
              key={message.id}
            >
              <article className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[#F5F1EA]">
                      {getMessageAuthorLabel(message)}
                    </p>
                    {message.isInternalNote ? (
                      <LabelPill className="border-[rgba(255,184,107,0.24)] bg-[rgba(255,184,107,0.1)] text-[rgba(255,229,192,0.92)]">
                        Admin only
                      </LabelPill>
                    ) : null}
                  </div>
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
          <h2 className="text-xl font-semibold text-[#F5F1EA]">No messages yet</h2>
          <p className="mt-2 text-sm leading-7 text-[#D8D0C3]/72">
            Public replies and internal notes will appear here as the case progresses.
          </p>
        </div>
      )}
    </SurfaceCard>
  );
}

export default async function AdminSupportCaseDetailPage({
  params,
}: AdminSupportCaseDetailPageProps) {
  const { caseReference } = await params;
  let supportCase: AdminSupportCaseDetail | null = null;

  try {
    supportCase = await getAdminSupportCase(caseReference);
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
        <ButtonLink href="/admin/support" variant="secondary">
          Back to support queue
        </ButtonLink>
      </div>

      <PageHeader
        eyebrow="Support Admin"
        title={supportCase.subject}
        description="Review the full support thread and manage the native Sonartra support case."
      />

      <SurfaceCard accent className="overflow-hidden p-0">
        <header className="space-y-6 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <LabelPill>{supportCase.publicReference}</LabelPill>
            <LabelPill className="border-[#32D6B0]/20 bg-[#32D6B0]/[0.08] text-[#DFFCF4]">
              {formatAdminSupportStatus(supportCase.status)}
            </LabelPill>
            <LabelPill className="border-white/10 bg-white/[0.04] text-[#D8D0C3]/78">
              {formatSupportPriority(supportCase.priority)}
            </LabelPill>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetaItem label="Reference" value={supportCase.publicReference} />
            <MetaItem label="User" value={supportCase.userName ?? supportCase.userEmail} />
            <MetaItem label="Email" value={supportCase.userEmail} />
            <MetaItem label="Category" value={formatSupportCategory(supportCase.category)} />
            <MetaItem label="Status" value={formatAdminSupportStatus(supportCase.status)} />
            <MetaItem label="Priority" value={formatSupportPriority(supportCase.priority)} />
            <MetaItem label="Created" value={formatSupportDate(supportCase.createdAt)} />
            <MetaItem label="Updated" value={formatSupportDate(supportCase.updatedAt)} />
            <MetaItem label="Resolved" value={formatSupportDate(supportCase.resolvedAt)} />
            <MetaItem label="Closed" value={formatSupportDate(supportCase.closedAt)} />
          </div>
        </header>
      </SurfaceCard>

      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Thread"
          title="Case messages"
          description="Public messages and admin-only internal notes for this support case."
        />
        <MessageThread supportCase={supportCase} />
      </section>

      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Actions"
          title="Case controls"
          description="Update status and priority for this support case."
        />
        {supportCase.status === 'closed' ? (
          <SurfaceCard muted className="mb-4 p-5 sm:p-6" role="status">
            <h2 className="text-xl font-semibold text-[#F5F1EA]">This case is closed</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[#D8D0C3]/72">
              Reopen it before sending a public reply. Internal notes can still be added for
              admin context.
            </p>
          </SurfaceCard>
        ) : null}
        <SurfaceCard className="p-5 sm:p-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <AdminSupportStatusForm
              caseReference={supportCase.publicReference}
              currentStatus={supportCase.status}
            />
            <AdminSupportPriorityForm
              caseReference={supportCase.publicReference}
              currentPriority={supportCase.priority}
            />
          </div>
        </SurfaceCard>
      </section>

      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Public reply"
          title="Reply to customer"
          description="Send a public support reply that appears in the customer's case thread."
        />
        {supportCase.status === 'closed' ? (
          <SurfaceCard muted className="p-5 sm:p-6" role="status">
            <h2 className="text-xl font-semibold text-[#F5F1EA]">Public replies are paused</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[#D8D0C3]/72">
              Change the status from Closed before sending another customer-facing reply.
            </p>
          </SurfaceCard>
        ) : (
          <AdminSupportReplyForm caseReference={supportCase.publicReference} />
        )}
      </section>

      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Internal note"
          title="Admin-only note"
          description="Record operational context that must stay hidden from the user-facing case view."
        />
        <AdminSupportInternalNoteForm caseReference={supportCase.publicReference} />
      </section>
    </PageFrame>
  );
}
