import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';

type AuthPageShellProps = {
  variant?: 'default' | 'brandAccess';
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
    variant = 'default',
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

  if (variant === 'brandAccess') {
    return (
      <main className="relative isolate min-h-screen overflow-hidden bg-[#080A0D] px-4 py-5 text-[#F5F1EA] sm:px-6 sm:py-7 lg:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-y-0 left-0 z-0 w-full max-w-full overflow-hidden bg-[linear-gradient(180deg,#090B0F_0%,#080A0D_46rem,#080A0D_100%)]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_7%,rgba(50,214,176,0.13),transparent_31%),radial-gradient(circle_at_84%_12%,rgba(245,241,234,0.07),transparent_29%),linear-gradient(180deg,rgba(8,10,13,0)_0%,rgba(8,10,13,0.72)_68%,rgba(8,10,13,0)_100%)]" />
          <div className="absolute left-1/2 top-12 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full border border-[#F5F1EA]/[0.035]" />
          <div className="absolute left-1/2 top-24 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full border border-[#32D6B0]/[0.045]" />
          <div className="absolute inset-x-[-8rem] top-0 h-[42rem] bg-[linear-gradient(rgba(245,241,234,0.016)_1px,transparent_1px),linear-gradient(90deg,rgba(245,241,234,0.012)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_58%,rgba(0,0,0,0.2)_100%)]" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-6xl flex-col lg:min-h-[calc(100vh-3.5rem)]">
          <header className="flex items-center justify-between border-b border-[#F5F1EA]/10 pb-5">
            <Link className="inline-flex items-center" href="/" aria-label="Sonartra home">
              <Image
                alt="Sonartra"
                className="block h-auto w-[156px] sm:w-[174px]"
                height={44}
                priority
                src="/images/brand/sonartra-logo-white.svg"
                unoptimized
                width={180}
              />
            </Link>
            <Link
              className="rounded-full border border-[#F5F1EA]/14 bg-[#F5F1EA]/[0.04] px-4 py-2 text-sm font-semibold text-[#F5F1EA] transition hover:border-[#F5F1EA]/24 hover:bg-[#F5F1EA]/[0.08]"
              href={alternateHref}
            >
              {alternateCta}
            </Link>
          </header>

          <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,0.96fr)_minmax(390px,440px)] lg:gap-16 lg:py-12">
            <section className="order-2 max-w-2xl space-y-6 lg:order-1 lg:pr-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
                {eyebrow}
              </p>
              <div className="space-y-4">
                <h1 className="max-w-xl text-4xl font-semibold leading-[1.03] text-[#F5F1EA] sm:text-5xl lg:text-6xl">
                  {title}
                </h1>
                <p className="max-w-xl text-base leading-7 text-[#D8D0C3]/86 sm:text-lg sm:leading-8">
                  {description}
                </p>
              </div>
              <p className="max-w-lg border-l border-[#32D6B0]/35 pl-4 text-sm leading-6 text-[#D8D0C3]/78">
                {trustTitle}
              </p>
            </section>

            <section className="order-1 lg:order-2">
              <div className="mx-auto w-full max-w-[440px] rounded-[1.5rem] border border-[#F5F1EA]/10 bg-[#101318]/88 p-3 shadow-[0_32px_90px_rgba(0,0,0,0.36)] backdrop-blur-xl">
                <div className="rounded-[1.05rem] border border-[#F5F1EA]/10 bg-[#080A0D] p-5 sm:p-6">
                  <div className="mb-5 border-b border-[#F5F1EA]/10 pb-5">
                    <p className="text-sm font-semibold text-[#F5F1EA]">{formTitle}</p>
                    <p className="mt-1 text-sm leading-6 text-[#D8D0C3]/70">
                      {formDescription}
                    </p>
                  </div>
                  {children}
                </div>
              </div>
              <p className="mx-auto mt-5 max-w-[440px] text-sm text-[#D8D0C3]/68">
                {alternateLabel}{' '}
                <Link
                  className="font-semibold text-[#F5F1EA] underline decoration-[#32D6B0]/35 underline-offset-4 transition hover:decoration-[#32D6B0]"
                  href={alternateHref}
                >
                  {alternateCta}
                </Link>
              </p>
            </section>
          </div>
        </div>
      </main>
    );
  }

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
