'use client';

import { useAdminAssessmentAuthoring } from '@/components/admin/admin-assessment-authoring-context';
import { SingleDomainBuilderStage } from '@/components/admin/single-domain-builder-stage';

function useReadinessMetrics() {
  const assessment = useAdminAssessmentAuthoring();
  const domainCount = assessment.authoredDomains.length;
  const signalCount = assessment.availableSignals.length;
  const questionCount = assessment.authoredQuestions.length;
  const responseCount = assessment.weightingSummary.totalOptions;
  const mappingCount = assessment.weightingSummary.totalMappings;

  return {
    assessment,
    domainCount,
    signalCount,
    questionCount,
    responseCount,
    mappingCount,
  };
}

export function SingleDomainOverviewPageContent() {
  const { assessment, domainCount, signalCount } = useReadinessMetrics();

  return (
    <SingleDomainBuilderStage
      stepKey="overview"
      eyebrow="Overview"
      title="Overview"
      description="Assessment title, description, version context, and the single-domain builder contract."
      intro="This scaffold keeps the builder focused on one domain while preserving the rest of the assessment lifecycle: signals, questions, responses, weightings, language datasets, review, and publish."
      guardrails={[
        'This builder supports one domain only.',
        'Signal count is flexible; there is no fixed four-signal assumption.',
        'Questions, responses, weightings, and language remain first-class authoring stages.',
      ]}
      readiness={[
        { label: 'Domain count', value: String(domainCount), detail: 'Single-domain target.' },
        { label: 'Signal count', value: String(signalCount), detail: 'Flexible authored count.' },
        {
          label: 'Draft readiness',
          value: assessment.draftValidation.isPublishReady ? 'Ready' : 'In progress',
          detail: 'Current review state.',
        },
        {
          label: 'Published version',
          value: assessment.publishedVersion?.versionTag ?? 'None',
          detail: 'Live version reference.',
        },
      ]}
      nextIntent="Use the next steps to define one domain, then author the signals, questions, responses, mappings, and locked language families that will shape the finished report."
    />
  );
}

export function SingleDomainDomainPageContent() {
  const { domainCount, signalCount } = useReadinessMetrics();

  return (
    <SingleDomainBuilderStage
      stepKey="domain"
      eyebrow="Domain"
      title="Domain"
      description="Define the single domain that anchors the full report and every downstream authoring stage."
      intro="Single-domain assessments still follow the full builder flow. The difference is structural: exactly one domain drives the report, signal model, question coverage, and language payload."
      guardrails={[
        'Exactly one domain is allowed in this workflow.',
        'If more than one domain exists, this builder will require correction before review.',
        'The authored domain becomes the source container for the entire report narrative.',
      ]}
      readiness={[
        { label: 'Current domains', value: String(domainCount), detail: 'Target is exactly one.' },
        { label: 'Signals linked', value: String(signalCount), detail: 'Signals will attach to this domain.' },
        { label: 'Validation', value: domainCount === 1 ? 'On track' : 'Needs attention', detail: 'One domain only.' },
        { label: 'Report scope', value: 'Single domain', detail: 'Full report derived from one authored domain.' },
      ]}
      nextIntent="Keep the domain model simple now. Later authoring and import flows will attach questions, responses, and language datasets to this one domain."
    />
  );
}

export function SingleDomainSignalsPageContent() {
  const { domainCount, signalCount } = useReadinessMetrics();

  return (
    <SingleDomainBuilderStage
      stepKey="signals"
      eyebrow="Signals"
      title="Signals"
      description="Author the signal model for the single domain with a flexible signal count."
      intro="Signal count stays open-ended here. Pair expectations, report balance, and future import checks will derive from the actual signals you author instead of any fixed four-signal template."
      guardrails={[
        'Signal count is flexible; do not assume a fixed four-signal structure.',
        'Pair coverage derives from the signals you define.',
        'Future validation will check for gaps based on the authored signal set.',
      ]}
      readiness={[
        { label: 'Domain ready', value: domainCount === 1 ? 'Yes' : 'No', detail: 'One domain required first.' },
        { label: 'Signals authored', value: String(signalCount), detail: 'Flexible total.' },
        { label: 'Pair coverage', value: signalCount > 1 ? 'Derived later' : 'Pending', detail: 'Built from authored signals.' },
        { label: 'Import readiness', value: 'Scaffolded', detail: 'Signal import can attach here later.' },
      ]}
      nextIntent="This step will later support direct signal authoring and import. For now it establishes the structural expectation that signals are variable and downstream coverage depends on them."
    />
  );
}

