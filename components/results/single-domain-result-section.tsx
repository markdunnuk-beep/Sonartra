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
  titleClassName,
  preface,
}: {
  title: string;
  items: readonly string[];
  className?: string;
  itemClassName?: string;
  titleClassName?: string;
  preface?: string;
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
      <div className="space-y-2">
        {preface ? (
          <p className="text-[0.62rem] font-medium uppercase tracking-[0.18em] text-white/28">
            {preface}
          </p>
        ) : null}
        <p
          className={['sonartra-report-kicker text-white/42', titleClassName]
            .filter(Boolean)
            .join(' ')}
        >
          {title}
        </p>
      </div>
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

function ApplicationGroup({
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
    <section
      className={[
        'sonartra-single-domain-application-card rounded-[1.35rem] border px-5 py-5',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <p className="sonartra-report-kicker text-white/38">{title}</p>
      <div className="mt-4 space-y-0">
        {items.map((item, index) => (
          <p
            key={`${title}-${item}`}
            className={[
              'sonartra-report-body-soft text-white/78 text-[0.96rem] leading-7',
              index > 0 ? 'border-white/6 mt-3 border-t pt-3' : '',
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
        className="results-anchor-target sonartra-motion-reveal sonartra-single-domain-section sonartra-report-hero rounded-[2.5rem] border border-white/[0.07] px-7 py-12 sm:px-9 sm:py-13 md:px-14 md:py-[4.35rem] lg:px-[4.5rem] lg:py-[5.1rem]"
        style={getRevealStyle(step)}
      >
        <div className="space-y-7 md:space-y-9">
          <div className="space-y-4 md:space-y-6">
            <SectionEyebrow label={section.title} />
            <h2
              id={headingId}
              className="sonartra-type-display max-w-[9ch] text-[3.45rem] tracking-[-0.068em] md:text-[5.95rem] lg:text-[6.45rem]"
            >
              {headline}
            </h2>
            <ResultSectionIntent
              sectionId={section.key}
              sectionsConfig={sectionsConfig}
              className="max-w-[46ch]"
            />
          </div>

          {summary ? (
            <p className="sonartra-report-summary max-w-[54rem] text-white/85 text-[1.08rem] leading-8 md:text-[1.28rem] md:leading-10">
              {summary}
            </p>
          ) : null}

          {supporting.length > 0 ? (
            <div className="grid gap-5 border-t border-white/[0.065] pt-7 sm:grid-cols-2 sm:gap-6 md:pt-8">
              {supporting.map((paragraph, index) => (
                <p
                  key={`${section.key}-${index + 1}`}
                  className="sonartra-report-body-soft max-w-[34rem] text-white/62"
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
    const primaryDriver = section.focusItems.find((item) => item.label === 'Primary driver');
    const secondaryDriver = section.focusItems.find((item) => item.label === 'Secondary driver');
    const supportingContext = section.focusItems.find((item) => item.label === 'Supporting context');
    const rangeLimitation = section.focusItems.find((item) => item.label === 'Range limitation');

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
            className="text-[2.08rem] font-semibold tracking-[-0.045em] text-white md:text-[2.7rem]"
          >
            What is creating this pattern
          </h2>
          <ResultSectionIntent
            sectionId={section.key}
            sectionsConfig={sectionsConfig}
            className="max-w-[54ch]"
          />
        </div>

        <div className="sonartra-single-domain-driver-layout">
          <div className="sonartra-single-domain-driver-main">
            {primaryDriver ? (
              <FocusGroup
                title={primaryDriver.label}
                items={primaryDriver.content}
                preface="Main cause"
                className="sonartra-single-domain-driver-primary px-6 py-6 md:px-7 md:py-7 lg:px-8 lg:py-8"
                titleClassName="text-white/58"
                itemClassName="text-[1.06rem] leading-8 text-white/86 md:text-[1.08rem] md:leading-9"
              />
            ) : null}
          </div>

          <div className="sonartra-single-domain-driver-support-rail">
            {secondaryDriver ? (
              <FocusGroup
                title={secondaryDriver.label}
                items={secondaryDriver.content}
                preface="Reinforcing cause"
                className="sonartra-single-domain-driver-secondary px-5 py-5 md:px-6 md:py-6"
                titleClassName="text-white/42"
                itemClassName="text-white/78"
              />
            ) : null}

            <div className="sonartra-single-domain-driver-context-stack">
              {supportingContext ? (
                <FocusGroup
                  title={supportingContext.label}
                  items={supportingContext.content}
                  preface="Supporting layer"
                  className="sonartra-single-domain-driver-supporting"
                  titleClassName="text-white/28"
                  itemClassName="text-white/60"
                />
              ) : null}

              {rangeLimitation ? (
                <FocusGroup
                  title={rangeLimitation.label}
                  items={rangeLimitation.content}
                  preface="Missing range"
                  className="sonartra-single-domain-driver-limitation"
                  titleClassName="text-amber-100/68"
                  itemClassName="text-white/75"
                />
              ) : null}
            </div>
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

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.98fr)_minmax(0,0.98fr)] lg:gap-5">
          {section.focusItems.map((item) => (
            <ApplicationGroup
              key={item.label}
              title={item.label}
              items={item.content}
              className={
                item.label === 'Notice'
                  ? 'border-amber-200/14 bg-amber-200/[0.04]'
                  : item.label === 'Develop'
                    ? 'border-sky-200/12 bg-sky-200/[0.035]'
                    : 'border-white/8 bg-white/[0.02]'
              }
            />
          ))}
        </div>
      </section>
    );
  }

  const [headline, ...body] = section.paragraphs;
  const sectionClasses = {
    intro: 'space-y-7 md:space-y-8',
    pair: 'max-w-[59rem] space-y-6 rounded-[1.75rem] border border-white/6 bg-white/[0.012] px-6 py-7 md:px-8 md:py-8',
    limitation:
      'space-y-6 rounded-[1.95rem] border px-6 py-7 md:px-8 md:py-8 sonartra-single-domain-surface-warm',
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
