'use client';

import { LabelPill, SurfaceCard, cn } from '@/components/shared/user-app-ui';
import type { SingleDomainNarrativeBuilderSection } from '@/lib/assessment-language/single-domain-builder-mappers';

function getStatusTone(status: SingleDomainNarrativeBuilderSection['status']): string {
  switch (status) {
    case 'complete':
      return 'border-[rgba(116,209,177,0.18)] bg-[rgba(116,209,177,0.08)] text-[rgba(214,246,233,0.86)]';
    case 'incomplete':
      return 'border-[rgba(255,184,107,0.18)] bg-[rgba(255,184,107,0.08)] text-[rgba(255,227,187,0.88)]';
    case 'waiting':
      return 'border-white/10 bg-white/[0.04] text-white/62';
  }
}

export function SingleDomainSectionNav({
  sections,
}: Readonly<{
  sections: readonly SingleDomainNarrativeBuilderSection[];
}>) {
  return (
    <SurfaceCard className="space-y-4 p-4 lg:p-5">
      <div className="space-y-1">
        <p className="sonartra-page-eyebrow">Narrative sections</p>
        <h3 className="text-lg font-semibold tracking-[-0.03em] text-white">
          Locked six-section order
        </h3>
      </div>

      <nav
        aria-label="Single-domain narrative sections"
        className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
      >
        {sections.map((section, index) => (
          <a
            className={cn(
              'rounded-[1rem] border px-4 py-4 text-left transition hover:border-[rgba(126,179,255,0.22)] hover:bg-[rgba(126,179,255,0.06)]',
              section.status === 'complete'
                ? 'border-[rgba(116,209,177,0.14)] bg-[rgba(116,209,177,0.04)]'
                : section.status === 'incomplete'
                  ? 'border-[rgba(255,184,107,0.14)] bg-[rgba(255,184,107,0.05)]'
                  : 'border-white/8 bg-black/10',
            )}
            href={`#single-domain-section-${section.key}`}
            key={section.key}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
                  {index + 1}. {section.title}
                </p>
                <p className="text-sm font-medium text-white">{section.question}</p>
              </div>
              <LabelPill className={getStatusTone(section.status)}>{section.completionLabel}</LabelPill>
            </div>
          </a>
        ))}
      </nav>
    </SurfaceCard>
  );
}
