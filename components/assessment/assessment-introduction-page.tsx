import Link from 'next/link';

import type { RuntimeAssessmentIntro } from '@/lib/engine/types';

type AssessmentIntroductionPageProps = {
  assessmentKey: string;
  assessmentTitle: string;
  totalQuestions: number;
  assessmentIntro: RuntimeAssessmentIntro;
  continueHref: string;
};

function IntroductionMetaStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="sonartra-runner-meta-stat">
      <p className="sonartra-runner-meta-label">{label}</p>
      <p className="sonartra-runner-meta-value">{value}</p>
    </div>
  );
}

export function AssessmentIntroductionPage({
  assessmentKey,
  assessmentTitle,
  totalQuestions,
  assessmentIntro,
  continueHref,
}: AssessmentIntroductionPageProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
      <div className="space-y-4">
        <header className="px-1">
          <p className="sonartra-type-eyebrow text-white/42">Assessment intro</p>
          <h1 className="sonartra-type-page-title mt-2 max-w-[16ch]">{assessmentTitle}</h1>
        </header>

        <section
          className="sonartra-motion-reveal sonartra-panel sonartra-runner-stage overflow-hidden p-5 sm:p-6 lg:p-7"
          aria-labelledby="assessment-intro-title"
          data-assessment-entry="introduction"
        >
          <div className="space-y-6 lg:space-y-7">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.82fr)] xl:gap-8">
              <div className="space-y-5">
                <div className="sonartra-type-eyebrow flex flex-wrap items-center gap-x-3 gap-y-2 text-white/40">
                  <span>Assessment Intro</span>
                  <span className="bg-white/18 hidden h-1 w-1 rounded-full sm:inline-block" />
                  <span>{assessmentTitle}</span>
                </div>

                <div className="space-y-3">
                  <p className="sonartra-type-caption text-white/54">{assessmentTitle}</p>
                  <h2
                    id="assessment-intro-title"
                    className="sonartra-type-page-title max-w-[16ch] text-[2.15rem] sm:text-[2.55rem] lg:text-[2.9rem]"
                  >
                    {assessmentIntro.introTitle || assessmentTitle}
                  </h2>
                </div>

                <p className="sonartra-type-body text-white/76 max-w-[58ch]">
                  {assessmentIntro.introSummary}
                </p>

                <div className="border-white/8 flex flex-wrap items-center gap-3 border-t pt-4">
                  <Link href={continueHref} className="sonartra-button sonartra-button-primary sonartra-focus-ring">
                    Continue to Assessment
                  </Link>
                  <p className="sonartra-type-body-secondary text-white/56 max-w-[32rem]">
                    Starting the assessment creates your attempt and opens the first question in the runner.
                  </p>
                </div>
              </div>

              <div className="sonartra-motion-reveal-soft border-white/8 flex flex-col gap-4 border-t pt-5 xl:border-l xl:border-t-0 xl:pl-7 xl:pt-0">
                <div className="sonartra-runner-support-card space-y-4 rounded-[1.15rem] border p-4 sm:p-5">
                  {assessmentIntro.estimatedTimeOverride ? (
                    <div className="space-y-1">
                      <p className="sonartra-type-eyebrow text-white/38">Estimated duration</p>
                      <p className="sonartra-type-nav text-white/84">
                        {assessmentIntro.estimatedTimeOverride}
                      </p>
                    </div>
                  ) : null}

                  {assessmentIntro.instructions ? (
                    <div className="space-y-1">
                      <p className="sonartra-type-eyebrow text-white/38">Instructions</p>
                      <p className="sonartra-type-body-secondary max-w-[38ch] leading-6">
                        {assessmentIntro.instructions}
                      </p>
                    </div>
                  ) : null}

                  {assessmentIntro.introHowItWorks ? (
                    <div className="space-y-1">
                      <p className="sonartra-type-eyebrow text-white/38">How it works</p>
                      <p className="sonartra-type-body-secondary max-w-[38ch] leading-6">
                        {assessmentIntro.introHowItWorks}
                      </p>
                    </div>
                  ) : null}

                  {assessmentIntro.confidentialityNote ? (
                    <div className="space-y-1">
                      <p className="sonartra-type-eyebrow text-white/38">Confidentiality</p>
                      <p className="sonartra-type-body-secondary max-w-[38ch] leading-6">
                        {assessmentIntro.confidentialityNote}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <aside className="xl:sticky xl:top-6">
        <section className="sonartra-motion-reveal sonartra-motion-stage-2 sonartra-panel sonartra-runner-support-card space-y-4 p-4">
          <div className="space-y-2">
            <p className="sonartra-type-eyebrow text-white/46">Before you begin</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <IntroductionMetaStat label="Questions" value={`${totalQuestions}`} />
              <IntroductionMetaStat label="Starting point" value="Question 1" />
            </div>
          </div>

          <p className="sonartra-type-body-secondary text-white/58">
            Progress starts once the first response is saved. Resume and completed-result routing remain separate from this introduction state.
          </p>
          <Link
            href={`/app/assessments#${assessmentKey}`}
            className="sonartra-type-nav text-white/70 transition hover:text-white"
          >
            Back to assessments
          </Link>
        </section>
      </aside>
    </div>
  );
}
