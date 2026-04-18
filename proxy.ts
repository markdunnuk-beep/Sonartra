import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

import { isDevAdminBypassEnabled } from '@/lib/server/dev-admin-bypass';

const isUserAppRoute = createRouteMatcher(['/app(.*)']);
const isAdminRoute = createRouteMatcher(['/admin(.*)']);

export default clerkMiddleware(async (auth, request) => {
  if (isUserAppRoute(request)) {
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
