import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

import { isDevAdminBypassEnabled } from '@/lib/server/dev-admin-bypass';
import { isDevUserAppBypassEnabled } from '@/lib/server/dev-user-app-bypass';

const isUserAppRoute = createRouteMatcher(['/app(.*)']);
const isAssessmentApiRoute = createRouteMatcher(['/api/assessments(.*)']);
const isAdminRoute = createRouteMatcher(['/admin(.*)']);

export default clerkMiddleware(async (auth, request) => {
  if (isUserAppRoute(request) && !isDevUserAppBypassEnabled()) {
    await auth.protect();
  }

  if (isAssessmentApiRoute(request) && !isDevUserAppBypassEnabled()) {
    await auth.protect();
  }

  if (
    isAdminRoute(request)
    && !isDevAdminBypassEnabled()
    && !isDevUserAppBypassEnabled()
  ) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/app/:path*',
    '/api/assessments/:path*',
    '/admin/:path*',
  ],
};
