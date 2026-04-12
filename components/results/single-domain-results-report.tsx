import type { CSSProperties, ReactNode } from 'react';

import { ResultReadingProgress } from '@/components/results/result-reading-progress';
import { ResultReadingRail } from '@/components/results/result-reading-rail';
import { ResultSectionIntent } from '@/components/results/result-section-intent';
import { SingleDomainApplicationPlan } from '@/components/results/single-domain-application-plan';
import { PageFrame, SectionHeader } from '@/components/shared/user-app-ui';
import type { SingleDomainResultsViewModel } from '@/lib/server/single-domain-results-view-model';

const RESULTS_ANCHOR_TARGET_CLASS = 'results-anchor-target';
const SINGLE_DOMAIN_SECTION_IDS = {
  intro: 'intro',
  hero: 'hero',
  signals: 'signals',
  balancing: 'balancing',
  pairSummary: 'pair-summary',
  application: 'application',
} as const;
const SINGLE_DOMAIN_SECTION_HEADING_IDS = {
  intro: 'intro-heading',
  hero: 'hero-heading',
  signals: 'signals-heading',
  balancing: 'balancing-heading',
  pairSummary: 'pair-summary-heading',
  application: 'application-heading',
} as const;

function getRevealStyle(step = 0): CSSProperties {
  return {
    '--sonartra-motion-delay': `${step * 60}ms`,
  } as CSSProperties;
}

function SectionEyebrow({ children }: { children: ReactNode }) {
  return <p className="sonartra-report-kicker">{children}</p>;
}

