import Link from 'next/link';
import type { ReactNode } from 'react';

type AuthPageShellProps = {
  title: string;
  description: string;
  alternateHref: string;
  alternateLabel: string;
  alternateCta: string;
  children: ReactNode;
};

export function AuthPageShell(props: AuthPageShellProps) {
  const { title, description, alternateHref, alternateLabel, alternateCta, children } = props;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(96,119,255,0.08),_transparent_32%),linear-gradient(180deg,rgba(9,17,31,0.98),rgba(8,15,28,1))] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,460px)]">
          <section className="border-white/8 rounded-[2rem] border bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-8 shadow-[0_32px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:p-10">
            <div className="space-y-6">
              <div className="space-y-4">
                <Link
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/74 transition hover:bg-white/[0.07] hover:text-white"
                  href="/"
                >
                  Sonartra
                </Link>
                <div className="space-y-3">
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/46">
                    Secure access
                  </p>
                  <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                    {title}
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-white/66">{description}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-sm font-medium text-white/82">Deterministic engine</p>
                  <p className="mt-2 text-sm leading-7 text-white/58">
                    Authentication returns directly into the persisted Sonartra app flow.
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-sm font-medium text-white/82">Protected surfaces</p>
                  <p className="mt-2 text-sm leading-7 text-white/58">
                    App and admin routes preserve Clerk handoff without falling back to hosted portal defaults.
                  </p>
                </div>
              </div>

              <div className="rounded-[1.35rem] border border-white/8 bg-black/20 p-4">
                <p className="text-sm text-white/62">
                  {alternateLabel}{' '}
                  <Link className="font-medium text-white underline decoration-white/25 underline-offset-4 transition hover:decoration-white/60" href={alternateHref}>
                    {alternateCta}
                  </Link>
                </p>
              </div>
            </div>
          </section>

          <section className="border-white/8 rounded-[2rem] border bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-4 shadow-[0_32px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-6">
            <div className="rounded-[1.5rem] border border-white/8 bg-[linear-gradient(180deg,rgba(11,18,33,0.96),rgba(8,14,26,0.98))] p-3 sm:p-4">
              {children}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
