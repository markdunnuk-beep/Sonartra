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
        className="hero-pattern-medallion-glow absolute inset-[10%] rounded-full bg-[radial-gradient(circle,rgba(152,113,255,0.22),rgba(112,72,223,0.08)_48%,transparent_74%)] blur-[14px]"
        aria-hidden="true"
      />
      <div className="relative rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(157,118,255,0.08),rgba(99,56,208,0.03))] p-2.5 shadow-[0_18px_40px_rgba(24,8,58,0.22)] sm:p-3 md:p-3.5">
        <HeroPatternMedallionSvg
          patternKey={patternKey}
          title={label?.trim() || undefined}
          className="hero-pattern-medallion-svg h-auto w-full"
        />
      </div>
    </div>
  );
}
