'use client';

import { LabelPill, SurfaceCard, cn } from '@/components/shared/user-app-ui';
import type { SingleDomainNarrativeBuilderSection } from '@/lib/assessment-language/single-domain-builder-mappers';

const DRIVER_ROLE_LABELS = [
  {
    key: 'primary_driver',
    description: 'The strongest signal shaping the pattern.',
  },
  {
    key: 'secondary_driver',
    description: 'The reinforcing signal behind the pattern.',
  },
  {
    key: 'supporting_context',
    description: 'Useful context that adds shape without owning the pattern.',
  },
  {
    key: 'range_limitation',
    description: 'A weaker or underplayed signal that limits range rather than sitting as neutral background.',
  },
] as const;

const APPLICATION_FOCUS_LABELS = [
  {
    key: 'rely on',
    description: 'What the person should trust in the established pattern.',
  },
  {
    key: 'notice',
    description: 'What should be monitored when the pattern starts to narrow.',
  },
  {
    key: 'develop',
    description: 'What needs deliberate range-building and follow-through.',
  },
] as const;

function getValidationTone(state: SingleDomainNarrativeBuilderSection['validationState']): string {
  return state === 'ready'
    ? 'border-[rgba(116,209,177,0.18)] bg-[rgba(116,209,177,0.08)] text-[rgba(214,246,233,0.86)]'
    : 'border-[rgba(255,184,107,0.18)] bg-[rgba(255,184,107,0.08)] text-[rgba(255,227,187,0.88)]';
}

function ActionStub({
  title,
  description,
}: Readonly<{
  title: string;
  description: string;
}>) {
  return (
    <div className="rounded-[0.95rem] border border-white/8 bg-black/10 p-4">
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-white/56">{description}</p>
      <button
        className="sonartra-button sonartra-button-secondary mt-4 cursor-not-allowed border-white/8 bg-white/[0.04] text-white/48"
        disabled
        type="button"
      >
        Coming in a later task
      </button>
    </div>
  );
}

export function SingleDomainSectionPanel({
  section,
}: Readonly<{
  section: SingleDomainNarrativeBuilderSection;
}>) {
  return (
    <SurfaceCard
      className="space-y-5 p-5 lg:p-6"
      accent={section.key === 'hero'}
      dashed={section.key === 'limitation'}
      muted={section.status === 'waiting'}
    >
      <div
        className="space-y-3 scroll-mt-24"
        id={`single-domain-section-${section.key}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="sonartra-page-eyebrow">{section.title}</p>
            <h3 className="text-[1.35rem] font-semibold tracking-[-0.03em] text-white">
              {section.question}
            </h3>
            <p className="max-w-3xl text-sm leading-6 text-white/62">{section.purpose}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LabelPill>{section.completionLabel}</LabelPill>
            <LabelPill className={getValidationTone(section.validationState)}>
              {section.validationState === 'ready' ? 'Validation ready' : 'Validation warning'}
            </LabelPill>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[0.95rem] border border-white/8 bg-black/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
              Completion
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
              {section.currentRowCount}/{section.expectedRowCount > 0 ? section.expectedRowCount : 0}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/56">Current adapted section row coverage.</p>
          </div>
          <div className="rounded-[0.95rem] border border-white/8 bg-black/10 p-4 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
              Owned claims
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {section.allowedClaimOwnership.map((claim) => (
                <LabelPill
                  className="border-white/10 bg-white/[0.04] text-white/66"
                  key={claim}
                >
                  {claim}
                </LabelPill>
              ))}
            </div>
          </div>
        </div>
      </div>

      {section.key === 'drivers' ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-white">Driver roles</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {DRIVER_ROLE_LABELS.map((role) => (
              <div
                className={cn(
                  'rounded-[0.95rem] border p-4',
                  role.key === 'range_limitation'
                    ? 'border-[rgba(255,184,107,0.18)] bg-[rgba(255,184,107,0.08)]'
                    : 'border-white/8 bg-black/10',
                )}
                key={role.key}
              >
                <LabelPill
                  className={cn(
                    'border-white/10 bg-white/[0.04] text-white/68',
                    role.key === 'range_limitation' && 'border-[rgba(255,184,107,0.18)] bg-[rgba(255,184,107,0.08)] text-[rgba(255,227,187,0.88)]',
                  )}
                >
                  {role.key}
                </LabelPill>
                <p className="mt-3 text-sm leading-6 text-white/58">{role.description}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {section.key === 'application' ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-white">Application focus</p>
          <div className="grid gap-3 md:grid-cols-3">
            {APPLICATION_FOCUS_LABELS.map((item) => (
              <div className="rounded-[0.95rem] border border-white/8 bg-black/10 p-4" key={item.key}>
                <LabelPill className="border-white/10 bg-white/[0.04] text-white/68">
                  {item.key}
                </LabelPill>
                <p className="mt-3 text-sm leading-6 text-white/58">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <p className="text-sm font-medium text-white">Validation surface</p>
        <div className="space-y-2">
          {section.validationMessages.map((message) => (
            <div
              className={cn(
                'rounded-[0.95rem] border px-4 py-3 text-sm leading-6',
                section.validationState === 'ready'
                  ? 'border-[rgba(116,209,177,0.12)] bg-[rgba(116,209,177,0.04)] text-white/74'
                  : 'border-[rgba(255,184,107,0.14)] bg-[rgba(255,184,107,0.05)] text-white/74',
              )}
              key={message}
            >
              {message}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-white">Primary action area</p>
        <div className="rounded-[0.95rem] border border-[rgba(126,179,255,0.14)] bg-[rgba(126,179,255,0.05)] p-4">
          <p className="text-sm font-medium text-white">Future import schema</p>
          <p className="mt-2 text-sm leading-6 text-white/56">
            This section will import against the locked Task 1 pipe-delimited header only.
          </p>
          <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded-[0.85rem] border border-white/8 bg-black/20 p-3 text-xs leading-6 text-white/72">
            {section.importHeader}
          </pre>
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          <ActionStub
            title="Pipe-delimited import"
            description="Section-native import actions will bind to this shell without introducing a second authoring model."
          />
          <ActionStub
            title="Composer preview"
            description="Composer preview will validate the locked section contract against a single preview input shape."
          />
          <ActionStub
            title="Publish blockers"
            description="Publish blockers will consume section completeness and validation state directly from this shell."
          />
        </div>
      </div>
    </SurfaceCard>
  );
}
