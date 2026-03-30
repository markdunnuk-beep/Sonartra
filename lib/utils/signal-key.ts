import { DOMAIN_KEY_PATTERN, slugifyDomainKey } from '@/lib/utils/domain-key';

export const SIGNAL_KEY_PATTERN = DOMAIN_KEY_PATTERN;

export type SignalKeyDraftState = {
  label: string;
  key: string;
  keyManuallyEdited: boolean;
};

export function slugifySignalKey(input: string): string {
  return slugifyDomainKey(input);
}

export function createSignalKeyDraftState(params: {
  label: string;
  key: string;
  mode?: 'create' | 'edit';
}): SignalKeyDraftState {
  const mode = params.mode ?? 'create';
  const existingKey = params.key.trim();
  const normalizedKey = existingKey ? slugifySignalKey(existingKey) : '';

  if (mode === 'edit') {
    return {
      label: params.label,
      key: existingKey,
      keyManuallyEdited: true,
    };
  }

  const generatedKey = slugifySignalKey(params.label);

  return {
    label: params.label,
    key: normalizedKey || generatedKey,
    keyManuallyEdited: normalizedKey ? normalizedKey !== generatedKey : false,
  };
}

export function syncSignalKeyFromName(
  state: SignalKeyDraftState,
  nextLabel: string,
): SignalKeyDraftState {
  if (state.keyManuallyEdited && state.key) {
    return {
      ...state,
      label: nextLabel,
    };
  }

  return {
    label: nextLabel,
    key: slugifySignalKey(nextLabel),
    keyManuallyEdited: false,
  };
}

export function syncSignalKeyFromManualInput(
  state: SignalKeyDraftState,
  nextKey: string,
): SignalKeyDraftState {
  const normalizedKey = nextKey ? slugifySignalKey(nextKey) : '';

  return {
    ...state,
    key: normalizedKey,
    keyManuallyEdited: normalizedKey ? true : false,
  };
}
