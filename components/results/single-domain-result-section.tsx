import type { CSSProperties } from 'react';

import { ResultSectionIntent } from '@/components/results/result-section-intent';
import type { ComposedNarrativeSection } from '@/lib/assessment-language/single-domain-composer';
import type { ResultReadingSectionsConfig } from '@/lib/results/result-reading-sections';

type SingleDomainResultSectionProps = {
  section: ComposedNarrativeSection;
  sectionsConfig: ResultReadingSectionsConfig;
  step: number;
};

function getRevealStyle(step = 0): CSSProperties {
  return {
    '--sonartra-motion-delay': `${step * 60}ms`,
  } as CSSProperties;
}

function SectionEyebrow({ label }: { label: string }) {
  return <p className="sonartra-report-kicker">{label}</p>;
}

function FocusGroup({
  title,
  items,
  className,
}: {
  title: string;
  items: readonly string[];
  className?: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className={['space-y-3 rounded-[1.4rem] border px-5 py-5', className].filter(Boolean).join(' ')}>
      <p className="sonartra-report-kicker">{title}</p>
      <div className="space-y-3">
        {items.map((item) => (
          <p key={`${title}-${item}`} className="sonartra-report-body-soft text-white/78">
            {item}
          </p>
        ))}
      </div>
    </section>
  );
}

export function SingleDomainResultSection({
  section,
  sectionsConfig,
  step,
}: SingleDomainResultSectionProps) {
  const headingId = `${section.key}-heading`;

  if (section.key === 'hero') {
    const [headline, summary, ...supporting] = section.paragraphs;

    return (
      <section
        id={section.key}
        aria-labelledby={headingId}
        className="results-anchor-target sonartra-motion-reveal sonartra-report-hero rounded-[2rem] border border-white/8 px-7 py-10 sm:px-8 sm:py-11 md:px-12 md:py-14"
        style={getRevealStyle(step)}
      >
        <div className="space-y-7 md:space-y-9">
          <div className="space-y-4">
            <SectionEyebrow label="Hero" />
            <h2 id={headingId} className="sonartra-type-display max-w-[11ch] text-[3.05rem] tracking-[-0.055em] md:text-[5rem]">
              {headline}
            </h2>
            <ResultSectionIntent sectionId={section.key} sectionsConfig={sectionsConfig} className="max-w-[48ch]" />
          </div>

          {summary ? (
            <p className="sonartra-report-summary max-w-[54rem] text-[1.08rem] leading-8 text-white/82 md:text-[1.22rem] md:leading-10">
              {summary}
            </p>
          ) : null}

          {supporting.length > 0 ? (
            <div className="grid gap-5 border-t border-white/7 pt-6 sm:grid-cols-2">
              {supporting.map((paragraph, index) => (
                <p key={`${section.key}-${index + 1}`} className="sonartra-report-body-soft max-w-[34rem] text-white/70">
                  {paragraph}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  if (section.key === 'drivers') {
    return (
      <section
        id={section.key}
        aria-labelledby={headingId}
        className="results-anchor-target sonartra-motion-reveal space-y-8 md:space-y-10"
        style={getRevealStyle(step)}
      >
        <div className="space-y-4">
          <SectionEyebrow label="Drivers" />
          <h2 id={headingId} className="text-[2.1rem] font-semibold tracking-[-0.045em] text-white md:text-[2.7rem]">
            What is creating this pattern
          </h2>
          <ResultSectionIntent sectionId={section.key} sectionsConfig={sectionsConfig} className="max-w-[54ch]" />
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-5">
            {section.focusItems
              .filter((item) => item.label === 'Primary driver' || item.label === 'Secondary driver')
              .map((item) => (
                <FocusGroup
                  key={item.label}
                  title={item.label}
                  items={item.content}
                  className="border-white/8 bg-white/[0.02]"
                />
              ))}
          </div>

          <div className="space-y-5">
            {section.focusItems
              .filter((item) => item.label === 'Supporting context')
              .map((item) => (
                <FocusGroup
                  key={item.label}
                  title={item.label}
                  items={item.content}
                  className="border-white/7 bg-white/[0.015]"
                />
              ))}
            {section.focusItems
              .filter((item) => item.label === 'Range limitation')
              .map((item) => (
                <FocusGroup
                  key={item.label}
                  title={item.label}
                  items={item.content}
                  className="border-amber-200/18 bg-amber-200/[0.06]"
                />
              ))}
          </div>
        </div>
      </section>
    );
  }

  if (section.key === 'application') {
    return (
      <section
        id={section.key}
        aria-labelledby={headingId}
        className="results-anchor-target sonartra-motion-reveal space-y-8 md:space-y-10"
        style={getRevealStyle(step)}
      >
        <div className="space-y-4">
          <SectionEyebrow label="Application" />
          <h2 id={headingId} className="text-[2.1rem] font-semibold tracking-[-0.045em] text-white md:text-[2.7rem]">
            What to rely on, notice, and develop
          </h2>
          <ResultSectionIntent sectionId={section.key} sectionsConfig={sectionsConfig} className="max-w-[54ch]" />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {section.focusItems.map((item) => (
            <FocusGroup
              key={item.label}
              title={item.label}
              items={item.content}
              className="h-full border-white/8 bg-white/[0.02]"
            />
          ))}
        </div>
      </section>
    );
  }

  const [headline, ...body] = section.paragraphs;
  const sectionClasses = {
    intro: 'space-y-7 md:space-y-8',
    pair: 'space-y-7 rounded-[1.8rem] border border-white/7 bg-white/[0.015] px-6 py-7 md:px-8 md:py-8',
    limitation: 'space-y-7 rounded-[1.8rem] border border-amber-200/18 bg-amber-200/[0.06] px-6 py-7 md:px-8 md:py-8',
  }[section.key];

  return (
    <section
      id={section.key}
      aria-labelledby={headingId}
      className={['results-anchor-target sonartra-motion-reveal', sectionClasses].join(' ')}
      style={getRevealStyle(step)}
    >
      <div className="space-y-4">
        <SectionEyebrow label={section.title} />
        <h2
          id={headingId}
          className={section.key === 'intro'
            ? 'max-w-[12ch] text-[3rem] font-semibold tracking-[-0.055em] text-white md:text-[4.2rem]'
            : 'text-[2.1rem] font-semibold tracking-[-0.045em] text-white md:text-[2.7rem]'}
        >
          {headline}
        </h2>
        <ResultSectionIntent sectionId={section.key} sectionsConfig={sectionsConfig} className="max-w-[54ch]" />
      </div>

      <div className="space-y-4 border-t border-white/7 pt-6">
        {body.map((paragraph, index) => (
          <p
            key={`${section.key}-${index + 1}`}
            className={index === 0 ? 'sonartra-report-summary max-w-[56rem] text-white/80' : 'sonartra-report-body-soft max-w-[56rem] text-white/74'}
          >
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
