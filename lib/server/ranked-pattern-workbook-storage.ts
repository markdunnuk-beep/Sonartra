import { createHash } from 'node:crypto';
import path from 'node:path';

export const DEFAULT_RANKED_PATTERN_WORKBOOK_STORAGE_BUCKET = 'assessment-import-packages';
export const DEFAULT_RANKED_PATTERN_WORKBOOK_MAX_BYTES = 10 * 1024 * 1024;

export type RankedPatternWorkbookStorageDiagnostic = {
  readonly severity: 'error' | 'warning';
  readonly code: string;
  readonly message: string;
  readonly fieldKey?: 'file' | 'storageReference' | 'storageConfig';
};

export type RankedPatternWorkbookStorageReference = {
  readonly sourceKind: 'storage_object';
  readonly bucket: string;
  readonly objectPath: string;
  readonly originalFileName: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly sourceHash: string;
};

export type RankedPatternWorkbookUploadInput = {
  readonly bytes?: Buffer | Uint8Array | ArrayBuffer | null;
  readonly originalFileName?: string | null;
  readonly contentType?: string | null;
  readonly maxBytes?: number;
  readonly bucket?: string;
  readonly uploadedAt?: Date;
  readonly storageAdapter?: RankedPatternWorkbookStorageAdapter | null;
};

export type RankedPatternWorkbookUploadResult =
  | {
      readonly ok: true;
      readonly storageReference: RankedPatternWorkbookStorageReference;
      readonly diagnostics: readonly RankedPatternWorkbookStorageDiagnostic[];
    }
  | {
      readonly ok: false;
      readonly storageReference: null;
      readonly diagnostics: readonly RankedPatternWorkbookStorageDiagnostic[];
    };

export type RankedPatternWorkbookReadResult =
  | {
      readonly ok: true;
      readonly bytes: Buffer;
      readonly diagnostics: readonly RankedPatternWorkbookStorageDiagnostic[];
    }
  | {
      readonly ok: false;
      readonly bytes: null;
      readonly diagnostics: readonly RankedPatternWorkbookStorageDiagnostic[];
    };

export type RankedPatternWorkbookStorageAdapter = {
  readonly uploadObject: (params: {
    readonly bucket: string;
    readonly objectPath: string;
    readonly bytes: Buffer;
    readonly contentType: string;
  }) => Promise<void>;
  readonly readObject: (params: {
    readonly bucket: string;
    readonly objectPath: string;
  }) => Promise<Buffer>;
  readonly deleteObject?: (params: {
    readonly bucket: string;
    readonly objectPath: string;
  }) => Promise<void>;
};

type SupabaseStorageConfig = {
  readonly supabaseUrl: string;
  readonly serviceRoleKey: string;
};

function diagnostic(
  code: string,
  message: string,
  fieldKey: RankedPatternWorkbookStorageDiagnostic['fieldKey'] = 'file',
): RankedPatternWorkbookStorageDiagnostic {
  return Object.freeze({
    severity: 'error',
    code,
    message,
    fieldKey,
  });
}

