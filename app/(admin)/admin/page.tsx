import Link from 'next/link';

import {
  LabelPill,
  PageFrame,
  PageHeader,
  SectionHeader,
  SurfaceCard,
} from '@/components/shared/user-app-ui';
import { adminNavItems } from '@/components/admin/admin-shell-nav';

export default function AdminLandingPage() {
  return (
    <PageFrame>
      <PageHeader
        eyebrow="Admin Workspace"
        title="Assessment authoring control surface"
        description="Use the admin workspace to manage assessment structures, organisation access, and user administration without changing the single engine execution path."
      />

      <SurfaceCard accent className="overflow-hidden p-6 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <LabelPill className="bg-white/[0.08] text-white/82">Phase 5 foundation</LabelPill>
            <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-white lg:text-[2.5rem]">
              Admin routes are now isolated behind the current MVP access gate.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-white/68">
              This shell is intentionally stable and minimal so later authoring tasks can add
              module-specific functionality without revisiting layout, navigation, or route
              protection.
            </p>
          </div>
        </div>
      </SurfaceCard>

      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Admin Areas"
          title="Ready entry points"
          description="Each area is wired into the shared shell now, with room for Task 26 onward to add real workflow surfaces."
        />

        <div className="grid gap-4 xl:grid-cols-2">
          {adminNavItems.map((item) => (
            <Link href={item.href} key={item.key}>
              <SurfaceCard interactive className="h-full p-5">
                <div className="flex h-full flex-col gap-4">
                  <div className="space-y-2">
                    <p className="sonartra-page-eyebrow">{item.label}</p>
                    <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-white">
                      {item.label}
                    </h2>
                    <p className="max-w-xl text-sm leading-7 text-white/62">{item.description}</p>
                  </div>
                  <div className="mt-auto pt-2 text-sm font-medium text-white/76">
                    Open {item.label.toLowerCase()}
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
