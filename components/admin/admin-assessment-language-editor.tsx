'use client';

import { useEffect, useRef, useState, useTransition } from 'react';

import { SurfaceCard, cn } from '@/components/shared/user-app-ui';
import { upsertAssessmentLanguage } from '@/lib/server/admin-assessment-language';

export function AdminAssessmentLanguageEditor({
  assessmentVersionId,
  initialValue,
  isEditableAssessmentVersion,
}: Readonly<{
  assessmentVersionId: string;
  initialValue: string | null;
  isEditableAssessmentVersion: boolean;
}>) {
  const [savedValue, setSavedValue] = useState(initialValue ?? '');
  const [draftValue, setDraftValue] = useState(initialValue ?? '');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const clearStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSavedValue(initialValue ?? '');
    setDraftValue(initialValue ?? '');
    setError(null);
    setStatusMessage(null);
  }, [initialValue]);

  useEffect(() => {
    return () => {
      if (clearStatusTimeoutRef.current) {
        clearTimeout(clearStatusTimeoutRef.current);
      }
    };
  }, []);

  function setTransientStatus(message: string | null) {
    if (clearStatusTimeoutRef.current) {
      clearTimeout(clearStatusTimeoutRef.current);
    }

    setStatusMessage(message);

    if (!message) {
      return;
    }

    clearStatusTimeoutRef.current = setTimeout(() => {
      setStatusMessage(null);
    }, 2400);
  }

  function submit(nextRawValue: string) {
    const trimmedNextValue = nextRawValue.trim();
    const trimmedSavedValue = savedValue.trim();

    if (trimmedNextValue === trimmedSavedValue) {
      setDraftValue(trimmedNextValue);
      setError(null);
      return;
    }

    startTransition(async () => {
      const result = await upsertAssessmentLanguage({
        assessmentVersionId,
        section: 'assessment_description',
        content: trimmedNextValue,
      });

      if (!result.ok) {
        setDraftValue(savedValue);
        setError(result.error ?? 'Assessment language could not be saved.');
        return;
      }

      const nextSavedValue = result.value ?? '';
      setSavedValue(nextSavedValue);
      setDraftValue(nextSavedValue);
      setError(null);
      setTransientStatus(nextSavedValue ? 'Saved.' : 'Removed.');
    });
  }

  return (
    <SurfaceCard className="space-y-4 p-5 lg:p-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold tracking-[-0.02em] text-white">Intro Description</h3>
        <p className="max-w-3xl text-sm leading-7 text-white/62">
          Markdown opening context shown at the top of every report. Supports `**bold**` and blank-line paragraphs; raw HTML is ignored.
        </p>
      </div>

      <textarea
        aria-label="Assessment Description"
        className={cn(
          'sonartra-focus-ring min-h-[148px] w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm leading-7 text-white placeholder:text-white/28',
          error
            ? 'border-[rgba(255,157,157,0.32)]'
            : 'border-white/10 hover:border-white/14 focus:border-[rgba(142,162,255,0.36)]',
          !isEditableAssessmentVersion ? 'cursor-not-allowed opacity-70' : '',
        )}
        disabled={!isEditableAssessmentVersion || isPending}
        onBlur={(event) => {
          const nextValue = event.currentTarget.value;
          setDraftValue(nextValue);
          submit(nextValue);
        }}
        onChange={(event) => {
          setDraftValue(event.currentTarget.value);
          if (error) {
            setError(null);
          }
        }}
        placeholder="Add the intro description shown above the report hero. Use **bold** and blank lines for paragraphs."
        value={draftValue}
      />

      <div className="flex min-h-5 items-center justify-between gap-3 text-sm">
        <span className={error ? 'text-[rgba(255,198,198,0.92)]' : 'text-white/45'}>
          {error ?? statusMessage ?? (isEditableAssessmentVersion ? 'Saves when the field loses focus.' : 'Published versions are read-only.')}
        </span>
        <span className="text-white/34">{isPending ? 'Saving...' : null}</span>
      </div>
    </SurfaceCard>
  );
}
