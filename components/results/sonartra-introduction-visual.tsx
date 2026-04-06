import { cn } from '@/components/shared/user-app-ui';

function ExampleTerm({ children }: Readonly<{ children: string }>) {
  return <strong className="font-semibold text-white/86">{children}</strong>;
}

const SIGNAL_NODES = [
  {
    key: 'signal-1',
    title: 'Signal 1',
    example: 'Vision',
    className: 'justify-self-start sm:ml-5',
  },
  {
    key: 'signal-2',
    title: 'Signal 2',
    example: 'Process',
    className: 'justify-self-end sm:mr-5',
  },
] as const;

export function SonartraIntroductionVisual({
  className,
}: Readonly<{
  className?: string;
}>) {
  return (
    <div
      className={cn(
        'border-white/8 relative overflow-hidden rounded-[1.9rem] border bg-[radial-gradient(circle_at_top,rgba(157,181,226,0.16),transparent_34%),radial-gradient(circle_at_50%_58%,rgba(125,150,210,0.14),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:p-6',
        className,
      )}
      aria-label="How your results are built"
      data-sonartra-introduction-visual="true"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_35%,transparent_68%,rgba(142,177,255,0.05))]" />
      <div className="pointer-events-none absolute left-1/2 top-[35%] h-44 w-44 -translate-x-1/2 rounded-full bg-[#9db4df]/10 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-[60%] h-36 w-36 -translate-x-1/2 rounded-full bg-[#c6d4f0]/8 blur-3xl" />

      <div className="relative space-y-6">
        <header className="space-y-1.5">
          <p className="sonartra-report-kicker">How your results are built</p>
        </header>

        <div className="relative mx-auto flex max-w-[28rem] flex-col items-center pb-2 pt-1">
          <div className="pointer-events-none absolute left-1/2 top-[5.45rem] h-14 w-px -translate-x-1/2 overflow-hidden rounded-full bg-[linear-gradient(180deg,rgba(198,212,240,0.34),rgba(198,212,240,0.08))]">
            <span className="sonartra-flow-line sonartra-flow-line-vertical absolute inset-x-0 top-[-35%] h-8 rounded-full bg-[linear-gradient(180deg,rgba(228,236,249,0),rgba(228,236,249,0.75),rgba(228,236,249,0))] motion-safe:opacity-100" />
          </div>
          <div className="pointer-events-none absolute left-[30%] top-[15.4rem] hidden h-16 w-px rotate-[32deg] overflow-hidden rounded-full bg-[linear-gradient(180deg,rgba(198,212,240,0.22),rgba(198,212,240,0.04))] sm:block">
            <span className="sonartra-flow-line sonartra-flow-line-diagonal absolute inset-x-0 top-[-35%] h-7 rounded-full bg-[linear-gradient(180deg,rgba(228,236,249,0),rgba(228,236,249,0.62),rgba(228,236,249,0))] motion-safe:opacity-100" />
          </div>
          <div className="pointer-events-none absolute right-[30%] top-[15.4rem] hidden h-16 w-px -rotate-[32deg] overflow-hidden rounded-full bg-[linear-gradient(180deg,rgba(198,212,240,0.22),rgba(198,212,240,0.04))] sm:block">
            <span className="sonartra-flow-line sonartra-flow-line-diagonal absolute inset-x-0 top-[-35%] h-7 rounded-full bg-[linear-gradient(180deg,rgba(228,236,249,0),rgba(228,236,249,0.62),rgba(228,236,249,0))] motion-safe:opacity-100" />
          </div>
          <div className="pointer-events-none absolute left-1/2 top-[23.7rem] h-12 w-px -translate-x-1/2 overflow-hidden rounded-full bg-[linear-gradient(180deg,rgba(198,212,240,0.28),rgba(198,212,240,0.04))]">
            <span className="sonartra-flow-line sonartra-flow-line-vertical absolute inset-x-0 top-[-35%] h-7 rounded-full bg-[linear-gradient(180deg,rgba(228,236,249,0),rgba(228,236,249,0.68),rgba(228,236,249,0))] motion-safe:opacity-100" />
          </div>

          <section
            className="relative z-10 w-full max-w-[15rem] rounded-[1.5rem] border border-[#b6caef]/18 bg-[linear-gradient(180deg,rgba(182,202,239,0.16),rgba(255,255,255,0.045))] px-5 py-4 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_60px_rgba(4,8,20,0.34)]"
            aria-label="Generic domain"
          >
            <p className="sonartra-type-nav text-[0.98rem] text-white/94">Domain</p>
            <p className="sonartra-type-caption mt-1.5 text-white/56">
              A broad area of behaviour. For example: <ExampleTerm>Leadership Approach</ExampleTerm>.
            </p>
          </section>

          <section className="relative z-10 mt-14 grid w-full grid-cols-2 gap-x-3 gap-y-2.5 sm:gap-x-5" aria-label="Generic signals">
            {SIGNAL_NODES.map((signal) => (
              <div
                key={signal.key}
                className={cn(
                  'min-w-[10rem] rounded-[1.15rem] border border-white/8 bg-white/[0.04] px-4 py-3 text-center shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-sm',
                  signal.className,
                )}
              >
                <p className="sonartra-type-nav text-sm text-white/86">{signal.title}</p>
                <p className="sonartra-type-caption mt-1.5 text-white/44">
                  A dominant pattern. For example: <ExampleTerm>{signal.example}</ExampleTerm>.
                </p>
              </div>
            ))}
          </section>

          <section
            className="relative z-10 mt-10 w-full max-w-[16.5rem] rounded-[1.6rem] border border-[#c8d6ef]/20 bg-[radial-gradient(circle_at_top,rgba(200,214,239,0.16),transparent_60%),linear-gradient(180deg,rgba(157,181,226,0.15),rgba(255,255,255,0.03))] px-5 py-4 text-center shadow-[0_0_0_1px_rgba(200,214,239,0.08),0_22px_70px_rgba(5,9,24,0.38)]"
            aria-label="Signal pair convergence"
          >
            <div className="pointer-events-none absolute inset-x-5 inset-y-2 rounded-[1.4rem] bg-[#a9c1ec]/8 blur-2xl" />
            <div className="relative">
              <p className="sonartra-type-nav text-[1rem] text-white">Signal Pair</p>
              <p className="sonartra-type-caption mt-1.5 text-[#d5e0f4]">
                How those patterns combine. <ExampleTerm>Vision-Process</ExampleTerm>.
              </p>
            </div>
          </section>

          <section className="relative z-10 mt-10 w-full max-w-[14.5rem] text-center" aria-label="Behaviour outcome">
            <div className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-3 shadow-[0_12px_36px_rgba(0,0,0,0.18)]">
              <p className="sonartra-type-nav text-sm text-white/84">Behaviour in practice</p>
              <p className="sonartra-type-caption mt-1 text-white/48">
                What this actually looks like in the real world. You think strategically, but you also translate ideas
                into structured, workable plans.
              </p>
            </div>
          </section>
        </div>
      </div>

      <style>{`
        .sonartra-flow-line {
          opacity: 0.7;
        }

        @media (prefers-reduced-motion: no-preference) {
          .sonartra-flow-line-vertical {
            animation: sonartra-flow-vertical 5.8s ease-in-out infinite;
          }

          .sonartra-flow-line-diagonal {
            animation: sonartra-flow-diagonal 6.2s ease-in-out infinite;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sonartra-flow-line {
            opacity: 0.3;
          }
        }

        @keyframes sonartra-flow-vertical {
          0% {
            transform: translateY(-165%);
            opacity: 0;
          }

          18% {
            opacity: 0.24;
          }

          52% {
            opacity: 0.68;
          }

          100% {
            transform: translateY(250%);
            opacity: 0;
          }
        }

        @keyframes sonartra-flow-diagonal {
          0% {
            transform: translateY(-155%);
            opacity: 0;
          }

          20% {
            opacity: 0.2;
          }

          50% {
            opacity: 0.56;
          }

          100% {
            transform: translateY(235%);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
