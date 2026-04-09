import { RESULT_READING_SECTIONS_BY_ID } from '@/lib/results/result-reading-sections';

type ResultSectionIntentProps = {
  sectionId: string;
  className?: string;
};

export function ResultSectionIntent({ sectionId, className }: ResultSectionIntentProps) {
  if (!sectionId) {
    return null;
  }

  const section = RESULT_READING_SECTIONS_BY_ID[sectionId];

  if (!section || section.level !== 'section' || !section.intentPrompt) {
    return null;
  }

  return (
    <p
      className={[
        'sonartra-report-body-soft max-w-[56ch] text-[0.91rem] leading-7 text-white/52 md:text-[0.95rem]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-result-section-intent={section.id}
    >
      {section.intentPrompt}
    </p>
  );
}
