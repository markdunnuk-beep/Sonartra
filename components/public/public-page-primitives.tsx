import Link from 'next/link';
import type { ReactNode } from 'react';

type PublicPageCanvasProps = {
  children: ReactNode;
};

type PublicPageHeroProps = {
  eyebrow: string;
  title: string;
  intro: string;
  children?: ReactNode;
};

type PublicPageSectionProps = {
  eyebrow: string;
  title: string;
  children: ReactNode;
};

type PublicPageCardProps = {
  title: string;
  body: string;
};

type PublicPageCta = {
  href: string;
  label: string;
  variant?: 'primary' | 'secondary';
};

export function PublicPageCanvas({ children }: PublicPageCanvasProps) {
  return (
    <div className="relative isolate -mx-5 overflow-hidden px-5 pb-16 pt-20 sm:-mx-6 sm:px-6 md:pb-20 md:pt-24 lg:-mx-8 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_0%,rgba(50,214,176,0.14),transparent_34%),radial-gradient(circle_at_84%_4%,rgba(217,164,65,0.06),transparent_30%),radial-gradient(circle_at_50%_0%,rgba(245,241,234,0.06),transparent_34%),linear-gradient(180deg,#111820_0%,#0B1016_42%,#080A0D_82%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[linear-gradient(rgba(245,241,234,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(245,241,234,0.012)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_82%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem] bg-[linear-gradient(to_bottom,rgba(8,10,13,0)_0%,rgba(8,10,13,0.68)_82%,#080A0D_100%)]"
      />
      <div className="mx-auto max-w-6xl">{children}</div>
    </div>
  );
}

export function PublicPageHero({ children, eyebrow, intro, title }: PublicPageHeroProps) {
  return (
    <header className="relative max-w-4xl py-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-6 -top-12 -z-10 h-72 rounded-full bg-[radial-gradient(circle_at_24%_18%,rgba(50,214,176,0.10),transparent_50%)] blur-2xl"
      />
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
        {eyebrow}
      </p>
      <h1 className="mt-5 text-5xl font-semibold leading-[1.03] text-[#F5F1EA] md:text-7xl">
        {title}
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-[#D8D0C3]/86">{intro}</p>
      {children ? <div className="mt-10">{children}</div> : null}
    </header>
  );
}

export function PublicPageSection({ children, eyebrow, title }: PublicPageSectionProps) {
  return (
    <section className="mt-16 border-t border-white/10 pt-12 md:mt-20 md:pt-14">
      <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
            {eyebrow}
          </p>
          <h2 className="mt-4 max-w-md text-3xl font-semibold leading-tight text-[#F5F1EA] md:text-4xl">
            {title}
          </h2>
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}

export function PublicPageCard({ body, title }: PublicPageCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-[#F5F1EA]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#D8D0C3]/78">{body}</p>
    </article>
  );
}

export function PublicPageCtaRow({ actions }: { actions: PublicPageCta[] }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {actions.map((action) => (
        <Link
          className={[
            'inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A0D]',
            action.variant === 'secondary'
              ? 'border-white/14 bg-white/[0.04] text-[#F5F1EA] hover:border-white/24 hover:bg-white/[0.08] focus-visible:ring-white/35'
              : 'border-[#32D6B0]/28 bg-[#32D6B0] text-[#07100f] hover:bg-[#52E1C0] focus-visible:ring-[#32D6B0]/45',
          ].join(' ')}
          href={action.href}
          key={action.href}
        >
          {action.label}
        </Link>
      ))}
    </div>
  );
}
