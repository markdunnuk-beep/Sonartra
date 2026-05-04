'use client';

export type DraftReadingMode = 'dark' | 'light';

function ReadingModeIcon({ mode }: { mode: DraftReadingMode }) {
  if (mode === 'dark') {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path
          d="M12 4V2M12 22v-2M4 12H2M22 12h-2M5.64 5.64 4.22 4.22M19.78 19.78l-1.42-1.42M18.36 5.64l1.42-1.42M4.22 19.78l1.42-1.42"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.7"
        />
        <circle cx="12" cy="12" r="4.25" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M20.25 14.2A7.2 7.2 0 0 1 9.8 3.75 8.4 8.4 0 1 0 20.25 14.2Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function DraftReadingModeToggle({
  className = '',
  mode,
  onToggle,
}: {
  className?: string;
  mode: DraftReadingMode;
  onToggle: () => void;
}) {
  const nextMode = mode === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      aria-label={`Switch to ${nextMode} reading mode`}
      aria-pressed={mode === 'light'}
      className={[
        'draft-reading-toggle sonartra-focus-ring inline-flex items-center gap-2 rounded-full border border-[#F3F1EA]/[0.11] bg-[#171D1A]/72 px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-[#F3F1EA]/86 shadow-[0_14px_34px_rgba(4,7,6,0.16)] outline-none transition hover:border-[#32D6B0]/28 hover:bg-[#32D6B0]/[0.07] hover:text-[#F3F1EA] focus-visible:ring-2 focus-visible:ring-[#32D6B0]/55',
        className,
      ].join(' ')}
      onClick={onToggle}
    >
      <ReadingModeIcon mode={mode} />
      <span>{nextMode}</span>
    </button>
  );
}
