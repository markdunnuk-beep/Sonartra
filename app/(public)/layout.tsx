import Link from 'next/link';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/platform', label: 'Platform' },
  { href: '/signals', label: 'Sonartra Signals' },
  { href: '/case-studies', label: 'Case Studies' },
  { href: '/contact', label: 'Contact' },
  { href: '/get-started', label: 'Get Started' },
  { href: '/app/workspace', label: 'User App' },
  { href: '/admin/dashboard', label: 'Admin' },
];

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <header className="border-b border-white/10 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <span className="text-sm font-semibold tracking-[0.2em] text-white/80">SONARTRA MVP</span>
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
    </>
  );
}
