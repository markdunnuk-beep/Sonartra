'use client';

import { LabelPill, cn } from '@/components/shared/user-app-ui';
import type { ComposedNarrativeSection } from '@/lib/assessment-language/single-domain-composer';

function getProvenanceTone(status: ComposedNarrativeSection['provenance']['validationStatus']): string {
  return status === 'ready'
    ? 'border-[rgba(116,209,177,0.18)] bg-[rgba(116,209,177,0.08)] text-[rgba(214,246,233,0.86)]'
    : 'border-[rgba(255,184,107,0.18)] bg-[rgba(255,184,107,0.08)] text-[rgba(255,227,187,0.88)]';
}

export function SingleDomainComposerPreviewSection({
  section,
}: Readonly<{
  section: ComposedNarrativeSection;
}>) {
  return (
    <section
      className="space-y-5 border-t border-white/8 pt-8 first:border-t-0 first:pt-0"
      id={`single-domain-composer-preview-${section.key}`}
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <LabelPill>{section.title}</LabelPill>
          <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
            {section.key}
          </LabelPill>
          <LabelPill className={cn('border', getProvenanceTone(section.provenance.validationStatus))}>
            {section.provenance.validationStatus === 'ready' ? 'Ready' : 'Warning'}
          </LabelPill>
        </div>
        <h3 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-white">
          {section.question}
        </h3>
      </div>

      <div className="space-y-4 text-[0.99rem] leading-8 text-white/78">
        {section.paragraphs.map((paragraph) => (
          <p key={`${section.key}-${paragraph}`}>{paragraph}</p>
        ))}
      </div>

      {section.focusItems.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {section.focusItems.map((item) => (
            <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4" key={`${section.key}-${item.label}`}>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/48">
                {item.label}
              </p>
              <div className="mt-3 space-y-3 text-sm leading-7 text-white/74">
                {item.content.length > 0 ? (
                  item.content.map((entry) => <p key={`${section.key}-${item.label}-${entry}`}>{entry}</p>)
                ) : (
                  <p className="text-white/42">No authored content yet.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
