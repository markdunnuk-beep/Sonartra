import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] border border-white/10 bg-[#080A0D] px-5 py-20 shadow-[0_28px_90px_rgba(0,0,0,0.28)] sm:px-8 md:py-28 lg:px-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(50,214,176,0.16),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(245,241,234,0.08),transparent_28%),linear-gradient(180deg,#101318_0%,#080A0D_72%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[linear-gradient(rgba(245,241,234,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(245,241,234,0.012)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_86%)]"
      />

      <div className="max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
          Behavioural intelligence platform
        </p>
        <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[1.03] text-[#F5F1EA] md:text-7xl">
          Understand the patterns shaping how people work.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#D8D0C3]/86">
          Sonartra helps people and teams see how they lead, decide, adapt, and develop, with
          structured behavioural insight clear enough to act on.
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link
          className="inline-flex items-center justify-center rounded-full border border-[#32D6B0]/28 bg-[#32D6B0] px-5 py-3 text-sm font-semibold text-[#07100f] transition hover:bg-[#52E1C0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#32D6B0]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A0D]"
          href="/get-started"
        >
          Get Started
        </Link>
        <Link
          className="inline-flex items-center justify-center rounded-full border border-white/14 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-[#F5F1EA] transition hover:border-white/24 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A0D]"
          href="/platform"
        >
          Explore Platform
        </Link>
      </div>

      <div className="mt-16 grid gap-4 md:grid-cols-3">
        {[
          ['Work patterns', 'Reveal the behaviours that shape momentum and friction.'],
          ['Leadership signals', 'Understand how direction, judgement, and adaptation show up.'],
          ['Applied development', 'Turn assessment evidence into practical next steps.'],
        ].map(([title, body]) => (
          <article
            className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm"
            key={title}
          >
            <h2 className="text-base font-semibold text-[#F5F1EA]">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-[#D8D0C3]/78">{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
