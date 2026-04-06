import type { ReactNode, SVGProps } from 'react';

export const HERO_PATTERN_KEYS = [
  'forceful_driver',
  'exacting_controller',
  'delivery_commander',
  'deliberate_craftsperson',
  'grounded_planner',
  'relational_catalyst',
  'adaptive_mobiliser',
  'steady_steward',
  'balanced_operator',
] as const;

export type HeroPatternKey = (typeof HERO_PATTERN_KEYS)[number];

type HeroPatternAssetDefinition = {
  label: string;
  viewBox: string;
  renderSymbol: () => ReactNode;
};

function MedallionNode({
  cx,
  cy,
  r = 3,
}: Readonly<{
  cx: number;
  cy: number;
  r?: number;
}>) {
  return <circle cx={cx} cy={cy} r={r} fill="#f7f4ff" />;
}

const HERO_PATTERN_ASSET_DEFINITIONS: Record<HeroPatternKey, HeroPatternAssetDefinition> = {
  forceful_driver: {
    label: 'Forceful Driver',
    viewBox: '0 0 160 160',
    renderSymbol: () => (
      <>
        <path
          d="M52 98c10-14 24-24 42-32"
          stroke="#f7f4ff"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M92 66h20"
          stroke="#f7f4ff"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="m102 56 12 10-12 10"
          stroke="#f7f4ff"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M48 112c9-8 16-16 22-27"
          stroke="#f7f4ff"
          strokeOpacity="0.52"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <MedallionNode cx={52} cy={98} />
      </>
    ),
  },
  exacting_controller: {
    label: 'Exacting Controller',
    viewBox: '0 0 160 160',
    renderSymbol: () => (
      <>
        <rect
          x="54"
          y="54"
          width="52"
          height="52"
          rx="9"
          stroke="#f7f4ff"
          strokeWidth="4.5"
          fill="none"
        />
        <circle
          cx="80"
          cy="80"
          r="16"
          stroke="#f7f4ff"
          strokeOpacity="0.5"
          strokeWidth="2.5"
          fill="none"
        />
        <path
          d="M80 64v32M64 80h32"
          stroke="#f7f4ff"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </>
    ),
  },
  delivery_commander: {
    label: 'Delivery Commander',
    viewBox: '0 0 160 160',
    renderSymbol: () => (
      <>
        <path
          d="M56 98h48"
          stroke="#f7f4ff"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M64 82h40"
          stroke="#f7f4ff"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M72 66h32"
          stroke="#f7f4ff"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M104 60v44"
          stroke="#f7f4ff"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M56 60v44"
          stroke="#f7f4ff"
          strokeOpacity="0.48"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </>
    ),
  },
  deliberate_craftsperson: {
    label: 'Deliberate Craftsperson',
    viewBox: '0 0 160 160',
    renderSymbol: () => (
      <>
        <circle
          cx="80"
          cy="80"
          r="24"
          stroke="#f7f4ff"
          strokeWidth="4.5"
          fill="none"
        />
        <circle
          cx="80"
          cy="80"
          r="12"
          stroke="#f7f4ff"
          strokeOpacity="0.5"
          strokeWidth="2.5"
          fill="none"
        />
        <path
          d="m63 97 34-34"
          stroke="#f7f4ff"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <MedallionNode cx={63} cy={97} />
        <MedallionNode cx={97} cy={63} />
      </>
    ),
  },
  grounded_planner: {
    label: 'Grounded Planner',
    viewBox: '0 0 160 160',
    renderSymbol: () => (
      <>
        <path
          d="M52 102h56"
          stroke="#f7f4ff"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M60 102V78M80 102V66M100 102V86"
          stroke="#f7f4ff"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M56 68c8-8 16-12 24-12s16 4 24 12"
          stroke="#f7f4ff"
          strokeOpacity="0.5"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
      </>
    ),
  },
  relational_catalyst: {
    label: 'Relational Catalyst',
    viewBox: '0 0 160 160',
    renderSymbol: () => (
      <>
        <path
          d="M80 80 80 58M80 80l21-8M80 80l15 20M80 80l-15 20M80 80l-21-8"
          stroke="#f7f4ff"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <circle
          cx="80"
          cy="80"
          r="4"
          fill="#f7f4ff"
        />
        <MedallionNode cx={80} cy={58} r={3.4} />
        <MedallionNode cx={101} cy={72} r={3.4} />
        <MedallionNode cx={95} cy={100} r={3.4} />
        <MedallionNode cx={65} cy={100} r={3.4} />
        <MedallionNode cx={59} cy={72} r={3.4} />
      </>
    ),
  },
  adaptive_mobiliser: {
    label: 'Adaptive Mobiliser',
    viewBox: '0 0 160 160',
    renderSymbol: () => (
      <>
        <path
          d="M60 56c10 0 17 6 17 14 0 6-4 10-11 15-7 6-11 10-11 16 0 8 8 13 18 13 9 0 17-4 25-11"
          stroke="#f7f4ff"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="m94 92 16 1-7 14"
          stroke="#f7f4ff"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
  },
  steady_steward: {
    label: 'Steady Steward',
    viewBox: '0 0 160 160',
    renderSymbol: () => (
      <>
        <circle
          cx="80"
          cy="80"
          r="28"
          stroke="#f7f4ff"
          strokeWidth="4.5"
          fill="none"
        />
        <circle
          cx="80"
          cy="80"
          r="18"
          stroke="#f7f4ff"
          strokeOpacity="0.5"
          strokeWidth="2.5"
          fill="none"
        />
        <path
          d="M62 80h36"
          stroke="#f7f4ff"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d="M80 62v36"
          stroke="#f7f4ff"
          strokeOpacity="0.5"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </>
    ),
  },
  balanced_operator: {
    label: 'Balanced Operator',
    viewBox: '0 0 160 160',
    renderSymbol: () => (
      <>
        <circle
          cx="80"
          cy="80"
          r="24"
          stroke="#f7f4ff"
          strokeWidth="4.5"
          fill="none"
        />
        <path
          d="M80 56v48M56 80h48"
          stroke="#f7f4ff"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d="M64 64c4 3 9 4 16 4s12-1 16-4M64 96c4-3 9-4 16-4s12 1 16 4"
          stroke="#f7f4ff"
          strokeOpacity="0.5"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
      </>
    ),
  },
};

export function isHeroPatternKey(value: string): value is HeroPatternKey {
  return HERO_PATTERN_KEYS.includes(value as HeroPatternKey);
}

export function getHeroPatternMedallionLabel(patternKey: HeroPatternKey): string {
  return HERO_PATTERN_ASSET_DEFINITIONS[patternKey].label;
}

export function getHeroPatternMedallionDefinition(
  patternKey: HeroPatternKey,
): HeroPatternAssetDefinition {
  return HERO_PATTERN_ASSET_DEFINITIONS[patternKey];
}

export function HeroPatternMedallionSvg({
  patternKey,
  title,
  ...props
}: Readonly<
  {
    patternKey: HeroPatternKey;
    title?: string;
  } & SVGProps<SVGSVGElement>
>) {
  const definition = getHeroPatternMedallionDefinition(patternKey);
  const accessibleTitle = title ?? definition.label;

  return (
    <svg
      viewBox={definition.viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={accessibleTitle}
      {...props}
    >
      <title>{accessibleTitle}</title>
      <defs>
        <linearGradient
          id={`hero-pattern-bg-${patternKey}`}
          x1="34"
          y1="28"
          x2="126"
          y2="132"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#8f63ff" />
          <stop offset="100%" stopColor="#5f35c8" />
        </linearGradient>
      </defs>

      <circle cx="80" cy="80" r="64" fill={`url(#hero-pattern-bg-${patternKey})`} />
      <circle cx="80" cy="80" r="63" stroke="#f7f4ff" strokeOpacity="0.88" strokeWidth="2.6" />
      <circle cx="80" cy="80" r="49" stroke="#f7f4ff" strokeOpacity="0.22" strokeWidth="1.2" />
      {definition.renderSymbol()}
    </svg>
  );
}
