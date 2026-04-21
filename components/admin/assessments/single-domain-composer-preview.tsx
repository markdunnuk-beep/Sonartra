'use client';

import { useMemo, useState } from 'react';

import { useAdminAssessmentAuthoring } from '@/components/admin/admin-assessment-authoring-context';
import { SingleDomainComposerPreviewSection } from '@/components/admin/assessments/single-domain-composer-preview-section';
import { CardTitle, LabelPill, SecondaryText, SurfaceCard, cn } from '@/components/shared/user-app-ui';
import {
  buildSingleDomainDraftPreviewInput,
  composeSingleDomainReport,
  type ResultComposerPreviewInput,
} from '@/lib/assessment-language/single-domain-composer';
import {
  buildSingleDomainComposerDiagnostics,
} from '@/lib/assessment-language/single-domain-composer-diagnostics';
import {
  SINGLE_DOMAIN_PREVIEW_FIXTURES,
  getSingleDomainPreviewFixtureById,
} from '@/lib/assessment-language/single-domain-preview-fixtures';

type PreviewMode = 'draft' | 'fixture';

function PreviewModeButton({
  label,
  active,
  onClick,
}: Readonly<{
  label: string;
  active: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      className={cn(
        'sonartra-button sonartra-focus-ring',
        active
          ? 'sonartra-button-primary'
          : 'sonartra-button-secondary border-white/8 bg-white/[0.04] text-white/62',
      )}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function DiagnosticTone({
  severity,
}: Readonly<{
  severity: 'warning' | 'blocking';
}>) {
  return (
    <LabelPill
      className={cn(
        severity === 'blocking'
          ? 'border-[rgba(255,157,157,0.2)] bg-[rgba(80,20,20,0.18)] text-[rgba(255,216,216,0.94)]'
          : 'border-[rgba(255,184,107,0.18)] bg-[rgba(255,184,107,0.08)] text-[rgba(255,227,187,0.88)]',
      )}
    >
      {severity === 'blocking' ? 'Blocking' : 'Warning'}
    </LabelPill>
  );
}

function buildPreviewState(params: {
  mode: PreviewMode;
  fixtureId: string;
  assessment: ReturnType<typeof useAdminAssessmentAuthoring>;
}):
  | {
      status: 'ready';
      mode: PreviewMode;
      sourceLabel: string;
      input: ResultComposerPreviewInput;
      report: ReturnType<typeof composeSingleDomainReport>;
      diagnostics: ReturnType<typeof buildSingleDomainComposerDiagnostics>;
      note: string;
      pairOptions: readonly string[];
      activePairKey: string;
    }
  | {
      status: 'empty';
      mode: PreviewMode;
      sourceLabel: string;
      reason: string;
    } {
  if (params.mode === 'fixture') {
    const fixture = getSingleDomainPreviewFixtureById(params.fixtureId) ?? SINGLE_DOMAIN_PREVIEW_FIXTURES[0];
    if (!fixture) {
      return {
        status: 'empty',
        mode: params.mode,
        sourceLabel: 'Fixture preview',
        reason: 'No preview fixture is available.',
      };
    }

    const report = composeSingleDomainReport(fixture.input);
    return {
      status: 'ready',
      mode: params.mode,
      sourceLabel: fixture.label,
      input: fixture.input,
      report,
      diagnostics: buildSingleDomainComposerDiagnostics(fixture.input),
      note: fixture.description,
      pairOptions: [fixture.input.pair_key],
      activePairKey: fixture.input.pair_key,
    };
  }

  const draftPreview = buildSingleDomainDraftPreviewInput(params.assessment);
  if (!draftPreview.success) {
    return {
      status: 'empty',
      mode: params.mode,
      sourceLabel: 'Draft preview',
      reason: draftPreview.reason,
    };
  }

  const report = composeSingleDomainReport(draftPreview.input);
  return {
    status: 'ready',
    mode: params.mode,
    sourceLabel: 'Draft preview',
    input: draftPreview.input,
    report,
    diagnostics: buildSingleDomainComposerDiagnostics(draftPreview.input),
    note: 'Composed from the current draft-backed single-domain section imports via the locked adapter path.',
    pairOptions: draftPreview.pairOptions,
    activePairKey: draftPreview.activePairKey,
  };
}

export function SingleDomainComposerPreview() {
  const assessment = useAdminAssessmentAuthoring();
  const [mode, setMode] = useState<PreviewMode>('draft');
  const [fixtureId, setFixtureId] = useState<string>(SINGLE_DOMAIN_PREVIEW_FIXTURES[0]?.id ?? '');

  const previewState = useMemo(
    () => buildPreviewState({
      mode,
      fixtureId,
      assessment,
    }),
    [assessment, fixtureId, mode],
  );

  return (
    <section className="space-y-4" id="single-domain-composer-preview">
      <SurfaceCard accent className="space-y-4 p-5 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="sonartra-page-eyebrow">Composer Preview</p>
            <CardTitle>Result composer preview</CardTitle>
            <SecondaryText>
              Review the full single-domain report as one continuous narrative before publish.
            </SecondaryText>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PreviewModeButton active={mode === 'draft'} label="Draft preview" onClick={() => setMode('draft')} />
            <PreviewModeButton active={mode === 'fixture'} label="Fixture preview" onClick={() => setMode('fixture')} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <LabelPill>{assessment.assessmentKey}</LabelPill>
          <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
            {previewState.sourceLabel}
          </LabelPill>
          {'status' in previewState && previewState.status === 'ready' ? (
            <>
              <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
                Pair {previewState.activePairKey}
              </LabelPill>
              <LabelPill
                className={cn(
                  previewState.diagnostics.hasBlockingIssues
                    ? 'border-[rgba(255,157,157,0.2)] bg-[rgba(80,20,20,0.18)] text-[rgba(255,216,216,0.94)]'
                    : 'border-[rgba(116,209,177,0.18)] bg-[rgba(116,209,177,0.08)] text-[rgba(214,246,233,0.86)]',
                )}
              >
                {previewState.diagnostics.hasBlockingIssues ? 'Diagnostics attention' : 'Diagnostics ready'}
              </LabelPill>
            </>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <p className="text-sm leading-6 text-white/58">
            {'status' in previewState && previewState.status === 'ready'
              ? previewState.note
              : previewState.reason}
          </p>
          {mode === 'fixture' ? (
            <label className="space-y-2">
              <span className="block text-sm font-medium text-white">Fixture</span>
              <select
                className="sonartra-focus-ring min-h-11 w-full rounded-[1rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white"
                onChange={(event) => setFixtureId(event.target.value)}
                value={fixtureId}
              >
                {SINGLE_DOMAIN_PREVIEW_FIXTURES.map((fixture) => (
                  <option key={fixture.id} value={fixture.id}>
                    {fixture.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </SurfaceCard>

      {previewState.status === 'empty' ? (
        <SurfaceCard dashed muted className="space-y-3 p-5 lg:p-6">
          <CardTitle>Preview unavailable</CardTitle>
          <SecondaryText>{previewState.reason}</SecondaryText>
        </SurfaceCard>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
          <SurfaceCard className="space-y-8 p-5 lg:p-7">
            <header className="space-y-4">
              <div className="space-y-2">
                <p className="sonartra-page-eyebrow">Composed report</p>
                <h2 className="text-[2rem] font-semibold tracking-[-0.04em] text-white">
                  {previewState.report.domainTitle}
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-white/58">
                  This preview assembles the locked six-section narrative into one report flow:
                  intro, hero, drivers, pair, limitation, application.
                </p>
              </div>
            </header>

            <div className="space-y-8">
              {previewState.report.sections.map((section) => (
                <SingleDomainComposerPreviewSection key={section.key} section={section} />
              ))}
            </div>
          </SurfaceCard>

          <div className="space-y-4">
            <SurfaceCard className="space-y-4 p-5">
              <CardTitle>Diagnostics</CardTitle>
              <div className="space-y-3">
                {previewState.diagnostics.issues.length > 0 ? (
                  previewState.diagnostics.issues.map((issue) => (
                    <div
                      className={cn(
                        'rounded-[1rem] border p-4',
                        issue.severity === 'blocking'
                          ? 'border-[rgba(255,157,157,0.2)] bg-[rgba(80,20,20,0.18)]'
                          : 'border-[rgba(255,184,107,0.18)] bg-[rgba(255,184,107,0.08)]',
                      )}
                      key={`${issue.code}-${issue.message}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <DiagnosticTone severity={issue.severity} />
                        <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
                          {issue.code}
                        </LabelPill>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/78">{issue.message}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/42">
                        {issue.sections.join(' / ')}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1rem] border border-[rgba(116,209,177,0.18)] bg-[rgba(116,209,177,0.08)] p-4 text-sm leading-6 text-[rgba(214,246,233,0.86)]">
                    No first-pass composition issues were detected for this preview.
                  </div>
                )}
              </div>
            </SurfaceCard>

            <SurfaceCard className="space-y-4 p-5">
              <CardTitle>Provenance</CardTitle>
              <div className="space-y-3">
                {previewState.report.sections.map((section) => (
                  <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4" key={`prov-${section.key}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <LabelPill>{section.key}</LabelPill>
                      <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
                        {section.provenance.sourceDatasetKey}
                      </LabelPill>
                      <LabelPill
                        className={cn(
                          section.provenance.validationStatus === 'ready'
                            ? 'border-[rgba(116,209,177,0.18)] bg-[rgba(116,209,177,0.08)] text-[rgba(214,246,233,0.86)]'
                            : 'border-[rgba(255,184,107,0.18)] bg-[rgba(255,184,107,0.08)] text-[rgba(255,227,187,0.88)]',
                        )}
                      >
                        {section.provenance.validationStatus}
                      </LabelPill>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/74">
                      Source rows: {section.provenance.sourceRowCount}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-white/58">
                      {section.provenance.sourceRowIdentifiers.join(', ') || 'No source row identifiers available.'}
                    </p>
                    {section.provenance.validationMessages.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {section.provenance.validationMessages.map((message) => (
                          <p className="text-sm leading-6 text-white/58" key={`${section.key}-${message}`}>
                            {message}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </div>
        </div>
      )}
    </section>
  );
}
