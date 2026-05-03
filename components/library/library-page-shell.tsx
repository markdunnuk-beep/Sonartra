import type { ReactNode } from 'react';

import { PublicPageCanvas } from '@/components/public/public-page-primitives';

export function LibraryPageShell({ children }: { children: ReactNode }) {
  return (
    <PublicPageCanvas>
      <div className="space-y-16 md:space-y-20">{children}</div>
    </PublicPageCanvas>
  );
}
