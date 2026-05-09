import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  readRankedPatternWorkbookPackage,
  type RankedPatternWorkbookStorageAdapter,
  type RankedPatternWorkbookStorageReference,
} from '@/lib/server/ranked-pattern-workbook-storage';

export type RankedPatternPackageSourceKind = 'local_path' | 'package_reference' | 'storage_object';

export type RankedPatternPackageSourceDiagnostic = {
  readonly severity: 'error' | 'warning';
  readonly code: string;
  readonly message: string;
  readonly fieldKey?: 'sourcePath' | 'sourceName' | 'storageReference' | 'storageConfig';
};

export type RankedPatternPackageSourceInput = {
  readonly sourcePath?: string;
  readonly sourceName?: string;
  readonly storageReference?: RankedPatternWorkbookStorageReference;
  readonly storageAdapter?: RankedPatternWorkbookStorageAdapter;
};

export type RankedPatternResolvedPackageSource =
  | {
      readonly ok: true;
      readonly bytes: Buffer;
      readonly sourceName: string;
      readonly sourceHash: string;
      readonly sourceKind: RankedPatternPackageSourceKind;
      readonly originalReference: string;
      readonly safeDisplayName: string;
      readonly resolvedPath: string | null;
      readonly diagnostics: readonly RankedPatternPackageSourceDiagnostic[];
    }
  | {
      readonly ok: false;
      readonly bytes: null;
      readonly sourceName: string | null;
      readonly sourceHash: null;
      readonly sourceKind: RankedPatternPackageSourceKind | null;
      readonly originalReference: string;
      readonly safeDisplayName: string;
      readonly resolvedPath: string | null;
      readonly diagnostics: readonly RankedPatternPackageSourceDiagnostic[];
    };

const PACKAGE_ROOT = path.resolve(/* turbopackIgnore: true */ process.cwd(), 'content', 'assessment-packages');
const XLSX_EXTENSION = '.xlsx';
const PACKAGE_ROOT_RELATIVE = path.join('content', 'assessment-packages');

function diagnostic(
  code: string,
  message: string,
  fieldKey: RankedPatternPackageSourceDiagnostic['fieldKey'] = 'sourcePath',
): RankedPatternPackageSourceDiagnostic {
  return Object.freeze({
    severity: 'error',
    code,
    message,
    fieldKey,
  });
}

function blockedSource(params: {
  readonly originalReference: string;
  readonly safeDisplayName?: string;
  readonly sourceName?: string | null;
  readonly sourceKind?: RankedPatternPackageSourceKind | null;
  readonly resolvedPath?: string | null;
  readonly diagnostics: readonly RankedPatternPackageSourceDiagnostic[];
}): RankedPatternResolvedPackageSource {
  return Object.freeze({
    ok: false,
    bytes: null,
    sourceName: params.sourceName ?? null,
    sourceHash: null,
    sourceKind: params.sourceKind ?? null,
    originalReference: params.originalReference,
    safeDisplayName: params.safeDisplayName ?? safeDisplayReference(params.originalReference),
    resolvedPath: params.resolvedPath ?? null,
    diagnostics: Object.freeze([...params.diagnostics]),
  });
}

function safeDisplayReference(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return 'ranked-pattern package source';
  }

  return path.basename(normalized.replace(/\\/g, '/')) || 'ranked-pattern package source';
}

function hasPathSyntax(reference: string): boolean {
  return reference.includes('/') || reference.includes('\\') || path.extname(reference).length > 0;
}

