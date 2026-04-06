import { SonartraIntroductionVisual } from '@/components/results/sonartra-introduction-visual';
import { cn } from '@/components/shared/user-app-ui';

const INTRODUCTION_SECTIONS = [
  {
    title: 'Domains',
    body: 'Domains are the broad areas being measured. They give the report its structure and help organise the different parts of your behaviour into clear, readable themes. Depending on the assessment, the number and focus of Domains may vary.',
  },
  {
    title: 'Signals',
    body: 'Within each Domain are Signals. Signals are the distinct behavioural patterns identified by the assessment. They show the tendencies, preferences, and operating styles that are most likely to shape how you approach situations in practice.',
  },
  {
    title: 'Signal Pairs',
    body: 'Signals become more useful when read together. Sonartra looks not only at individual Signals, but also at the way Signals combine into Signal Pairs. This reveals how different tendencies interact, reinforce each other, or create tension in real-world situations.',
  },
  {
    title: 'How to use this report',
    body: 'Use this report as a practical guide, not a fixed judgement. It is best read as a map of likely patterns: where you may naturally add value, where pressure or friction may appear, and where greater awareness can improve how you work, lead, and relate to others.',
  },
] as const;

export function SonartraIntroduction({
  className,
}: Readonly<{
  className?: string;
}>) {
  return (
    <section
      className={cn(
        'border-white/7 relative overflow-hidden rounded-[2rem] border bg-[radial-gradient(circle_at_top_left,rgba(145,168,214,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.028),rgba(255,255,255,0.014))] px-6 py-7 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:px-8 sm:py-9 md:px-10 md:py-11 lg:px-12 lg:py-12',
        className,
      )}
      aria-labelledby="sonartra-introduction-title"
      data-sonartra-introduction="true"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.018),transparent_24%,transparent_76%,rgba(255,255,255,0.012))]" />

      <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(19rem,25rem)] lg:gap-12 lg:items-start">
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

          <div className="grid gap-4 md:grid-cols-2">
            {INTRODUCTION_SECTIONS.map((section) => (
              <article
                key={section.title}
                className="rounded-[1.2rem] border border-white/7 bg-white/[0.022] px-4 py-4 sm:px-5 sm:py-5"
              >
                <div className="space-y-2.5">
                  <h3 className="sonartra-report-title text-[1rem] sm:text-[1.06rem]">{section.title}</h3>
                  <p className="sonartra-report-body-soft text-[0.98rem] leading-7 text-white/66">{section.body}</p>
                </div>
              </article>
            ))}
          </div>

          <p className="sonartra-report-body-soft max-w-[68ch] border-t border-white/7 pt-5 text-[0.98rem] leading-8 text-white/62 sm:text-[1rem]">
            Start with the overall picture, then move into the detail. The sections that follow will show your
            strongest patterns, how they combine, and what they may mean in practice.
          </p>
        </div>

        <SonartraIntroductionVisual className="lg:sticky lg:top-8" />
      </div>
    </section>
  );
}
