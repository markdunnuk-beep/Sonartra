import type { Metadata } from 'next';

type RunnerOption = {
  id: 'a' | 'b' | 'c' | 'd';
  label: 'A' | 'B' | 'C' | 'D';
  copy: string;
  selected?: boolean;
};

const runnerOptions: RunnerOption[] = [
  {
    id: 'a',
    label: 'A',
    copy: 'Refocus the group on the outcome and what needs to happen next.',
  },
  {
    id: 'b',
    label: 'B',
    copy: 'Step back, identify where the process is breaking down, and restore structure.',
    selected: true,
  },
  {
    id: 'c',
    label: 'C',
    copy: 'Reconnect the work to the wider purpose so people understand why it matters.',
  },
  {
    id: 'd',
    label: 'D',
    copy: 'Check how the team is feeling and whether people need support or clarity.',
  },
] as const;

export const metadata: Metadata = {
  title: 'Draft Assessment Runner | Sonartra',
  description: 'Static preview of the Sonartra assessment-taking experience.',
};

export default function DraftRunnerPage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#070A0F] px-4 pb-16 pt-20 text-[#F5F1EA] sm:px-6 md:pb-20 md:pt-24 lg:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(50,214,176,0.12),transparent_32%),radial-gradient(circle_at_88%_12%,rgba(245,241,234,0.08),transparent_30%),linear-gradient(180deg,#070A0F_0%,#080B10_100%)]" />
        <div className="absolute left-1/2 top-20 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full border border-white/5" />
        <div className="absolute inset-x-[-10rem] top-0 h-[36rem] bg-[linear-gradient(rgba(245,241,234,0.014)_1px,transparent_1px),linear-gradient(90deg,rgba(245,241,234,0.014)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-6 md:gap-8">
        <header className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 backdrop-blur-sm md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.17em] text-[#32D6B0]">
            Draft runner prototype
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl">Leadership Approach</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#D8D0C3]/84 md:text-base">
            A preview of the Sonartra assessment experience.
          </p>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-sm md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[#F5F1EA] md:text-lg">Leadership Approach</h2>
            <p className="text-sm text-[#D8D0C3]/84">Question 7 of 24</p>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.12em] text-[#D8D0C3]/72">
            <span>29% complete</span>
            <span>29%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[29%] rounded-full bg-[#32D6B0]/75" />
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#0C1118]/85 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)] md:p-8">
          <h2 className="text-xl font-semibold leading-snug md:text-2xl">
            When a project starts to lose momentum, what are you most likely to do first?
          </h2>
          <p className="mt-4 text-sm leading-6 text-[#D8D0C3]/80 md:text-base">
            Choose the response that feels most natural, not the one you think is most impressive.
          </p>

          <div className="mt-7 grid gap-4">
            {runnerOptions.map((option) => {
              const isSelected = option.selected === true;

              return (
                <button
                  aria-pressed={isSelected}
                  className={[
                    'group flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition duration-150 ease-out md:p-5',
                    isSelected
                      ? 'border-[#32D6B0]/45 bg-[#32D6B0]/12'
                      : 'border-white/12 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.05]',
                  ].join(' ')}
                  key={option.id}
                  type="button"
                >
                  <span
                    className={[
                      'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
                      isSelected
                        ? 'border-[#32D6B0]/55 bg-[#32D6B0]/15 text-[#8EF0D9]'
                        : 'border-white/18 bg-white/[0.03] text-[#E5DDD1]',
                    ].join(' ')}
                  >
                    {option.label}
                  </span>
                  <span className="text-sm leading-6 text-[#ECE5D9] md:text-base md:leading-7">
                    {option.copy}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-[#D8D0C3]/74 sm:max-w-sm">
              You can review your responses before submitting the assessment.
            </p>
            <div className="flex w-full gap-3 sm:w-auto">
              <button className="inline-flex flex-1 items-center justify-center rounded-full border border-white/20 bg-white/[0.03] px-5 py-3 text-sm font-medium text-[#F5F1EA] transition hover:border-white/35 hover:bg-white/[0.07] sm:flex-none" type="button">
                Back
              </button>
              <button className="inline-flex flex-1 items-center justify-center rounded-full border border-[#32D6B0]/35 bg-[#32D6B0] px-5 py-3 text-sm font-semibold text-[#07100F] transition hover:bg-[#5DE6C5] sm:flex-none" type="button">
                Continue
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
