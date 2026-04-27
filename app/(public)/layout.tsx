import { PublicSiteHeader } from '@/components/public/public-site-header';

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <PublicSiteHeader />
      <main>{children}</main>
    </>
  );
}
