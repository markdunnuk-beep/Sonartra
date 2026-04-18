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

  if (isAdminRoute(request) && !isDevAdminBypassEnabled()) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
