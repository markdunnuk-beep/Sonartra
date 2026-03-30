export const DOMAIN_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const NON_ALPHANUMERIC_PATTERN = /[^a-z0-9]+/g;
const EDGE_HYPHEN_PATTERN = /^-+|-+$/g;
const DUPLICATE_HYPHEN_PATTERN = /-{2,}/g;

export type DomainKeyDraftState = {
  label: string;
  key: string;
  keyManuallyEdited: boolean;
};

export function slugifyDomainKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(NON_ALPHANUMERIC_PATTERN, '-')
    .replace(DUPLICATE_HYPHEN_PATTERN, '-')
    .replace(EDGE_HYPHEN_PATTERN, '');
}

export function isValidDomainKey(input: string): boolean {
  return DOMAIN_KEY_PATTERN.test(input);
}

export function createDomainKeyDraftState(params: {
  label: string;
  key: string;
  mode?: 'create' | 'edit';
}): DomainKeyDraftState {
  const mode = params.mode ?? 'create';
  const normalizedKey = params.key ? slugifyDomainKey(params.key) : '';

  if (mode === 'edit') {
    return {
      label: params.label,
      key: normalizedKey,
      keyManuallyEdited: true,
    };
  }

  const generatedKey = slugifyDomainKey(params.label);

  return {
    label: params.label,
    key: normalizedKey || generatedKey,
    keyManuallyEdited: normalizedKey ? normalizedKey !== generatedKey : false,
  };
}

export function syncDomainKeyFromLabel(
  state: DomainKeyDraftState,
  nextLabel: string,
): DomainKeyDraftState {
  if (state.keyManuallyEdited && state.key) {
    return {
      ...state,
      label: nextLabel,
    };
  }

  return {
    label: nextLabel,
    key: slugifyDomainKey(nextLabel),
    keyManuallyEdited: false,
  };
}

export function syncDomainKeyFromManualInput(
  state: DomainKeyDraftState,
  nextKey: string,
): DomainKeyDraftState {
  const normalizedKey = nextKey ? slugifyDomainKey(nextKey) : '';

  return {
    ...state,
    key: normalizedKey,
    keyManuallyEdited: normalizedKey ? true : false,
  };
}
