import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  buildLeadershipReportFirstImportArtifact,
  leadershipReportFirstImportArtifactPath,
  leadershipReportFirstImportArtifactRelativePath,
} from '@/lib/server/leadership-report-first-package';

export async function writeLeadershipReportFirstImportArtifact(): Promise<string> {
  const artifact = await buildLeadershipReportFirstImportArtifact();
  await mkdir(path.dirname(leadershipReportFirstImportArtifactPath), { recursive: true });
  await writeFile(leadershipReportFirstImportArtifactPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  return leadershipReportFirstImportArtifactRelativePath;
}

async function main() {
  const outputPath = await writeLeadershipReportFirstImportArtifact();
  console.log(`Leadership report-first import artifact written: ${outputPath}`);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';

if (import.meta.url === invokedPath) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
