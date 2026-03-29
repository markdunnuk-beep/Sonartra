const NON_ALPHANUMERIC_PATTERN = /[^a-z0-9]+/g;
const EDGE_UNDERSCORE_PATTERN = /^_+|_+$/g;
const DUPLICATE_UNDERSCORE_PATTERN = /_{2,}/g;

function padNumericIndex(index: number): string {
  return String(index).padStart(2, '0');
}

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(NON_ALPHANUMERIC_PATTERN, '_')
    .replace(DUPLICATE_UNDERSCORE_PATTERN, '_')
    .replace(EDGE_UNDERSCORE_PATTERN, '');
}

export function generateDomainKey(name: string): string {
  return slugify(name);
}

export function generateSignalKey(domainKey: string, name: string): string {
  const normalizedDomainKey = slugify(domainKey);
  const normalizedName = slugify(name);

  return [normalizedDomainKey, normalizedName].filter(Boolean).join('_');
}

export function generateQuestionKey(index: number): string {
  return `q${padNumericIndex(index)}`;
}

export function generateOptionKey(questionIndex: number, letter: string): string {
  return `${generateQuestionKey(questionIndex)}_${slugify(letter)}`;
}
