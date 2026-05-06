export type DraftReadingMode = 'dark' | 'light';

export const DRAFT_READING_MODE_CHANGE_EVENT = 'sonartra-draft-reading-mode-change';
export const DRAFT_FOCUS_MODE_CHANGE_EVENT = 'sonartra-draft-focus-mode-change';

export type DraftFocusModeChangeEvent = CustomEvent<{ focusMode: boolean }>;
export type DraftReadingModeChangeEvent = CustomEvent<{ mode: DraftReadingMode }>;
