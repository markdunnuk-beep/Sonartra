import { cn } from '@/components/shared/user-app-ui';

const DOMAIN_LABELS = ['Domain', 'Domain', 'Domain'] as const;
const SIGNAL_LABELS = ['Signal', 'Signal', 'Signal', 'Signal'] as const;

export function SonartraIntroductionVisual({
  className,
}: Readonly<{
  className?: string;
}>) {
  return (
    <div
      className={cn(
        'border-white/8 relative overflow-hidden rounded-[1.7rem] border bg-[radial-gradient(circle_at_top,rgba(157,181,226,0.16),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:p-6',
        className,
      )}
      aria-label="Sonartra model overview"
      data-sonartra-introduction-visual="true"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_35%,transparent_65%,rgba(142,177,255,0.05))]" />

      <div className="relative space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="sonartra-report-kicker">Model overview</p>
            <p className="sonartra-type-caption mt-1 text-white/46">Domains vary by assessment</p>
          </div>
          <span className="sonartra-type-utility border-white/10 rounded-full border bg-white/[0.03] px-2.5 py-1 text-white/54">
            Static visual
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <section className="space-y-3" aria-label="Generic domains">
            <div className="flex items-center justify-between">
              <p className="sonartra-type-utility text-white/52">Domains</p>
              <div className="bg-white/8 h-px flex-1 ml-3" />
            </div>
            <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1">
              {DOMAIN_LABELS.map((label, index) => (
                <div
                  key={`domain-${index + 1}`}
                  className={cn(
                    'rounded-[1.05rem] border px-3.5 py-3',
                    index === 1
                      ? 'border-[#9db4df]/18 bg-[#9db4df]/[0.08]'
                      : 'border-white/8 bg-white/[0.025]',
                  )}
                  data-model-domain={index + 1}
                >
                  <p className="sonartra-type-nav text-sm text-white/90">{label}</p>
                  <p className="sonartra-type-caption mt-1 text-white/44">Broad area of interpretation</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3" aria-label="Generic signals">
            <div className="flex items-center justify-between">
              <p className="sonartra-type-utility text-white/52">Signals</p>
              <div className="bg-white/8 h-px flex-1 ml-3" />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {SIGNAL_LABELS.map((label, index) => (
                <div
                  key={`signal-${index + 1}`}
                  className="rounded-[0.95rem] border border-white/8 bg-white/[0.024] px-3 py-3"
                  data-model-signal={index + 1}
                >
                  <p className="sonartra-type-nav text-sm text-white/84">{label}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section
          className="rounded-[1.2rem] border border-[#a8bfeb]/15 bg-[linear-gradient(180deg,rgba(168,191,235,0.08),rgba(255,255,255,0.02))] p-4"
          aria-label="Signal pair example"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="sonartra-type-nav rounded-full border border-white/8 bg-black/20 px-3 py-1 text-sm text-white/86">
              Signal
            </span>
            <span className="sonartra-type-caption text-[#c8d6ef]">paired with</span>
            <span className="sonartra-type-nav rounded-full border border-white/8 bg-black/20 px-3 py-1 text-sm text-white/86">
              Signal
            </span>
          </div>
          <p className="sonartra-type-body-secondary mt-3 max-w-[32rem] text-white/64">
            Example Signal Pair relationship showing how patterns can reinforce each other or create tension when read
            together.
          </p>
        </section>
      </div>
    </div>
  );
}
