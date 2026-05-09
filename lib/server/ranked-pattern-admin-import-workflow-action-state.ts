import type {
  auditRankedPatternPublishReadinessForAdmin,
  RankedPatternAdminImportWorkflowResult,
} from '@/lib/server/ranked-pattern-admin-import-workflow';
import type {
  RankedPatternDraftVersionResult,
  RankedPatternPublishVersionResult,
} from '@/lib/server/ranked-pattern-admin-versioning';

export type RankedPatternAdminImportActionState = {
  readonly ok: boolean;
  readonly message: string | null;
  readonly formError: string | null;
  readonly fieldErrors: Readonly<Record<string, string>>;
  readonly result: RankedPatternAdminImportWorkflowResult | null;
};

export type RankedPatternPublishAuditActionState = {
  readonly ok: boolean;
  readonly message: string | null;
  readonly formError: string | null;
  readonly fieldErrors: Readonly<Record<string, string>>;
  readonly result: Awaited<ReturnType<typeof auditRankedPatternPublishReadinessForAdmin>> | null;
};

export type RankedPatternDraftVersionActionState = {
  readonly ok: boolean;
  readonly message: string | null;
  readonly formError: string | null;
  readonly formSuccess: string | null;
  readonly fieldErrors: Readonly<Record<string, string>>;
  readonly result: RankedPatternDraftVersionResult | null;
};

export type RankedPatternPublishVersionActionState = {
  readonly ok: boolean;
  readonly message: string | null;
  readonly formError: string | null;
  readonly formSuccess: string | null;
  readonly fieldErrors: Readonly<Record<string, string>>;
  readonly result: RankedPatternPublishVersionResult | null;
};

export const initialRankedPatternAdminImportActionState: RankedPatternAdminImportActionState = {
  ok: false,
  message: null,
  formError: null,
  fieldErrors: {},
  result: null,
};

export const initialRankedPatternPublishAuditActionState: RankedPatternPublishAuditActionState = {
  ok: false,
  message: null,
  formError: null,
  fieldErrors: {},
  result: null,
};

export const initialRankedPatternDraftVersionActionState: RankedPatternDraftVersionActionState = {
  ok: false,
  message: null,
  formError: null,
  formSuccess: null,
  fieldErrors: {},
  result: null,
};

export const initialRankedPatternPublishVersionActionState: RankedPatternPublishVersionActionState = {
  ok: false,
  message: null,
  formError: null,
  formSuccess: null,
  fieldErrors: {},
  result: null,
};
