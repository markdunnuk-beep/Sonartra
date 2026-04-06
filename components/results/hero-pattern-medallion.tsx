import { cn } from '@/components/shared/user-app-ui';
import {
  HeroPatternMedallionSvg,
  isHeroPatternKey,
} from '@/components/results/hero-pattern-medallion-assets';

export function HeroPatternMedallion({
  patternKey,
  label,
  className,
}: Readonly<{
  patternKey: string | null | undefined;
  label?: string | null;
  className?: string;
}>) {
  if (!patternKey || !isHeroPatternKey(patternKey)) {
    return null;
  }

  return (
    <div
      className={cn(
        'hero-pattern-medallion-shell relative isolate w-[7.5rem] shrink-0 sm:w-[8.5rem] md:w-[10.5rem]',
        className,
      )}
      data-hero-pattern-medallion={patternKey}
    >
      <div
        className="hero-pattern-medallion-glow absolute inset-[11%] rounded-full bg-[radial-gradient(circle,rgba(201,214,236,0.22),rgba(117,135,170,0.08)_46%,transparent_74%)] blur-[18px]"
        aria-hidden="true"
      />
      <div className="relative rounded-full border border-white/7 bg-[radial-gradient(circle_at_30%_24%,rgba(255,255,255,0.09),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.014))] p-2.5 shadow-[0_24px_60px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-3 md:p-3.5">
        <HeroPatternMedallionSvg
          patternKey={patternKey}
          title={label?.trim() || undefined}
          className="hero-pattern-medallion-svg h-auto w-full"
        />
      </div>
    </div>
  );
}