function isInsidePackageRoot(resolvedPath: string): boolean {
  const relative = path.relative(PACKAGE_ROOT, resolvedPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function resolvePackageLocalPath(reference: string): string {
  const normalizedReference = reference.replace(/[\\/]/g, path.sep);
  if (path.isAbsolute(normalizedReference)) {
    return path.normalize(normalizedReference);
  }

  if (
    normalizedReference === PACKAGE_ROOT_RELATIVE ||
    normalizedReference.startsWith(`${PACKAGE_ROOT_RELATIVE}${path.sep}`)
  ) {
    return path.resolve(PACKAGE_ROOT, path.relative(PACKAGE_ROOT_RELATIVE, normalizedReference));
  }

  return path.resolve(PACKAGE_ROOT, normalizedReference);
}

function resolveLocalPath(reference: string): {
  readonly sourceKind: RankedPatternPackageSourceKind;
  readonly resolvedPath: string | null;
  readonly diagnostics: readonly RankedPatternPackageSourceDiagnostic[];
} {
  if (reference.includes('\0')) {
    return {
      sourceKind: 'local_path',
      resolvedPath: null,
      diagnostics: Object.freeze([
        diagnostic('UNSAFE_PACKAGE_SOURCE_REFERENCE', 'Workbook source references cannot contain null bytes.'),
      ]),
    };
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(reference)) {
    return {
      sourceKind: 'local_path',
      resolvedPath: null,
      diagnostics: Object.freeze([
        diagnostic('UNSUPPORTED_PACKAGE_SOURCE_REFERENCE', 'URL package sources are not supported by this resolver yet.'),
      ]),
    };
  }

  const resolvedPath = resolvePackageLocalPath(reference);
  if (!isInsidePackageRoot(resolvedPath)) {
    return {
      sourceKind: 'local_path',
      resolvedPath,
      diagnostics: Object.freeze([
        diagnostic(
          'UNSAFE_PACKAGE_SOURCE_REFERENCE',
          'Local workbook paths must stay under content/assessment-packages for admin import testing.',
        ),
      ]),
    };
  }

  return Object.freeze({
    sourceKind: 'local_path' as const,
    resolvedPath,
    diagnostics: Object.freeze([]),
  });
}

function resolvePackageReference(reference: string): {
  readonly sourceKind: RankedPatternPackageSourceKind;
  readonly resolvedPath: string | null;
  readonly diagnostics: readonly RankedPatternPackageSourceDiagnostic[];
} {
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(reference)) {
    return {
      sourceKind: 'package_reference',
      resolvedPath: null,
      diagnostics: Object.freeze([
        diagnostic(
          'UNSAFE_PACKAGE_SOURCE_REFERENCE',
          'Package references may only contain letters, numbers, and hyphens.',
        ),
      ]),
    };
  }

  const packageDirectory = path.resolve(PACKAGE_ROOT, reference);
  if (!isInsidePackageRoot(packageDirectory) || !existsSync(packageDirectory)) {
    return {
      sourceKind: 'package_reference',
      resolvedPath: null,
      diagnostics: Object.freeze([
        diagnostic('PACKAGE_REFERENCE_NOT_FOUND', 'No ranked-pattern package folder was found for that reference.'),
      ]),
    };
  }

  const workbookFiles = readdirSync(packageDirectory)
    .filter((entry) => entry.toLowerCase().endsWith(XLSX_EXTENSION))
    .map((entry) => path.join(packageDirectory, entry));

  if (workbookFiles.length === 0) {
    return {
      sourceKind: 'package_reference',
      resolvedPath: null,
      diagnostics: Object.freeze([
        diagnostic('PACKAGE_REFERENCE_WORKBOOK_NOT_FOUND', 'The package folder does not contain an .xlsx workbook.'),
      ]),
    };
  }

  if (workbookFiles.length > 1) {
    return {
      sourceKind: 'package_reference',
      resolvedPath: null,
      diagnostics: Object.freeze([
        diagnostic(
          'PACKAGE_REFERENCE_AMBIGUOUS',
          'The package folder contains multiple .xlsx workbooks. Use an explicit workbook path.',
        ),
      ]),
    };
  }

  return Object.freeze({
    sourceKind: 'package_reference' as const,
    resolvedPath: workbookFiles[0],
    diagnostics: Object.freeze([]),
  });
}

function buildSourceName(input: RankedPatternPackageSourceInput, resolvedPath: string, originalReference: string): string {
  const providedName = input.sourceName?.trim();
  if (providedName) {
    return providedName;
  }

  return path.basename(resolvedPath) || safeDisplayReference(originalReference);
}

async function resolveStorageObjectSource(
  input: RankedPatternPackageSourceInput,
): Promise<RankedPatternResolvedPackageSource> {
  const reference = input.storageReference;
  if (!reference) {
    return blockedSource({
      originalReference: '',
      sourceKind: 'storage_object',
      diagnostics: Object.freeze([
        diagnostic('STORAGE_REFERENCE_REQUIRED', 'Workbook storage reference is required.', 'storageReference'),
      ]),
    });
  }

  const originalReference = `${reference.bucket}/${reference.objectPath}`;
  const readResult = await readRankedPatternWorkbookPackage(reference, input.storageAdapter);
  if (!readResult.ok) {
    return blockedSource({
      originalReference,
      safeDisplayName: safeDisplayReference(reference.originalFileName),
      sourceName: input.sourceName ?? reference.originalFileName,
      sourceKind: 'storage_object',
      diagnostics: Object.freeze(
        readResult.diagnostics.map((item) =>
          Object.freeze({
            severity: item.severity,
            code: item.code,
            message: item.message,
            fieldKey: item.fieldKey === 'file' ? 'storageReference' : item.fieldKey,
          }),
        ),
      ),
    });
  }

  const sourceHash = createHash('sha256').update(readResult.bytes).digest('hex');
  const sourceName = input.sourceName?.trim() || reference.originalFileName;
  return Object.freeze({
    ok: true as const,
    bytes: readResult.bytes,
    sourceName,
    sourceHash,
    sourceKind: 'storage_object',
    originalReference,
    safeDisplayName: sourceName,
    resolvedPath: null,
    diagnostics: Object.freeze([]),
  });
}

export async function resolveRankedPatternPackageSource(
  input: RankedPatternPackageSourceInput,
): Promise<RankedPatternResolvedPackageSource> {
  if (input.storageReference) {
    return resolveStorageObjectSource(input);
  }

  const originalReference = input.sourcePath?.trim() ?? '';
  if (!originalReference) {
    return blockedSource({
      originalReference,
      diagnostics: Object.freeze([
        diagnostic('PACKAGE_SOURCE_REQUIRED', 'Workbook file path or package reference is required.'),
      ]),
    });
  }

  const sourceResolution = hasPathSyntax(originalReference)
    ? resolveLocalPath(originalReference)
    : resolvePackageReference(originalReference);

  if (sourceResolution.diagnostics.some((item) => item.severity === 'error') || !sourceResolution.resolvedPath) {
    return blockedSource({
      originalReference,
      safeDisplayName: safeDisplayReference(originalReference),
      sourceKind: sourceResolution.sourceKind,
      resolvedPath: sourceResolution.resolvedPath,
      diagnostics: sourceResolution.diagnostics,
    });
  }

  const resolvedPath = sourceResolution.resolvedPath;
  if (path.extname(resolvedPath).toLowerCase() !== XLSX_EXTENSION) {
    return blockedSource({
      originalReference,
      safeDisplayName: safeDisplayReference(originalReference),
      sourceKind: sourceResolution.sourceKind,
      resolvedPath,
      diagnostics: Object.freeze([
        diagnostic('UNSUPPORTED_PACKAGE_SOURCE_EXTENSION', 'Ranked-pattern package sources must be .xlsx workbooks.'),
      ]),
    });
  }

  try {
    const stats = statSync(resolvedPath);
    if (!stats.isFile()) {
      return blockedSource({
        originalReference,
        safeDisplayName: safeDisplayReference(originalReference),
        sourceKind: sourceResolution.sourceKind,
        resolvedPath,
        diagnostics: Object.freeze([
          diagnostic('PACKAGE_SOURCE_NOT_FILE', 'The workbook source must resolve to a file.'),
        ]),
      });
    }

    const bytes = readFileSync(resolvedPath);
    if (bytes.length === 0) {
      return blockedSource({
        originalReference,
        safeDisplayName: safeDisplayReference(originalReference),
        sourceName: buildSourceName(input, resolvedPath, originalReference),
        sourceKind: sourceResolution.sourceKind,
        resolvedPath,
        diagnostics: Object.freeze([
          diagnostic('PACKAGE_SOURCE_EMPTY', 'The workbook source file is empty.'),
        ]),
      });
    }

    const sourceName = buildSourceName(input, resolvedPath, originalReference);
    return Object.freeze({
      ok: true as const,
      bytes,
      sourceName,
      sourceHash: createHash('sha256').update(bytes).digest('hex'),
      sourceKind: sourceResolution.sourceKind,
      originalReference,
      safeDisplayName: sourceName,
      resolvedPath,
      diagnostics: Object.freeze([]),
    });
  } catch {
    return blockedSource({
      originalReference,
      safeDisplayName: safeDisplayReference(originalReference),
      sourceKind: sourceResolution.sourceKind,
      resolvedPath,
      diagnostics: Object.freeze([
        diagnostic('PACKAGE_SOURCE_UNREADABLE', 'The workbook source could not be read. Check the path and permissions.'),
      ]),
    });
  }
}