function EditorialDivider({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  return (
    <div className={['sonartra-report-divider', className].filter(Boolean).join(' ')}>
      <span>{title}</span>
    </div>
  );
}

function NarrativeBridge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={[
        'sonartra-report-body-soft mx-auto max-w-[50rem] text-center text-[0.92rem] leading-7 text-white/52 md:text-[0.97rem]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </p>
  );
}

function EditorialAside({ label, text }: { label: string; text: string }) {
  return (
    <div className="max-w-[18rem] space-y-1.5">
      <p className="sonartra-report-kicker">{label}</p>
      <p className="sonartra-report-body-soft">{text}</p>
    </div>
  );
}

function SignalChapter({
  signal,
  index,
}: {
  signal: SingleDomainResultsViewModel['signals'][number];
  index: number;
}) {
  const chapterHeadingId = `${signal.anchorId}-heading`;
  const scoreLine = `${signal.normalizedScore}% of the emphasis in this domain.`;

  return (
    <article
      id={signal.anchorId}
      aria-labelledby={chapterHeadingId}
      className={`border-white/6 ${RESULTS_ANCHOR_TARGET_CLASS} sonartra-motion-reveal-soft space-y-10 border-t pt-16 first:border-t-0 first:pt-0 md:space-y-12 md:pt-20`}
      style={getRevealStyle(2 + index)}
    >
      <div className="grid gap-7 md:grid-cols-[minmax(0,13.5rem)_minmax(0,1fr)] md:gap-10 lg:grid-cols-[minmax(0,14.5rem)_minmax(0,1fr)] lg:gap-12">
        <div className="space-y-5 md:sticky md:top-24 md:self-start">
          <div className="space-y-2">
            <SectionEyebrow>{`Signal ${signal.rank.toString().padStart(2, '0')}`}</SectionEyebrow>
            <p className="sonartra-report-kicker max-w-[13rem] text-white/44">
              {signal.positionLabel}
            </p>
          </div>
          <div className="space-y-2.5">
            <h3
              id={chapterHeadingId}
              className="max-w-[12ch] text-[1.8rem] font-semibold tracking-[-0.045em] text-white md:text-[2.35rem]"
            >
              {signal.signalLabel}
            </h3>
            <p className="sonartra-report-body-soft max-w-[14rem] text-[0.93rem] leading-7 text-white/54">
              {scoreLine}
            </p>
          </div>
        </div>

        <div className="space-y-8 md:space-y-9">
          <p className="sonartra-report-summary max-w-[56rem] text-white/78">
            {signal.chapterIntro}
          </p>

          <div className="grid gap-x-10 gap-y-6 border-t border-white/7 pt-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {signal.narrativeSections.map((section) => (
              <div key={section.key} className="space-y-2.5">
                <p className="sonartra-report-kicker">{section.label}</p>
                <p className="sonartra-report-body-soft max-w-[34rem]">{section.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function CompactSignalCard({
  signal,
  index,
}: {
  signal: SingleDomainResultsViewModel['signals'][number];
  index: number;
}) {
  const cardHeadingId = `${signal.anchorId}-heading`;
  const isUnderplayed = signal.tier === 'underplayed';

  return (
    <article
      id={signal.anchorId}
      aria-labelledby={cardHeadingId}
      className={`${RESULTS_ANCHOR_TARGET_CLASS} sonartra-motion-reveal-soft rounded-[1.45rem] border border-white/7 bg-white/[0.02] px-5 py-5 md:px-6 md:py-6`}
      style={getRevealStyle(4 + index)}
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="sonartra-report-kicker">{`Signal ${signal.rank.toString().padStart(2, '0')}`}</p>
            <span className="rounded-full border border-white/8 px-2.5 py-1 text-[0.72rem] uppercase tracking-[0.22em] text-white/48">
              {signal.positionLabel}
            </span>
          </div>
          <h3
            id={cardHeadingId}
            className="text-[1.45rem] font-semibold tracking-[-0.04em] text-white md:text-[1.7rem]"
          >
            {signal.signalLabel}
          </h3>
          <p className="sonartra-report-body-soft text-[0.92rem] leading-7 text-white/56">
            {signal.normalizedScore}% of the emphasis in this domain.
          </p>
        </div>

        <p className="sonartra-report-body-soft text-white/74">{signal.chapterIntro}</p>

        <div className="grid gap-4 border-t border-white/7 pt-4">
          {isUnderplayed ? (
            <>
              <div className="space-y-2">
                <p className="sonartra-report-kicker">Less present in this result</p>
                <p className="sonartra-report-body-soft">{signal.riskImpact}</p>
              </div>
              <div className="space-y-2">
                <p className="sonartra-report-kicker">If more range is needed</p>
                <p className="sonartra-report-body-soft">{signal.developmentLine}</p>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <p className="sonartra-report-kicker">What it adds</p>
                <p className="sonartra-report-body-soft">{signal.valueOutcome}</p>
              </div>
              <div className="space-y-2">
                <p className="sonartra-report-kicker">Keep it in range</p>
                <p className="sonartra-report-body-soft">{signal.developmentLine}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export function SingleDomainResultsReport({
  result,
}: {
  result: SingleDomainResultsViewModel;
}) {
  const featuredSignals = result.signals.filter((signal) => signal.tier === 'primary' || signal.tier === 'secondary');
  const contextualSignals = result.signals.filter((signal) => signal.tier === 'supporting' || signal.tier === 'underplayed');
  const underplayedSignals = contextualSignals.filter((signal) => signal.tier === 'underplayed');

  return (
    <PageFrame className="space-y-10 md:space-y-12">
      <div className="xl:mx-auto xl:grid xl:max-w-[114rem] xl:grid-cols-[minmax(0,1fr)_minmax(10.75rem,12.25rem)] xl:gap-7 2xl:gap-9">
        <div className="min-w-0 max-w-none space-y-10 md:space-y-12">
          <section
            id={SINGLE_DOMAIN_SECTION_IDS.intro}
            aria-labelledby={SINGLE_DOMAIN_SECTION_HEADING_IDS.intro}
            className={`${RESULTS_ANCHOR_TARGET_CLASS} sonartra-motion-reveal space-y-7 md:space-y-8`}
            style={getRevealStyle(0)}
          >
            <div className="max-w-[52rem] space-y-5 md:space-y-6">
              <SectionEyebrow>{result.assessmentTitle}</SectionEyebrow>
              <h1
                id={SINGLE_DOMAIN_SECTION_HEADING_IDS.intro}
                className="max-w-[12ch] text-[3rem] font-semibold tracking-[-0.055em] text-white md:text-[4.3rem]"
              >
                {result.intro.sectionTitle}
              </h1>
              <ResultSectionIntent
                sectionId={SINGLE_DOMAIN_SECTION_IDS.intro}
                sectionsConfig={result.readingSections}
                className="max-w-[52ch]"
              />
            </div>

            <div className="grid gap-7 border-t border-white/6 pt-7 md:grid-cols-[minmax(0,1fr)_13.5rem] md:gap-10">
              <div className="space-y-4 md:space-y-5">
                <p className="sonartra-report-summary max-w-[56rem] text-white/80">
                  {result.intro.introParagraph}
                </p>
                <p className="sonartra-report-body max-w-[54rem] text-[1rem] leading-8 text-white/76 md:text-[1.04rem] md:leading-9">
                  {result.intro.meaningParagraph}
                </p>
              </div>

              <div className="space-y-5 md:pt-1">
                <div className="space-y-3 rounded-[1.4rem] border border-white/7 bg-white/[0.02] px-4 py-4">
                  {result.metadataItems.map((item) => (
                    <div key={`${item.label}-${item.value}`} className="space-y-1">
                      <p className="sonartra-report-kicker text-white/40">{item.label}</p>
                      <p className="sonartra-report-body-soft text-white/70">{item.value}</p>
                    </div>
                  ))}
                </div>
                <EditorialAside
                  label="Why it matters"
                  text={result.intro.blueprintContextLine}
                />
              </div>
            </div>
          </section>

          <ResultReadingProgress
            className="max-w-[92rem] px-1 md:px-2 xl:hidden"
            sectionsConfig={result.readingSections}
          />

          <section
            id={SINGLE_DOMAIN_SECTION_IDS.hero}
            aria-labelledby={SINGLE_DOMAIN_SECTION_HEADING_IDS.hero}
            className={`border-white/6 ${RESULTS_ANCHOR_TARGET_CLASS} sonartra-motion-reveal sonartra-report-hero rounded-[2rem] border px-7 py-10 sm:px-8 sm:py-11 md:px-12 md:py-14 lg:px-14`}
            style={getRevealStyle(1)}
          >
            <div className="w-full space-y-9 md:space-y-11">
              <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_14rem] md:items-start md:gap-10 xl:grid-cols-[minmax(0,1fr)_15.5rem] xl:gap-12">
                <div className="space-y-8 md:space-y-9">
                  <div className="sonartra-report-kicker flex flex-wrap items-center gap-x-3 gap-y-2">
                    <SectionEyebrow>{result.hero.sectionLabel}</SectionEyebrow>
                    <span className="bg-white/18 hidden h-1 w-1 rounded-full md:inline-block" />
                    <span>{result.hero.pairLabel}</span>
                  </div>

                  <div className="space-y-6 md:space-y-8">
                    <h2
                      id={SINGLE_DOMAIN_SECTION_HEADING_IDS.hero}
                      className="sonartra-type-display max-w-[11ch] text-[3.15rem] tracking-[-0.055em] md:text-[5rem]"
                    >
                      {result.hero.headline}
                    </h2>
                    <p className="sonartra-report-body-soft max-w-[46rem] text-[0.98rem] leading-8 text-white/66 sm:text-[1.03rem] md:text-[1.08rem] md:leading-8">
                      {result.hero.subheadline}
                    </p>
                    <div className="sonartra-report-prose max-w-[58rem] space-y-6 border-l border-white/8 pl-5 md:space-y-7 md:pl-7">
                      <p className="sonartra-report-summary text-[1.08rem] leading-8 text-white/82 sm:text-[1.13rem] md:text-[1.22rem] md:leading-10">
                        {result.hero.strengthParagraph}
                      </p>
                      <p className="sonartra-report-body max-w-[54rem] text-[1rem] leading-8 text-white/78 sm:text-[1.05rem] md:text-[1.1rem] md:leading-9">
                        {result.hero.opening}
                      </p>
                      <div className="grid gap-x-8 gap-y-5 border-t border-white/7 pt-6 sm:grid-cols-2">
                        <EditorialAside label="What keeps it effective" text={result.hero.tensionParagraph} />
                        <EditorialAside label="Where to keep range" text={result.hero.closeParagraph} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.6rem] border border-white/7 bg-white/[0.02] px-5 py-5 md:px-6 md:py-6">
                  <p className="sonartra-report-kicker text-white/42">Leading combination</p>
                  <p className="mt-3 text-[1.15rem] font-semibold tracking-[-0.02em] text-white/90">
                    {result.hero.pairLabel}
                  </p>
                  {result.hero.pairSignalLabels.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      <p className="sonartra-report-kicker text-white/42">Signals in the pair</p>
                      <div className="flex flex-wrap gap-2">
                        {result.hero.pairSignalLabels.map((label) => (
                          <span
                            key={label}
                            className="rounded-full border border-white/8 px-3 py-1 text-[0.78rem] text-white/66"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <div className="space-y-7 pt-5 md:space-y-8 md:pt-9">
            <NarrativeBridge className="max-w-[44rem]">
              The signal chapters below show what is driving this pattern, what reinforces it, and what stays quieter unless the context calls for more.
            </NarrativeBridge>

            <section
              id={SINGLE_DOMAIN_SECTION_IDS.signals}
              aria-labelledby={SINGLE_DOMAIN_SECTION_HEADING_IDS.signals}
              className={`${RESULTS_ANCHOR_TARGET_CLASS} sonartra-motion-reveal space-y-10 md:space-y-11`}
              style={getRevealStyle(2)}
            >
              <h2 id={SINGLE_DOMAIN_SECTION_HEADING_IDS.signals} className="sr-only">
                Signal chapters
              </h2>
              <EditorialDivider title="Detailed reading" />
              <SectionHeader
                eyebrow={`${result.signals.length} Signal${result.signals.length === 1 ? '' : 's'}`}
                title="Inside this domain"
                description="The full signal mix behind the way this domain comes through."
              />
              <ResultSectionIntent
                sectionId={SINGLE_DOMAIN_SECTION_IDS.signals}
                sectionsConfig={result.readingSections}
                className="max-w-[53rem] md:mt-5"
              />

              <div className="w-full px-1 md:px-2 xl:px-0.5">
                {featuredSignals.map((signal, index) => (
                  <SignalChapter key={signal.signalKey} signal={signal} index={index} />
                ))}
              </div>

              {contextualSignals.length > 0 ? (
                <div className="space-y-6 border-t border-white/7 pt-8 md:space-y-7 md:pt-10">
                  <div className="max-w-[52rem] space-y-3">
                    <p className="sonartra-report-kicker">
                      {underplayedSignals.length > 0 ? 'Context and underplayed signals' : 'Supporting signals'}
                    </p>
                    <p className="sonartra-report-body-soft max-w-[48rem]">
                      {underplayedSignals.length > 0
                        ? 'These signals round out the picture here. Some support the leading pattern, while the least-present ones stay in the background unless the context calls them forward.'
                        : 'These signals support the pattern without carrying the same narrative weight as the leading pair.'}
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {contextualSignals.map((signal, index) => (
                      <CompactSignalCard key={signal.signalKey} signal={signal} index={index} />
                    ))}
                  </div>
                </div>
              ) : null}

              <NarrativeBridge className="max-w-[46rem] text-left md:mx-0 md:text-left">
                {result.bridgeLine}
              </NarrativeBridge>
            </section>
          </div>

          <section
            id={SINGLE_DOMAIN_SECTION_IDS.balancing}
            aria-labelledby={SINGLE_DOMAIN_SECTION_HEADING_IDS.balancing}
            className={`${RESULTS_ANCHOR_TARGET_CLASS} sonartra-motion-reveal space-y-10 md:space-y-11`}
            style={getRevealStyle(3)}
          >
            <h2 id={SINGLE_DOMAIN_SECTION_HEADING_IDS.balancing} className="sr-only">
              Balancing your approach
            </h2>
            <EditorialDivider title="Balance" />
            <SectionHeader
              eyebrow="Balancing"
              title={result.balancing.sectionTitle}
              description="This chapter shows where your current approach helps, where it can tighten, and how to widen your range."
            />
            <ResultSectionIntent
              sectionId={SINGLE_DOMAIN_SECTION_IDS.balancing}
              sectionsConfig={result.readingSections}
              className="max-w-[53rem] md:mt-5"
            />
            <div className="space-y-6 rounded-[1.6rem] border border-white/7 bg-white/[0.02] px-5 py-5 md:space-y-7 md:px-7 md:py-7">
              <p className="sonartra-report-summary max-w-[56rem] text-white/80">
                {result.balancing.currentPatternParagraph}
              </p>
              <p className="sonartra-report-body max-w-[54rem] text-white/76">
                {result.balancing.practicalMeaningParagraph}
              </p>
              <p className="sonartra-report-body-soft max-w-[54rem] text-white/60">
                {result.balancing.systemRiskParagraph}
              </p>
              <div className="space-y-4 border-t border-white/7 pt-6">
                <p className="sonartra-report-kicker">Bring it back into balance</p>
                <p className="sonartra-report-body-soft max-w-[48rem]">{result.balancing.rebalanceIntro}</p>
                <ul className="grid gap-3 sm:grid-cols-3">
                  {result.balancing.rebalanceActions.map((action, index) => (
                    <li
                      key={`${action}-${index}`}
                      className="rounded-[1.15rem] border border-white/7 bg-white/[0.015] px-4 py-4 text-[0.95rem] leading-7 text-white/74"
                    >
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section
            id={SINGLE_DOMAIN_SECTION_IDS.pairSummary}
            aria-labelledby={SINGLE_DOMAIN_SECTION_HEADING_IDS.pairSummary}
            className={`${RESULTS_ANCHOR_TARGET_CLASS} sonartra-motion-reveal space-y-10 md:space-y-11`}
            style={getRevealStyle(4)}
          >
            <h2 id={SINGLE_DOMAIN_SECTION_HEADING_IDS.pairSummary} className="sr-only">
              Pair summary
            </h2>
            <EditorialDivider title="Pair summary" />
            <SectionHeader
              eyebrow="How the leading tendencies work together"
              title={result.pairSummary.sectionTitle}
              description="This section explains how the two strongest tendencies combine in practice."
            />
            <ResultSectionIntent
              sectionId={SINGLE_DOMAIN_SECTION_IDS.pairSummary}
              sectionsConfig={result.readingSections}
              className="max-w-[53rem] md:mt-5"
            />
            <div className="max-w-[58rem] space-y-6 border-l border-white/8 pl-5 md:space-y-7 md:pl-7">
              <p className="sonartra-report-summary text-white/80">
                {result.pairSummary.openingParagraph}
              </p>
              <p className="sonartra-report-title text-[1.2rem] text-white/86">
                {result.pairSummary.headline}
              </p>
              <p className="sonartra-report-body text-white/76">{result.pairSummary.strengthParagraph}</p>
              <p className="sonartra-report-body text-white/72">{result.pairSummary.tensionParagraph}</p>
              <p className="sonartra-report-body-soft text-white/58">{result.pairSummary.closeParagraph}</p>
            </div>
          </section>

          <section
            id={SINGLE_DOMAIN_SECTION_IDS.application}
            aria-labelledby={SINGLE_DOMAIN_SECTION_HEADING_IDS.application}
            className={`${RESULTS_ANCHOR_TARGET_CLASS} sonartra-motion-reveal space-y-10 md:space-y-11`}
            style={getRevealStyle(5)}
          >
            <h2 id={SINGLE_DOMAIN_SECTION_HEADING_IDS.application} className="sr-only">
              Application
            </h2>
            <EditorialDivider title="Application" />
            <SectionHeader
              eyebrow="Application"
              title="Turning insight into action"
              description="This final chapter turns the report into practical strengths, watchouts, and next steps."
            />
            <ResultSectionIntent
              sectionId={SINGLE_DOMAIN_SECTION_IDS.application}
              sectionsConfig={result.readingSections}
              className="max-w-[53rem] md:mt-5"
            />
            <SingleDomainApplicationPlan application={result.application} />
          </section>
        </div>

        <ResultReadingRail
          className="hidden xl:block xl:pt-1"
          sectionsConfig={result.readingSections}
          utilityActions={null}
        />
      </div>
    </PageFrame>
  );
}
