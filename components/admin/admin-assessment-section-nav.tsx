'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { SurfaceCard, cn } from '@/components/shared/user-app-ui';

const sections = [
  { slug: 'overview', label: 'Overview' },
  { slug: 'domains', label: 'Domains' },
  { slug: 'signals', label: 'Signals' },
  { slug: 'questions', label: 'Questions' },
  { slug: 'responses', label: 'Responses' },
  { slug: 'weights', label: 'Weights' },
  { slug: 'review', label: 'Review & Publish' },
] as const;

export function AdminAssessmentSectionNav({
  assessmentKey,
}: Readonly<{
  assessmentKey: string;
}>) {
  const pathname = usePathname();

  return (
    <SurfaceCard className="p-2">
      <nav aria-label="Assessment authoring sections" className="flex flex-wrap gap-2">
        {sections.map((section) => {
          const href = `/admin/assessments/${assessmentKey}/${section.slug}`;
          const isActive = pathname === href;

          return (
            <Link
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'sonartra-focus-ring rounded-[0.95rem] px-4 py-2 text-sm font-medium transition',
                isActive
                  ? 'border border-[rgba(126,179,255,0.24)] bg-[rgba(126,179,255,0.12)] text-white'
                  : 'border border-transparent bg-transparent text-white/62 hover:border-white/8 hover:bg-white/[0.04] hover:text-white/84',
              )}
              href={href}
              key={section.slug}
            >
              {section.label}
            </Link>
          );
        })}
      </nav>
    </SurfaceCard>
  );
}
