import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sonartra MVP',
  description: 'Engine-first assessment platform foundation',
};

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/platform', label: 'Platform' },
  { href: '/signals', label: 'Sonartra Signals' },
  { href: '/case-studies', label: 'Case Studies' },
  { href: '/contact', label: 'Contact' },
  { href: '/get-started', label: 'Get Started' },
  { href: '/app/dashboard', label: 'User App' },
  { href: '/admin/dashboard', label: 'Admin' },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-white/10 bg-background/90 backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
            <span className="text-sm font-semibold tracking-[0.2em] text-white/80">
              SONARTRA MVP
            </span>
            <nav className="hidden gap-4 text-sm text-white/70 lg:flex">
              {navItems.map((item) => (
                <Link className="transition hover:text-white" href={item.href} key={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