export function SingleDomainQuestionsPageContent() {
  const { signalCount, questionCount } = useReadinessMetrics();

  return (
    <SingleDomainBuilderStage
      stepKey="questions"
      eyebrow="Questions"
      title="Questions"
      description="Prepare the question authoring/import stage for the single-domain assessment."
      intro="Question authoring stays inside the same assessment builder. This stage exists as a first-class step so future manual authoring or import can attach prompts and ordering without collapsing into a language-only editor."
      guardrails={[
        'Questions belong to the single authored domain.',
        'Prompt ordering and future import surfaces should live here, not in review or language.',
        'Question structure will feed response options and weightings in later steps.',
      ]}
      readiness={[
        { label: 'Signals ready', value: signalCount > 0 ? 'Yes' : 'No', detail: 'Signals should exist first.' },
        { label: 'Questions authored', value: String(questionCount), detail: 'Current draft count.' },
        { label: 'Import surface', value: 'Planned', detail: 'Question import belongs here.' },
        { label: 'Ordering model', value: 'Scaffolded', detail: 'Authoring flow reserved for prompt order.' },
      ]}
      nextIntent="Future work can plug full CRUD or import logic into this dedicated stage without changing the route shape or the single-domain contract."
    />
  );
}

export function SingleDomainResponsesPageContent() {
  const { questionCount, responseCount } = useReadinessMetrics();

  return (
    <SingleDomainBuilderStage
      stepKey="responses"
      eyebrow="Responses"
      title="Responses"
      description="Prepare response option authoring/import for each authored question."
      intro="Responses are treated separately from questions so option sets, labels, and import structure have an explicit home in the builder. This keeps the workflow aligned with the engine data model."
      guardrails={[
        'Responses stay tied to authored questions in the single-domain draft.',
        'Response count can vary by question.',
        'This stage is reserved for option authoring/import, not weighting logic.',
      ]}
      readiness={[
        { label: 'Questions ready', value: questionCount > 0 ? 'Yes' : 'No', detail: 'Questions should exist first.' },
        { label: 'Responses authored', value: String(responseCount), detail: 'Current option count.' },
        { label: 'Import surface', value: 'Planned', detail: 'Response import belongs here.' },
        { label: 'Weighting handoff', value: 'Next step', detail: 'Mappings are configured separately.' },
      ]}
      nextIntent="The scaffold reserves a clear point for option datasets and bulk response imports before moving into option-to-signal mappings."
    />
  );
}

export function SingleDomainWeightingsPageContent() {
  const { signalCount, responseCount, mappingCount } = useReadinessMetrics();

  return (
    <SingleDomainBuilderStage
      stepKey="weightings"
      eyebrow="Weightings"
      title="Weightings"
      description="Prepare option-to-signal mappings for the single-domain scoring model."
      intro="Weightings stay explicit and database-driven. This step exists to hold the future mapping surface between response options and the flexible signal set defined earlier in the builder."
      guardrails={[
        'Weightings connect response options to authored signals only.',
        'No UI-side scoring logic belongs here.',
        'Mapping coverage will be validated against actual options and actual signals.',
      ]}
      readiness={[
        { label: 'Signals authored', value: String(signalCount), detail: 'Current signal total.' },
        { label: 'Responses authored', value: String(responseCount), detail: 'Options available to map.' },
        { label: 'Mappings authored', value: String(mappingCount), detail: 'Current option-to-signal rows.' },
        { label: 'Coverage status', value: mappingCount > 0 ? 'Started' : 'Pending', detail: 'Full checks come later.' },
      ]}
      nextIntent="This builder step will later support authoring and import of deterministic option_signal_weights without changing the overall single-domain flow."
    />
  );
}

