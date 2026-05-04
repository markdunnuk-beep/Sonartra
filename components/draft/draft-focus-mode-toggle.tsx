'use client';

function FocusIcon({ active }: { active: boolean }) {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      {active ? (
        <path
          d="M8 4H5.75A1.75 1.75 0 0 0 4 5.75V8m12-4h2.25A1.75 1.75 0 0 1 20 5.75V8M8 20H5.75A1.75 1.75 0 0 1 4 18.25V16m12 4h2.25A1.75 1.75 0 0 0 20 18.25V16M9 9l6 6m0-6-6 6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.7"
        />
      ) : (
        <path
          d="M4 8V5.75A1.75 1.75 0 0 1 5.75 4H8m8 0h2.25A1.75 1.75 0 0 1 20 5.75V8M4 16v2.25A1.75 1.75 0 0 0 5.75 20H8m8 0h2.25A1.75 1.75 0 0 0 20 18.25V16M9.5 12a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.7"
        />
      )}
    </svg>
  );
}

export function DraftFocusModeToggle({
  active,
  className = '',
  onToggle,
}: {
  active: boolean;
  className?: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={active ? 'Exit focus mode' : 'Enter focus mode'}
      aria-pressed={active}
      className={[
        'draft-focus-toggle sonartra-focus-ring inline-flex items-center gap-2 rounded-full border border-[#F3F1EA]/[0.11] bg-[#171D1A]/72 px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-[#F3F1EA]/86 shadow-[0_14px_34px_rgba(4,7,6,0.16)] outline-none transition hover:border-[#32D6B0]/28 hover:bg-[#32D6B0]/[0.07] hover:text-[#F3F1EA] focus-visible:ring-2 focus-visible:ring-[#32D6B0]/55',
        active ? 'border-[#32D6B0]/28 bg-[#32D6B0]/[0.09] text-[#F3F1EA]' : '',
        className,
      ].join(' ')}
      onClick={onToggle}
    >
      <FocusIcon active={active} />
      <span>{active ? 'Exit' : 'Focus'}</span>
    </button>
  );
}
