# Sonartra Voice Assessment Runtime Contract

## Purpose

This document defines the canonical runtime contract for Sonartra voice-delivered assessments.

Voice is an alternative assessment delivery mode only. It is not a separate assessment type, scoring system, or result system.

## Core Principle

Sonartra operates on one engine, one execution path, and one result contract.

The voice runtime must feed the existing Sonartra assessment engine. It must not bypass, duplicate, or reinterpret the canonical completion, scoring, normalization, result builder, or readiness pipeline.

## System Boundary

The voice layer is responsible for:

- session initiation
- spoken question delivery
- transcript capture
- speech-to-option resolution
- clarification and confirmation
- writing final selected option responses into canonical response persistence
- passing completion into the existing engine

The voice layer is not responsible for:

- scoring
- normalization
- narrative generation
- result payload construction
- readiness determination outside the existing engine rules

## Canonical Flow

The voice runtime must follow this end-to-end flow:

1. User starts a voice assessment.
2. System creates or resumes the standard assessment attempt.
3. System loads the published assessment definition.
4. System asks canonical questions in canonical order.
5. User answers by speech.
6. System captures the transcript.
7. System resolves the spoken answer into one `selected_option_id`.
8. System confirms low-confidence responses before finalising them.
9. System writes the final canonical response row.
10. On completion, the existing engine pipeline runs unchanged.
11. The existing result payload is persisted and evaluated for `READY` unchanged.

## Response Resolution Rules

Speech resolution must follow these rules:

- exactly one canonical option may be selected per question
- no invented options
- no AI scoring
- no fuzzy personality inference
- no transcript-as-score logic
- low-confidence answers must be confirmed before final persistence
- user correction must be allowed before final persistence

Resolution exists only to identify the intended authored option for the current question. Once the final option is confirmed, the persisted response must be equivalent to a standard assessment response.

## Transcript Rules

Transcript data is audit and supporting data only.

Transcript data is not a scoring input beyond helping resolve the selected option. It does not replace canonical answer persistence and it must not become an alternative answer source at completion time.

Expected transcript artifacts are:

- session transcript
- question-linked excerpts
- resolution and confidence trail

This contract defines those artifacts conceptually only. Schema design is intentionally out of scope for this task.

## Failure States

The voice runtime must treat the following as expected failure categories:

- disconnected session
- unresolved answer after retry limit
- invalid attempt or version state
- incomplete assessment
- provider or runtime failure

Failed or partial voice sessions must not be treated as `READY` results. Readiness remains governed by the existing engine and completion rules.

## Guardrails

The voice runtime must not:

- invent questions
- reorder questions outside canonical order
- invent answer choices
- introduce alternate scoring logic
- create separate voice-only result payloads
- use transcript-driven scoring
- bypass `option_signal_weights` through any hidden interpretation path

## MVP Scope

MVP voice assessment is:

- structured
- deterministic downstream
- non-adaptive
- limited to canonical authored questions
- intended to preserve comparability with the standard assessment runner

Voice delivery may vary the input modality, but it must not vary the underlying assessment definition, scoring path, or result contract.

## Acceptance Criteria

The voice runtime contract is valid only if:

- voice responses resolve into canonical `selected_option_id` values
- the existing engine pipeline remains the sole scoring and result path
- transcript remains secondary
- no alternative result format is introduced
