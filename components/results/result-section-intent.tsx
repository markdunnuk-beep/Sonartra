import {
  DEFAULT_RESULT_READING_SECTIONS,
  type ResultReadingSectionsConfig,
} from '@/lib/results/result-reading-sections';

type ResultSectionIntentProps = {
  sectionId: string;
  className?: string;
  sectionsConfig?: ResultReadingSectionsConfig;
};

export function ResultSectionIntent({
  sectionId,
  className,
  sectionsConfig = DEFAULT_RESULT_READING_SECTIONS,
}: ResultSectionIntentProps) {
  if (!sectionId) {
    return null;
  }

  const section = sectionsConfig.sectionsById[sectionId];

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
