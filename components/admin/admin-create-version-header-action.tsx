'use client';

import { usePathname } from 'next/navigation';

import { ButtonLink } from '@/components/shared/user-app-ui';

export function AdminCreateVersionHeaderAction({
  href,
}: Readonly<{
  href: string;
}>) {
  const pathname = usePathname();

  if (pathname.endsWith('/versions/new')) {
    return null;
  }

  return <ButtonLink href={href}>Create new version</ButtonLink>;
}