export function SingleDomainLanguagePageContent() {
  const { assessment, signalCount } = useReadinessMetrics();

  return (
    <SingleDomainBuilderStage
      stepKey="language"
      eyebrow="Language"
      title="Language"
      description="Reserve the single-domain language stage for the six locked dataset families."
      intro="This is a single-domain language stage inside the full builder, not a standalone language editor. It is reserved for the six locked dataset families: domain framing, hero pairs, signal chapters, balancing sections, pair summaries, and application statements."
      guardrails={[
        'Language remains one stage inside the full assessment builder.',
        'The six locked dataset families define the future single-domain language payload.',
        'Language authoring follows structure; it does not replace domain, signal, question, response, or weighting steps.',
      ]}
      readiness={[
        {
          label: 'Language status',
          value: assessment.stepCompletion.language === 'complete' ? 'Started' : 'Scaffolded',
          detail: 'Current draft language completion.',
        },
        { label: 'Signals available', value: String(signalCount), detail: 'Signal chapters depend on authored signals.' },
        { label: 'Dataset families', value: '6 locked', detail: 'Structured single-domain language datasets.' },
        { label: 'Import path', value: 'Planned', detail: 'Future dataset authoring/import lands here.' },
      ]}
      checklist={[
        { label: 'Domain framing', status: 'attention', detail: 'Future domain-level framing dataset.' },
        { label: 'Hero pairs', status: 'attention', detail: 'Future pair-level opening language dataset.' },
        { label: 'Signal chapters', status: 'attention', detail: 'Future per-signal interpretation dataset.' },
        { label: 'Balancing sections', status: 'attention', detail: 'Future balancing guidance dataset.' },
        { label: 'Pair summaries', status: 'attention', detail: 'Future pair summary dataset.' },
        { label: 'Application statements', status: 'attention', detail: 'Future application output dataset.' },
      ]}
      nextIntent="The route and copy are in place so later work can plug single-domain dataset authoring or import into this step without disturbing the rest of the builder."
    />
  );
}

export function SingleDomainReviewPageContent() {
  const { assessment, domainCount, signalCount, questionCount, responseCount, mappingCount } =
    useReadinessMetrics();

  return (
    <SingleDomainBuilderStage
      stepKey="review"
      eyebrow="Review"
      title="Review"
      description="Review readiness across the single-domain builder before publish checks and release."
      intro="This review scaffold keeps the future publish gate visible now. It surfaces the structural categories the draft will need: overview, domain, signals, questions, responses, weightings, and language."
      guardrails={[
        'Review does not replace the earlier authoring stages.',
        'One domain only remains a visible gate here.',
        'Publish readiness will stay deterministic and draft-driven.',
      ]}
      readiness={[
        { label: 'Blocking issues', value: String(assessment.draftValidation.blockingErrors.length), detail: 'Current validator count.' },
        { label: 'Warnings', value: String(assessment.draftValidation.warnings.length), detail: 'Current advisory count.' },
        { label: 'Publish ready', value: assessment.draftValidation.isPublishReady ? 'Yes' : 'No', detail: 'Current draft validator output.' },
        { label: 'Review scope', value: '7 categories', detail: 'Overview through language.' },
      ]}
      checklist={[
        { label: 'Overview', status: 'ready', detail: 'Assessment identity and version context are present.' },
        { label: 'Domain', status: domainCount === 1 ? 'ready' : 'attention', detail: domainCount === 1 ? 'Exactly one domain is in place.' : 'This builder supports one domain only.' },
        { label: 'Signals', status: signalCount > 0 ? 'ready' : 'attention', detail: signalCount > 0 ? `${signalCount} authored signal(s) currently shape the model.` : 'Signal count is flexible; author the signals you need.' },
        { label: 'Questions', status: questionCount > 0 ? 'ready' : 'attention', detail: questionCount > 0 ? `${questionCount} question(s) are present in the draft.` : 'Questions authoring/import will attach here later.' },
        { label: 'Responses', status: responseCount > 0 ? 'ready' : 'attention', detail: responseCount > 0 ? `${responseCount} response option(s) are currently authored.` : 'Responses authoring/import is still pending.' },
        { label: 'Weightings', status: mappingCount > 0 ? 'ready' : 'attention', detail: mappingCount > 0 ? `${mappingCount} option-to-signal mapping row(s) exist.` : 'Option-to-signal mappings are still pending.' },
        { label: 'Language', status: assessment.stepCompletion.language === 'complete' ? 'ready' : 'attention', detail: assessment.stepCompletion.language === 'complete' ? 'Language datasets have draft activity.' : 'Language stage references the six locked dataset families.' },
      ]}
      nextIntent="Full publish-readiness logic can grow here later, but the structural review categories and status layout are already present."
    />
  );
}
