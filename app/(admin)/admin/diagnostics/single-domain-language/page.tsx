import { redirect } from 'next/navigation';

const DEFAULT_ASSESSMENT_KEY = 'sonartra-blueprint-leadership';

export default function SingleDomainLanguageDiagnosticIndexPage() {
  redirect(`/admin/diagnostics/single-domain-language/${DEFAULT_ASSESSMENT_KEY}`);
}
