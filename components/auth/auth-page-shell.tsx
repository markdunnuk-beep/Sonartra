import Link from 'next/link';
import type { ReactNode } from 'react';

type AuthPageShellProps = {
  title: string;
  eyebrow?: string;
  description: string;
  trustTitle?: string;
  trustDescription?: string;
  trustItems?: Array<{
    title: string;
    description: string;
  }>;
  formTitle?: string;
  formDescription?: string;
  alternateHref: string;
  alternateLabel: string;
  alternateCta: string;
  children: ReactNode;
};

const defaultTrustItems = [
  {
    title: 'Assessments',
    description: 'Start, resume, and complete your assigned assessments.',
  },
  {
    title: 'Results',
    description: 'Return to individual reports and leadership pattern insights.',
  },
  {
    title: 'Development',
    description: 'Keep practical next steps and workspace activity in one place.',
  },
];

export function AuthPageShell(props: AuthPageShellProps) {
  const {
    title,
    eyebrow = 'Secure sign-in',
    description,
    trustTitle = 'Your assessment data remains protected.',
    trustDescription = 'Return to your workspace automatically after sign-in.',
    trustItems = defaultTrustItems,
    formTitle = 'Secure sign-in',
    formDescription = 'Use your Sonartra account to continue.',
    alternateHref,
    alternateLabel,
    alternateCta,
    children,
  } = props;

  return (
    <main className="min-h-screen overflow-hidden bg-[#080f1c] px-4 py-6 text-white sm:px-6 sm:py-8 lg:px-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(117,135,255,0.16),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(42,190,166,0.12),transparent_28%),linear-gradient(180deg,rgba(11,19,34,0.98),rgba(6,11,21,1))]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center gap-6 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
        <section className="order-2 lg:order-1">
          <div className="max-w-2xl space-y-7 py-2 lg:py-10">
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <Link
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/78 transition hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
                  href="/"
                >
                  Sonartra
                </Link>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#85d8c8]">
                  {eyebrow}
                </p>
                <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl lg:text-[3.65rem] lg:leading-[0.95]">
                  {title}
                </h1>
                <p className="max-w-xl text-base leading-8 text-white/68 sm:text-lg">{description}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-sm">
                  <p className="text-sm font-semibold text-white">{trustTitle}</p>
                  <p className="mt-2 text-sm leading-6 text-white/58">
                    {trustDescription}
                  </p>
                </div>
                <div className="rounded-full border border-[#85d8c8]/25 bg-[#85d8c8]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#b8fff0]">
                  Protected
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {trustItems.map((item) => (
                  <div className="rounded-xl border border-white/8 bg-black/18 p-4" key={item.title}>
                    <p className="text-sm font-semibold text-white/88">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-white/56">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-sm text-white/58">
              {alternateLabel}{' '}
              <Link
                className="font-semibold text-white underline decoration-white/25 underline-offset-4 transition hover:decoration-white/65"
                href={alternateHref}
              >
                {alternateCta}
              </Link>
            </p>
          </div>
        </section>

        <section className="order-1 lg:order-2">
          <div className="mx-auto w-full max-w-[440px] rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.075),rgba(255,255,255,0.035))] p-3 shadow-[0_32px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-4">
            <div className="rounded-[1.25rem] border border-white/8 bg-[linear-gradient(180deg,rgba(10,18,32,0.98),rgba(7,13,24,0.99))] p-5 sm:p-6">
              <div className="mb-5 border-b border-white/8 pb-5">
                <p className="text-sm font-semibold text-white">{formTitle}</p>
                <p className="mt-1 text-sm leading-6 text-white/56">
                  {formDescription}
                </p>
              </div>
              {children}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
