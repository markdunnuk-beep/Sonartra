import { runSingleDomainLanguageDiagnostic } from '@/lib/server/single-domain-language-diagnostic';

const ASSESSMENT_KEY = process.argv[2] ?? 'sonartra-blueprint-leadership';

async function main() {
  const payload = await runSingleDomainLanguageDiagnostic(ASSESSMENT_KEY);
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
