import type { MetadataRoute } from 'next';

import { getPublicUrl } from '@/lib/public/public-routes';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/app', '/sign-in', '/sign-up'],
    },
    sitemap: getPublicUrl('/sitemap.xml'),
  };
}
