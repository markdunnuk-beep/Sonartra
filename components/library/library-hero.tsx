import Link from 'next/link';

type LibraryHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  secondaryCopy?: string;
  backHref?: string;
  backLabel?: string;
};

export function LibraryHero({
  backHref,
  backLabel,
  description,
  eyebrow,
  secondaryCopy,
  title,
}: LibraryHeroProps) {
  return (
    <header className="max-w-5xl pt-4">
      {backHref && backLabel ? (
        <Link
          className="mb-8 inline-flex text-sm font-semibold text-[#32D6B0] transition hover:text-[#52E1C0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#32D6B0]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A0D]"
          href={backHref}
        >
          {backLabel}
        </Link>
      ) : null}
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
        {eyebrow}
      </p>
      <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[1.03] text-[#F5F1EA] md:text-7xl">
        {title}
      </h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-[#D8D0C3]/88">{description}</p>
      {secondaryCopy ? (
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[#D8D0C3]/70">{secondaryCopy}</p>
      ) : null}
    </header>
  );
}
