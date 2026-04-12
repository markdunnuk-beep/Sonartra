import type { Queryable } from '@/lib/engine/repository-sql';

export function isMissingAssessmentModeColumnError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes('column av.mode does not exist') ||
    error.message.includes('column a.mode does not exist') ||
    error.message.includes('column dv.mode does not exist') ||
    error.message.includes('column "mode" does not exist') ||
    error.message.includes('WITHIN GROUP is required for ordered-set aggregate mode')
  );
}

export async function queryWithAssessmentModeFallback<T>(params: {
  db: Queryable;
  queryWithMode: string;
  queryWithoutMode: string;
  values?: readonly unknown[];
}): Promise<{ rows: T[] }> {
  try {
    return await params.db.query<T>(params.queryWithMode, params.values as unknown[]);
  } catch (error) {
    if (isMissingAssessmentModeColumnError(error)) {
      return params.db.query<T>(params.queryWithoutMode, params.values as unknown[]);
    }

    throw error;
  }
}
