import { SonartraIntroductionVisual } from '@/components/results/sonartra-introduction-visual';

type SonartraIntroductionMetaItem = {
  label: string;
  value: string;
};

const INTRODUCTION_SECTIONS = [
  {
    title: 'Domains',
    body: 'Broad areas of behaviour being measured.',
    detail:
      'These represent the key parts of how you operate. For example, how you lead, how you respond under pressure, or the environments where you do your best work.',
  },
  {
    title: 'Signals',
    body: 'Specific behavioural patterns within each Domain.',
    detail:
      'These are the traits that show how you tend to operate. For example, being more visionary, structured, people-focused, or results-driven.',
  },
  {
    title: 'Signal Pairs',
    body: 'The strongest Signals in a Domain, read together.',
    detail:
      'Because behaviour rarely shows up in isolation. It shows up in combinations. This is where your results become more accurate and more useful.',
  },
] as const;

export function SonartraIntroduction({
  metadataItems,
}: Readonly<{
  metadataItems: readonly SonartraIntroductionMetaItem[];
}>) {
  return (
    <section
      className="border-white/7 relative overflow-hidden rounded-[2rem] border bg-[radial-gradient(circle_at_top_left,rgba(145,168,214,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.028),rgba(255,255,255,0.014))] px-6 py-7 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:px-8 sm:py-9 md:px-10 md:py-11 lg:px-12 lg:py-12"
      aria-labelledby="sonartra-introduction-title"
      data-sonartra-introduction="true"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.018),transparent_24%,transparent_76%,rgba(255,255,255,0.012))]" />

      <div className="relative mx-auto max-w-[61rem] space-y-8 md:space-y-10">
        <div
          className="border-white/8 sonartra-intro-reveal flex flex-wrap gap-2.5 rounded-[1.2rem] border bg-white/[0.02] px-3 py-3 sm:px-4"
          data-sonartra-intro-reveal="meta"
          data-sonartra-introduction-meta="true"
        >
          {metadataItems.map((item) => (
            <div
              key={item.label}
              className="border-white/7 min-w-[10rem] flex-1 rounded-[0.95rem] border bg-[linear-gradient(180deg,rgba(255,255,255,0.028),rgba(255,255,255,0.012))] px-3 py-2.5"
            >
              <p className="sonartra-type-utility text-white/38">{item.label}</p>
              <p className="sonartra-type-nav mt-1 text-[0.95rem] text-white/84">{item.value}</p>
            </div>
          ))}
        </div>

        <div
          className="max-w-[46rem] space-y-7 md:space-y-8 sonartra-intro-reveal"
          data-sonartra-intro-reveal="header"
        >
          <header className="space-y-4 md:space-y-5">
            <p className="sonartra-report-kicker">How to read this report</p>
            <div className="space-y-4">
              <h2
                id="sonartra-introduction-title"
                className="sonartra-type-section-title max-w-[18ch] text-[2rem] leading-[1.06] sm:text-[2.3rem] md:text-[2.7rem]"
              >
                Understand the patterns behind your results
              </h2>
              <div className="max-w-[68ch] space-y-4">
                <p className="sonartra-report-body text-[1rem] leading-8 sm:text-[1.04rem] md:text-[1.08rem] md:leading-9">
                  This report is designed to help you see how you naturally think, respond, and operate.
                </p>
                <p className="sonartra-report-body text-[1rem] leading-8 text-white/70 sm:text-[1.04rem] md:text-[1.08rem] md:leading-9">
                  Rather than placing you into a single label, Sonartra reveals the patterns that consistently show up
                  in your behaviour. These patterns shape how you make decisions, interact with others, and perform
                  across different situations.
                </p>
                <p className="sonartra-report-body text-[1rem] leading-8 text-white/70 sm:text-[1.04rem] md:text-[1.08rem] md:leading-9">
                  Once you can see them clearly, you can work with them rather than against them.
                </p>
              </div>
            </div>
          </header>
        </div>

        <div className="max-w-[44rem] space-y-3 sonartra-intro-reveal" data-sonartra-intro-reveal="supporting">
          <h3 className="sonartra-report-title text-[1.06rem] text-white sm:text-[1.1rem]">How your results are built</h3>
          <div className="space-y-2">
            <p className="sonartra-report-body-soft text-[0.98rem] leading-7 text-white/68 sm:text-[1rem]">
              Your results are not based on one answer or one moment. They are built from consistent signals that
              appear across the assessment.
            </p>
            <p className="sonartra-report-body-soft text-[0.98rem] leading-7 text-white/62 sm:text-[1rem]">
              We break this down into three simple layers:
            </p>
          </div>
        </div>

        <div
          className="grid gap-3.5 md:auto-rows-fr md:grid-cols-3 md:gap-4"
          aria-label="Sonartra concept sequence"
          data-sonartra-introduction-steps="true"
        >
          {INTRODUCTION_SECTIONS.map((section, index) => (
            <div
              key={section.title}
              className="relative h-full sonartra-intro-reveal"
              data-sonartra-intro-reveal={`step-${index + 1}`}
            >
              {index < INTRODUCTION_SECTIONS.length - 1 ? (
                <>
                  <div
                    className="pointer-events-none absolute left-6 top-full h-5 w-px overflow-hidden rounded-full bg-[linear-gradient(180deg,rgba(198,212,240,0.32),rgba(198,212,240,0.06))] md:left-auto md:right-[-0.75rem] md:top-1/2 md:h-px md:w-7 md:-translate-y-1/2 md:bg-[linear-gradient(90deg,rgba(198,212,240,0.38),rgba(198,212,240,0.06))]"
                    aria-hidden="true"
                    data-sonartra-intro-connector="true"
                  >
                    <span className="sonartra-intro-connector-flow sonartra-intro-connector-flow-vertical absolute inset-x-0 top-[-35%] h-4 rounded-full bg-[linear-gradient(180deg,rgba(228,236,249,0),rgba(228,236,249,0.7),rgba(228,236,249,0))] md:inset-y-0 md:left-[-30%] md:top-0 md:h-full md:w-5 md:bg-[linear-gradient(90deg,rgba(228,236,249,0),rgba(228,236,249,0.68),rgba(228,236,249,0))]" />
                  </div>
                  <div className="pointer-events-none absolute left-6 top-[calc(100%+0.7rem)] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#dbe5f7]/35 blur-[1px] md:left-auto md:right-[-0.1rem] md:top-1/2 md:-translate-y-1/2 md:translate-x-1/2" />
                </>
              ) : null}
              <article
                className="sonartra-intro-step-card relative flex h-full min-h-[12.4rem] flex-col rounded-[1.25rem] border border-white/7 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.018))] px-4 py-4 shadow-[0_12px_36px_rgba(0,0,0,0.14)] transition-[transform,border-color,box-shadow,background-color] duration-300 ease-out hover:-translate-y-[2px] hover:border-white/14 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.024))] hover:shadow-[0_16px_44px_rgba(0,0,0,0.18)] focus-within:-translate-y-[2px] focus-within:border-white/14 focus-within:shadow-[0_16px_44px_rgba(0,0,0,0.18)] sm:px-5 sm:py-5"
                data-sonartra-introduction-step={section.title}
              >
                <div className="flex h-full flex-col space-y-3">
                  <p className="sonartra-type-utility text-white/36">{`0${index + 1}`}</p>
                  <div className="flex flex-1 flex-col space-y-2">
                    <h3 className="sonartra-report-title text-[1rem] sm:text-[1.06rem]">{section.title}</h3>
                    <p className="sonartra-report-body-soft text-[0.96rem] leading-7 text-white/68">{section.body}</p>
                    <p className="sonartra-report-body-soft text-[0.95rem] leading-7 text-white/56">{section.detail}</p>
                  </div>
                </div>
              </article>
            </div>
          ))}
        </div>

        <SonartraIntroductionVisual className="sonartra-intro-reveal mx-auto w-full max-w-[34rem]" />
      </div>

      <style>{`
        .sonartra-intro-reveal {
          opacity: 1;
          transform: translateY(0);
        }

        @media (prefers-reduced-motion: no-preference) {
          .sonartra-intro-reveal {
            animation: sonartra-intro-reveal 560ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
          }

          [data-sonartra-intro-reveal='meta'] {
            animation-delay: 0ms;
          }

          [data-sonartra-intro-reveal='header'] {
            animation-delay: 60ms;
          }

          [data-sonartra-intro-reveal='supporting'] {
            animation-delay: 140ms;
          }

          [data-sonartra-intro-reveal='step-1'] {
            animation-delay: 200ms;
          }

          [data-sonartra-intro-reveal='step-2'] {
            animation-delay: 260ms;
          }

          [data-sonartra-intro-reveal='step-3'] {
            animation-delay: 320ms;
          }

          [data-sonartra-introduction-visual='true'].sonartra-intro-reveal {
            animation-delay: 380ms;
          }

          .sonartra-intro-connector-flow-vertical {
            animation: sonartra-intro-connector-flow-vertical 4.8s ease-in-out infinite;
          }

          @media (min-width: 768px) {
            .sonartra-intro-connector-flow-vertical {
              animation-name: sonartra-intro-connector-flow-horizontal;
            }
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sonartra-intro-step-card {
            transition: border-color 180ms ease-out, box-shadow 180ms ease-out, background-color 180ms ease-out;
          }

          .sonartra-intro-connector-flow {
            opacity: 0.28;
          }
        }

        @keyframes sonartra-intro-reveal {
          from {
            opacity: 0;
            transform: translateY(8px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes sonartra-intro-connector-flow-vertical {
          0% {
            transform: translateY(-160%);
            opacity: 0;
          }

          24% {
            opacity: 0.22;
          }

          54% {
            opacity: 0.62;
          }

          100% {
            transform: translateY(240%);
            opacity: 0;
          }
        }

        @keyframes sonartra-intro-connector-flow-horizontal {
          0% {
            transform: translateX(-165%);
            opacity: 0;
          }

          24% {
            opacity: 0.22;
          }

          54% {
            opacity: 0.58;
          }

          100% {
            transform: translateX(240%);
            opacity: 0;
          }
        }
      `}</style>
    </section>
  );
}
