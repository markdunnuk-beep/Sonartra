import type { AdminAuthoringFormValues } from '@/lib/admin/admin-domain-signal-authoring';
import { slugifyDomainKey } from '@/lib/utils/domain-key';
import { slugifySignalKey } from '@/lib/utils/signal-key';

export const SINGLE_DOMAIN_UNSAVED_CHANGES_MESSAGE =
  'You have unsaved changes in the single-domain builder. Leave without saving?';

export type SingleDomainAuthoringActionStateLike = {
  formError: string | null;
  fieldErrors: Record<string, string | undefined>;
  values: Record<string, string>;
};

export function buildSingleDomainCreateDomainValues(
  values: AdminAuthoringFormValues,
): AdminAuthoringFormValues {
  return {
    ...values,
    key: slugifyDomainKey(values.label),
  };
}

export function buildSingleDomainCreateSignalValues(
  values: AdminAuthoringFormValues,
): AdminAuthoringFormValues {
  return {
    ...values,
    key: slugifySignalKey(values.label),
  };
}

export function buildSingleDomainLockedDomainValues(
  values: AdminAuthoringFormValues,
  canonicalKey: string,
): AdminAuthoringFormValues {
  return {
    ...values,
    key: slugifyDomainKey(canonicalKey),
  };
}

export function buildSingleDomainLockedSignalValues(
  values: AdminAuthoringFormValues,
  canonicalKey: string,
): AdminAuthoringFormValues {
  return {
    ...values,
    key: slugifySignalKey(canonicalKey),
  };
}

export function serializeSingleDomainFormSnapshot(entries: readonly [string, string][]): string {
  return [...entries]
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

export function isSingleDomainActionStateSuccess(
  state: SingleDomainAuthoringActionStateLike,
): boolean {
  return state.formError === null &&
    Object.values(state.fieldErrors).every((value) => !value) &&
    Object.values(state.values).every((value) => value === '');
}

export function shouldBlockSingleDomainNavigation(params: {
  currentHref: string;
  nextHref: string | null;
  hasDirtyChanges: boolean;
  isModifiedEvent?: boolean;
  isPrimaryNavigation?: boolean;
  target?: string | null;
  download?: boolean;
}): boolean {
  if (!params.hasDirtyChanges || !params.nextHref) {
    return false;
  }

  if (params.isModifiedEvent || params.isPrimaryNavigation === false || params.download) {
    return false;
  }

  if (params.target && params.target !== '_self') {
    return false;
  }

  try {
    const current = new URL(params.currentHref);
    const next = new URL(params.nextHref, current);

    return current.href !== next.href;
  } catch {
    return false;
  }
}
