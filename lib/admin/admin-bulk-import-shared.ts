export function countNonEmptyBulkImportRows(rawInput: string): number {
  return rawInput
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .length;
}