function toBuffer(bytes: Buffer | Uint8Array | ArrayBuffer): Buffer {
  if (Buffer.isBuffer(bytes)) {
    return bytes;
  }

  if (bytes instanceof ArrayBuffer) {
    return Buffer.from(bytes);
  }

  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function safeFileName(fileName: string): string {
  const baseName = path.basename(fileName.replace(/\\/g, '/')).trim();
  const withoutExtension = baseName.replace(/\.xlsx$/i, '');
  const safeBase = withoutExtension
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .toLowerCase();

  return `${safeBase || 'ranked-pattern-workbook'}.xlsx`;
}

function timestampPathPart(uploadedAt: Date): string {
  return uploadedAt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function buildRankedPatternWorkbookStorageObjectPath(params: {
  readonly originalFileName: string;
  readonly sourceHash: string;
  readonly uploadedAt?: Date;
}): string {
  const uploadedAt = params.uploadedAt ?? new Date();
  const yyyy = String(uploadedAt.getUTCFullYear());
  const mm = String(uploadedAt.getUTCMonth() + 1).padStart(2, '0');
  const hashPrefix = params.sourceHash.slice(0, 12);
  return `${yyyy}/${mm}/${timestampPathPart(uploadedAt)}-${hashPrefix}-${safeFileName(params.originalFileName)}`;
}

function validateStorageReference(reference: RankedPatternWorkbookStorageReference): readonly RankedPatternWorkbookStorageDiagnostic[] {
  const diagnostics: RankedPatternWorkbookStorageDiagnostic[] = [];
  if (reference.sourceKind !== 'storage_object') {
    diagnostics.push(diagnostic('UNSUPPORTED_STORAGE_REFERENCE_KIND', 'Workbook storage references must use storage_object.', 'storageReference'));
  }
  if (!reference.bucket.trim()) {
    diagnostics.push(diagnostic('STORAGE_BUCKET_REQUIRED', 'Workbook storage bucket is required.', 'storageReference'));
  }
  if (!reference.objectPath.trim() || reference.objectPath.includes('\0') || reference.objectPath.startsWith('/')) {
    diagnostics.push(diagnostic('STORAGE_OBJECT_PATH_REQUIRED', 'Workbook storage object path is required.', 'storageReference'));
  }
  if (reference.objectPath.includes('..')) {
    diagnostics.push(diagnostic('UNSAFE_STORAGE_OBJECT_PATH', 'Workbook storage object paths cannot contain traversal segments.', 'storageReference'));
  }
  if (path.extname(reference.originalFileName).toLowerCase() !== '.xlsx') {
    diagnostics.push(diagnostic('UNSUPPORTED_WORKBOOK_EXTENSION', 'Ranked-pattern workbook uploads must be .xlsx files.'));
  }
  if (reference.sizeBytes <= 0) {
    diagnostics.push(diagnostic('WORKBOOK_FILE_EMPTY', 'Ranked-pattern workbook uploads cannot be empty.'));
  }
  if (!/^[a-f0-9]{64}$/i.test(reference.sourceHash)) {
    diagnostics.push(diagnostic('WORKBOOK_SOURCE_HASH_INVALID', 'Workbook storage references require a SHA-256 source hash.', 'storageReference'));
  }

  return Object.freeze(diagnostics);
}

function getSupabaseStorageConfig(env: NodeJS.ProcessEnv = process.env): SupabaseStorageConfig | null {
  const supabaseUrl = (env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const serviceRoleKey = (env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return Object.freeze({
    supabaseUrl: supabaseUrl.replace(/\/+$/, ''),
    serviceRoleKey,
  });
}

function createSupabaseStorageAdapter(config: SupabaseStorageConfig): RankedPatternWorkbookStorageAdapter {
  async function request(params: {
    readonly method: 'GET' | 'PUT' | 'DELETE';
    readonly bucket: string;
    readonly objectPath: string;
    readonly bytes?: Buffer;
    readonly contentType?: string;
  }): Promise<Response> {
    const objectUrl = `${config.supabaseUrl}/storage/v1/object/${encodeURIComponent(params.bucket)}/${params.objectPath
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/')}`;
    const body = params.bytes ? new Uint8Array(params.bytes) : undefined;
    return fetch(objectUrl, {
      method: params.method,
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        ...(params.contentType ? { 'Content-Type': params.contentType } : {}),
        ...(params.method === 'PUT' ? { 'x-upsert': 'false' } : {}),
      },
      body,
    });
  }

  return Object.freeze({
    async uploadObject(params) {
      const response = await request({ method: 'PUT', ...params });
      if (!response.ok) {
        throw new Error('SUPABASE_STORAGE_UPLOAD_FAILED');
      }
    },
    async readObject(params) {
      const response = await request({ method: 'GET', ...params });
      if (!response.ok) {
        throw new Error('SUPABASE_STORAGE_READ_FAILED');
      }

      return Buffer.from(await response.arrayBuffer());
    },
    async deleteObject(params) {
      const response = await request({ method: 'DELETE', ...params });
      if (!response.ok) {
        throw new Error('SUPABASE_STORAGE_DELETE_FAILED');
      }
    },
  });
}

export function getRankedPatternWorkbookStorageAdapter(
  env: NodeJS.ProcessEnv = process.env,
): RankedPatternWorkbookStorageAdapter | null {
  const config = getSupabaseStorageConfig(env);
  return config ? createSupabaseStorageAdapter(config) : null;
}

export async function uploadRankedPatternWorkbookPackage(
  input: RankedPatternWorkbookUploadInput,
): Promise<RankedPatternWorkbookUploadResult> {
  if (!input.bytes) {
    return Object.freeze({
      ok: false as const,
      storageReference: null,
      diagnostics: Object.freeze([diagnostic('WORKBOOK_FILE_REQUIRED', 'Choose a ranked-pattern workbook file to upload.')]),
    });
  }

  const originalFileName = input.originalFileName?.trim() ?? '';
  if (!originalFileName || path.extname(originalFileName).toLowerCase() !== '.xlsx') {
    return Object.freeze({
      ok: false as const,
      storageReference: null,
      diagnostics: Object.freeze([diagnostic('UNSUPPORTED_WORKBOOK_EXTENSION', 'Ranked-pattern workbook uploads must be .xlsx files.')]),
    });
  }

  const bytes = toBuffer(input.bytes);
  if (bytes.length === 0) {
    return Object.freeze({
      ok: false as const,
      storageReference: null,
      diagnostics: Object.freeze([diagnostic('WORKBOOK_FILE_EMPTY', 'Ranked-pattern workbook uploads cannot be empty.')]),
    });
  }

  const maxBytes = input.maxBytes ?? Number(process.env.RANKED_PATTERN_WORKBOOK_MAX_BYTES ?? DEFAULT_RANKED_PATTERN_WORKBOOK_MAX_BYTES);
  if (bytes.length > maxBytes) {
    return Object.freeze({
      ok: false as const,
      storageReference: null,
      diagnostics: Object.freeze([diagnostic('WORKBOOK_FILE_TOO_LARGE', 'Ranked-pattern workbook upload exceeds the configured size limit.')]),
    });
  }

  const storageAdapter =
    input.storageAdapter === undefined ? getRankedPatternWorkbookStorageAdapter() : input.storageAdapter;
  if (!storageAdapter) {
    return Object.freeze({
      ok: false as const,
      storageReference: null,
      diagnostics: Object.freeze([
        diagnostic(
          'WORKBOOK_STORAGE_CONFIG_MISSING',
          'Private workbook storage is not configured for this environment.',
          'storageConfig',
        ),
      ]),
    });
  }

  const sourceHash = createHash('sha256').update(bytes).digest('hex');
  const bucket = input.bucket?.trim() || process.env.RANKED_PATTERN_WORKBOOK_STORAGE_BUCKET || DEFAULT_RANKED_PATTERN_WORKBOOK_STORAGE_BUCKET;
  const objectPath = buildRankedPatternWorkbookStorageObjectPath({
    originalFileName,
    sourceHash,
    uploadedAt: input.uploadedAt,
  });
  const contentType = input.contentType?.trim() || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  try {
    await storageAdapter.uploadObject({ bucket, objectPath, bytes, contentType });
  } catch {
    return Object.freeze({
      ok: false as const,
      storageReference: null,
      diagnostics: Object.freeze([
        diagnostic('WORKBOOK_STORAGE_UPLOAD_FAILED', 'Workbook upload could not be stored. Try again or contact an administrator.'),
      ]),
    });
  }

  return Object.freeze({
    ok: true as const,
    storageReference: Object.freeze({
      sourceKind: 'storage_object' as const,
      bucket,
      objectPath,
      originalFileName,
      contentType,
      sizeBytes: bytes.length,
      sourceHash,
    }),
    diagnostics: Object.freeze([]),
  });
}

export async function readRankedPatternWorkbookPackage(
  storageReference: RankedPatternWorkbookStorageReference,
  storageAdapter: RankedPatternWorkbookStorageAdapter | null = getRankedPatternWorkbookStorageAdapter(),
): Promise<RankedPatternWorkbookReadResult> {
  const referenceDiagnostics = validateStorageReference(storageReference);
  if (referenceDiagnostics.length > 0) {
    return Object.freeze({
      ok: false as const,
      bytes: null,
      diagnostics: referenceDiagnostics,
    });
  }

  if (!storageAdapter) {
    return Object.freeze({
      ok: false as const,
      bytes: null,
      diagnostics: Object.freeze([
        diagnostic(
          'WORKBOOK_STORAGE_CONFIG_MISSING',
          'Private workbook storage is not configured for this environment.',
          'storageConfig',
        ),
      ]),
    });
  }

  try {
    const bytes = await storageAdapter.readObject({
      bucket: storageReference.bucket,
      objectPath: storageReference.objectPath,
    });
    if (bytes.length === 0) {
      return Object.freeze({
        ok: false as const,
        bytes: null,
        diagnostics: Object.freeze([diagnostic('WORKBOOK_FILE_EMPTY', 'Ranked-pattern workbook storage object is empty.')]),
      });
    }

    const actualHash = createHash('sha256').update(bytes).digest('hex');
    if (actualHash !== storageReference.sourceHash) {
      return Object.freeze({
        ok: false as const,
        bytes: null,
        diagnostics: Object.freeze([
          diagnostic('WORKBOOK_SOURCE_HASH_MISMATCH', 'Stored workbook bytes do not match the expected source hash.', 'storageReference'),
        ]),
      });
    }

    return Object.freeze({
      ok: true as const,
      bytes,
      diagnostics: Object.freeze([]),
    });
  } catch {
    return Object.freeze({
      ok: false as const,
      bytes: null,
      diagnostics: Object.freeze([
        diagnostic('WORKBOOK_STORAGE_READ_FAILED', 'Workbook storage object could not be read. Check the reference and storage configuration.', 'storageReference'),
      ]),
    });
  }
}

export async function deleteRankedPatternWorkbookPackage(
  storageReference: RankedPatternWorkbookStorageReference,
  storageAdapter: RankedPatternWorkbookStorageAdapter | null = getRankedPatternWorkbookStorageAdapter(),
): Promise<readonly RankedPatternWorkbookStorageDiagnostic[]> {
  const referenceDiagnostics = validateStorageReference(storageReference);
  if (referenceDiagnostics.length > 0) {
    return referenceDiagnostics;
  }

  if (!storageAdapter?.deleteObject) {
    return Object.freeze([
      diagnostic('WORKBOOK_STORAGE_DELETE_UNAVAILABLE', 'Workbook storage cleanup is not configured for this environment.', 'storageConfig'),
    ]);
  }

  try {
    await storageAdapter.deleteObject({
      bucket: storageReference.bucket,
      objectPath: storageReference.objectPath,
    });
    return Object.freeze([]);
  } catch {
    return Object.freeze([
      diagnostic('WORKBOOK_STORAGE_DELETE_FAILED', 'Workbook storage object could not be deleted.', 'storageReference'),
    ]);
  }
}
