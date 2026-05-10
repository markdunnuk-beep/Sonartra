export type RankedPatternWorkflowActionId =
  | 'uploadWorkbook'
  | 'checkWorkbook'
  | 'createDraft'
  | 'previewImport'
  | 'importToDraft'
  | 'checkPublishReadiness'
  | 'publishAssessment'
  | 'complete';

export type RankedPatternWorkflowNextActionInput = {
  readonly hasSelectedSource: boolean;
  readonly workbookChecked: boolean;
  readonly hasDraft: boolean;
  readonly importPreviewReady: boolean;
  readonly importApplied: boolean;
  readonly publishReadinessPassed: boolean;
  readonly published: boolean;
};

export type RankedPatternWorkflowActionState = {
  readonly actionId: Exclude<RankedPatternWorkflowActionId, 'complete'>;
  readonly label: string;
  readonly enabled: boolean;
  readonly highlighted: boolean;
  readonly prerequisite: string | null;
};

export type RankedPatternWorkflowNextActionState = {
  readonly actionId: RankedPatternWorkflowActionId;
  readonly label: string;
  readonly description: string;
  readonly complete: boolean;
  readonly actions: Readonly<Record<Exclude<RankedPatternWorkflowActionId, 'complete'>, RankedPatternWorkflowActionState>>;
};

const ACTION_LABELS: Readonly<Record<Exclude<RankedPatternWorkflowActionId, 'complete'>, string>> = {
  uploadWorkbook: 'Upload workbook',
  checkWorkbook: 'Check workbook',
  createDraft: 'Create draft',
  previewImport: 'Preview import',
  importToDraft: 'Import to draft',
  checkPublishReadiness: 'Check publish readiness',
  publishAssessment: 'Publish assessment',
};

function actionState(
  actionId: Exclude<RankedPatternWorkflowActionId, 'complete'>,
  enabled: boolean,
  highlighted: boolean,
  prerequisite: string | null,
): RankedPatternWorkflowActionState {
  return {
    actionId,
    label: ACTION_LABELS[actionId],
    enabled,
    highlighted,
    prerequisite: enabled ? null : prerequisite,
  };
}

export function getRankedPatternWorkflowNextAction(
  input: RankedPatternWorkflowNextActionInput,
): RankedPatternWorkflowNextActionState {
  const actionId: RankedPatternWorkflowActionId = !input.hasSelectedSource
    ? 'uploadWorkbook'
    : !input.workbookChecked
      ? 'checkWorkbook'
      : !input.hasDraft
        ? 'createDraft'
        : !input.importPreviewReady
          ? 'previewImport'
          : !input.importApplied
            ? 'importToDraft'
            : !input.publishReadinessPassed
              ? 'checkPublishReadiness'
              : !input.published
                ? 'publishAssessment'
                : 'complete';

  const descriptions: Readonly<Record<RankedPatternWorkflowActionId, string>> = {
    uploadWorkbook: 'Choose the completed .xlsx assessment workbook before running checks.',
    checkWorkbook: 'Read the workbook metadata and confirm there are no blocking workbook issues.',
    createDraft: 'Create or reuse the compatible draft version from the workbook metadata.',
    previewImport: 'Review the planned database changes before importing anything to the draft.',
    importToDraft: 'Write the checked workbook data to the draft version only.',
    checkPublishReadiness: 'Confirm the imported draft is ready before publishing it.',
    publishAssessment: 'Make the audited draft available for new assessment attempts.',
    complete: 'The assessment has been published from this workflow.',
  };

  const isCurrent = (candidate: RankedPatternWorkflowActionId) => actionId === candidate;

  return {
    actionId,
    label: actionId === 'complete' ? 'Published / complete' : ACTION_LABELS[actionId],
    description: descriptions[actionId],
    complete: actionId === 'complete',
    actions: {
      uploadWorkbook: actionState(
        'uploadWorkbook',
        !input.published,
        isCurrent('uploadWorkbook'),
        'This workflow is already complete.',
      ),
      checkWorkbook: actionState(
        'checkWorkbook',
        input.hasSelectedSource && !input.published,
        isCurrent('checkWorkbook'),
        'Upload a workbook or choose an existing package reference first.',
      ),
      createDraft: actionState(
        'createDraft',
        input.workbookChecked && !input.hasDraft && !input.published,
        isCurrent('createDraft'),
        input.hasSelectedSource
          ? 'Check the workbook successfully before creating a draft.'
          : 'Select and check a workbook before creating a draft.',
      ),
      previewImport: actionState(
        'previewImport',
        input.hasSelectedSource && input.workbookChecked && input.hasDraft && !input.published,
        isCurrent('previewImport'),
        !input.hasSelectedSource
          ? 'Select a workbook before previewing import.'
          : !input.workbookChecked
            ? 'Check the workbook successfully before previewing import.'
            : 'Create or select the compatible draft before previewing import.',
      ),
      importToDraft: actionState(
        'importToDraft',
        input.hasSelectedSource && input.workbookChecked && input.hasDraft && input.importPreviewReady && !input.published,
        isCurrent('importToDraft'),
        !input.hasDraft
          ? 'Create or select the compatible draft before importing.'
          : 'Preview import successfully before writing rows to the draft.',
      ),
      checkPublishReadiness: actionState(
        'checkPublishReadiness',
        input.importApplied && !input.published,
        isCurrent('checkPublishReadiness'),
        'Import to the draft before checking publish readiness.',
      ),
      publishAssessment: actionState(
        'publishAssessment',
        input.publishReadinessPassed && !input.published,
        isCurrent('publishAssessment'),
        'Check publish readiness and resolve all blocking findings before publishing.',
      ),
    },
  };
}
