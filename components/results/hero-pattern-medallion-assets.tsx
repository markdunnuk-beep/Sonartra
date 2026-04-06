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
  r = 3.5,
  fill = '#d7deeb',
  fillOpacity = 0.82,
}: Readonly<{
  cx: number;
  cy: number;
  r?: number;
  fill?: string;
  fillOpacity?: number;
}>) {
  return <circle cx={cx} cy={cy} r={r} fill={fill} fillOpacity={fillOpacity} />;
}

function MedallionBar({
  x,
  y,
  width,
  height,
  opacity = 0.88,
}: Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
}>) {
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={height / 2}
      fill="#d7deeb"
      fillOpacity={opacity}
    />
  );
}

const HERO_PATTERN_ASSET_DEFINITIONS: Record<HeroPatternKey, HeroPatternAssetDefinition> = {
  forceful_driver: {
    label: 'Forceful Driver',
    viewBox: '0 0 160 160',
    renderSymbol: () => (
      <>
        <path
          d="M50 104c12-16 26-24 42-32"
          stroke="#ecf2fb"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M66 120c18-6 34-16 50-34"
          stroke="#b9c7dd"
          strokeOpacity="0.8"
          strokeWidth="3.8"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M98 60h24"
          stroke="#ecf2fb"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="m110 48 14 12-14 12"
          stroke="#ecf2fb"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M38 114c7-15 13-23 24-33"
          stroke="#91a6ca"
          strokeOpacity="0.55"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
        <MedallionNode cx={49} cy={104} />
        <MedallionNode cx={116} cy={86} r={3.2} fillOpacity={0.66} />
      </>
    ),
  },
  exacting_controller: {
    label: 'Exacting Controller',
    viewBox: '0 0 160 160',
    renderSymbol: () => (
      <>
        <rect
          x="52"
          y="52"
          width="56"
          height="56"
          rx="10"
          stroke="#ecf2fb"
          strokeWidth="4.2"
          fill="none"
        />
        <circle
          cx="80"
          cy="80"
          r="18"
          stroke="#b8c6dd"
          strokeWidth="3.4"
          strokeDasharray="3 5"
          fill="none"
        />
        <path
          d="M80 62v36M62 80h36"
          stroke="#ecf2fb"
          strokeWidth="3.8"
          strokeLinecap="round"
        />
        <path
          d="M52 67H44M108 67h8M52 93H44M108 93h8"
          stroke="#90a5c9"
          strokeOpacity="0.72"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <MedallionNode cx={80} cy={80} r={2.8} />
      </>
    ),
  },
  delivery_commander: {
    label: 'Delivery Commander',
    viewBox: '0 0 160 160',
    renderSymbol: () => (
      <>
        <path
          d="M48 60h18M48 68h26"
          stroke="#91a6ca"
          strokeOpacity="0.58"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M56 100h48"
          stroke="#ecf2fb"
          strokeWidth="4.8"
          strokeLinecap="round"
        />
        <path
          d="M64 84h40"
          stroke="#b8c6dd"
          strokeOpacity="0.94"
          strokeWidth="3.8"
          strokeLinecap="round"
        />
        <path
          d="M72 68h32"
          stroke="#91a6ca"
          strokeOpacity="0.78"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M104 62v44"
          stroke="#ecf2fb"
          strokeWidth="4.6"
          strokeLinecap="round"
        />
        <path
          d="M56 62v44"
          stroke="#b8c6dd"
          strokeOpacity="0.5"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path
          d="M68 62v31"
          stroke="#d7deeb"
          strokeOpacity="0.42"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
        <path
          d="M80 62v23"
          stroke="#d7deeb"
          strokeOpacity="0.42"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
        <path
          d="M116 54v52c0 5.523-4.477 10-10 10H54c-5.523 0-10-4.477-10-10V82"
          stroke="#b8c6dd"
          strokeOpacity="0.76"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M56 100c6 6 14 9 24 9s18-3 24-9"
          stroke="#ecf2fb"
          strokeOpacity="0.34"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
        <MedallionNode cx={104} cy={62} r={3.1} />
        <MedallionNode cx={56} cy={100} r={3.1} fillOpacity={0.66} />
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
          r="26"
          stroke="#ecf2fb"
          strokeWidth="4"
          fill="none"
        />
        <circle
          cx="80"
          cy="80"
          r="15"
          stroke="#b8c6dd"
          strokeWidth="3"
          fill="none"
        />
        <path
          d="M80 54v-8M80 106v8M54 80h-8M106 80h8"
          stroke="#91a6ca"
          strokeOpacity="0.78"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="m60 100 40-40"
          stroke="#ecf2fb"
          strokeWidth="4.4"
          strokeLinecap="round"
        />
        <path
          d="m64 56 40 40"
          stroke="#d7deeb"
          strokeOpacity="0.34"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <MedallionNode cx={60} cy={100} r={3} />
        <MedallionNode cx={100} cy={60} r={3} />
      </>
    ),
  },
  grounded_planner: {
    label: 'Grounded Planner',
    viewBox: '0 0 160 160',
    renderSymbol: () => (
      <>
        <path
          d="M48 104h64"
          stroke="#ecf2fb"
          strokeWidth="4.6"
          strokeLinecap="round"
        />
        <path
          d="M58 104V78M80 104V66M102 104V86"
          stroke="#b8c6dd"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M52 68c10-10 19-15 28-15s18 5 28 15"
          stroke="#91a6ca"
          strokeOpacity="0.65"
          strokeWidth="2.8"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M58 120h44"
          stroke="#d7deeb"
          strokeOpacity="0.36"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <MedallionNode cx={58} cy={78} r={3} />
        <MedallionNode cx={80} cy={66} r={3.2} />
        <MedallionNode cx={102} cy={86} r={3} />
      </>
    ),
  },
  relational_catalyst: {
    label: 'Relational Catalyst',
    viewBox: '0 0 160 160',
    renderSymbol: () => (
      <>
        <MedallionNode cx={80} cy={80} r={4.2} />
        <MedallionNode cx={80} cy={54} r={4} fillOpacity={0.8} />
        <MedallionNode cx={104} cy={74} r={4} fillOpacity={0.8} />
        <MedallionNode cx={96} cy={104} r={4} fillOpacity={0.8} />
        <MedallionNode cx={64} cy={104} r={4} fillOpacity={0.8} />
        <MedallionNode cx={56} cy={74} r={4} fillOpacity={0.8} />
        <path
          d="M80 80 80 54M80 80l24-6M80 80l16 24M80 80l-16 24M80 80l-24-6"
          stroke="#ecf2fb"
          strokeWidth="3.8"
          strokeLinecap="round"
        />
        <circle
          cx="80"
          cy="80"
          r="31"
          stroke="#91a6ca"
          strokeOpacity="0.46"
          strokeWidth="2.3"
          fill="none"
          strokeDasharray="2.5 6"
        />
      </>
    ),
  },
  adaptive_mobiliser: {
    label: 'Adaptive Mobiliser',
    viewBox: '0 0 160 160',
    renderSymbol: () => (
      <>
        <path
          d="M60 52c11 0 18 6 18 14 0 6-3 10-10 16-8 7-12 11-12 18 0 8 8 14 19 14 10 0 18-4 26-12"
          stroke="#ecf2fb"
          strokeWidth="4.8"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="m96 92 18 2-8 16"
          stroke="#ecf2fb"
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M54 60c7-8 16-12 28-12"
          stroke="#91a6ca"
          strokeOpacity="0.62"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
        <MedallionNode cx={60} cy={52} r={3.2} />
        <MedallionNode cx={114} cy={94} r={3} fillOpacity={0.68} />
      </>
    ),
  },
  steady_steward: {
    label: 'Steady Steward',
    viewBox: '0 0 160 160',
    renderSymbol: () => (
      <>
        <path
          d="M80 50c18 0 31 14 31 32s-13 32-31 32-31-14-31-32 13-32 31-32Z"
          stroke="#ecf2fb"
          strokeWidth="3.8"
          fill="none"
        />
        <path
          d="M80 58c13 0 22 10 22 24s-9 24-22 24-22-10-22-24 9-24 22-24Z"
          stroke="#b8c6dd"
          strokeOpacity="0.88"
          strokeWidth="3"
          fill="none"
        />
        <path
          d="M80 68v28"
          stroke="#ecf2fb"
          strokeWidth="3.8"
          strokeLinecap="round"
        />
        <path
          d="M66 82h28"
          stroke="#b8c6dd"
          strokeOpacity="0.84"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        <path
          d="M58 72c7 5 14 7 22 7s15-2 22-7"
          stroke="#91a6ca"
          strokeOpacity="0.48"
          strokeWidth="2.3"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M58 92c7-5 14-7 22-7s15 2 22 7"
          stroke="#91a6ca"
          strokeOpacity="0.48"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M48 82h8M104 82h8"
          stroke="#d7deeb"
          strokeOpacity="0.28"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <MedallionNode cx={80} cy={50} r={3.1} />
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
          r="25"
          stroke="#ecf2fb"
          strokeWidth="4"
          fill="none"
        />
        <path
          d="M80 52v56M52 80h56"
          stroke="#b8c6dd"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        <path
          d="M62 62c5 4 11 6 18 6s13-2 18-6"
          stroke="#91a6ca"
          strokeOpacity="0.64"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M62 98c5-4 11-6 18-6s13 2 18 6"
          stroke="#91a6ca"
          strokeOpacity="0.64"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <MedallionNode cx={80} cy={80} r={3} />
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
        <radialGradient id={`hero-pattern-bg-${patternKey}`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(56 50) rotate(46) scale(108)">
          <stop offset="0%" stopColor="#dde4f1" stopOpacity="0.14" />
          <stop offset="38%" stopColor="#a7b7d3" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#080c16" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`hero-pattern-frame-${patternKey}`} x1="32" y1="28" x2="126" y2="132" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f1f5fb" stopOpacity="0.68" />
          <stop offset="45%" stopColor="#b8c6dd" stopOpacity="0.46" />
          <stop offset="100%" stopColor="#7a8aa8" stopOpacity="0.34" />
        </linearGradient>
        <linearGradient id={`hero-pattern-inner-${patternKey}`} x1="48" y1="44" x2="112" y2="118" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f2f6fc" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#d7deeb" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      <circle cx="80" cy="80" r="64" fill="#060911" />
      <circle cx="80" cy="80" r="64" fill={`url(#hero-pattern-bg-${patternKey})`} />
      <circle cx="80" cy="80" r="63" stroke="url(#hero-pattern-frame-${patternKey})" strokeWidth="2.4" />
      <circle cx="80" cy="80" r="56" stroke="#f1f5fb" strokeOpacity="0.16" strokeWidth="1.5" />
      <circle cx="80" cy="80" r="47" fill={`url(#hero-pattern-inner-${patternKey})`} />
      <circle cx="80" cy="80" r="47" stroke="#d7deeb" strokeOpacity="0.12" strokeWidth="1.2" />
      <path d="M80 24v10M80 126v10M24 80h10M126 80h10" stroke="#d7deeb" strokeOpacity="0.24" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M42 42l7 7M111 111l7 7M118 42l-7 7M49 111l-7 7" stroke="#a0b0ca" strokeOpacity="0.18" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M80 38A42 42 0 0 1 122 80" stroke="#d7deeb" strokeOpacity="0.1" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M80 122A42 42 0 0 1 38 80" stroke="#d7deeb" strokeOpacity="0.08" strokeWidth="5.5" strokeLinecap="round" />
      <MedallionBar x={58} y={132} width={13} height={2.6} opacity={0.22} />
      <MedallionBar x={74} y={132} width={24} height={2.6} opacity={0.28} />
      {definition.renderSymbol()}
    </svg>
  );
}
