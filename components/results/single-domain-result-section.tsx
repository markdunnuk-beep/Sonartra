import type { CSSProperties } from 'react';

import { ReportChapter } from '@/components/results/report-chapter';
import { ResultSectionIntent } from '@/components/results/result-section-intent';
import type { ComposedNarrativeSection } from '@/lib/assessment-language/single-domain-composer';
import type { ResultReadingSectionsConfig } from '@/lib/results/result-reading-sections';

const SINGLE_DOMAIN_SECTION_DISPLAY_LABELS = {
  hero: 'Your Style at a Glance',
  drivers: 'What Shapes Your Approach',
  pair: 'How Your Style Balances',
  limitation: 'Where This Can Work Against You',
  application: 'Putting This Into Practice',
} as const;

const SINGLE_DOMAIN_SECTION_BODY_LABELS: Partial<
  Record<ComposedNarrativeSection['key'], string>
> = {
  pair: SINGLE_DOMAIN_SECTION_DISPLAY_LABELS.pair,
  limitation: SINGLE_DOMAIN_SECTION_DISPLAY_LABELS.limitation,
};

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

function splitSentences(text: string) {
  return (
    text
      .match(/[^.!?]+[.!?]+(?:["')\]]+)?|[^.!?]+$/g)
      ?.map((sentence) => sentence.trim())
      .filter(Boolean) ?? [text]
  );
}

function chunkSentences(sentences: readonly string[], chunkSize = 3) {
  const chunks: string[] = [];

  for (let index = 0; index < sentences.length; index += chunkSize) {
    chunks.push(sentences.slice(index, index + chunkSize).join(' '));
  }

  return chunks;
}

function ProseWithDisclosure({
  text,
  className,
  visibleSentenceCount = 3,
  minSentencesForDisclosure = 6,
  disclosureLabel = 'Read supporting detail',
}: {
  text: string;
  className: string;
  visibleSentenceCount?: number;
  minSentencesForDisclosure?: number;
  disclosureLabel?: string;
}) {
  const sentences = splitSentences(text);

  if (sentences.length < minSentencesForDisclosure) {
    return <p className={className}>{text}</p>;
  }

  const visibleText = sentences.slice(0, visibleSentenceCount).join(' ');
  const supportingChunks = chunkSentences(sentences.slice(visibleSentenceCount));

  return (
    <div className="sonartra-prose-disclosure">
      <p className={className}>{visibleText}</p>
      <details className="sonartra-prose-details">
        <summary>
          <span>{disclosureLabel}</span>
        </summary>
        <div className="sonartra-prose-details-body">
          {supportingChunks.map((chunk, index) => (
            <p key={`${index}-${chunk}`} className={className}>
              {chunk}
            </p>
          ))}
        </div>
      </details>
    </div>
  );
}

function SignalDriverEntry({
  position,
  meta,
  items,
  className,
}: {
  position: string;
  meta: string;
  items: readonly string[];
  className?: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section
      className={['sonartra-single-domain-driver-entry', className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="sonartra-single-domain-driver-entry-header">
        <p className="sonartra-single-domain-driver-entry-meta">{meta}</p>
        <h3 className="sonartra-single-domain-driver-entry-title">{position}</h3>
      </div>

      <div className="sonartra-single-domain-driver-entry-body">
        {items.map((item, index) => (
          <ProseWithDisclosure
            key={`${position}-${item}`}
            text={item}
            className={[
              'sonartra-report-body-soft',
              index === 0 ? 'text-white/78' : 'text-white/64',
            ]
              .filter(Boolean)
              .join(' ')}
            disclosureLabel={`Read more about ${position.toLowerCase()}`}
          />
        ))}
      </div>
    </section>
  );
}

function ApplicationActionEntry({
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
      className={['sonartra-single-domain-application-entry', className]
        .filter(Boolean)
        .join(' ')}
    >
      <h3 className="sonartra-single-domain-application-entry-title">{title}</h3>
      <div className="sonartra-single-domain-application-entry-body">
        {items.map((item, index) => (
          <ProseWithDisclosure
            key={`${title}-${item}`}
            text={item}
            className={[
              'sonartra-report-body-soft',
              index === 0 ? 'text-white/78' : 'text-white/64',
            ]
              .filter(Boolean)
              .join(' ')}
            minSentencesForDisclosure={5}
            visibleSentenceCount={2}
            disclosureLabel={`Read more about ${title.toLowerCase()}`}
          />
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
          eyebrow={
            <span className="sonartra-single-domain-section-label">
              {SINGLE_DOMAIN_SECTION_DISPLAY_LABELS.hero}
            </span>
          }
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
          <p className="sonartra-report-summary sonartra-report-reading-measure text-white/80">
            {summary}
          </p>
        ) : null}

        {supporting.length > 0 ? (
          <div className="sonartra-single-domain-hero-support grid gap-5 border-t border-white/[0.075] pt-7 md:pt-8">
            {supporting.map((paragraph, index) => (
              <ProseWithDisclosure
                key={`${section.key}-${index + 1}`}
                text={paragraph}
                className="sonartra-report-body-soft max-w-[68ch]"
                visibleSentenceCount={3}
                disclosureLabel="Read supporting context"
              />
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
    const driverEntries = [
      {
        item: primaryDriver,
        meta: 'Main cause',
        className: 'sonartra-single-domain-driver-entry-primary',
      },
      { item: secondaryDriver, meta: 'Reinforcing cause' },
      { item: supportingContext, meta: 'Supporting layer' },
      {
        item: rangeLimitation,
        meta: 'Missing range',
        className: 'sonartra-single-domain-driver-entry-limitation',
      },
    ];

    return (
        <ReportChapter
          id={section.key}
          titleId={headingId}
          eyebrow={
            <span className="sonartra-single-domain-section-label">
              {SINGLE_DOMAIN_SECTION_DISPLAY_LABELS.drivers}
            </span>
          }
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
        <div className="sonartra-single-domain-driver-flow">
          {driverEntries.map(({ item, meta, className }) =>
            item ? (
              <SignalDriverEntry
                key={item.label}
                position={item.label}
                meta={meta}
                items={item.content}
                className={className}
              />
            ) : null,
          )}
        </div>
      </ReportChapter>
    );
  }

  if (section.key === 'application') {
    return (
        <ReportChapter
          id={section.key}
          titleId={headingId}
          eyebrow={
            <span className="sonartra-single-domain-section-label">
              {SINGLE_DOMAIN_SECTION_DISPLAY_LABELS.application}
            </span>
          }
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
        <div className="sonartra-single-domain-application-flow">
          {section.focusItems.map((item) => (
            <ApplicationActionEntry
              key={item.label}
              title={item.label}
              items={item.content}
              className={
                item.label === 'Notice'
                  ? 'sonartra-single-domain-application-entry-notice'
                  : item.label === 'Develop'
                    ? 'sonartra-single-domain-application-entry-develop'
                    : 'sonartra-single-domain-application-entry-rely'
              }
            />
          ))}
        </div>
      </ReportChapter>
    );
  }

  const [headline, ...body] = section.paragraphs;
  const displayEyebrow = SINGLE_DOMAIN_SECTION_BODY_LABELS[section.key] ?? section.title;
  const sectionClasses = {
    intro: 'space-y-7 md:space-y-8',
    pair: 'sonartra-single-domain-section-pair max-w-[58rem] space-y-6 px-0 py-0 md:space-y-7',
    limitation:
      'sonartra-single-domain-section-limitation space-y-7 px-5 py-6 md:space-y-8 md:px-7 md:py-7',
  }[section.key];

  return (
    <ReportChapter
      id={section.key}
      titleId={headingId}
      eyebrow={
        <span className="sonartra-single-domain-section-label">{displayEyebrow}</span>
      }
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
            ? 'sonartra-single-domain-pair-body space-y-4 pt-2 md:space-y-5'
            : section.key === 'limitation'
              ? 'sonartra-single-domain-limitation-body space-y-5 border-t border-white/[0.07] pt-7 md:space-y-6'
              : 'border-white/7 space-y-5 border-t pt-7 md:space-y-6'
        }
      >
        {body.map((paragraph, index) => (
          <ProseWithDisclosure
            key={`${section.key}-${index + 1}`}
            text={paragraph}
            className={
              index === 0
                ? section.key === 'pair'
                  ? 'sonartra-report-summary max-w-[48rem] text-[1.02rem] leading-8 text-white/78'
                  : section.key === 'limitation'
                    ? 'sonartra-report-summary max-w-[52rem] text-[1.06rem] leading-8 text-white/80 md:text-[1.12rem] md:leading-9'
                    : 'sonartra-report-summary max-w-[54rem] text-white/78'
                : section.key === 'pair'
                  ? 'sonartra-report-body-soft max-w-[48rem] text-white/64'
                  : section.key === 'limitation'
                    ? 'sonartra-report-body-soft max-w-[52rem] text-white/66'
                    : 'sonartra-report-body-soft text-white/66 max-w-[56rem]'
            }
            visibleSentenceCount={section.key === 'pair' ? 2 : 3}
            minSentencesForDisclosure={section.key === 'pair' ? 5 : 6}
            disclosureLabel={
              section.key === 'pair'
                ? 'Read pair detail'
                : section.key === 'limitation'
                  ? 'Read range detail'
                  : 'Read supporting detail'
            }
          />
        ))}
      </div>
    </ReportChapter>
  );
}
