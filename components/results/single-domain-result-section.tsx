import type { CSSProperties } from 'react';

import { ReportChapter } from '@/components/results/report-chapter';
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
        'sonartra-single-domain-application-card px-4 py-4 md:px-5 md:py-5',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <p className="sonartra-report-kicker text-white/34">{title}</p>
      <div className="mt-3 space-y-0">
        {items.map((item, index) => (
          <p
            key={`${title}-${item}`}
            className={[
              'sonartra-report-body-soft text-[0.95rem] leading-7 text-white/76',
              index > 0 ? 'mt-2.5 pt-2.5' : '',
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
      <ReportChapter
        id={section.key}
        titleId={headingId}
        eyebrow={section.title}
        title={headline}
        lead={
          <ResultSectionIntent
            sectionId={section.key}
            sectionsConfig={sectionsConfig}
            className="max-w-[46ch]"
          />
        }
        variant="feature"
        className="sonartra-report-hero rounded-[1.5rem] border border-white/[0.07] px-6 py-10 sm:px-8 sm:py-12 md:px-11 md:py-14 lg:px-14 lg:py-16"
        titleClassName="max-w-[13ch]"
        contentClassName="space-y-7 md:space-y-8"
        style={getRevealStyle(step)}
      >
        {summary ? (
          <p className="sonartra-report-summary sonartra-report-reading-measure text-white/85">
            {summary}
          </p>
        ) : null}

        {supporting.length > 0 ? (
          <div className="sonartra-single-domain-hero-support grid gap-5 border-t border-white/[0.075] pt-7 md:pt-8">
            {supporting.map((paragraph, index) => (
              <p
                key={`${section.key}-${index + 1}`}
                className="sonartra-report-body-soft max-w-[68ch]"
              >
                {paragraph}
              </p>
            ))}
          </div>
        ) : null}
      </ReportChapter>
    );
  }

  if (section.key === 'drivers') {
    const primaryDriver = section.focusItems.find((item) => item.label === 'Primary driver');
    const secondaryDriver = section.focusItems.find((item) => item.label === 'Secondary driver');
    const supportingContext = section.focusItems.find((item) => item.label === 'Supporting context');
    const rangeLimitation = section.focusItems.find((item) => item.label === 'Range limitation');

    return (
      <ReportChapter
        id={section.key}
        titleId={headingId}
        eyebrow="Drivers"
        title="What is creating this pattern"
        lead={
          <ResultSectionIntent
            sectionId={section.key}
            sectionsConfig={sectionsConfig}
            className="max-w-[54ch]"
          />
        }
        className="space-y-8 md:space-y-10"
        style={getRevealStyle(step)}
      >
        <div className="sonartra-single-domain-driver-layout">
          <div className="sonartra-single-domain-driver-main">
            {primaryDriver ? (
              <FocusGroup
                title={primaryDriver.label}
                items={primaryDriver.content}
                preface="Main cause"
                className="sonartra-single-domain-driver-primary px-6 py-6 md:px-7 md:py-7 lg:px-8 lg:py-8"
                titleClassName="sonartra-single-domain-driver-primary-label"
                itemClassName="sonartra-single-domain-driver-primary-text text-[1.08rem] leading-8 md:text-[1.18rem] md:leading-9"
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
                titleClassName="sonartra-single-domain-driver-secondary-label"
                itemClassName="text-white/70"
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
                  itemClassName="text-white/58"
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
      </ReportChapter>
    );
  }

  if (section.key === 'application') {
    return (
      <ReportChapter
        id={section.key}
        titleId={headingId}
        eyebrow="Application"
        title="What to rely on, notice, and develop"
        lead={
          <ResultSectionIntent
            sectionId={section.key}
            sectionsConfig={sectionsConfig}
            className="max-w-[54ch]"
          />
        }
        className="sonartra-single-domain-section-application space-y-7 md:space-y-8"
        style={getRevealStyle(step)}
      >
        <div className="sonartra-single-domain-application-frame">
          <div className="sonartra-single-domain-application-grid">
            {section.focusItems.map((item) => (
              <ApplicationGroup
                key={item.label}
                title={item.label}
                items={item.content}
                className={
                  item.label === 'Notice'
                    ? 'sonartra-single-domain-application-notice'
                    : item.label === 'Develop'
                      ? 'sonartra-single-domain-application-develop'
                      : 'sonartra-single-domain-application-rely'
                }
              />
            ))}
          </div>
        </div>
      </ReportChapter>
    );
  }

  const [headline, ...body] = section.paragraphs;
  const sectionClasses = {
    intro: 'space-y-7 md:space-y-8',
    pair: 'sonartra-single-domain-section-pair max-w-[58rem] space-y-5 px-0 py-0',
    limitation:
      'sonartra-single-domain-section-limitation space-y-6 px-5 py-6 md:px-7 md:py-7',
  }[section.key];

  return (
    <ReportChapter
      id={section.key}
      titleId={headingId}
      eyebrow={section.title}
      title={headline}
      lead={
        <ResultSectionIntent
          sectionId={section.key}
          sectionsConfig={sectionsConfig}
          className="max-w-[54ch]"
        />
      }
      className={[
        sectionClasses,
      ].join(' ')}
      style={getRevealStyle(step)}
    >
      <div
        className={
          section.key === 'pair'
            ? 'sonartra-single-domain-pair-body space-y-3 pt-1'
            : section.key === 'limitation'
              ? 'sonartra-single-domain-limitation-body space-y-4 border-t border-white/[0.07] pt-6'
              : 'border-white/7 space-y-4 border-t pt-6'
        }
      >
        {body.map((paragraph, index) => (
          <p
            key={`${section.key}-${index + 1}`}
            className={
              index === 0
                ? section.key === 'pair'
                  ? 'sonartra-report-summary max-w-[48rem] text-[1.02rem] leading-8 text-white/82'
                  : section.key === 'limitation'
                    ? 'sonartra-report-summary max-w-[52rem] text-[1.06rem] leading-8 text-white/88 md:text-[1.12rem] md:leading-9'
                    : 'sonartra-report-summary max-w-[54rem] text-white/80'
                : section.key === 'pair'
                  ? 'sonartra-report-body-soft max-w-[48rem] text-white/66'
                  : section.key === 'limitation'
                    ? 'sonartra-report-body-soft max-w-[52rem] text-white/72'
                    : 'sonartra-report-body-soft text-white/74 max-w-[56rem]'
            }
          >
            {paragraph}
          </p>
        ))}
      </div>
    </ReportChapter>
  );
}
