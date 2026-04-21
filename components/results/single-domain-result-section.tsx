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
  itemClassName,
}: {
  title: string;
  items: readonly string[];
  className?: string;
  itemClassName?: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section
      className={[
        'sonartra-single-domain-surface space-y-3 rounded-[1.45rem] border px-5 py-5',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <p className="sonartra-report-kicker text-white/42">{title}</p>
      <div className="sonartra-single-domain-focus-grid">
        {items.map((item, index) => (
          <p
            key={`${title}-${item}`}
            className={[
              'sonartra-single-domain-focus-item sonartra-report-body-soft text-white/76',
              index === 0 ? 'text-white/82' : '',
              itemClassName,
            ]
              .filter(Boolean)
              .join(' ')}
          >
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
        className="results-anchor-target sonartra-motion-reveal sonartra-single-domain-section sonartra-report-hero border-white/8 md:py-15 rounded-[2.2rem] border px-7 py-11 sm:px-8 sm:py-12 md:px-12 lg:px-14"
        style={getRevealStyle(step)}
      >
        <div className="space-y-8 md:space-y-10">
          <div className="space-y-4 md:space-y-5">
            <SectionEyebrow label="Hero" />
            <h2
              id={headingId}
              className="sonartra-type-display max-w-[10ch] text-[3.15rem] tracking-[-0.058em] md:text-[5.25rem]"
            >
              {headline}
            </h2>
            <ResultSectionIntent
              sectionId={section.key}
              sectionsConfig={sectionsConfig}
              className="max-w-[48ch]"
            />
          </div>

          {summary ? (
            <p className="sonartra-report-summary text-white/84 max-w-[56rem] text-[1.08rem] leading-8 md:text-[1.24rem] md:leading-10">
              {summary}
            </p>
          ) : null}

          {supporting.length > 0 ? (
            <div className="border-white/7 grid gap-5 border-t pt-7 sm:grid-cols-2">
              {supporting.map((paragraph, index) => (
                <p
                  key={`${section.key}-${index + 1}`}
                  className="sonartra-report-body-soft text-white/66 max-w-[34rem]"
                >
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
        className="results-anchor-target sonartra-motion-reveal sonartra-single-domain-section space-y-8 md:space-y-10"
        style={getRevealStyle(step)}
      >
        <div className="space-y-4">
          <SectionEyebrow label="Drivers" />
          <h2
            id={headingId}
            className="text-[2.1rem] font-semibold tracking-[-0.045em] text-white md:text-[2.7rem]"
          >
            What is creating this pattern
          </h2>
          <ResultSectionIntent
            sectionId={section.key}
            sectionsConfig={sectionsConfig}
            className="max-w-[54ch]"
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)] lg:gap-6">
          <div className="space-y-5">
            {section.focusItems
              .filter((item) => item.label === 'Primary driver')
              .map((item) => (
                <FocusGroup
                  key={item.label}
                  title={item.label}
                  items={item.content}
                  className="border-white/8 bg-white/[0.03] px-6 py-6"
                  itemClassName="text-[0.98rem] leading-7"
                />
              ))}

            {section.focusItems
              .filter((item) => item.label === 'Secondary driver')
              .map((item) => (
                <FocusGroup
                  key={item.label}
                  title={item.label}
                  items={item.content}
                  className="border-white/7 bg-white/[0.018]"
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
                  className="border-white/7 bg-white/[0.012]"
                />
              ))}
            {section.focusItems
              .filter((item) => item.label === 'Range limitation')
              .map((item) => (
                <FocusGroup
                  key={item.label}
                  title={item.label}
                  items={item.content}
                  className="border-amber-200/18 sonartra-single-domain-surface-warm bg-amber-200/[0.06]"
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
        className="results-anchor-target sonartra-motion-reveal sonartra-single-domain-section space-y-8 md:space-y-10"
        style={getRevealStyle(step)}
      >
        <div className="space-y-4">
          <SectionEyebrow label="Application" />
          <h2
            id={headingId}
            className="text-[2.1rem] font-semibold tracking-[-0.045em] text-white md:text-[2.7rem]"
          >
            What to rely on, notice, and develop
          </h2>
          <ResultSectionIntent
            sectionId={section.key}
            sectionsConfig={sectionsConfig}
            className="max-w-[54ch]"
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {section.focusItems.map((item) => (
            <FocusGroup
              key={item.label}
              title={item.label}
              items={item.content}
              className="border-white/8 h-full bg-white/[0.02]"
            />
          ))}
        </div>
      </section>
    );
  }

  const [headline, ...body] = section.paragraphs;
  const sectionClasses = {
    intro: 'space-y-7 md:space-y-8',
    pair: 'space-y-6 rounded-[1.9rem] border px-6 py-7 md:px-8 md:py-8 sonartra-single-domain-surface-muted',
    limitation:
      'space-y-6 rounded-[1.9rem] border px-6 py-7 md:px-8 md:py-8 sonartra-single-domain-surface-warm',
  }[section.key];

  return (
    <section
      id={section.key}
      aria-labelledby={headingId}
      className={[
        'results-anchor-target sonartra-motion-reveal sonartra-single-domain-section',
        sectionClasses,
      ].join(' ')}
      style={getRevealStyle(step)}
    >
      <div className="space-y-4">
        <SectionEyebrow label={section.title} />
        <h2
          id={headingId}
          className={
            section.key === 'intro'
              ? 'max-w-[12ch] text-[3rem] font-semibold tracking-[-0.055em] text-white md:text-[4.2rem]'
              : 'text-[2.1rem] font-semibold tracking-[-0.045em] text-white md:text-[2.7rem]'
          }
        >
          {headline}
        </h2>
        <ResultSectionIntent
          sectionId={section.key}
          sectionsConfig={sectionsConfig}
          className="max-w-[54ch]"
        />
      </div>

      <div className="border-white/7 space-y-4 border-t pt-6">
        {body.map((paragraph, index) => (
          <p
            key={`${section.key}-${index + 1}`}
            className={
              index === 0
                ? 'sonartra-report-summary max-w-[54rem] text-white/80'
                : section.key === 'pair'
                  ? 'sonartra-report-body-soft text-white/66 max-w-[54rem]'
                  : section.key === 'limitation'
                    ? 'sonartra-report-body-soft text-white/72 max-w-[54rem]'
                    : 'sonartra-report-body-soft text-white/74 max-w-[56rem]'
            }
          >
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
