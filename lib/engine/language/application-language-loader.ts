import type { Queryable } from '@/lib/engine/repository-sql';
import { getAssessmentVersionApplicationLanguage } from '@/lib/server/assessment-version-application-language';
import { getDbPool } from '@/lib/server/db';

export async function loadApplicationLanguage(versionId: string, db: Queryable = getDbPool()) {
  return getAssessmentVersionApplicationLanguage(db, versionId);
}
