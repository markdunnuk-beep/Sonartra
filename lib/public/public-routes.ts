import type { MetadataRoute } from 'next';

export const SONARTRA_SITE_ORIGIN = 'https://www.sonartra.com';
export const PUBLIC_STATIC_LAST_MODIFIED = '2026-05-03';

export type PublicSitemapRoute = {
  path: string;
  label: string;
  priority: number;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;
  lastModified?: string;
  includeInSitemap: boolean;
};

export const PUBLIC_SITEMAP_ROUTES = [
  {
    path: '/',
    label: 'Home',
    priority: 1,
    changeFrequency: 'weekly',
    lastModified: PUBLIC_STATIC_LAST_MODIFIED,
    includeInSitemap: true,
  },
  {
    path: '/platform',
    label: 'Platform',
    priority: 0.8,
    changeFrequency: 'monthly',
    lastModified: PUBLIC_STATIC_LAST_MODIFIED,
    includeInSitemap: true,
  },
  {
    path: '/sonartra-signals',
    label: 'Sonartra Signals',
    priority: 0.8,
    changeFrequency: 'monthly',
    lastModified: PUBLIC_STATIC_LAST_MODIFIED,
    includeInSitemap: true,
  },
  {
    path: '/signals',
    label: 'Signals',
    priority: 0.7,
    changeFrequency: 'monthly',
    lastModified: PUBLIC_STATIC_LAST_MODIFIED,
    includeInSitemap: true,
  },
  {
    path: '/library',
    label: 'Library',
    priority: 0.8,
    changeFrequency: 'weekly',
    lastModified: PUBLIC_STATIC_LAST_MODIFIED,
    includeInSitemap: true,
  },
  {
    path: '/pricing',
    label: 'Pricing',
    priority: 0.6,
    changeFrequency: 'monthly',
    lastModified: PUBLIC_STATIC_LAST_MODIFIED,
    includeInSitemap: true,
  },
  {
    path: '/contact',
    label: 'Contact',
    priority: 0.6,
    changeFrequency: 'monthly',
    lastModified: PUBLIC_STATIC_LAST_MODIFIED,
    includeInSitemap: true,
  },
] as const satisfies readonly PublicSitemapRoute[];

export function getPublicUrl(path: string): string {
  return new URL(path, SONARTRA_SITE_ORIGIN).toString();
}

export function getIndexablePublicRoutes(): readonly PublicSitemapRoute[] {
  return PUBLIC_SITEMAP_ROUTES.filter((route) => route.includeInSitemap);
}
