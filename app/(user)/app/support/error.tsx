'use client';

import { ButtonLink, PageFrame, SurfaceCard } from '@/components/shared/user-app-ui';

export default function SupportRouteError() {
  return (
    <PageFrame>
      <SurfaceCard
        className="rounded-[1.5rem] border border-[rgba(255,157,157,0.22)] bg-[rgba(255,157,157,0.07)] p-6 sm:p-8"
        role="alert"
      >
        <p className="sonartra-page-eyebrow">Support</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#FFE1E1]">
          Support case could not be loaded
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#FFD5D5]/78">
          Try refreshing this page or return to your support cases. No technical error details
          are shown here.
        </p>
        <div className="mt-6">
          <ButtonLink href="/app/support" variant="secondary">
            Back to support
          </ButtonLink>
        </div>
      </SurfaceCard>
    </PageFrame>
  );
}
