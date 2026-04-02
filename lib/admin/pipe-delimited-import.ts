export type NonEmptyImportLine = {
  lineNumber: number;
  rawLine: string;
};

export function getNonEmptyImportLines(input: string): NonEmptyImportLine[] {
  const lines = input.split(/\r?\n/);
  const nonEmptyLines: NonEmptyImportLine[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? '';
    if (rawLine.trim() === '') {
      continue;
    }

    nonEmptyLines.push({
      lineNumber: index + 1,
      rawLine,
    });
  }

  return nonEmptyLines;
}

export function splitPipeColumns(rawLine: string): string[] {
  return rawLine.split('|').map((column) => column.trim());
}

export function sortImportErrors<T extends { lineNumber: number | null; code: string }>(
  errors: readonly T[],
): T[] {
  return [...errors].sort((left, right) => {
    const leftLineNumber = left.lineNumber ?? Number.NEGATIVE_INFINITY;
    const rightLineNumber = right.lineNumber ?? Number.NEGATIVE_INFINITY;
    return leftLineNumber - rightLineNumber || left.code.localeCompare(right.code);
  });
}
