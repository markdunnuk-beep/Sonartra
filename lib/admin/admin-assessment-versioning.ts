export const INITIAL_ASSESSMENT_VERSION_TAG = '1.0.0';

const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

export type AdminAssessmentVersionActionState = {
  formError: string | null;
  formSuccess: string | null;
  formWarnings: readonly string[];
};

export const initialAdminAssessmentVersionActionState: AdminAssessmentVersionActionState = {
  formError: null,
  formSuccess: null,
  formWarnings: Object.freeze([]),
};

export type ParsedAssessmentVersionTag = {
  major: number;
  minor: number;
  patch: number;
};

export function parseAssessmentVersionTag(
  value: string,
): ParsedAssessmentVersionTag | null {
  const match = VERSION_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);

  if ([major, minor, patch].some((part) => !Number.isInteger(part) || part < 0)) {
    return null;
  }

  return { major, minor, patch };
}

export function compareAssessmentVersionTagsDesc(left: string, right: string): number {
  const leftParsed = parseAssessmentVersionTag(left);
  const rightParsed = parseAssessmentVersionTag(right);

  if (leftParsed && rightParsed) {
    if (rightParsed.major !== leftParsed.major) {
      return rightParsed.major - leftParsed.major;
    }

    if (rightParsed.minor !== leftParsed.minor) {
      return rightParsed.minor - leftParsed.minor;
    }

    if (rightParsed.patch !== leftParsed.patch) {
      return rightParsed.patch - leftParsed.patch;
    }
  }

  return right.localeCompare(left);
}

export function incrementAssessmentVersionTag(value: string): string {
  const parsed = parseAssessmentVersionTag(value);
  if (!parsed) {
    throw new Error('INVALID_ASSESSMENT_VERSION_TAG');
  }

  return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
}

export function getNextAssessmentVersionTag(values: readonly string[]): string {
  if (values.length === 0) {
    return INITIAL_ASSESSMENT_VERSION_TAG;
  }

  const invalid = values.find((value) => parseAssessmentVersionTag(value) === null);
  if (invalid) {
    throw new Error('INVALID_ASSESSMENT_VERSION_TAG');
  }

  const latest = [...values].sort(compareAssessmentVersionTagsDesc)[0] ?? INITIAL_ASSESSMENT_VERSION_TAG;
  return incrementAssessmentVersionTag(latest);
}

