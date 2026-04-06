import { SonartraIntroductionVisual } from '@/components/results/sonartra-introduction-visual';

const INTRODUCTION_SECTIONS = [
  {
    title: 'Domains',
    body: 'Broad areas being measured in the assessment.',
  },
  {
    title: 'Signals',
    body: 'Specific behavioural patterns being read within a Domain.',
  },
  {
    title: 'Signal Pairs',
    body: 'The strongest signals in a Domain read together to reveal how behaviour combines in practice.',
  },
] as const;

export function SonartraIntroduction() {
  return (
    <section
      className="border-white/7 relative overflow-hidden rounded-[2rem] border bg-[radial-gradient(circle_at_top_left,rgba(145,168,214,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.028),rgba(255,255,255,0.014))] px-6 py-7 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:px-8 sm:py-9 md:px-10 md:py-11 lg:px-12 lg:py-12"
      aria-labelledby="sonartra-introduction-title"
      data-sonartra-introduction="true"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.018),transparent_24%,transparent_76%,rgba(255,255,255,0.012))]" />

      <div className="relative mx-auto max-w-[61rem] space-y-8 md:space-y-10">
        <div className="max-w-[46rem] space-y-7 md:space-y-8">
          <header className="space-y-4 md:space-y-5">
            <p className="sonartra-report-kicker">How to read this report</p>
            <div className="space-y-4">
              <h2
                id="sonartra-introduction-title"
                className="sonartra-type-section-title max-w-[18ch] text-[2rem] leading-[1.06] sm:text-[2.3rem] md:text-[2.7rem]"
              >
                Understand the patterns behind your results
              </h2>
              <p className="sonartra-report-body max-w-[68ch] text-[1rem] leading-8 sm:text-[1.04rem] md:text-[1.08rem] md:leading-9">
                This report is designed to help you understand how you tend to think, respond, and operate across the
                areas measured by this assessment. Rather than reducing you to a single label, Sonartra shows the
                behavioural patterns that are most consistently coming through in your responses.
              </p>
            </div>
          </header>
        </div>

        <div
          className="grid gap-3.5 md:grid-cols-3 md:gap-4"
          aria-label="Sonartra concept sequence"
          data-sonartra-introduction-steps="true"
        >
          {INTRODUCTION_SECTIONS.map((section, index) => (
            <div key={section.title} className="relative">
              {index < INTRODUCTION_SECTIONS.length - 1 ? (
                <div
                  className="pointer-events-none absolute left-6 top-full h-5 w-px bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.04))] md:left-auto md:right-[-0.55rem] md:top-1/2 md:h-px md:w-5 md:-translate-y-1/2 md:bg-[linear-gradient(90deg,rgba(255,255,255,0.18),rgba(255,255,255,0.04))]"
                  aria-hidden="true"
                />
              ) : null}
              <article
                className="relative rounded-[1.25rem] border border-white/7 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.018))] px-4 py-4 shadow-[0_12px_36px_rgba(0,0,0,0.14)] sm:px-5 sm:py-5"
                data-sonartra-introduction-step={section.title}
              >
                <div className="space-y-3">
                  <p className="sonartra-type-utility text-white/36">{`0${index + 1}`}</p>
                  <div className="space-y-2">
                    <h3 className="sonartra-report-title text-[1rem] sm:text-[1.06rem]">{section.title}</h3>
                    <p className="sonartra-report-body-soft text-[0.96rem] leading-7 text-white/64">{section.body}</p>
                  </div>
                </div>
              </article>
            </div>
          ))}
        </div>

        <SonartraIntroductionVisual className="mx-auto w-full max-w-[34rem]" />
      </div>
    </section>
  );
}
