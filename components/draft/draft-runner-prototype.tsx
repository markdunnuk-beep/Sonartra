'use client';

import { useEffect, useState } from 'react';

import {
  DRAFT_FOCUS_MODE_CHANGE_EVENT,
  DRAFT_READING_MODE_CHANGE_EVENT,
  type DraftReadingMode,
} from '@/components/draft/draft-display-mode-events';
import { DraftFocusModeToggle } from '@/components/draft/draft-focus-mode-toggle';
import { DraftReadingModeToggle } from '@/components/draft/draft-reading-mode-toggle';

type RunnerOption = {
  id: 'a' | 'b' | 'c' | 'd';
  label: 'A' | 'B' | 'C' | 'D';
  copy: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const runnerOptions: RunnerOption[] = [
  { id: 'a', label: 'A', copy: 'Refocus the group on the outcome and what needs to happen next.' },
  {
    id: 'b',
    label: 'B',
    copy: 'Step back, identify where the process is breaking down, and restore structure.',
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

export function DraftRunnerPrototype() {
  const [focusMode, setFocusMode] = useState(false);
  const [readingMode, setReadingMode] = useState<DraftReadingMode>('dark');
  const [selectedOptionId, setSelectedOptionId] = useState<RunnerOption['id']>('b');

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(DRAFT_READING_MODE_CHANGE_EVENT, {
        detail: { mode: readingMode },
      }),
    );

    document.documentElement.dataset.draftRunnerReadingMode = readingMode;
    document.body.dataset.draftRunnerReadingMode = readingMode;

    return () => {
      delete document.documentElement.dataset.draftRunnerReadingMode;
      delete document.body.dataset.draftRunnerReadingMode;
    };
  }, [readingMode]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(DRAFT_FOCUS_MODE_CHANGE_EVENT, {
        detail: { focusMode },
      }),
    );
  }, [focusMode]);

  useEffect(() => {
    if (!focusMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFocusMode(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusMode]);

  return (
    <div
      className="draft-runner-shell relative isolate -mx-5 min-h-screen overflow-hidden bg-[#070A0F] px-5 pb-12 pt-14 text-[#F5F1EA] sm:-mx-6 sm:px-6 md:pb-20 md:pt-24 lg:-mx-8 lg:px-8"
      data-focus-mode={focusMode ? 'true' : 'false'}
      data-reading-mode={readingMode}
    >
      <style>{`
      .draft-runner-shell[data-reading-mode='light'] { background:#F4F1EA !important; color:#17201C !important; }
      .draft-runner-shell[data-reading-mode='light'] .draft-runner-backdrop { background:radial-gradient(circle at 12% 8%,rgba(38,148,128,.14),transparent 32%),radial-gradient(circle at 88% 12%,rgba(164,101,67,.11),transparent 30%),linear-gradient(180deg,#F4F1EA 0%,#ECE7DC 100%) !important; }
      .draft-runner-shell[data-reading-mode='light'] .draft-runner-ring { border-color: rgba(23,32,28,.09) !important; }
      .draft-runner-shell[data-reading-mode='light'] .draft-runner-grid { background-image:linear-gradient(rgba(23,32,28,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(23,32,28,.03) 1px,transparent 1px) !important; }
      .draft-runner-shell[data-reading-mode='light'] .draft-panel { background:rgba(250,248,243,.85) !important; border-color:rgba(23,32,28,.12)!important; box-shadow:0 16px 42px rgba(58,51,42,.08)!important; }
      .draft-runner-shell[data-reading-mode='light'] :where(h1,h2,p,span){ color:inherit; }
      .draft-runner-shell[data-reading-mode='light'] .draft-muted { color:rgba(23,32,28,.68)!important; }
      .draft-runner-shell[data-reading-mode='light'] .draft-option { background:rgba(250,248,243,.74)!important; border-color:rgba(23,32,28,.14)!important; color:#17201C!important; }
      .draft-runner-shell[data-reading-mode='light'] .draft-option[data-selected='true'] { border-color: rgba(38,148,128,.5)!important; background: rgba(38,148,128,.1)!important; }
      .draft-runner-shell[data-reading-mode='light'] .draft-option-token { border-color:rgba(23,32,28,.2)!important; background:rgba(23,32,28,.06)!important; color:#17201C!important; }
      .draft-runner-shell[data-reading-mode='light'] .draft-option[data-selected='true'] .draft-option-token { border-color:rgba(38,148,128,.5)!important;background:rgba(38,148,128,.12)!important;color:#137F70!important; }
      .draft-runner-shell[data-reading-mode='light'] .draft-selected-label { color:#137F70!important; }
      .draft-runner-shell[data-reading-mode='light'] .draft-reading-toggle, .draft-runner-shell[data-reading-mode='light'] .draft-focus-toggle { background: rgba(250,248,243,.9)!important; border-color:rgba(23,32,28,.16)!important; color:#17201C!important; }
      .draft-runner-shell[data-focus-mode='true'] { padding-top: 2rem !important; }
      .draft-runner-shell[data-focus-mode='true'] .draft-runner-header { padding-block: 1rem !important; opacity:.78; }
      .draft-runner-shell[data-focus-mode='true'] .draft-runner-header .draft-runner-prototype-label,
      .draft-runner-shell[data-focus-mode='true'] .draft-runner-header .draft-runner-intro-copy { display:none; }
      `}</style>
      <div className="pointer-events-none absolute right-4 top-4 z-20 flex items-center gap-2 sm:right-6 md:right-8">
        <div className="pointer-events-auto flex items-center gap-2">
          <DraftReadingModeToggle
            mode={readingMode}
            onToggle={() => setReadingMode(readingMode === 'dark' ? 'light' : 'dark')}
          />
          <DraftFocusModeToggle active={focusMode} onToggle={() => setFocusMode(!focusMode)} />
        </div>
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="draft-runner-backdrop absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(50,214,176,0.12),transparent_32%),radial-gradient(circle_at_88%_12%,rgba(245,241,234,0.08),transparent_30%),linear-gradient(180deg,#070A0F_0%,#080B10_100%)]" />
        <div className="draft-runner-ring absolute left-1/2 top-20 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full border border-white/5" />
        <div className="draft-runner-grid absolute inset-x-[-10rem] top-0 h-[36rem] bg-[linear-gradient(rgba(245,241,234,0.014)_1px,transparent_1px),linear-gradient(90deg,rgba(245,241,234,0.014)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-4 md:gap-8">
        <header className="draft-runner-header draft-panel rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-sm md:p-8">
          <p className="draft-runner-prototype-label text-xs font-semibold uppercase tracking-[0.17em] text-[#32D6B0]">
            Draft runner prototype
          </p>
          <h1 className="mt-2 text-2xl font-semibold leading-tight md:mt-4 md:text-4xl">
            Leadership Approach
          </h1>
          <p className="draft-runner-intro-copy draft-muted text-[#D8D0C3]/84 mt-2 max-w-2xl text-sm leading-6 md:mt-3 md:text-base">
            A preview of the Sonartra assessment experience.
          </p>
        </header>

        <section className="draft-panel rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-sm md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold md:text-lg">Leadership Approach</h2>
            <p className="draft-muted text-[#D8D0C3]/84 text-sm">Question 7 of 24</p>
          </div>
          <div className="draft-muted text-[#D8D0C3]/72 mt-4 flex items-center justify-between text-xs uppercase tracking-[0.12em]">
            <span>29% complete</span>
            <span>29%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[29%] rounded-full bg-[#32D6B0]/75" />
          </div>
        </section>

        <section className="draft-panel rounded-3xl border border-white/10 bg-[#0C1118]/85 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.35)] md:p-8">
          <h2 id="draft-runner-question" className="text-xl font-semibold leading-snug md:text-2xl">
            When a project starts to lose momentum, what are you most likely to do first?
          </h2>
          <p className="draft-muted mt-4 text-sm leading-6 text-[#D8D0C3]/80 md:text-base">
            Choose the response that feels most natural in this situation.
          </p>
          <div
            aria-labelledby="draft-runner-question"
            className="mt-7 grid gap-4"
            role="radiogroup"
          >
            {runnerOptions.map((option) => {
              const isSelected = selectedOptionId === option.id;
              return (
                <button
                  key={option.id}
                  aria-checked={isSelected}
                  data-selected={isSelected ? 'true' : 'false'}
                  onClick={() => setSelectedOptionId(option.id)}
                  role="radio"
                  type="button"
                  className={cx(
                    'draft-option group flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#32D6B0]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C1118] md:p-5',
                    isSelected
                      ? 'bg-[#32D6B0]/12 border-[#32D6B0]/45'
                      : 'border-white/12 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.05]',
                  )}
                >
                  <span
                    className={cx(
                      'draft-option-token mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
                      isSelected
                        ? 'border-[#32D6B0]/55 bg-[#32D6B0]/15 text-[#8EF0D9]'
                        : 'border-white/18 bg-white/[0.03] text-[#E5DDD1]',
                    )}
                  >
                    {option.label}
                  </span>
                  <span className="text-sm leading-6 md:text-base md:leading-7">{option.copy}</span>
                  <span
                    className={
                      isSelected
                        ? 'draft-selected-label ml-auto shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-[#8EF0D9]'
                        : 'sr-only'
                    }
                  >
                    {isSelected ? 'Selected' : 'Not selected'}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="draft-muted text-[#D8D0C3]/74 text-xs leading-5 sm:max-w-sm">
              You can review your responses before submitting the assessment.
            </p>
            <div className="flex w-full gap-3 sm:w-auto">
              <button
                className="inline-flex flex-1 items-center justify-center rounded-full border border-white/20 bg-white/[0.03] px-5 py-3 text-sm font-medium transition hover:border-white/35 hover:bg-white/[0.07] sm:flex-none"
                type="button"
              >
                Back
              </button>
              <button
                className="inline-flex flex-1 items-center justify-center rounded-full border border-[#32D6B0]/35 bg-[#32D6B0] px-5 py-3 text-sm font-semibold text-[#07100F] transition hover:bg-[#5DE6C5] sm:flex-none"
                type="button"
              >
                Continue
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
