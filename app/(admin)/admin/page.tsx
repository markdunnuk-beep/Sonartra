import Link from 'next/link';

import {
  LabelPill,
  PageFrame,
  PageHeader,
  SectionHeader,
  SurfaceCard,
} from '@/components/shared/user-app-ui';
import { adminNavItems } from '@/components/admin/admin-shell-nav';

const adminDashboardCopy = {
  dashboard: {
    description: 'Review workspace status and key admin entry points.',
    action: 'Review workspace',
  },
  assessments: {
    description: 'Manage assessment definitions, versions, language, and publish readiness.',
    action: 'Manage assessments',
  },
  organisations: {
    description: 'Manage organisation records and assignment controls.',
    action: 'Manage organisations',
  },
  users: {
    description: 'Review users, roles, access, and workspace assignment.',
    action: 'Review users',
  },
} as const;

export default function AdminLandingPage() {
  return (
    <PageFrame>
      <PageHeader
        eyebrow="Admin Workspace"
        title="Admin workspace"
        description="Manage assessments, users, organisations, and publishing readiness from one operational workspace."
      />

      <SurfaceCard accent className="overflow-hidden p-5 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <LabelPill className="border-[#32D6B0]/20 bg-[#32D6B0]/[0.07] text-[rgba(213,255,245,0.86)]">
                Operations
              </LabelPill>
              <LabelPill className="border-white/10 bg-white/[0.04] text-white/66">
                Admin control
              </LabelPill>
            </div>
            <div className="space-y-3">
              <h2 className="text-[2rem] font-semibold leading-[1.02] tracking-normal text-white sm:text-[2.35rem] lg:text-[2.75rem]">
                Keep the Sonartra operating model clear.
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-white/68">
                Use this workspace to maintain assessment structure, access, and readiness without
                leaving the operational context.
              </p>
            </div>
          </div>

          <div className="rounded-[1rem] border border-white/8 bg-black/10 px-4 py-3 text-sm leading-6 text-white/58 lg:max-w-xs">
            Publishing, authoring, and access controls stay separated so each admin task can be
            reviewed with the right level of detail.
          </div>
        </div>
      </SurfaceCard>

      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Admin Areas"
          title="Choose an admin area"
          description="Start with the area you need to review, author, or maintain."
        />

        <div className="grid gap-4 xl:grid-cols-2">
          {adminNavItems.map((item, index) => (
            <Link href={item.href} key={item.key}>
              <SurfaceCard interactive className="h-full p-5 sm:p-6">
                <div className="flex h-full flex-col gap-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="sonartra-page-eyebrow">Area {index + 1}</p>
                      <h2 className="text-[1.45rem] font-semibold tracking-normal text-white">
                        {item.label}
                      </h2>
                    </div>
                    <span className="mt-1 h-2 w-2 rounded-full bg-[#32D6B0]/70" aria-hidden="true" />
                  </div>

                  <p className="max-w-xl text-sm leading-7 text-white/62">
                    {adminDashboardCopy[item.key].description}
                  </p>

                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/8 pt-4">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/38">
                      Entry point
                    </span>
                    <span className="text-sm font-medium text-white/76">
                      {adminDashboardCopy[item.key].action}
                    </span>
                  </div>
                </div>
              </SurfaceCard>
            </Link>
          ))}
        </div>
      </section>
    </PageFrame>
  );
}
